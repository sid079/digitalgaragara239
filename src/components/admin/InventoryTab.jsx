/*
 * DATABASE MIGRATIONS — Run these in Supabase SQL Editor:
 *
 * ALTER TABLE lottery_settings
 * ADD COLUMN IF NOT EXISTS cumulative_stock_added integer NOT NULL DEFAULT 0;
 *
 * CREATE TABLE IF NOT EXISTS reset_log (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   reset_at timestamptz DEFAULT now(),
 *   reset_by text DEFAULT 'admin',
 *   scope text NOT NULL,
 *   product_id uuid REFERENCES products(id) ON DELETE SET NULL,
 *   product_name text,
 *   stock_zeroed integer,
 *   distributed_zeroed integer
 * );
 *
 * CREATE TABLE IF NOT EXISTS stock_additions (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   product_id uuid REFERENCES products(id) ON DELETE CASCADE,
 *   amount integer NOT NULL,
 *   mode text NOT NULL DEFAULT 'add',
 *   added_at timestamptz DEFAULT now()
 * );
 * ALTER TABLE stock_additions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "allow_stock_additions_insert" ON stock_additions FOR INSERT WITH CHECK (true);
 * CREATE POLICY "allow_stock_additions_select" ON stock_additions FOR SELECT USING (true);
 * CREATE POLICY "allow_stock_additions_delete" ON stock_additions FOR DELETE USING (true);
 */

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { supabase } from '../../supabaseClient'
import MerchandiseIcon from '../icons/MerchandiseIcon'

const ICON_TYPES = [
  { value: 'tshirt', label: 'T-Shirt' },
  { value: 'badge', label: 'Badge' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'figurine', label: 'Figurine' },
  { value: 'keychain', label: 'Keychain' },
  { value: 'gift_hamper', label: 'Gift Hamper' },
]

const GRADE_COLORS = {
  A: { text: '#8b5cf6', bg: '#8b5cf620', border: '#8b5cf640' },
  B: { text: '#4fc3f7', bg: '#4fc3f720', border: '#4fc3f740' },
  C: { text: '#f5a623', bg: '#f5a62320', border: '#f5a62340' },
}

const STATUS_STYLES = {
  Active: { bg: '#22c55e20', border: '#22c55e40', text: '#22c55e' },
  'Low Stock': { bg: '#f5a62320', border: '#f5a62340', text: '#f5a623' },
  'Sold Out': { bg: '#ef444420', border: '#ef444440', text: '#ef4444' },
  Inactive: { bg: '#88888820', border: '#88888840', text: '#888888' },
}

const GRID = '48px 1fr 68px 88px 88px 88px 88px 56px 168px'

function getStatus(settings) {
  const remaining = settings?.stock_quantity ?? 0
  const isActive = settings?.is_active ?? false
  const stockAdded = settings?.cumulative_stock_added ?? 0

  if (remaining === 0 && stockAdded > 0) return 'Sold Out'
  if (!isActive) return 'Inactive'
  if (stockAdded > 0 && remaining > 0 && remaining < stockAdded * 0.2) return 'Low Stock'
  return 'Active'
}

function getRemainingColor(remaining, stockAdded) {
  if (remaining === 0) return '#ef4444'
  if (stockAdded > 0 && remaining <= stockAdded * 0.2) return '#f5a623'
  return '#ededed'
}

export default function InventoryTab() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [distributedMap, setDistributedMap] = useState({})
  const [showSheet, setShowSheet] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showResetAll, setShowResetAll] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'All') query = query.eq('grade', filter)

    const { data: products } = await query

    if (!products || products.length === 0) {
      setRows([])
      setDistributedMap({})
      setLoading(false)
      return
    }

    const ids = products.map(p => p.id)

    const { data: allSettings } = await supabase
      .from('lottery_settings')
      .select('*')
      .in('product_id', ids)

    const { data: logEntries } = await supabase
      .from('lottery_log')
      .select('product_id')
      .in('product_id', ids)

    const dMap = {}
    logEntries?.forEach(e => {
      dMap[e.product_id] = (dMap[e.product_id] || 0) + 1
    })
    setDistributedMap(dMap)

    const merged = products.map(product => ({
      product,
      settings: allSettings?.find(s => s.product_id === product.id) || null,
    }))

    for (const item of merged) {
      if (!item.settings) {
        const { data: s } = await supabase
          .from('lottery_settings')
          .insert({
            product_id: item.product.id,
            stock_quantity: 0,
            original_stock: 0,
            cumulative_stock_added: 0,
            probability_weight: 1.0,
            is_active: false,
            version: 1,
          })
          .select()
          .single()
        item.settings = s
      }
    }

    setRows(merged)
    setLoading(false)
  }, [filter])

  /*
   * REALTIME — Ensure realtime is enabled on lottery_settings.
   * Run in Supabase SQL Editor:
   *
   * ALTER PUBLICATION supabase_realtime ADD TABLE lottery_settings;
   */
  useEffect(() => {
    fetchData()

    const settingsChannel = supabase
      .channel('inventory_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lottery_settings'
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new
          setRows(prev => prev.map(r =>
            r.settings?.product_id === updated.product_id
              ? {
                  ...r,
                  settings: {
                    ...r.settings,
                    stock_quantity: updated.stock_quantity,
                    is_active: updated.is_active,
                    version: updated.version,
                    cumulative_stock_added: updated.cumulative_stock_added,
                  }
                }
              : r
          ))
        } else {
          fetchData()
        }
      })
      .subscribe()

    const logChannel = supabase
      .channel('log_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lottery_log'
      }, (payload) => {
        const productId = payload.new.product_id
        setDistributedMap(prev => ({
          ...prev,
          [productId]: (prev[productId] || 0) + 1
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(settingsChannel)
      supabase.removeChannel(logChannel)
    }
  }, [fetchData])

  const gradeSummary = useMemo(() => {
    const grades = filter === 'All' ? ['A', 'B', 'C'] : [filter]
    return grades
      .map(g => {
        const gradeRows = rows.filter(r => r.product.grade === g)
        if (gradeRows.length === 0) return null
        const active = gradeRows.filter(r => r.settings?.is_active).length
        const remaining = gradeRows.reduce((sum, r) => sum + (r.settings?.stock_quantity ?? 0), 0)
        const distributed = gradeRows.reduce((sum, r) => sum + (distributedMap[r.product.id] || 0), 0)
        return { grade: g, active, remaining, distributed }
      })
      .filter(Boolean)
  }, [rows, distributedMap, filter])

  async function handleToggle(productId) {
    const row = rows.find(r => r.product.id === productId)
    if (!row?.settings) return
    const newVal = !row.settings.is_active
    setRows(prev =>
      prev.map(r =>
        r.product.id === productId
          ? { ...r, settings: { ...r.settings, is_active: newVal } }
          : r
      )
    )
    const { error } = await supabase
      .from('lottery_settings')
      .update({ is_active: newVal })
      .eq('product_id', productId)
    if (error) {
      setRows(prev =>
        prev.map(r =>
          r.product.id === productId
            ? { ...r, settings: { ...r.settings, is_active: !newVal } }
            : r
        )
      )
    }
  }

  async function handleDelete(id) {
    await supabase.from('products').delete().eq('id', id)
    setDeleteConfirm(null)
    setEditingId(null)
    fetchData()
  }

  async function handleResetItem(item) {
    const { product, settings } = item
    const oldStock = settings?.stock_quantity ?? 0
    const oldDistributed = distributedMap[product.id] || 0

    await supabase
      .from('lottery_settings')
      .update({ stock_quantity: 0, cumulative_stock_added: 0, original_stock: 0 })
      .eq('product_id', product.id)

    await supabase.from('lottery_log').delete().eq('product_id', product.id)
    await supabase.from('stock_additions').delete().eq('product_id', product.id)

    await supabase.from('reset_log').insert({
      scope: 'product',
      product_id: product.id,
      product_name: product.name,
      stock_zeroed: oldStock,
      distributed_zeroed: oldDistributed,
    })

    setRows(prev =>
      prev.map(r =>
        r.product.id === product.id
          ? {
              ...r,
              settings: {
                ...r.settings,
                stock_quantity: 0,
                cumulative_stock_added: 0,
                original_stock: 0,
              },
            }
          : r
      )
    )
    setDistributedMap(prev => {
      const next = { ...prev }
      delete next[product.id]
      return next
    })
    setEditingId(null)
    showToast('Reset complete')
  }

  async function handleResetAll() {
    await supabase
      .from('lottery_settings')
      .update({ stock_quantity: 0, cumulative_stock_added: 0, original_stock: 0 })
      .not('id', 'is', null)

    await supabase.from('lottery_log').delete().not('id', 'is', null)
    await supabase.from('stock_additions').delete().not('id', 'is', null)

    await supabase.from('reset_log').insert({ scope: 'all' })

    setShowResetAll(false)
    setEditingId(null)
    showToast('All items reset to zero')
    fetchData()
  }

  const gradeFilters = ['All', 'A', 'B', 'C']

  return (
    <div>
      {/* Grade Tabs + Add Product */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #2a2a2a' }}>
          {gradeFilters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="cursor-pointer"
              style={{
                background: 'none',
                border: 'none',
                padding: '0 16px',
                height: 36,
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                color: filter === f ? '#ededed' : '#888',
                borderBottom: filter === f ? '2px solid #ededed' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 150ms',
                fontWeight: 400,
              }}
            >
              {f === 'All' ? 'All' : `Grade ${f}`}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSheet(true)}
          className="cursor-pointer"
          style={{
            background: '#ededed',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            height: 32,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            transition: 'background 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ededed')}
        >
          Add Product
        </button>
      </div>

      {/* Grade Summary Strip + Reset All */}
      {!loading && rows.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1a1a1a',
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {gradeSummary.map(g => (
              <div
                key={g.grade}
                style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#666' }}
              >
                <span style={{ color: '#ededed' }}>Grade {g.grade}</span>
                <span> · </span>
                <span style={{ color: '#888' }}>{g.active}</span>
                <span> active</span>
                <span> · </span>
                <span style={{ color: '#888' }}>{g.remaining}</span>
                <span> remaining</span>
                <span> · </span>
                <span style={{ color: '#888' }}>{g.distributed}</span>
                <span> distributed</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowResetAll(true)}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid #ef444440',
              color: '#ef4444',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 13,
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              transition: 'background 150ms',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#ef444410')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Reset All to Zero
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 14 }}>
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 16,
            color: '#555',
            fontSize: 14,
            border: '1px solid #2a2a2a',
            borderRadius: 8,
          }}
        >
          No products found
        </div>
      ) : (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              background: '#0d0d0d',
              borderBottom: '1px solid #2a2a2a',
              padding: '10px 16px',
              fontSize: 11,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              alignItems: 'end',
            }}
          >
            <span>Icon</span>
            <span>Name</span>
            <span>Grade</span>
            <span>Status</span>
            <span><div>Stock<div style={{ textTransform: 'lowercase', color: '#666', fontSize: 10, fontWeight: 400, letterSpacing: 'normal' }}>cumulative</div></div></span>
            <span><div>Remaining<div style={{ textTransform: 'lowercase', color: '#666', fontSize: 10, fontWeight: 400, letterSpacing: 'normal' }}>in stock</div></div></span>
            <span><div>Distributed<div style={{ textTransform: 'lowercase', color: '#666', fontSize: 10, fontWeight: 400, letterSpacing: 'normal' }}>won</div></div></span>
            <span>Active</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {rows.map((item, idx) => {
            const { product, settings } = item
            const dist = distributedMap[product.id] || 0
            const cumulative = settings?.cumulative_stock_added ?? 0
            const remaining = settings?.stock_quantity ?? 0
            const isActive = settings?.is_active ?? false
            const isDeleting = deleteConfirm?.id === product.id
            const isEditing = editingId === product.id
            const gradeColor = GRADE_COLORS[product.grade] || GRADE_COLORS.C
            const status = getStatus(settings)
            const statusStyle = STATUS_STYLES[status]
            const isLast = idx === rows.length - 1

            if (isDeleting) {
              return (
                <div
                  key={product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#0a0a0a',
                    borderBottom: isLast ? 'none' : '1px solid #161616',
                    fontSize: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MerchandiseIcon type={product.icon_type} size={32} />
                    <span style={{ color: '#888' }}>
                      Delete <span style={{ color: '#ededed' }}>{product.name}</span>?
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="cursor-pointer"
                      style={{
                        background: 'transparent',
                        border: '1px solid #ef444440',
                        color: '#ef4444',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ef444415')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="cursor-pointer"
                      style={{
                        background: 'transparent',
                        border: '1px solid #2a2a2a',
                        color: '#888',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "'Inter', sans-serif",
                        transition: 'all 150ms',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#3a3a3a'
                        e.currentTarget.style.color = '#ededed'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#2a2a2a'
                        e.currentTarget.style.color = '#888'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <Fragment key={product.id}>
                {/* Data Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: GRID,
                    padding: '12px 16px',
                    background: '#0a0a0a',
                    borderBottom: isLast && !isEditing ? 'none' : '1px solid #161616',
                    alignItems: 'center',
                    fontSize: 14,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#111111')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0a')}
                >
                  {/* ICON */}
                  <span><MerchandiseIcon type={product.icon_type} size={32} /></span>

                  {/* NAME */}
                  <span style={{ color: '#ededed', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
                    {product.name}
                  </span>

                  {/* GRADE */}
                  <span>
                    <span
                      style={{
                        background: gradeColor.bg,
                        border: `1px solid ${gradeColor.border}`,
                        color: gradeColor.text,
                        borderRadius: 999,
                        padding: '0 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        height: 20,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      {product.grade}
                    </span>
                  </span>

                  {/* STATUS */}
                  <span>
                    <span
                      style={{
                        background: statusStyle.bg,
                        border: `1px solid ${statusStyle.border}`,
                        color: statusStyle.text,
                        borderRadius: 999,
                        padding: '3px 8px',
                        fontSize: 10,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {status}
                    </span>
                  </span>

                  {/* STOCK */}
                  <span style={{ color: cumulative > 0 ? '#ededed' : '#555', fontFamily: "'Inter', sans-serif" }}>
                    {cumulative > 0 ? cumulative : '—'}
                  </span>

                  {/* REMAINING */}
                  <span style={{ color: getRemainingColor(remaining, cumulative), fontFamily: "'Inter', sans-serif" }}>
                    {remaining}
                  </span>

                  {/* DISTRIBUTED */}
                  <span style={{ color: dist > 0 ? '#4fc3f7' : '#555', fontFamily: "'Inter', sans-serif" }}>
                    {dist > 0 ? dist : '—'}
                  </span>

                  {/* ACTIVE */}
                  <span>
                    <AdminSwitch
                      checked={isActive}
                      onChange={() => handleToggle(product.id)}
                    />
                  </span>

                  {/* ACTIONS */}
                  <span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setDeleteConfirm(null)
                          setEditingId(isEditing ? null : product.id)
                        }}
                        className="cursor-pointer"
                        style={{
                          background: 'transparent',
                          border: '1px solid #2a2a2a',
                          color: '#888',
                          borderRadius: 6,
                          padding: '4px 10px',
                          height: 32,
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#3a3a3a'
                          e.currentTarget.style.color = '#ededed'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#2a2a2a'
                          e.currentTarget.style.color = '#888'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setDeleteConfirm(product)
                        }}
                        className="cursor-pointer"
                        style={{
                          background: 'transparent',
                          border: '1px solid #ef444440',
                          color: '#ef4444',
                          borderRadius: 6,
                          padding: '4px 10px',
                          height: 32,
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          transition: 'background 150ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#ef444415')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Delete
                      </button>
                    </div>
                  </span>
                </div>

                {/* Expanded Edit Row */}
                {isEditing && (
                  <EditRow
                    item={item}
                    distributed={dist}
                    rows={rows}
                    onSave={() => { setEditingId(null); fetchData() }}
                    onCancel={() => setEditingId(null)}
                    onResetItem={() => handleResetItem(item)}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
      )}

      {/* Add Product Sheet */}
      {showSheet && (
        <ProductSheet
          onClose={() => setShowSheet(false)}
          onSaved={fetchData}
        />
      )}

      {/* Reset All Modal */}
      {showResetAll && (
        <ResetAllModal
          onConfirm={handleResetAll}
          onCancel={() => setShowResetAll(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#111',
            border: '1px solid #2a2a2a',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: '#ededed',
            padding: '10px 16px',
            borderRadius: 6,
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

/* ─── Expanded Inline Edit Row ─── */

function EditRow({ item, distributed, rows, onSave, onCancel, onResetItem }) {
  const { product, settings } = item
  const cumulative = settings?.cumulative_stock_added ?? 0
  const remaining = settings?.stock_quantity ?? 0

  const [stockMode, setStockMode] = useState('add')
  const [stockValue, setStockValue] = useState('')
  const [weight, setWeight] = useState(String(settings?.probability_weight ?? 1.0))
  const [name, setName] = useState(product.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState(null)

  function switchMode(mode) {
    setStockMode(mode)
    setStockValue(mode === 'set' ? String(cumulative) : '')
  }

  async function fetchHistory() {
    if (historyData !== null) {
      setShowHistory(prev => !prev)
      return
    }
    const { data } = await supabase
      .from('stock_additions')
      .select('*')
      .eq('product_id', product.id)
      .order('added_at', { ascending: false })
      .limit(10)
    setHistoryData(data || [])
    setShowHistory(true)
  }

  const liveEffProb = useMemo(() => {
    const w = parseFloat(weight) || 0
    if (w <= 0 || !settings?.is_active || remaining === 0) return null

    const sameGrade = rows.filter(r => r.product.grade === product.grade)
    const eligible = sameGrade.filter(
      r => r.settings?.is_active && (r.settings?.stock_quantity ?? 0) > 0
    )
    const totalWeight = eligible.reduce((sum, r) => {
      if (r.product.id === product.id) return sum + w
      return sum + (parseFloat(r.settings?.probability_weight) || 0)
    }, 0)

    if (totalWeight === 0) return null
    return ((w / totalWeight) * 100).toFixed(1)
  }, [weight, rows, product, settings, remaining])

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    const weightNum = parseFloat(weight)
    if (isNaN(weightNum) || weightNum < 0.1) { setError('Weight must be 0.1 or greater'); return }

    setSaving(true)
    setError(null)

    const upd = { probability_weight: weightNum }
    let amountAdded = 0

    if (stockMode === 'add') {
      const addAmount = parseInt(stockValue, 10) || 0
      if (addAmount > 0) {
        upd.stock_quantity = remaining + addAmount
        upd.cumulative_stock_added = cumulative + addAmount
        amountAdded = addAmount
      }
    } else {
      const newCumulative = parseInt(stockValue, 10) || 0
      const delta = newCumulative - cumulative
      upd.cumulative_stock_added = newCumulative
      upd.stock_quantity = Math.max(0, remaining + delta)
      if (cumulative === 0 && newCumulative > 0) {
        upd.original_stock = newCumulative
      }
      amountAdded = delta
    }

    if (name.trim() !== product.name) {
      const { error: pErr } = await supabase
        .from('products')
        .update({ name: name.trim() })
        .eq('id', product.id)
      if (pErr) {
        setError('Failed to update name: ' + pErr.message)
        setSaving(false)
        return
      }
    }

    const { error: sErr } = await supabase
      .from('lottery_settings')
      .update(upd)
      .eq('product_id', product.id)

    if (sErr) {
      setError('Failed to save: ' + sErr.message)
      setSaving(false)
      return
    }

    if (amountAdded > 0) {
      await supabase.from('stock_additions').insert({
        product_id: product.id,
        amount: amountAdded,
        mode: stockMode === 'add' ? 'add' : 'set',
      })
    }

    setSaving(false)
    onSave()
  }

  const inputStyle = {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#ededed',
    fontSize: 14,
    padding: '6px 10px',
    height: 32,
    width: 80,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  }

  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: '16px 20px',
        margin: '4px 0',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* LEFT — Stock Management */}
        <div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}>
            Stock
          </div>

          {/* Segmented control */}
          <div style={{
            display: 'inline-flex',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 12,
          }}>
            {['set', 'add'].map(mode => (
              <button
                key={mode}
                onClick={() => switchMode(mode)}
                className="cursor-pointer"
                style={{
                  background: stockMode === mode ? '#ededed' : '#1a1a1a',
                  color: stockMode === mode ? '#0a0a0a' : '#666',
                  border: 'none',
                  padding: '4px 12px',
                  height: 28,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: stockMode === mode ? 600 : 500,
                  fontSize: 12,
                  transition: 'all 150ms',
                }}
              >
                {mode === 'set' ? 'Set Total' : 'Add Units'}
              </button>
            ))}
          </div>

          {stockMode === 'add' ? (
            <div>
              <label style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: '#888',
                display: 'block',
                marginBottom: 6,
              }}>
                Units to add
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockValue}
                  onChange={e => setStockValue(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#ededed')}
                  onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
                />
                {[10, 25, 50, 100].map(n => (
                  <button
                    key={n}
                    onClick={() => setStockValue(String((parseInt(stockValue, 10) || 0) + n))}
                    className="cursor-pointer"
                    style={{
                      background: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      color: '#888',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: 12,
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#3a3a3a'
                      e.currentTarget.style.color = '#ededed'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                      e.currentTarget.style.color = '#888'
                    }}
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: '#888',
                display: 'block',
                marginBottom: 6,
              }}>
                Set total stock to
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockValue}
                onChange={e => setStockValue(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#ededed')}
                onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
              />
            </div>
          )}

          {/* Stock history link */}
          <div style={{ position: 'relative', marginTop: 10 }}>
            <span
              onClick={fetchHistory}
              role="button"
              tabIndex={0}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: '#555',
                cursor: 'pointer',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#888')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              View stock history ↗
            </span>

            {showHistory && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: 12,
                width: 280,
                zIndex: 10,
              }}>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: '#888',
                  marginBottom: 8,
                }}>
                  Stock History
                </div>
                {historyData && historyData.length > 0 ? (
                  historyData.map((entry, i) => (
                    <div key={entry.id} style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      color: '#888',
                      padding: '6px 0',
                      borderBottom: i < historyData.length - 1 ? '1px solid #1a1a1a' : 'none',
                    }}>
                      {new Date(entry.added_at).toLocaleDateString()} — +{entry.amount} units {entry.mode === 'set' ? '(set)' : 'added'}
                    </div>
                  ))
                ) : (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#555' }}>
                    No additions recorded yet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary line */}
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: '#555',
            marginTop: 8,
          }}>
            Stock: {cumulative} · Remaining: {remaining} · Distributed: {distributed}
          </div>
        </div>

        {/* RIGHT — Settings */}
        <div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}>
            Settings
          </div>

          {/* Weight */}
          <div style={{ marginBottom: 12 }}>
            <label style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: '#888',
              display: 'block',
              marginBottom: 6,
            }}>
              Probability weight
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#ededed')}
              onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
            />
            {liveEffProb && (
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: '#4fc3f7',
                marginTop: 4,
              }}>
                Win chance: {liveEffProb}%
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: '#888',
              display: 'block',
              marginBottom: 6,
            }}>
              Product name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
              onFocus={e => (e.target.style.borderColor = '#ededed')}
              onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: '#ef4444',
          marginTop: 12,
        }}>
          {error}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #1a1a1a',
        }}
      >
        {/* Left — Reset this item */}
        <div>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="cursor-pointer"
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: '#ef4444',
                padding: 0,
              }}
            >
              Reset this item
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: '#888',
              }}>
                Reset {product.name}? All metrics → zero.
              </span>
              <button
                onClick={onResetItem}
                className="cursor-pointer"
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: 'white',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="cursor-pointer"
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  color: '#888',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right — Cancel + Save */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: '#888',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3a3a3a'
              e.currentTarget.style.color = '#ededed'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#888'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="cursor-pointer"
            style={{
              background: saving || !name.trim() ? '#555' : '#ededed',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              opacity: saving || !name.trim() ? 0.5 : 1,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => {
              if (!saving && name.trim()) e.currentTarget.style.background = '#ffffff'
            }}
            onMouseLeave={e => {
              if (!saving && name.trim()) e.currentTarget.style.background = '#ededed'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Reset All Confirmation Modal ─── */

function ResetAllModal({ onConfirm, onCancel }) {
  const [resetInput, setResetInput] = useState('')
  const [resetting, setResetting] = useState(false)
  const canConfirm = resetInput === 'RESET'

  async function handleConfirm() {
    setResetting(true)
    await onConfirm()
    setResetting(false)
  }

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 60,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#111111',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          padding: 28,
          width: 400,
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
          zIndex: 61,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, color: '#ef4444' }}>⚠️</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#ededed', marginTop: 12 }}>
            Reset Everything to Zero
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 8, lineHeight: 1.5 }}>
            This will set all stock quantities, cumulative stock added, and distributed counts
            to zero across ALL products and ALL grades. This cannot be undone.
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 6 }}>
            Type RESET to confirm
          </label>
          <input
            type="text"
            value={resetInput}
            onChange={e => setResetInput(e.target.value)}
            placeholder="RESET"
            style={{
              background: '#111111',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              color: '#ededed',
              fontSize: 14,
              padding: '6px 12px',
              height: 32,
              width: '100%',
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#ededed')}
            onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button
            onClick={onCancel}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: '#888',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3a3a3a'
              e.currentTarget.style.color = '#ededed'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#888'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || resetting}
            className="cursor-pointer"
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              opacity: canConfirm && !resetting ? 1 : 0.3,
              transition: 'opacity 150ms',
              cursor: canConfirm && !resetting ? 'pointer' : 'default',
            }}
          >
            {resetting ? 'Resetting...' : 'Reset Everything'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── Add Product Sheet (slide-in panel for new products only) ─── */

function ProductSheet({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('C')
  const [iconType, setIconType] = useState('tshirt')
  const [stock, setStock] = useState('0')
  const [weight, setWeight] = useState('1.0')
  const [active, setActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const stockNum = parseInt(stock, 10)
    const weightNum = parseFloat(weight)

    if (isNaN(stockNum) || stockNum < 0) {
      setError('Stock must be 0 or greater')
      setSaving(false)
      return
    }
    if (isNaN(weightNum) || weightNum < 0.1) {
      setError('Weight must be 0.1 or greater')
      setSaving(false)
      return
    }

    const { data: np, error: pErr } = await supabase
      .from('products')
      .insert({ name: name.trim(), grade, icon_type: iconType })
      .select()
      .single()

    if (pErr) {
      setError('Failed to create product: ' + pErr.message)
      setSaving(false)
      return
    }

    const { error: sErr } = await supabase
      .from('lottery_settings')
      .insert({
        product_id: np.id,
        stock_quantity: stockNum,
        original_stock: stockNum,
        cumulative_stock_added: stockNum,
        probability_weight: weightNum,
        is_active: active,
        version: 1,
      })

    if (sErr) {
      setError('Product created but settings failed: ' + sErr.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const inputStyle = {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#ededed',
    fontSize: 14,
    padding: '6px 12px',
    height: 32,
    width: '100%',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  }

  const labelStyle = {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: '#111111',
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif",
          animation: 'slideInRight 200ms ease-out',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #2a2a2a',
            fontSize: 16,
            color: '#ededed',
            fontWeight: 500,
          }}
        >
          New Product
        </div>

        <div
          style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div>
            <label style={labelStyle}>Product Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acrylic Keychain"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#ededed')}
              onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
            />
          </div>

          <div>
            <label style={labelStyle}>Grade</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23555' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Merchandise Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICON_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setIconType(t.value)}
                  className="cursor-pointer"
                  style={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    background: '#0a0a0a',
                    border: iconType === t.value ? '1px solid #ededed' : '1px solid #2a2a2a',
                    borderRadius: 6,
                    transition: 'border-color 150ms',
                  }}
                >
                  <MerchandiseIcon type={t.value} size={28} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <MerchandiseIcon type={iconType} size={72} />
          </div>

          <div style={{ borderBottom: '1px solid #2a2a2a' }} />

          <div>
            <label style={labelStyle}>Initial Stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={e => setStock(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#ededed')}
              onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
            />
            <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
              Sets both stock and baseline
            </div>
          </div>

          <div>
            <label style={labelStyle}>Probability Weight</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#ededed')}
              onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>Active</label>
            <AdminSwitch checked={active} onChange={() => setActive(!active)} />
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0 24px 8px',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #2a2a2a',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: '#888',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3a3a3a'
              e.currentTarget.style.color = '#ededed'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#888'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="cursor-pointer"
            style={{
              background: saving || !name.trim() ? '#555' : '#ededed',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              opacity: saving || !name.trim() ? 0.5 : 1,
              transition: 'background 150ms',
            }}
            onMouseEnter={e => {
              if (!saving && name.trim()) e.currentTarget.style.background = '#ffffff'
            }}
            onMouseLeave={e => {
              if (!saving && name.trim()) e.currentTarget.style.background = '#ededed'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── Admin Toggle Switch ─── */

function AdminSwitch({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="cursor-pointer"
      role="switch"
      aria-checked={checked}
      style={{
        position: 'relative',
        width: 36,
        height: 20,
        borderRadius: 10,
        background: checked ? '#22c55e' : '#2a2a2a',
        border: 'none',
        padding: 0,
        transition: 'background 200ms',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 200ms',
        }}
      />
    </button>
  )
}

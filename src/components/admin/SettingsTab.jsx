/*
  Supabase RLS — run these in the SQL editor if UPDATE returns 401:

  DROP POLICY IF EXISTS "Public read lottery_settings" ON lottery_settings;
  DROP POLICY IF EXISTS "Allow stock update" ON lottery_settings;
  DROP POLICY IF EXISTS "Allow lottery_settings update" ON lottery_settings;

  CREATE POLICY "allow_select" ON lottery_settings FOR SELECT USING (true);
  CREATE POLICY "allow_insert" ON lottery_settings FOR INSERT WITH CHECK (true);
  CREATE POLICY "allow_update" ON lottery_settings FOR UPDATE USING (true) WITH CHECK (true);

  DATABASE MIGRATION — Run in Supabase SQL Editor:
  ALTER TABLE lottery_settings ADD COLUMN IF NOT EXISTS original_stock integer NOT NULL DEFAULT 0;
*/
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import MerchandiseIcon from '../icons/MerchandiseIcon'

function SettingsRow({ product, settings, effProb, onRowUpdate, isLast, distributed }) {
  const [stock, setStock] = useState(settings?.stock_quantity ?? 0)
  const [weight, setWeight] = useState(settings?.probability_weight ?? 1.0)
  const [originalStock, setOriginalStock] = useState(settings?.original_stock ?? 0)
  const [originalStockEdited, setOriginalStockEdited] = useState(false)
  const [isActive, setIsActive] = useState(settings?.is_active ?? false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEditing) {
      setStock(settings?.stock_quantity ?? 0)
      setWeight(settings?.probability_weight ?? 1.0)
      setOriginalStock(settings?.original_stock ?? 0)
      setOriginalStockEdited(false)
    }
    setIsActive(settings?.is_active ?? false)
  }, [settings, isEditing])

  async function handleToggle() {
    const newValue = !isActive
    setIsActive(newValue)
    const { error: updateError } = await supabase
      .from('lottery_settings')
      .update({ is_active: newValue })
      .eq('product_id', product.id)
    if (updateError) {
      console.error('Supabase error:', updateError.code, updateError.message, updateError.details)
      setIsActive(!newValue)
      setError('Failed to update')
      return
    }
    settings.is_active = newValue
    onRowUpdate(product.id, { is_active: newValue })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    const stockNum = parseInt(stock, 10)
    const weightNum = parseFloat(weight)
    const originalStockNum = parseInt(originalStock, 10)

    if (isNaN(stockNum) || stockNum < 0) {
      setError('Stock must be 0 or greater')
      setIsSaving(false)
      return
    }
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Weight must be greater than 0')
      setIsSaving(false)
      return
    }
    if (originalStockEdited && (isNaN(originalStockNum) || originalStockNum < 0)) {
      setError('Original stock must be 0 or greater')
      setIsSaving(false)
      return
    }

    const updates = {
      stock_quantity: stockNum,
      probability_weight: weightNum,
    }

    if (!settings.original_stock || settings.original_stock === 0) {
      updates.original_stock = stockNum
    }

    if (originalStockEdited) {
      updates.original_stock = originalStockNum
    }

    const { data, error } = await supabase
      .from('lottery_settings')
      .update(updates)
      .eq('product_id', product.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error.code, error.message, error.details)
      setError('Save failed: ' + error.message)
      setIsSaving(false)
      return
    }

    onRowUpdate(product.id, {
      stock_quantity: data.stock_quantity,
      probability_weight: data.probability_weight,
      is_active: data.is_active,
      version: data.version,
      original_stock: data.original_stock,
    })

    setOriginalStockEdited(false)
    setIsEditing(false)
    setIsSaving(false)
  }

  function handleCancel() {
    setStock(settings?.stock_quantity ?? 0)
    setWeight(settings?.probability_weight ?? 1.0)
    setOriginalStock(settings?.original_stock ?? 0)
    setOriginalStockEdited(false)
    setIsEditing(false)
    setError(null)
  }

  const isSoldOut = (settings?.stock_quantity ?? 0) === 0
  const dist = distributed || 0

  const expected = settings?.original_stock || 0
  const actual = (settings?.stock_quantity ?? 0) + dist
  const variance = expected - actual

  const inputStyle = {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#ededed',
    fontSize: 14,
    padding: '6px 12px',
    height: 32,
    width: 80,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 100px 100px 120px 100px 100px 60px 160px',
          padding: '12px 16px',
          background: '#0a0a0a',
          borderBottom: isLast ? 'none' : '1px solid #161616',
          alignItems: 'center',
          fontSize: 14,
          transition: 'background 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#111111'}
        onMouseLeave={e => e.currentTarget.style.background = '#0a0a0a'}
      >
        <span><MerchandiseIcon type={product?.icon_type} size={32} /></span>
        <span style={{ color: '#ededed', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          {product?.name}
          {isSoldOut && (
            <span style={{
              background: '#ef444420',
              border: '1px solid #ef444440',
              color: '#ef4444',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 500,
            }}>
              SOLD OUT
            </span>
          )}
        </span>

        {/* ORIG. STOCK */}
        <span>
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                min="0"
                step="1"
                value={originalStock}
                onChange={e => { setOriginalStock(e.target.value); setOriginalStockEdited(true) }}
                style={{ ...inputStyle, width: 72 }}
                onFocus={e => e.target.style.borderColor = '#ededed'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
              <span style={{ color: '#555', fontSize: 12 }}>✎</span>
            </div>
          ) : (
            <div title="Original stock set when first configured. Edit to reset the baseline.">
              <span style={{ color: '#888' }}>{settings?.original_stock ?? 0}</span>
              <div style={{ color: '#555', fontSize: 10 }}>baseline</div>
            </div>
          )}
        </span>

        {/* CURRENT STOCK */}
        <span>
          {isEditing ? (
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={e => setStock(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#ededed'}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />
          ) : (
            <span style={{ color: (settings?.stock_quantity ?? 0) === 0 ? '#ef4444' : '#ededed' }}>
              {settings?.stock_quantity ?? 0}
            </span>
          )}
        </span>

        {/* DISTRIBUTED */}
        <span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div>
              <span style={{ color: dist > 0 ? '#4fc3f7' : '#555' }}>
                {dist > 0 ? dist : '—'}
              </span>
              {dist > 0 && <div style={{ color: '#555', fontSize: 10 }}>won</div>}
            </div>
            {variance > 0 && (
              <span
                title={`${variance} unit(s) unaccounted for`}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  fontSize: 10,
                  borderRadius: 4,
                  padding: '1px 5px',
                }}
              >
                −{variance}
              </span>
            )}
            {variance < 0 && (
              <span
                title="More distributed than original stock — check baseline"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#22c55e',
                  fontSize: 10,
                  borderRadius: 4,
                  padding: '1px 5px',
                }}
              >
                +{Math.abs(variance)}
              </span>
            )}
          </div>
        </span>

        {/* WEIGHT */}
        <span>
          {isEditing ? (
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#ededed'}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />
          ) : (
            <span style={{ color: '#ededed' }}>{Number(settings?.probability_weight ?? 1.0).toFixed(1)}</span>
          )}
        </span>

        {/* EFF. PROB. */}
        <span style={{ color: '#888' }}>
          {isEditing ? '—' : (effProb ?? '—')}
        </span>

        {/* ACTIVE */}
        <span>
          <AdminSwitch checked={isActive} onChange={handleToggle} />
        </span>

        {/* ACTIONS */}
        <span>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="cursor-pointer"
                style={{
                  background: isSaving ? '#555' : '#ededed',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  height: 32,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'background 150ms',
                  opacity: isSaving ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#ffffff' }}
                onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = '#ededed' }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
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
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setStock(settings?.stock_quantity ?? 0)
                setWeight(settings?.probability_weight ?? 1.0)
                setOriginalStock(settings?.original_stock ?? 0)
                setOriginalStockEdited(false)
                setIsEditing(true)
                setError(null)
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
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' }}
            >
              Edit
            </button>
          )}
        </span>
      </div>
      {error && (
        <div style={{
          padding: '4px 16px 8px',
          background: '#0a0a0a',
          borderBottom: isLast ? 'none' : '1px solid #161616',
        }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#ef4444' }}>
            {error}
          </span>
        </div>
      )}
    </div>
  )
}

export default function SettingsTab() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('C')
  const [loading, setLoading] = useState(true)
  const [distributedMap, setDistributedMap] = useState({})

  const fetchSettings = useCallback(async () => {
    setLoading(true)

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('grade', filter)
      .order('created_at')

    if (productsError) console.error('Supabase error:', productsError.code, productsError.message, productsError.details)

    if (!products || products.length === 0) {
      setRows([])
      setDistributedMap({})
      setLoading(false)
      return
    }

    const { data: allSettings, error: settingsError } = await supabase
      .from('lottery_settings')
      .select('id, product_id, stock_quantity, probability_weight, is_active, version, original_stock')
      .in('product_id', products.map(p => p.id))

    if (settingsError) console.error('Supabase error:', settingsError.code, settingsError.message, settingsError.details)

    const { data: logCounts } = await supabase
      .from('lottery_log')
      .select('product_id')
      .in('product_id', products.map(p => p.id))

    const dMap = {}
    logCounts?.forEach(entry => {
      dMap[entry.product_id] = (dMap[entry.product_id] || 0) + 1
    })
    setDistributedMap(dMap)

    const merged = products.map(product => {
      const settings = allSettings?.find(s => s.product_id === product.id)
      return { product, settings: settings || null }
    })

    for (const item of merged) {
      if (!item.settings) {
        const { data: newSettings, error: insertError } = await supabase
          .from('lottery_settings')
          .insert({
            product_id: item.product.id,
            stock_quantity: 0,
            probability_weight: 1.0,
            is_active: false,
            version: 1,
          })
          .select()
          .single()
        if (insertError) console.error('Supabase error:', insertError.code, insertError.message, insertError.details)
        item.settings = newSettings
      }
    }

    setRows(merged)
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleRowUpdate = useCallback((productId, newSettings) => {
    setRows(prev => prev.map(r =>
      r.product.id === productId
        ? { ...r, settings: { ...r.settings, ...newSettings } }
        : r
    ))
  }, [])

  const effProbMap = useMemo(() => {
    const eligible = rows.filter(r =>
      r.settings?.is_active &&
      (r.settings?.stock_quantity ?? 0) > 0
    )
    const totalWeight = eligible.reduce(
      (sum, r) => sum + (parseFloat(r.settings?.probability_weight) || 0), 0
    )
    const map = {}
    rows.forEach(r => {
      const w = parseFloat(r.settings?.probability_weight) || 0
      const active = r.settings?.is_active
      const inStock = (r.settings?.stock_quantity ?? 0) > 0
      if (!active || !inStock || totalWeight === 0) {
        map[r.product.id] = null
      } else {
        map[r.product.id] = ((w / totalWeight) * 100).toFixed(1) + '%'
      }
    })
    return map
  }, [rows])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 14 }}>Loading...</div>
  }

  const grades = ['A', 'B', 'C']

  return (
    <div>
      {/* Grade Filter */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #2a2a2a', marginBottom: 24 }}>
        {grades.map(g => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className="cursor-pointer"
            style={{
              background: 'none',
              border: 'none',
              padding: '0 16px',
              height: 36,
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              color: filter === g ? '#ededed' : '#888',
              borderBottom: filter === g ? '2px solid #ededed' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 150ms',
              fontWeight: 400,
            }}
          >
            Grade {g}
          </button>
        ))}
      </div>

      {/* Weight explanation banner */}
      <div style={{
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: '12px 16px',
        background: '#111111',
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <span style={{ color: '#555', fontSize: 16, marginTop: 1, flexShrink: 0 }}>ℹ</span>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13, color: '#ededed' }}>
            How probability weights work
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 12, color: '#888', marginTop: 2 }}>
            Each item's win chance = its weight ÷ total weight of all active in-stock items. Example: weights of 1, 1, 2 give win chances of 25%, 25%, 50%. Equal weights = equal chances.
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
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
          No products in this grade
        </div>
      ) : (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 100px 100px 120px 100px 100px 60px 160px',
              background: '#111111',
              borderBottom: '1px solid #2a2a2a',
              padding: '10px 16px',
              fontSize: 11,
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 500,
              alignItems: 'center',
            }}
          >
            <span>Icon</span>
            <span>Name</span>
            <span>Orig. Stock</span>
            <span>Current Stock</span>
            <span>Distributed</span>
            <span>Weight</span>
            <span>Eff. Prob.</span>
            <span>Active</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {rows.map((item, idx) => (
            <SettingsRow
              key={item.product.id}
              product={item.product}
              settings={item.settings}
              effProb={effProbMap[item.product.id]}
              onRowUpdate={handleRowUpdate}
              isLast={idx === rows.length - 1}
              distributed={distributedMap[item.product.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

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

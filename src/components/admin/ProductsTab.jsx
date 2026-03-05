import { useState, useEffect } from 'react'
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
  Active: { text: '#22c55e', bg: '#22c55e20', border: '#22c55e40' },
  Inactive: { text: '#888888', bg: '#88888820', border: '#88888840' },
  'Sold Out': { text: '#ef4444', bg: '#ef444420', border: '#ef444440' },
  'No Settings': { text: '#555555', bg: '#55555520', border: '#55555540' },
}

export default function ProductsTab() {
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('All')
  const [showSheet, setShowSheet] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*, lottery_settings(*)')
      .order('created_at', { ascending: false })

    setProducts(data || [])
    setLoading(false)
  }

  const filtered = filter === 'All'
    ? products
    : products.filter(p => p.grade === filter)

  function getStatus(product) {
    const settings = product.lottery_settings?.[0]
    if (!settings) return 'No Settings'
    if (settings.stock_quantity === 0) return 'Sold Out'
    if (!settings.is_active) return 'Inactive'
    return 'Active'
  }

  async function handleDelete(id) {
    await supabase.from('products').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchProducts()
  }

  const gradeFilters = ['All', 'A', 'B', 'C']

  return (
    <div>
      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        {/* Grade filter tabs — underline style */}
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
          onClick={() => { setEditProduct(null); setShowSheet(true) }}
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
          onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.background = '#ededed'}
        >
          Add Product
        </button>
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 14 }}>Loading...</div>
      ) : filtered.length === 0 ? (
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
              gridTemplateColumns: '56px 1fr 80px 80px 100px 160px',
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
            <span>Grade</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {/* Rows */}
          {filtered.map((product, idx) => {
            const status = getStatus(product)
            const statusStyle = STATUS_STYLES[status] || STATUS_STYLES['No Settings']
            const stock = product.lottery_settings?.[0]?.stock_quantity ?? '—'
            const gradeColor = GRADE_COLORS[product.grade] || GRADE_COLORS.C
            const isDeleting = deleteConfirm?.id === product.id

            return (
              <div
                key={product.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 80px 80px 100px 160px',
                  padding: '12px 16px',
                  background: '#0a0a0a',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #161616' : 'none',
                  alignItems: 'center',
                  fontSize: 14,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#111111'}
                onMouseLeave={e => e.currentTarget.style.background = '#0a0a0a'}
              >
                <span><MerchandiseIcon type={product.icon_type} size={32} /></span>
                <span style={{ color: '#ededed', fontWeight: 500 }}>{product.name}</span>
                <span>
                  <span style={{
                    background: gradeColor.bg,
                    border: `1px solid ${gradeColor.border}`,
                    color: gradeColor.text,
                    borderRadius: 4,
                    padding: '3px 6px',
                    fontSize: 11,
                    fontWeight: 500,
                  }}>
                    {product.grade}
                  </span>
                </span>
                <span style={{ color: '#ededed' }}>{stock}</span>
                <span>
                  <span style={{
                    background: statusStyle.bg,
                    border: `1px solid ${statusStyle.border}`,
                    color: statusStyle.text,
                    borderRadius: 4,
                    padding: '3px 6px',
                    fontSize: 11,
                    fontWeight: 500,
                  }}>
                    {status}
                  </span>
                </span>
                <span>
                  {isDeleting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ color: '#888', whiteSpace: 'nowrap' }}>Delete?</span>
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
                        onMouseEnter={e => e.currentTarget.style.background = '#ef444415'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setEditProduct(product); setShowSheet(true) }}
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
                      <button
                        onClick={() => setDeleteConfirm(product)}
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
                        onMouseEnter={e => e.currentTarget.style.background = '#ef444415'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-in Sheet */}
      {showSheet && (
        <ProductSheet
          product={editProduct}
          onClose={() => { setShowSheet(false); setEditProduct(null) }}
          onSaved={fetchProducts}
        />
      )}
    </div>
  )
}

function ProductSheet({ product, onClose, onSaved }) {
  const [name, setName] = useState(product?.name || '')
  const [grade, setGrade] = useState(product?.grade || 'C')
  const [iconType, setIconType] = useState(product?.icon_type || 'tshirt')
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    if (product) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ name: name.trim(), grade, icon_type: iconType })
        .eq('id', product.id)

      if (updateError) {
        setError('Failed to update product: ' + updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({ name: name.trim(), grade, icon_type: iconType })
        .select()
        .single()

      if (productError) {
        setError('Failed to create product: ' + productError.message)
        setSaving(false)
        return
      }

      const { error: settingsError } = await supabase
        .from('lottery_settings')
        .insert({
          product_id: newProduct.id,
          stock_quantity: 0,
          probability_weight: 1.0,
          is_active: false,
          version: 1,
        })

      if (settingsError) {
        setError('Product created but lottery settings failed: ' + settingsError.message)
        setSaving(false)
        return
      }
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 50,
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
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

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a2a', fontSize: 16, color: '#ededed', fontWeight: 500 }}>
          {product ? product.name : 'New Product'}
        </div>

        {/* Form */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Product Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acrylic Keychain"
              style={{ ...inputStyle, '::placeholder': { color: '#555' } }}
              onFocus={e => e.target.style.borderColor = '#ededed'}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>

          <div>
            <label style={labelStyle}>Grade</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23555' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
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

          {/* Preview */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <MerchandiseIcon type={iconType} size={80} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0 24px 8px', fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #2a2a2a', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' }}
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
            onMouseEnter={e => { if (!saving && name.trim()) e.currentTarget.style.background = '#ffffff' }}
            onMouseLeave={e => { if (!saving && name.trim()) e.currentTarget.style.background = '#ededed' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </>
  )
}

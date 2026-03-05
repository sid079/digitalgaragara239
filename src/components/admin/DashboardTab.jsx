/*
  DATABASE MIGRATION — Run in Supabase SQL Editor:
  ALTER TABLE lottery_settings ADD COLUMN IF NOT EXISTS original_stock integer NOT NULL DEFAULT 0;
*/
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import MerchandiseIcon from '../icons/MerchandiseIcon'

const GRADE_COLORS = {
  A: { text: '#8b5cf6', bg: '#8b5cf620', border: '#8b5cf640' },
  B: { text: '#4fc3f7', bg: '#4fc3f720', border: '#4fc3f740' },
  C: { text: '#f5a623', bg: '#f5a62320', border: '#f5a62340' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function DashboardTab() {
  const [stats, setStats] = useState({
    totalActive: 0,
    totalUnits: 0,
    spinsToday: 0,
    soldOutCount: 0,
    distributedToday: 0,
    allTimeDistributed: 0,
  })
  const [soldOutItems, setSoldOutItems] = useState([])
  const [gradeStats, setGradeStats] = useState([])
  const [productDistributed, setProductDistributed] = useState({})
  const [lastSpinMap, setLastSpinMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)

    const { data: settings } = await supabase
      .from('lottery_settings')
      .select('*, products(*)')

    const today = new Date().toISOString().split('T')[0]

    const { data: allLogs } = await supabase
      .from('lottery_log')
      .select('product_id, grade, spun_at')
      .limit(100000)

    if (!settings) {
      setLoading(false)
      return
    }

    const gradeDistributed = { A: 0, B: 0, C: 0 }
    const pDistributed = {}
    const pLastSpin = {}

    allLogs?.forEach(entry => {
      gradeDistributed[entry.grade] = (gradeDistributed[entry.grade] || 0) + 1
      if (entry.product_id) {
        pDistributed[entry.product_id] = (pDistributed[entry.product_id] || 0) + 1
        if (!pLastSpin[entry.product_id] || new Date(entry.spun_at) > new Date(pLastSpin[entry.product_id])) {
          pLastSpin[entry.product_id] = entry.spun_at
        }
      }
    })

    setProductDistributed(pDistributed)
    setLastSpinMap(pLastSpin)

    const todayLogs = allLogs?.filter(l => l.spun_at?.startsWith(today)) || []

    const activeItems = settings.filter(s => s.is_active)
    const totalUnits = activeItems.reduce((sum, s) => sum + s.stock_quantity, 0)
    const soldOut = settings.filter(s => s.stock_quantity === 0 && s.products)

    setStats({
      totalActive: activeItems.length,
      totalUnits,
      spinsToday: todayLogs.length,
      soldOutCount: soldOut.length,
      distributedToday: todayLogs.length,
      allTimeDistributed: allLogs?.length || 0,
    })

    setSoldOutItems(soldOut)

    const grades = ['A', 'B', 'C'].map(g => {
      const gradeItems = settings.filter(s => s.products?.grade === g)
      const active = gradeItems.filter(s => s.is_active)
      return {
        grade: g,
        totalUnits: active.reduce((sum, s) => sum + s.stock_quantity, 0),
        activeCount: active.length,
        soldOutCount: gradeItems.filter(s => s.stock_quantity === 0).length,
        distributed: gradeDistributed[g] || 0,
      }
    })
    setGradeStats(grades)

    setLoading(false)
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', color: '#555', fontSize: 14 }}>Loading...</div>
  }

  return (
    <div>
      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <MetricCard label="Total Active" value={stats.totalActive} />
        <MetricCard label="Units Remaining" value={stats.totalUnits} />
        <MetricCard label="Distributed Today" value={stats.distributedToday} valueColor="#4fc3f7" />
        <MetricCard label="Sold Out" value={stats.soldOutCount} valueColor={stats.soldOutCount > 0 ? '#ef4444' : '#ededed'} />
      </div>

      {/* Additional 2-card row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
        <MetricCard label="All Time Distributed" value={stats.allTimeDistributed} valueColor="#4fc3f7" />
        <MetricCard label="Spins Today" value={stats.spinsToday} />
      </div>

      {/* Per-Grade Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
        {gradeStats.map(g => {
          const colors = GRADE_COLORS[g.grade]
          return (
            <div
              key={g.grade}
              style={{
                background: '#111111',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              <span
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  borderRadius: 4,
                  padding: '3px 6px',
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}
              >
                {g.grade}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#ededed', fontSize: 14 }}>{g.totalUnits} units remaining</span>
                <span style={{ color: '#4fc3f7', fontSize: 13 }}>{g.distributed} distributed</span>
                <span style={{ color: '#888', fontSize: 13 }}>{g.activeCount} active products</span>
                <span style={{ color: g.soldOutCount > 0 ? '#ef4444' : '#555', fontSize: 13 }}>
                  {g.soldOutCount} sold out
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sold Out Items */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Sold Out Items
        </div>

        {soldOutItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#555',
              padding: 16,
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            All items are in stock
          </div>
        ) : (
          <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 48px 1fr 100px 120px 140px',
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
              <span>Grade</span>
              <span>Icon</span>
              <span>Product Name</span>
              <span>Orig. Stock</span>
              <span>Distributed</span>
              <span>Last Spin</span>
            </div>
            {/* Rows */}
            {soldOutItems.map((item, idx) => {
              const colors = GRADE_COLORS[item.products?.grade] || GRADE_COLORS.C
              const dist = productDistributed[item.product_id] || 0
              const lastSpin = lastSpinMap[item.product_id]
              const origStock = item.original_stock || 0
              const variance = origStock - (item.stock_quantity + dist)

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 48px 1fr 100px 120px 140px',
                    padding: '12px 16px',
                    background: '#0a0a0a',
                    borderBottom: idx < soldOutItems.length - 1 ? '1px solid #161616' : 'none',
                    alignItems: 'center',
                    fontSize: 14,
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#111111'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0a0a0a'}
                >
                  <span>
                    <span
                      style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {item.products?.grade}
                    </span>
                  </span>
                  <span><MerchandiseIcon type={item.products?.icon_type} size={32} /></span>
                  <span style={{ color: '#ededed' }}>{item.products?.name}</span>
                  <span style={{ color: '#888' }}>{origStock}</span>
                  <span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: dist > 0 ? '#4fc3f7' : '#555' }}>
                        {dist > 0 ? dist : '—'}
                      </span>
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
                  <span style={{ color: '#888', fontSize: 13 }}>{formatDate(lastSpin)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, valueColor = '#ededed' }) {
  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
          fontWeight: 400,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, color: valueColor, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

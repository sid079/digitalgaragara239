import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const PAGE_SIZE = 50

const GRADE_COLORS = {
  A: { text: '#8b5cf6', bg: '#8b5cf620', border: '#8b5cf640' },
  B: { text: '#4fc3f7', bg: '#4fc3f720', border: '#4fc3f740' },
  C: { text: '#f5a623', bg: '#f5a62320', border: '#f5a62340' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function LogTab() {
  const [logs, setLogs] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState('')
  const [machineFilter, setMachineFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [summaryTotal, setSummaryTotal] = useState(0)
  const [summaryToday, setSummaryToday] = useState(0)
  const [summaryGrades, setSummaryGrades] = useState({ A: 0, B: 0, C: 0 })

  useEffect(() => { fetchLogs() }, [page, dateFrom, dateTo, machineFilter])

  useEffect(() => { fetchSummary() }, [])

  async function fetchSummary() {
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: allTime },
      { count: todayCount },
      { data: gradeData },
    ] = await Promise.all([
      supabase.from('lottery_log').select('*', { count: 'exact', head: true }),
      supabase.from('lottery_log').select('*', { count: 'exact', head: true }).gte('spun_at', `${today}T00:00:00`),
      supabase.from('lottery_log').select('grade').limit(100000),
    ])

    setSummaryTotal(allTime || 0)
    setSummaryToday(todayCount || 0)

    const grades = { A: 0, B: 0, C: 0 }
    gradeData?.forEach(entry => {
      grades[entry.grade] = (grades[entry.grade] || 0) + 1
    })
    setSummaryGrades(grades)
  }

  async function fetchLogs() {
    setLoading(true)

    let query = supabase
      .from('lottery_log')
      .select('*', { count: 'exact' })
      .order('spun_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (dateFrom) {
      query = query.gte('spun_at', `${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      query = query.lte('spun_at', `${dateTo}T23:59:59`)
    }
    if (machineFilter) {
      query = query.eq('machine_id', machineFilter)
    }

    const { data, count } = await query

    setLogs(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  function exportCSV() {
    const headers = ['spun_at', 'machine_id', 'grade', 'product_name']
    const rows = logs.map(log =>
      [log.spun_at, log.machine_id, log.grade, `"${log.product_name}"`].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lottery-log-${dateFrom || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const machines = ['C-1', 'C-2', 'B-1', 'B-2', 'A-1']

  const inputStyle = {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#ededed',
    fontSize: 14,
    padding: '6px 12px',
    height: 32,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  }

  const labelStyle = {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div>
      {/* Summary Strip */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid #1a1a1a',
          padding: '12px 0',
          marginBottom: 16,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: '#888',
          flexWrap: 'wrap',
        }}
      >
        <span>Total Spins: <span style={{ color: '#ededed' }}>{summaryTotal}</span></span>
        <span>Today: <span style={{ color: '#ededed' }}>{summaryToday}</span></span>
        <span>A: <span style={{ color: '#ededed' }}>{summaryGrades.A}</span></span>
        <span>B: <span style={{ color: '#ededed' }}>{summaryGrades.B}</span></span>
        <span>C: <span style={{ color: '#ededed' }}>{summaryGrades.C}</span></span>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0) }}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#ededed'}
            onBlur={e => e.target.style.borderColor = '#2a2a2a'}
          />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0) }}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#ededed'}
            onBlur={e => e.target.style.borderColor = '#2a2a2a'}
          />
        </div>
        <div>
          <label style={labelStyle}>Machine</label>
          <select
            value={machineFilter}
            onChange={e => { setMachineFilter(e.target.value); setPage(0) }}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              appearance: 'none',
              paddingRight: 28,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23555' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              minWidth: 140,
            }}
          >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={exportCSV}
          disabled={logs.length === 0}
          className="cursor-pointer"
          style={{
            background: 'transparent',
            border: '1px solid #2a2a2a',
            color: logs.length === 0 ? '#555' : '#888',
            borderRadius: 6,
            padding: '6px 14px',
            height: 32,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            transition: 'all 150ms',
            opacity: logs.length === 0 ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (logs.length > 0) { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' } }}
          onMouseLeave={e => { if (logs.length > 0) { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' } }}
        >
          Export CSV
        </button>
      </div>

      {/* Log Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#555', fontSize: 14 }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: '#555',
            fontSize: 14,
          }}
        >
          No spins recorded yet.
        </div>
      ) : (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 120px 80px 1fr',
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
            <span>Date & Time</span>
            <span>Machine</span>
            <span>Grade</span>
            <span>Product Name</span>
          </div>

          {/* Rows */}
          {logs.map((log, idx) => {
            const gradeColor = GRADE_COLORS[log.grade] || GRADE_COLORS.C
            return (
              <div
                key={log.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 120px 80px 1fr',
                  padding: '12px 16px',
                  background: '#0a0a0a',
                  borderBottom: idx < logs.length - 1 ? '1px solid #161616' : 'none',
                  alignItems: 'center',
                  fontSize: 14,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#111111'}
                onMouseLeave={e => e.currentTarget.style.background = '#0a0a0a'}
              >
                <span style={{ color: '#ededed' }}>{formatDate(log.spun_at)}</span>
                <span style={{ color: '#ededed', fontWeight: 500 }}>{log.machine_id}</span>
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
                    {log.grade}
                  </span>
                </span>
                <span style={{ color: '#ededed' }}>{log.product_name}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: page === 0 ? '#555' : '#888',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              opacity: page === 0 ? 0.5 : 1,
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (page > 0) { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' } }}
            onMouseLeave={e => { if (page > 0) { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' } }}
          >
            ← Previous
          </button>
          <span style={{ color: '#888', fontSize: 13 }}>
            Page {page + 1} of {totalPages} ({totalCount} total)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: page >= totalPages - 1 ? '#555' : '#888',
              borderRadius: 6,
              padding: '6px 14px',
              height: 32,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              opacity: page >= totalPages - 1 ? 0.5 : 1,
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { if (page < totalPages - 1) { e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#ededed' } }}
            onMouseLeave={e => { if (page < totalPages - 1) { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' } }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardTab from '../components/admin/DashboardTab'
import InventoryTab from '../components/admin/InventoryTab'
import LogTab from '../components/admin/LogTab'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'log', label: 'Lottery Log' },
]

export default function AdminConsole() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden" style={{ background: '#0a0a0a', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Bar — 48px */}
      <div
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 48, borderBottom: '1px solid #2a2a2a' }}
      >
        <div className="flex items-center gap-0">
          <span className="font-rajdhani font-semibold text-white" style={{ fontSize: 18, letterSpacing: '0.02em' }}>
            STRIKE WORLD
          </span>
          <span style={{ color: '#555', margin: '0 10px', fontSize: 14 }}>—</span>
          <span style={{ color: '#888', fontSize: 14, fontWeight: 400 }}>Admin Console</span>
        </div>
        <button
          onClick={() => navigate('/lottery')}
          className="cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ededed'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}
        >
          ← Back to Lottery
        </button>
      </div>

      {/* Tab Bar — 40px */}
      <div
        className="flex items-end shrink-0"
        style={{ height: 40, borderBottom: '1px solid #2a2a2a', paddingLeft: 24 }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="cursor-pointer relative"
            style={{
              background: 'none',
              border: 'none',
              padding: '0 16px',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              color: activeTab === tab.id ? '#ededed' : '#888',
              transition: 'color 150ms',
              borderBottom: activeTab === tab.id ? '2px solid #ededed' : '2px solid transparent',
              marginBottom: -1,
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#bbb' }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#888' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'log' && <LogTab />}
        </div>
      </div>
    </div>
  )
}

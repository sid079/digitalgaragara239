import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMachine } from '../context/MachineContext'
import PinModal from '../components/lottery/PinModal'

const GRADES = [
  { value: 'C', label: 'Grade C', subtitle: 'Regular Merch', color: '#F5A623' },
  { value: 'B', label: 'Grade B', subtitle: 'Game Merch', color: '#4FC3F7' },
  { value: 'A', label: 'Grade A', subtitle: 'Multi Event', color: '#8B5CF6' },
]

const DEVICE_MAP = {
  C: [{ id: 'C-1', label: 'Device C-1', number: '1' }, { id: 'C-2', label: 'Device C-2', number: '2' }],
  B: [{ id: 'B-1', label: 'Device B-1', number: '1' }, { id: 'B-2', label: 'Device B-2', number: '2' }],
  A: [{ id: 'A-1', label: 'Device A-1', number: '1' }],
}

function CheckIcon({ color = '#ededed', size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function SetupScreen() {
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [showPinModal, setShowPinModal] = useState(false)
  const { setMachine } = useMachine()
  const navigate = useNavigate()

  function handleGradeSelect(grade) {
    setSelectedGrade(grade)
    setSelectedDevice('')
    if (grade === 'A') {
      setSelectedDevice('A-1')
    }
  }

  function handleEnter() {
    if (!selectedGrade || !selectedDevice) return
    setMachine(selectedGrade, selectedDevice)
    navigate('/lottery')
  }

  const devices = selectedGrade ? DEVICE_MAP[selectedGrade] : []
  const showDeviceSelector = selectedGrade && selectedGrade !== 'A'
  const isReady = selectedGrade && selectedDevice

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      overflowY: 'auto',
      background: '#0a0a0a',
    }}>
      <div style={{
        maxWidth: 400,
        margin: '0 auto',
        padding: '0 24px',
        paddingBottom: 48,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 32,
            color: '#ededed',
            margin: 0,
            lineHeight: 1.2,
          }}>
            STRIKE WORLD
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: 14,
            color: '#888',
            margin: 0,
            marginTop: 4,
          }}>
            Lottery Machine Setup
          </p>
        </div>

        {/* Grade Selection */}
        <div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: '#555',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 8,
          }}>
            SELECT GRADE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {GRADES.map(g => {
              const isSelected = selectedGrade === g.value
              return (
                <button
                  key={g.value}
                  onClick={() => handleGradeSelect(g.value)}
                  style={{
                    background: isSelected ? `${g.color}14` : '#111111',
                    border: `1px solid ${isSelected ? g.color : '#2a2a2a'}`,
                    borderRadius: 8,
                    padding: '16px 20px',
                    height: 72,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#3a3a3a'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#2a2a2a'
                  }}
                >
                  <span style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: 28,
                    color: g.color,
                    lineHeight: 1,
                    minWidth: 28,
                  }}>
                    {g.value}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: 14,
                      color: '#ededed',
                      lineHeight: 1.3,
                    }}>
                      {g.label}
                    </div>
                    <div style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      fontSize: 12,
                      color: '#888',
                    }}>
                      {g.subtitle}
                    </div>
                  </div>
                  {isSelected && <CheckIcon color={g.color} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Device Selection */}
        {showDeviceSelector && (
          <div className="animate-setup-fadein" style={{ marginTop: 24 }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}>
              SELECT DEVICE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {devices.map(d => {
                const isSelected = selectedDevice === d.id
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDevice(d.id)}
                    style={{
                      background: isSelected ? 'rgba(237,237,237,0.05)' : '#111111',
                      border: `1px solid ${isSelected ? '#ededed' : '#2a2a2a'}`,
                      borderRadius: 8,
                      padding: '16px 20px',
                      height: 72,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      width: '100%',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = '#3a3a3a'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = '#2a2a2a'
                    }}
                  >
                    <span style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: 28,
                      color: '#ededed',
                      lineHeight: 1,
                      minWidth: 28,
                    }}>
                      {d.number}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: 14,
                        color: '#ededed',
                      }}>
                        {d.label}
                      </div>
                    </div>
                    {isSelected && <CheckIcon />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Enter Button */}
        <button
          onClick={handleEnter}
          disabled={!isReady}
          style={{
            marginTop: 32,
            width: '100%',
            height: 44,
            background: isReady ? '#ededed' : '#2a2a2a',
            color: isReady ? '#0a0a0a' : '#555',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            borderRadius: 8,
            cursor: isReady ? 'pointer' : 'not-allowed',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { if (isReady) e.currentTarget.style.background = '#ffffff' }}
          onMouseLeave={e => { if (isReady) e.currentTarget.style.background = '#ededed' }}
        >
          ENTER LOTTERY
        </button>

        {/* Admin Console Link */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span
            onClick={() => setShowPinModal(true)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#555',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#888' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Admin Console
          </span>
        </div>

        <PinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSuccess={() => {
            setShowPinModal(false)
            navigate('/admin')
          }}
        />
      </div>
    </div>
  )
}

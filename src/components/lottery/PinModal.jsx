import { useState, useEffect, useCallback } from 'react'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '5544'
const MAX_ATTEMPTS = 3
const LOCKOUT_SECONDS = 60

export default function PinModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState(0)
  const [lockCountdown, setLockCountdown] = useState(0)

  const isLocked = Date.now() < lockUntil

  useEffect(() => {
    if (!isLocked) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockCountdown(0)
        setAttempts(0)
        setError('')
      } else {
        setLockCountdown(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockUntil, isLocked])

  const handleDigit = useCallback((digit) => {
    if (isLocked) return
    if (pin.length >= 4) return

    const newPin = pin + digit
    setPin(newPin)
    setError('')

    if (newPin.length === 4) {
      if (newPin === ADMIN_PIN) {
        setPin('')
        setAttempts(0)
        onSuccess()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setShaking(true)
        setError('Incorrect PIN')

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockUntil(Date.now() + LOCKOUT_SECONDS * 1000)
          setLockCountdown(LOCKOUT_SECONDS)
          setError(`Too many attempts. Locked for ${LOCKOUT_SECONDS}s`)
        }

        setTimeout(() => {
          setPin('')
          setShaking(false)
        }, 500)
      }
    }
  }, [pin, attempts, isLocked, onSuccess])

  function handleDelete() {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  function handleClose() {
    setPin('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const hasError = shaking && !isLocked

  return (
    <>
      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .pin-numpad-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          height: 52px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 20px;
          color: #ededed;
          cursor: pointer;
          transition: all 100ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pin-numpad-btn:hover:not(:disabled) {
          background: #222222;
          border-color: #3a3a3a;
        }
        .pin-numpad-btn:active:not(:disabled) {
          background: #2a2a2a;
          transform: scale(0.97);
        }
        .pin-numpad-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#111111',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '32px 28px',
            width: 320,
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            color: '#ededed',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            Admin PIN
          </div>

          {/* PIN Dots / Lockout */}
          {isLocked ? (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: '#ef4444',
              textAlign: 'center',
              marginBottom: 28,
              height: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              Locked for {lockCountdown}s
            </div>
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 28,
              animation: shaking ? 'pinShake 0.3s ease' : 'none',
            }}>
              {[0, 1, 2, 3].map(i => {
                const filled = i < pin.length
                return (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      border: `1px solid ${hasError ? '#ef4444' : filled ? '#ededed' : '#3a3a3a'}`,
                      background: hasError ? '#ef4444' : filled ? '#ededed' : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Numpad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                className="pin-numpad-btn"
                onClick={() => handleDigit(String(n))}
                disabled={isLocked}
              >
                {n}
              </button>
            ))}
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: 13,
                color: '#555',
                cursor: 'pointer',
                height: 52,
                transition: 'color 100ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#888' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
            >
              Cancel
            </button>
            <button
              className="pin-numpad-btn"
              onClick={() => handleDigit('0')}
              disabled={isLocked}
            >
              0
            </button>
            <button
              className="pin-numpad-btn"
              onClick={handleDelete}
              disabled={isLocked}
              style={{ color: '#888' }}
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

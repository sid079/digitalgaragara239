import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMachine } from '../context/MachineContext'
import { useLotteryPool } from '../hooks/useLotteryPool'
import { useInventory } from '../hooks/useInventory'
import ReelColumn from '../components/lottery/ReelColumn'
import SpinButton from '../components/lottery/SpinButton'
import WinScreen from '../components/lottery/WinScreen'
import HamburgerMenu from '../components/lottery/HamburgerMenu'
import PinModal from '../components/lottery/PinModal'

const CORNER_LIGHTS = [
  { top: 12, left: 12, bg: '#f5a623', delay: '0s' },
  { top: 12, right: 12, bg: '#4fc3f7', delay: '0.3s' },
  { bottom: 12, left: 12, bg: '#8b5cf6', delay: '0.6s' },
  { bottom: 12, right: 12, bg: '#f5a623', delay: '0.9s' },
]

const STAR_COUNT = 50

export default function LotteryDisplay() {
  const { grade, machineId, clearMachine } = useMachine()
  const { pool, totalStock, refreshPool } = useLotteryPool(grade)
  const { decrementStock, logSpin } = useInventory()
  const navigate = useNavigate()

  const [hasStarted, setHasStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [winner, setWinner] = useState(null)
  const [showPin, setShowPin] = useState(false)
  const [showReelFlash, setShowReelFlash] = useState(false)

  const stoppedRef = useRef(0)
  const allStoppedResolveRef = useRef(null)
  const hasDecrementedRef = useRef(false)

  const stars = useMemo(() =>
    Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 4,
    })),
  [])

  useEffect(() => {
    document.body.classList.add('lottery-active')
    return () => document.body.classList.remove('lottery-active')
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function enterFullscreen() {
    try {
      document.documentElement.requestFullscreen?.()
    } catch (e) { /* ignore */ }
    setHasStarted(true)
  }

  function requestFullscreenMode() {
    try {
      document.documentElement.requestFullscreen?.()
    } catch (e) { /* ignore */ }
  }

  const pickWinner = useCallback((currentPool) => {
    const eligible = currentPool.filter(item => item.stock_quantity > 0 && item.is_active)
    if (eligible.length === 0) return null

    const totalWeight = eligible.reduce((sum, item) => sum + Number(item.probability_weight), 0)
    let random = Math.random() * totalWeight
    for (const item of eligible) {
      random -= Number(item.probability_weight)
      if (random <= 0) return item
    }
    return eligible[eligible.length - 1]
  }, [])

  const handleColumnStopped = useCallback(() => {
    stoppedRef.current++
    if (stoppedRef.current >= 1) {
      allStoppedResolveRef.current?.()
    }
  }, [])

  async function handleSpin() {
    if (isSpinning || pool.length === 0) return
    hasDecrementedRef.current = false
    setIsSpinning(true)

    await refreshPool()
    const picked = pickWinner(pool)

    if (!picked) {
      setIsSpinning(false)
      return
    }

    stoppedRef.current = 0
    const allStopped = new Promise(resolve => {
      allStoppedResolveRef.current = resolve
    })
    setSelectedWinner(picked)

    await allStopped

    setShowReelFlash(true)
    await new Promise(r => setTimeout(r, 900))
    setShowReelFlash(false)

    if (hasDecrementedRef.current) {
      console.warn('Decrement already fired for this spin — skipping')
      setIsSpinning(false)
      setSelectedWinner(null)
      return
    }
    hasDecrementedRef.current = true

    const result = await decrementStock(picked.product_id)

    let finalWinner = picked

    if (!result.success) {
      await refreshPool()
      const newWinner = pickWinner(pool)
      if (newWinner) {
        finalWinner = newWinner
        await decrementStock(newWinner.product_id)
      }
    }

    await logSpin(machineId, finalWinner.product_id, finalWinner.products.name, grade)
    setWinner(finalWinner)
    setIsSpinning(false)
    setSelectedWinner(null)
  }

  function handleReset() {
    hasDecrementedRef.current = false
    setWinner(null)
    refreshPool()
  }

  function handleChangeDevice() {
    clearMachine()
    navigate('/')
  }

  const soldOut = pool.length === 0 && totalStock === 0

  /* ─── TAP-TO-FULLSCREEN OVERLAY ─── */
  if (!hasStarted) {
    return (
      <div
        onClick={enterFullscreen}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99,
          background: '#050508',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          cursor: 'pointer',
        }}
      >
        <h1
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 32,
            background: 'linear-gradient(180deg, #fff 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            margin: 0,
          }}
        >
          STRIKE WORLD
        </h1>
        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: '#8b5cf6',
            letterSpacing: 3,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Digital Gara Gara
        </p>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 8,
          }}
        >
          ⭐ ✨ ⭐
        </div>
        <p
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: '#ffd166',
            animation: 'tapPulse 1.5s ease-in-out infinite',
            margin: 0,
          }}
        >
          TAP TO BEGIN
        </p>
      </div>
    )
  }

  /* ─── MAIN LAYOUT ─── */
  return (
    <div
      className="lottery-root"
      style={{
        height: '100dvh',
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
        paddingRight: 20,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        paddingLeft: 20,
        boxSizing: 'border-box',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 50% -20%, #1a1060 0%, #0a0820 50%, #050508 100%)',
      }}
    >
      {/* ── Effect 1: Nebula orbs ── */}
      <div
        style={{
          position: 'fixed',
          top: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orbDrift1 8s ease-in-out infinite',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'orbDrift2 10s ease-in-out infinite',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(79,195,247,0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'orbDrift3 12s ease-in-out infinite',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* ── Effect 2: Star field ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {stars.map(star => (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              width: 1.5,
              height: 1.5,
              borderRadius: '50%',
              background: '#fff',
              opacity: 0,
              left: star.left + 'vw',
              top: star.top + 'vh',
              animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Content wrapper (above background effects) ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          flex: '1 1 0',
          minHeight: 0,
        }}
      >
        {/* Section 1: Header */}
        <div
          style={{
            flex: '0 0 auto',
            width: '100%',
            padding: '0 0 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <HamburgerMenu
            onAdminTap={() => setShowPin(true)}
            onChangeDevice={handleChangeDevice}
          />

          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(20px, 4vw, 26px)',
                background: 'linear-gradient(180deg, #fff 0%, #c4b5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
                margin: 0,
              }}
            >
              STRIKE WORLD
            </h1>
            <p
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                color: '#8b5cf6',
                letterSpacing: 3,
                marginTop: 2,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              DIGITAL GARA GARA
            </p>
          </div>

          {!isFullscreen ? (
            <button
              onClick={requestFullscreenMode}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: 18,
                cursor: 'pointer',
                padding: 8,
                lineHeight: 1,
              }}
              aria-label="Enter fullscreen"
            >
              ⛶
            </button>
          ) : (
            <div style={{ width: 38, height: 38 }} />
          )}
        </div>

        {/* Section 2: Stars row */}
        <div
          style={{
            flex: '0 0 auto',
            padding: '4px 0 0',
            marginBottom: 12,
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 8,
          }}
        >
          ⭐ ✨ ⭐ ✨ ⭐
        </div>

        {/* Section 3: Reel box — fills all remaining height */}
        <div
          style={{
            flex: '1 1 0',
            minHeight: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Gradient border wrapper — Effect 3: breathing glow */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 3,
              borderRadius: 20,
              background:
                'linear-gradient(135deg, #f5a623, #8b5cf6, #4fc3f7, #8b5cf6, #f5a623)',
              backgroundSize: '300% 300%',
              animation: showReelFlash
                ? 'borderRotate 4s linear infinite, winnerFlash 0.6s ease-out forwards'
                : 'borderRotate 4s linear infinite, reelBreathe 3s ease-in-out infinite',
            }}
          >
            {/* Inner container */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 18,
                background: '#0f0b28',
                overflow: 'hidden',
              }}
            >
              {/* LUCKY DRAW header bar — Effect 5: glow pulse */}
              <div
                style={{
                  flex: '0 0 auto',
                  background: 'linear-gradient(135deg, #1a0f3e, #2d1a6e)',
                  padding: '10px 16px',
                  textAlign: 'center',
                  borderBottom: '1px solid rgba(139,92,246,0.3)',
                  animation: 'headerPulse 2s ease-in-out infinite',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#ffd166',
                    letterSpacing: 4,
                    animation: 'textGlow 2s ease-in-out infinite',
                  }}
                >
                  ⭐ LUCKY DRAW ⭐
                </span>
              </div>

              {/* Reel scroll window */}
              <ReelColumn
                pool={pool}
                winner={selectedWinner}
                shouldSpin={!!selectedWinner}
                onStopped={handleColumnStopped}
                flashWinner={showReelFlash}
              />

              {/* TAP TO SPIN footer bar */}
              <div
                style={{
                  flex: '0 0 auto',
                  background: 'linear-gradient(135deg, #1a0f3e, #2d1a6e)',
                  padding: '8px 16px',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  tap to spin
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Spin button */}
        <div
          style={{
            flex: '0 0 56px',
            width: '100%',
            marginTop: 14,
          }}
        >
          <SpinButton
            onSpin={handleSpin}
            disabled={isSpinning || !!winner}
            spinning={isSpinning}
            soldOut={soldOut}
          />
        </div>

      </div>

      {/* ── Effect 8: Enhanced corner lights ── */}
      {CORNER_LIGHTS.map((light, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: light.bg,
            boxShadow: `0 0 0 4px ${light.bg}33, 0 0 16px ${light.bg}, 0 0 32px ${light.bg}66`,
            top: light.top,
            left: light.left,
            right: light.right,
            bottom: light.bottom,
            animation: `cornerBlink 1.5s ease-in-out ${light.delay} infinite`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: `2px solid ${light.bg}`,
              animation: `ringPulse 2s ease-out ${light.delay} infinite`,
            }}
          />
        </div>
      ))}

      {/* ── Effect 7: Screen-wide gold flash ── */}
      {showReelFlash && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            background: 'rgba(245,166,35,0.08)',
            pointerEvents: 'none',
            animation: 'screenFlash 0.4s ease-out forwards',
          }}
        />
      )}

      {/* Win Screen Overlay */}
      <WinScreen winner={winner} onReset={handleReset} />

      {/* PIN Modal */}
      <PinModal
        isOpen={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={() => {
          setShowPin(false)
          navigate('/admin')
        }}
      />
    </div>
  )
}

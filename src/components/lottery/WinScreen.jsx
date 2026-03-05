import { useMemo } from 'react'
import MerchandiseIcon from '../icons/MerchandiseIcon'

const COLORS_WAVE1 = ['#f5a623', '#ffd166', '#8b5cf6', '#4fc3f7', '#ffffff', '#ff6b9d']
const COLORS_WAVE2 = ['#ffd166', '#ff6b9d', '#4fc3f7', '#8b5cf6', '#f5a623', '#ffffff']

export default function WinScreen({ winner, onReset }) {
  const particles = useMemo(() => {
    if (!winner) return { wave1: [], wave2: [] }

    const wave1 = Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2 + (Math.random() * 0.5)
      const dist = 80 + Math.random() * 100
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: COLORS_WAVE1[i % 6],
        isCircle: i % 2 === 0,
        delay: (i / 24) * 200,
      }
    })

    const wave2 = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() * 0.8)
      const dist = 60 + Math.random() * 120
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: COLORS_WAVE2[i % 6],
        isCircle: i % 2 === 1,
        delay: 300 + (i / 12) * 200,
      }
    })

    return { wave1, wave2 }
  }, [winner])

  if (!winner) return null

  const allParticles = [...particles.wave1, ...particles.wave2]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(5, 5, 8, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Effect 9: Two-wave particle burst */}
      {allParticles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -4,
            marginTop: -4,
            width: 8,
            height: 8,
            borderRadius: p.isCircle ? '50%' : 0,
            backgroundColor: p.color,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            animation: `winParticleBurst 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
          }}
        />
      ))}

      {/* Content column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          zIndex: 1,
        }}
      >
        {/* Mascot */}
        <img
          src="/mascot-angry.png"
          alt="Mascot"
          style={{
            width: 140,
            mixBlendMode: 'screen',
            animation: 'mascotBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
          onError={(e) => { e.target.style.display = 'none' }}
        />

        {/* Congratulations */}
        <h2
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(28px, 8vw, 42px)',
            background: 'linear-gradient(135deg, #F5A623, #FFD166, #F5A623)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
            margin: 0,
          }}
        >
          CONGRATULATIONS!
        </h2>

        {/* Winning item icon with gold glow */}
        <div
          style={{
            filter: 'drop-shadow(0 0 20px rgba(245,166,35,0.5))',
          }}
        >
          <MerchandiseIcon
            type={winner.products?.icon_type || 'tshirt'}
            size={100}
          />
        </div>

        {/* Product name */}
        <p
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            fontSize: 24,
            color: '#ededed',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {winner.products?.name || 'Mystery Prize'}
        </p>

        {/* Collect message */}
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: 14,
            color: '#888',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Please collect your prize from staff!
        </p>

        {/* Reset button */}
        <button
          onClick={onReset}
          style={{
            border: '1px solid #2a2a2a',
            background: 'transparent',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: '#888',
            borderRadius: 6,
            padding: '10px 28px',
            cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3a3a3a'
            e.currentTarget.style.color = '#ededed'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a2a'
            e.currentTarget.style.color = '#888'
          }}
        >
          RESET FOR NEXT PLAYER
        </button>
      </div>
    </div>
  )
}

export default function SpinButton({ onSpin, disabled, spinning, soldOut }) {
  if (soldOut) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <p
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            background: 'linear-gradient(135deg, #F5A623, #FFD166, #F5A623)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Come back soon!
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: '#888',
            marginTop: 12,
            fontWeight: 400,
          }}
        >
          All prizes for this grade have been claimed
        </p>
      </div>
    )
  }

  const isDisabled = disabled || spinning

  return (
    <div
      onClick={!isDisabled ? onSpin : undefined}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      style={{
        width: '100%',
        height: 64,
        borderRadius: 32,
        padding: 3,
        background: isDisabled
          ? '#1a1a1a'
          : 'linear-gradient(135deg, #ffd166, #f5a623, #c97000, #f5a623, #ffd166)',
        backgroundSize: '300% 100%',
        animation: isDisabled
          ? 'none'
          : 'shimmer 2s linear infinite, spinGlow 2s ease-in-out infinite',
        boxShadow: isDisabled ? 'none' : undefined,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.15s',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        if (!isDisabled) e.currentTarget.style.transform = 'scale(0.98)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onTouchStart={(e) => {
        if (!isDisabled) e.currentTarget.style.transform = 'scale(0.98)'
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 29,
          background: isDisabled
            ? '#111'
            : 'linear-gradient(135deg, #f5a623 0%, #e8831a 100%)',
          boxShadow: isDisabled ? 'none' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {spinning ? (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 15,
              color: '#444',
            }}
          >
            SPINNING...
          </span>
        ) : (
          <>
            <span
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.8)',
                animation: 'rotateStar 3s linear infinite',
                display: 'inline-block',
              }}
            >
              ✦
            </span>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 28,
                color: '#fff',
                letterSpacing: 4,
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              SPIN
            </span>
            <span
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.8)',
                animation: 'rotateStar 3s linear infinite',
                display: 'inline-block',
              }}
            >
              ✦
            </span>
          </>
        )}
      </div>
    </div>
  )
}

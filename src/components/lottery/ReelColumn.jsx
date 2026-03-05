import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import MerchandiseIcon from '../icons/MerchandiseIcon'

const PADDING_COUNT = 4

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ReelColumn({ pool, winner, shouldSpin, onStopped, flashWinner }) {
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(0)
  const [paddingTop, setPaddingTop] = useState(0)
  const [cssTransition, setCssTransition] = useState('none')
  const [blurPx, setBlurPx] = useState(0)
  const [centeredIndex, setCenteredIndex] = useState(-1)
  const [itemHeight, setItemHeight] = useState(80)

  const windowRef = useRef(null)
  const hasSpunRef = useRef(false)
  const poolRef = useRef(pool)
  const onStoppedRef = useRef(onStopped)
  const itemHeightRef = useRef(80)

  useEffect(() => { poolRef.current = pool }, [pool])
  useEffect(() => { onStoppedRef.current = onStopped }, [onStopped])

  useLayoutEffect(() => {
    function measure() {
      if (!windowRef.current) return
      const h = windowRef.current.clientHeight
      const ih = Math.max(Math.floor(h / 3), 40)
      setItemHeight(ih)
      setPaddingTop(h / 2 - ih / 2)
      itemHeightRef.current = ih
    }

    measure()

    const observer = new ResizeObserver(measure)
    if (windowRef.current) observer.observe(windowRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (pool.length > 0 && !shouldSpin) {
      const shuffled = shuffleArray(pool).slice(0, 9)
      setItems(shuffled)
      const ih = itemHeightRef.current
      const center = Math.min(4, Math.floor(shuffled.length / 2))
      setOffset(center * ih)
      setCenteredIndex(center)
      setCssTransition('none')
      setBlurPx(0)
      hasSpunRef.current = false
    }
  }, [pool, shouldSpin])

  useEffect(() => {
    if (!shouldSpin || !winner || poolRef.current.length === 0) return
    if (hasSpunRef.current) return
    hasSpunRef.current = true

    const currentPool = poolRef.current
    const ih = itemHeightRef.current
    let cancelled = false
    const pendingTimeouts = []

    function schedule(fn, ms) {
      const id = setTimeout(fn, ms)
      pendingTimeouts.push(id)
      return id
    }

    function randomItem() {
      return currentPool[Math.floor(Math.random() * currentPool.length)]
    }

    const before = Array.from({ length: PADDING_COUNT }, randomItem)
    const scrollItems = Array.from({ length: 20 }, randomItem)
    const after = Array.from({ length: PADDING_COUNT }, randomItem)
    const displayArray = [...before, ...scrollItems, winner, ...after]

    const WINNER_INDEX = PADDING_COUNT + 20
    const startOffset = PADDING_COUNT * ih

    setItems(displayArray)
    setOffset(startOffset)
    setCenteredIndex(-1)
    setCssTransition('none')
    setBlurPx(0.8)

    const TOTAL_STEPS = 20
    const timings = []
    for (let i = 0; i < TOTAL_STEPS; i++) {
      if (i < 10) timings.push(80)
      else if (i < 17) timings.push(Math.round(80 + ((i - 10) / 6) * 180))
      else timings.push(300)
    }

    let step = 0

    function animate() {
      if (cancelled) return

      if (step >= TOTAL_STEPS) {
        setCenteredIndex(WINNER_INDEX)
        schedule(() => {
          if (!cancelled) onStoppedRef.current?.()
        }, 400)
        return
      }

      const delay = timings[step]
      const isLast = step === TOTAL_STEPS - 1

      if (step < 10) {
        setCssTransition(`transform ${Math.round(delay * 0.8)}ms linear`)
        setBlurPx(0.8)
      } else if (step < 17) {
        setCssTransition(`transform ${Math.round(delay * 0.8)}ms ease-out`)
        setBlurPx(+(Math.max(0, 0.8 * (1 - (step - 9) / 7))).toFixed(2))
      } else if (!isLast) {
        setCssTransition(`transform ${delay}ms ease-out`)
        setBlurPx(0)
      } else {
        setCssTransition(`transform ${delay}ms cubic-bezier(0.34, 1.2, 0.64, 1)`)
        setBlurPx(0)
      }

      step++
      setOffset(startOffset + step * ih)
      schedule(animate, delay)
    }

    requestAnimationFrame(() => {
      if (!cancelled) schedule(animate, 50)
    })

    return () => {
      cancelled = true
      pendingTimeouts.forEach(id => clearTimeout(id))
    }
  }, [shouldSpin, winner])

  const iconSize = Math.round(itemHeight * 0.38)

  return (
    <div
      ref={windowRef}
      style={{
        flex: '1 1 0',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top fade */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '28%',
          zIndex: 5,
          pointerEvents: 'none',
          background: 'linear-gradient(180deg, #0f0b28 0%, transparent 100%)',
        }}
      />

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '28%',
          zIndex: 5,
          pointerEvents: 'none',
          background: 'linear-gradient(0deg, #0f0b28 0%, transparent 100%)',
        }}
      />

      {/* Center highlight band — Effect 4: shimmer overlay */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          height: itemHeight,
          left: 0,
          right: 0,
          zIndex: 3,
          pointerEvents: 'none',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, transparent, rgba(245,166,35,0.06) 30%, rgba(245,166,35,0.10) 50%, rgba(245,166,35,0.06) 70%, transparent)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(245,166,35,0.15) 30%, rgba(255,255,255,0.08) 50%, rgba(245,166,35,0.15) 70%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'centerShimmer 2.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Effect 7: Center band flash overlay */}
      {flashWinner && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            height: itemHeight,
            left: 0,
            right: 0,
            zIndex: 3,
            pointerEvents: 'none',
            animation: 'highlightFlash 0.9s ease-in-out',
          }}
        />
      )}

      {/* Top gold line */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          height: 1,
          background: 'rgba(245,166,35,0.4)',
          top: `calc(50% - ${itemHeight / 2}px)`,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom gold line */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          height: 1,
          background: 'rgba(245,166,35,0.4)',
          top: `calc(50% + ${itemHeight / 2}px)`,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />

      {/* Track */}
      <div
        style={{
          paddingTop: paddingTop,
          transform: `translateY(-${offset}px)`,
          transition: cssTransition,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
        }}
      >
        {items.map((item, i) => {
          const isCenter = i === centeredIndex
          return (
            <div
              key={`${item?.id || 'x'}-${i}`}
              style={{
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                padding: '0 20px',
              }}
            >
              <div style={{ opacity: isCenter ? 1 : 0.6, transition: 'opacity 0.3s' }}>
                <MerchandiseIcon
                  type={item?.products?.icon_type}
                  size={iconSize}
                />
              </div>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: isCenter ? 'clamp(18px, 3.5vw, 22px)' : 'clamp(16px, 3vw, 20px)',
                  fontWeight: 600,
                  color: isCenter ? '#ffd166' : 'rgba(255,255,255,0.35)',
                  opacity: isCenter ? 1 : 0.6,
                  transition: 'color 0.3s, opacity 0.3s',
                  whiteSpace: 'nowrap',
                }}
              >
                {item?.products?.name || 'Prize'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

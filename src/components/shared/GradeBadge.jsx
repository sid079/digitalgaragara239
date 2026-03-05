const gradeColors = {
  C: '#F5A623',
  B: '#4FC3F7',
  A: '#8B5CF6',
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function GradeBadge({ grade }) {
  const color = gradeColors[grade] || gradeColors.C

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        background: hexToRgba(color, 0.15),
        border: `1px solid ${hexToRgba(color, 0.3)}`,
        color: color,
        borderRadius: 999,
        padding: '3px 10px',
        marginTop: 4,
      }}
    >
      GRADE {grade}
    </span>
  )
}

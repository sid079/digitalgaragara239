export default function MerchandiseIcon({ type, size = 64 }) {
  const icons = {
    tshirt: TShirtIcon,
    badge: BadgeIcon,
    sticker: StickerIcon,
    figurine: FigurineIcon,
    keychain: KeychainIcon,
    gift_hamper: GiftHamperIcon,
  }

  const IconComponent = icons[type] || TShirtIcon
  return <IconComponent size={size} />
}

function TShirtIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(91,45,158,0.6))' }}>
      <path d="M16 14L10 20V28H18V54H46V28H54V20L48 14H40L36 20H28L24 14H16Z" fill="#8B5CF6" />
      <path d="M10 20L16 14H24L28 20H36L40 14H48L54 20V28H46V26H18V28H10V20Z" fill="#9D6FFF" />
      <path d="M16 14L10 20V24L16 18H24L28 20H36L40 14H42L36 20H28L24 14H16Z" fill="white" fillOpacity="0.35" />
      <ellipse cx="28" cy="20" rx="12" ry="6" fill="white" fillOpacity="0.15" />
      <path d="M24 14L28 20H36L40 14" stroke="#7C3AED" strokeWidth="1" fill="none" />
    </svg>
  )
}

function BadgeIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(245,166,35,0.6))' }}>
      <rect x="26" y="44" width="12" height="10" rx="2" fill="#D4A017" />
      <circle cx="32" cy="28" r="18" fill="#F5A623" />
      <circle cx="32" cy="28" r="14" fill="#FFD166" />
      <polygon points="32,16 34.5,23 42,23 36,28 38,35 32,31 26,35 28,28 22,23 29.5,23" fill="white" fillOpacity="0.8" />
      <ellipse cx="26" cy="20" rx="8" ry="5" fill="white" fillOpacity="0.25" transform="rotate(-20 26 20)" />
    </svg>
  )
}

function StickerIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(79,195,247,0.6))' }}>
      <path d="M32 6C40 4 50 10 54 18C58 26 56 38 50 46C44 54 34 58 26 56C18 54 10 46 8 38C6 30 10 18 18 12C24 7 28 6 32 6Z"
        fill="#4FC3F7" stroke="white" strokeWidth="3" />
      <polygon points="32,18 34.5,25 42,25 36,30 38,37 32,33 26,37 28,30 22,25 29.5,25" fill="white" fillOpacity="0.7" />
      <ellipse cx="24" cy="18" rx="8" ry="5" fill="white" fillOpacity="0.3" transform="rotate(-15 24 18)" />
    </svg>
  )
}

function FigurineIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(204,42,42,0.6))' }}>
      <rect x="20" y="52" width="24" height="6" rx="2" fill="#8B1A1A" />
      <rect x="22" y="34" width="20" height="18" rx="4" fill="#CC2A2A" />
      <rect x="34" y="34" width="8" height="18" rx="4" fill="#FF6B6B" fillOpacity="0.5" />
      <circle cx="32" cy="22" r="12" fill="#CC2A2A" />
      <ellipse cx="36" cy="18" rx="6" ry="8" fill="#FF6B6B" fillOpacity="0.4" />
      <circle cx="27" cy="20" r="2.5" fill="white" />
      <circle cx="37" cy="20" r="2.5" fill="white" />
      <circle cx="27" cy="20.5" r="1.2" fill="#1a1a1a" />
      <circle cx="37" cy="20.5" r="1.2" fill="#1a1a1a" />
      <ellipse cx="28" cy="14" rx="7" ry="4" fill="white" fillOpacity="0.2" transform="rotate(-10 28 14)" />
      <rect x="24" y="50" width="5" height="6" rx="2" fill="#CC2A2A" />
      <rect x="35" y="50" width="5" height="6" rx="2" fill="#CC2A2A" />
    </svg>
  )
}

function KeychainIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(52,211,153,0.6))' }}>
      <circle cx="32" cy="10" r="5" fill="none" stroke="#9CA3AF" strokeWidth="2.5" />
      <rect x="30.5" y="14" width="3" height="6" rx="1" fill="#B0B0B0" />
      <circle cx="32" cy="36" r="16" fill="#34D399" />
      <circle cx="32" cy="36" r="12" fill="#6EE7B7" />
      <polygon points="32,26 34,32 40,32 35,36 37,42 32,38 27,42 29,36 24,32 30,32" fill="white" fillOpacity="0.7" />
      <ellipse cx="26" cy="28" rx="7" ry="5" fill="white" fillOpacity="0.3" transform="rotate(-15 26 28)" />
    </svg>
  )
}

function GiftHamperIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(91,45,158,0.6))' }}>
      <rect x="12" y="26" width="40" height="28" rx="4" fill="#5B2D9E" />
      <rect x="10" y="20" width="44" height="10" rx="3" fill="#8B5CF6" />
      <rect x="29" y="20" width="6" height="38" fill="#F5A623" />
      <rect x="10" y="23" width="44" height="4" fill="#F5A623" />
      <circle cx="28" cy="18" r="5" fill="#F5A623" />
      <circle cx="36" cy="18" r="5" fill="#F5A623" />
      <circle cx="32" cy="16" r="3" fill="#FFD166" />
      <ellipse cx="22" cy="22" rx="10" ry="4" fill="white" fillOpacity="0.2" transform="rotate(-5 22 22)" />
    </svg>
  )
}

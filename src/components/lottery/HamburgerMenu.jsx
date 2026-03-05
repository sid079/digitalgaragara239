import { useState } from 'react'

export default function HamburgerMenu({ onAdminTap, onChangeDevice }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Hamburger Icon */}
      <button
        onClick={() => setIsOpen(true)}
        style={{ color: '#888', fontSize: 22, background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Overlay + Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Drawer */}
          <div
            className="absolute top-0 left-0 h-full w-64 bg-sw-midnight/95 border-r border-white/10 p-6
                       transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-display text-xl text-white">Menu</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 text-2xl hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onAdminTap()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10
                           text-white font-body text-lg transition-colors"
              >
                <span className="text-xl">🔒</span>
                Admin Console
              </button>

              <button
                onClick={() => {
                  setIsOpen(false)
                  onChangeDevice()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10
                           text-white font-body text-lg transition-colors"
              >
                <span className="text-xl">🔄</span>
                Change Device
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

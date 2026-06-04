import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X } from 'lucide-react'

const KEY = 'gs_cookie_consent'
export const CONSENT_VERSION = '2'  // incrémenter à chaque changement majeur de politique

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || 'null')
      if (!stored || stored.v !== CONSENT_VERSION) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(KEY, JSON.stringify({ v: CONSENT_VERSION, at: Date.now() }))
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 24, x: '-50%' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            zIndex: 9000,
            width: 'calc(100% - 32px)',
            maxWidth: 680,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            flexWrap: 'wrap',
          }}>
          {/* Icon */}
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Cookie size={16} color="var(--ember)" />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
              GetShift utilise le stockage local pour ta session et tes préférences —
              nécessaire au fonctionnement de l'app.{' '}
            </span>
            <a href="#/confidentialite" style={{ fontSize: 13, color: 'var(--ember)', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              En savoir plus
            </a>
          </div>

          {/* CTA */}
          <motion.button
            onClick={accept}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 20px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 9, color: 'var(--text-on-ember)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-ember)', flexShrink: 0 }}>
            J'ai compris
          </motion.button>

          {/* Close */}
          <button
            onClick={accept}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            aria-label="Fermer">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

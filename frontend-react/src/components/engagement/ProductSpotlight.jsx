import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import GetShiftLogoKick from '../GetShiftLogoKick'
import { SPOTLIGHT_WC26_KEY } from '../../utils/engagement'

export default function ProductSpotlight({ open, onClose }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open || reduced) return
    const t = setTimeout(() => {
      confetti({
        particleCount: 70,
        spread: 62,
        origin: { y: 0.58 },
        colors: ['#F0884A', '#FAF8F4', '#18191B', '#B8521C'],
        disableForReducedMotion: true,
      })
    }, 280)
    return () => clearTimeout(t)
  }, [open, reduced])

  const close = () => {
    try { localStorage.setItem(SPOTLIGHT_WC26_KEY, '1') } catch {}
    onClose?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gs-spotlight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gs-spotlight-title"
        >
          <motion.div
            className="gs-spotlight__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.div
            className="gs-spotlight__card"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className="gs-spotlight__close" onClick={close} aria-label="Fermer">
              ×
            </button>

            <div className="gs-spotlight__logo">
              <GetShiftLogoKick markSize={52} gap={10} wordStyle={{ fontSize: 22, letterSpacing: '-0.5px' }} />
            </div>

            <span className="gs-spotlight__badge">Coupe du Monde 2026</span>

            <h2 id="gs-spotlight-title" className="gs-spotlight__title">
              GetShift célèbre la CDM avec toi
            </h2>

            <p className="gs-spotlight__text">
              Animation sur le logo, bannière festive et compte à rebours vers la finale —
              visible partout dans l&apos;app jusqu&apos;au 19 juillet.
            </p>

            <ul className="gs-spotlight__list">
              <li>Logo animé style Google Doodle</li>
              <li>Bannière avec compte à rebours live</li>
              <li>100 % responsive</li>
            </ul>

            <motion.button
              type="button"
              className="gs-spotlight__cta"
              onClick={close}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Voir la magie ⚽
            </motion.button>
          </motion.div>

          <style>{`
            .gs-spotlight {
              position: fixed;
              inset: 0;
              z-index: 500;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
              pointer-events: none;
            }
            .gs-spotlight__backdrop {
              position: absolute;
              inset: 0;
              background: rgba(14, 16, 17, 0.72);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              pointer-events: auto;
            }
            .gs-spotlight__card {
              position: relative;
              width: min(100%, 420px);
              background: var(--surface-1);
              border: 1px solid var(--border-subtle);
              border-radius: 20px;
              padding: 28px 24px 24px;
              box-shadow: 0 32px 80px rgba(0,0,0,0.45), var(--ember-glow);
              pointer-events: auto;
              text-align: center;
            }
            .gs-spotlight__close {
              position: absolute;
              top: 10px;
              right: 12px;
              width: 32px;
              height: 32px;
              border: none;
              background: transparent;
              color: var(--text-tertiary);
              font-size: 22px;
              cursor: pointer;
              border-radius: 8px;
            }
            .gs-spotlight__close:hover { color: var(--text-primary); background: var(--surface-2); }
            .gs-spotlight__logo {
              display: flex;
              justify-content: center;
              margin-bottom: 16px;
            }
            .gs-spotlight__badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              color: var(--ember);
              margin-bottom: 10px;
            }
            .gs-spotlight__title {
              margin: 0 0 10px;
              font-size: clamp(20px, 4.5vw, 24px);
              font-weight: 800;
              letter-spacing: -0.4px;
              color: var(--text-primary);
              line-height: 1.2;
            }
            .gs-spotlight__text {
              margin: 0 0 16px;
              font-size: 14px;
              line-height: 1.65;
              color: var(--text-secondary);
            }
            .gs-spotlight__list {
              list-style: none;
              margin: 0 0 20px;
              padding: 12px 14px;
              border-radius: 12px;
              background: var(--surface-2);
              border: 1px solid var(--border-subtle);
              text-align: left;
            }
            .gs-spotlight__list li {
              font-size: 13px;
              color: var(--text-primary);
              padding: 5px 0;
              padding-left: 18px;
              position: relative;
            }
            .gs-spotlight__list li::before {
              content: '⚽';
              position: absolute;
              left: 0;
              font-size: 11px;
              opacity: 0.85;
            }
            .gs-spotlight__cta {
              width: 100%;
              padding: 13px 18px;
              border: none;
              border-radius: 12px;
              background: linear-gradient(135deg, var(--ember), var(--ember-hover));
              color: var(--text-on-ember, #1A1A1B);
              font-size: 14px;
              font-weight: 700;
              cursor: pointer;
              font-family: var(--font-ui);
              box-shadow: var(--shadow-ember);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

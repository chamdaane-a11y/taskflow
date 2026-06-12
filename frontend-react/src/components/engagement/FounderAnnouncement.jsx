import { motion, AnimatePresence } from 'framer-motion'
import { Mail, X } from 'lucide-react'
import { ANNOUNCEMENT_DISMISS_KEY } from '../../utils/engagement'

export default function FounderAnnouncement({ announcement, open, onClose }) {
  if (!announcement) return null

  const dismiss = () => {
    try { localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, String(announcement.id)) } catch {}
    onClose?.()
  }

  const goCta = () => {
    dismiss()
    const href = announcement.cta_href || 'https://usegetshift.com'
    if (href.startsWith('http')) window.open(href, '_blank', 'noopener,noreferrer')
    else window.location.hash = href.replace(/^#/, '')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gs-founder-ann"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gs-founder-ann-title"
        >
          <motion.div className="gs-founder-ann__backdrop" onClick={dismiss} />
          <motion.div
            className="gs-founder-ann__card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className="gs-founder-ann__close" onClick={dismiss} aria-label="Fermer">
              <X size={18} />
            </button>

            <div className="gs-founder-ann__head">
              <div className="gs-founder-ann__icon"><Mail size={18} strokeWidth={2.2} /></div>
              <div>
                <span className="gs-founder-ann__badge">Message de Hamdaane</span>
                <h2 id="gs-founder-ann-title" className="gs-founder-ann__title">{announcement.titre}</h2>
              </div>
            </div>

            <p className="gs-founder-ann__intro">{announcement.intro}</p>

            {announcement.items?.length > 0 && (
              <ul className="gs-founder-ann__list">
                {announcement.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            <div className="gs-founder-ann__actions">
              <motion.button type="button" className="gs-founder-ann__cta" onClick={goCta} whileTap={{ scale: 0.98 }}>
                {announcement.cta_label || 'Ouvrir GetShift'}
              </motion.button>
              <button type="button" className="gs-founder-ann__later" onClick={dismiss}>
                Plus tard
              </button>
            </div>
          </motion.div>

          <style>{`
            .gs-founder-ann {
              position: fixed;
              inset: 0;
              z-index: 490;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding: 12px 12px max(12px, env(safe-area-inset-bottom));
              pointer-events: none;
            }
            @media (min-width: 640px) {
              .gs-founder-ann {
                align-items: center;
                padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
              }
            }
            .gs-founder-ann__backdrop {
              position: absolute;
              inset: 0;
              background: rgba(14, 16, 17, 0.55);
              backdrop-filter: blur(4px);
              pointer-events: auto;
            }
            .gs-founder-ann__card {
              position: relative;
              width: min(100%, 440px);
              max-height: min(88vh, 560px);
              overflow-y: auto;
              background: var(--surface-1);
              border: 1px solid var(--border-subtle);
              border-radius: 18px 18px 14px 14px;
              padding: 20px 18px 18px;
              box-shadow: 0 24px 64px rgba(0,0,0,0.35);
              pointer-events: auto;
            }
            @media (min-width: 640px) {
              .gs-founder-ann__card { border-radius: 18px; padding: 24px 22px 22px; }
            }
            .gs-founder-ann__close {
              position: absolute;
              top: 10px;
              right: 10px;
              width: 32px;
              height: 32px;
              border: none;
              background: var(--surface-2);
              color: var(--text-tertiary);
              border-radius: 8px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .gs-founder-ann__head {
              display: flex;
              gap: 12px;
              align-items: flex-start;
              margin-bottom: 12px;
              padding-right: 28px;
            }
            .gs-founder-ann__icon {
              width: 40px;
              height: 40px;
              border-radius: 11px;
              background: var(--ember-soft);
              color: var(--ember);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .gs-founder-ann__badge {
              display: block;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: var(--ember);
              margin-bottom: 4px;
            }
            .gs-founder-ann__title {
              margin: 0;
              font-size: clamp(17px, 4.2vw, 20px);
              font-weight: 800;
              letter-spacing: -0.35px;
              line-height: 1.25;
              color: var(--text-primary);
            }
            .gs-founder-ann__intro {
              margin: 0 0 14px;
              font-size: 14px;
              line-height: 1.65;
              color: var(--text-secondary);
            }
            .gs-founder-ann__list {
              list-style: none;
              margin: 0 0 16px;
              padding: 10px 12px;
              border-radius: 12px;
              background: var(--surface-2);
              border: 1px solid var(--border-subtle);
            }
            .gs-founder-ann__list li {
              font-size: 13px;
              color: var(--text-primary);
              padding: 4px 0 4px 16px;
              position: relative;
              line-height: 1.45;
            }
            .gs-founder-ann__list li::before {
              content: '—';
              position: absolute;
              left: 0;
              color: var(--ember);
              font-weight: 700;
            }
            .gs-founder-ann__actions {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            @media (min-width: 480px) {
              .gs-founder-ann__actions { flex-direction: row; align-items: center; }
            }
            .gs-founder-ann__cta {
              flex: 1;
              padding: 12px 16px;
              border: none;
              border-radius: 11px;
              background: linear-gradient(135deg, var(--ember), var(--ember-hover));
              color: var(--text-on-ember, #1A1A1B);
              font-size: 14px;
              font-weight: 700;
              cursor: pointer;
              font-family: var(--font-ui);
            }
            .gs-founder-ann__later {
              padding: 10px 14px;
              border: none;
              background: transparent;
              color: var(--text-secondary);
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              font-family: var(--font-ui);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

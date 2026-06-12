import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { dismissPushNudge } from '../../utils/engagement'

export default function PushActivationNudge({ visible, busy, onActivate, onDismiss }) {
  const dismiss = () => {
    dismissPushNudge()
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="gs-push-nudge"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          role="status"
        >
          <div className="gs-push-nudge__icon">
            <Bell size={18} strokeWidth={2.2} />
          </div>
          <div className="gs-push-nudge__copy">
            <strong>Ne rate plus nos nouveautés</strong>
            <span>Active les notifs push — rappels, annonces et plans du jour.</span>
          </div>
          <motion.button
            type="button"
            className="gs-push-nudge__btn"
            onClick={onActivate}
            disabled={busy}
            whileTap={{ scale: 0.97 }}
          >
            {busy ? '…' : 'Activer'}
          </motion.button>
          <button type="button" className="gs-push-nudge__x" onClick={ dismiss } aria-label="Plus tard">
            <X size={16} />
          </button>

          <style>{`
            .gs-push-nudge {
              position: fixed;
              left: 12px;
              right: 12px;
              bottom: calc(76px + env(safe-area-inset-bottom));
              z-index: 280;
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px 12px 12px 14px;
              background: var(--surface-1);
              border: 1px solid var(--ember-ring);
              border-radius: 14px;
              box-shadow: 0 12px 40px rgba(0,0,0,0.28), var(--ember-glow);
              max-width: 520px;
              margin: 0 auto;
            }
            @media (min-width: 769px) {
              .gs-push-nudge {
                left: auto;
                right: 24px;
                bottom: calc(24px + env(safe-area-inset-bottom));
                max-width: 400px;
              }
            }
            .gs-push-nudge__icon {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              background: var(--ember-soft);
              color: var(--ember);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .gs-push-nudge__copy {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .gs-push-nudge__copy strong {
              font-size: 13px;
              font-weight: 700;
              color: var(--text-primary);
            }
            .gs-push-nudge__copy span {
              font-size: 11.5px;
              line-height: 1.4;
              color: var(--text-secondary);
            }
            .gs-push-nudge__btn {
              flex-shrink: 0;
              padding: 8px 14px;
              border: none;
              border-radius: 9px;
              background: var(--ember);
              color: var(--text-on-ember, #fff);
              font-size: 12.5px;
              font-weight: 700;
              cursor: pointer;
              font-family: var(--font-ui);
            }
            .gs-push-nudge__btn:disabled { opacity: 0.65; cursor: wait; }
            .gs-push-nudge__x {
              flex-shrink: 0;
              width: 28px;
              height: 28px;
              border: none;
              background: transparent;
              color: var(--text-tertiary);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
            }
            .gs-push-nudge__x:hover { background: var(--surface-2); color: var(--text-secondary); }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

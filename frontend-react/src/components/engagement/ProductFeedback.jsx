import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { MessageSquare, X, Star } from 'lucide-react'
import { FEEDBACK_DISMISS_KEY } from '../../utils/engagement'

const API = 'https://getshift-backend.onrender.com'

const RATING_LABELS = {
  1: 'Décevant',
  2: 'Mitigé',
  3: 'Correct',
  4: 'Bien',
  5: 'Excellent',
}

export default function ProductFeedback({ open, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [experience, setExperience] = useState('')
  const [improvements, setImprovements] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const dismiss = () => {
    try { localStorage.setItem(FEEDBACK_DISMISS_KEY, String(Date.now())) } catch {}
    onClose?.()
  }

  const canSubmit = rating >= 1 && (experience.trim().length > 0 || improvements.trim().length > 0)

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      await axios.post(`${API}/feedback`, {
        rating,
        experience: experience.trim(),
        improvements: improvements.trim(),
      })
      setDone(true)
      onSubmitted?.()
      setTimeout(() => onClose?.(), 1800)
    } catch (e) {
      const msg = e?.response?.data?.erreur
      setError(msg || 'Envoi impossible. Réessayez dans un instant.')
    }
    setBusy(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gs-product-feedback"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gs-feedback-title"
        >
          <motion.div className="gs-product-feedback__backdrop" onClick={dismiss} />
          <motion.div
            className="gs-product-feedback__card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <button type="button" className="gs-product-feedback__close" onClick={dismiss} aria-label="Fermer">
              <X size={18} />
            </button>

            {!done ? (
              <>
                <div className="gs-product-feedback__head">
                  <div className="gs-product-feedback__icon"><MessageSquare size={18} strokeWidth={2.2} /></div>
                  <div>
                    <span className="gs-product-feedback__badge">Votre avis compte</span>
                    <h2 id="gs-feedback-title" className="gs-product-feedback__title">
                      Comment se passe votre expérience GetShift ?
                    </h2>
                  </div>
                </div>

                <p className="gs-product-feedback__intro">
                  Vous utilisez GetShift depuis quelques jours — merci de prendre 2 minutes pour nous dire
                  ce qui fonctionne et ce que nous devrions améliorer en priorité.
                </p>

                <div className="gs-product-feedback__rating-block">
                  <label className="gs-product-feedback__label">Votre notation globale</label>
                  <div className="gs-product-feedback__stars" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        className="gs-product-feedback__star-btn"
                        onMouseEnter={() => setHover(n)}
                        onClick={() => setRating(n)}
                        aria-label={`${n} sur 5 — ${RATING_LABELS[n]}`}
                      >
                        <Star
                          size={28}
                          fill={(hover || rating) >= n ? 'var(--ember)' : 'transparent'}
                          color={(hover || rating) >= n ? 'var(--ember)' : 'var(--text-tertiary)'}
                          strokeWidth={1.8}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="gs-product-feedback__rating-label">
                    {(hover || rating) > 0 ? RATING_LABELS[hover || rating] : 'Sélectionnez une note de 1 à 5'}
                  </span>
                </div>

                <div className="gs-product-feedback__field">
                  <label className="gs-product-feedback__label" htmlFor="gs-feedback-experience">
                    Votre ressenti sur GetShift
                  </label>
                  <textarea
                    id="gs-feedback-experience"
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    rows={3}
                    placeholder="Qu'est-ce qui vous a le plus marqué jusqu'ici ?"
                    maxLength={2000}
                  />
                </div>

                <div className="gs-product-feedback__field">
                  <label className="gs-product-feedback__label" htmlFor="gs-feedback-improvements">
                    Ce que nous devrions améliorer en priorité
                  </label>
                  <textarea
                    id="gs-feedback-improvements"
                    value={improvements}
                    onChange={e => setImprovements(e.target.value)}
                    rows={3}
                    placeholder="Une fonctionnalité, un point de friction, une idée…"
                    maxLength={2000}
                  />
                </div>

                {error && <p className="gs-product-feedback__error">{error}</p>}

                <div className="gs-product-feedback__actions">
                  <motion.button
                    type="button"
                    className="gs-product-feedback__cta"
                    onClick={submit}
                    disabled={!canSubmit || busy}
                    whileTap={canSubmit && !busy ? { scale: 0.98 } : {}}
                  >
                    {busy ? 'Envoi…' : 'Envoyer mon retour'}
                  </motion.button>
                  <button type="button" className="gs-product-feedback__later" onClick={dismiss}>
                    Plus tard
                  </button>
                </div>
              </>
            ) : (
              <div className="gs-product-feedback__success">
                <div className="gs-product-feedback__success-icon">✓</div>
                <h2 className="gs-product-feedback__title">Merci pour votre retour</h2>
                <p className="gs-product-feedback__intro">
                  Votre avis nous aide à construire la meilleure version de GetShift.
                </p>
              </div>
            )}
          </motion.div>

          <style>{`
            .gs-product-feedback {
              position: fixed;
              inset: 0;
              z-index: 495;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding: 12px 12px max(12px, env(safe-area-inset-bottom));
              pointer-events: none;
            }
            @media (min-width: 640px) {
              .gs-product-feedback {
                align-items: center;
                padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
              }
            }
            .gs-product-feedback__backdrop {
              position: absolute;
              inset: 0;
              background: rgba(14, 16, 17, 0.55);
              backdrop-filter: blur(4px);
              pointer-events: auto;
            }
            .gs-product-feedback__card {
              position: relative;
              width: min(100%, 480px);
              max-height: min(92vh, 680px);
              overflow-y: auto;
              background: var(--surface-1);
              border: 1px solid var(--border-subtle);
              border-radius: 18px 18px 14px 14px;
              padding: 20px 18px 18px;
              box-shadow: 0 24px 64px rgba(0,0,0,0.35);
              pointer-events: auto;
            }
            @media (min-width: 640px) {
              .gs-product-feedback__card { border-radius: 18px; padding: 24px 22px 22px; }
            }
            .gs-product-feedback__close {
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
            .gs-product-feedback__head {
              display: flex;
              gap: 12px;
              align-items: flex-start;
              margin-bottom: 12px;
              padding-right: 28px;
            }
            .gs-product-feedback__icon {
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
            .gs-product-feedback__badge {
              display: block;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: var(--ember);
              margin-bottom: 4px;
            }
            .gs-product-feedback__title {
              margin: 0;
              font-size: clamp(17px, 4.2vw, 20px);
              font-weight: 800;
              letter-spacing: -0.35px;
              line-height: 1.25;
              color: var(--text-primary);
            }
            .gs-product-feedback__intro {
              margin: 0 0 16px;
              font-size: 14px;
              line-height: 1.65;
              color: var(--text-secondary);
            }
            .gs-product-feedback__label {
              display: block;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.4px;
              text-transform: uppercase;
              color: var(--text-secondary);
              margin-bottom: 8px;
            }
            .gs-product-feedback__rating-block {
              margin-bottom: 16px;
            }
            .gs-product-feedback__stars {
              display: flex;
              gap: 4px;
              justify-content: center;
              margin-bottom: 6px;
            }
            .gs-product-feedback__star-btn {
              border: none;
              background: transparent;
              cursor: pointer;
              padding: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .gs-product-feedback__rating-label {
              display: block;
              text-align: center;
              font-size: 13px;
              font-weight: 600;
              color: var(--text-primary);
              min-height: 18px;
            }
            .gs-product-feedback__field {
              margin-bottom: 12px;
            }
            .gs-product-feedback__field textarea {
              width: 100%;
              padding: 10px 12px;
              border-radius: 10px;
              border: 1px solid var(--border-subtle);
              background: var(--surface-2);
              color: var(--text-primary);
              font-size: 14px;
              font-family: var(--font-ui);
              line-height: 1.5;
              resize: vertical;
              box-sizing: border-box;
            }
            .gs-product-feedback__field textarea:focus {
              outline: none;
              border-color: var(--ember);
            }
            .gs-product-feedback__error {
              margin: 0 0 10px;
              font-size: 13px;
              color: #B8593F;
            }
            .gs-product-feedback__actions {
              display: flex;
              flex-direction: column;
              gap: 8px;
              margin-top: 4px;
            }
            @media (min-width: 480px) {
              .gs-product-feedback__actions { flex-direction: row; align-items: center; }
            }
            .gs-product-feedback__cta {
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
            .gs-product-feedback__cta:disabled {
              opacity: 0.45;
              cursor: not-allowed;
            }
            .gs-product-feedback__later {
              padding: 10px 14px;
              border: none;
              background: transparent;
              color: var(--text-secondary);
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              font-family: var(--font-ui);
            }
            .gs-product-feedback__success {
              text-align: center;
              padding: 24px 8px 12px;
            }
            .gs-product-feedback__success-icon {
              width: 52px;
              height: 52px;
              margin: 0 auto 14px;
              border-radius: 50%;
              background: rgba(122,151,120,0.18);
              color: #7A9778;
              font-size: 24px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

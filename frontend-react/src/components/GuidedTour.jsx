// ══════════════════════════════════════════════════════════════════════
// GuidedTour.jsx — tour guidé nouveaux utilisateurs (spotlight + tooltips)
// Robuste : ancrage DOM optionnel (fallback centré), i18n 6 langues,
// rejouable via window.dispatchEvent(new Event('getshift:start-tour')).
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react'

const DONE_KEY = 'getshift_tour_done'
const START_KEY = 'getshift_start_tour'

// Toutes les étapes vivent sur le Dashboard (sidebar + corps) → pas
// d'orchestration cross-page fragile. target=null → carte centrée.
const STEPS = [
  { target: null,                          titleKey: 'tour.welcome_title',   descKey: 'tour.welcome_desc' },
  { target: '[data-tour="create-task"]',   titleKey: 'tour.create_title',    descKey: 'tour.create_desc' },
  { target: '[data-tour="nav-ia"]',        titleKey: 'tour.ia_title',        descKey: 'tour.ia_desc' },
  { target: '[data-tour="nav-tomorrow"]',  titleKey: 'tour.tomorrow_title',  descKey: 'tour.tomorrow_desc' },
  { target: '[data-tour="nav-goal"]',      titleKey: 'tour.goal_title',      descKey: 'tour.goal_desc' },
  { target: '[data-tour="nav-analytics"]', titleKey: 'tour.analytics_title', descKey: 'tour.analytics_desc' },
  { target: '[data-tour="nav-planification"]', titleKey: 'tour.planning_title', descKey: 'tour.planning_desc' },
  { target: '[data-tour="nav-collaboration"]', titleKey: 'tour.collab_title', descKey: 'tour.collab_desc' },
  { target: null,                          titleKey: 'tour.final_title',     descKey: 'tour.final_desc' },
]

const PAD = 8 // padding autour du spotlight

export default function GuidedTour() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [running, setRunning] = useState(false)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null) // null = pas d'ancre → carte centrée
  const rafRef = useRef(null)

  const finish = useCallback((completed = true) => {
    setRunning(false)
    setRect(null)
    try {
      localStorage.setItem(DONE_KEY, '1')
      localStorage.removeItem(START_KEY)
    } catch {}
  }, [])

  const begin = useCallback(() => {
    try { localStorage.removeItem(START_KEY) } catch {}
    setIdx(0)
    setRunning(true)
  }, [])

  // ── Démarrage : auto (post-onboarding) + event manuel (rejouer) ──
  useEffect(() => {
    let auto = false
    try {
      auto = localStorage.getItem(START_KEY) === '1' && localStorage.getItem(DONE_KEY) !== '1'
    } catch {}
    if (auto) {
      // attendre que le dashboard soit monté
      const id = setTimeout(() => begin(), 900)
      return () => clearTimeout(id)
    }
  }, [begin])

  useEffect(() => {
    const onStart = () => begin()
    window.addEventListener('getshift:start-tour', onStart)
    return () => window.removeEventListener('getshift:start-tour', onStart)
  }, [begin])

  // ── Localiser l'ancre de l'étape courante (avec polling robuste) ──
  useEffect(() => {
    if (!running) return
    const step = STEPS[idx]
    if (!step) return

    let cancelled = false
    let tries = 0

    const locate = () => {
      if (cancelled) return
      if (!step.target) { setRect(null); return }
      const el = document.querySelector(step.target)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          // visible → scroll dans la vue puis mesurer
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }) } catch {}
          setTimeout(() => {
            if (cancelled) return
            const rr = el.getBoundingClientRect()
            setRect({ top: rr.top, left: rr.left, width: rr.width, height: rr.height })
          }, 280)
          return
        }
      }
      tries += 1
      if (tries > 45) { setRect(null); return } // ~1.5s → fallback centré
      rafRef.current = requestAnimationFrame(locate)
    }
    locate()
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [running, idx, location.pathname])

  // ── Recalcule sur scroll/resize ──
  useEffect(() => {
    if (!running) return
    const step = STEPS[idx]
    if (!step?.target) return
    const recompute = () => {
      const el = document.querySelector(step.target)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0) setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    return () => {
      window.removeEventListener('resize', recompute)
      window.removeEventListener('scroll', recompute, true)
    }
  }, [running, idx])

  // ── Clavier : Échap = passer, → = suivant ──
  useEffect(() => {
    if (!running) return
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false)
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, idx]) // eslint-disable-line

  const next = useCallback(() => {
    setIdx(i => {
      if (i >= STEPS.length - 1) { finish(true); return i }
      return i + 1
    })
  }, [finish])
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])

  if (!running) return null
  const step = STEPS[idx]
  if (!step) return null

  const isLast = idx === STEPS.length - 1
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const isMobile = vw < 768

  // ── Position de la carte tooltip ──
  const CARD_W = Math.min(340, vw - 32)
  let cardStyle
  if (rect && !isMobile) {
    const spaceBelow = vh - (rect.top + rect.height)
    const below = spaceBelow > 220
    const top = below ? rect.top + rect.height + PAD + 6 : Math.max(16, rect.top - PAD - 6 - 220)
    let left = rect.left + rect.width / 2 - CARD_W / 2
    left = Math.max(16, Math.min(left, vw - CARD_W - 16))
    cardStyle = { position: 'fixed', top, left, width: CARD_W }
  } else {
    // centré (ou mobile) → en bas centré sur mobile, centre sinon
    cardStyle = isMobile
      ? { position: 'fixed', bottom: 24, left: 16, right: 16, width: 'auto' }
      : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: CARD_W }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, pointerEvents: 'none' }}>
      {/* Backdrop + spotlight (hole via box-shadow) */}
      {rect ? (
        <motion.div
          key={`hole-${idx}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => finish(false)}
          style={{
            position: 'fixed',
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(8,10,12,0.74)',
            border: '2px solid var(--ember)',
            pointerEvents: 'auto',
            transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => finish(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,12,0.74)', pointerEvents: 'auto' }}
        />
      )}

      {/* Carte tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            ...cardStyle,
            zIndex: 100001,
            pointerEvents: 'auto',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 18,
            padding: '20px 22px',
            boxShadow: '0 16px 50px rgba(0,0,0,0.45)',
            fontFamily: 'var(--font-ui)',
          }}>
          {/* Skip */}
          <button onClick={() => finish(false)}
            style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={t('tour.skip')}>
            <X size={15} />
          </button>

          {/* Progress */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--ember)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 8 }}>
            {t('tour.step', { cur: idx + 1, total: STEPS.length })}
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.3px', paddingRight: 28 }}>
            {t(step.titleKey)}
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px' }}>
            {t(step.descKey)}
          </p>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 99, background: i === idx ? 'var(--ember)' : 'var(--border-default, var(--border-subtle))', transition: 'all 0.25s' }} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => finish(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary, var(--text-secondary))', fontSize: 12.5, cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: '6px 2px' }}>
              {t('tour.skip')}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {idx > 0 && (
                <button onClick={prev}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  <ArrowLeft size={14} /> {t('tour.prev')}
                </button>
              )}
              <motion.button onClick={next}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember, 0 4px 14px rgba(184,82,28,0.3))' }}>
                {isLast ? <>{t('tour.done')} <Check size={14} /></> : <>{t('tour.next')} <ArrowRight size={14} /></>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

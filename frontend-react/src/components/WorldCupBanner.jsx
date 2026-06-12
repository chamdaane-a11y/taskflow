import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import GetShiftLogoKick from './GetShiftLogoKick'
import { WC_START, WC_END } from '../utils/worldCup'

function useCountdown(target) {
  const [diff, setDiff] = useState(target - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  const total = Math.max(0, diff)
  return {
    d: Math.floor(total / 86400000),
    h: Math.floor((total % 86400000) / 3600000),
    m: Math.floor((total % 3600000) / 60000),
    s: Math.floor((total % 60000) / 1000),
  }
}


function CountdownUnit({ value, label, hideLabel }) {
  return (
    <span className="wc-countdown__unit">
      <span className="wc-countdown__value">{String(value).padStart(2, '0')}</span>
      {!hideLabel && <span className="wc-countdown__label">{label}</span>}
    </span>
  )
}

export default function WorldCupBanner({ onHeightChange, variant = 'landing' }) {
  const isApp = variant === 'app'
  const [visible, setVisible] = useState(false)
  const [compact, setCompact] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const bannerRef = useRef(null)
  const reduced = useReducedMotion()
  const { d, h, m, s } = useCountdown(WC_END.getTime())

  useEffect(() => {
    const now = new Date()
    if (now < WC_START || now > WC_END) return
    if (sessionStorage.getItem('wc2026_closed')) return
    setVisible(true)
  }, [])

  useEffect(() => {
    const compactMq = window.matchMedia('(max-width: 640px)')
    const narrowMq = window.matchMedia('(max-width: 480px)')
    const update = () => {
      setCompact(isApp || compactMq.matches)
      setNarrow(isApp || narrowMq.matches)
    }
    update()
    compactMq.addEventListener('change', update)
    narrowMq.addEventListener('change', update)
    return () => {
      compactMq.removeEventListener('change', update)
      narrowMq.removeEventListener('change', update)
    }
  }, [isApp])

  useEffect(() => {
    if (!onHeightChange) return
    if (!visible) {
      onHeightChange(0)
      return
    }
    const measure = () => {
      if (bannerRef.current) onHeightChange(bannerRef.current.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (bannerRef.current) ro.observe(bannerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [visible, onHeightChange, compact, narrow, isApp])

  function close() {
    sessionStorage.setItem('wc2026_closed', '1')
    setVisible(false)
    onHeightChange?.(0)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={bannerRef}
          className={`wc-banner${isApp ? ' wc-banner--app' : ''}`}
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="wc-banner__inner">
            <div className="wc-banner__anim">
              <GetShiftLogoKick
                markSize={isApp ? (narrow ? 20 : 24) : (narrow ? 22 : compact ? 26 : 34)}
                showWord={!narrow}
                gap={narrow ? 0 : 7}
                wordStyle={{ fontSize: narrow ? 13 : compact ? 14 : 15 }}
              />
            </div>

            <div className="wc-banner__center">
              <div className="wc-banner__copy">
                <span className="wc-banner__badge">
                  <span className="wc-banner__live-dot" />
                  Coupe du Monde 2026
                </span>
                <p className="wc-banner__title">
                  Bonne Coupe du Monde 2026 à{' '}
                  <span className="wc-banner__title-accent">tous les utilisateurs de GetShift</span>
                </p>
                {!compact && (
                  <p className="wc-banner__subtitle">
                    USA · Canada · Mexique — 48 équipes, 104 matchs
                  </p>
                )}
              </div>

              <div className="wc-banner__countdown">
                {!compact && <span className="wc-banner__countdown-label">Finale dans</span>}
                <div className="wc-countdown">
                  <CountdownUnit value={d} label="j" hideLabel={compact} />
                  <span className="wc-countdown__sep">:</span>
                  <CountdownUnit value={h} label="h" hideLabel={compact} />
                  <span className="wc-countdown__sep">:</span>
                  <CountdownUnit value={m} label="m" hideLabel={compact} />
                  <span className="wc-countdown__sep">:</span>
                  <CountdownUnit value={s} label="s" hideLabel={compact} />
                </div>
              </div>
            </div>

            {!isApp && (
            <div className="wc-banner__visual" aria-label="Visuels Coupe du Monde 2026">
              <div className="wc-banner__visual-players">
                <img src="/wc26-players.jpeg" alt="Stars de la Coupe du Monde 2026" />
              </div>

              <motion.div
                className="wc-banner__visual-trophy"
                style={{ top: '50%' }}
                animate={reduced ? { y: '-50%', scale: 1 } : { y: '-50%', scale: [1, 1.03, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
              >
                <img src="/wc26-logo.jpeg" alt="Logo FIFA World Cup 2026" />
              </motion.div>

              <div className="wc-banner__visual-mascots">
                <img src="/wc26-mascots.jpeg" alt="Mascottes officielles Coupe du Monde 2026" />
              </div>
            </div>
            )}

            <button type="button" className="wc-banner__close" onClick={close} aria-label="Fermer la bannière Coupe du Monde">
              ×
            </button>
          </div>

          <style>{`
            .wc-banner {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 300;
              overflow-x: hidden;
              overflow-y: visible;
              background: var(--bg-elevated);
              border-bottom: 1px solid var(--border-subtle);
              box-shadow: var(--shadow-sm);
              font-family: var(--font-ui);
            }

            .wc-banner__inner {
              position: relative;
              display: flex;
              align-items: stretch;
              width: 100%;
              max-width: 100%;
              min-height: 88px;
            }

            .wc-banner__anim {
              flex-shrink: 0;
              width: clamp(168px, 24vw, 240px);
              border-right: 1px solid var(--border-subtle);
              background: var(--surface-1);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 10px 12px 8px;
              overflow: visible;
              min-width: 0;
            }

            .wc-banner__center {
              flex: 1;
              min-width: 0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
              padding: 10px 16px;
            }

            .wc-banner__copy {
              flex: 1;
              min-width: 0;
            }

            .wc-banner__badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1.4px;
              text-transform: uppercase;
              color: var(--ember);
              margin-bottom: 2px;
            }

            .wc-banner__live-dot {
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: var(--ember);
              animation: wc-pulse 1.4s ease-in-out infinite;
            }

            @keyframes wc-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.35; }
            }

            .wc-banner__title {
              margin: 0;
              font-size: clamp(12px, 1.35vw, 15px);
              font-weight: 700;
              line-height: 1.3;
              color: var(--text-primary);
              letter-spacing: -0.2px;
            }

            .wc-banner__title-accent {
              font-family: var(--font-display);
              font-style: italic;
              font-weight: 400;
              background: linear-gradient(135deg, var(--ember), var(--ember-hover));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            .wc-banner__subtitle {
              margin: 2px 0 0;
              font-size: 10px;
              color: var(--text-secondary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .wc-banner__visual {
              position: relative;
              flex-shrink: 0;
              width: clamp(200px, 32vw, 360px);
              min-height: 88px;
              overflow: hidden;
              border-left: 1px solid var(--border-subtle);
              background: var(--surface-2);
            }

            .wc-banner__visual-players {
              position: absolute;
              inset: 0;
              left: clamp(48px, 18%, 72px);
            }

            .wc-banner__visual-players::after {
              content: '';
              position: absolute;
              inset: 0;
              background:
                linear-gradient(90deg, var(--surface-1) 0%, transparent 22%, transparent 72%, rgba(0,0,0,0.18) 100%),
                linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.25) 100%);
              pointer-events: none;
            }

            .wc-banner__visual-players img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center 16%;
            }

            .wc-banner__visual-trophy {
              position: absolute;
              left: 10px;
              z-index: 3;
              width: clamp(52px, 8vw, 68px);
              height: clamp(62px, 9vw, 78px);
              border-radius: var(--radius-md);
              overflow: hidden;
              background: #fff;
              border: 2px solid var(--ember-ring);
              box-shadow: var(--shadow-md), var(--ember-glow);
            }

            .wc-banner__visual-trophy img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: contain;
              padding: 4px;
            }

            .wc-banner__visual-mascots {
              position: absolute;
              right: 8px;
              bottom: 8px;
              z-index: 4;
              width: clamp(44px, 7vw, 56px);
              height: clamp(34px, 5vw, 42px);
              border-radius: var(--radius-sm);
              overflow: hidden;
              background: #fff;
              border: 1px solid var(--border-subtle);
              box-shadow: var(--shadow-sm);
            }

            .wc-banner__visual-mascots img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center;
            }

            .wc-banner__countdown {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 2px;
              flex-shrink: 0;
            }

            .wc-banner__countdown-label {
              font-size: 8px;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: var(--text-tertiary);
              white-space: nowrap;
            }

            .wc-countdown {
              display: flex;
              align-items: baseline;
              gap: 2px;
              font-family: var(--font-mono);
            }

            .wc-countdown__value {
              font-size: 14px;
              font-weight: 700;
              color: var(--ember);
              font-variant-numeric: tabular-nums;
              line-height: 1;
            }

            .wc-countdown__label {
              font-size: 8px;
              color: var(--text-tertiary);
            }

            .wc-countdown__sep {
              color: var(--text-tertiary);
              font-size: 11px;
            }

            .wc-banner__close {
              flex-shrink: 0;
              width: 40px;
              border: none;
              border-left: 1px solid var(--border-subtle);
              background: transparent;
              color: var(--text-tertiary);
              font-size: 18px;
              cursor: pointer;
              transition: color var(--dur-fast), background var(--dur-fast);
            }

            .wc-banner__close:hover {
              color: var(--text-primary);
              background: var(--danger-soft);
            }

            @media (max-width: 900px) {
              .wc-banner__visual { width: clamp(170px, 36vw, 260px); }
              .wc-banner__countdown { display: none; }
            }

            @media (max-width: 720px) {
              .wc-banner__anim { width: clamp(112px, 22vw, 148px); padding: 8px 8px 6px; }
              .wc-banner__visual { width: clamp(150px, 42vw, 220px); }
              .wc-banner__visual-trophy {
                width: 48px;
                height: 58px;
                left: 8px;
              }
            }

            @media (max-width: 560px) {
              .wc-banner__inner {
                flex-wrap: wrap;
                min-height: auto;
              }
              .wc-banner__anim {
                width: 100%;
                border-right: none;
                border-bottom: 1px solid var(--border-subtle);
                min-height: 56px;
                padding: 10px 44px 8px 12px;
              }
              .wc-banner__center {
                flex: 1 1 100%;
                flex-direction: column;
                align-items: stretch;
                gap: 6px;
                padding: 8px 12px;
              }
              .wc-banner__countdown {
                display: flex;
                align-items: flex-start;
              }
              .wc-banner__visual {
                flex: 1 1 100%;
                width: 100%;
                min-height: 72px;
                border-left: none;
                border-top: 1px solid var(--border-subtle);
              }
              .wc-banner__visual-players { left: 56px; }
              .wc-banner__close {
                position: absolute;
                top: 0;
                right: 0;
                width: 36px;
                height: 52px;
                border-left: 1px solid var(--border-subtle);
                z-index: 5;
              }
            }

            @media (max-width: 400px) {
              .wc-banner__title { font-size: 11px; }
              .wc-banner__visual-mascots {
                width: 40px;
                height: 30px;
                right: 6px;
                bottom: 6px;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .wc-banner__live-dot { animation: none; }
            }

            .wc-banner--app {
              z-index: 280;
            }
            .wc-banner--app .wc-banner__inner {
              min-height: 52px;
              flex-wrap: nowrap;
            }
            .wc-banner--app .wc-banner__anim {
              width: auto;
              max-width: 38%;
              border-right: 1px solid var(--border-subtle);
              padding: 6px 10px;
            }
            .wc-banner--app .wc-banner__center {
              padding: 6px 44px 6px 12px;
              gap: 10px;
            }
            .wc-banner--app .wc-banner__title {
              font-size: clamp(11px, 2.8vw, 13px);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .wc-banner--app .wc-banner__subtitle { display: none; }
            .wc-banner--app .wc-banner__countdown { display: flex !important; }
            .wc-banner--app .wc-countdown__value { font-size: 12px; }
            .wc-banner--app .wc-banner__close {
              position: absolute;
              top: 0;
              right: 0;
              height: 100%;
              width: 36px;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

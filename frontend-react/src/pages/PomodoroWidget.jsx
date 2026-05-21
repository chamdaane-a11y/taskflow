// ══════════════════════════════════════════════════════════════════════
// PomodoroWidget.jsx — timer Pomodoro flottant (25/5)
//   • Apparait en bottom-left si tâche en cours détectée OU manuellement
//   • Track : sessions du jour (localStorage)
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, X, Coffee } from 'lucide-react'

const TomatoIcon = ({ size = 16, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M12 4 c-1 0 -1.5 -1 -2 -2 c-0.5 1 -1 2 -2 2 c4 0 -3 0 -3 6 c0 5 4 10 7 10 c3 0 7 -5 7 -10 c0 -6 -7 -6 -3 -6 c-1 0 -1.5 -1 -2 -2 c-0.5 1 -1 2 -2 2 z"/>
  </svg>
)

const WORK_SECONDS  = 25 * 60
const BREAK_SECONDS = 5 * 60

const todayKey = () => `pomodoro_count_${new Date().toISOString().split('T')[0]}`

export const PomodoroWidget = memo(function PomodoroWidget({
  T, isMobile, planification, taches
}) {
  const [phase, setPhase] = useState('idle') // idle | work | break | paused
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS)
  const [count, setCount] = useState(() => {
    try { return parseInt(localStorage.getItem(todayKey()) || '0') } catch { return 0 }
  })
  const [hidden, setHidden] = useState(false)
  const audioRef = useRef(null)

  // Détecte tâche en cours pour proposer Pomodoro
  const activeTask = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const nowMins = now.getHours() * 60 + now.getMinutes()
    return planification.find(p => {
      const date = p.date_planifiee?.split('T')[0] || p.date_planifiee
      const t = taches.find(x => x.id === p.tache_id)
      return date === today && t && !t.terminee
        && nowMins >= (p.startMins || 0) && nowMins <= (p.endMins || 0)
    })
  }, [planification, taches])

  const activeTitle = activeTask?.titre || taches.find(t => t.id === activeTask?.tache_id)?.titre

  // Tick countdown
  useEffect(() => {
    if (phase !== 'work' && phase !== 'break') return
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          // Phase end
          if (phase === 'work') {
            const newCount = count + 1
            setCount(newCount)
            try { localStorage.setItem(todayKey(), String(newCount)) } catch {}
            playBell()
            setPhase('break')
            return BREAK_SECONDS
          } else {
            playBell()
            setPhase('idle')
            return WORK_SECONDS
          }
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, count])

  const playBell = () => {
    try {
      // Petit "ding" via Web Audio API (pas de fichier audio externe)
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 880
      o.type = 'sine'
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      o.start(); o.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  const start = () => {
    setPhase('work')
    setSecondsLeft(WORK_SECONDS)
  }
  const pause = () => setPhase('paused')
  const resume = () => setPhase('work')
  const reset = () => {
    setPhase('idle')
    setSecondsLeft(WORK_SECONDS)
  }

  // Si pas de tâche en cours ET pas démarré → ne rien afficher
  if (hidden) return null
  if (phase === 'idle' && !activeTask) return null

  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60
  const pct = phase === 'break'
    ? ((BREAK_SECONDS - secondsLeft) / BREAK_SECONDS) * 100
    : ((WORK_SECONDS - secondsLeft) / WORK_SECONDS) * 100

  const isWork  = phase === 'work'
  const isBreak = phase === 'break'
  const isPaused = phase === 'paused'
  const isIdle = phase === 'idle'

  const accent = isBreak ? '#10b981' : '#ef4444'
  const accentSoft = isBreak ? '#10b98115' : '#ef444415'

  // Position : bottom-left, au-dessus du bottom-nav mobile
  const bottomOffset = isMobile ? 80 : 24
  const leftOffset = isMobile ? 14 : 24

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.94 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: leftOffset,
        background: 'var(--surface-1)',
        border: `1px solid ${isIdle ? 'var(--border-subtle)' : `${accent}50`}`,
        borderRadius: 14,
        padding: isMobile ? '10px 12px' : '11px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 10,
        boxShadow: isIdle
          ? `0 6px 20px rgba(0,0,0,0.15)`
          : `0 8px 24px ${accent}30, 0 0 0 1px ${accent}20`,
        zIndex: 130,
        maxWidth: isMobile ? `calc(100vw - ${leftOffset * 2})` : 320,
      }}>

      {/* Icône Pomodoro */}
      <motion.div
        animate={isWork ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: isMobile ? 32 : 36, height: isMobile ? 32 : 36,
          borderRadius: 10,
          background: isIdle
            ? 'linear-gradient(135deg, var(--ember), var(--ember-hover))'
            : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${isIdle ? 'var(--ember)' : accent}40`,
        }}>
        {isBreak ? <Coffee size={16} color="#fff" strokeWidth={2.4} /> : <TomatoIcon size={18} />}
      </motion.div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isIdle ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 1, letterSpacing: '-0.1px' }}>
              Pomodoro 25/5
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeTitle ? `→ ${activeTitle}` : 'Tâche en cours détectée'}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 800,
                color: accent,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: 99,
                background: accentSoft,
              }}>
                {isPaused ? 'Pause' : isBreak ? 'Break' : 'Focus'}
              </span>
              {count > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>
                  🍅 ×{count}
                </span>
              )}
            </div>
            <div style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: 900,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
            </div>
            <div style={{
              height: 3,
              background: 'var(--border-subtle)',
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'linear' }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
                  borderRadius: 99,
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Boutons contrôle */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {isIdle && (
          <motion.button
            onClick={start}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            style={btnStyle(T, '#ef4444')}>
            <Play size={13} fill="#fff" color="#fff" strokeWidth={0} />
          </motion.button>
        )}
        {(isWork || isBreak) && (
          <motion.button
            onClick={pause}
            whileTap={{ scale: 0.9 }}
            style={btnStyle(T, 'var(--text-secondary)', true)}>
            <Pause size={12} color="var(--text-primary)" strokeWidth={2.4} />
          </motion.button>
        )}
        {isPaused && (
          <motion.button
            onClick={resume}
            whileTap={{ scale: 0.9 }}
            style={btnStyle(T, accent)}>
            <Play size={12} fill="#fff" color="#fff" strokeWidth={0} />
          </motion.button>
        )}
        {!isIdle && (
          <motion.button
            onClick={reset}
            whileTap={{ scale: 0.9 }}
            title="Reset"
            style={btnStyle(T, 'var(--text-secondary)', true)}>
            <RotateCcw size={11} color="var(--text-primary)" strokeWidth={2.4} />
          </motion.button>
        )}
        {isIdle && (
          <motion.button
            onClick={() => setHidden(true)}
            whileTap={{ scale: 0.9 }}
            title="Masquer"
            style={btnStyle(T, 'var(--text-secondary)', true)}>
            <X size={11} color="var(--text-secondary)" strokeWidth={2.4} />
          </motion.button>
        )}
      </div>
    </motion.div>
  )
})

const btnStyle = (T, accent, ghost = false) => ({
  width: 28, height: 28,
  borderRadius: 7,
  background: ghost ? 'transparent' : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
  border: ghost ? '1px solid var(--border-subtle)' : 'none',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
  boxShadow: ghost ? 'none' : `0 3px 8px ${accent}40`,
})

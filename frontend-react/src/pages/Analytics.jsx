import { useState, useEffect, useMemo, useCallback, memo, useRef  } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  LayoutDashboard, Bot, BarChart2, Calendar, LogOut,
  TrendingUp, TrendingDown, CheckSquare, Target, Layers,
  Menu, HelpCircle, Zap, Award, Flame, Brain,
  AlertTriangle, ChevronDown, ArrowUpRight, ArrowDownRight,
  Activity, Clock, Star, PanelLeftClose, PanelLeftOpen,
  ChevronRight, ChevronUp, Settings, User, Sparkles, Flag,
  Plus, Trash2, Copy, Link2, Users, Crown, Share2, UserPlus,
  MoreHorizontal, MessageCircle, X, Send
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile from '../components/BottomNavMobile'
import { CoachFloat } from './CoachFloat'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

const API = 'https://getshift-backend.onrender.com'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Tableau de bord',  path: '/dashboard'     },
  { icon: Bot,             label: 'Assistant IA',     path: '/ia'            },
  { icon: Sparkles,        label: 'Tomorrow Builder', path: '/tomorrow'      },
  { icon: Flag,            label: 'Goal Reverse',     path: '/goal'          },
  { icon: BarChart2,       label: 'Analytiques',      path: '/analytics'     },
  { icon: Calendar,        label: 'Planification',    path: '/planification' },
  { icon: Users,           label: 'Collaboration',    path: '/collaboration' },
  { icon: HelpCircle,      label: 'Aide',             path: '/help'          },
]

// IconLock personnalisé (comme dans Dashboard)
const IconLock = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

// ══════════════════════════════════════════════════════════════════════
// HOOK: useAnalyticsData — Fetching & caching
// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
// HOOK: useGamification — niveau/points/streak réels du backend
// ══════════════════════════════════════════════════════════════════════
function useGamification(userId) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!userId) return
    const cacheKey = `gamification_${userId}`
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && Date.now() - cached.ts < 2 * 60 * 1000) {
        setData(cached.data); return
      }
    } catch {}
    axios.get(`${API}/users/${userId}/gamification`)
      .then(r => {
        setData(r.data)
        try { localStorage.setItem(cacheKey, JSON.stringify({ data: r.data, ts: Date.now() })) } catch {}
      })
      .catch(() => {})
  }, [userId])
  return data
}

function useAnalyticsData(userId, jours) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    // v2 = invalide les anciens caches qui pourraient avoir corrompu les graphes
    const cacheKey = `analytics_v2_${userId}_${jours}`
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && cached.data && Date.now() - cached.ts < 5 * 60 * 1000) {
        setData(cached.data); setLoading(false); return
      }
    } catch {}
    setLoading(true)
    axios.get(`${API}/analytics/${userId}?jours=${jours}`)
      .then(r => {
        if (r.data) {
          setData(r.data); setError(null)
          try { localStorage.setItem(cacheKey, JSON.stringify({ data: r.data, ts: Date.now() })) } catch {}
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId, jours])

  return { data, loading, error }
}

// ══════════════════════════════════════════════════════════════════════
// HOOK: useStatistics — All computed stats (memoized)
// ══════════════════════════════════════════════════════════════════════
function useStatistics(data, jours) {
  return useMemo(() => {
    if (!data) return null

    const n = Math.min(jours, 90)

    // Heure locale — évite le décalage UTC (ex: UTC+2 → minuit = veille en UTC)
    const localKey = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    // Parse robuste : gère ISO date "YYYY-MM-DD", ISO datetime, RFC 1123 (Flask jsonify)
    const toLocalKey = (raw) => {
      if (!raw) return null
      const s = String(raw)
      // ISO date YYYY-MM-DD ou YYYY-MM-DDTxxx
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
      // Sinon parse avec Date (RFC 1123 "Sat, 16 May 2026 ...") et formate en local
      const d = new Date(s)
      return isNaN(d) ? s : localKey(d)
    }

    const buildDays = (offset = 0) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (n - 1 - i) - offset)
        return localKey(d)
      })

    const currentKeys = buildDays(0)
    const prevKeys = buildDays(n)

    const getCount = (keys, parJour) =>
      keys.map(k => {
        const found = parJour?.find(p => toLocalKey(p.jour) === k)
        return found ? found.count : 0
      })

    const current = getCount(currentKeys, data.par_jour)
    const previous = getCount(prevKeys, data.par_jour)

    const labels = currentKeys.map(k =>
      new Date(k).toLocaleDateString('fr-FR', {
        weekday: n <= 7 ? 'short' : undefined,
        day: 'numeric',
        month: n > 7 ? 'short' : undefined,
      })
    )

    // 7-day moving average
    const movingAvg = current.map((_, i) => {
      const window = current.slice(Math.max(0, i - 6), i + 1)
      return +(window.reduce((a, b) => a + b, 0) / window.length).toFixed(2)
    })

    // Cumulative
    const cumulative = current.reduce((acc, v, i) => {
      acc.push((acc[i - 1] || 0) + v)
      return acc
    }, [])

    // Stats
    const total = current.reduce((a, b) => a + b, 0)
    const totalPrev = previous.reduce((a, b) => a + b, 0)
    const wow = totalPrev > 0 ? Math.round(((total - totalPrev) / totalPrev) * 100) : 0
    const avg = total / n
    const maxVal = Math.max(...current)
    const maxIdx = current.indexOf(maxVal)

    // Burnout detection: 3 high days followed by drop
    const BURNOUT_THRESHOLD = avg * 1.5
    const DROP_THRESHOLD = avg * 0.5
    let burnoutRisk = false
    for (let i = 2; i < current.length - 1; i++) {
      const highStreak = current[i] > BURNOUT_THRESHOLD &&
        current[i - 1] > BURNOUT_THRESHOLD &&
        current[i - 2] > BURNOUT_THRESHOLD
      const drop = current[i + 1] < DROP_THRESHOLD
      if (highStreak && drop) { burnoutRisk = true; break }
    }

    // Chronotype: peak hour
    const heures = data.par_heure || Array(24).fill(0)
    const peakHour = heures.indexOf(Math.max(...heures))
    const chronotype = peakHour < 12 ? 'Matin' : peakHour < 17 ? 'Après-midi' : 'Soir'

    // 80/20 rule
    const haute = data.priorites?.haute || 0
    const moyenne = data.priorites?.moyenne || 0
    const basse = data.priorites?.basse || 0
    const totalPrio = haute + moyenne + basse
    const lowRatio = totalPrio > 0 ? Math.round(((moyenne + basse) / totalPrio) * 100) : 0

    // Streak
    let streak = 0
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i] > 0) streak++
      else break
    }

    // Velocity (approx: avg tasks per active day)
    const activeDays = current.filter(v => v > 0).length
    const velocity = activeDays > 0 ? +(total / activeDays).toFixed(1) : 0

    // Focus score: weight high-priority completions more
    const focusScore = totalPrio > 0
      ? Math.round((haute * 3 + moyenne * 1.5 + basse * 0.5) / (totalPrio * 3) * 100)
      : 0

    // AI Insights
    const insights = []
    if (lowRatio > 70)
      insights.push({ icon: AlertTriangle, color: '#e08a3c', text: `Règle 80/20 : ${lowRatio}% de vos tâches complétées sont de faible/moyenne priorité. Concentrez-vous sur l'impact réel.` })
    if (burnoutRisk)
      insights.push({ icon: Flame, color: '#e05c5c', text: `Risque de burnout détecté : une forte activité sur 3 jours est suivie d'une chute de productivité. Pensez à vous ménager.` })
    if (streak >= 3)
      insights.push({ icon: Zap, color: '#4caf82', text: `Momentum : vous êtes sur une série de ${streak} jours consécutifs. Continuez sur cette lancée !` })
    if (wow > 20)
      insights.push({ icon: TrendingUp, color: '#4caf82', text: `+${wow}% vs période précédente. Excellente progression — vos habitudes paient.` })
    else if (wow < -20)
      insights.push({ icon: TrendingDown, color: '#e05c5c', text: `${wow}% vs période précédente. Semaine difficile — identifiez ce qui a changé.` })
    if (peakHour > 21)
      insights.push({ icon: Clock, color: '#a855f7', text: `Corrélation nocturne : vous travaillez après 21h. Les sessions tardives peuvent impacter votre productivité du lendemain.` })
    if (focusScore > 75)
      insights.push({ icon: Star, color: '#6c63ff', text: `Score de focus élevé (${focusScore}/100) : vous priorisez efficacement les tâches à fort impact.` })

    return {
      labels, current, previous, movingAvg, cumulative,
      total, totalPrev, wow, avg, maxVal, maxIdx,
      burnoutRisk, chronotype, peakHour,
      lowRatio, streak, velocity, focusScore,
      heures, insights,
      taux: data.taux_completion || 0,
      priorites: data.priorites || {},
    }
  }, [data, jours])
}

// ══════════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ══════════════════════════════════════════════════════════════════════
const Skeleton = memo(({ width = '100%', height = 20, radius = 8, style = {} }) => {
  const { T } = useTheme()
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width, height, borderRadius: radius, background: T.border, ...style }}
    />
  )
})

// ══════════════════════════════════════════════════════════════════════
// GITHUB HEATMAP
// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
// DAY DRILL-DOWN MODAL — liste tâches d'un jour (cliqué sur heatmap)
// ══════════════════════════════════════════════════════════════════════
const DayDrillModal = memo(({ userId, date, T, isMobile, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!date || !userId) return
    setLoading(true)
    axios.get(`${API}/users/${userId}/taches-jour/${date}`)
      .then(r => setData(r.data))
      .catch(() => setData({ taches: [], total: 0 }))
      .finally(() => setLoading(false))
  }, [date, userId])

  if (!date) return null

  const dateFmt = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const prioColor = { haute: '#e05c5c', moyenne: '#e08a3c', basse: '#4caf82' }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={{ scale: 0.92, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          style={{
            background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 18,
            width: isMobile ? '100%' : 460, maxWidth: '100%',
            maxHeight: '85vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
          {/* Header */}
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(135deg, ${T.accent}15, transparent)` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={18} color="#fff" strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text, textTransform: 'capitalize' }}>{dateFmt}</div>
              <div style={{ fontSize: 11, color: T.text2 }}>
                {loading ? '...' : `${data?.total || 0} tâche${(data?.total || 0) > 1 ? 's' : ''}`}
              </div>
            </div>
            <motion.button onClick={onClose} whileTap={{ scale: 0.9 }}
              style={{ width: 30, height: 30, borderRadius: 8, background: T.bg3 || 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </motion.button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} height={50} radius={10} />)}
              </div>
            ) : !data?.taches?.length ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.text2, fontSize: 13 }}>
                Aucune tâche enregistrée ce jour.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.taches.map(t => {
                  const c = prioColor[t.priorite] || T.accent
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        background: t.terminee ? '#4caf820d' : T.bg3 || T.bg,
                        border: `1px solid ${t.terminee ? '#4caf8230' : T.border}`,
                        borderLeft: `3px solid ${c}`,
                        borderRadius: 10,
                      }}>
                      {/* Statut */}
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        border: `2px solid ${t.terminee ? '#4caf82' : T.border}`,
                        background: t.terminee ? '#4caf82' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {t.terminee && <CheckSquare size={12} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, textDecoration: t.terminee ? 'line-through' : 'none', opacity: t.terminee ? 0.7 : 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.titre}
                        </div>
                        <div style={{ fontSize: 10, color: T.text2, marginTop: 2, display: 'flex', gap: 8 }}>
                          <span style={{ color: c, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.priorite}</span>
                          {t.categorie && <span>· {t.categorie}</span>}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})

const GitHubHeatmap = memo(({ parJour, T, onDayClick }) => {
  const weeks = 18

  // Formatte une date en YYYY-MM-DD en heure LOCALE (pas UTC)
  const localKey = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const data = useMemo(() => {
    const map = {}
    parJour?.forEach(p => {
      const raw = String(p.jour)
      // ISO date "YYYY-MM-DD..." direct, sinon parse Date (RFC 1123 Flask) → local
      let k
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        k = raw.slice(0, 10)
      } else {
        const d = new Date(raw)
        if (!isNaN(d)) {
          k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        } else {
          k = raw
        }
      }
      map[k] = (map[k] || 0) + p.count
    })
    return map
  }, [parJour])

  const maxVal = Math.max(...Object.values(data), 1)

  // Aligne sur les vraies semaines : dimanche (0) en haut, samedi (6) en bas
  const cells = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = today.getDay() // 0=Dim, 1=Lun … 6=Sam

    // Dimanche de la semaine courante (heure locale)
    const thisWeekSun = new Date(today)
    thisWeekSun.setDate(today.getDate() - todayDow)

    const result = []
    for (let w = 0; w < weeks; w++) {
      const col = []
      const weekSun = new Date(thisWeekSun)
      weekSun.setDate(thisWeekSun.getDate() - (weeks - 1 - w) * 7)

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekSun)
        date.setDate(weekSun.getDate() + d)
        const isFuture = date > today
        const key = localKey(date)   // ← heure locale, pas UTC
        const val = isFuture ? 0 : (data[key] || 0)
        const intensity = isFuture ? -1 : val / maxVal
        col.push({ key, val, intensity, date, isFuture })
      }
      result.push(col)
    }
    return result
  }, [data, maxVal])

  const getColor = (intensity, isFuture) => {
    if (isFuture) return 'transparent'
    if (intensity === 0) return T.border
    if (intensity < 0.25) return T.accent + '40'
    if (intensity < 0.5)  return T.accent + '70'
    if (intensity < 0.75) return T.accent + 'aa'
    return T.accent
  }

  // Dim Lun Mar Mer Jeu Ven Sam
  const dayLabels = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Étiquettes jours */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 6 }}>
          {dayLabels.map((l, i) => (
            <div key={i} style={{ height: 12, fontSize: 9, color: T.text2, display: 'flex', alignItems: 'center' }}>{l}</div>
          ))}
        </div>
        {/* Grille */}
        {cells.map((col, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {col.map(({ key, val, intensity, date, isFuture }) => (
              <motion.div
                key={key}
                onClick={isFuture ? undefined : () => onDayClick?.(key)}
                title={isFuture ? '' : `${date.toLocaleDateString('fr-FR')} : ${val} tâche${val !== 1 ? 's' : ''}`}
                style={{ width: 12, height: 12, borderRadius: 3, background: getColor(intensity, isFuture), cursor: isFuture ? 'default' : 'pointer', flexShrink: 0 }}
                whileHover={isFuture ? {} : { scale: 1.5, zIndex: 2 }}
                whileTap={isFuture ? {} : { scale: 0.9 }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Légende */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: T.text2 }}>Moins</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: getColor(v, false) }} />
        ))}
        <span style={{ fontSize: 10, color: T.text2 }}>Plus</span>
      </div>
    </div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// KPI CARD
// ══════════════════════════════════════════════════════════════════════
const KPICard = memo(({ icon: Icon, label, value, sub, color, delta, loading }) => {
  const { T } = useTheme()
  const isPositive = delta >= 0

  return (
    <motion.div
      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, borderColor: color + '60' }}
      transition={{ duration: 0.2 }}
    >
      {/* Accent top border */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, ${color}00)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} strokeWidth={2} />
        </div>
        {delta !== undefined && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 99, background: isPositive ? '#4caf8218' : '#e05c5c18', fontSize: 11, fontWeight: 700, color: isPositive ? '#4caf82' : '#e05c5c' }}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>

      {loading ? (
        <>
          <Skeleton height={28} width="60%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="80%" />
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{value}</div>
          <div style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: T.text2, opacity: 0.6, marginTop: 3 }}>{sub}</div>}
        </>
      )}
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// INSIGHT CARD
// ══════════════════════════════════════════════════════════════════════
const InsightCard = memo(({ icon: Icon, color, text, delay = 0 }) => {
  const { T } = useTheme()
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{ display: 'flex', gap: 12, padding: '13px 16px', background: color + '0d', border: `1px solid ${color}25`, borderRadius: 12, alignItems: 'flex-start' }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon size={14} color={color} strokeWidth={2} />
      </div>
      <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// CHART CAROUSEL — mobile uniquement, scroll-snap horizontal + dots
// ══════════════════════════════════════════════════════════════════════
const ChartCarousel = ({ T, children }) => {
  const [activeIdx, setActiveIdx] = useState(0)
  const scrollRef = useRef(null)
  const cards = (Array.isArray(children) ? children : [children]).flat().filter(Boolean)

  // Fix Chart.js : les canvas off-screen ont width=0 au mount → trigger resize global
  useEffect(() => {
    const triggers = [100, 300, 600, 1200].map(d =>
      setTimeout(() => window.dispatchEvent(new Event('resize')), d)
    )
    return () => triggers.forEach(clearTimeout)
  }, [])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, clientWidth } = scrollRef.current
    setActiveIdx(Math.round(scrollLeft / clientWidth))
    // Re-resize Chart.js quand on arrive sur une carte off-screen
    window.dispatchEvent(new Event('resize'))
  }

  const goTo = (i) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ left: i * scrollRef.current.clientWidth, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: 18, width: '100%' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chart-carousel-track"
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: 0,
          paddingBottom: 4,
          marginBottom: 10,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          width: '100%',
        }}>
        <style>{`.chart-carousel-track::-webkit-scrollbar { display: none; }`}</style>
        {cards.map((c, i) => (
          <div key={i} style={{ minWidth: '100%', width: '100%', scrollSnapAlign: 'center', flexShrink: 0, padding: '0 2px', boxSizing: 'border-box' }}>
            {c}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === activeIdx ? 22 : 6, height: 6, borderRadius: 99,
              background: i === activeIdx ? T.accent : T.border,
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'width 0.25s, background 0.25s',
            }}
            aria-label={`Graphe ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// CHART CARD WRAPPER
// ══════════════════════════════════════════════════════════════════════
const ChartCard = memo(({ title, subtitle, children, delay = 0, style = {} }) => {
  const { T } = useTheme()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, padding: '22px 24px', ...style }}
    >
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: T.text || '#fff', margin: 0 }}>{title}</p>
        {subtitle && <p style={{ fontSize: 12, color: T.text2, marginTop: 3, marginBottom: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// TASK DNA CARD — calibration des durées (sous/sur-estimation)
// ══════════════════════════════════════════════════════════════════════
function useCalibration(userId) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!userId) return
    const cacheKey = `calibration_${userId}`
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
        setData(cached.data); return
      }
    } catch {}
    axios.get(`${API}/users/${userId}/calibration`)
      .then(r => {
        setData(r.data)
        try { localStorage.setItem(cacheKey, JSON.stringify({ data: r.data, ts: Date.now() })) } catch {}
      })
      .catch(() => {})
  }, [userId])
  return data
}

const TaskDNACard = memo(({ calibration, T, isMobile }) => {
  if (!calibration) return null
  const { calibrationGlobale, sousEstimes = [], surEstimes = [], totalAnalyses, message } = calibration

  if (totalAnalyses < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: T.bg2, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: '18px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: T.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Brain size={18} color={T.accent} strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>Task DNA — Calibration</div>
          <div style={{ fontSize: 12, color: T.text2 }}>{message || 'Termine plus de tâches en notant le temps réel pour activer.'}</div>
        </div>
      </motion.div>
    )
  }

  const ringColor = calibrationGlobale > 70 ? '#4caf82' : calibrationGlobale > 40 ? '#e08a3c' : '#e05c5c'
  const verdict = calibrationGlobale > 75 ? 'Tu calibres très bien'
    : calibrationGlobale > 50 ? 'Calibration correcte'
    : 'Marge de progression'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.bg2, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '18px 20px', marginBottom: 16,
      }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, #a855f7)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${T.accent}40` }}>
          <Brain size={16} color="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: '-0.2px' }}>Task DNA — Calibration</div>
          <div style={{ fontSize: 11, color: T.text2 }}>Estimation vs réalité sur {totalAnalyses} tâches mesurées</div>
        </div>
      </div>

      {/* Score global + verdict */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', background: ringColor + '0d', border: `1px solid ${ringColor}25`, borderRadius: 10, marginBottom: 16 }}>
        {/* Anneau SVG */}
        <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke={T.border} strokeWidth="5" />
          <motion.circle
            cx="28" cy="28" r="22" fill="none"
            stroke={ringColor} strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 22}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - calibrationGlobale / 100) }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            strokeLinecap="round" transform="rotate(-90 28 28)"
          />
          <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="800" fill={ringColor}>
            {calibrationGlobale}%
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ringColor, marginBottom: 2 }}>{verdict}</div>
          <div style={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45 }}>
            % de tâches dans la zone ±20% du temps estimé
          </div>
        </div>
      </div>

      {/* Sous-estimés / Sur-estimés */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        {sousEstimes.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#e05c5c', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={11} /> TU SOUS-ESTIMES
            </div>
            {sousEstimes.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#e05c5c0d', borderRadius: 8, marginBottom: 6, border: `1px solid #e05c5c20` }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.categorie}</div>
                  <div style={{ fontSize: 10, color: T.text2 }}>{s.nbTaches} tâches</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#e05c5c', flexShrink: 0, marginLeft: 8 }}>+{s.ecartPct}%</div>
              </div>
            ))}
          </div>
        )}
        {surEstimes.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4caf82', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingDown size={11} /> TU SUR-ESTIMES
            </div>
            {surEstimes.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#4caf820d', borderRadius: 8, marginBottom: 6, border: `1px solid #4caf8220` }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.categorie}</div>
                  <div style={{ fontSize: 10, color: T.text2 }}>{s.nbTaches} tâches</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#4caf82', flexShrink: 0, marginLeft: 8 }}>{s.ecartPct}%</div>
              </div>
            ))}
          </div>
        )}
        {sousEstimes.length === 0 && surEstimes.length === 0 && (
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: T.text2, textAlign: 'center', padding: 20 }}>
            ✨ Tes estimations sont remarquablement justes — pas d'écart significatif détecté.
          </div>
        )}
      </div>
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// WEEK RECAP — phrase storytelling en haut, action contextuelle
// ══════════════════════════════════════════════════════════════════════
const WeekRecap = memo(({ stats, gamification, T, isMobile, navigate, jours }) => {
  if (!stats) return null
  const total = stats.total || 0
  const velocity = stats.velocity || 0
  const streak = gamification?.streak ?? stats.streak ?? 0
  const wow = stats.wow || 0
  const burnoutRisk = stats.burnoutRisk
  const lowRatio = stats.lowRatio || 0
  const focusScore = stats.focusScore || 0
  const periodLabel = jours === 7 ? 'cette semaine' : jours === 30 ? 'ce mois' : 'ces 90 jours'

  // ── TON CHALLENGER : pousse, ne console pas ──
  // Cible projetée = potentiel basé sur meilleur jour × 7
  const maxDay = stats.maxVal || 0
  const potentielSemaine = maxDay * 7
  const ecartPotentiel = Math.max(0, potentielSemaine - total)

  let actionPhrase, ctaLabel, ctaAction
  if (total === 0) {
    actionPhrase = `Zéro tâche. Le top 10% en fait déjà 15. Démarre maintenant.`
    ctaLabel = 'Attaquer'
    ctaAction = () => navigate('/planification')
  } else if (burnoutRisk) {
    // Même en burnout : on pousse à la stratégie, pas au repos passif
    actionPhrase = `Tu pousses fort mais mal réparti. Étale, garde l'intensité.`
    ctaLabel = 'Réorganiser'
    ctaAction = () => navigate('/planification')
  } else if (lowRatio > 70) {
    actionPhrase = `${lowRatio}% de vanité. Le travail qui compte est ailleurs — vas-y.`
    ctaLabel = 'Voir prio haute'
    ctaAction = () => {
      try { sessionStorage.setItem('dashboard_init_filter', 'haute') } catch {}
      navigate('/dashboard')
    }
  } else if (ecartPotentiel >= maxDay && maxDay > 0) {
    actionPhrase = `Ton meilleur jour : ${maxDay}. Sur 7j ça fait ${potentielSemaine}. Tu es à ${total}. Réveille-toi.`
    ctaLabel = 'Pousser'
    ctaAction = () => navigate('/planification')
  } else if (wow < -10) {
    actionPhrase = `${wow}% vs sem dernière. Tu redescends. Reprends le contrôle aujourd'hui.`
    ctaLabel = 'Reprendre'
    ctaAction = () => navigate('/planification')
  } else if (streak >= 7) {
    actionPhrase = `${streak} jours d'affilée. Pousse à 14j — c'est là que ça devient identité.`
    ctaLabel = 'Planifier J+1'
    ctaAction = () => navigate('/planification')
  } else if (streak >= 3) {
    actionPhrase = `Série de ${streak}j. Ne casse pas la chaîne — planifie demain MAINTENANT.`
    ctaLabel = 'Planifier J+1'
    ctaAction = () => navigate('/planification')
  } else if (wow > 20) {
    actionPhrase = `+${wow}% — tu accélères. Tiens le rythme et passe le seuil suivant.`
    ctaLabel = 'Continuer'
    ctaAction = () => navigate('/planification')
  } else if (focusScore > 75) {
    actionPhrase = `Focus ${focusScore}/100 — tu priorises bien. Augmente le volume maintenant.`
    ctaLabel = 'Volumiser'
    ctaAction = () => navigate('/dashboard')
  } else {
    actionPhrase = `${total} tâches. Vise +30% cette semaine — c'est ${Math.round(total * 1.3)} au lieu de ${total}.`
    ctaLabel = 'Viser haut'
    ctaAction = () => navigate('/planification')
  }

  // Emoji vibe — vise la performance, pas le confort
  const vibe = total === 0 ? '⚡'
    : burnoutRisk ? '⚠️'
    : streak >= 7 ? '🏆'
    : streak >= 3 ? '🔥'
    : wow > 20 ? '🚀'
    : wow < -10 ? '📉'
    : ecartPotentiel >= maxDay ? '🎯'
    : '💪'

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 }}
      style={{
        background: `linear-gradient(135deg, ${T.bg2}, ${T.accent}08)`,
        border: `1px solid ${T.accent}25`,
        borderRadius: 16,
        padding: isMobile ? '14px 16px' : '16px 22px',
        marginBottom: 14,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 10 : 16,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Halo accent décoratif */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${T.accent}15, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ fontSize: isMobile ? 26 : 32, flexShrink: 0, lineHeight: 1 }}>{vibe}</div>

      <div style={{ flex: 1, minWidth: isMobile ? '70%' : 0 }}>
        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: '-0.2px' }}>
          Bilan {periodLabel} : <span style={{ color: T.accent }}>✓ {total} tâches</span>
          {streak > 0 && <span style={{ color: '#e08a3c' }}> · 🔥 {streak}j</span>}
          {wow !== 0 && <span style={{ color: wow > 0 ? '#4caf82' : '#e05c5c' }}> · {wow > 0 ? '+' : ''}{wow}%</span>}
          {velocity > 0 && <span style={{ color: T.text2, fontWeight: 600 }}> · {velocity}/j</span>}
        </div>
        <div style={{ fontSize: 12.5, color: T.text2, lineHeight: 1.5 }}>
          → {actionPhrase}
        </div>
      </div>

      <motion.button
        onClick={ctaAction}
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.96 }}
        style={{
          padding: isMobile ? '8px 14px' : '10px 18px',
          borderRadius: 10,
          background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
          color: '#fff', border: 'none',
          fontSize: 12.5, fontWeight: 700,
          cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: `0 6px 16px ${T.accent}45`,
          flexShrink: 0,
          marginLeft: isMobile ? 'auto' : 0,
        }}>
        {ctaLabel} →
      </motion.button>
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// GAMIFICATION BAR — niveau, XP, streak, focus ring
// ══════════════════════════════════════════════════════════════════════
const GamificationBar = memo(({ stats, points, niveau, niveauActuel, pctNiveau, T, loading, isMobile }) => {
  const streak = stats?.streak || 0
  const focusScore = stats?.focusScore || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      style={{
        background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: isMobile ? '12px 14px' : '14px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 20,
        flexWrap: isMobile ? 'wrap' : 'nowrap', position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${T.accent}, #a855f7, #e08a3c)` }} />

      {/* Niveau */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, #a855f7)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${T.accent}40` }}>
          <Crown size={16} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.text2, fontWeight: 600, letterSpacing: 0.5 }}>NIVEAU {niveau}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{niveauActuel.label}</div>
        </div>
      </div>

      <div style={{ width: 1, height: 32, background: T.border, flexShrink: 0, display: isMobile ? 'none' : 'block' }} />

      {/* XP bar */}
      <div style={{ flex: isMobile ? '1 1 100px' : 1, minWidth: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: T.text2 }}>Progression XP</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.accent }}>{points} pts</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: T.border, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctNiveau}%` }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${T.accent}, #a855f7)` }}
          />
        </div>
        <div style={{ fontSize: 9, color: T.text2, marginTop: 3 }}>{pctNiveau}% vers niveau {niveau + 1}</div>
      </div>

      <div style={{ width: 1, height: 32, background: T.border, flexShrink: 0, display: isMobile ? 'none' : 'block' }} />

      {/* Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <motion.div
          animate={streak >= 3 ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          <Flame size={20} color={streak >= 3 ? '#e08a3c' : T.text2} strokeWidth={2} />
        </motion.div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: streak >= 3 ? '#e08a3c' : T.text, lineHeight: 1 }}>
            {streak}<span style={{ fontSize: 10, fontWeight: 600 }}>j</span>
          </div>
          <div style={{ fontSize: 10, color: T.text2 }}>streak</div>
        </div>
      </div>

      <div style={{ width: 1, height: 32, background: T.border, flexShrink: 0, display: isMobile ? 'none' : 'block' }} />

      {/* Focus ring SVG */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <svg width={38} height={38} viewBox="0 0 38 38">
          <circle cx="19" cy="19" r="14" fill="none" stroke={T.border} strokeWidth="3.5" />
          <motion.circle
            cx="19" cy="19" r="14" fill="none"
            stroke={focusScore > 75 ? '#4caf82' : focusScore > 40 ? '#e08a3c' : '#e05c5c'}
            strokeWidth="3.5"
            strokeDasharray={`${2 * Math.PI * 14}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - focusScore / 100) }}
            transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
            strokeLinecap="round"
            transform="rotate(-90 19 19)"
          />
          <text x="19" y="23" textAnchor="middle" fontSize="9" fontWeight="800"
            fill={focusScore > 75 ? '#4caf82' : focusScore > 40 ? '#e08a3c' : '#e05c5c'}>
            {loading ? '?' : focusScore}
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Focus</div>
          <div style={{ fontSize: 10, color: T.text2 }}>
            {focusScore > 75 ? '🎯 Excellent' : focusScore > 40 ? 'Correct' : '↑ À améliorer'}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// ALERT BANNER — burnout / 80-20, dismissable par jour
// ══════════════════════════════════════════════════════════════════════
const AlertBanner = memo(({ stats, T, isMobile }) => {
  const navigate = useNavigate()
  const todayKey = new Date().toISOString().split('T')[0]
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('analytics_alert_dismissed') === todayKey }
    catch { return false }
  })

  let alert = null
  if (!dismissed && stats) {
    if (stats.burnoutRisk) {
      alert = {
        Icon: Flame, color: '#e05c5c',
        title: '⚠️ Pattern burnout : tu pousses mal',
        text: 'Tu sprintes 3 jours puis tu craches. Étale l\'intensité — garde le rythme, pas l\'épuisement.',
        ctaLabel: 'Réorganiser →',
        ctaAction: () => navigate('/planification'),
      }
    } else if (stats.lowRatio > 70) {
      alert = {
        Icon: AlertTriangle, color: '#e08a3c',
        title: `⚡ ${stats.lowRatio}% de vanité — le vrai impact est ailleurs`,
        text: 'Tu coches des cases faciles mais tu n\'avances pas sur ce qui compte. Attaque tes haute prio MAINTENANT.',
        ctaLabel: 'Attaquer prio haute →',
        ctaAction: () => {
          try { sessionStorage.setItem('dashboard_init_filter', 'haute') } catch {}
          navigate('/dashboard')
        },
      }
    } else if (stats.streak >= 5) {
      alert = {
        Icon: Flame, color: '#e08a3c',
        title: `🔥 Streak ${stats.streak}j — ne casse pas la chaîne`,
        text: `Tu as construit ${stats.streak} jours d'identité. Une journée vide et tout repart de zéro. Planifie demain MAINTENANT.`,
        ctaLabel: 'Planifier J+1 →',
        ctaAction: () => navigate('/planification'),
      }
    } else if (stats.wow < -15) {
      alert = {
        Icon: TrendingDown, color: '#e05c5c',
        title: `📉 ${stats.wow}% vs semaine dernière — tu redescends`,
        text: 'Identifie ce qui a changé et reprends le contrôle aujourd\'hui. Pas demain. Aujourd\'hui.',
        ctaLabel: 'Reprendre →',
        ctaAction: () => navigate('/planification'),
      }
    }
  }

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key="alert-banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            background: alert.color + '10', border: `1px solid ${alert.color}35`,
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', alignItems: 'flex-start',
            gap: 12, overflow: 'hidden',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
          }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: alert.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <alert.Icon size={14} color={alert.color} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: alert.color, marginBottom: 2 }}>{alert.title}</div>
            <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{alert.text}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', marginLeft: isMobile ? 'auto' : 0 }}>
            <motion.button
              onClick={alert.ctaAction}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                padding: '7px 12px', borderRadius: 8,
                background: alert.color, color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: `0 4px 12px ${alert.color}40`,
              }}>
              {alert.ctaLabel} →
            </motion.button>
            <motion.button
              onClick={() => {
                setDismissed(true)
                try { localStorage.setItem('analytics_alert_dismissed', todayKey) } catch {}
              }}
              whileTap={{ scale: 0.85 }}
              title="Masquer pour aujourd'hui"
              style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={13} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

// ══════════════════════════════════════════════════════════════════════
// TRAJECTORY CARD — projection en avant + sparkline 7j
// ══════════════════════════════════════════════════════════════════════
const TrajectoryCard = memo(({ stats, T, loading, isMobile }) => {
  if (loading || !stats) return null

  const { velocity, wow, streak, total, current } = stats
  const isAccel = wow > 10
  const isDecel = wow < -10

  const projectedMonth = Math.round(velocity * 22)
  let milestoneStr = ''
  if (isAccel && velocity > 0) {
    const daysNeeded = Math.ceil(total / velocity)
    const d = new Date()
    d.setDate(d.getDate() + daysNeeded)
    milestoneStr = ` Tu doubles ta période vers le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`
  }

  const trendColor = isAccel ? '#4caf82' : isDecel ? '#e05c5c' : T.accent
  const TrendIcon = isAccel ? TrendingUp : isDecel ? TrendingDown : Activity
  const headline = isAccel
    ? `Tu accélères de +${wow}%`
    : isDecel
    ? `Rythme en baisse (${wow}%)`
    : `Rythme stable — ${velocity}/j actif`
  const subline = isAccel
    ? `À ce rythme : ~${projectedMonth} tâches ce mois.${milestoneStr}`
    : isDecel
    ? `Série de ${streak}j en cours. Identifie ce qui a changé pour retrouver ta vitesse.`
    : streak >= 3
    ? `🔥 ${streak} jours de série — un effort ciblé aujourd'hui ancre l'habitude.`
    : `Régularité beats intensité. Un effort ciblé aujourd'hui changera la courbe de demain.`

  const last7 = current.slice(-7)
  const maxL7 = Math.max(...last7, 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      style={{
        background: T.bg2, border: `1px solid ${trendColor}30`, borderRadius: 14,
        padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${trendColor}, ${trendColor}40)`, borderRadius: '3px 0 0 3px' }} />

      <div style={{ width: 38, height: 38, borderRadius: 11, background: trendColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>
        <TrendIcon size={18} color={trendColor} strokeWidth={2.2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: trendColor, marginBottom: 2 }}>{headline}</div>
        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{subline}</div>
      </div>

      {/* Mini sparkline 7j */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32, flexShrink: 0, paddingRight: 4 }}>
          {last7.map((v, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              style={{
                width: 5,
                height: `${Math.max((v / maxL7) * 100, 8)}%`,
                background: i === last7.length - 1 ? trendColor : trendColor + '55',
                borderRadius: 2,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
})

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const [periode, setPeriode] = useState('7')
  const [activeTab, setActiveTab] = useState('overview')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [drillDownDate, setDrillDownDate] = useState(null)
  const profileMenuRef = useRef(null)

  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  // Sidebar toggle persistant (comme Dashboard)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('analytics_sidebar_open') !== 'false' }
    catch { return true }
  })

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    localStorage.setItem('analytics_sidebar_open', String(next))
  }

  useEffect(() => {
    if (!user) navigate('/')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const jours = parseInt(periode)
  const { data, loading } = useAnalyticsData(user?.id, jours)
  const stats = useStatistics(data, jours)
  const gamification = useGamification(user?.id)
  const calibration = useCalibration(user?.id)

  const periodes = [
    { id: '7',  label: '7J'  },
    { id: '30', label: '30J' },
    { id: '90', label: '90J' },
  ]

  const tabs = [
    { id: 'overview',  label: 'Vue d\'ensemble', icon: Activity  },
    { id: 'insights',  label: 'Insights IA',     icon: Brain     },
    { id: 'heatmap',   label: 'Heatmap',         icon: Flame     },
  ]

  // Filtres (inutilisés dans analytics mais présents pour la sidebar identique)
  const [filtre, setFiltre] = useState('toutes')
  const bloquees = 0

  // Profil + gamification — données RÉELLES du backend (avec fallback pendant le fetch)
  const userData = { nom: user?.nom || 'Utilisateur', email: user?.email || 'user@example.com' }
  const points = gamification?.points ?? 0
  const niveau = gamification?.niveau ?? 1
  const niveauActuel = { label: gamification?.label || 'Débutant' }
  const pctNiveau = gamification?.pctNiveau ?? 0
  const streak = gamification?.streak ?? (stats?.streak || 0)

  const SIDEBAR_W = 248
  const sidebarLeft = isMobile
    ? (sidebarOpen ? 0 : '-100%')
    : (sidebarOpen ? 0 : -SIDEBAR_W)
  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  // Chart base options — theme-aware
  const baseOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: T.bg2 || '#1a1a2e',
        titleColor: T.text || '#fff',
        bodyColor: T.text2 || '#888',
        borderColor: 'transparent',
        borderWidth: 0,
        padding: 12,
        cornerRadius: 10,
      }
    },
    scales: {
      x: {
        ticks: { color: T.text2 || '#888', font: { size: 11 }, maxTicksLimit: jours <= 7 ? 7 : 10 },
        grid: { display: false },
        border: { display: false, color: 'transparent' }
      },
      y: {
        ticks: { color: T.text2 || '#888', font: { size: 11 }, stepSize: 1, callback: v => Number.isInteger(v) ? v : null },
        grid: { color: T.border ? T.border + '10' : 'rgba(128,128,128,0.06)', drawBorder: false },
        border: { display: false, color: 'transparent' },
        beginAtZero: true
      }
    }
  }), [T, jours])

  // ── Palette pastel moderne (couleurs statiques, pas de fonctions) ──
  const PASTEL = {
    main: T.accent || '#6c63ff',
    ghost: (T.text2 || '#888') + '40',
    mint: '#86d4a8',
    peach: '#ffb89e',
    rose: '#ff9eb5',
    lavender: '#b8a5ff',
  }

  // Helper gradient via fonction (Chart.js v4 — context.chart contient ctx+chartArea)
  const makeAreaGradient = (color) => (ctx) => {
    const chart = ctx.chart
    if (!chart || !chart.chartArea) return color + '33'
    const c = chart.ctx
    const area = chart.chartArea
    const g = c.createLinearGradient(0, area.top, 0, area.bottom)
    g.addColorStop(0, color + '55')
    g.addColorStop(1, color + '08')
    return g
  }

  // Chart data — minimaliste, courbes lissées, area semi-transparent
  const lineChartData = useMemo(() => {
    if (!stats) return null
    return {
      labels: stats.labels,
      datasets: [
        {
          label: 'Cette période',
          data: stats.current,
          borderColor: PASTEL.main,
          backgroundColor: makeAreaGradient(PASTEL.main),
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: PASTEL.main,
          pointBorderWidth: 2,
          pointRadius: jours <= 7 ? 3 : 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Période précédente',
          data: stats.previous,
          borderColor: PASTEL.ghost,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [4, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Moyenne 7J',
          data: stats.movingAvg,
          borderColor: PASTEL.mint,
          backgroundColor: 'transparent',
          borderWidth: 1.8,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          borderDash: [3, 3],
        }
      ]
    }
  }, [stats, T.accent, T.text2, jours])

  const cumulativeData = useMemo(() => {
    if (!stats) return null
    return {
      labels: stats.labels,
      datasets: [{
        data: stats.cumulative,
        borderColor: PASTEL.lavender,
        backgroundColor: makeAreaGradient(PASTEL.lavender),
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }]
    }
  }, [stats])

  const barData = useMemo(() => {
    if (!stats) return null
    return {
      labels: stats.labels,
      datasets: [{
        data: stats.current,
        backgroundColor: stats.current.map((_, i) =>
          i === stats.maxIdx ? PASTEL.main : PASTEL.main + 'aa'
        ),
        borderRadius: 10,
        borderSkipped: false,
        borderColor: 'transparent',
        borderWidth: 0,
        maxBarThickness: 36,
      }]
    }
  }, [stats, T.accent])

  const chronoData = useMemo(() => {
    if (!stats) return null
    const compressed = Array.from({ length: 8 }, (_, i) => {
      const start = i * 3
      const slice = stats.heures.slice(start, start + 3)
      return slice.reduce((a, b) => a + b, 0)
    })
    const max = Math.max(...compressed)
    return {
      labels: Array.from({ length: 8 }, (_, i) => `${i * 3}h`),
      datasets: [{
        data: compressed,
        backgroundColor: compressed.map((v) => {
          const intensity = max > 0 ? v / max : 0
          const alpha = Math.round((0.45 + intensity * 0.55) * 255).toString(16).padStart(2, '0')
          return PASTEL.lavender + alpha
        }),
        borderRadius: 10,
        borderSkipped: false,
        borderColor: 'transparent',
        borderWidth: 0,
        maxBarThickness: 32,
      }]
    }
  }, [stats])

  const doughnutData = useMemo(() => {
    if (!stats) return null
    return {
      labels: ['Haute', 'Moyenne', 'Basse'],
      datasets: [{
        data: [stats.priorites?.haute || 0, stats.priorites?.moyenne || 0, stats.priorites?.basse || 0],
        backgroundColor: [PASTEL.rose, PASTEL.peach, PASTEL.mint],
        borderColor: [T.bg, T.bg, T.bg],
        borderWidth: 3,
        hoverOffset: 8,
        hoverBorderWidth: 0,
      }]
    }
  }, [stats, T])

  const lineOptionsWithLegend = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: T.text2,
          font: { size: 11 },
          boxWidth: 24,
          padding: 12,
          usePointStyle: true,
        }
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: T.text2, font: { size: 11 }, padding: 14, boxWidth: 10, usePointStyle: true }
      },
      tooltip: baseOptions.plugins.tooltip,
    }
  }

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — IDENTIQUE AU DASHBOARD
      ══════════════════════════════════════════════════════════════ */}
      <motion.aside
        animate={{ left: sidebarLeft, width: SIDEBAR_W }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ width: SIDEBAR_W, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px,3vh,24px) clamp(12px,2vw,16px)', position: 'fixed', top: 0, height: '100vh', zIndex: 150, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}>

        {/* Logo + bouton fermer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(24px,4vh,32px)', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={16} color={T.bg} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>GetShift</span>
          </div>
          {!isMobile && (
            <motion.button onClick={toggleSidebar}
              style={{ width: 28, height: 28, borderRadius: 7, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              whileHover={{ color: T.accent, borderColor: T.accent }}
              title="Réduire la sidebar">
              <PanelLeftClose size={14} />
            </motion.button>
          )}
        </div>

        {/* Navigation */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {NAV_ITEMS.filter(item => !isMobile || !['/dashboard', '/analytics', '/planification'].includes(item.path)).map(item => {
          const Icon = item.icon
          const active = item.path === '/analytics'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false) }}
              whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </motion.button>
          )
        })}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* FILTRES (exactement comme dans Dashboard) */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>FILTRES</p>
        {[
          { val: 'toutes',   label: 'Toutes les tâches' },
          { val: 'haute',    label: 'Priorité haute' },
          { val: 'bloquee',  label: `Bloquées${bloquees > 0 ? ` (${bloquees})` : ''}` },
          { val: 'terminee', label: 'Terminées' },
        ].map(f => (
          <motion.button key={f.val}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', borderRadius: 10, color: filtre === f.val ? T.accent : T.text2, background: filtre === f.val ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filtre === f.val ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
            onClick={() => { setFiltre(f.val); if (isMobile) setSidebarOpen(false) }} whileHover={{ x: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.val === 'bloquee' && <IconLock size={12} color={filtre === f.val ? T.accent : T.text2} />}
              {f.label}
            </span>
            {filtre === f.val && <ChevronRight size={14} />}
          </motion.button>
        ))}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Avatar avec menu déroulant (comme Dashboard) */}
        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <motion.button onClick={() => setShowProfileMenu(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, background: showProfileMenu ? `${T.accent}15` : T.bg3, border: `1.5px solid ${showProfileMenu ? T.accent + '60' : T.border}`, cursor: 'pointer', textAlign: 'left' }}
            whileHover={{ background: `${T.accent}12` }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {userData.nom?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData.nom}</div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Niveau {niveau} · {points} pts</div>
            </div>
            <ChevronUp size={14} color={T.accent} style={{ transform: showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
          </motion.button>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                <motion.div ref={profileMenuRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)', zIndex: 300, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                        {userData.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData.nom}</div>
                        <div style={{ fontSize: 11, color: T.text2 }}>{userData.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 5 }}>
                      <span>Niveau {niveau} — {niveauActuel.label}</span>
                      <span style={{ color: T.accent, fontWeight: 600 }}>{points} pts</span>
                    </div>
                    <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pctNiveau}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99 }} />
                    </div>
                    {streak > 0 && <div style={{ fontSize: 10, color: '#e08a3c', fontWeight: 600, marginTop: 6 }}>🔥 {streak} jour{streak > 1 ? 's' : ''} de streak</div>}
                  </div>
                  <div style={{ padding: '6px' }}>
                    {[
                      { label: 'Mon profil', icon: User, onClick: () => { navigate('/profile'); setShowProfileMenu(false) } },
                      { label: 'Paramètres', icon: Settings, onClick: () => { setShowSettings(true); setShowProfileMenu(false) }, shortcut: '⌘ ,' },
                    ].map(({ label, icon: Icon, onClick, shortcut }) => (
                      <motion.button key={label} onClick={onClick}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                        whileHover={{ background: `${T.accent}10` }}>
                        <Icon size={15} color={T.text2} strokeWidth={1.8} />
                        <span style={{ flex: 1 }}>{label}</span>
                        {shortcut && <span style={{ fontSize: 10, color: T.text2, background: T.bg3, padding: '1px 6px', borderRadius: 5 }}>{shortcut}</span>}
                      </motion.button>
                    ))}
                  </div>
                  <div style={{ height: 1, background: T.border }} />
                  <div style={{ padding: '6px' }}>
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      whileHover={{ background: `${T.accent}10` }}>
                      <Star size={15} strokeWidth={1.8} />Passer à Pro — 4,99€/mois
                    </motion.button>
                  </div>
                  <div style={{ height: 1, background: T.border }} />
                  <div style={{ padding: '6px' }}>
                    <motion.button onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 13 }}
                      whileHover={{ background: 'rgba(224,92,92,0.08)' }}>
                      <LogOut size={15} strokeWidth={1.8} />Se déconnecter
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Overlay mobile sidebar */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 140 }}
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Bouton toggle sidebar flottant */}
      <motion.button
        onClick={toggleSidebar}
        animate={{ left: !isMobile && sidebarOpen ? SIDEBAR_W + 12 : 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ position: 'fixed', top: 14, zIndex: 200, width: 36, height: 36, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        whileHover={{ color: T.accent, borderColor: T.accent }}
        title={sidebarOpen ? 'Fermer la sidebar' : 'Ouvrir la sidebar'}>
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </motion.button>

      {/* MAIN */}
      <motion.main
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, padding: 'clamp(20px,4vw,36px)', paddingTop: isMobile ? 56 : 'clamp(20px,4vw,36px)', paddingBottom: isMobile ? 90 : 'clamp(20px,4vw,36px)', overflowX: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 800, color: T.text, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Analytiques
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              style={{ fontSize: 13, color: T.text2, marginTop: 4 }}>
              Intelligence comportementale de votre productivité
            </motion.p>
          </div>

          {/* Période selector */}
          <div style={{ display: 'flex', gap: 4, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4 }}>
            {periodes.map(p => (
              <motion.button key={p.id}
                style={{ padding: '6px 14px', borderRadius: 7, background: periode === p.id ? T.accent : 'transparent', color: periode === p.id ? '#fff' : T.text2, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setPeriode(p.id)}
                whileHover={periode !== p.id ? { color: T.accent } : {}}
                whileTap={{ scale: 0.97 }}>
                {p.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Week Recap — bilan storytelling avec action contextuelle */}
        {!loading && stats && (
          <WeekRecap
            stats={stats} gamification={gamification}
            T={T} isMobile={isMobile} navigate={navigate} jours={jours}
          />
        )}

        {/* Gamification Bar */}
        <GamificationBar
          stats={stats} points={points} niveau={niveau}
          niveauActuel={niveauActuel} pctNiveau={pctNiveau}
          T={T} loading={loading} isMobile={isMobile}
        />

        {/* Alert Banner — burnout / 80-20 / streak avec CTA actionnable */}
        {!loading && stats && <AlertBanner stats={stats} T={T} isMobile={isMobile} />}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <motion.button key={tab.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent', color: active ? T.accent : T.text2, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, marginBottom: -1 }}
                onClick={() => setActiveTab(tab.id)}>
                <Icon size={14} />
                {!isMobile && tab.label}
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">

          {/* ── TAB: OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Trajectory Card */}
              <TrajectoryCard stats={stats} T={T} loading={loading} isMobile={isMobile} />

              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 14, marginBottom: 24 }}>
                <KPICard icon={Target}     label="Taux de complétion"    value={loading ? '—' : `${stats?.taux || 0}%`}           sub={`${data?.terminees || 0}/${data?.total || 0} tâches`} color={T.accent}  delta={stats?.wow}   loading={loading} />
                <KPICard icon={Zap}        label="Vélocité"               value={loading ? '—' : `${stats?.velocity || 0}/j`}       sub="Tâches/jour actif"                                    color="#4caf82"   delta={undefined}    loading={loading} />
                <KPICard icon={Award}      label="Score de focus"          value={loading ? '—' : `${stats?.focusScore || 0}/100`}  sub="Priorité haute vs vanité"                             color="#e08a3c"   delta={undefined}    loading={loading} />
                <KPICard icon={Flame}      label="Série active"            value={loading ? '—' : `${stats?.streak || 0}j`}         sub={stats?.chronotype || '—'}                             color="#a855f7"   delta={undefined}    loading={loading} />
              </div>

              {/* WoW banner */}
              {!loading && stats?.wow !== 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 10, marginBottom: 20, background: stats.wow > 0 ? '#4caf8212' : '#e05c5c12', border: `1px solid ${stats.wow > 0 ? '#4caf8230' : '#e05c5c30'}` }}>
                  {stats.wow > 0 ? <TrendingUp size={16} color="#4caf82" /> : <TrendingDown size={16} color="#e05c5c" />}
                  <span style={{ fontSize: 13, color: stats.wow > 0 ? '#4caf82' : '#e05c5c', fontWeight: 600 }}>
                    {stats.wow > 0 ? '+' : ''}{stats.wow}% vs période précédente
                  </span>
                  <span style={{ fontSize: 12, color: T.text2 }}>
                    — {stats.total} tâches cette période vs {stats.totalPrev} la précédente
                  </span>
                </motion.div>
              )}

              {(() => {
                // ── Cartes graphes définies une fois, rendues différemment mobile/desktop ──
                const lineCard = (
                  <ChartCard title="Évolution quotidienne" subtitle="Cette période · Précédente · Moy. mobile 7J" delay={0.1}>
                    {loading ? <Skeleton height={isMobile ? 200 : 280} radius={10} /> : (
                      <div style={{ height: isMobile ? 200 : 280, position: 'relative' }}>
                        {lineChartData && <Line data={lineChartData} options={lineOptionsWithLegend} />}
                      </div>
                    )}
                  </ChartCard>
                )
                const barCard = (
                  <ChartCard title="Distribution par jour" subtitle="Le jour le plus actif est mis en avant" delay={0.2}>
                    {loading ? <Skeleton height={isMobile ? 200 : 220} radius={10} /> : (
                      <div style={{ height: isMobile ? 200 : 220, position: 'relative' }}>
                        {barData && <Bar data={barData} options={baseOptions} />}
                      </div>
                    )}
                  </ChartCard>
                )
                const cumulCard = (
                  <ChartCard title="Courbe de croissance" subtitle="Tâches cumulées sur la période" delay={0.25}>
                    {loading ? <Skeleton height={isMobile ? 200 : 220} radius={10} /> : (
                      <div style={{ height: isMobile ? 200 : 220, position: 'relative' }}>
                        {cumulativeData && <Line data={cumulativeData} options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }} />}
                      </div>
                    )}
                  </ChartCard>
                )
                const chronoCard = (
                  <ChartCard title="Chronotype productif" subtitle="Quand es-tu le plus efficace ?" delay={0.3}>
                    {loading ? <Skeleton height={isMobile ? 200 : 220} radius={10} /> : (
                      <>
                        <div style={{ height: isMobile ? 180 : 200, position: 'relative' }}>
                          {chronoData && <Bar data={chronoData} options={baseOptions} />}
                        </div>
                        {stats && (
                          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                            <div style={{ padding: '8px 18px', borderRadius: 99, background: T.accent + '15', border: `1px solid ${T.accent}30`, fontSize: 13, color: T.accent, fontWeight: 600 }}>
                              Pic : {stats.peakHour}h — {stats.chronotype}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </ChartCard>
                )
                const doughnutCard = (
                  <ChartCard title="Répartition priorités" subtitle="Vanité vs Impact" delay={0.35}>
                    {loading ? <Skeleton height={isMobile ? 200 : 220} radius={10} /> : (
                      <>
                        <div style={{ height: 180, position: 'relative' }}>
                          {doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />}
                        </div>
                        {stats && (
                          <div style={{ marginTop: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: T.text2 }}>Score de focus</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: stats.focusScore > 60 ? '#4caf82' : '#e08a3c' }}>
                              {stats.focusScore}/100
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </ChartCard>
                )

                // Mobile : tout en carrousel swipeable. Desktop : grilles existantes.
                // key={isMobile} force le remount des charts si on resize la fenêtre
                if (isMobile) {
                  return (
                    <div key="mobile-charts">
                      <ChartCarousel T={T}>
                        {lineCard}
                        {barCard}
                        {cumulCard}
                        {chronoCard}
                        {doughnutCard}
                      </ChartCarousel>
                    </div>
                  )
                }
                return (
                  <div key="desktop-charts">
                    {lineCard}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                      {barCard}
                      {cumulCard}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
                      {chronoCard}
                      {doughnutCard}
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* ── TAB: INSIGHTS ── */}
          {activeTab === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Task DNA — calibration des durées (feature signature) */}
              <TaskDNACard calibration={calibration} T={T} isMobile={isMobile} />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.text2, letterSpacing: '1px', marginBottom: 14 }}>MÉTRIQUES AVANCÉES</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Vélocité', value: `${stats?.velocity || 0} tâches/jour actif`, color: '#4caf82' },
                      { label: 'Score de focus', value: `${stats?.focusScore || 0}/100`, color: T.accent },
                      { label: 'Meilleur jour', value: stats?.maxIdx >= 0 ? stats?.labels[stats.maxIdx] || '—' : '—', color: '#e08a3c' },
                      { label: 'Tâches basse priorité', value: `${stats?.lowRatio || 0}% du total`, color: stats?.lowRatio > 70 ? '#e05c5c' : '#4caf82' },
                      { label: 'Série en cours', value: `${stats?.streak || 0} jours`, color: '#a855f7' },
                      { label: 'Risque burnout', value: stats?.burnoutRisk ? 'Détecté' : 'Normal', color: stats?.burnoutRisk ? '#e05c5c' : '#4caf82' },
                    ].map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 13, color: T.text2 }}>{m.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{loading ? '—' : m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: T.text2, letterSpacing: '1px', marginBottom: 14 }}>INDICATEUR BURNOUT</p>
                  {loading ? <Skeleton height={160} radius={10} /> : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: stats?.burnoutRisk ? '#e05c5c20' : '#4caf8220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Flame size={24} color={stats?.burnoutRisk ? '#e05c5c' : '#4caf82'} />
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: stats?.burnoutRisk ? '#e05c5c' : '#4caf82' }}>
                            {stats?.burnoutRisk ? 'Risque détecté' : 'Niveau normal'}
                          </div>
                          <div style={{ fontSize: 12, color: T.text2 }}>Basé sur vos {jours} derniers jours</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
                        {stats?.burnoutRisk
                          ? 'Une forte intensité sur 3 jours consécutifs est suivie d\'une chute de productivité. Prenez des pauses intentionnelles.'
                          : 'Votre rythme de travail semble équilibré. Continuez à maintenir un effort régulier.'}
                      </p>
                      <div style={{ marginTop: 16, height: 6, borderRadius: 99, background: T.border, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: stats?.burnoutRisk ? '80%' : '30%' }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          style={{ height: '100%', borderRadius: 99, background: stats?.burnoutRisk ? '#e05c5c' : '#4caf82' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* AI Insights */}
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, padding: '22px 24px' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Insights générés par l'algorithme</p>
                <p style={{ fontSize: 12, color: T.text2, marginBottom: 18 }}>Basés sur vos données réelles des {jours} derniers jours</p>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height={56} radius={12} />)}
                  </div>
                ) : stats?.insights?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.insights.map((ins, i) => (
                      <InsightCard key={i} icon={ins.icon} color={ins.color} text={ins.text} delay={i * 0.08} />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: T.text2, fontSize: 13 }}>
                    Pas assez de données pour générer des insights. Continuez à utiliser GetShift !
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TAB: HEATMAP ── */}
          {activeTab === 'heatmap' && (
            <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ChartCard title="Heatmap de productivité" subtitle="Intensité quotidienne · 4 derniers mois · clique un jour pour voir le détail">
                {loading ? <Skeleton height={140} radius={10} /> : (
                  <GitHubHeatmap parJour={data?.par_jour} T={T} onDayClick={setDrillDownDate} />
                )}
              </ChartCard>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14, marginTop: 16 }}>
                {[
                  { label: 'Total période', value: stats?.total || 0, icon: CheckSquare, color: T.accent },
                  { label: 'Meilleur jour', value: stats?.maxVal || 0, icon: Star,        color: '#e08a3c' },
                  { label: 'Jours actifs',  value: loading ? '—' : `${stats?.current?.filter(v => v > 0).length || 0}/${jours}`, icon: Activity, color: '#4caf82' },
                ].map((m, i) => {
                  const Icon = m.icon
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={18} color={m.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{loading ? '—' : m.value}</div>
                        <div style={{ fontSize: 12, color: T.text2 }}>{m.label}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.main>

      {/* DRAWER PARAMÈTRES */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, backdropFilter: 'blur(3px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px,100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 1051, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={18} color={T.accent} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h2>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{userData.nom}</p>
                    </div>
                  </div>
                  <motion.button onClick={() => setShowSettings(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <p style={{ fontSize: 13, color: T.text2 }}>Paramètres généraux à venir...</p>
              </div>
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 12, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => { localStorage.removeItem('user'); navigate('/') }} whileHover={{ background: 'rgba(224,92,92,0.12)' }}>
                  <LogOut size={16} strokeWidth={1.8} />Se déconnecter
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Coach Nova — voit toutes les données analytics en temps réel */}
      {!loading && stats && (
        <CoachFloat
          T={T}
          isMobile={isMobile}
          userId={user?.id}
          analyticsStats={stats}
          defaultStyle="nova"
        />
      )}

      {/* Drill-down jour : modal des tâches d'une date cliquée */}
      {drillDownDate && (
        <DayDrillModal
          userId={user?.id}
          date={drillDownDate}
          T={T}
          isMobile={isMobile}
          onClose={() => setDrillDownDate(null)}
        />
      )}

      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}
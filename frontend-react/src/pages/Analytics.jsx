import { useState, useEffect, useMemo, useCallback, memo } from 'react'
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
  Activity, Clock, Star
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useMediaQuery } from '../useMediaQuery'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

const API = 'https://getshift-backend.onrender.com'

// ══════════════════════════════════════════════════════════════════════
// HOOK: useAnalyticsData — Fetching & caching
// ══════════════════════════════════════════════════════════════════════
function useAnalyticsData(userId, jours) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    axios.get(`${API}/analytics/${userId}?jours=${jours}`)
      .then(r => { setData(r.data); setError(null) })
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

    // Build daily arrays
    const buildDays = (offset = 0) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (n - 1 - i) - offset)
        return d.toISOString().split('T')[0]
      })

    const currentKeys = buildDays(0)
    const prevKeys = buildDays(n)

    const getCount = (keys, parJour) =>
      keys.map(k => {
        const found = parJour?.find(p =>
          new Date(p.jour).toISOString().split('T')[0] === k
        )
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
const GitHubHeatmap = memo(({ parJour, T }) => {
  const weeks = 18 // ~4 mois
  const days = 7

  const data = useMemo(() => {
    const map = {}
    parJour?.forEach(p => {
      const k = new Date(p.jour).toISOString().split('T')[0]
      map[k] = (map[k] || 0) + p.count
    })
    return map
  }, [parJour])

  const maxVal = Math.max(...Object.values(data), 1)

  const cells = []
  for (let w = weeks - 1; w >= 0; w--) {
    const col = []
    for (let d = 0; d < days; d++) {
      const date = new Date()
      date.setDate(date.getDate() - (w * 7 + d))
      const key = date.toISOString().split('T')[0]
      const val = data[key] || 0
      const intensity = val / maxVal
      col.push({ key, val, intensity, date })
    }
    cells.push(col)
  }

  const getColor = (intensity) => {
    if (intensity === 0) return T.border
    if (intensity < 0.25) return T.accent + '40'
    if (intensity < 0.5)  return T.accent + '70'
    if (intensity < 0.75) return T.accent + 'aa'
    return T.accent
  }

  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
          {dayLabels.map((l, i) => (
            <div key={i} style={{ width: 10, height: 12, fontSize: 9, color: T.text2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l}</div>
          ))}
        </div>
        {/* Grid */}
        {cells.map((col, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {col.map(({ key, val, intensity, date }) => (
              <motion.div
                key={key}
                title={`${date.toLocaleDateString('fr-FR')} : ${val} tâche${val !== 1 ? 's' : ''}`}
                style={{ width: 12, height: 12, borderRadius: 3, background: getColor(intensity), cursor: 'default', flexShrink: 0 }}
                whileHover={{ scale: 1.4 }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: T.text2 }}>Moins</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: getColor(v) }} />
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
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const [periode, setPeriode] = useState('7')
  const [showSidebar, setShowSidebar] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) navigate('/')
  }, [])

  const jours = parseInt(periode)
  const { data, loading } = useAnalyticsData(user?.id, jours)
  const stats = useStatistics(data, jours)

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard'     },
    { icon: Bot,             label: 'Assistant IA', path: '/ia'            },
    { icon: BarChart2,       label: 'Analytiques',  path: '/analytics'     },
    { icon: Calendar,        label: 'Planification',path: '/planification' },
    { icon: HelpCircle,      label: 'Aide',         path: '/help'          },
  ]

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
        borderColor: T.border || '#333',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      }
    },
    scales: {
      x: {
        ticks: { color: T.text2 || '#888', font: { size: 11 }, maxTicksLimit: jours <= 7 ? 7 : 10 },
        grid: { display: false },
        border: { display: false }
      },
      y: {
        ticks: { color: T.text2 || '#888', font: { size: 11 }, stepSize: 1, callback: v => Number.isInteger(v) ? v : null },
        grid: { color: (T.border || '#333') + '60', drawBorder: false },
        border: { display: false },
        beginAtZero: true
      }
    }
  }), [T, jours])

  // Chart data — memoized
  const lineChartData = useMemo(() => {
    if (!stats) return null
    return {
      labels: stats.labels,
      datasets: [
        {
          label: 'Cette période',
          data: stats.current,
          borderColor: T.accent,
          backgroundColor: T.accent + '15',
          borderWidth: 2.5,
          pointBackgroundColor: T.accent,
          pointRadius: jours <= 7 ? 4 : 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Période précédente',
          data: stats.previous,
          borderColor: T.text2 + '60',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Moyenne mobile 7J',
          data: stats.movingAvg,
          borderColor: '#4caf82',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          borderDash: [3, 2],
        }
      ]
    }
  }, [stats, T, jours])

  const cumulativeData = useMemo(() => {
    if (!stats) return null
    return {
      labels: stats.labels,
      datasets: [{
        data: stats.cumulative,
        borderColor: T.accent,
        backgroundColor: T.accent + '20',
        borderWidth: 2.5,
        pointRadius: 0,
        fill: true,
        tension: 0.4,
      }]
    }
  }, [stats, T])

  const barData = useMemo(() => {
    if (!stats) return null
    return {
      labels: stats.labels,
      datasets: [{
        data: stats.current,
        backgroundColor: stats.current.map((v, i) =>
          i === stats.maxIdx ? T.accent : T.accent + '55'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }]
    }
  }, [stats, T])

  const chronoData = useMemo(() => {
    if (!stats) return null
    const compressed = Array.from({ length: 8 }, (_, i) => {
      const start = i * 3
      const slice = stats.heures.slice(start, start + 3)
      return slice.reduce((a, b) => a + b, 0)
    })
    return {
      labels: Array.from({ length: 8 }, (_, i) => `${i * 3}h`),
      datasets: [{
        data: compressed,
        backgroundColor: compressed.map((v, i) => {
          const max = Math.max(...compressed)
          const intensity = max > 0 ? v / max : 0
          return `rgba(108, 99, 255, ${0.2 + intensity * 0.7})`
        }),
        borderRadius: 8,
      }]
    }
  }, [stats])

  const doughnutData = useMemo(() => {
    if (!stats) return null
    return {
      labels: ['Haute', 'Moyenne', 'Basse'],
      datasets: [{
        data: [stats.priorites?.haute || 0, stats.priorites?.moyenne || 0, stats.priorites?.basse || 0],
        backgroundColor: ['#e05c5c', '#e08a3c', '#4caf82'],
        borderColor: [T.bg2, T.bg2, T.bg2],
        borderWidth: 4,
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{
        width: 'min(248px, 85%)', maxWidth: 248,
        background: T.bg2, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '22px 14px',
        position: 'fixed', top: 0,
        left: isMobile ? (showSidebar ? 0 : '-100%') : 0,
        transition: 'left 0.3s ease', zIndex: 100,
        height: '100vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 6px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#a855f7'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>GetShift</span>
        </div>

        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: '1.5px', marginBottom: 8, padding: '0 6px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/analytics'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 9, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: active ? `1px solid ${T.accent}30` : '1px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }}
              whileHover={{ x: 2, color: T.accent }}>
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </motion.button>
          )
        })}

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 9, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13 }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#e05c5c' }}>
            <LogOut size={14} strokeWidth={1.8} />Déconnexion
          </motion.button>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 14, left: 14, zIndex: 200, width: 38, height: 38, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={17} />
        </motion.button>
      )}
      {isMobile && showSidebar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setShowSidebar(false)} />
      )}

      {/* MAIN */}
      <main style={{ marginLeft: isMobile ? 0 : 248, flex: 1, padding: 'clamp(20px,4vw,36px)', overflowX: 'hidden' }}>

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

              {/* Line chart: évolution + dotted prev */}
              <ChartCard title="Évolution quotidienne" subtitle="Cette période · Période précédente · Moyenne mobile 7J" delay={0.1}>
                {loading ? <Skeleton height={280} radius={10} /> : (
                  <div style={{ height: 280, position: 'relative' }}>
                    {lineChartData && <Line data={lineChartData} options={lineOptionsWithLegend} />}
                  </div>
                )}
              </ChartCard>

              {/* Row: Bar + Cumulative */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginTop: 16 }}>
                <ChartCard title="Distribution par jour" subtitle="Le jour le plus actif est mis en avant" delay={0.2}>
                  {loading ? <Skeleton height={220} radius={10} /> : (
                    <div style={{ height: 220, position: 'relative' }}>
                      {barData && <Bar data={barData} options={baseOptions} />}
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Courbe de croissance" subtitle="Tâches cumulées sur la période" delay={0.25}>
                  {loading ? <Skeleton height={220} radius={10} /> : (
                    <div style={{ height: 220, position: 'relative' }}>
                      {cumulativeData && <Line data={cumulativeData} options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false } } }} />}
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Row: Chronotype + Doughnut */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16, marginTop: 16 }}>
                <ChartCard title="Chronotype productif" subtitle="Quand êtes-vous le plus efficace ?" delay={0.3}>
                  {loading ? <Skeleton height={220} radius={10} /> : (
                    <>
                      <div style={{ height: 200, position: 'relative' }}>
                        {chronoData && <Bar data={chronoData} options={baseOptions} />}
                      </div>
                      {stats && (
                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                          <div style={{ padding: '8px 18px', borderRadius: 99, background: T.accent + '15', border: `1px solid ${T.accent}30`, fontSize: 13, color: T.accent, fontWeight: 600 }}>
                            Pic de productivité : {stats.peakHour}h — {stats.chronotype}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </ChartCard>

                <ChartCard title="Répartition priorités" subtitle="Vanité vs Impact" delay={0.35}>
                  {loading ? <Skeleton height={220} radius={10} /> : (
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
              </div>
            </motion.div>
          )}

          {/* ── TAB: INSIGHTS ── */}
          {activeTab === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
              <ChartCard title="Heatmap de productivité" subtitle="Intensité quotidienne sur les 4 derniers mois — style GitHub">
                {loading ? <Skeleton height={140} radius={10} /> : (
                  <GitHubHeatmap parJour={data?.par_jour} T={T} />
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
      </main>
    </div>
  )
}
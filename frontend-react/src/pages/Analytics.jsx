import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { LayoutDashboard, Bot, BarChart2, Calendar, LogOut, TrendingUp, TrendingDown, CheckSquare, Clock, Target, Layers, Menu } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { useMediaQuery } from '../useMediaQuery'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const API = 'https://taskflow-production-75c1.up.railway.app'

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerStats()
  }, [])

  const chargerStats = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/analytics/${user.id}`)
      setStats(res.data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
  ]

  const joursLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  })

  const joursKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: T.bg2,
        titleColor: T.text,
        bodyColor: T.text2,
        borderColor: T.border,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        ticks: { color: T.text2, font: { size: 11 } },
        grid: { color: T.border + '40' }
      },
      y: {
        ticks: {
          color: T.text2,
          font: { size: 11 },
          stepSize: 1,
          callback: v => Number.isInteger(v) ? v : null
        },
        grid: { color: T.border + '40' },
        beginAtZero: true
      }
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Target size={32} color={T.accent} />
      </motion.div>
    </div>
  )

  const tachesParJour = joursKeys.map(jour => {
    const found = stats?.par_jour?.find(p => p.jour?.split('T')[0] === jour || p.jour === jour)
    return found ? found.count : 0
  })

  const evolution = stats?.evolution || 0
  const evolutionPositive = evolution >= 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width: 248, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: isMobile ? (showSidebar ? 0 : -260) : 0,
transition: 'left 0.3s ease',
zIndex: 100, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>

        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/analytics'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => navigate(item.path)} whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {item.label}
            </motion.button>
          )
        })}

        <div style={{ marginTop: 'auto' }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13 }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#e05c5c' }}>
            <LogOut size={16} strokeWidth={1.8} />
            Déconnexion
          </motion.button>
        </div>
      </aside>

{isMobile && (
  <motion.button
    style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 40, height: 40, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    onClick={() => setShowSidebar(!showSidebar)}>
    <Menu size={20} />
  </motion.button>
)}
{isMobile && showSidebar && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
    onClick={() => setShowSidebar(false)} />
)}

      {/* Main */}
      <main style={{ marginLeft: isMobile ? 0 : 248, flex: 1, padding: '32px 40px' }}>
        <motion.div style={{ marginBottom: 32 }} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Analytiques</h1>
          <p style={{ color: T.text2, fontSize: 13, marginTop: 4 }}>Vue d'ensemble de votre productivité</p>
        </motion.div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            {
              icon: Target,
              label: 'Taux de complétion',
              value: `${stats?.taux_completion || 0}%`,
              sub: `${stats?.terminees || 0} sur ${stats?.total || 0} tâches`,
              color: T.accent
            },
            {
              icon: CheckSquare,
              label: 'Cette semaine',
              value: stats?.cette_semaine || 0,
              sub: `vs ${stats?.semaine_precedente || 0} semaine dernière`,
              color: '#4caf82',
              trend: evolution
            },
            {
              icon: Clock,
              label: 'Haute priorité',
              value: stats?.priorites?.haute || 0,
              sub: 'tâches urgentes',
              color: '#e05c5c'
            },
            {
              icon: BarChart2,
              label: 'Total tâches',
              value: stats?.total || 0,
              sub: `${stats?.priorites?.basse || 0} basse • ${stats?.priorites?.moyenne || 0} moyenne`,
              color: '#6c63ff'
            }
          ].map((kpi, i) => {
            const Icon = kpi.icon
            return (
              <motion.div key={i}
                style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -2, borderColor: kpi.color + '50' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Icon size={18} color={kpi.color} strokeWidth={1.8} />
                  {kpi.trend !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: evolutionPositive ? '#4caf82' : '#e05c5c' }}>
                      {evolutionPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(evolution)}%
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: T.text, letterSpacing: '-1px', marginBottom: 4 }}>{kpi.value}</div>
                <div style={{ fontSize: 12, color: T.text2 }}>{kpi.label}</div>
                <div style={{ fontSize: 11, color: T.text2, opacity: 0.6, marginTop: 2 }}>{kpi.sub}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Graphiques */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Tâches par jour */}
          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Tâches complétées — 7 derniers jours</p>
              <p style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Évolution quotidienne de votre productivité</p>
            </div>
            <Line
              data={{
                labels: joursLabels,
                datasets: [{
                  data: tachesParJour,
                  borderColor: T.accent,
                  backgroundColor: T.accent + '15',
                  borderWidth: 2,
                  pointBackgroundColor: T.accent,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={chartOptions}
            />
          </motion.div>

          {/* Répartition priorités */}
          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Répartition par priorité</p>
              <p style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Distribution de vos tâches</p>
            </div>
            <Doughnut
              data={{
                labels: ['Haute', 'Moyenne', 'Basse'],
                datasets: [{
                  data: [
                    stats?.priorites?.haute || 0,
                    stats?.priorites?.moyenne || 0,
                    stats?.priorites?.basse || 0
                  ],
                  backgroundColor: ['rgba(224,92,92,0.8)', 'rgba(224,138,60,0.8)', 'rgba(76,175,130,0.8)'],
                  borderColor: [T.bg2, T.bg2, T.bg2],
                  borderWidth: 3
                }]
              }}
              options={{
                responsive: true,
                cutout: '70%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: T.text2, font: { size: 11 }, padding: 16, boxWidth: 10 }
                  },
                  tooltip: {
                    backgroundColor: T.bg2,
                    titleColor: T.text,
                    bodyColor: T.text2,
                    borderColor: T.border,
                    borderWidth: 1
                  }
                }
              }}
            />
            {/* Légende custom */}
            <div style={{ marginTop: 16 }}>
              {[
                { label: 'Haute', val: stats?.priorites?.haute || 0, color: '#e05c5c' },
                { label: 'Moyenne', val: stats?.priorites?.moyenne || 0, color: '#e08a3c' },
                { label: 'Basse', val: stats?.priorites?.basse || 0, color: '#4caf82' },
              ].map(p => (
                <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: 12, color: T.text2 }}>{p.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.val}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Comparaison semaines */}
        <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Cette semaine vs semaine précédente</p>
            <p style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Comparaison de votre productivité</p>
          </div>
          <Bar
            data={{
              labels: ['Semaine précédente', 'Cette semaine'],
              datasets: [{
                data: [stats?.semaine_precedente || 0, stats?.cette_semaine || 0],
                backgroundColor: [T.accent + '40', T.accent],
                borderColor: [T.accent + '80', T.accent],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
              }]
            }}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: { display: false }
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 20 }}>
            {[
              { label: 'Semaine précédente', val: stats?.semaine_precedente || 0, color: T.accent + '80' },
              { label: 'Cette semaine', val: stats?.cette_semaine || 0, color: T.accent },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: '-1px' }}>{s.val}</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: evolutionPositive ? '#4caf82' : '#e05c5c', letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                {evolutionPositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                {Math.abs(evolution)}%
              </div>
              <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>Évolution</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

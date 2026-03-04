import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { 
  LayoutDashboard, Bot, BarChart2, Calendar, LogOut, TrendingUp, 
  TrendingDown, CheckSquare, Clock, Target, Layers, Menu, HelpCircle,
  Sun, Moon, Award, Zap, Calendar as CalendarIcon 
} from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { useMediaQuery } from '../useMediaQuery'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const API = 'https://taskflow-production-75c1.up.railway.app'

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('7jours')
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerStats()
  }, [periode])

  const chargerStats = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/analytics/${user.id}?jours=${periode === '7jours' ? 7 : 30}`)
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
    { icon: HelpCircle, label: 'Aide', path: '/help' },
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

  const semaineDerniereKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })

  const tachesParJour = joursKeys.map(jour => {
    const found = stats?.par_jour?.find(p => {
      const d = new Date(p.jour)
      return d.toISOString().split('T')[0] === jour
    })
    return found ? found.count : 0
  })

  const tachesSemaineDerniere = semaineDerniereKeys.map(jour => {
    const found = stats?.par_jour_semaine_derniere?.find(p => {
      const d = new Date(p.jour)
      return d.toISOString().split('T')[0] === jour
    })
    return found ? found.count : 0
  })

  const heuresLabels = Array.from({ length: 24 }, (_, i) => `${i}h`)
  const heuresData = stats?.par_heure || Array(24).fill(0)

  const moyenneJour = tachesParJour.reduce((a, b) => a + b, 0) / 7
  const meilleurJourIndex = tachesParJour.indexOf(Math.max(...tachesParJour))
  const meilleurJour = meilleurJourIndex >= 0 ? joursLabels[meilleurJourIndex] : '-'
  const meilleurJourValeur = Math.max(...tachesParJour)
  const pireJourIndex = tachesParJour.indexOf(Math.min(...tachesParJour.filter(v => v > 0)))
  const pireJour = pireJourIndex >= 0 ? joursLabels[pireJourIndex] : '-'
  const joursRestants = 7 - new Date().getDay()
  const projection = Math.round(moyenneJour * joursRestants)

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        grid: { display: false }
      },
      y: {
        ticks: {
          color: T.text2,
          font: { size: 11 },
          stepSize: 1,
          callback: v => Number.isInteger(v) ? v : null
        },
        grid: { display: false },
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

  const evolution = stats?.evolution || 0
  const evolutionPositive = evolution >= 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 1024px) {
          aside { width: 240px !important; }
          main { margin-left: 240px !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .charts-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 16px !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .kpi-card { padding: 16px !important; }
          .kpi-value { font-size: 24px !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
          .chart-container { height: 250px !important; }
        }
      `}</style>

      <aside style={{ width: 'min(248px, 85%)', maxWidth: '248px', background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 3vh, 24px) clamp(12px, 2vw, 16px)', position: 'fixed', top: 0, left: isMobile ? (showSidebar ? 0 : '-100%') : 0, transition: 'left 0.3s ease', zIndex: 100, height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'clamp(24px, 4vh, 32px)', padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>
        <p style={{ fontSize: 'clamp(9px, 2vw, 10px)', fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/analytics'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 'clamp(12px, 2.5vw, 13px)', fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }} whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </motion.button>
          )
        })}
        <div style={{ marginTop: 'auto' }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 'clamp(12px, 2.5vw, 13px)' }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#e05c5c' }}>
            <LogOut size={16} strokeWidth={1.8} />
            <span>Déconnexion</span>
          </motion.button>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 40, height: 40, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={20} />
        </motion.button>
      )}
      {isMobile && showSidebar && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setShowSidebar(false)} />}

      <main style={{ marginLeft: isMobile ? 0 : 248, flex: 1, padding: 'clamp(16px, 4vw, 40px)', width: isMobile ? '100%' : 'calc(100% - 248px)', overflowX: 'hidden' }}>

        <motion.div style={{ marginBottom: 'clamp(24px, 4vh, 32px)' }} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(22px, 5vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>Analytiques</h1>
              <p style={{ color: T.text2, fontSize: 'clamp(12px, 2.5vw, 13px)', marginTop: 4 }}>Analyse détaillée de votre productivité</p>
            </div>
            <div style={{ display: 'flex', gap: 6, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4 }}>
              {[{ id: '7jours', label: '7 jours' }, { id: '30jours', label: '30 jours' }].map(p => (
                <motion.button key={p.id}
                  style={{ padding: '6px 14px', borderRadius: 8, background: periode === p.id ? T.accent : 'transparent', color: periode === p.id ? T.bg : T.text2, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setPeriode(p.id)} whileHover={periode !== p.id ? { color: T.accent } : {}}>
                  {p.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(12px, 2vw, 16px)', marginBottom: 'clamp(24px, 4vh, 28px)' }}>
          {[
            { icon: Target, label: 'Taux de complétion', value: `${stats?.taux_completion || 0}%`, sub: `${stats?.terminees || 0} sur ${stats?.total || 0} tâches`, color: T.accent },
            { icon: CheckSquare, label: 'Moyenne / jour', value: moyenneJour.toFixed(1), sub: `${stats?.cette_semaine || 0} cette semaine`, color: '#4caf82' },
            { icon: Zap, label: 'Meilleur jour', value: meilleurJourValeur, sub: meilleurJour, color: '#e08a3c' },
            { icon: CalendarIcon, label: 'Projection', value: `+${projection}`, sub: 'tâches restantes', color: '#6c63ff' }
          ].map((kpi, i) => {
            const Icon = kpi.icon
            return (
              <motion.div key={i} className="kpi-card"
                style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(16px, 2vw, 20px)' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -2, borderColor: kpi.color + '50' }}>
                <div style={{ marginBottom: 14 }}><Icon size={18} color={kpi.color} strokeWidth={1.8} /></div>
                <div className="kpi-value" style={{ fontSize: 'clamp(24px, 5vw, 30px)', fontWeight: 700, color: T.text, letterSpacing: '-1px', marginBottom: 4 }}>{kpi.value}</div>
                <div style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: T.text2 }}>{kpi.label}</div>
                <div style={{ fontSize: 'clamp(10px, 2vw, 11px)', color: T.text2, opacity: 0.6, marginTop: 2 }}>{kpi.sub}</div>
              </motion.div>
            )
          })}
        </div>

        {/* Ligne 1 : Comparaison + Heatmap */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'clamp(16px, 3vw, 20px)', marginBottom: 'clamp(16px, 3vw, 20px)' }}>

          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(16px, 3vw, 24px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Comparaison jour par jour</p>
            <p style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>Cette semaine vs semaine dernière</p>
            <div className="chart-container" style={{ height: isMobile ? 250 : 300, position: 'relative' }}>
              <Bar
                data={{ labels: joursLabels, datasets: [
                  { label: 'Semaine dernière', data: tachesSemaineDerniere, backgroundColor: T.accent + '40', borderColor: T.accent + '80', borderWidth: 1, borderRadius: 6 },
                  { label: 'Cette semaine', data: tachesParJour, backgroundColor: T.accent, borderColor: T.accent, borderWidth: 1, borderRadius: 6 }
                ]}}
                options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true, position: 'top', labels: { color: T.text2, font: { size: 11 }, boxWidth: 12, padding: 8 } } } }}
              />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {joursLabels.map((jour, idx) => {
                const diff = tachesParJour[idx] - tachesSemaineDerniere[idx]
                if (diff === 0) return null
                return <div key={jour} style={{ fontSize: 11, color: diff > 0 ? '#4caf82' : '#e05c5c', background: diff > 0 ? '#4caf8215' : '#e05c5c15', padding: '4px 10px', borderRadius: 99 }}>{jour}: {diff > 0 ? '+' : ''}{diff} tâche{diff !== 1 ? 's' : ''}</div>
              })}
            </div>
          </motion.div>

          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(16px, 3vw, 24px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Moment de productivité</p>
            <p style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>Tâches complétées par heure</p>
            <div className="chart-container" style={{ height: isMobile ? 250 : 300, position: 'relative' }}>
              <Bar
                data={{ labels: heuresLabels.filter((_, i) => i % 3 === 0), datasets: [{ data: heuresData.filter((_, i) => i % 3 === 0), backgroundColor: (ctx) => { const value = ctx.dataset.data[ctx.dataIndex]; const max = Math.max(...heuresData) || 1; const intensity = value / max; return `rgba(108, 99, 255, ${0.3 + intensity * 0.5})` }, borderRadius: 8 }]}}
                options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
              />
            </div>
            {Math.max(...heuresData) > 0 && (
              <div style={{ marginTop: 16, textAlign: 'center', background: `${T.accent}10`, padding: 10, borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: T.text2 }}>Votre moment le plus productif est</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>{heuresData.indexOf(Math.max(...heuresData))}h - {heuresData.indexOf(Math.max(...heuresData)) + 1}h</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Ligne 2 : Évolution + Priorités */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 'clamp(16px, 3vw, 20px)', marginBottom: 'clamp(16px, 3vw, 20px)' }}>

          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(16px, 3vw, 24px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Évolution quotidienne</p>
            <p style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>Tendance sur les 7 derniers jours</p>
            <div className="chart-container" style={{ height: isMobile ? 250 : 300, position: 'relative' }}>
              <Line
                data={{ labels: joursLabels, datasets: [{ data: tachesParJour, borderColor: T.accent, backgroundColor: T.accent + '15', borderWidth: 2, pointBackgroundColor: T.accent, pointRadius: isMobile ? 3 : 4, pointHoverRadius: 6, fill: true, tension: 0.4 }]}}
                options={chartOptions}
              />
            </div>
          </motion.div>

          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(16px, 3vw, 24px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Répartition par priorité</p>
            <p style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>Distribution de vos tâches</p>
            <div className="chart-container" style={{ height: isMobile ? 250 : 300, position: 'relative' }}>
              <Doughnut
                data={{ labels: ['Haute', 'Moyenne', 'Basse'], datasets: [{ data: [stats?.priorites?.haute || 0, stats?.priorites?.moyenne || 0, stats?.priorites?.basse || 0], backgroundColor: ['#e05c5c', '#e08a3c', '#4caf82'], borderColor: [T.bg2, T.bg2, T.bg2], borderWidth: 3 }]}}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: T.text2, font: { size: isMobile ? 10 : 11 }, padding: 16, boxWidth: 10 } }, tooltip: { backgroundColor: T.bg2, titleColor: T.text, bodyColor: T.text2, borderColor: T.border, borderWidth: 1 } } }}
              />
            </div>
          </motion.div>
        </div>

        {/* Analyse personnalisée */}
        <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(16px, 3vw, 24px)', marginTop: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>💡 Analyse personnalisée</p>
          <p style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>Basé sur vos données des 7 derniers jours</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>

            <div style={{ background: T.bg3, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Award size={20} color={T.accent} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Votre jour de pointe</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color: T.accent, marginBottom: 4 }}>{meilleurJour}</p>
              <p style={{ fontSize: 12, color: T.text2 }}>{meilleurJourValeur} tâches complétées</p>
              <p style={{ fontSize: 11, color: T.text2, marginTop: 8, fontStyle: 'italic' }}>Vous êtes {meilleurJourValeur > moyenneJour * 1.5 ? 'très' : 'plus'} productif ce jour-là</p>
            </div>

            <div style={{ background: T.bg3, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sun size={20} color="#e08a3c" />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Moment idéal</span>
              </div>
              {Math.max(...heuresData) > 0 ? (
                <>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#e08a3c', marginBottom: 4 }}>{heuresData.indexOf(Math.max(...heuresData))}h - {heuresData.indexOf(Math.max(...heuresData)) + 1}h</p>
                  <p style={{ fontSize: 12, color: T.text2 }}>Votre pic de concentration</p>
                  <p style={{ fontSize: 11, color: T.text2, marginTop: 8 }}>Bloquez ce créneau pour les tâches importantes</p>
                </>
              ) : <p style={{ fontSize: 12, color: T.text2 }}>Pas assez de données</p>}
            </div>

            <div style={{ background: T.bg3, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <TrendingUp size={20} color={evolutionPositive ? '#4caf82' : '#e05c5c'} />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Tendance</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color: evolutionPositive ? '#4caf82' : '#e05c5c', marginBottom: 4 }}>{evolutionPositive ? '+' : ''}{evolution}%</p>
              <p style={{ fontSize: 12, color: T.text2 }}>{evolutionPositive ? 'Plus productif que la semaine dernière' : 'Moins productif que la semaine dernière'}</p>
              {!evolutionPositive && <p style={{ fontSize: 11, color: T.text2, marginTop: 8 }}>Concentrez-vous sur {pireJour || 'vos jours creux'}</p>}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { 
  LayoutDashboard, Bot, BarChart2, Calendar, LogOut, Layers, Sparkles, 
  ChevronLeft, ChevronRight, Plus, X, GripVertical, Menu, HelpCircle,
  Columns, BarChart, CheckSquare, Zap, Target, Clock, Flag, TrendingUp, Circle
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'

const API = 'https://getshift-backend.onrender.com'
const HEURES = Array.from({ length: 12 }, (_, i) => i + 8)

export default function Planification() {
  const [taches, setTaches] = useState([])
  const [planification, setPlanification] = useState([])
  const [priorites, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIA, setLoadingIA] = useState(false)
  const [heuresDispo, setHeuresDispo] = useState(8)
  const [conseil, setConseil] = useState('')
  const [semaineOffset, setSemaineOffset] = useState(0)
  const [draggedTache, setDraggedTache] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [showEstimer, setShowEstimer] = useState(null)
  const [loadingEstime, setLoadingEstime] = useState(false)
  const [vue, setVue] = useState('kanban')
  const [kanbanDrag, setKanbanDrag] = useState(null)
  const [kanbanDragOver, setKanbanDragOver] = useState(null)
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    setLoading(true)
    try {
      const [tachesRes, planRes, prioritesRes] = await Promise.all([
        axios.get(`${API}/taches/${user.id}`),
        axios.get(`${API}/planification/${user.id}`),
        axios.get(`${API}/taches/${user.id}/priorite-intelligente`)
      ])
      setTaches(tachesRes.data)
      setPlanification(planRes.data)
      setPriorities(prioritesRes.data.slice(0, 5))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const planifierAvecIA = async () => {
    setLoadingIA(true)
    try {
      const res = await axios.post(`${API}/ia/planifier`, { user_id: user.id, heures_dispo: heuresDispo })
      setConseil(res.data.conseil)
      await chargerDonnees()
    } catch (err) { console.error(err) }
    setLoadingIA(false)
  }

  const estimerTempsIA = async (tache) => {
    setLoadingEstime(true)
    try {
      const res = await axios.post(`${API}/ia/executer`, {
        prompt: `Estime le temps nécessaire en minutes pour accomplir cette tâche : "${tache.titre}". Réponds UNIQUEMENT avec un nombre entier. Exemple: 45`,
        modele: 'llama-3.3-70b-versatile'
      })
      const minutes = parseInt(res.data.reponse.trim())
      if (!isNaN(minutes)) {
        await axios.put(`${API}/taches/${tache.id}/temps`, { temps_estime: minutes, temps_reel: null })
        await chargerDonnees()
        setShowEstimer(null)
      }
    } catch (err) { console.error(err) }
    setLoadingEstime(false)
  }

  const getJoursSemaine = () => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff + i + semaineOffset * 7)
    return {
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      num: d.getDate(),
      mois: d.toLocaleDateString('fr-FR', { month: 'short' }),
      isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
    }
  })

  const jours = getJoursSemaine()
  const getTachesPourJour = (date) => planification.filter(p => {
    const pDate = p.date_planifiee?.split('T')[0] || p.date_planifiee
    return pDate === date
  })

  const handleDrop = async (date, heure) => {
    if (!draggedTache) return
    try {
      await axios.post(`${API}/planification`, {
        user_id: user.id, tache_id: draggedTache.id, date_planifiee: date,
        heure_debut: `${String(heure).padStart(2,'0')}:00`,
        heure_fin: `${String(heure+1).padStart(2,'0')}:00`,
        charge_minutes: draggedTache.temps_estime || 60, genere_par_ia: false
      })
      await chargerDonnees()
    } catch (err) { console.error(err) }
    setDraggedTache(null); setDragOver(null)
  }

  const colonnesKanban = [
    { id: 'a_faire', label: 'Backlog', color: '#6366f1', bg: '#6366f110', dot: '#6366f1' },
    { id: 'en_cours', label: 'En cours', color: '#f59e0b', bg: '#f59e0b10', dot: '#f59e0b' },
    { id: 'termine', label: 'Terminé', color: '#10b981', bg: '#10b98110', dot: '#10b981' },
  ]

  const getTachesByStatut = (statut) => {
    if (statut === 'termine') return taches.filter(t => t.terminee)
    if (statut === 'en_cours') return taches.filter(t => !t.terminee && t.statut === 'en_cours')
    return taches.filter(t => !t.terminee && t.statut !== 'en_cours')
  }

  const handleKanbanDrop = async (colonneId) => {
    if (!kanbanDrag) return
    if (colonneId === 'termine') await axios.put(`${API}/taches/${kanbanDrag.id}`, { terminee: true })
    else if (colonneId === 'en_cours') await axios.patch(`${API}/taches/${kanbanDrag.id}/statut`, { statut: 'en_cours' })
    else {
      await axios.patch(`${API}/taches/${kanbanDrag.id}/statut`, { statut: 'a_faire' })
      if (kanbanDrag.terminee) await axios.put(`${API}/taches/${kanbanDrag.id}`, { terminee: false })
    }
    await chargerDonnees()
    setKanbanDrag(null); setKanbanDragOver(null)
  }

  const today = new Date()
  const getGanttDays = () => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i - 5)
    return {
      date: d.toISOString().split('T')[0],
      label: d.getDate(),
      isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      mois: d.toLocaleDateString('fr-FR', { month: 'short' })
    }
  })

  const ganttDays = getGanttDays()
  const tachesAvecDeadline = taches.filter(t => t.deadline && !t.terminee)

  const getBarreGantt = (tache) => {
    const deadline = new Date(tache.deadline)
    const created = new Date(tache.created_at || today)
    const start = created < new Date(ganttDays[0].date) ? new Date(ganttDays[0].date) : created
    const startIdx = ganttDays.findIndex(d => d.date >= start.toISOString().split('T')[0])
    const endIdx = ganttDays.findIndex(d => d.date >= deadline.toISOString().split('T')[0])
    if (startIdx === -1 || endIdx === -1) return null
    return { start: Math.max(startIdx, 0), end: Math.min(endIdx, ganttDays.length - 1) }
  }

  const pColor = (p) => p === 'haute' ? '#ef4444' : p === 'moyenne' ? '#f59e0b' : '#10b981'
  const pBg = (p) => p === 'haute' ? '#ef444412' : p === 'moyenne' ? '#f59e0b12' : '#10b98112'

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
    { icon: HelpCircle, label: 'Aide', path: '/help' },
  ]

  const stats = [
    { label: 'Total', value: taches.length, color: '#6366f1', icon: Target },
    { label: 'En cours', value: taches.filter(t => !t.terminee && t.statut === 'en_cours').length, color: '#f59e0b', icon: Zap },
    { label: 'Terminées', value: taches.filter(t => t.terminee).length, color: '#10b981', icon: CheckSquare },
    { label: 'Planifiées', value: planification.length, color: '#8b5cf6', icon: Calendar },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
        <Target size={28} color={T.accent} />
      </motion.div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        .card-hover { transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
        .card-hover:hover { transform: translateY(-2px); }
        @media (max-width: 768px) { main { margin-left: 0 !important; padding: 16px !important; padding-top: 64px !important; } }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 256, background: T.bg2, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', padding: '20px 14px',
        position: 'fixed', top: 0, left: isMobile ? (showSidebar ? 0 : '-100%') : 0,
        transition: 'left 0.3s ease', zIndex: 100, height: '100vh', overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 6px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${T.accent}40` }}>
            <Layers size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '-0.4px' }}>GetShift</span>
        </div>

        {/* Nav */}
        <p style={{ fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 2, marginBottom: 6, padding: '0 6px', opacity: 0.6 }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/planification'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 9, color: active ? T.accent : T.text2, background: active ? `${T.accent}12` : 'transparent', border: active ? `1px solid ${T.accent}20` : '1px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s' }}
              onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }}
              whileHover={{ x: 3 }}>
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: T.accent }} />}
            </motion.button>
          )
        })}

        {/* Divider */}
        <div style={{ height: 1, background: T.border, margin: '18px 0' }} />

        {/* IA Planner Card */}
        <div style={{ background: `linear-gradient(135deg, ${T.accent}12, ${T.accent2}08)`, border: `1px solid ${T.accent}20`, borderRadius: 12, padding: '14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Sparkles size={13} color={T.accent} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 0.3 }}>PLANIFICATION IA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: T.text2 }}>Heures / jour</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg2, borderRadius: 8, padding: '4px 8px', border: `1px solid ${T.border}` }}>
              <motion.button style={{ width: 18, height: 18, borderRadius: 4, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }} onClick={() => setHeuresDispo(Math.max(1, heuresDispo - 1))} whileTap={{ scale: 0.85 }}>−</motion.button>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.accent, minWidth: 18, textAlign: 'center' }}>{heuresDispo}</span>
              <motion.button style={{ width: 18, height: 18, borderRadius: 4, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }} onClick={() => setHeuresDispo(Math.min(16, heuresDispo + 1))} whileTap={{ scale: 0.85 }}>+</motion.button>
            </div>
          </div>
          <motion.button
            style={{ width: '100%', padding: '9px', background: loadingIA ? T.bg3 : T.accent, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: loadingIA ? 'not-allowed' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: !loadingIA ? `0 4px 14px ${T.accent}40` : 'none', transition: 'all 0.2s' }}
            onClick={planifierAvecIA} whileHover={!loadingIA ? { scale: 1.02, y: -1 } : {}} whileTap={{ scale: 0.98 }}>
            <Sparkles size={12} />
            {loadingIA ? 'En cours...' : "Planifier avec l'IA"}
          </motion.button>
        </div>

        {conseil && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '10px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 11, color: T.text2, marginBottom: 12, lineHeight: 1.65 }}>
            <span style={{ color: T.accent, fontWeight: 600 }}>💡 Conseil IA</span><br />{conseil}
          </motion.div>
        )}

        {/* Top priorités */}
        {priorites.length > 0 && (
          <>
            <div style={{ height: 1, background: T.border, margin: '4px 0 14px' }} />
            <p style={{ fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 2, marginBottom: 8, padding: '0 6px', opacity: 0.6 }}>TOP PRIORITÉS</p>
            {priorites.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8, marginBottom: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : `${T.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: i < 2 ? '#fff' : T.accent, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 11, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, lineHeight: 1.4 }}>{t.titre}</span>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(t.priorite), flexShrink: 0 }} />
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 9, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 12 }} onClick={() => { localStorage.removeItem('user'); navigate('/') }} whileHover={{ color: '#ef4444' }}>
            <LogOut size={13} strokeWidth={1.8} />
            Déconnexion
          </motion.button>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 38, height: 38, borderRadius: 9, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={18} />
        </motion.button>
      )}
      {isMobile && showSidebar && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }} onClick={() => setShowSidebar(false)} />}

      {/* ── MAIN ── */}
      <main style={{ marginLeft: isMobile ? 0 : 256, flex: 1, padding: isMobile ? '16px' : 'clamp(16px, 3vw, 32px)', display: 'flex', flexDirection: 'column', minHeight: '100vh', width: isMobile ? '100%' : 'calc(100% - 256px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12, paddingTop: isMobile ? 52 : 0 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 25px)', fontWeight: 800, letterSpacing: '-0.6px', marginBottom: 3 }}>Planification</h1>
            <p style={{ color: T.text2, fontSize: 12, textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {/* Toggle vues */}
          <div style={{ display: 'flex', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 11, padding: 4, gap: 2 }}>
            {[
              { id: 'kanban', label: 'Kanban', Icon: Columns },
              { id: 'liste', label: 'Calendrier', Icon: Calendar },
              { id: 'gantt', label: 'Gantt', Icon: BarChart },
            ].map(({ id, label, Icon }) => (
              <motion.button key={id}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '7px 10px' : '7px 14px', borderRadius: 7, background: vue === id ? T.accent : 'transparent', color: vue === id ? '#fff' : T.text2, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: vue === id ? 700 : 400, transition: 'all 0.15s' }}
                onClick={() => setVue(id)} whileTap={{ scale: 0.95 }}>
                <Icon size={13} />
                {!isMobile && <span>{label}</span>}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div key={i} className="card-hover"
                style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 13, padding: isMobile ? '12px' : '14px 16px', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color={s.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>{s.label}</div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ═══ VUE KANBAN ═══ */}
        {vue === 'kanban' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
              {colonnesKanban.map((col, ci) => {
                const tachesCol = getTachesByStatut(col.id)
                const isDrop = kanbanDragOver === col.id
                return (
                  <motion.div key={col.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1 }}
                    style={{ background: T.bg2, borderRadius: 16, border: `1px solid ${isDrop ? col.color : T.border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: isDrop ? `0 0 0 3px ${col.color}18, 0 8px 32px rgba(0,0,0,0.08)` : '0 2px 8px rgba(0,0,0,0.04)' }}
                    onDragOver={e => { e.preventDefault(); setKanbanDragOver(col.id) }}
                    onDragLeave={() => setKanbanDragOver(null)}
                    onDrop={() => handleKanbanDrop(col.id)}>

                    {/* Colonne header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 8px ${col.color}60` }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{col.label}</span>
                      <div style={{ minWidth: 22, height: 22, borderRadius: 7, background: col.bg, border: `1px solid ${col.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: col.color, padding: '0 7px' }}>{tachesCol.length}</div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 3, borderRadius: 99, background: T.border + '60', marginBottom: 6, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${col.color}, ${col.color}80)` }}
                        initial={{ width: 0 }}
                        animate={{ width: taches.length > 0 ? `${(tachesCol.length / taches.length) * 100}%` : '0%' }}
                        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </div>

                    {/* Drop zone vide */}
                    <AnimatePresence>
                      {isDrop && tachesCol.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ border: `2px dashed ${col.color}50`, borderRadius: 12, padding: '24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col.color, fontSize: 12, gap: 6, fontWeight: 500 }}>
                          <Plus size={13} /> Déposer ici
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Cartes */}
                    <AnimatePresence>
                      {tachesCol.map((tache, i) => (
                        <motion.div key={tache.id}
                          draggable
                          onDragStart={() => setKanbanDrag(tache)}
                          onDragEnd={() => { setKanbanDrag(null); setKanbanDragOver(null) }}
                          style={{ background: T.bg3 || T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '13px 14px', cursor: 'grab', position: 'relative', borderLeft: `3px solid ${pColor(tache.priorite)}`, opacity: kanbanDrag?.id === tache.id ? 0.4 : 1, transition: 'opacity 0.15s' }}
                          initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ y: -3, boxShadow: `0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px ${pColor(tache.priorite)}20` }}>

                          {/* Drag handle */}
                          <div style={{ position: 'absolute', top: 10, right: 10, opacity: 0.2 }}>
                            <GripVertical size={13} color={T.text} />
                          </div>

                          <p style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.45, marginBottom: 10, paddingRight: 18, wordBreak: 'break-word' }}>{tache.titre}</p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: pBg(tache.priorite), color: pColor(tache.priorite), textTransform: 'uppercase', letterSpacing: 0.3 }}>{tache.priorite}</span>
                            {tache.deadline && (
                              <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Flag size={9} strokeWidth={2} />
                                {new Date(tache.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {tache.temps_estime ? (
                              <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={9} strokeWidth={2} />
                                {tache.temps_estime}min
                              </span>
                            ) : (
                              <motion.button
                                style={{ fontSize: 10, color: T.accent, background: `${T.accent}10`, border: `1px solid ${T.accent}20`, padding: '2px 8px', borderRadius: 99, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                                onClick={e => { e.stopPropagation(); setShowEstimer(tache) }}
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                                <Sparkles size={8} /> Estimer
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {tachesCol.length === 0 && !isDrop && (
                      <div style={{ textAlign: 'center', padding: '28px 16px', color: T.text2, fontSize: 12, opacity: 0.35, border: `1px dashed ${T.border}`, borderRadius: 10, lineHeight: 1.6 }}>
                        Aucune tâche<br />dans cette colonne
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ VUE CALENDRIER ═══ */}
        {vue === 'liste' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 14 }}>
            {/* Chips tâches */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 2, marginBottom: 8, opacity: 0.6 }}>GLISSER UNE TÂCHE SUR LE CALENDRIER</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {taches.filter(t => !t.terminee && !planification.find(p => p.tache_id === t.id)).slice(0, 8).map(tache => (
                  <motion.div key={tache.id} draggable
                    onDragStart={() => setDraggedTache(tache)}
                    onDragEnd={() => { setDraggedTache(null); setDragOver(null) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: T.bg2, border: `1px solid ${draggedTache?.id === tache.id ? T.accent : T.border}`, borderRadius: 99, fontSize: 12, cursor: 'grab', color: T.text, transition: 'border-color 0.15s' }}
                    whileHover={{ borderColor: T.accent, scale: 1.02 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(tache.priorite) }} />
                    <span style={{ whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tache.titre}</span>
                    {tache.temps_estime && <span style={{ fontSize: 10, color: T.accent, background: `${T.accent}15`, padding: '1px 6px', borderRadius: 99 }}>{tache.temps_estime}m</span>}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Nav semaine */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <motion.button style={{ width: 32, height: 32, borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSemaineOffset(s => s - 1)} whileHover={{ borderColor: T.accent }}><ChevronLeft size={14} /></motion.button>
              <motion.button style={{ padding: '6px 14px', borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', fontSize: 12, fontWeight: 500 }} onClick={() => setSemaineOffset(0)} whileHover={{ borderColor: T.accent }}>Aujourd'hui</motion.button>
              <motion.button style={{ width: 32, height: 32, borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSemaineOffset(s => s + 1)} whileHover={{ borderColor: T.accent }}><ChevronRight size={14} /></motion.button>
              <span style={{ fontSize: 12, color: T.text2, marginLeft: 4 }}>{jours[0]?.mois} {new Date().getFullYear()}</span>
            </div>

            {/* Calendrier grid */}
            <div style={{ flex: 1, background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: `1px solid ${T.border}`, background: T.bg2, flexShrink: 0 }}>
                <div />
                {jours.map(j => (
                  <div key={j.date} style={{ padding: '10px 6px', textAlign: 'center', borderLeft: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 10, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{j.label}</div>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: j.isToday ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 14, fontWeight: 700, color: j.isToday ? '#fff' : T.text, boxShadow: j.isToday ? `0 4px 12px ${T.accent}50` : 'none' }}>{j.num}</div>
                  </div>
                ))}
              </div>

              {/* Heures */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {HEURES.map(heure => (
                  <div key={heure} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: `1px solid ${T.border}20`, minHeight: 58 }}>
                    <div style={{ padding: '10px 8px 0', fontSize: 10, color: T.text2, textAlign: 'right', fontWeight: 600, opacity: 0.5 }}>{String(heure).padStart(2,'0')}:00</div>
                    {jours.map(jour => {
                      const tachesH = getTachesPourJour(jour.date).filter(p => parseInt(p.heure_debut?.split(':')[0] || 0) === heure)
                      const isDragTarget = dragOver?.date === jour.date && dragOver?.heure === heure
                      return (
                        <div key={jour.date}
                          style={{ borderLeft: `1px solid ${T.border}20`, padding: '3px 4px', minHeight: 58, background: isDragTarget ? `${T.accent}08` : 'transparent', transition: 'background 0.1s', position: 'relative' }}
                          onDragOver={e => { e.preventDefault(); setDragOver({ date: jour.date, heure }) }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={() => handleDrop(jour.date, heure)}>
                          {tachesH.map(p => (
                            <motion.div key={p.id}
                              style={{ padding: '3px 7px', background: `${T.accent}18`, border: `1px solid ${T.accent}25`, borderRadius: 5, fontSize: 10, color: T.accent, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                              {p.titre?.substring(0, 16)}{p.titre?.length > 16 ? '…' : ''}
                            </motion.div>
                          ))}
                          {isDragTarget && (
                            <div style={{ position: 'absolute', inset: 3, border: `2px dashed ${T.accent}50`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={12} color={T.accent} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ VUE GANTT ═══ */}
        {vue === 'gantt' && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {tachesAvecDeadline.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '60px 24px', background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}` }}>
                <BarChart size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Aucune tâche avec deadline</p>
                <p style={{ fontSize: 12, color: T.text2 }}>Ajoutez des deadlines pour visualiser le Gantt</p>
              </motion.div>
            ) : (
              <div style={{ background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: T.bg2, zIndex: 10 }}>
                  <div style={{ width: 210, flexShrink: 0, padding: '11px 16px', borderRight: `1px solid ${T.border}`, fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 2, opacity: 0.6 }}>TÂCHE</div>
                  <div style={{ display: 'flex' }}>
                    {ganttDays.map((day, i) => (
                      <div key={day.date} style={{ width: 36, flexShrink: 0, padding: '7px 0', textAlign: 'center', background: day.isToday ? `${T.accent}10` : day.isWeekend ? (T.bg3 || T.bg + '80') : 'transparent', borderRight: `1px solid ${T.border}12` }}>
                        <div style={{ fontSize: 8, color: T.text2, fontWeight: 600, opacity: 0.5 }}>{i === 0 || day.label === 1 ? day.mois.toUpperCase() : ''}</div>
                        <div style={{ fontSize: 11, fontWeight: day.isToday ? 800 : 400, color: day.isToday ? T.accent : T.text2 }}>{day.label}</div>
                        {day.isToday && <div style={{ width: 3, height: 3, borderRadius: '50%', background: T.accent, margin: '2px auto 0' }} />}
                      </div>
                    ))}
                  </div>
                </div>

                {tachesAvecDeadline.map((tache, i) => {
                  const barre = getBarreGantt(tache)
                  return (
                    <motion.div key={tache.id} style={{ display: 'flex', borderBottom: `1px solid ${T.border}12`, minHeight: 46 }}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                      <div style={{ width: 210, flexShrink: 0, padding: '11px 16px', borderRight: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: pColor(tache.priorite), flexShrink: 0, boxShadow: `0 0 6px ${pColor(tache.priorite)}60` }} />
                        <span style={{ fontSize: 12, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tache.titre}</span>
                      </div>
                      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                        {ganttDays.map((day) => (
                          <div key={day.date} style={{ width: 36, flexShrink: 0, borderRight: `1px solid ${T.border}08`, background: day.isToday ? `${T.accent}05` : day.isWeekend ? `${T.bg3 || T.bg}50` : 'transparent', position: 'relative' }}>
                            {day.isToday && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: `${T.accent}35`, transform: 'translateX(-50%)' }} />}
                          </div>
                        ))}
                        {barre && (
                          <motion.div
                            style={{ position: 'absolute', left: barre.start * 36 + 2, width: Math.max((barre.end - barre.start + 1) * 36 - 4, 36), top: '50%', transform: 'translateY(-50%)', height: 22, background: `linear-gradient(90deg, ${pColor(tache.priorite)}, ${pColor(tache.priorite)}70)`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 9, fontSize: 9, color: '#fff', fontWeight: 700, overflow: 'hidden', boxShadow: `0 2px 10px ${pColor(tache.priorite)}35`, zIndex: 2 }}
                            initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}>
                            {tache.titre.length > 14 ? tache.titre.substring(0, 14) + '…' : tache.titre}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                <div style={{ padding: '10px 16px', display: 'flex', gap: 16, borderTop: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                  {[['Haute', '#ef4444'], ['Moyenne', '#f59e0b'], ['Basse', '#10b981'], ['Aujourd\'hui', T.accent]].map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: label === "Aujourd'hui" ? 2 : 10, height: 10, borderRadius: label === "Aujourd'hui" ? 1 : 3, background: color }} />
                      <span style={{ fontSize: 11, color: T.text2 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL ESTIMER ── */}
      <AnimatePresence>
        {showEstimer && (
          <motion.div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(6px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEstimer(null)}>
            <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 18, padding: '24px', width: 'min(360px, 90%)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }} initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={14} color={T.accent} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Estimation IA</h3>
                </div>
                <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7 }} onClick={() => setShowEstimer(null)} whileHover={{ background: T.border, color: T.text }}><X size={14} /></motion.button>
              </div>
              <p style={{ fontSize: 13, color: T.text2, marginBottom: 20, lineHeight: 1.65, background: T.bg3 || T.bg, padding: '10px 12px', borderRadius: 9, border: `1px solid ${T.border}` }}>
                <strong style={{ color: T.text }}>"{showEstimer.titre}"</strong>
              </p>
              <motion.button
                style={{ width: '100%', padding: '12px', background: loadingEstime ? T.bg3 : T.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: loadingEstime ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: !loadingEstime ? `0 4px 16px ${T.accent}40` : 'none' }}
                onClick={() => estimerTempsIA(showEstimer)} whileHover={!loadingEstime ? { scale: 1.02 } : {}} whileTap={{ scale: 0.98 }}>
                <Sparkles size={14} />
                {loadingEstime ? 'Analyse en cours...' : 'Estimer maintenant'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
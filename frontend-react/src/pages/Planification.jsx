// ══════════════════════════════════════════════════════════════════════
// Planification.jsx — Main orchestrator (thin shell, delegates to sub-components)
// Architecture: state → hooks → sub-components → utils
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile from '../components/BottomNavMobile'
import {
  LayoutDashboard, Bot, BarChart2, Calendar, CalendarDays, LogOut, Layers, Sparkles,
  Menu, HelpCircle, Columns, BarChart, CheckSquare, Check, Zap, Target, X,
  TrendingUp, AlertTriangle, Brain, PanelLeftClose, PanelLeftOpen,
  ChevronRight, ChevronLeft, ChevronUp, Settings, User, Star, Flame, Flag, Users,
  Plus, Trash2, Copy, Link2, Crown, Share2, UserPlus, MoreHorizontal, MessageCircle
} from 'lucide-react'

import CalendarGrid from './CalendarGrid'
import KanbanColumn from './KanbanColumn'
import {
  calcPriorityScore, binPackTasks, getGanttDays,
  minsToTime, timeToMins, pColor, pBg,
  getWeekDays, getMonthDays
} from './calendarUtils'

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
// KANBAN CONFIG
// ══════════════════════════════════════════════════════════════════════
const COLONNES = [
  { id: 'a_faire', label: 'Backlog', color: '#6366f1', bg: '#6366f110', dot: '#6366f1' },
  { id: 'en_cours', label: 'En cours', color: '#f59e0b', bg: '#f59e0b10', dot: '#f59e0b' },
  { id: 'termine', label: 'Terminé', color: '#10b981', bg: '#10b98110', dot: '#10b981' },
]

// ══════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════
export default function Planification() {
  const { T } = useTheme()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))

  // Sidebar toggle persistant (comme Dashboard)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('planification_sidebar_open') !== 'false' }
    catch { return true }
  })

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    localStorage.setItem('planification_sidebar_open', String(next))
  }

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Core state ─────────────────────────────────────────────────────
  const [taches, setTaches] = useState([])
  const [planification, setPlanification] = useState([])
  const [priorites, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIA, setLoadingIA] = useState(false)
  const [conseil, setConseil] = useState('')
  const [heuresDispo, setHeuresDispo] = useState(8)

  // ── UI state ───────────────────────────────────────────────────────
  // Sur mobile, la vue jour est par défaut (semaine illisible sur 7 colonnes)
  const [vue, setVue] = useState(() => isMobile ? 'jour' : 'kanban')
  const [showEstimer, setShowEstimer] = useState(null)
  const [loadingEstime, setLoadingEstime] = useState(false)
  const [semaineOffset, setSemaineOffset] = useState(0)
  const [smartResult, setSmartResult] = useState(null)   // bin-packing preview

  // ── Kanban drag state ──────────────────────────────────────────────
  const [kanbanDrag, setKanbanDrag] = useState(null)
  const [kanbanDragOver, setKanbanDragOver] = useState(null)
  const [kanbanActiveCol, setKanbanActiveCol] = useState('a_faire')

  // Filtres (inutilisés dans planification mais présents pour la sidebar identique)
  const [filtre, setFiltre] = useState('toutes')
  const bloquees = 0

  // Mock user data for profile
  const userData = { nom: user?.nom || 'Utilisateur', email: user?.email || 'user@example.com' }
  const points = 1250
  const niveau = 3
  const niveauActuel = { label: 'Productif' }
  const pctNiveau = 42
  const streak = 5

  const SIDEBAR_W = 248
  const sidebarLeft = isMobile
    ? (sidebarOpen ? 0 : '-100%')
    : (sidebarOpen ? 0 : -SIDEBAR_W)
  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerDonnees()
  }, [])

  const chargerDonnees = useCallback(async () => {
    setLoading(true)
    try {
      // Tâches + planification en parallèle → affichage immédiat
      const [t, p] = await Promise.all([
        axios.get(`${API}/taches/${user.id}`),
        axios.get(`${API}/planification/${user.id}`),
      ])
      setTaches(t.data.map(task => ({ ...task, _score: calcPriorityScore(task) })))
      setPlanification(normalizePlan(p.data))
      setLoading(false)

      // Priorités chargées en arrière-plan — ne bloque pas l'affichage
      axios.get(`${API}/taches/${user.id}/priorite-intelligente`)
        .then(pr => setPriorities(pr.data.slice(0, 5)))
        .catch(() => {})
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }, [user?.id])

  function normalizePlan(entries) {
    return entries.map(e => ({
      ...e,
      startMins: e.startMins ?? (() => { const t=(e.heure_debut||'08:00').split(':'); return parseInt(t[0]||8)*60+parseInt(t[1]||0) })(),
      endMins: e.endMins ?? timeToMins(e.heure_fin),
    }))
  }

  // ── Priority-scored + sorted tasks ────────────────────────────────
  const sortedTaches = useMemo(
    () => [...taches].sort((a, b) => (b._score ?? 0) - (a._score ?? 0)),
    [taches]
  )

  // ── Kanban grouping ────────────────────────────────────────────────
  const getTachesByStatut = useCallback((statut) => {
    if (statut === 'termine') return sortedTaches.filter(t => t.terminee)
    if (statut === 'en_cours') return sortedTaches.filter(t => !t.terminee && t.statut === 'en_cours')
    return sortedTaches.filter(t => !t.terminee && t.statut !== 'en_cours')
  }, [sortedTaches])

  // ── Kanban drop → optimistic update ───────────────────────────────
  const handleKanbanDrop = useCallback(async (colonneId) => {
    if (!kanbanDrag) return
    const prev = taches.slice()

    // Optimistic update
    setTaches(cur => cur.map(t => {
      if (t.id !== kanbanDrag.id) return t
      if (colonneId === 'termine') return { ...t, terminee: true }
      if (colonneId === 'en_cours') return { ...t, statut: 'en_cours', terminee: false }
      return { ...t, statut: 'a_faire', terminee: false }
    }))
    setKanbanDrag(null)
    setKanbanDragOver(null)

    try {
      if (colonneId === 'termine')
        await axios.put(`${API}/taches/${kanbanDrag.id}`, { terminee: true })
      else if (colonneId === 'en_cours')
        await axios.patch(`${API}/taches/${kanbanDrag.id}/statut`, { statut: 'en_cours' })
      else {
        await axios.patch(`${API}/taches/${kanbanDrag.id}/statut`, { statut: 'a_faire' })
        if (kanbanDrag.terminee)
          await axios.put(`${API}/taches/${kanbanDrag.id}`, { terminee: false })
      }
    } catch (err) {
      console.error('Rollback kanban:', err)
      setTaches(prev)  // rollback
    }
  }, [kanbanDrag, taches])

  // ── Calendar drop → new planification entry ────────────────────────
  const handleCalendarDrop = useCallback(async ({ date, startMins, endMins, tacheId }) => {
    const tempId = Date.now()
    const task = taches.find(t => t.id === tacheId)
    const entry = {
      id: tempId, tache_id: tacheId, titre: task?.titre || '',
      priorite: task?.priorite || 'moyenne',
      date_planifiee: date, startMins, endMins,
      heure_debut: minsToTime(startMins), heure_fin: minsToTime(endMins),
    }

    // Optimistic: prevent duplicate (same task, same day)
    const already = planification.some(p =>
      p.tache_id === tacheId &&
      (p.date_planifiee?.split('T')[0] || p.date_planifiee) === date
    )
    if (already) return

    setPlanification(cur => [...cur, entry])

    try {
      const res = await axios.post(`${API}/planification`, {
        user_id: user.id,
        tache_id: tacheId,
        date_planifiee: date,
        heure_debut: minsToTime(startMins),
        heure_fin: minsToTime(endMins),
        charge_minutes: endMins - startMins,
        genere_par_ia: false,
      })
      // Replace tempId with real id
      setPlanification(cur => cur.map(e => e.id === tempId ? { ...e, id: res.data.id } : e))
    } catch (err) {
      console.error('Rollback drop:', err)
      setPlanification(cur => cur.filter(e => e.id !== tempId))
    }
  }, [taches, planification, user?.id])

  // ── Calendar move (existing block) ────────────────────────────────
  const handleCalendarMove = useCallback(async ({ entryId, date, startMins, endMins }) => {
    const prev = planification.slice()
    setPlanification(cur => cur.map(e =>
      e.id === entryId
        ? { ...e, date_planifiee: date, startMins, endMins, heure_debut: minsToTime(startMins), heure_fin: minsToTime(endMins) }
        : e
    ))
    try {
      await axios.patch(`${API}/planification/${entryId}`, {
        date_planifiee: date,
        heure_debut: minsToTime(startMins),
        heure_fin: minsToTime(endMins),
        charge_minutes: endMins - startMins,
      })
    } catch (err) {
      console.error('Rollback move:', err)
      setPlanification(prev)
    }
  }, [planification, user?.id])

  // ── Resize (optimistic, no API — update endMins only) ─────────────
  const handleResize = useCallback(({ entryId, newEndMins }) => {
    setPlanification(cur => cur.map(e =>
      e.id === entryId ? { ...e, endMins: newEndMins, heure_fin: minsToTime(newEndMins) } : e
    ))
  }, [])

  const handleResizeEnd = useCallback(async ({ entryId, newEndMins }) => {
    const entry = planification.find(e => e.id === entryId)
    if (!entry) return
    try {
      await axios.patch(`${API}/planification/${entryId}`, {
        heure_fin: minsToTime(newEndMins),
        charge_minutes: newEndMins - (entry.startMins ?? 0),
      })
    } catch (err) { console.error('Resize persist:', err) }
  }, [planification])

  // ── Smart AI Scheduling — PROPOSITIONS UNIQUEMENT ──────────────────
  // L'IA propose, l'user accepte/refuse. Pas de plannification automatique.
  const [propositionsRejetees, setPropositionsRejetees] = useState(new Set())

  const planifierAvecIA = useCallback(async () => {
    setLoadingIA(true)
    setPropositionsRejetees(new Set())
    try {
      const jours = getWeekDays(semaineOffset)
      const weekDates = jours.map(j => j.date)

      const occupied = planification.map(p => ({
        date: p.date_planifiee?.split('T')[0] || p.date_planifiee,
        startMins: p.startMins,
        endMins: p.endMins,
      }))

      const toSchedule = sortedTaches.filter(t => !t.terminee)

      // Filtrer : ne pas proposer de tâches déjà planifiées
      const dejaPlanifiees = new Set(planification.map(p => p.tache_id))
      const candidats = toSchedule.filter(t => !dejaPlanifiees.has(t.id))

      const scheduled = binPackTasks(candidats, weekDates, occupied, heuresDispo)
      setSmartResult(scheduled)

      // Conseil IA en parallèle (non bloquant)
      axios.post(`${API}/ia/planifier`, { user_id: user.id, heures_dispo: heuresDispo })
        .then(res => setConseil(res.data.conseil || ''))
        .catch(() => {})
    } catch (err) { console.error(err) }
    setLoadingIA(false)
  }, [sortedTaches, planification, semaineOffset, heuresDispo, user?.id])

  // Accepter une proposition
  const accepterProposition = useCallback(async (proposition, index) => {
    const entry = {
      id: Date.now() + Math.random(),
      tache_id: proposition.task.id,
      titre: proposition.task.titre,
      priorite: proposition.task.priorite,
      date_planifiee: proposition.date,
      startMins: proposition.startMins,
      endMins: proposition.endMins,
      heure_debut: minsToTime(proposition.startMins),
      heure_fin: minsToTime(proposition.endMins),
    }
    setPlanification(cur => [...cur, entry])
    // Marquer comme acceptée → retirer de la liste
    setSmartResult(cur => cur.filter((_, i) => i !== index))
    try {
      const res = await axios.post(`${API}/planification`, {
        user_id: user.id,
        tache_id: proposition.task.id,
        date_planifiee: proposition.date,
        heure_debut: minsToTime(proposition.startMins),
        heure_fin: minsToTime(proposition.endMins),
        charge_minutes: proposition.endMins - proposition.startMins,
        genere_par_ia: true,
      })
      // Remplacer le tempId par le vrai id
      if (res.data?.id) {
        setPlanification(cur => cur.map(e => e.id === entry.id ? { ...e, id: res.data.id } : e))
      }
    } catch { /* rollback silencieux */ }
  }, [user?.id])

  // Refuser une proposition
  const refuserProposition = useCallback((index) => {
    setSmartResult(cur => cur.filter((_, i) => i !== index))
  }, [])

  // Tout accepter d'un coup
  const accepterToutesPropositions = useCallback(async () => {
    if (!smartResult || smartResult.length === 0) return
    const propositions = [...smartResult]
    setSmartResult([])
    for (const p of propositions) {
      try {
        const entry = {
          id: Date.now() + Math.random(),
          tache_id: p.task.id,
          titre: p.task.titre,
          priorite: p.task.priorite,
          date_planifiee: p.date,
          startMins: p.startMins,
          endMins: p.endMins,
          heure_debut: minsToTime(p.startMins),
          heure_fin: minsToTime(p.endMins),
        }
        setPlanification(cur => [...cur, entry])
        const res = await axios.post(`${API}/planification`, {
          user_id: user.id,
          tache_id: p.task.id,
          date_planifiee: p.date,
          heure_debut: minsToTime(p.startMins),
          heure_fin: minsToTime(p.endMins),
          charge_minutes: p.endMins - p.startMins,
          genere_par_ia: true,
        })
        if (res.data?.id) {
          setPlanification(cur => cur.map(e => e.id === entry.id ? { ...e, id: res.data.id } : e))
        }
      } catch {}
    }
  }, [smartResult, user?.id])

  const refuserToutesPropositions = useCallback(() => setSmartResult([]), [])

  // ── Estimate time with IA ──────────────────────────────────────────
  const estimerTempsIA = useCallback(async (task) => {
    setLoadingEstime(true)
    try {
      const res = await axios.post(`${API}/ia/executer`, {
        prompt: `Estime le temps nécessaire en minutes pour accomplir cette tâche : "${task.titre}". Réponds UNIQUEMENT avec un nombre entier. Exemple: 45`,
        modele: 'llama-3.3-70b-versatile',
      })
      const minutes = parseInt(res.data.reponse.trim())
      if (!isNaN(minutes)) {
        await axios.put(`${API}/taches/${task.id}/temps`, { temps_estime: minutes, temps_reel: null })
        setTaches(cur => cur.map(t => t.id === task.id ? { ...t, temps_estime: minutes } : t))
        setShowEstimer(null)
      }
    } catch (err) { console.error(err) }
    setLoadingEstime(false)
  }, [])

  // ── Gantt ──────────────────────────────────────────────────────────
  const ganttDays = useMemo(() => getGanttDays(30, -5), [])
  const tachesAvecDeadline = useMemo(
    () => sortedTaches.filter(t => t.deadline && !t.terminee),
    [sortedTaches]
  )

  const getBarreGantt = useCallback((task) => {
    const deadline = new Date(task.deadline)
    const created = new Date(task.created_at || new Date())
    const start = created < new Date(ganttDays[0].date) ? new Date(ganttDays[0].date) : created
    const si = ganttDays.findIndex(d => d.date >= start.toISOString().split('T')[0])
    const ei = ganttDays.findIndex(d => d.date >= deadline.toISOString().split('T')[0])
    if (si === -1 || ei === -1) return null
    return { start: Math.max(si, 0), end: Math.min(ei, ganttDays.length - 1) }
  }, [ganttDays])

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ([
    { label: 'Total', value: taches.length, color: '#6366f1', Icon: Target },
    { label: 'En cours', value: taches.filter(t => !t.terminee && t.statut === 'en_cours').length, color: '#f59e0b', Icon: Zap },
    { label: 'Terminées', value: taches.filter(t => t.terminee).length, color: '#10b981', Icon: CheckSquare },
    { label: 'Planifiées', value: planification.length, color: '#8b5cf6', Icon: Calendar },
  ]), [taches, planification])

  // ── Bloc "Aujourd'hui" — créneaux planifiés du jour + actions rapides ──
  const aujourdHui = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return planification
      .filter(p => (p.date_planifiee?.split('T')[0] || p.date_planifiee) === today)
      .map(p => {
        const tache = taches.find(t => t.id === p.tache_id)
        return { ...p, tache }
      })
      .filter(p => p.tache && !p.tache.terminee)
      .sort((a, b) => (a.startMins || 0) - (b.startMins || 0))
  }, [planification, taches])

  const demarrerTache = useCallback(async (tacheId) => {
    const prev = taches.slice()
    setTaches(cur => cur.map(t => t.id === tacheId ? { ...t, statut: 'en_cours' } : t))
    try { await axios.patch(`${API}/taches/${tacheId}/statut`, { statut: 'en_cours' }) }
    catch { setTaches(prev) }
  }, [taches])

  const terminerTache = useCallback(async (tacheId) => {
    const prev = taches.slice()
    setTaches(cur => cur.map(t => t.id === tacheId ? { ...t, terminee: true } : t))
    try { await axios.put(`${API}/taches/${tacheId}`, { terminee: true }) }
    catch { setTaches(prev) }
  }, [taches])

  // ── Month data ─────────────────────────────────────────────────────
  const { days: monthDays, monthLabel } = useMemo(
    () => getMonthDays(semaineOffset),
    [semaineOffset]
  )

  // ══════════════════════════════════════════════════════════════════
  // RENDER — pas de spinner bloquant, page s'affiche immédiatement
  // ══════════════════════════════════════════════════════════════════
  const isCalView = vue === 'jour' || vue === 'calendrier'

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 0 !important; }
        }
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
          const active = item.path === '/planification'
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

        {/* IA Planner (contenu original de la sidebar de planification) */}
        <div style={{ background: `linear-gradient(135deg, ${T.accent}12, ${T.accent2 || '#a855f7'}08)`, border: `1px solid ${T.accent}20`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Brain size={13} color={T.accent} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 0.3 }}>PLANIFICATION IA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: T.text2 }}>Heures / jour</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg2, borderRadius: 8, padding: '4px 8px', border: `1px solid ${T.border}` }}>
              <motion.button style={{ background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} onClick={() => setHeuresDispo(h => Math.max(1, h - 1))} whileTap={{ scale: 0.8 }}>−</motion.button>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.accent, minWidth: 18, textAlign: 'center' }}>{heuresDispo}</span>
              <motion.button style={{ background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} onClick={() => setHeuresDispo(h => Math.min(16, h + 1))} whileTap={{ scale: 0.8 }}>+</motion.button>
            </div>
          </div>

          {smartResult && smartResult.length > 0 && (
            <div style={{ marginBottom: 10, padding: '8px 10px', background: `${T.accent}08`, border: `1px solid ${T.accent}20`, borderRadius: 8, fontSize: 11, color: T.text2 }}>
              <span style={{ color: T.accent, fontWeight: 700 }}>{smartResult.length}</span> proposition{smartResult.length > 1 ? 's' : ''} en attente
            </div>
          )}

          <motion.button
            style={{ width: '100%', padding: '9px', background: loadingIA ? T.bg3 : T.accent, color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: loadingIA ? 'not-allowed' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: !loadingIA ? `0 4px 14px ${T.accent}40` : 'none', transition: 'all 0.2s' }}
            onClick={planifierAvecIA}
            whileHover={!loadingIA ? { scale: 1.02, y: -1 } : {}}
            whileTap={{ scale: 0.98 }}>
            <Sparkles size={12} />
            {loadingIA ? 'Analyse...' : 'Proposer un planning'}
          </motion.button>
        </div>

        {/* Conseil */}
        {conseil && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '10px 12px', background: T.bg3 || T.bg, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 11, color: T.text2, marginBottom: 12, lineHeight: 1.65 }}>
            <span style={{ color: T.accent, fontWeight: 600 }}>Conseil IA</span><br />{conseil}
          </motion.div>
        )}

        {/* Top priorités */}
        {priorites.length > 0 && (
          <>
            <div style={{ height: 1, background: T.border, margin: '4px 0 14px' }} />
            <p style={{ fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 2, marginBottom: 8, padding: '0 6px', opacity: 0.6 }}>TOP PRIORITÉS</p>
            {priorites.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8, marginBottom: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: i < 2 ? pColor(t.priorite) : `${T.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: i < 2 ? '#fff' : T.accent, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 11, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.4 }}>{t.titre}</span>
                {t._score && <span style={{ fontSize: 9, color: T.accent, opacity: 0.5 }}>#{Math.round(t._score)}</span>}
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(t.priorite), flexShrink: 0 }} />
              </div>
            ))}
          </>
        )}

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

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <motion.main
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

        {/* ═══ STATIC TOP — stats + header toujours visibles, ne scroll jamais ═══ */}
        <div style={{
          flexShrink: 0,
          padding: isMobile ? '10px 14px 8px' : 'clamp(16px,3vw,28px) clamp(16px,3vw,32px) 10px',
          paddingTop: isMobile ? 54 : 'clamp(20px,3vh,32px)',
        }}>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? 8 : 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <div style={{ width: 8, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${T.accent}, ${T.accent2 || T.accent})`, flexShrink: 0 }} />
                <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, letterSpacing: '-0.7px', margin: 0, background: `linear-gradient(135deg, ${T.text}, ${T.text2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Planification</h1>
              </div>
              <p style={{ color: T.text2, fontSize: 12, textTransform: 'capitalize', paddingLeft: 18, margin: 0 }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          {/* View switcher — scrollable, always labeled */}
          <div style={{
            display: 'flex',
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: 4,
            gap: 3,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {[
              { id: 'liste', label: 'Liste', Icon: CheckSquare },
              { id: 'kanban', label: 'Kanban', Icon: Columns },
              { id: 'jour', label: 'Jour', Icon: Target },
              { id: 'calendrier', label: 'Semaine', Icon: Calendar },
              { id: 'mois', label: 'Mois', Icon: CalendarDays },
              { id: 'gantt', label: 'Gantt', Icon: BarChart },
            ].map(({ id, label, Icon }) => (
              <motion.button key={id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: vue === id
                    ? `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`
                    : 'transparent',
                  color: vue === id ? '#fff' : T.text2,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: vue === id ? 700 : 500,
                  boxShadow: vue === id ? `0 4px 12px ${T.accent}40` : 'none',
                  transition: 'all 0.18s',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => { setVue(id); setSemaineOffset(0) }}
                whileTap={{ scale: 0.95 }}>
                <Icon size={13} strokeWidth={vue === id ? 2.5 : 1.8} />
                <span>{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 6 : 12, marginBottom: 0 }}>
          {stats.map((s, i) => {
            const Icon = s.Icon
            return (
              <motion.div key={i}
                style={{
                  background: T.bg2,
                  border: `1px solid ${T.border}`,
                  borderRadius: isMobile ? 12 : 14,
                  padding: isMobile ? '10px 8px' : '14px 16px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'center' : 'center',
                  gap: isMobile ? 4 : 14,
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: isMobile ? 'center' : 'left',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -2, boxShadow: `0 6px 20px ${s.color}18` }}>
                {/* Colored top accent strip on mobile, left strip on desktop */}
                <div style={{
                  position: 'absolute',
                  ...(isMobile
                    ? { top: 0, left: 0, right: 0, height: 3 }
                    : { left: 0, top: 0, bottom: 0, width: 3 }),
                  background: `linear-gradient(${isMobile ? '90deg' : '180deg'}, ${s.color}, ${s.color}60)`,
                  borderRadius: isMobile ? '12px 12px 0 0' : '14px 0 0 14px',
                }} />
                {/* Icon — hidden on mobile to save space */}
                {!isMobile && (
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `linear-gradient(135deg, ${s.color}22, ${s.color}10)`,
                    border: `1px solid ${s.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} color={s.color} strokeWidth={2.2} />
                  </div>
                )}
                {isMobile && <Icon size={14} color={s.color} strokeWidth={2} />}
                <div>
                  <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: T.text, letterSpacing: '-0.6px', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: isMobile ? 9 : 11, color: T.text2, marginTop: 2, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
        </div>
        {/* END STATIC TOP */}

        {/* ═══ CONTENT AREA — liste/kanban/gantt scrollable, calendrier fixe ═══ */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: isCalView ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile
            ? `0 14px ${isCalView ? '8px' : '72px'}`
            : `0 clamp(16px,3vw,32px) clamp(10px,2vw,24px)`,
        }}>

        {/* ─── Bloc "Aujourd'hui" — masqué en vue calendrier (visible sur la grille) ─── */}
        {!isCalView && aujourdHui.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: `linear-gradient(135deg, ${T.accent}10, ${T.accent2 || '#a855f7'}08)`, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: isMobile ? 14 : '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={15} color={T.accent} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.2px' }}>Aujourd'hui</h2>
                <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 1 }}>{aujourdHui.length} créneau{aujourdHui.length > 1 ? 'x' : ''} planifié{aujourdHui.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aujourdHui.slice(0, 6).map((entry, i) => {
                const enCours = entry.tache.statut === 'en_cours'
                return (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '8px 10px' : '9px 12px', background: T.bg2, borderRadius: 10, border: `1px solid ${enCours ? '#f59e0b40' : T.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, fontFamily: 'monospace', minWidth: 76, opacity: 0.9 }}>
                      {entry.heure_debut?.slice(0,5) || minsToTime(entry.startMins).slice(0,5)} → {entry.heure_fin?.slice(0,5) || minsToTime(entry.endMins).slice(0,5)}
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(entry.tache.priorite), flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.tache.titre}</span>
                    {enCours && <span style={{ fontSize: 9, color: '#f59e0b', background: '#f59e0b18', padding: '2px 7px', borderRadius: 99, fontWeight: 700, letterSpacing: 0.5 }}>EN COURS</span>}
                    {!enCours && (
                      <motion.button onClick={() => demarrerTache(entry.tache.id)} whileTap={{ scale: 0.92 }}
                        title="Commencer"
                        style={{ width: 26, height: 26, borderRadius: 7, background: T.bg3, border: `1px solid ${T.border}`, color: T.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={12} />
                      </motion.button>
                    )}
                    <motion.button onClick={() => terminerTache(entry.tache.id)} whileTap={{ scale: 0.92 }}
                      title="Marquer terminée"
                      style={{ width: 26, height: 26, borderRadius: 7, background: T.bg3, border: `1px solid ${T.border}`, color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckSquare size={12} />
                    </motion.button>
                  </motion.div>
                )
              })}
              {aujourdHui.length > 6 && (
                <p style={{ fontSize: 11, color: T.text2, textAlign: 'center', marginTop: 4, opacity: 0.7 }}>
                  + {aujourdHui.length - 6} autre{aujourdHui.length - 6 > 1 ? 's' : ''} créneau{aujourdHui.length - 6 > 1 ? 'x' : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Propositions IA — masquées en vue calendrier ─── */}
        <AnimatePresence>
          {!isCalView && smartResult && smartResult.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ background: `linear-gradient(135deg, ${T.accent}12, #a855f708)`, border: `1px dashed ${T.accent}40`, borderRadius: 14, padding: isMobile ? 14 : '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain size={15} color={T.accent} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 800, color: T.text, margin: 0 }}>L'IA te propose un planning</h2>
                      <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 1 }}>Accepte ou refuse créneau par créneau — rien n'est appliqué sans ton accord.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <motion.button onClick={refuserToutesPropositions} whileTap={{ scale: 0.95 }}
                      style={{ padding: '6px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Tout refuser
                    </motion.button>
                    <motion.button onClick={accepterToutesPropositions} whileTap={{ scale: 0.95 }}
                      style={{ padding: '6px 12px', background: T.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: `0 3px 10px ${T.accent}35` }}>
                      Tout accepter
                    </motion.button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {smartResult.slice(0, 8).map((p, i) => {
                    const dateLabel = new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <motion.div key={`${p.task.id}-${p.date}-${p.startMins}-${i}`}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.03 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '8px 10px' : '9px 12px', background: T.bg2, borderRadius: 10, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, fontFamily: 'monospace', minWidth: 92, textTransform: 'capitalize' }}>
                          {dateLabel}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: T.text2, fontFamily: 'monospace', minWidth: 78 }}>
                          {minsToTime(p.startMins).slice(0,5)} → {minsToTime(p.endMins).slice(0,5)}
                        </div>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(p.task.priorite), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.task.titre}{p.totalParts > 1 ? ` (${p.part}/${p.totalParts})` : ''}
                        </span>
                        <motion.button onClick={() => refuserProposition(i)} whileTap={{ scale: 0.92 }}
                          title="Refuser"
                          style={{ width: 26, height: 26, borderRadius: 7, background: T.bg3, border: `1px solid ${T.border}`, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={12} />
                        </motion.button>
                        <motion.button onClick={() => accepterProposition(p, i)} whileTap={{ scale: 0.92 }}
                          title="Accepter"
                          style={{ width: 26, height: 26, borderRadius: 7, background: `${T.accent}20`, border: `1px solid ${T.accent}40`, color: T.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckSquare size={12} />
                        </motion.button>
                      </motion.div>
                    )
                  })}
                  {smartResult.length > 8 && (
                    <p style={{ fontSize: 11, color: T.text2, textAlign: 'center', marginTop: 4, opacity: 0.7 }}>
                      + {smartResult.length - 8} autre{smartResult.length - 8 > 1 ? 's' : ''} proposition{smartResult.length - 8 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ VIEWS ═════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">

          {/* LISTE — vue minimaliste, pour qui ne veut ni kanban ni calendrier */}
          {vue === 'liste' && (
            <motion.div key="liste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                const today = new Date().toISOString().split('T')[0]
                const dans7j = new Date(); dans7j.setDate(dans7j.getDate() + 7)
                const dans7jStr = dans7j.toISOString().split('T')[0]
                const open = sortedTaches.filter(t => !t.terminee)
                const byDeadline = (t) => t.deadline?.split('T')[0]
                const aujourdhuiL = open.filter(t => byDeadline(t) === today)
                const cetteSemaine = open.filter(t => byDeadline(t) && byDeadline(t) > today && byDeadline(t) <= dans7jStr)
                const sansDeadline = open.filter(t => !t.deadline)
                const plusTard = open.filter(t => byDeadline(t) && byDeadline(t) > dans7jStr)
                const termineesRecentes = sortedTaches.filter(t => t.terminee).slice(0, 5)
                const sections = [
                  { titre: "Aujourd'hui", items: aujourdhuiL, color: '#ef4444', emptyMsg: null },
                  { titre: 'Cette semaine', items: cetteSemaine, color: '#f59e0b', emptyMsg: null },
                  { titre: 'Plus tard', items: plusTard, color: '#6366f1', emptyMsg: null },
                  { titre: 'Sans deadline', items: sansDeadline, color: T.text2, emptyMsg: null },
                  { titre: 'Terminées récemment', items: termineesRecentes, color: '#10b981', emptyMsg: null, dim: true },
                ].filter(s => s.items.length > 0)

                if (open.length === 0 && termineesRecentes.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px 24px', background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}` }}>
                      <CheckSquare size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                      <p style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Aucune tâche pour le moment</p>
                      <p style={{ fontSize: 12, color: T.text2 }}>Crée ta première tâche depuis le Dashboard</p>
                    </div>
                  )
                }

                return sections.map(sec => (
                  <div key={sec.titre}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sec.color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 1.5, textTransform: 'uppercase' }}>{sec.titre}</span>
                      <span style={{ fontSize: 10, color: T.text2, opacity: 0.6 }}>{sec.items.length}</span>
                    </div>
                    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      {sec.items.map((t, i) => (
                        <motion.div key={t.id}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: i < sec.items.length - 1 ? `1px solid ${T.border}` : 'none', opacity: sec.dim ? 0.55 : 1 }}>
                          <motion.button onClick={() => t.terminee ? null : terminerTache(t.id)} whileTap={{ scale: 0.85 }}
                            disabled={t.terminee}
                            style={{ width: 22, height: 22, borderRadius: 6, background: t.terminee ? '#10b981' : 'transparent', border: `1.5px solid ${t.terminee ? '#10b981' : T.border}`, cursor: t.terminee ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {t.terminee && <Check size={12} color="#fff" strokeWidth={3} />}
                          </motion.button>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(t.priorite), flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.terminee ? 'line-through' : 'none' }}>{t.titre}</span>
                          {t.deadline && !t.terminee && (
                            <span style={{ fontSize: 10, color: T.text2, background: T.bg3, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                              {new Date(t.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {t.temps_estime && !t.terminee && (
                            <span style={{ fontSize: 10, color: T.accent, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.temps_estime}m</span>
                          )}
                          {!t.terminee && t.statut !== 'en_cours' && (
                            <motion.button onClick={() => demarrerTache(t.id)} whileTap={{ scale: 0.9 }}
                              title="Commencer"
                              style={{ width: 24, height: 24, borderRadius: 6, background: T.bg3, border: `1px solid ${T.border}`, color: T.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Zap size={11} />
                            </motion.button>
                          )}
                          {t.statut === 'en_cours' && !t.terminee && (
                            <span style={{ fontSize: 9, color: '#f59e0b', background: '#f59e0b18', padding: '2px 7px', borderRadius: 99, fontWeight: 700, letterSpacing: 0.5 }}>EN COURS</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </motion.div>
          )}

          {/* KANBAN */}
          {vue === 'kanban' && (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

              {/* Mobile: onglets de colonnes */}
              {isMobile && (
                <div style={{ display: 'flex', gap: 6, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, flexShrink: 0 }}>
                  {COLONNES.map(col => {
                    const count = getTachesByStatut(col.id).length
                    const active = kanbanActiveCol === col.id
                    return (
                      <motion.button key={col.id}
                        onClick={() => setKanbanActiveCol(col.id)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '9px 8px',
                          borderRadius: 8,
                          background: active ? `linear-gradient(135deg, ${col.color}, ${col.color}cc)` : 'transparent',
                          color: active ? '#fff' : T.text2,
                          border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: active ? 700 : 500,
                          transition: 'all 0.18s',
                        }}
                        whileTap={{ scale: 0.96 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : col.color }} />
                        {col.label}
                        <span style={{ fontSize: 10, background: active ? 'rgba(255,255,255,0.2)' : `${col.color}20`, color: active ? '#fff' : col.color, padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                          {count}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              )}

              {/* Colonnes */}
              <div style={{
                flex: 1, minHeight: 0,
                display: isMobile ? 'block' : 'grid',
                gridTemplateColumns: isMobile ? undefined : 'repeat(3, 1fr)',
                gap: 12,
                overflowY: 'auto',
              }}>
                {COLONNES.filter(col => !isMobile || col.id === kanbanActiveCol).map(col => (
                  <KanbanColumn
                    key={col.id}
                    col={col}
                    tasks={getTachesByStatut(col.id)}
                    allCount={taches.length}
                    dragging={kanbanDrag}
                    dragOver={kanbanDragOver}
                    T={T}
                    onDragStart={setKanbanDrag}
                    onDragEnd={() => { setKanbanDrag(null); setKanbanDragOver(null) }}
                    onDragOver={setKanbanDragOver}
                    onDragLeave={() => setKanbanDragOver(null)}
                    onDrop={handleKanbanDrop}
                    onEstimate={setShowEstimer}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* JOUR — calendrier sur une seule journée */}
          {vue === 'jour' && (
            <motion.div key="jour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <CalendarGrid
                planification={planification}
                taches={taches}
                T={T}
                semaineOffset={semaineOffset}
                onOffsetChange={(delta, reset) => setSemaineOffset(reset ? 0 : s => s + delta)}
                onDrop={handleCalendarDrop}
                onMove={handleCalendarMove}
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
                daysToShow={1}
                heuresDispo={heuresDispo}
              />
            </motion.div>
          )}

          {/* CALENDRIER */}
          {vue === 'calendrier' && (
            <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <CalendarGrid
                planification={planification}
                taches={taches}
                T={T}
                semaineOffset={semaineOffset}
                onOffsetChange={(delta, reset) => setSemaineOffset(reset ? 0 : s => s + delta)}
                onDrop={handleCalendarDrop}
                onMove={handleCalendarMove}
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
                daysToShow={7}
                heuresDispo={heuresDispo}
              />
            </motion.div>
          )}

          {/* MOIS */}
          {vue === 'mois' && (
            <motion.div key="mois" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Navigation mois */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: isMobile ? '10px 12px' : '8px 12px', flexShrink: 0 }}>
                <motion.button style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 10, background: T.bg, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSemaineOffset(s => s - 1)} whileHover={{ borderColor: T.accent, color: T.accent }} whileTap={{ scale: 0.92 }}>
                  <ChevronLeft size={isMobile ? 20 : 15} />
                </motion.button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? 15 : 13, fontWeight: 800, color: T.text, letterSpacing: '-0.3px', textTransform: 'capitalize' }}>
                  {monthLabel}
                </div>
                <motion.button style={{ padding: isMobile ? '10px 12px' : '6px 12px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', fontSize: isMobile ? 12 : 11, fontWeight: 600, flexShrink: 0 }} onClick={() => setSemaineOffset(0)} whileHover={{ borderColor: T.accent, color: T.accent }} whileTap={{ scale: 0.92 }}>
                  Auj.
                </motion.button>
                <motion.button style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 10, background: T.bg, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSemaineOffset(s => s + 1)} whileHover={{ borderColor: T.accent, color: T.accent }} whileTap={{ scale: 0.92 }}>
                  <ChevronRight size={isMobile ? 20 : 15} />
                </motion.button>
              </div>

              {/* Grille mois */}
              <div style={{ flex: 1, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* Jours de la semaine */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${T.border}`, flexShrink: 0, position: 'sticky', top: 0, background: T.bg2, zIndex: 10 }}>
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
                    <div key={d} style={{ padding: isMobile ? '8px 4px' : '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: i >= 5 ? T.accent : T.text2, letterSpacing: 0.8, textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>
                {/* Cellules */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
                  {monthDays.map(day => {
                    const dayPlan = planification.filter(p => (p.date_planifiee?.split('T')[0] || p.date_planifiee) === day.date)
                    return (
                      <div key={day.date} style={{
                        minHeight: isMobile ? 60 : 80,
                        padding: isMobile ? '4px' : '6px',
                        borderRight: `1px solid ${T.border}20`,
                        borderBottom: `1px solid ${T.border}20`,
                        background: day.isToday ? `${T.accent}08` : day.isWeekend && day.isCurrentMonth ? `${T.bg}` : 'transparent',
                        opacity: day.isCurrentMonth ? 1 : 0.35,
                      }}>
                        <div style={{
                          width: day.isToday ? (isMobile ? 22 : 26) : 'auto',
                          height: day.isToday ? (isMobile ? 22 : 26) : 'auto',
                          borderRadius: '50%',
                          background: day.isToday ? T.accent : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: isMobile ? 11 : 12,
                          fontWeight: day.isToday ? 800 : day.isCurrentMonth ? 500 : 400,
                          color: day.isToday ? '#fff' : T.text,
                          marginBottom: 3,
                          flexShrink: 0,
                        }}>
                          {day.num}
                        </div>
                        {dayPlan.slice(0, isMobile ? 1 : 3).map(p => {
                          const t = taches.find(t => t.id === p.tache_id)
                          return (
                            <div key={p.id} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: pBg(p.priorite || t?.priorite), color: pColor(p.priorite || t?.priorite), marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderLeft: `2px solid ${pColor(p.priorite || t?.priorite)}` }}>
                              {p.titre || t?.titre || '—'}
                            </div>
                          )
                        })}
                        {dayPlan.length > (isMobile ? 1 : 3) && (
                          <div style={{ fontSize: 8, color: T.accent, fontWeight: 600, paddingLeft: 2 }}>+{dayPlan.length - (isMobile ? 1 : 3)}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* GANTT */}
          {vue === 'gantt' && (
            <motion.div key="gantt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, overflow: 'auto' }}>
              {tachesAvecDeadline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}` }}>
                  <BarChart size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Aucune tâche avec deadline</p>
                  <p style={{ fontSize: 12, color: T.text2 }}>Ajoutez des deadlines pour visualiser le Gantt</p>
                </div>
              ) : (
                <div style={{ background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'auto' }}>
                  {/* Gantt header */}
                  <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: T.bg2, zIndex: 10 }}>
                    <div style={{ width: 220, flexShrink: 0, padding: '11px 16px', borderRight: `1px solid ${T.border}`, fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 2, opacity: 0.6 }}>TÂCHE · SCORE</div>
                    <div style={{ display: 'flex' }}>
                      {ganttDays.map((day, i) => (
                        <div key={day.date} style={{ width: 36, flexShrink: 0, padding: '7px 0', textAlign: 'center', background: day.isToday ? `${T.accent}10` : day.isWeekend ? `${T.bg}80` : 'transparent', borderRight: `1px solid ${T.border}12` }}>
                          <div style={{ fontSize: 8, color: T.text2, fontWeight: 600, opacity: 0.5 }}>{i === 0 || day.label === 1 ? day.mois.toUpperCase() : ''}</div>
                          <div style={{ fontSize: 11, fontWeight: day.isToday ? 800 : 400, color: day.isToday ? T.accent : T.text2 }}>{day.label}</div>
                          {day.isToday && <div style={{ width: 3, height: 3, borderRadius: '50%', background: T.accent, margin: '2px auto 0' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gantt rows */}
                  {tachesAvecDeadline.map((task, i) => {
                    const barre = getBarreGantt(task)
                    return (
                      <motion.div key={task.id} style={{ display: 'flex', borderBottom: `1px solid ${T.border}12`, minHeight: 46 }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                        <div style={{ width: 220, flexShrink: 0, padding: '11px 16px', borderRight: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: pColor(task.priorite), flexShrink: 0, boxShadow: `0 0 6px ${pColor(task.priorite)}60` }} />
                          <span style={{ fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.titre}</span>
                          {task._score && <span style={{ fontSize: 9, color: T.accent, opacity: 0.5, flexShrink: 0 }}>#{Math.round(task._score)}</span>}
                        </div>
                        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                          {ganttDays.map(day => (
                            <div key={day.date} style={{ width: 36, flexShrink: 0, borderRight: `1px solid ${T.border}08`, background: day.isToday ? `${T.accent}05` : day.isWeekend ? `${T.bg}30` : 'transparent', position: 'relative' }}>
                              {day.isToday && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: `${T.accent}35`, transform: 'translateX(-50%)' }} />}
                            </div>
                          ))}
                          {barre && (
                            <motion.div
                              style={{ position: 'absolute', left: barre.start * 36 + 2, width: Math.max((barre.end - barre.start + 1) * 36 - 4, 36), top: '50%', transform: 'translateY(-50%)', height: 22, background: `linear-gradient(90deg, ${pColor(task.priorite)}, ${pColor(task.priorite)}70)`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 9, fontSize: 9, color: '#fff', fontWeight: 700, overflow: 'hidden', boxShadow: `0 2px 10px ${pColor(task.priorite)}35`, zIndex: 2, cursor: 'default' }}
                              initial={{ scaleX: 0, originX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}>
                              {task.titre.length > 14 ? task.titre.substring(0, 14) + '…' : task.titre}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}

                  {/* Legend */}
                  <div style={{ padding: '10px 16px', display: 'flex', gap: 16, borderTop: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                    {[['Haute', '#ef4444'], ['Moyenne', '#f59e0b'], ['Basse', '#10b981'], ["Aujourd'hui", T.accent]].map(([label, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: label === "Aujourd'hui" ? 2 : 10, height: 10, borderRadius: label === "Aujourd'hui" ? 1 : 3, background: color }} />
                        <span style={{ fontSize: 11, color: T.text2 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
        {/* END VIEWS WRAPPER */}
        </div>
        {/* END CONTENT AREA */}
      </motion.main>

      {/* ── MODAL ESTIMATION ────────────────────────────────────────── */}
      <AnimatePresence>
        {showEstimer && (
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowEstimer(null)}>
            <motion.div
              style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 18, padding: 24, width: 'min(360px, 90%)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={14} color={T.accent} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Estimation IA</h3>
                </div>
                <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7 }} onClick={() => setShowEstimer(null)} whileHover={{ background: T.border }}>
                  <X size={14} />
                </motion.button>
              </div>

              <p style={{ fontSize: 13, color: T.text2, marginBottom: 12, lineHeight: 1.65, background: T.bg3 || T.bg, padding: '10px 12px', borderRadius: 9, border: `1px solid ${T.border}` }}>
                <strong style={{ color: T.text }}>"{showEstimer.titre}"</strong>
              </p>

              {showEstimer._score && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: T.accent, background: `${T.accent}10`, padding: '3px 10px', borderRadius: 99 }}>
                    Score de priorité : {showEstimer._score.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 11, color: T.text2, background: T.bg, padding: '3px 10px', borderRadius: 99, border: `1px solid ${T.border}` }}>
                    Priorité {showEstimer.priorite}
                  </span>
                </div>
              )}

              <motion.button
                style={{ width: '100%', padding: 12, background: loadingEstime ? T.bg3 : T.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: loadingEstime ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: !loadingEstime ? `0 4px 16px ${T.accent}40` : 'none' }}
                onClick={() => estimerTempsIA(showEstimer)}
                whileHover={!loadingEstime ? { scale: 1.02 } : {}}
                whileTap={{ scale: 0.98 }}>
                <Sparkles size={14} />
                {loadingEstime ? 'Analyse en cours...' : 'Estimer avec l\'IA'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}
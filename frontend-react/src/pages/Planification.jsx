// ══════════════════════════════════════════════════════════════════════
// Planification.jsx — Main orchestrator (thin shell, delegates to sub-components)
// Architecture: state → hooks → sub-components → utils
// ══════════════════════════════════════════════════════════════════════
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import { appTopInset } from '../utils/engagement'
import BottomNavMobile from '../components/BottomNavMobile'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import { useSidebarUser } from '../components/useSidebarUser'
import {
  Calendar, CalendarDays, LogOut, Layers, Sparkles,
  Menu, Columns, BarChart, CheckSquare, Check, Zap, Target, X,
  TrendingUp, AlertTriangle, Brain,
  ChevronRight, ChevronLeft, ChevronUp, Settings, User, Star, Flame, Flag,
  Plus, Trash2, Copy, Link2, Crown, Share2, UserPlus, MoreHorizontal, MessageCircle
} from 'lucide-react'

import CalendarGrid from './CalendarGrid'
import KanbanColumn from './KanbanColumn'
import { useCalendarEvents } from './useCalendarEvents'
import { FocusBar, InsightCard, DailyScore } from './PlanificationInsights'
import { CoachFloat } from './CoachFloat'
import { PomodoroWidget } from './PomodoroWidget'
import {
  calcPriorityScore, binPackTasks, getGanttDays,
  minsToTime, timeToMins, pColor, pBg,
  getWeekDays, getSingleDay, getMonthDays
} from './calendarUtils'

const API = 'https://getshift-backend.onrender.com'

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
  const { t } = useTranslation()
  const { T } = useTheme()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1100px)')
  const user = JSON.parse(localStorage.getItem('user'))

  // Sidebar toggle persistant (clé globale, synchronisée entre toutes les pages)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' }
    catch { return true }
  })

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
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

  // Déclarés ici car useMemo gcalWeekRange en dépend (TDZ si déclarés après)
  const [vue, setVue] = useState(() => isMobile ? 'jour' : 'kanban')
  const [semaineOffset, setSemaineOffset] = useState(0)

  // ── Google Calendar status (pour activer le bouton sync sur les cartes Kanban) ──
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { connected: gcalConnected, refresh: refreshGcal } = useCalendarEvents(user?.id, todayStr)

  // ── Google Calendar events pour overlay dans les vues calendrier/jour ──
  const gcalWeekRange = useMemo(() => {
    if (!gcalConnected) return null
    if (vue === 'jour') {
      const days = getSingleDay(semaineOffset)
      return { from: days[0].date, to: days[0].date }
    }
    if (vue === 'calendrier') {
      const days = getWeekDays(semaineOffset)
      return { from: days[0].date, to: days[days.length - 1].date }
    }
    return null
  }, [gcalConnected, vue, semaineOffset])

  const { events: gcalWeekEvents } = useCalendarEvents(user?.id, gcalWeekRange)

  // Sync manuel d'une tâche → Google Calendar (mode 'deadline' par défaut)
  const handleSyncCalendar = useCallback(async (task) => {
    try {
      const mode = task.focus_date ? 'focus' : 'deadline'
      const res = await axios.post(
        `${API}/integrations/google-calendar/sync-task/${task.id}`,
        { mode },
        { withCredentials: true }
      )
      if (res.data?.event_id) {
        setTaches(cur => cur.map(t => t.id === task.id
          ? { ...t, google_event_id: res.data.event_id, gcal_sync_mode: mode }
          : t))
        refreshGcal()
      }
    } catch (e) {
      alert(t('planification.sync_gcal_error'))
    }
  }, [refreshGcal])

  const handleUnsyncCalendar = useCallback(async (task) => {
    try {
      await axios.delete(
        `${API}/integrations/google-calendar/sync-task/${task.id}`,
        { withCredentials: true }
      )
      setTaches(cur => cur.map(t => t.id === task.id
        ? { ...t, google_event_id: null, gcal_sync_mode: null }
        : t))
      refreshGcal()
    } catch (e) {
      // Silencieux — l'event est probablement déjà parti
      setTaches(cur => cur.map(t => t.id === task.id
        ? { ...t, google_event_id: null, gcal_sync_mode: null }
        : t))
    }
  }, [refreshGcal])

  const [planification, setPlanification] = useState([])
  const [priorites, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIA, setLoadingIA] = useState(false)
  const [conseil, setConseil] = useState('')
  const [heuresDispo, setHeuresDispo] = useState(8)

  // ── UI state ───────────────────────────────────────────────────────
  const [showEstimer, setShowEstimer] = useState(null)
  const [loadingEstime, setLoadingEstime] = useState(false)
  const [smartResult, setSmartResult] = useState(null)   // bin-packing preview

  // ── Autoplan IA Calendar ───────────────────────────────────────────
  const [autoplanModal, setAutoplanModal]   = useState(false)
  const [autoplanSugs, setAutoplanSugs]     = useState([])   // [{...sug, accepted:bool}]
  const [autoplanLoading, setAutoplanLoading] = useState(false)
  const [autoplanMeta, setAutoplanMeta]     = useState(null) // {conflicts_avoided, gcal_connected}

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

  const lancerAutoplan = useCallback(async () => {
    setAutoplanLoading(true)
    try {
      const res = await axios.post(
        `${API}/ia/planifier-semaine-calendar/${user.id}`,
        { heures_dispo: heuresDispo },
        { withCredentials: true }
      )
      const sugs = (res.data.suggestions || []).map(s => ({ ...s, accepted: true }))
      setAutoplanSugs(sugs)
      setAutoplanMeta({ conflicts_avoided: res.data.conflicts_avoided, gcal_connected: res.data.gcal_connected })
      setAutoplanModal(true)
    } catch (e) {
      alert(t('planification.gen_error'))
    } finally {
      setAutoplanLoading(false)
    }
  }, [heuresDispo, user?.id])

  const appliquerAutoplan = useCallback(async () => {
    const accepted = autoplanSugs.filter(s => s.accepted)
    let applied = 0
    for (const sug of accepted) {
      try {
        await axios.post(`${API}/planification`, {
          user_id: user.id,
          tache_id: sug.task_id,
          date_planifiee: sug.day_iso,
          heure_debut: sug.start_hhmm,
          heure_fin: sug.end_hhmm,
          charge_minutes: Math.max(0,
            (parseInt(sug.end_hhmm?.split(':')[0] || 0) * 60 + parseInt(sug.end_hhmm?.split(':')[1] || 0))
            - (parseInt(sug.start_hhmm?.split(':')[0] || 0) * 60 + parseInt(sug.start_hhmm?.split(':')[1] || 0))
          ),
          genere_par_ia: true,
        }, { withCredentials: true })
        applied++
      } catch {}
    }
    setAutoplanModal(false)
    setAutoplanSugs([])
    if (applied > 0) {
      chargerDonnees()
      refreshGcal()
    }
  }, [autoplanSugs, user?.id, chargerDonnees, refreshGcal])

  // ── Kanban drag state ──────────────────────────────────────────────
  const [kanbanDrag, setKanbanDrag] = useState(null)
  const [kanbanDragOver, setKanbanDragOver] = useState(null)
  const [kanbanActiveCol, setKanbanActiveCol] = useState('a_faire')

  // Filtres (inutilisés dans planification mais présents pour la sidebar identique)
  const [filtre, setFiltre] = useState('toutes')
  const bloquees = 0

  // Source unifiée (= Dashboard) — remplace les valeurs mock hardcodées.
  const userData = { nom: user?.nom || 'Utilisateur', email: user?.email || 'user@example.com' }
  const sb = useSidebarUser()
  const points = sb.points
  const niveau = sb.niveau
  const niveauActuel = sb.niveauActuel
  const pctNiveau = sb.pctNiveau
  const streak = sb.streak

  const GANTT_DAY_W   = isMobile ? 26 : 36
  const GANTT_LABEL_W = isMobile ? 130 : 220
  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)
  const isNarrow = isMobile || isTablet

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerDonnees()
  }, [])

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

  // ── Quick schedule (mobile : bouton + sur les chips) ──────────────
  const quickSchedule = useCallback((task) => {
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const startMins = Math.ceil(nowMins / 15) * 15
    const endMins = startMins + (task.temps_estime || 60)
    const today = now.toISOString().split('T')[0]
    handleCalendarDrop({ date: today, startMins, endMins, tacheId: task.id })
  }, [handleCalendarDrop])

  // ── Smart AI Scheduling — PROPOSITIONS UNIQUEMENT ──────────────────
  // L'IA propose, l'user accepte/refuse. Pas de plannification automatique.
  const [propositionsRejetees, setPropositionsRejetees] = useState(new Set())

  const planifierAvecIA = useCallback(async () => {
    setLoadingIA(true)
    setPropositionsRejetees(new Set())
    try {
      // ── Bornes : aujourd'hui → +14 jours (jamais dans le passé) ──
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const snappedNow = Math.ceil(nowMins / 15) * 15

      const futureDates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return d.toISOString().split('T')[0]
      })

      // Heures déjà passées d'aujourd'hui = occupé (phantom block)
      const occupied = [
        ...planification.map(p => ({
          date: p.date_planifiee?.split('T')[0] || p.date_planifiee,
          startMins: p.startMins,
          endMins: p.endMins,
        })),
        { date: todayStr, startMins: 0, endMins: snappedNow },
      ]

      const toSchedule = sortedTaches.filter(t => !t.terminee)
      const dejaPlanifiees = new Set(planification.map(p => p.tache_id))
      const candidats = toSchedule.filter(t => !dejaPlanifiees.has(t.id))

      const scheduled = binPackTasks(candidats, futureDates, occupied, heuresDispo)
      setSmartResult(scheduled)

      // Conseil IA en parallèle (non bloquant)
      axios.post(`${API}/ia/planifier`, { user_id: user.id, heures_dispo: heuresDispo })
        .then(res => setConseil(res.data.conseil || ''))
        .catch(() => {})
    } catch (err) { console.error(err) }
    setLoadingIA(false)
  }, [sortedTaches, planification, heuresDispo, user?.id])

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
    { label: t('common.done'), value: taches.filter(t => t.terminee).length, color: '#10b981', Icon: CheckSquare },
    { label: t('planification.view_list'), value: planification.length, color: '#8b5cf6', Icon: Calendar },
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

  const retirerDuCalendrier = useCallback(async (entryId) => {
    setPlanification(cur => cur.filter(e => e.id !== entryId))
    try { await axios.delete(`${API}/planification/${entryId}`) }
    catch { /* rollback non critique */ }
  }, [])

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
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "var(--font-ui)" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 99px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — shared AppSidebar component
      ══════════════════════════════════════════════════════════════ */}
      <AppSidebar
        T={T} user={userData}
        niveau={niveau} points={points} streak={streak}
        niveauActuel={niveauActuel} pctNiveau={pctNiveau}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        toggleSidebar={toggleSidebar} isMobile={isMobile}>

        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

        {/* IA Planner (contenu original de la sidebar de planification) */}
        <div style={{ background: `linear-gradient(135deg, var(--ember-soft), var(--ember-hover))`, border: `1px solid var(--ember-soft)`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Brain size={13} color="var(--ember)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ember)', letterSpacing: 0.3 }}>{t('planification.sidebar_ia_label')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('planification.sidebar_hours_label')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-1)', borderRadius: 8, padding: '4px 8px', border: '1px solid var(--border-subtle)' }}>
              <motion.button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} onClick={() => setHeuresDispo(h => Math.max(1, h - 1))} whileTap={{ scale: 0.8 }}>−</motion.button>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ember)', minWidth: 18, textAlign: 'center' }}>{heuresDispo}</span>
              <motion.button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }} onClick={() => setHeuresDispo(h => Math.min(16, h + 1))} whileTap={{ scale: 0.8 }}>+</motion.button>
            </div>
          </div>

          {smartResult && smartResult.length > 0 && (
            <div style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--ember-soft)', border: `1px solid var(--ember-soft)`, borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--ember)', fontWeight: 700 }}>{smartResult.length}</span> {smartResult.length > 1 ? t('planification.sidebar_pending_plural', { n: smartResult.length }) : t('planification.sidebar_pending', { n: smartResult.length })}
            </div>
          )}

          <motion.button
            style={{ width: '100%', padding: '9px', background: loadingIA ? 'var(--surface-2)' : 'var(--ember)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: loadingIA ? 'not-allowed' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: !loadingIA ? `0 4px 14px var(--ember-soft)` : 'none', transition: 'all 0.2s' }}
            onClick={planifierAvecIA}
            whileHover={!loadingIA ? { scale: 1.02, y: -1 } : {}}
            whileTap={{ scale: 0.98 }}>
            <Sparkles size={12} />
            {loadingIA ? t('planification.btn_analyzing') : t('planification.btn_propose')}
          </motion.button>

          {gcalConnected && (
            <motion.button
              style={{
                width: '100%', padding: '9px', marginTop: 8,
                background: autoplanLoading ? 'var(--surface-2)' : 'linear-gradient(90deg, #1A73E8, #4285F4)',
                color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700,
                cursor: autoplanLoading ? 'not-allowed' : 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: !autoplanLoading ? '0 4px 14px rgba(26,115,232,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
              onClick={lancerAutoplan}
              whileHover={!autoplanLoading ? { scale: 1.02, y: -1 } : {}}
              whileTap={{ scale: 0.98 }}>
              <Zap size={12} />
              {autoplanLoading ? t('planification.btn_analyzing') : t('planification.btn_plan_cal')}
            </motion.button>
          )}
        </div>

        {/* Conseil */}
        {conseil && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '10px 12px', background: 'var(--surface-2)' || 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.65 }}>
            <span style={{ color: 'var(--ember)', fontWeight: 600 }}>{t('planification.conseil_label')}</span><br />{conseil}
          </motion.div>
        )}

        {/* Top priorités */}
        {priorites.length > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0 14px' }} />
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 2, marginBottom: 8, padding: '0 6px', opacity: 0.6 }}>{t('planification.top_prios')}</p>
            {priorites.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8, marginBottom: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: i < 2 ? pColor(t.priorite) : 'var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: i < 2 ? '#fff' : 'var(--ember)', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.4 }}>{t.titre}</span>
                {t._score && <span style={{ fontSize: 9, color: 'var(--ember)', opacity: 0.5 }}>#{Math.round(t._score)}</span>}
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(t.priorite), flexShrink: 0 }} />
              </div>
            ))}
          </>
        )}

      </AppSidebar>

      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      {/* ── MAIN ──────────────────────────────────────────────────── */}
      <motion.main
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', overflowX: 'hidden' }}>

        {/* ═══ STATIC TOP — stats + header toujours visibles, ne scroll jamais ═══ */}
        <div style={{
          flexShrink: 0,
          padding: isMobile ? '10px 14px 8px' : 'clamp(16px,3vw,28px) clamp(16px,3vw,32px) 10px',
          paddingTop: isMobile ? appTopInset(54) : 'clamp(20px,3vh,32px)',
        }}>

        {/* Header — masqué sur mobile en vue calendrier pour libérer la grille */}
        <div style={{ marginBottom: isMobile && isCalView ? 6 : (isMobile ? 8 : 14) }}>
          {!(isMobile && isCalView) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 12, marginBottom: 14, flexDirection: isMobile ? 'column' : 'row' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 28, borderRadius: 99, background: `linear-gradient(180deg, var(--ember), var(--ember-hover))`, flexShrink: 0 }} />
                  <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, letterSpacing: '-0.7px', margin: 0, background: `linear-gradient(135deg, var(--text-primary), var(--text-secondary))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('planification.page_title')}</h1>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'capitalize', paddingLeft: 18, margin: 0 }}>
                  {new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <DailyScore
                T={T}
                isMobile={isMobile}
                planification={planification}
                taches={taches}
                heuresDispo={heuresDispo}
              />
            </div>
          )}

          {/* View switcher — scrollable, always labeled */}
          <div data-guide="planif-views" style={{
            display: 'flex',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: 4,
            gap: 3,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {[
              { id: 'liste', label: t('planification.view_list'), Icon: CheckSquare },
              { id: 'kanban', label: t('planification.view_kanban'), Icon: Columns },
              { id: 'jour', label: t('planification.view_day'), Icon: Target },
              { id: 'calendrier', label: t('planification.view_week'), Icon: Calendar },
              { id: 'mois', label: t('planification.view_month'), Icon: CalendarDays },
              { id: 'gantt', label: t('planification.view_gantt'), Icon: BarChart },
            ].map(({ id, label, Icon }) => (
              <motion.button key={id}
                style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
                  padding: isMobile ? '7px 9px' : '8px 14px',
                  borderRadius: 8,
                  background: vue === id
                    ? 'linear-gradient(135deg, var(--ember), var(--ember-hover))'
                    : 'transparent',
                  color: vue === id ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: vue === id ? 700 : 500,
                  boxShadow: vue === id ? `0 4px 12px var(--ember-soft)` : 'none',
                  transition: 'all 0.18s',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onClick={() => { setVue(id); setSemaineOffset(0) }}
                whileTap={{ scale: 0.95 }}>
                {!isMobile && <Icon size={13} strokeWidth={vue === id ? 2.5 : 1.8} />}
                <span>{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ─── FOCUS BAR (créneau en cours) + INSIGHT IA (proactif) ─── */}
        {/* FocusBar visible partout : essentielle quand une tâche tourne */}
        <FocusBar
          planification={planification}
          taches={taches}
          T={T}
          isMobile={isMobile}
          onComplete={terminerTache}
        />
        {/* InsightCard masquée sur mobile en vue calendrier (libère la grille) */}
        {!(isMobile && isCalView) && (
          <InsightCard
            taches={taches}
            planification={planification}
            T={T}
            isMobile={isMobile}
            heuresDispo={heuresDispo}
            onPlanIA={planifierAvecIA}
            loadingIA={loadingIA}
          />
        )}

        {/* Stats — seulement en vue Liste */}
        {vue === 'liste' && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 6 : isTablet ? 8 : 12, marginBottom: 0 }}>
          {stats.map((s, i) => {
            const Icon = s.Icon
            return (
              <motion.div key={i}
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
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
                  <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: isMobile ? 9 : 11, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                </div>
              </motion.div>
            )
          })}
        </div>}
        {/* END STATS (liste only) */}
        </div>
        {/* END STATIC TOP */}

        {/* ═══ CONTENT AREA — liste/kanban/gantt scrollable, calendrier fixe ═══ */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: isCalView ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          padding: isMobile
            ? `0 14px 80px`
            : isTablet
              ? `0 20px 32px`
              : `0 clamp(16px,3vw,32px) clamp(10px,2vw,24px)`,
        }}>

        {/* ─── Bloc "Aujourd'hui" — masqué en vue calendrier (visible sur la grille) ─── */}
        {!isCalView && aujourdHui.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: `linear-gradient(135deg, var(--ember-soft), var(--ember-hover))`, border: `1px solid var(--ember-soft)`, borderRadius: 14, padding: isMobile ? 14 : '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={15} color="var(--ember)" strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Aujourd'hui</h2>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, marginTop: 1 }}>{aujourdHui.length} créneau{aujourdHui.length > 1 ? 'x' : ''} planifié{aujourdHui.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aujourdHui.slice(0, 6).map((entry, i) => {
                const enCours = entry.tache.statut === 'en_cours'
                return (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '8px 10px' : '9px 12px', background: 'var(--surface-1)', borderRadius: 10, border: `1px solid ${enCours ? '#f59e0b40' : 'var(--border-subtle)'}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: 76, opacity: 0.9 }}>
                      {entry.heure_debut?.slice(0,5) || minsToTime(entry.startMins).slice(0,5)} → {entry.heure_fin?.slice(0,5) || minsToTime(entry.endMins).slice(0,5)}
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(entry.tache.priorite), flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.tache.titre}</span>
                    {enCours && <span style={{ fontSize: 9, color: '#f59e0b', background: '#f59e0b18', padding: '2px 7px', borderRadius: 99, fontWeight: 700, letterSpacing: 0.5 }}>EN COURS</span>}
                    {!enCours && (
                      <motion.button onClick={() => demarrerTache(entry.tache.id)} whileTap={{ scale: 0.92 }}
                        title="Commencer"
                        style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--ember)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={12} />
                      </motion.button>
                    )}
                    <motion.button onClick={() => terminerTache(entry.tache.id)} whileTap={{ scale: 0.92 }}
                      title={t('planification.terminate_title')}
                      style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckSquare size={12} />
                    </motion.button>
                  </motion.div>
                )
              })}
              {aujourdHui.length > 6 && (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4, opacity: 0.7 }}>
                  {aujourdHui.length - 6 > 1 ? t('planification.slots_more_plural', { n: aujourdHui.length - 6 }) : t('planification.slots_more', { n: aujourdHui.length - 6 })}
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
              <div style={{ background: `linear-gradient(135deg, var(--ember-soft), #a855f708)`, border: `1px dashed var(--ember-soft)`, borderRadius: 14, padding: isMobile ? 14 : '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Brain size={15} color="var(--ember)" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>L'IA te propose un planning</h2>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, marginTop: 1 }}>{t('planification.suggest_accept_sub')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <motion.button onClick={refuserToutesPropositions} whileTap={{ scale: 0.95 }}
                      style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Tout refuser
                    </motion.button>
                    <motion.button onClick={accepterToutesPropositions} whileTap={{ scale: 0.95 }}
                      style={{ padding: '6px 12px', background: 'var(--ember)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', boxShadow: `0 3px 10px var(--ember-soft)` }}>
                      Tout accepter
                    </motion.button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {smartResult.slice(0, 8).map((p, i) => {
                    const dateLabel = new Date(p.date).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <motion.div key={`${p.task.id}-${p.date}-${p.startMins}-${i}`}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.03 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '8px 10px' : '9px 12px', background: 'var(--surface-1)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)', minWidth: isMobile ? 68 : 92, textTransform: 'capitalize' }}>
                          {dateLabel}
                        </div>
                        <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', minWidth: isMobile ? 58 : 78 }}>
                          {minsToTime(p.startMins).slice(0,5)} → {minsToTime(p.endMins).slice(0,5)}
                        </div>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(p.task.priorite), flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.task.titre}{p.totalParts > 1 ? ` (${p.part}/${p.totalParts})` : ''}
                        </span>
                        <motion.button onClick={() => refuserProposition(i)} whileTap={{ scale: 0.92 }}
                          title="Refuser"
                          style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X size={12} />
                        </motion.button>
                        <motion.button onClick={() => accepterProposition(p, i)} whileTap={{ scale: 0.92 }}
                          title="Accepter"
                          style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--ember-soft)', border: `1px solid var(--ember-soft)`, color: 'var(--ember)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckSquare size={12} />
                        </motion.button>
                      </motion.div>
                    )
                  })}
                  {smartResult.length > 8 && (
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4, opacity: 0.7 }}>
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
                  { titre: 'Sans deadline', items: sansDeadline, color: 'var(--text-secondary)', emptyMsg: null },
                  { titre: 'Terminées récemment', items: termineesRecentes, color: '#10b981', emptyMsg: null, dim: true },
                ].filter(s => s.items.length > 0)

                if (open.length === 0 && termineesRecentes.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface-1)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                      <CheckSquare size={40} color="var(--border-subtle)" strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('planification.empty_no_task')}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('planification.empty_no_task_sub')}</p>
                    </div>
                  )
                }

                return sections.map(sec => (
                  <div key={sec.titre}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sec.color }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{sec.titre}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>{sec.items.length}</span>
                    </div>
                    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                      {sec.items.map((t, i) => (
                        <motion.div key={t.id}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: i < sec.items.length - 1 ? '1px solid var(--border-subtle)' : 'none', opacity: sec.dim ? 0.55 : 1 }}>
                          <motion.button onClick={() => t.terminee ? null : terminerTache(t.id)} whileTap={{ scale: 0.85 }}
                            disabled={t.terminee}
                            style={{ width: 22, height: 22, borderRadius: 6, background: t.terminee ? '#10b981' : 'transparent', border: `1.5px solid ${t.terminee ? '#10b981' : 'var(--border-subtle)'}`, cursor: t.terminee ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {t.terminee && <Check size={12} color="#fff" strokeWidth={3} />}
                          </motion.button>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: pColor(t.priorite), flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.terminee ? 'line-through' : 'none' }}>{t.titre}</span>
                          {t.deadline && !t.terminee && (
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                              {new Date(t.deadline).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {t.temps_estime && !t.terminee && (
                            <span style={{ fontSize: 10, color: 'var(--ember)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.temps_estime}m</span>
                          )}
                          {!t.terminee && t.statut !== 'en_cours' && (
                            <motion.button onClick={() => demarrerTache(t.id)} whileTap={{ scale: 0.9 }}
                              title="Commencer"
                              style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--ember)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
            <motion.div key="kanban" data-guide="planif-board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

              {/* Mobile: onglets de colonnes */}
              {isMobile && (
                <div style={{ display: 'flex', gap: 6, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, flexShrink: 0 }}>
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
                          color: active ? '#fff' : 'var(--text-secondary)',
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
                    onSyncCalendar={handleSyncCalendar}
                    onUnsyncCalendar={handleUnsyncCalendar}
                    gcalConnected={!!gcalConnected}
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
                onQuickSchedule={quickSchedule}
                onBlockComplete={terminerTache}
                onBlockRemove={retirerDuCalendrier}
                daysToShow={1}
                heuresDispo={heuresDispo}
                gcalEvents={gcalWeekEvents}
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
                onQuickSchedule={quickSchedule}
                onBlockComplete={terminerTache}
                onBlockRemove={retirerDuCalendrier}
                daysToShow={7}
                heuresDispo={heuresDispo}
                gcalEvents={gcalWeekEvents}
              />
            </motion.div>
          )}

          {/* MOIS */}
          {vue === 'mois' && (
            <motion.div key="mois" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Navigation mois */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: isMobile ? '10px 12px' : '8px 12px', flexShrink: 0 }}>
                <motion.button style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSemaineOffset(s => s - 1)} whileHover={{ borderColor: 'var(--ember)', color: 'var(--ember)' }} whileTap={{ scale: 0.92 }}>
                  <ChevronLeft size={isMobile ? 20 : 15} />
                </motion.button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? 15 : 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', textTransform: 'capitalize' }}>
                  {monthLabel}
                </div>
                <motion.button style={{ padding: isMobile ? '10px 12px' : '6px 12px', borderRadius: 8, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: isMobile ? 12 : 11, fontWeight: 600, flexShrink: 0 }} onClick={() => setSemaineOffset(0)} whileHover={{ borderColor: 'var(--ember)', color: 'var(--ember)' }} whileTap={{ scale: 0.92 }}>
                  Auj.
                </motion.button>
                <motion.button style={{ width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setSemaineOffset(s => s + 1)} whileHover={{ borderColor: 'var(--ember)', color: 'var(--ember)' }} whileTap={{ scale: 0.92 }}>
                  <ChevronRight size={isMobile ? 20 : 15} />
                </motion.button>
              </div>

              {/* Grille mois */}
              <div style={{ flex: 1, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* Jours de la semaine */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, position: 'sticky', top: 0, background: 'var(--surface-1)', zIndex: 10 }}>
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
                    <div key={d} style={{ padding: isMobile ? '8px 4px' : '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: i >= 5 ? 'var(--ember)' : 'var(--text-secondary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{d}</div>
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
                        borderRight: `1px solid var(--border-default)`,
                        borderBottom: `1px solid var(--border-default)`,
                        background: day.isToday ? 'var(--ember-soft)' : day.isWeekend && day.isCurrentMonth ? 'var(--bg-base)' : 'transparent',
                        opacity: day.isCurrentMonth ? 1 : 0.35,
                      }}>
                        <div style={{
                          width: day.isToday ? (isMobile ? 22 : 26) : 'auto',
                          height: day.isToday ? (isMobile ? 22 : 26) : 'auto',
                          borderRadius: '50%',
                          background: day.isToday ? 'var(--ember)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: isMobile ? 11 : 12,
                          fontWeight: day.isToday ? 800 : day.isCurrentMonth ? 500 : 400,
                          color: day.isToday ? '#fff' : 'var(--text-primary)',
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
                          <div style={{ fontSize: 8, color: 'var(--ember)', fontWeight: 600, paddingLeft: 2 }}>+{dayPlan.length - (isMobile ? 1 : 3)}</div>
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
                <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface-1)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                  <BarChart size={40} color="var(--border-subtle)" strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('planification.empty_no_deadline')}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ajoutez des deadlines pour visualiser le Gantt</p>
                </div>
              ) : (
                <div style={{ background: 'var(--surface-1)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'auto' }}>
                  {/* Gantt header */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--surface-1)', zIndex: 10 }}>
                    <div style={{ width: GANTT_LABEL_W, flexShrink: 0, padding: isMobile ? '11px 10px' : '11px 16px', borderRight: '1px solid var(--border-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 2, opacity: 0.6, position: 'sticky', left: 0, background: 'var(--surface-1)', zIndex: 11 }}>TÂCHE · SCORE</div>
                    <div style={{ display: 'flex' }}>
                      {ganttDays.map((day, i) => (
                        <div key={day.date} style={{ width: GANTT_DAY_W, flexShrink: 0, padding: '7px 0', textAlign: 'center', background: day.isToday ? 'var(--ember-soft)' : day.isWeekend ? `var(--bg-base)80` : 'transparent', borderRight: `1px solid var(--border-default)` }}>
                          <div style={{ fontSize: 8, color: 'var(--text-secondary)', fontWeight: 600, opacity: 0.5 }}>{i === 0 || day.label === 1 ? day.mois.toUpperCase() : ''}</div>
                          <div style={{ fontSize: 11, fontWeight: day.isToday ? 800 : 400, color: day.isToday ? 'var(--ember)' : 'var(--text-secondary)' }}>{day.label}</div>
                          {day.isToday && <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ember)', margin: '2px auto 0' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gantt rows */}
                  {tachesAvecDeadline.map((task, i) => {
                    const barre = getBarreGantt(task)
                    return (
                      <motion.div key={task.id} style={{ display: 'flex', borderBottom: `1px solid var(--border-default)`, minHeight: 46 }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                        <div style={{ width: GANTT_LABEL_W, flexShrink: 0, padding: isMobile ? '11px 10px' : '11px 16px', borderRight: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', left: 0, background: 'var(--surface-1)', zIndex: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: pColor(task.priorite), flexShrink: 0, boxShadow: `0 0 6px ${pColor(task.priorite)}60` }} />
                          <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.titre}</span>
                          {task._score && <span style={{ fontSize: 9, color: 'var(--ember)', opacity: 0.5, flexShrink: 0 }}>#{Math.round(task._score)}</span>}
                        </div>
                        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                          {ganttDays.map(day => (
                            <div key={day.date} style={{ width: GANTT_DAY_W, flexShrink: 0, borderRight: `1px solid var(--border-default)`, background: day.isToday ? `var(--ember-soft)` : day.isWeekend ? 'var(--bg-base)' : 'transparent', position: 'relative' }}>
                              {day.isToday && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--ember-ring)', transform: 'translateX(-50%)' }} />}
                            </div>
                          ))}
                          {barre && (
                            <motion.div
                              style={{ position: 'absolute', left: barre.start * GANTT_DAY_W + 2, width: Math.max((barre.end - barre.start + 1) * GANTT_DAY_W - 4, GANTT_DAY_W), top: '50%', transform: 'translateY(-50%)', height: isMobile ? 18 : 22, background: `linear-gradient(90deg, ${pColor(task.priorite)}, ${pColor(task.priorite)}70)`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: isMobile ? 5 : 9, fontSize: isMobile ? 8 : 9, color: '#fff', fontWeight: 700, overflow: 'hidden', boxShadow: `0 2px 10px ${pColor(task.priorite)}35`, zIndex: 2, cursor: 'default' }}
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
                  <div style={{ padding: '10px 16px', display: 'flex', gap: 16, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                    {[['Haute', '#ef4444'], ['Moyenne', '#f59e0b'], ['Basse', '#10b981'], ["Aujourd'hui", 'var(--ember)']].map(([label, color]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: label === "Aujourd'hui" ? 2 : 10, height: 10, borderRadius: label === "Aujourd'hui" ? 1 : 3, background: color }} />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
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

      {/* ── MODAL AUTOPLAN CALENDAR ─────────────────────────────────── */}
      <AnimatePresence>
        {autoplanModal && (
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAutoplanModal(false)}>
            <motion.div
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 24, width: 'min(560px, 95%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #1A73E8, #4285F4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={15} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Planning IA — Calendar</h3>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                      {autoplanSugs.length} suggestion{autoplanSugs.length !== 1 ? 's' : ''}
                      {autoplanMeta?.conflicts_avoided > 0 && ` ${autoplanMeta.conflicts_avoided > 1 ? t('planification.autoplan_conflicts_plural', { n: autoplanMeta.conflicts_avoided }) : t('planification.autoplan_conflicts', { n: autoplanMeta.conflicts_avoided })}`}
                    </p>
                  </div>
                </div>
                <motion.button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7 }}
                  onClick={() => setAutoplanModal(false)} whileHover={{ background: 'var(--border-subtle)' }}>
                  <X size={14} />
                </motion.button>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6, flexShrink: 0 }}>
                {t('planification.suggest_accept_sub')}
              </p>

              {/* Liste des suggestions */}
              {autoplanSugs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-secondary)', fontSize: 13, opacity: 0.7 }}>
                  {t('planification.suggest_none')}
                </div>
              ) : (
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                  {autoplanSugs.map((sug, i) => {
                    const dayLabel = new Date(sug.day_iso).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                        onClick={() => setAutoplanSugs(cur => cur.map((s, j) => j === i ? { ...s, accepted: !s.accepted } : s))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10,
                          background: sug.accepted ? `rgba(26,115,232,0.07)` : 'var(--bg-base)',
                          border: `1px solid ${sug.accepted ? 'rgba(26,115,232,0.3)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                          opacity: sug.accepted ? 1 : 0.45,
                        }}>
                        {/* Toggle check */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${sug.accepted ? '#1A73E8' : 'var(--border-subtle)'}`,
                          background: sug.accepted ? '#1A73E8' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {sug.accepted && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>

                        {/* Date */}
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#1A73E8', minWidth: 80, textTransform: 'capitalize', fontFamily: 'var(--font-mono)' }}>
                          {dayLabel}
                        </span>

                        {/* Heure */}
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 88, fontFamily: 'var(--font-mono)' }}>
                          {sug.start_hhmm} → {sug.end_hhmm}
                        </span>

                        {/* Titre */}
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sug.titre}
                        </span>

                        {/* Raison tooltip */}
                        {sug.reason && (
                          <span title={sug.reason} style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.6, flexShrink: 0 }}>
                            ℹ
                          </span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexShrink: 0 }}>
                <motion.button
                  onClick={() => setAutoplanSugs(cur => cur.map(s => ({ ...s, accepted: false })))}
                  style={{ flex: 1, padding: '9px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 9, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  whileTap={{ scale: 0.97 }}>
                  Tout refuser
                </motion.button>
                <motion.button
                  onClick={() => setAutoplanSugs(cur => cur.map(s => ({ ...s, accepted: true })))}
                  style={{ flex: 1, padding: '9px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 9, color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  whileTap={{ scale: 0.97 }}>
                  Tout accepter
                </motion.button>
                <motion.button
                  onClick={appliquerAutoplan}
                  style={{
                    flex: 2, padding: '9px',
                    background: 'linear-gradient(90deg, #1A73E8, #4285F4)',
                    color: '#fff', border: 'none', borderRadius: 9,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(26,115,232,0.35)',
                  }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  Appliquer {autoplanSugs.filter(s => s.accepted).length} suggestion{autoplanSugs.filter(s => s.accepted).length !== 1 ? 's' : ''}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL ESTIMATION ────────────────────────────────────────── */}
      <AnimatePresence>
        {showEstimer && (
          <motion.div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowEstimer(null)}>
            <motion.div
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: 24, width: 'min(360px, 90%)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={14} color="var(--ember)" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Estimation IA</h3>
                </div>
                <motion.button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7 }} onClick={() => setShowEstimer(null)} whileHover={{ background: 'var(--border-subtle)' }}>
                  <X size={14} />
                </motion.button>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.65, background: 'var(--surface-2)' || 'var(--bg-base)', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border-subtle)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>"{showEstimer.titre}"</strong>
              </p>

              {showEstimer._score && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--ember)', background: 'var(--ember-soft)', padding: '3px 10px', borderRadius: 99 }}>
                    {t('planification.score_priority')} {showEstimer._score.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border-subtle)' }}>
                    {t('planification.priority_label')} {showEstimer.priorite}
                  </span>
                </div>
              )}

              <motion.button
                style={{ width: '100%', padding: 12, background: loadingEstime ? 'var(--surface-2)' : 'var(--ember)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: loadingEstime ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: !loadingEstime ? `0 4px 16px var(--ember-soft)` : 'none' }}
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
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px,100vw)', background: 'var(--surface-1)', borderLeft: '1px solid var(--border-subtle)', zIndex: 1051, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={18} color="var(--ember)" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('planification.settings_title')}</h2>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>{userData.nom}</p>
                    </div>
                  </div>
                  <motion.button onClick={() => setShowSettings(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('common.settings_soon')}</p>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 12, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }} whileHover={{ background: 'rgba(224,92,92,0.12)' }}>
                  <LogOut size={16} strokeWidth={1.8} />Se déconnecter
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {isMobile && <BottomNavMobile T={T} />}

      {/* ─── Floating widgets : Coach + Pomodoro (masqués sur mobile en cal view) ─── */}
      {!(isMobile && isCalView) && (
        <>
          <CoachFloat
            T={T}
            isMobile={isMobile}
            userId={user?.id}
            planification={planification}
            taches={taches}
            heuresDispo={heuresDispo}
          />
          <PomodoroWidget
            T={T}
            isMobile={isMobile}
            planification={planification}
            taches={taches}
          />
        </>
      )}
    </div>
  )
}
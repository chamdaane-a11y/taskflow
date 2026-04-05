// ══════════════════════════════════════════════════════════════════════
// Dashboard.jsx — Shell de rendu pur. Zéro logique, zéro useState direct.
// Toute la logique est dans useDashboard.js
// ══════════════════════════════════════════════════════════════════════
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import {
  LayoutDashboard, CheckSquare, Clock, AlertTriangle,
  ChevronRight, Trash2, Plus, LogOut, Bot, BarChart2,
  Calendar, Layers, Bell, Award, Palette, Sparkles, Target, Users, Menu, Settings, HelpCircle,
  ChevronDown, ChevronUp, ExternalLink, User, Download, BookOpen, X, Search,
  Zap, Flame, Brain, Trophy, Star, Lightbulb, TrendingUp,
  CheckCircle2, AlertCircle, MessageCircle, Flag, Pencil, BarChart, Heart,
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import ExportModal from './ExportModal'
import Onboarding from './Onboarding'
import { useDashboard } from './useDashboard'

registerLocale('fr', fr)

// ── Constantes statiques (hors composant = pas de re-render) ──────────
const PRIORITES = [
  { val: 'haute',   label: 'Haute',   bg: 'rgba(224,92,92,0.12)',  color: '#e05c5c' },
  { val: 'moyenne', label: 'Moyenne', bg: 'rgba(224,138,60,0.12)', color: '#e08a3c' },
  { val: 'basse',   label: 'Basse',   bg: 'rgba(76,175,130,0.12)', color: '#4caf82' },
]

const BADGES_CONFIG = [
  { id: "first_task",  nom: "Premier pas",      icon: "🌱", description: "Première tâche terminée",        categorie: "performance" },
  { id: "five_tasks",  nom: "En rythme",         icon: "🔥", description: "5 tâches terminées",            categorie: "performance" },
  { id: "ten_tasks",   nom: "Productif",         icon: "⚡", description: "10 tâches terminées",           categorie: "performance" },
  { id: "fifty_tasks", nom: "Machine",           icon: "🤖", description: "50 tâches terminées",           categorie: "performance" },
  { id: "century",     nom: "Centurion",         icon: "💯", description: "100 tâches terminées",          categorie: "performance" },
  { id: "pts_100",     nom: "Débutant",          icon: "🥉", description: "100 points gagnés",             categorie: "points" },
  { id: "pts_500",     nom: "Confirmé",          icon: "🥈", description: "500 points gagnés",             categorie: "points" },
  { id: "pts_1000",    nom: "Expert",            icon: "🥇", description: "1000 points gagnés",            categorie: "points" },
  { id: "pts_5000",    nom: "Maître",            icon: "👑", description: "5000 points gagnés",            categorie: "points" },
  { id: "streak_3",    nom: "3 jours de suite",  icon: "🔥", description: "Actif 3 jours consécutifs",    categorie: "streak" },
  { id: "streak_7",    nom: "Semaine parfaite",  icon: "📅", description: "Actif 7 jours consécutifs",    categorie: "streak" },
  { id: "streak_30",   nom: "Mois de feu",       icon: "🌟", description: "Actif 30 jours consécutifs",   categorie: "streak" },
  { id: "early_bird",  nom: "Lève-tôt",          icon: "🌅", description: "Tâche terminée avant 8h",      categorie: "special" },
  { id: "night_owl",   nom: "Noctambule",        icon: "🦉", description: "Tâche terminée après 23h",     categorie: "special" },
  { id: "speedster",   nom: "Fulgurant",         icon: "⚡", description: "5 tâches terminées en 1 jour", categorie: "special" },
]

const COACH_STYLES_LIST = [
  { id: 'bienveillant', nom: 'Alex', emoji: 'heart', desc: 'Doux & encourageant' },
  { id: 'motivateur',   nom: 'Max',  emoji: 'flame', desc: 'Energique & challengeant' },
  { id: 'analytique',   nom: 'Nova', emoji: 'chart', desc: 'Précis & factuel' },
]

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Tableau de bord',  path: '/dashboard',     dataOnboarding: null },
  { icon: Bot,             label: 'Assistant IA',     path: '/ia',            dataOnboarding: 'nav-ia' },
  { icon: Sparkles,        label: 'Tomorrow Builder', path: '/tomorrow',      dataOnboarding: 'nav-tomorrow' },
  { icon: Flag,            label: 'Goal Reverse',     path: '/goal',          dataOnboarding: null },
  { icon: BarChart2,       label: 'Analytiques',      path: '/analytics',     dataOnboarding: 'nav-analytics' },
  { icon: Calendar,        label: 'Planification',    path: '/planification', dataOnboarding: 'nav-planification' },
  { icon: Users,           label: 'Collaboration',    path: '/collaboration', dataOnboarding: 'nav-collaboration' },
  { icon: HelpCircle,      label: 'Aide',             path: '/help',          dataOnboarding: null },
]

// ── SVG icons inline (évite re-import inutile) ────────────────────────
const IconLock = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconLink = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const IconUnlink = ({ size = 13, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"/>
    <path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"/>
    <line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/>
    <line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/>
  </svg>
)

// ── Composants atomiques memoïsés ─────────────────────────────────────
const AnimatedNumber = memo(function AnimatedNumber({ value }) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    let start = 0
    const timer = setInterval(() => {
      start += 1; setDisplay(start)
      if (start >= value) clearInterval(timer)
    }, 800 / value)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}</span>
})

import React from 'react'
import axios from 'axios'
const API = 'https://getshift-backend.onrender.com'

// ── PrioriteSelect memoïsé ─────────────────────────────────────────────
const PrioriteSelect = memo(function PrioriteSelect({ value, onChange, T }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  const current = PRIORITES.find(p => p.val === value) || PRIORITES[1]
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: current.bg, border: `1.5px solid ${current.color}50`, borderRadius: 10, color: current.color, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        whileHover={{ scale: 1.03 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: current.color, display: 'inline-block' }} />
        {current.label}<ChevronDown size={12} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, background: 'white', border: '1px solid #e0e0e0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 130 }}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {PRIORITES.map(p => (
              <motion.button key={p.val}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: value === p.val ? p.bg : 'transparent', border: 'none', color: p.color, fontSize: 13, fontWeight: value === p.val ? 700 : 500, cursor: 'pointer' }}
                onClick={() => { onChange(p.val); setOpen(false) }} whileHover={{ background: p.bg }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                {p.label}{value === p.val && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ── SousTaches memoïsé ────────────────────────────────────────────────
const SousTaches = memo(function SousTaches({ tache, T }) {
  const [sousTaches,        setSousTaches]        = React.useState([])
  const [nouvelleSousTache, setNouvelleSousTache] = React.useState('')
  const [loading,           setLoading]           = React.useState(false)
  const [ajoutVisible,      setAjoutVisible]      = React.useState(false)

  React.useEffect(() => { charger() }, [tache.id])

  const charger = async () => {
    try { const r = await axios.get(`${API}/taches/${tache.id}/sous-taches`); setSousTaches(r.data) } catch {}
  }
  const ajouter = async () => {
    if (!nouvelleSousTache.trim()) return; setLoading(true)
    try { await axios.post(`${API}/taches/${tache.id}/sous-taches`, { titre: nouvelleSousTache, ordre: sousTaches.length }); setNouvelleSousTache(''); setAjoutVisible(false); await charger() } catch {}
    setLoading(false)
  }
  const toggle = async (st) => {
    try { await axios.put(`${API}/sous-taches/${st.id}`, { terminee: !st.terminee }); await charger() } catch {}
  }
  const supprimer = async (id) => {
    try { await axios.delete(`${API}/sous-taches/${id}`); await charger() } catch {}
  }
  const terminees = sousTaches.filter(st => st.terminee).length
  const pct = sousTaches.length > 0 ? Math.round((terminees / sousTaches.length) * 100) : 0

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
      {sousTaches.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 4 }}>
            <span>{terminees}/{sousTaches.length} sous-tâches</span>
            <span style={{ color: T.accent, fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, #4caf82)`, borderRadius: 99 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      )}
      <AnimatePresence>
        {sousTaches.map((st, i) => (
          <motion.div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.border}30` }}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
            <motion.button style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${st.terminee ? '#4caf82' : T.border}`, background: st.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => toggle(st)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
              {st.terminee && <CheckSquare size={8} color="white" strokeWidth={3} />}
            </motion.button>
            <span style={{ flex: 1, fontSize: 12, color: st.terminee ? T.text2 : T.text, textDecoration: st.terminee ? 'line-through' : 'none' }}>{st.titre}</span>
            <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, display: 'flex' }} onClick={() => supprimer(st.id)} whileHover={{ color: '#e05c5c' }}>
              <Trash2 size={11} strokeWidth={1.8} />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
      {ajoutVisible ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input style={{ flex: 1, padding: '5px 10px', background: T.bg3, border: `1px solid ${T.accent}40`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none' }}
            placeholder="Nouvelle sous-tâche..." value={nouvelleSousTache}
            onChange={e => setNouvelleSousTache(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ajouter(); if (e.key === 'Escape') setAjoutVisible(false) }} autoFocus />
          <motion.button style={{ padding: '5px 10px', background: T.accent, border: 'none', borderRadius: 8, color: T.bg, fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            onClick={ajouter} whileHover={{ scale: 1.03 }}>{loading ? '...' : 'OK'}</motion.button>
          <motion.button style={{ padding: '5px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, cursor: 'pointer' }}
            onClick={() => { setAjoutVisible(false); setNouvelleSousTache('') }} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>✕</motion.button>
        </div>
      ) : (
        <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, padding: '4px 8px', background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, cursor: 'pointer' }}
          onClick={() => setAjoutVisible(true)} whileHover={{ borderColor: T.accent, color: T.accent }}>
          <Plus size={11} strokeWidth={2} />Ajouter une sous-tâche
        </motion.button>
      )}
    </div>
  )
})

// ── Dependances memoïsé ───────────────────────────────────────────────
const Dependances = memo(function Dependances({ tache, toutesLesTaches, T, onUpdate }) {
  const [dependances,   setDependances]   = React.useState([])
  const [showDropdown,  setShowDropdown]  = React.useState(false)
  const [loading,       setLoading]       = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => { charger() }, [tache.id])
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const charger = async () => {
    try { const r = await axios.get(`${API}/taches/${tache.id}/dependances`); setDependances(r.data) } catch {}
  }
  const ajouter = async (id) => {
    setLoading(true)
    try { await axios.post(`${API}/taches/${tache.id}/dependances`, { depend_de_id: id }); await charger(); setShowDropdown(false); onUpdate?.() } catch {}
    setLoading(false)
  }
  const supprimer = async (id) => {
    try { await axios.delete(`${API}/dependances/${id}`); await charger(); onUpdate?.() } catch {}
  }

  const depIds = dependances.map(d => d.depend_de_id)
  const disponibles = toutesLesTaches.filter(t => t.id !== tache.id && !depIds.includes(t.id) && !t.terminee)
  const cp = (p) => p === 'haute' ? '#e05c5c' : p === 'moyenne' ? '#e08a3c' : '#4caf82'

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: dependances.length > 0 ? 8 : 6 }}>
        <IconLink size={12} color={T.text2} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, letterSpacing: 0.5 }}>PRÉREQUIS</span>
        {dependances.length > 0 && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 700 }}>{dependances.filter(d => d.terminee).length}/{dependances.length} terminés</span>}
      </div>
      <AnimatePresence>
        {dependances.map((dep, i) => (
          <motion.div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 5, borderRadius: 8, background: dep.terminee ? 'rgba(76,175,130,0.07)' : 'rgba(224,92,92,0.06)', border: `1px solid ${dep.terminee ? 'rgba(76,175,130,0.2)' : 'rgba(224,92,92,0.15)'}` }}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: dep.terminee ? '#4caf82' : 'transparent', border: `2px solid ${dep.terminee ? '#4caf82' : '#e05c5c'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dep.terminee ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <IconLock size={9} color="#e05c5c" />}
            </div>
            <span style={{ flex: 1, fontSize: 12, color: dep.terminee ? T.text2 : T.text, textDecoration: dep.terminee ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.titre_prerequis}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: dep.terminee ? '#4caf82' : '#e05c5c', flexShrink: 0, padding: '1px 6px', borderRadius: 99, background: dep.terminee ? 'rgba(76,175,130,0.1)' : 'rgba(224,92,92,0.1)' }}>{dep.terminee ? 'Terminé' : 'En attente'}</span>
            <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={() => supprimer(dep.id)} whileHover={{ color: '#e05c5c' }}><IconUnlink size={12} color="currentColor" /></motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={ref} style={{ position: 'relative', marginTop: 4 }}>
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, cursor: disponibles.length === 0 ? 'not-allowed' : 'pointer', opacity: disponibles.length === 0 ? 0.5 : 1 }}
          onClick={() => disponibles.length > 0 && setShowDropdown(!showDropdown)}
          whileHover={disponibles.length > 0 ? { borderColor: T.accent, color: T.accent } : {}}>
          <IconLink size={11} color="currentColor" />
          {disponibles.length === 0 ? 'Aucune tâche disponible' : 'Ajouter un prérequis'}
        </motion.button>
        <AnimatePresence>
          {showDropdown && (
            <motion.div style={{ position: 'absolute', bottom: '110%', left: 0, zIndex: 300, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 -8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 230, maxHeight: 200, overflowY: 'auto' }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, borderBottom: `1px solid ${T.border}` }}>CHOISIR UN PRÉREQUIS</div>
              {disponibles.map(t => (
                <motion.button key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: T.text, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                  onClick={() => ajouter(t.id)} whileHover={{ background: `${T.accent}10`, color: T.accent }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cp(t.priorite), flexShrink: 0 }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titre}</span>
                  <span style={{ fontSize: 10, color: cp(t.priorite), flexShrink: 0 }}>{t.priorite}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

// ── Coach icon helper ─────────────────────────────────────────────────
const CoachIcon = ({ style, size = 16 }) => {
  if (style?.emoji === 'heart') return <Heart size={size} color="#e05c5c" fill="#e05c5c" />
  if (style?.emoji === 'flame') return <Flame size={size} color="#e08a3c" />
  if (style?.emoji === 'chart') return <BarChart size={size} color="#6c63ff" />
  return <Target size={size} color="white" />
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — pur shell de rendu
// ══════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const d = useDashboard()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const coachStyleObj = COACH_STYLES_LIST.find(s => s.id === d.coachStyle)
  const { statsTaches: { total, terminees, haute, enCours, pct }, T } = d

  const pColor = (p) => p === 'haute' ? '#e05c5c' : p === 'moyenne' ? '#e08a3c' : '#4caf82'
  const pBg    = (p) => p === 'haute' ? 'rgba(224,92,92,0.12)' : p === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .forms-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .main-padding { padding: 16px !important; }
          h1 { font-size: 20px !important; }
        }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
      `}</style>

      {/* ── NOTIFICATIONS ── */}
      <AnimatePresence>
        {d.notification && (
          <motion.div style={{ position: 'fixed', top: 'clamp(16px,4vh,24px)', right: 'clamp(16px,4vw,24px)', zIndex: 1000, maxWidth: 'min(400px,90vw)', background: T.bg2, border: `1px solid ${d.notification.type === 'error' ? '#e05c5c50' : T.border}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.notification.type === 'error' ? '#e05c5c' : '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{d.notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BADGE NOTIF ── */}
      <AnimatePresence>
        {d.badgeNotif && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
            style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: T.bg2, border: `2px solid ${T.accent}`, borderRadius: 20, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: `0 8px 40px ${T.accent}40`, minWidth: 280 }}>
            <motion.span animate={{ rotate: [0,-15,15,-10,10,0], scale: [1,1.3,1.3,1.1,1] }} transition={{ duration: 0.6 }} style={{ fontSize: 32 }}>{d.badgeNotif.icon}</motion.span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1, marginBottom: 2 }}>BADGE DÉBLOQUÉ !</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{d.badgeNotif.nom}</div>
              <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{d.badgeNotif.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 'min(248px,80%)', maxWidth: 248, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px,3vh,24px) clamp(12px,2vw,16px)', position: 'fixed', top: 0, left: isMobile ? (d.showSidebar ? 0 : '-100%') : 0, height: '100vh', transition: 'left 0.3s ease', zIndex: 150, overflowY: 'auto', paddingBottom: 80 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'clamp(24px,4vh,32px)', padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 'clamp(14px,2vw,16px)', fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>GetShift</span>
        </div>

        {/* Nav */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = window.location.pathname === item.path
          return (
            <motion.button key={item.path}
              data-onboarding={item.dataOnboarding || undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) d.setShowSidebar(false) }}
              whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </motion.button>
          )
        })}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Filtres */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>FILTRES</p>
        {[
          { val: 'toutes',   label: 'Toutes les tâches' },
          { val: 'haute',    label: 'Priorité haute' },
          { val: 'bloquee',  label: `Bloquées${d.bloquees > 0 ? ` (${d.bloquees})` : ''}` },
          { val: 'terminee', label: 'Terminées' },
        ].map(f => (
          <motion.button key={f.val}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', borderRadius: 10, color: d.filtre === f.val ? T.accent : T.text2, background: d.filtre === f.val ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: d.filtre === f.val ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
            onClick={() => { d.setFiltre(f.val); if (isMobile) d.setShowSidebar(false) }} whileHover={{ x: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.val === 'bloquee' && <IconLock size={12} color={d.filtre === f.val ? T.accent : T.text2} />}
              {f.label}
            </span>
            {d.filtre === f.val && <ChevronRight size={14} />}
          </motion.button>
        ))}

        {/* Avatar / Profile menu */}
        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <motion.button onClick={() => d.setShowProfileMenu(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, background: d.showProfileMenu ? `${T.accent}15` : T.bg3, border: `1.5px solid ${d.showProfileMenu ? T.accent + '60' : T.border}`, cursor: 'pointer', textAlign: 'left' }}
            whileHover={{ background: `${T.accent}12` }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {d.user?.nom?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.user?.nom}</div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Niveau {d.niveau} · {d.points} pts</div>
            </div>
            <ChevronUp size={14} color={T.accent} style={{ transform: d.showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
          </motion.button>

          <AnimatePresence>
            {d.showProfileMenu && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => d.setShowProfileMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)', zIndex: 300, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                        {d.user?.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.user?.nom}</div>
                        <div style={{ fontSize: 11, color: T.text2 }}>{d.user?.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 5 }}>
                      <span>Niveau {d.niveau} — {d.niveauActuel.label}</span>
                      <span style={{ color: T.accent, fontWeight: 600 }}>{d.points} pts</span>
                    </div>
                    <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${d.pctNiveau}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99 }} />
                    </div>
                    {d.streak > 0 && <div style={{ fontSize: 10, color: '#e08a3c', fontWeight: 600, marginTop: 6 }}>🔥 {d.streak} jour{d.streak > 1 ? 's' : ''} de streak</div>}
                  </div>
                  <div style={{ padding: '6px' }}>
                    {[
                      { label: 'Mon profil', icon: User, onClick: () => { navigate('/profile'); d.setShowProfileMenu(false) } },
                      { label: 'Paramètres', icon: Settings, onClick: () => { d.setShowSettings(true); d.setShowProfileMenu(false) }, shortcut: '⌘ ,' },
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
                  <div style={{ height: 1, background: T.border, margin: '2px 0' }} />
                  <div style={{ padding: '6px' }}>
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left' }}
                      whileHover={{ background: `${T.accent}10` }}>
                      <Star size={15} strokeWidth={1.8} />Passer à Pro — 4,99€/mois
                    </motion.button>
                  </div>
                  <div style={{ height: 1, background: T.border, margin: '2px 0' }} />
                  <div style={{ padding: '6px' }}>
                    <motion.button onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                      whileHover={{ background: 'rgba(224,92,92,0.08)' }}>
                      <LogOut size={15} strokeWidth={1.8} />Se déconnecter
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 40, height: 40, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => d.setShowSidebar(s => !s)}>
          <Menu size={20} />
        </motion.button>
      )}
      {isMobile && d.showSidebar && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 140 }} onClick={() => d.setShowSidebar(false)} />}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MAIN */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <main className="main-padding" style={{ marginLeft: isMobile ? 0 : 248, flex: 1, padding: 'clamp(16px,4vw,40px)', minWidth: 0 }}>

        {/* Bannière guide */}
        <AnimatePresence>
          {d.showGuideBanner && (
            <motion.div style={{ background: `linear-gradient(135deg, ${T.accent}20, ${T.accent2}15)`, border: `1px solid ${T.accent}40`, borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HelpCircle size={18} color={T.accent} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Bienvenue sur GetShift !</div>
                  <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Consultez le guide pour démarrer.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button style={{ padding: '8px 16px', background: T.accent, border: 'none', borderRadius: 8, color: T.bg, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { localStorage.setItem('guide_vu', 'true'); d.setShowGuideBanner(false); navigate('/help') }}>Voir le guide</motion.button>
                <motion.button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { localStorage.setItem('guide_vu', 'true'); d.setShowGuideBanner(false) }}>Plus tard</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bannière PWA */}
        <AnimatePresence>
          {d.showInstallBanner && !d.appInstalled && (
            <motion.div style={{ background: 'linear-gradient(135deg,#6c63ff20,#63b3ed15)', border: '1px solid #6c63ff40', borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6c63ff,#63b3ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📲</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Installer GetShift</div>
                  <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Accédez à vos tâches depuis votre écran d'accueil, même hors ligne.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button style={{ padding: '8px 16px', background: '#6c63ff', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={d.installerApp}>Installer</motion.button>
                <motion.button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => d.setShowInstallBanner(false)}>Plus tard</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bannière Offline */}
        <AnimatePresence>
          {!d.isOnline && (
            <motion.div style={{ background: 'rgba(224,138,60,0.1)', border: '1px solid rgba(224,138,60,0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(224,138,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📡</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e08a3c' }}>Mode hors ligne</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
                  {d.pendingActions > 0 ? `${d.pendingActions} action(s) en attente` : 'Modifications synchronisées au retour du réseau'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div style={{ marginBottom: 'clamp(24px,4vh,32px)', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: 12, paddingTop: isMobile ? 48 : 0 }}
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>{d.salut}, {d.user?.nom?.split(' ')[0]}</h1>
            <p style={{ color: T.text2, fontSize: 13, marginTop: 4 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 99, color: T.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => d.setShowExport(true)} whileHover={{ scale: 1.02 }}>
              <Download size={14} /> Exporter
            </motion.button>
            <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 99, color: T.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onClick={d.ouvrirTemplates} whileHover={{ scale: 1.02 }}>
              <BookOpen size={14} /> Templates
            </motion.button>
            {d.rappels.length > 0 && (
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 99, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                onClick={() => d.setShowRappels(s => !s)} whileHover={{ scale: 1.02 }}>
                <Bell size={14} />{d.rappels.length} rappel{d.rappels.length > 1 ? 's' : ''}
              </motion.button>
            )}
          </div>
        </motion.div>

        <ExportModal isOpen={d.showExport} onClose={() => d.setShowExport(false)} taches={d.taches} stats={{ total, terminees, haute, enCours, pct }} user={d.user} theme={d.theme} />

        {/* Rappels */}
        <AnimatePresence>
          {d.showRappels && d.rappels.length > 0 && (
            <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 14, padding: 'clamp(12px,3vw,20px)', marginBottom: 24 }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {d.rappels.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(224,92,92,0.1)', gap: 8 }}>
                  <span style={{ fontSize: 13, color: T.text }}>{r.titre}</span>
                  <span style={{ fontSize: 12, color: r.jours_restants === 0 ? '#e05c5c' : '#e08a3c', fontWeight: 600 }}>
                    {r.jours_restants === 0 ? "Aujourd'hui" : r.jours_restants === 1 ? 'Demain' : `Dans ${r.jours_restants}j`}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'clamp(8px,2vw,12px)', marginBottom: 16 }}>
          {[
            { icon: CheckSquare, val: total,    label: 'Total',          color: T.accent },
            { icon: CheckSquare, val: terminees,label: 'Terminées',      color: '#4caf82' },
            { icon: AlertTriangle,val: haute,   label: 'Haute priorité', color: '#e05c5c' },
            { icon: Clock,       val: enCours,  label: 'En cours',       color: '#6c63ff' },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px,2vw,16px)' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -2, borderColor: stat.color + '60' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <Icon size={16} color={stat.color} strokeWidth={1.8} />
                  <span style={{ fontSize: 10, color: T.text2, background: T.bg3, padding: '2px 6px', borderRadius: 99 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 'clamp(20px,5vw,26px)', fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>
                  <AnimatedNumber value={stat.val} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Alerte bloquées */}
        <AnimatePresence>
          {d.bloquees > 0 && (
            <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <IconLock size={15} color="#e05c5c" />
              <span style={{ flex: 1, fontSize: 13, color: '#e05c5c', fontWeight: 500 }}>{d.bloquees} tâche{d.bloquees > 1 ? 's bloquées' : ' bloquée'} — des prérequis doivent être terminés en premier.</span>
              <motion.button style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, color: '#e05c5c', fontSize: 12, cursor: 'pointer' }}
                onClick={() => d.setFiltre('bloquee')} whileHover={{ background: 'rgba(224,92,92,0.08)' }}>Voir</motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progression */}
        <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px,3vw,20px)', marginBottom: 24 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: T.text2, fontWeight: 500 }}>Progression globale</span>
            <span style={{ color: T.accent, fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, borderRadius: 99 }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.16,1,0.3,1] }} />
          </div>
        </motion.div>

        {/* Formulaires */}
        <div className="forms-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(12px,2vw,16px)', marginBottom: 24 }}>
          {/* Nouvelle tâche */}
          <motion.div data-onboarding="form-tache" style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px,3vw,20px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} color={T.accent} /> Nouvelle tâche
            </p>
            <input style={{ width: '100%', padding: 'clamp(8px,2vw,10px) clamp(12px,2.5vw,14px)', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              placeholder="Que dois-tu faire ?" value={d.titre} onChange={e => d.setTitre(e.target.value)} onKeyDown={e => e.key === 'Enter' && d.ajouterTache()} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <PrioriteSelect value={d.priorite} onChange={d.setPriorite} T={T} />
              <DatePicker selected={d.deadline} onChange={d.setDeadline} locale="fr" dateFormat="dd/MM/yyyy HH:mm" showTimeSelect timeFormat="HH:mm" timeIntervals={15} minDate={new Date()} placeholderText="📅 Date & heure *"
                customInput={<input style={{ padding: '8px 12px', background: T.bg3, border: `1px solid ${!d.deadline && d.erreurForm ? '#e05c5c' : T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer', width: '100%' }} />} />
              <motion.button style={{ padding: 'clamp(7px,1.5vw,9px) clamp(12px,3vw,16px)', background: T.accent, color: T.bg, border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                onClick={d.ajouterTache} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Ajouter</motion.button>
              <motion.button style={{ padding: 'clamp(7px,1.5vw,9px) clamp(10px,2vw,13px)', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={d.genererSousTachesIA} disabled={d.iaLoading}>
                {d.iaLoading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>⏳</motion.span> : <Sparkles size={13} />}
                {d.iaLoading ? 'IA...' : 'Sous-tâches IA'}
              </motion.button>
            </div>
            {d.erreurForm && <p style={{ fontSize: 12, color: '#e05c5c', marginTop: 6 }}>{d.erreurForm}</p>}
          </motion.div>

          {/* Générer avec IA */}
          <motion.div data-onboarding="form-ia" style={{ background: T.bg2, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: 'clamp(12px,3vw,20px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} strokeWidth={2} color={T.accent} /> Générer avec l'IA
            </p>
            <input style={{ width: '100%', padding: 'clamp(8px,2vw,10px) clamp(12px,2.5vw,14px)', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              placeholder="Ex: Apprendre React..." value={d.objectif} onChange={e => d.setObjectif(e.target.value)} onKeyDown={e => e.key === 'Enter' && d.genererTaches()} />
            <motion.button style={{ width: '100%', padding: 'clamp(7px,1.5vw,9px) clamp(12px,3vw,16px)', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              onClick={d.genererTaches} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              Générer 5 tâches automatiquement
            </motion.button>
          </motion.div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['toutes','Toutes'],['haute','Haute'],['moyenne','Moyenne'],['basse','Basse'],['bloquee','Bloquées'],['terminee','Terminées']].map(([val, label]) => (
            <motion.button key={val}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: d.filtre === val ? `${T.accent}15` : 'transparent', border: `1px solid ${d.filtre === val ? T.accent : T.border}`, borderRadius: 99, color: d.filtre === val ? T.accent : T.text2, fontSize: 12, fontWeight: d.filtre === val ? 600 : 400, cursor: 'pointer' }}
              onClick={() => d.setFiltre(val)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {val === 'bloquee' && <IconLock size={11} color="currentColor" />}
              {label}
              {val === 'bloquee' && d.bloquees > 0 && <span style={{ background: '#e05c5c', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{d.bloquees}</span>}
            </motion.button>
          ))}
        </div>

        {/* Liste tâches */}
        {d.loading ? (
          <div style={{ textAlign: 'center', padding: 'clamp(40px,10vh,60px) 20px', color: T.text2 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Target size={32} color={T.accent} /></motion.div>
            <p style={{ marginTop: 12, fontSize: 13 }}>Chargement...</p>
          </div>
        ) : d.tachesFiltrees.length === 0 ? (
          <motion.div style={{ textAlign: 'center', padding: 'clamp(40px,10vh,60px) 20px', color: T.text2 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckSquare size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Aucune tâche ici</p>
            <p style={{ fontSize: 13, marginTop: 6, color: T.accent }}>Ajoute une tâche ou génère-en avec l'IA</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {d.tachesFiltrees.map((tache, i) => {
              const pts = tache.priorite === 'haute' ? 30 : tache.priorite === 'moyenne' ? 20 : 10
              const isExpanded = d.expandedTaches[tache.id]
              const currentMode = d.expandMode[tache.id]
              const isBloquee = tache.bloquee && !tache.terminee
              return (
                <motion.div key={tache.id}
                  style={{ background: T.bg2, border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.3)' : T.border}`, borderRadius: 12, padding: 'clamp(10px,2vw,14px)', marginBottom: 8, opacity: tache.terminee ? 0.5 : 1, position: 'relative', overflow: 'visible' }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: tache.terminee ? 0.5 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ borderColor: isBloquee ? 'rgba(224,92,92,0.5)' : T.accent + '40' }}>
                  {isBloquee && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#e05c5c,#e08a3c)', borderRadius: '12px 0 0 12px' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: isBloquee ? 8 : 0 }}>
                    {isBloquee ? (
                      <motion.div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' }}
                        animate={{ scale: [1,1.08,1] }} transition={{ duration: 2, repeat: Infinity }}>
                        <IconLock size={10} color="#e05c5c" />
                      </motion.div>
                    ) : (
                      <motion.button style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${tache.terminee ? '#4caf82' : T.border}`, background: tache.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => d.toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                        {tache.terminee && <CheckSquare size={10} color="white" strokeWidth={3} />}
                      </motion.button>
                    )}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, textDecoration: tache.terminee ? 'line-through' : 'none', color: tache.terminee ? T.text2 : isBloquee ? T.text2 : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tache.titre}</span>
                        {isBloquee && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: 'rgba(224,92,92,0.12)', color: '#e05c5c', fontWeight: 600, flexShrink: 0 }}>Bloquée</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        {tache.deadline && <span style={{ fontSize: 11, color: T.text2 }}>{new Date(tache.deadline).toLocaleDateString('fr-FR')}</span>}
                        {!tache.terminee && !isBloquee && <span style={{ fontSize: 11, color: T.accent }}>+{pts} pts</span>}
                      </div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: pBg(tache.priorite), color: pColor(tache.priorite), flexShrink: 0 }}>{tache.priorite}</span>
                    {tache.deadline && !tache.terminee && (
                      <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', background: 'white', border: '1px solid #dadce0', borderRadius: 8, fontSize: 11, cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        onClick={() => d.exporterGoogleCalendar(tache)} title="Exporter vers Google Calendar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="18" rx="2" fill="white" stroke="#dadce0" strokeWidth="1.2"/><rect x="2" y="4" width="20" height="5.5" rx="2" fill="#1a73e8"/><rect x="2" y="7.5" width="20" height="2" fill="#1a73e8"/><rect x="6" y="2" width="2" height="4" rx="1" fill="#1a73e8"/><rect x="16" y="2" width="2" height="4" rx="1" fill="#1a73e8"/><text x="12" y="19" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1a73e8" fontFamily="Arial">CAL</text></svg>
                        <span style={{ color: '#3c4043', fontWeight: 500, display: isMobile ? 'none' : 'inline' }}>Calendar</span>
                      </motion.button>
                    )}
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: isExpanded && currentMode === 'dependances' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'dependances' ? T.accent : T.border}`, borderRadius: 8, color: isExpanded && currentMode === 'dependances' ? T.accent : T.text2, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => d.toggleExpand(tache.id, 'dependances')} whileHover={{ borderColor: T.accent, color: T.accent }}>
                      <IconLink size={12} color="currentColor" />
                      <span style={{ display: isMobile ? 'none' : 'inline' }}>Prérequis</span>
                    </motion.button>
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: isExpanded && currentMode === 'sousTaches' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'sousTaches' ? T.accent : T.border}`, borderRadius: 8, color: isExpanded && currentMode === 'sousTaches' ? T.accent : T.text2, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => d.toggleExpand(tache.id, 'sousTaches')} whileHover={{ borderColor: T.accent, color: T.accent }}>
                      {isExpanded && currentMode === 'sousTaches' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <span style={{ display: isMobile ? 'none' : 'inline' }}>Sous-tâches</span>
                    </motion.button>
                    <motion.button style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.2)' : T.border}`, color: isBloquee ? 'rgba(224,92,92,0.4)' : T.text2, borderRadius: 8, fontSize: 12, cursor: isBloquee ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                      onClick={() => !isBloquee && d.toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)}
                      whileHover={!isBloquee ? { borderColor: '#4caf82', color: '#4caf82' } : {}}>
                      {tache.terminee ? 'Rouvrir' : isBloquee ? 'Bloquée' : 'Terminer'}
                    </motion.button>
                    <motion.button style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.text2, display: 'flex', flexShrink: 0 }}
                      onClick={() => d.supprimerTache(tache.id)} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                      <Trash2 size={14} strokeWidth={1.8} />
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                        {currentMode === 'sousTaches'   && <SousTaches tache={tache} T={T} />}
                        {currentMode === 'dependances'  && <Dependances tache={tache} toutesLesTaches={d.taches} T={T} onUpdate={d.chargerTaches} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </main>

      {/* ── ONBOARDING ── */}
      {d.showOnboarding && (
        <Onboarding T={T} onTerminer={() => { localStorage.setItem('onboarding_termine', 'true'); d.setShowOnboarding(false) }} activerNotifications={d.activerNotifications} />
      )}

      {/* ── PANEL IA SOUS-TACHES ── */}
      <AnimatePresence>
        {d.iaPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => d.setIaPanel(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 998, backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999, background: T.bg2, borderRadius: '24px 24px 0 0', padding: 'clamp(20px,4vw,32px)', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${T.border}`, boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ width: 40, height: 4, background: T.border, borderRadius: 99, margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color={T.accent} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Sous-tâches générées par l'IA</h3>
                  <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>Pour : <span style={{ color: T.accent, fontWeight: 600 }}>"{d.titrePourIA}"</span>
                    {d.iaType && <span style={{ marginLeft: 8, background: `${T.accent}18`, color: T.accent, borderRadius: 99, padding: '1px 8px', fontSize: 11 }}>{d.iaType}</span>}
                  </p>
                </div>
              </div>
              {d.iaConseil && (
                <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6 }}>💡 {d.iaConseil}</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {d.iaSousTaches.map((st, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => d.toggleSousTacheIA(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: st.selectionne ? `${T.accent}12` : T.bg3, border: `1.5px solid ${st.selectionne ? T.accent : T.border}`, borderRadius: 12, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: st.selectionne ? T.accent : 'transparent', border: `2px solid ${st.selectionne ? T.accent : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {st.selectionne && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke={T.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: st.selectionne ? T.text : T.text2, fontWeight: st.selectionne ? 500 : 400, flex: 1, textDecoration: st.selectionne ? 'none' : 'line-through' }}>{st.titre}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 7px', background: st.priorite === 'haute' ? '#e05c5c22' : `${T.accent}18`, color: st.priorite === 'haute' ? '#e05c5c' : T.accent }}>{st.priorite}</span>
                  </motion.div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => d.setIaSousTaches(p => p.map(st => ({ ...st, selectionne: true })))} style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, cursor: 'pointer' }}>Tout sélectionner</button>
                <button onClick={() => d.setIaSousTaches(p => p.map(st => ({ ...st, selectionne: false })))} style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, cursor: 'pointer' }}>Tout désélectionner</button>
                <span style={{ fontSize: 11, color: T.text2, marginLeft: 'auto' }}>{d.iaSousTaches.filter(st => st.selectionne).length}/{d.iaSousTaches.length} sélectionnées</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button onClick={() => d.setIaPanel(false)} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text2, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</motion.button>
                <motion.button onClick={d.confirmerSousTachesIA} whileHover={{ scale: 1.02 }} style={{ flex: 2, padding: '11px 0', background: T.accent, border: 'none', borderRadius: 12, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Sparkles size={14} />Créer la tâche + {d.iaSousTaches.filter(st => st.selectionne).length} sous-tâches
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── COACH IA ── */}
      {!d.showCoach && (
        <motion.button onClick={d.ouvrirCoach} initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', cursor: 'pointer', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${T.accent}50` }}>
          <Target size={22} color="white" />
        </motion.button>
      )}
      <AnimatePresence>
        {d.showCoach && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} onClick={() => d.setShowCoach(false)} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 950 }} />
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }}
              style={{ position: 'fixed', bottom: 16, right: 16, left: 16, maxWidth: 420, margin: '0 auto', height: '80vh', maxHeight: 620, background: T.bg2, borderRadius: 20, border: `1px solid ${T.border}`, zIndex: 960, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: `linear-gradient(135deg, ${T.accent}15, transparent)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CoachIcon style={coachStyleObj} size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Coach {coachStyleObj?.nom}</div>
                    <div style={{ fontSize: 11, color: T.text2 }}>{coachStyleObj?.desc}</div>
                  </div>
                  <motion.button onClick={() => d.setShowCoach(false)} style={{ width: 30, height: 30, borderRadius: '50%', background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: 'none' }}>×</motion.button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {COACH_STYLES_LIST.map(s => (
                    <motion.button key={s.id} onClick={() => d.changerStyleCoach(s.id)} style={{ flex: 1, padding: '5px 0', background: d.coachStyle === s.id ? T.accent : T.bg3, border: `1px solid ${d.coachStyle === s.id ? T.accent : T.border}`, borderRadius: 8, color: d.coachStyle === s.id ? T.bg : T.text2, fontSize: 11, fontWeight: d.coachStyle === s.id ? 700 : 400, cursor: 'pointer' }}>
                      {s.nom}
                    </motion.button>
                  ))}
                </div>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
                {[['chat','Chat'],['rapport','Rapport']].map(([val, label]) => (
                  <button key={val} onClick={() => { d.setCoachTab(val); if (val === 'rapport' && !d.coachRapport) d.chargerRapportCoach() }}
                    style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: d.coachTab === val ? `2px solid ${T.accent}` : '2px solid transparent', color: d.coachTab === val ? T.accent : T.text2, fontSize: 13, fontWeight: d.coachTab === val ? 700 : 400, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* Chat */}
              {d.coachTab === 'chat' && (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {d.coachMessages.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 10px', color: T.text2 }}>
                        <p style={{ fontSize: 13, margin: 0 }}>Parle-moi de tes objectifs, tes blocages ou tes progrès !</p>
                      </div>
                    )}
                    {d.coachMessages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {m.role === 'assistant' && (
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>
                            <CoachIcon style={coachStyleObj} size={12} />
                          </div>
                        )}
                        <div style={{ maxWidth: '78%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? T.accent : T.bg3, color: m.role === 'user' ? T.bg : T.text, fontSize: 13, lineHeight: 1.5 }}>
                          {m.contenu}
                        </div>
                      </div>
                    ))}
                    {d.coachLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CoachIcon style={coachStyleObj} size={12} />
                        </div>
                        <div style={{ padding: '9px 13px', background: T.bg3, borderRadius: '14px 14px 14px 4px', display: 'flex', gap: 4 }}>
                          {[0,1,2].map(i => (
                            <motion.div key={i} animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                              style={{ width: 6, height: 6, borderRadius: '50%', background: T.text2 }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
                    <input value={d.coachInput} onChange={e => d.setCoachInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && d.envoyerMessageCoach()}
                      placeholder="Écris à ton coach..."
                      style={{ flex: 1, padding: '9px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 13, outline: 'none' }} />
                    <motion.button onClick={d.envoyerMessageCoach} disabled={d.coachLoading} whileTap={{ scale: 0.95 }}
                      style={{ width: 38, height: 38, borderRadius: 12, background: T.accent, border: 'none', color: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>➤</motion.button>
                  </div>
                </>
              )}
              {/* Rapport */}
              {d.coachTab === 'rapport' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                  {d.coachRapportLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 13, color: T.text2 }}>Génération du rapport...</p>
                    </div>
                  ) : d.coachRapport ? (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>
                          {d.coachRapport.note_semaine >= 8 ? <Trophy size={32} color='#e08a3c' /> : <CheckCircle2 size={32} color='#4caf82' />}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>{d.coachRapport.titre}</h3>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 99, background: `${T.accent}18`, border: `1px solid ${T.accent}30` }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{d.coachRapport.note_semaine}</span>
                          <span style={{ fontSize: 12, color: T.text2 }}>/10</span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {[
                          { label: 'Complétées', val: d.coachRapport.stats?.terminees_semaine, color: '#4caf82' },
                          { label: 'Créées', val: d.coachRapport.stats?.creees_semaine, color: T.accent },
                          { label: 'Taux global', val: `${d.coachRapport.stats?.taux_completion}%`, color: '#e08a3c' },
                          { label: 'Streak', val: `${d.coachRapport.stats?.streak}j`, color: '#6c63ff' },
                        ].map((s, i) => (
                          <div key={i} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {[
                        { label: 'Point fort', val: d.coachRapport.point_fort, color: '#4caf82' },
                        { label: 'À améliorer', val: d.coachRapport.point_amelioration, color: '#e08a3c' },
                        { label: 'Défi semaine', val: d.coachRapport.defi_semaine_prochaine, color: T.accent },
                      ].map((s, i) => (
                        <div key={i} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.label}</div>
                          <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.5 }}>{s.val}</p>
                        </div>
                      ))}
                      <motion.button onClick={d.chargerRapportCoach} style={{ width: '100%', padding: 10, background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        Régénérer le rapport
                      </motion.button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <p style={{ fontSize: 13, color: T.text2, marginBottom: 16 }}>Génère ton rapport de coaching hebdomadaire</p>
                      <motion.button onClick={d.chargerRapportCoach} whileHover={{ scale: 1.03 }}
                        style={{ padding: '10px 20px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', borderRadius: 12, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        Générer mon rapport
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DRAWER PARAMÈTRES ── */}
      <AnimatePresence>
        {d.showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => d.setShowSettings(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, backdropFilter: 'blur(3px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px,100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 1051, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={18} color={T.accent} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h2>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{d.user?.nom}</p>
                    </div>
                  </div>
                  <motion.button onClick={() => d.setShowSettings(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{ id: 'badges', label: 'Badges', icon: Award }, { id: 'theme', label: 'Thème', icon: Palette }, { id: 'integrations', label: 'Intégrations', icon: ExternalLink }].map(({ id, label, icon: Icon }) => (
                    <motion.button key={id} onClick={() => d.setActiveSettingsTab(id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px', background: 'none', border: 'none', borderBottom: d.activeSettingsTab === id ? `2px solid ${T.accent}` : '2px solid transparent', color: d.activeSettingsTab === id ? T.accent : T.text2, fontSize: 13, fontWeight: d.activeSettingsTab === id ? 600 : 400, cursor: 'pointer' }}>
                      <Icon size={14} strokeWidth={1.8} />{label}
                    </motion.button>
                  ))}
                </div>
              </div>
              {/* Contenu */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Badges */}
                {d.activeSettingsTab === 'badges' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                      <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: T.accent }}>{d.badgesObtenus.length}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>badges obtenus</div>
                      </div>
                      <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#e08a3c' }}>{d.streak}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>jours de streak</div>
                      </div>
                    </div>
                    {['performance','points','streak','special'].map(cat => (
                      <div key={cat} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>{cat}</div>
                        {BADGES_CONFIG.filter(b => b.categorie === cat).map(b => {
                          const obtenu = d.badgesObtenus.find(ob => ob.id === b.id)
                          return (
                            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: obtenu ? `${T.accent}08` : T.bg3, border: `1px solid ${obtenu ? T.accent + '30' : T.border}`, opacity: obtenu ? 1 : 0.45, marginBottom: 6 }}>
                              <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: obtenu ? 600 : 400, color: T.text }}>{b.nom}</div>
                                <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{b.description}</div>
                              </div>
                              {obtenu
                                ? <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4caf82', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </div>
                                : <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px dashed ${T.border}`, flexShrink: 0 }} />}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </motion.div>
                )}
                {/* Thème */}
                {d.activeSettingsTab === 'theme' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p style={{ fontSize: 13, color: T.text2, marginBottom: 16, lineHeight: 1.5 }}>Choisis l'apparence de GetShift.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(require('../themes').themes).map(([key, t]) => (
                        <motion.button key={key} onClick={() => d.changerTheme(key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: d.theme === key ? `${T.accent}12` : T.bg3, border: `1.5px solid ${d.theme === key ? T.accent : T.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
                          whileHover={{ borderColor: T.accent }}>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.bg }} />
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accent }} />
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accent2 || t.accent }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: d.theme === key ? 700 : 500, color: T.text }}>{t.name}</div>
                          </div>
                          {d.theme === key && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
                {/* Intégrations */}
                {d.activeSettingsTab === 'integrations' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4A154B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 16, color: 'white', fontWeight: 700 }}>S</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Slack</div>
                          <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Notifications dans votre canal</div>
                        </div>
                        {d.slackWebhook && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf82' }} />}
                      </div>
                      <input style={{ width: '100%', padding: '10px 14px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                        placeholder="https://hooks.slack.com/services/..." value={d.slackWebhook} onChange={e => d.setSlackWebhook(e.target.value)} />
                      <motion.button style={{ width: '100%', padding: 10, background: d.slackSaved ? '#4caf82' : `${T.accent}15`, border: `1px solid ${d.slackSaved ? '#4caf82' : T.accent + '40'}`, borderRadius: 10, color: d.slackSaved ? 'white' : T.accent, fontSize: 13, fontWeight: 600, cursor: d.slackSaving ? 'not-allowed' : 'pointer' }}
                        onClick={d.sauvegarderSlack}>
                        {d.slackSaving ? 'Sauvegarde...' : d.slackSaved ? '✓ Webhook sauvegardé !' : 'Sauvegarder le webhook'}
                      </motion.button>
                    </div>
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 16, color: 'white', fontWeight: 700 }}>G</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Google Calendar</div>
                          <div style={{ fontSize: 11, color: T.text2 }}>Exporter vos tâches vers Calendar</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.6, margin: 0 }}>Utilisez le bouton <strong style={{ color: T.text }}>Calendar</strong> sur chaque tâche pour l'exporter.</p>
                    </div>
                  </motion.div>
                )}
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

      {/* ── TASK DNA POPUP ── */}
      <AnimatePresence>
        {(d.dnaLoading || d.showDnaPopup) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, backdropFilter: 'blur(4px)' }}
              onClick={!d.dnaLoading ? d.annulerCreationApresDNA : undefined} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ position: 'fixed', top: 16, left: 16, right: 16, bottom: 16, maxWidth: 480, margin: '0 auto', overflowY: 'auto', background: T.bg2, borderRadius: 20, border: `1px solid ${T.border}`, zIndex: 1101, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
              {d.dnaLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Analyse du Task DNA en cours...</p>
                  <p style={{ fontSize: 12, color: T.text2, marginTop: 6 }}>L'IA étudie ton historique de tâches</p>
                </div>
              ) : d.dnaResult && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {d.dnaResult.emoji_categorie || '🧬'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Task DNA</h3>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${T.accent}18`, color: T.accent, fontWeight: 700 }}>IA</span>
                      </div>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{d.dnaResult.label_categorie} · {d.dnaResult.duree_label}</p>
                    </div>
                    <div style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: d.dnaResult.prediction === 'succes' ? 'rgba(76,175,130,0.15)' : d.dnaResult.prediction === 'abandon' ? 'rgba(224,92,92,0.15)' : 'rgba(224,138,60,0.15)', color: d.dnaResult.prediction === 'succes' ? '#4caf82' : d.dnaResult.prediction === 'abandon' ? '#e05c5c' : '#e08a3c' }}>
                      {d.dnaResult.prediction === 'succes' ? 'Succès prédit' : d.dnaResult.prediction === 'abandon' ? 'Risque abandon' : 'À surveiller'}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Score de viabilité</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: d.dnaResult.score_viabilite >= 70 ? '#4caf82' : d.dnaResult.score_viabilite >= 40 ? '#e08a3c' : '#e05c5c' }}>{d.dnaResult.score_viabilite}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${d.dnaResult.score_viabilite}%` }} transition={{ duration: 1 }}
                        style={{ height: '100%', borderRadius: 99, background: d.dnaResult.score_viabilite >= 70 ? '#4caf82' : d.dnaResult.score_viabilite >= 40 ? '#e08a3c' : '#e05c5c' }} />
                    </div>
                    {d.dnaResult.explication_score && <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 6, fontStyle: 'italic' }}>{d.dnaResult.explication_score}</p>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(76,175,130,0.07)', border: '1px solid rgba(76,175,130,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#4caf82', marginBottom: 6 }}>Points forts</div>
                      {(d.dnaResult.facteurs_succes || []).map((f, i) => <div key={i} style={{ fontSize: 11, color: T.text2, padding: '2px 0', lineHeight: 1.4 }}>· {f}</div>)}
                    </div>
                    <div style={{ background: 'rgba(224,92,92,0.07)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#e05c5c', marginBottom: 6 }}>Risques</div>
                      {(d.dnaResult.facteurs_risque || []).map((r, i) => <div key={i} style={{ fontSize: 11, color: T.text2, padding: '2px 0', lineHeight: 1.4 }}>· {r}</div>)}
                    </div>
                  </div>
                  <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}22`, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 4 }}>Conseil IA</div>
                    <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6 }}>{d.dnaResult.conseil_principal}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button onClick={d.annulerCreationApresDNA} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text2, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</motion.button>
                    <motion.button onClick={d.confirmerCreationApresDNA} whileHover={{ scale: 1.02 }} style={{ flex: 2, padding: '11px 0', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', borderRadius: 12, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> Créer la tâche
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TOAST UNDO ── */}
      <AnimatePresence>
        {d.undoToast && (
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }}
            style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
            <Trash2 size={15} color="#e05c5c" />
            <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Tâche supprimée</span>
            <div style={{ width: 60, height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
              <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} style={{ height: '100%', background: '#e05c5c', borderRadius: 99 }} />
            </div>
            <motion.button onClick={d.annulerSuppression} whileHover={{ scale: 1.05 }}
              style={{ padding: '5px 14px', background: `${T.accent}18`, border: `1px solid ${T.accent}50`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Annuler
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
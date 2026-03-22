import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { themes } from '../themes'
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
  Zap, Flame, Brain, Trophy, Medal, Star, Lightbulb, TrendingUp, Timer,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Send, MessageCircle,
  Rocket, Crown, Leaf, Globe, ArrowRight, Pencil, BarChart, Cpu,
  Smile, Coffee, Sunrise, Sunset, Moon, Activity, Shield, Heart,
  ChevronLeft, Dna, FlaskConical, Microscope, Flag
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import { useOffline } from '../useOffline'
import {
  sauvegarderTachesLocalement, lireTachesLocalement, sauvegarderProfilLocalement,
  lireProfilLocalement, ajouterTacheLocalement, mettreAJourTacheLocalement,
  supprimerTacheLocalement, ajouterActionSync,
} from '../db'
import ExportModal from './ExportModal'
import Onboarding from './Onboarding'

registerLocale('fr', fr)
const API = 'https://getshift-backend.onrender.com'

const IconLock = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    if (value === 0) { setDisplay(0); return }
    const timer = setInterval(() => {
      start += 1; setDisplay(start)
      if (start >= value) clearInterval(timer)
    }, 800 / value)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}</span>
}

const niveaux = [
  { niveau: 1, label: 'Debutant', min: 0 },
  { niveau: 2, label: 'Apprenti', min: 100 },
  { niveau: 3, label: 'Confirme', min: 250 },
  { niveau: 4, label: 'Expert', min: 500 },
  { niveau: 5, label: 'Maitre', min: 1000 },
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

const badges = BADGES_CONFIG // compatibilité

const PRIORITES = [
  { val: 'haute',   label: 'Haute',   bg: 'rgba(224,92,92,0.12)',   color: '#e05c5c' },
  { val: 'moyenne', label: 'Moyenne', bg: 'rgba(224,138,60,0.12)',  color: '#e08a3c' },
  { val: 'basse',   label: 'Basse',   bg: 'rgba(76,175,130,0.12)', color: '#4caf82' },
]

const PrioriteSelect = memo(function PrioriteSelect({ value, onChange, T }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = PRIORITES.find(p => p.val === value) || PRIORITES[1]
  useEffect(() => {
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

const Dependances = memo(function Dependances({ tache, toutesLesTaches, T, onUpdate }) {
  const [dependances, setDependances] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  useEffect(() => { chargerDependances() }, [tache.id])
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const chargerDependances = async () => {
    try { const res = await axios.get(`${API}/taches/${tache.id}/dependances`); setDependances(res.data) } catch (err) { console.error(err) }
  }
  const ajouterDependance = async (dependDeId) => {
    setLoading(true)
    try { await axios.post(`${API}/taches/${tache.id}/dependances`, { depend_de_id: dependDeId }); await chargerDependances(); setShowDropdown(false); if (onUpdate) onUpdate() } catch (err) { console.error(err) }
    setLoading(false)
  }
  const supprimerDependance = async (depId) => {
    try { await axios.delete(`${API}/dependances/${depId}`); await chargerDependances(); if (onUpdate) onUpdate() } catch (err) { console.error(err) }
  }
  const depIds = dependances.map(d => d.depend_de_id)
  const disponibles = toutesLesTaches.filter(t => t.id !== tache.id && !depIds.includes(t.id) && !t.terminee)
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: dependances.length > 0 ? 8 : 6 }}>
        <IconLink size={12} color={T.text2} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, letterSpacing: 0.5 }}>PRÉREQUIS</span>
        {dependances.length > 0 && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 700 }}>{dependances.filter(d => d.terminee).length}/{dependances.length} terminés</span>}
      </div>
      <AnimatePresence>
        {dependances.map((dep, i) => (
          <motion.div key={dep.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 5, borderRadius: 8, background: dep.terminee ? 'rgba(76,175,130,0.07)' : 'rgba(224,92,92,0.06)', border: `1px solid ${dep.terminee ? 'rgba(76,175,130,0.2)' : 'rgba(224,92,92,0.15)'}` }}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.04 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: dep.terminee ? '#4caf82' : 'transparent', border: `2px solid ${dep.terminee ? '#4caf82' : '#e05c5c'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dep.terminee ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : <IconLock size={9} color="#e05c5c" />}
            </div>
            <span style={{ flex: 1, fontSize: 12, color: dep.terminee ? T.text2 : T.text, textDecoration: dep.terminee ? 'line-through' : 'none', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.titre_prerequis}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: dep.terminee ? '#4caf82' : '#e05c5c', flexShrink: 0, padding: '1px 6px', borderRadius: 99, background: dep.terminee ? 'rgba(76,175,130,0.1)' : 'rgba(224,92,92,0.1)' }}>{dep.terminee ? 'Terminé' : 'En attente'}</span>
            <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={() => supprimerDependance(dep.id)} whileHover={{ color: '#e05c5c' }}><IconUnlink size={12} color="currentColor" /></motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={ref} style={{ position: 'relative', marginTop: 4 }}>
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, cursor: disponibles.length === 0 ? 'not-allowed' : 'pointer', opacity: disponibles.length === 0 ? 0.5 : 1 }}
          onClick={() => disponibles.length > 0 && setShowDropdown(!showDropdown)}
          whileHover={disponibles.length > 0 ? { borderColor: T.accent, color: T.accent } : {}}>
          <IconLink size={11} color="currentColor" />
          {disponibles.length === 0 ? 'Aucune tâche disponible comme prérequis' : 'Ajouter un prérequis'}
        </motion.button>
        <AnimatePresence>
          {showDropdown && (
            <motion.div style={{ position: 'absolute', bottom: '110%', left: 0, zIndex: 300, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 -8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 230, maxHeight: 200, overflowY: 'auto' }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, borderBottom: `1px solid ${T.border}` }}>CHOISIR UN PRÉREQUIS</div>
              {disponibles.map(t => {
                const cp = t.priorite === 'haute' ? '#e05c5c' : t.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
                return (
                  <motion.button key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: T.text, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                    onClick={() => ajouterDependance(t.id)} whileHover={{ background: `${T.accent}10`, color: T.accent }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: cp, flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titre}</span>
                    <span style={{ fontSize: 10, color: cp, flexShrink: 0 }}>{t.priorite}</span>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
)


const SousTaches = memo(function SousTaches({ tache, T }) {
  const [sousTaches, setSousTaches] = useState([])
  const [nouvelleSousTache, setNouvelleSousTache] = useState('')
  const [loading, setLoading] = useState(false)
  const [ajoutVisible, setAjoutVisible] = useState(false)
  useEffect(() => { chargerSousTaches() }, [tache.id])
  const chargerSousTaches = async () => {
    try { const res = await axios.get(`${API}/taches/${tache.id}/sous-taches`); setSousTaches(res.data) } catch (err) { console.error(err) }
  }
  const ajouterSousTache = async () => {
    if (!nouvelleSousTache.trim()) return
    setLoading(true)
    try { await axios.post(`${API}/taches/${tache.id}/sous-taches`, { titre: nouvelleSousTache, ordre: sousTaches.length }); setNouvelleSousTache(''); setAjoutVisible(false); await chargerSousTaches() } catch (err) { console.error(err) }
    setLoading(false)
  }
  const toggleSousTache = async (st) => {
    try { await axios.put(`${API}/sous-taches/${st.id}`, { terminee: !st.terminee }); await chargerSousTaches() } catch (err) { console.error(err) }
  }
  const supprimerSousTache = async (id) => {
    try { await axios.delete(`${API}/sous-taches/${id}`); await chargerSousTaches() } catch (err) { console.error(err) }
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
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.04 }}>
            <motion.button style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${st.terminee ? '#4caf82' : T.border}`, background: st.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => toggleSousTache(st)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
              {st.terminee && <CheckSquare size={8} color="white" strokeWidth={3} />}
            </motion.button>
            <span style={{ flex: 1, fontSize: 12, color: st.terminee ? T.text2 : T.text, textDecoration: st.terminee ? 'line-through' : 'none', lineHeight: 1.4 }}>{st.titre}</span>
            <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, display: 'flex' }} onClick={() => supprimerSousTache(st.id)} whileHover={{ color: '#e05c5c' }}>
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
            onKeyDown={e => { if (e.key === 'Enter') ajouterSousTache(); if (e.key === 'Escape') setAjoutVisible(false) }} autoFocus />
          <motion.button style={{ padding: '5px 10px', background: T.accent, border: 'none', borderRadius: 8, color: T.bg, fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            onClick={ajouterSousTache} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>{loading ? '...' : 'OK'}</motion.button>
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

function exporterGoogleCalendar(tache) {
  const titre = encodeURIComponent(tache.titre)
  const deadline = new Date(tache.deadline)
  const dateStr = deadline.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 8)
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titre}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent('Tâche GetShift - Priorité: ' + tache.priorite)}`
  window.open(url, '_blank')
}

export default function Dashboard() {
  const [showExport, setShowExport] = useState(false)
  const [streak, setStreak] = useState(0)
  const [badgesObtenus, setBadgesObtenus] = useState([])
  const [badgeNotif, setBadgeNotif] = useState(null) // badge nouvellement obtenu
  const [taches, setTaches] = useState([])
  const [titre, setTitre] = useState('')
  const [priorite, setPriorite] = useState('moyenne')
  const [deadline, setDeadline] = useState(null)
  const [filtre, setFiltre] = useState('toutes')
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [niveau, setNiveau] = useState(1)
  const [theme, setTheme] = useState('dark')
  const [showThemes, setShowThemes] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [notification, setNotification] = useState(null)
  const [rappels, setRappels] = useState([])
  const [showRappels, setShowRappels] = useState(false)
  const [objectif, setObjectif] = useState('')
  const [expandedTaches, setExpandedTaches] = useState({})
  const [expandMode, setExpandMode] = useState({})
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackSaving, setSlackSaving] = useState(false)
  const [slackSaved, setSlackSaved] = useState(false)
  const [erreurForm, setErreurForm] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [appInstalled, setAppInstalled] = useState(false)
  // ===== IA SOUS-TÂCHES =====
  const [iaLoading, setIaLoading] = useState(false)
  const [iaPanel, setIaPanel] = useState(false)
  const [iaSousTaches, setIaSousTaches] = useState([])
  const [iaConseil, setIaConseil] = useState('')
  const [iaType, setIaType] = useState('')
  const [titrePourIA, setTitrePourIA] = useState('')
  // ===== ONBOARDING =====
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_termine'))
  // ===== TEMPLATES =====
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templateCategorie, setTemplateCategorie] = useState('tous')
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateSelectionne, setTemplateSelectionne] = useState(null)
  const [templateDateDebut, setTemplateDateDebut] = useState(null)
  const [templateImporting, setTemplateImporting] = useState(false)
  const [showCreerTemplate, setShowCreerTemplate] = useState(false)
  const [nouveauTemplate, setNouveauTemplate] = useState({ titre: '', description: '', categorie: 'projet', icone: '📋', taches: [] })
  const [nouvelleTacheTemplate, setNouvelleTacheTemplate] = useState({ titre: '', priorite: 'moyenne', deadline_jours: 7, sous_taches: [] })

  // Settings drawer
  const [activeSettingsTab, setActiveSettingsTab] = useState('badges')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Task DNA
  const [dnaLoading, setDnaLoading] = useState(false)
  const [dnaResult, setDnaResult] = useState(null)
  const [showDnaPopup, setShowDnaPopup] = useState(false)
  const [dnaPendingData, setDnaPendingData] = useState(null)
  const [undoToast, setUndoToast] = useState(null)

  // Coach IA
  const [showCoach, setShowCoach] = useState(false)
  const [coachStyle, setCoachStyle] = useState('bienveillant')
  const [coachMessages, setCoachMessages] = useState([])
  const [coachInput, setCoachInput] = useState('')
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachTab, setCoachTab] = useState('chat')
  const [coachRapport, setCoachRapport] = useState(null)
  const [coachRapportLoading, setCoachRapportLoading] = useState(false)
  const COACH_STYLES_LIST = [
    { id: 'bienveillant', nom: 'Alex', emoji: 'heart', desc: 'Doux & encourageant' },
    { id: 'motivateur',   nom: 'Max',  emoji: 'flame', desc: 'Energique & challengeant' },
    { id: 'analytique',   nom: 'Nova', emoji: 'chart', desc: 'Précis & factuel' },
  ]

  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { localStorage.removeItem('user'); return null } })()
  const T = themes[theme]
  const [showGuideBanner, setShowGuideBanner] = useState(() => !localStorage.getItem('guide_vu'))
  const { isOnline, isSyncing, pendingActions, syncResult, chargerPendingCount } = useOffline(user?.id)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerProfil(); chargerTaches(); chargerRappels(); chargerSlackWebhook(); activerNotifications(); chargerBadges()
  }, [])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setAppInstalled(true); setShowInstallBanner(false); setInstallPrompt(null) })
    if (window.matchMedia('(display-mode: standalone)').matches) setAppInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const chargerBadges = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}/badges`)
      setBadgesObtenus(res.data.badges.filter(b => b.obtenu))
      setStreak(res.data.streak || 0)
    } catch {}
  }

  const chargerTemplates = async () => {
    setTemplatesLoading(true)
    try {
      // Init tables si pas encore fait
      await axios.post(`${API}/templates/init`)
      const res = await axios.get(`${API}/templates`)
      setTemplates(res.data)
    } catch (err) { console.error(err) }
    setTemplatesLoading(false)
  }

  const ouvrirTemplates = () => {
    setShowTemplates(true)
    if (templates.length === 0) chargerTemplates()
  }

  const utiliserTemplate = async (template) => {
    if (!templateDateDebut) { afficherNotification('Choisis une date de début', 'error'); return }
    setTemplateImporting(true)
    try {
      const res = await axios.post(`${API}/templates/${template.id}/utiliser`, {
        user_id: user.id,
        date_debut: templateDateDebut.toISOString()
      })
      afficherNotification(`✅ ${res.data.message}`)
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
      setShowTemplates(false)
      setTemplateSelectionne(null)
      setTemplateDateDebut(null)
      chargerTaches()
    } catch (err) { afficherNotification('Erreur lors de l\'import', 'error') }
    setTemplateImporting(false)
  }

  const soumettreNouveauTemplate = async () => {
    if (!nouveauTemplate.titre.trim() || nouveauTemplate.taches.length === 0) {
      afficherNotification('Titre et au moins une tâche requis', 'error'); return
    }
    try {
      await axios.post(`${API}/templates`, { ...nouveauTemplate, user_id: user.id })
      afficherNotification('🎉 Template publié !')
      setShowCreerTemplate(false)
      setNouveauTemplate({ titre: '', description: '', categorie: 'projet', icone: '📋', taches: [] })
      chargerTemplates()
    } catch { afficherNotification('Erreur lors de la création', 'error') }
  }

  const chargerProfil = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}`)
      setPoints(res.data.points || 0); setNiveau(res.data.niveau || 1)
      const t = res.data.theme || 'dark'; setTheme(t); localStorage.setItem('theme', t)
      await sauvegarderProfilLocalement(res.data)
    } catch (err) {
      const profil = await lireProfilLocalement(user.id)
      if (profil) { setPoints(profil.points || 0); setNiveau(profil.niveau || 1); setTheme(profil.theme || 'dark') }
    }
  }

  const chargerTaches = useCallback(async () => {
    setLoading(true)
    try { const res = await axios.get(`${API}/taches/${user.id}`); setTaches(res.data); await sauvegarderTachesLocalement(res.data) }
    catch (err) { const tachesLocales = await lireTachesLocalement(user.id); setTaches(tachesLocales) }
    setLoading(false)
  }, [])

  const chargerRappels = async () => {
    const res = await axios.get(`${API}/taches/rappels/${user.id}`)
    if (res.data.rappels) setRappels(res.data.rappels)
  }

  const chargerSlackWebhook = async () => {
    try { const res = await axios.get(`${API}/integrations/slack?user_id=${user.id}`); if (res.data.webhook_url) setSlackWebhook(res.data.webhook_url) } catch (err) {}
  }

  const sauvegarderSlack = async () => {
    if (!slackWebhook.trim()) return
    setSlackSaving(true)
    try { await axios.post(`${API}/integrations/slack`, { user_id: user.id, webhook_url: slackWebhook }); setSlackSaved(true); afficherNotification('Webhook Slack sauvegardé !'); setTimeout(() => setSlackSaved(false), 3000) }
    catch (err) { afficherNotification('Erreur lors de la sauvegarde') }
    setSlackSaving(false)
  }

  const changerTheme = async (newTheme) => {
    setTheme(newTheme); setShowThemes(false); setShowSettings(false)
    localStorage.setItem('theme', newTheme)
    await axios.put(`${API}/users/${user.id}/theme`, { theme: newTheme })
  }

  const afficherNotification = (msg, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000) }

  const ajouterTache = async () => {
    if (!titre.trim()) return
    if (!deadline) { setErreurForm("La date et l'heure sont obligatoires."); return }
    const data = { titre, priorite, deadline: deadline.toISOString().slice(0, 16), user_id: user.id }

    // Task DNA — analyse avant création
    if (isOnline) {
      setDnaLoading(true)
      try {
        const dnaRes = await axios.post(`${API}/ia/task-dna`, { titre, priorite, user_id: user.id })
        setDnaResult(dnaRes.data)
        setDnaPendingData(data)
        setShowDnaPopup(true)
        setDnaLoading(false)
        return // On attend la confirmation dans le popup
      } catch {
        setDnaLoading(false)
        // Si erreur DNA, on crée directement
      }
    }

    setTitre(''); setDeadline(null); setErreurForm('')
    if (!isOnline) {
      const tacheLocale = await ajouterTacheLocalement({ ...data, bloquee: false, terminee: false })
      await ajouterActionSync({ type: 'AJOUTER_TACHE', data: { ...data, id_temp: tacheLocale.id } })
      await chargerPendingCount(); setTaches(prev => [tacheLocale, ...prev]); afficherNotification('Tâche sauvegardée offline ⚡'); return
    }
    await axios.post(`${API}/taches`, data); afficherNotification('Tâche ajoutée avec succès'); chargerTaches()
  }

  // ---- Fonctions Coach IA ----
  const envoyerMessageCoach = async () => {
    if (!coachInput.trim() || coachLoading) return
    const msg = coachInput.trim()
    setCoachInput('')
    const newMsg = { role: 'user', contenu: msg }
    setCoachMessages(prev => [...prev, newMsg])
    setCoachLoading(true)
    try {
      const res = await axios.post(`${API}/ia/coach/chat`, {
        user_id: user.id, message: msg, style: coachStyle,
        historique: coachMessages.slice(-6)
      })
      setCoachMessages(prev => [...prev, { role: 'assistant', contenu: res.data.reponse }])
    } catch {
      setCoachMessages(prev => [...prev, { role: 'assistant', contenu: "Désolé, une erreur est survenue. Réessaie !" }])
    }
    setCoachLoading(false)
  }

  const chargerRapportCoach = async () => {
    setCoachRapportLoading(true)
    try {
      const res = await axios.get(`${API}/ia/coach/rapport/${user.id}?style=${coachStyle}`)
      setCoachRapport(res.data)
    } catch {}
    setCoachRapportLoading(false)
  }

  const changerStyleCoach = async (style) => {
    setCoachStyle(style)
    setCoachMessages([])
    setCoachRapport(null)
    try {
      const res = await axios.get(`${API}/ia/coach/historique/${user.id}?style=${style}`)
      setCoachMessages(res.data.messages || [])
    } catch {}
  }

  const ouvrirCoach = async () => {
    setShowCoach(true)
    if (coachMessages.length === 0) {
      try {
        const res = await axios.get(`${API}/ia/coach/historique/${user.id}?style=${coachStyle}`)
        setCoachMessages(res.data.messages || [])
      } catch {}
    }
  }

  const confirmerCreationApresDNA = async () => {
    if (!dnaPendingData) return
    setShowDnaPopup(false)
    setTitre(''); setDeadline(null); setErreurForm('')
    await axios.post(`${API}/taches`, dnaPendingData)
    afficherNotification('Tâche créée avec succès')
    chargerTaches()
    setDnaResult(null); setDnaPendingData(null)
  }

  const annulerCreationApresDNA = () => {
    setShowDnaPopup(false)
    setDnaResult(null); setDnaPendingData(null)
  }

  const genererSousTachesIA = async () => {
    if (!titre.trim()) { setErreurForm("Écris d'abord le titre de la tâche."); return }
    setIaLoading(true); setErreurForm('')
    setTitrePourIA(titre)
    try {
      const res = await axios.post(`${API}/ia/sous-taches-contextuelles`, { titre, user_id: user.id })
      const data = res.data
      setIaSousTaches((data.sous_taches || []).map(st => ({ ...st, selectionne: true })))
      setIaConseil(data.conseil || '')
      setIaType(data.type || '')
      setIaPanel(true)
    } catch (err) {
      afficherNotification('Erreur IA — réessaie dans un instant', 'error')
    }
    setIaLoading(false)
  }

  const confirmerSousTachesIA = async () => {
    if (!deadline) { setErreurForm("La date et l'heure sont obligatoires."); setIaPanel(false); return }
    const data = { titre: titrePourIA, priorite, deadline: deadline.toISOString().slice(0, 16), user_id: user.id }
    const res = await axios.post(`${API}/taches`, data)
    const tacheId = res.data.id
    const selectionnees = iaSousTaches.filter(st => st.selectionne)
    await Promise.all(selectionnees.map((st, i) =>
      axios.post(`${API}/taches/${tacheId}/sous-taches`, { titre: st.titre, ordre: i })
    ))
    setTitre(''); setDeadline(null); setIaPanel(false); setIaSousTaches([])
    afficherNotification(`✨ Tâche + ${selectionnees.length} sous-tâches créées`)
    chargerTaches()
  }

  const toggleSousTacheIA = (i) => {
    setIaSousTaches(prev => prev.map((st, idx) => idx === i ? { ...st, selectionne: !st.selectionne } : st))
  }

  const toggleTache = async (id, terminee, tachePriorite, bloquee) => {
    if (!terminee && bloquee) {
      // Vérifier qu'il y a vraiment des dépendances non terminées
      try {
        const resDeps = await axios.get(`${API}/taches/${id}/dependances`)
        const depsBloquantes = resDeps.data.filter(d => !d.terminee)
        if (depsBloquantes.length > 0) {
          afficherNotification('⛔ Cette tâche est bloquée par des prérequis non terminés', 'error'); return
        }
      } catch { /* si erreur, on laisse passer */ }
    }
    const nouvelEtat = !terminee
    if (!isOnline) {
      await mettreAJourTacheLocalement(id, { terminee: nouvelEtat })
      await ajouterActionSync({ type: 'TERMINER_TACHE', data: { id, terminee: nouvelEtat } })
      await chargerPendingCount(); setTaches(prev => prev.map(t => t.id === id ? { ...t, terminee: nouvelEtat } : t))
      if (nouvelEtat) { const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10; confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] }); afficherNotification(`+${pts} pts (sync au retour réseau)`) }
      return
    }
    try {
      await axios.put(`${API}/taches/${id}`, { terminee: nouvelEtat })
      if (!terminee) {
        const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10
        const res = await axios.put(`${API}/users/${user.id}/points`, { points: pts })
        setPoints(res.data.points); setNiveau(res.data.niveau)
        if (res.data.streak) setStreak(res.data.streak)
        // Afficher notification badge si nouveau badge obtenu
        if (res.data.nouveaux_badges && res.data.nouveaux_badges.length > 0) {
          const badge = res.data.nouveaux_badges[0]
          setBadgeNotif(badge)
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: [T.accent, '#4caf82', '#FFD700'] })
          setTimeout(() => setBadgeNotif(null), 4000)
        }
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] }); afficherNotification(`+${pts} points gagnés`)
      }
      chargerTaches()
    } catch (err) {
      console.error('toggleTache error:', err?.response?.data || err)
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Erreur lors de la mise à jour'
      afficherNotification(`⛔ ${msg}`, 'error')
    }
  }

  const supprimerTache = useCallback(async (id) => {
    const tacheSauvegardee = taches.find(t => t.id === id)
    setTaches(prev => prev.filter(t => t.id !== id))
    if (undoToast) {
      clearTimeout(undoToast.timer)
      if (isOnline) axios.delete(`${API}/taches/${undoToast.tache.id}`).catch(() => {})
      else supprimerTacheLocalement(undoToast.tache.id)
    }
    const timer = setTimeout(async () => {
      setUndoToast(null)
      await supprimerTacheLocalement(id)
      if (!isOnline) { await ajouterActionSync({ type: 'SUPPRIMER_TACHE', data: { id } }); await chargerPendingCount(); return }
      await axios.delete(`${API}/taches/${id}`)
    }, 5000)
    setUndoToast({ tache: tacheSauvegardee, timer })
  }, [isOnline, chargerTaches, taches, undoToast])

  const annulerSuppression = () => {
    if (!undoToast) return
    clearTimeout(undoToast.timer)
    setTaches(prev => [undoToast.tache, ...prev])
    setUndoToast(null)
  }

  const genererTaches = async () => {
    if (!objectif.trim()) return
    afficherNotification('Génération en cours...')
    const res = await axios.post(`${API}/ia/generer-taches`, { objectif, user_id: user.id, priorite: 'moyenne' })
    if (res.data.taches) { afficherNotification(`${res.data.taches.length} tâches créées`); setObjectif(''); chargerTaches(); setTimeout(() => navigate('/ia'), 1500) }
  }

  const toggleExpand = (id, mode) => {
    setExpandedTaches(prev => {
      const currentMode = expandMode[id]
      if (prev[id] && currentMode === mode) return { ...prev, [id]: false }
      setExpandMode(em => ({ ...em, [id]: mode }))
      return { ...prev, [id]: true }
    })
  }

  const installerApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setAppInstalled(true); setShowInstallBanner(false); afficherNotification('GetShift installé avec succès !') }
    setInstallPrompt(null)
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
  }

  const activerNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.register('/getshift/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const res = await axios.get(`${API}/push/vapid-public-key`)
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(res.data.public_key) })
      await axios.post(`${API}/push/subscribe`, { user_id: user.id, subscription: sub.toJSON() })
} catch (e) { /* Push non supporté sur cet environnement */ }
  }

  const bloquees = taches.filter(t => t.bloquee && !t.terminee).length
  const tachesFiltrees = useMemo(() => taches.filter(t => {
    if (filtre === 'toutes') return true
    if (filtre === 'terminee') return t.terminee
    if (filtre === 'haute') return t.priorite === 'haute' && !t.terminee
    if (filtre === 'bloquee') return t.bloquee && !t.terminee
    return t.priorite === filtre
  }), [taches, filtre])

  const { total, terminees, haute, enCours, pct } = useMemo(() => {
    const total = taches.length
    const terminees = taches.filter(t => t.terminee).length
    const haute = taches.filter(t => t.priorite === 'haute' && !t.terminee).length
    return { total, terminees, haute, enCours: total - terminees, pct: total > 0 ? Math.round((terminees / total) * 100) : 0 }
  }, [taches])
  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
  const niveauActuel = niveaux.find(n => n.niveau === niveau) || niveaux[0]
  const niveauSuivant = niveaux.find(n => n.niveau === niveau + 1)
  const pctNiveau = niveauSuivant ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100) : 100
  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia', dataOnboarding: 'nav-ia' },
    { icon: Sparkles, label: 'Tomorrow Builder', path: '/tomorrow', dataOnboarding: 'nav-tomorrow' },
    { icon: Flag, label: 'Goal Reverse', path: '/goal' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics', dataOnboarding: 'nav-analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification', dataOnboarding: 'nav-planification' },
    { icon: Users, label: 'Collaboration', path: '/collaboration', dataOnboarding: 'nav-collaboration' },
    { icon: HelpCircle, label: 'Aide', path: '/help' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, transition: 'all 0.5s ease', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 1024px) { aside { width: 240px !important; } main { padding: 24px !important; } }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; } .forms-grid { grid-template-columns: 1fr !important; gap: 12px !important; } .main-padding { padding: 16px !important; } .header-row { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; } h1 { font-size: 20px !important; } }
        @media (max-width: 480px) { main { padding: 12px !important; } .stats-grid { gap: 6px !important; } }
        @media (min-width: 769px) and (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(4, 1fr) !important; } .forms-grid { grid-template-columns: 1fr 1fr !important; } }
      `}</style>

      <AnimatePresence>
        {notification && (
          <motion.div style={{ position: 'fixed', top: 'clamp(16px, 4vh, 24px)', right: 'clamp(16px, 4vw, 24px)', zIndex: 1000, maxWidth: 'min(400px, 90vw)', background: T.bg2, border: `1px solid ${notification.type === 'error' ? '#e05c5c50' : T.border}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTIFICATION BADGE */}
      <AnimatePresence>
        {badgeNotif && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: T.bg2, border: `2px solid ${T.accent}`, borderRadius: 20, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: `0 8px 40px ${T.accent}40`, minWidth: 280 }}>
            <motion.span
              animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1.3, 1.1, 1] }}
              transition={{ duration: 0.6 }}
              style={{ fontSize: 32, flexShrink: 0 }}>
              {badgeNotif.icon}
            </motion.span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1, marginBottom: 2 }}>🏆 BADGE DÉBLOQUÉ !</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{badgeNotif.nom}</div>
              <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{badgeNotif.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside style={{ width: 'min(248px, 80%)', maxWidth: '248px', background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 3vh, 24px) clamp(12px, 2vw, 16px)', position: 'fixed', top: 0, left: isMobile ? (showSidebar ? 0 : '-100%') : 0, height: '100vh', transition: 'left 0.3s ease', zIndex: 150, overflowY: 'auto', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'clamp(24px, 4vh, 32px)', padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>GetShift</span>
        </div>

        <nav style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
          {navItems.map(item => {
            const Icon = item.icon
            const active = window.location.pathname === item.path
            return (
              <motion.button key={item.path}
                data-onboarding={item.dataOnboarding || undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s' }}
                onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }}
                whileHover={{ x: 2, color: T.accent }}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              </motion.button>
            )
          })}

          <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

          <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>FILTRES</p>
          {[
            { val: 'toutes', label: 'Toutes les tâches' },
            { val: 'haute', label: 'Priorité haute' },
            { val: 'bloquee', label: `Bloquées${bloquees > 0 ? ` (${bloquees})` : ''}` },
            { val: 'terminee', label: 'Terminées' }
          ].map(f => (
            <motion.button key={f.val}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', borderRadius: 10, color: filtre === f.val ? T.accent : T.text2, background: filtre === f.val ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filtre === f.val ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { setFiltre(f.val); if (isMobile) setShowSidebar(false) }} whileHover={{ x: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {f.val === 'bloquee' && <IconLock size={12} color={filtre === f.val ? T.accent : T.text2} />}
                {f.label}
              </span>
              {filtre === f.val && <ChevronRight size={14} />}
            </motion.button>
          ))}
        </nav>

        {/* ── AVATAR EN BAS — Pattern Notion/Linear ── */}
        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <motion.button
            onClick={() => setShowProfileMenu(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, background: showProfileMenu ? `${T.accent}15` : T.bg3, border: `1.5px solid ${showProfileMenu ? T.accent + '60' : T.border}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
            whileHover={{ background: `${T.accent}12`, borderColor: T.accent + '50' }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0, boxShadow: `0 2px 8px ${T.accent}40` }}>
              {user?.nom?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nom}</div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Niveau {niveau} · {points} pts</div>
            </div>
            <ChevronUp size={14} color={T.accent} style={{ transform: showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
          </motion.button>

          {/* Popover menu */}
          <AnimatePresence>
            {showProfileMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowProfileMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)', zIndex: 300, overflow: 'hidden' }}>

                  {/* Header identité */}
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                        {user?.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nom}</div>
                        <div style={{ fontSize: 11, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                      </div>
                    </div>
                    {/* XP bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 5 }}>
                      <span>Niveau {niveau} — {niveauActuel.label}</span>
                      <span style={{ color: T.accent, fontWeight: 600 }}>{points} pts</span>
                    </div>
                    <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pctNiveau}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
                    </div>
                    {streak > 0 && <div style={{ fontSize: 10, color: '#e08a3c', fontWeight: 600, marginTop: 6 }}>🔥 {streak} jour{streak > 1 ? 's' : ''} de streak</div>}
                  </div>

                  {/* Items menu */}
                  <div style={{ padding: '6px' }}>
                    <motion.button
                      onClick={() => { navigate('/profile'); setShowProfileMenu(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                      whileHover={{ background: `${T.accent}10` }}>
                      <User size={15} color={T.text2} strokeWidth={1.8} />
                      <span style={{ flex: 1 }}>Mon profil</span>
                    </motion.button>
                    <motion.button
                      onClick={() => { navigate('/settings'); setShowProfileMenu(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                      whileHover={{ background: `${T.accent}10` }}>
                      <Settings size={15} color={T.text2} strokeWidth={1.8} />
                      <span style={{ flex: 1 }}>Paramètres</span>
                      <span style={{ fontSize: 10, color: T.text2, background: T.bg3, padding: '1px 6px', borderRadius: 5 }}>⌘ ,</span>
                    </motion.button>
                  </div>

                  <div style={{ height: 1, background: T.border, margin: '2px 0' }} />

                  {/* Upgrade */}
                  <div style={{ padding: '6px' }}>
                    <motion.button
                      onClick={() => setShowProfileMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left' }}
                      whileHover={{ background: `${T.accent}10` }}>
                      <Star size={15} strokeWidth={1.8} />
                      Passer à Pro — 4,99€/mois
                    </motion.button>
                  </div>

                  <div style={{ height: 1, background: T.border, margin: '2px 0' }} />

                  {/* Déconnexion */}
                  <div style={{ padding: '6px' }}>
                    <motion.button
                      onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                      whileHover={{ background: 'rgba(224,92,92,0.08)' }}>
                      <LogOut size={15} strokeWidth={1.8} />
                      Se déconnecter
                    </motion.button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 40, height: 40, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={20} />
        </motion.button>
      )}
      {isMobile && showSidebar && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 140 }} onClick={() => setShowSidebar(false)} />}

      {/* MAIN */}
      <main className="main-padding" style={{ marginLeft: isMobile ? 0 : 248, flex: 1, padding: 'clamp(16px, 4vw, 40px)', minWidth: 0 }}>

        {/* Bannière guide */}
        <AnimatePresence>
          {showGuideBanner && (
            <motion.div style={{ background: `linear-gradient(135deg, ${T.accent}20, ${T.accent2}15)`, border: `1px solid ${T.accent}40`, borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}25`, border: `1px solid ${T.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HelpCircle size={18} color={T.accent} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Bienvenue sur GetShift !</div>
                  <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Découvrez comment utiliser l'application en consultant le guide.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button style={{ padding: '8px 16px', background: T.accent, border: 'none', borderRadius: 8, color: T.bg, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { localStorage.setItem('guide_vu', 'true'); setShowGuideBanner(false); navigate('/help') }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Voir le guide</motion.button>
                <motion.button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { localStorage.setItem('guide_vu', 'true'); setShowGuideBanner(false) }} whileHover={{ borderColor: T.accent, color: T.accent }}>Plus tard</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bannière PWA */}
        <AnimatePresence>
          {showInstallBanner && !appInstalled && (
            <motion.div style={{ background: `linear-gradient(135deg, #6c63ff20, #63b3ed15)`, border: `1px solid #6c63ff40`, borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6c63ff, #63b3ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 20 }}>📲</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Installer GetShift</div>
                  <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>Accédez à vos tâches depuis votre écran d'accueil, même hors ligne.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button style={{ padding: '8px 16px', background: '#6c63ff', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={installerApp} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Installer</motion.button>
                <motion.button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => setShowInstallBanner(false)} whileHover={{ borderColor: '#6c63ff', color: '#6c63ff' }}>Plus tard</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bannière Offline */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div style={{ background: 'rgba(224,138,60,0.1)', border: '1px solid rgba(224,138,60,0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(224,138,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e08a3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                  <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e08a3c' }}>Mode hors ligne</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
                  {pendingActions > 0 ? `${pendingActions} action${pendingActions > 1 ? 's' : ''} en attente de synchronisation` : 'Les modifications seront synchronisées au retour du réseau'}
                </div>
              </div>
              {pendingActions > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(224,138,60,0.15)', color: '#e08a3c' }}>{pendingActions} en attente</span>}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {syncResult && (
            <motion.div style={{ background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4caf82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4caf82' }}>Synchronisation terminée — {syncResult.synced} action{syncResult.synced > 1 ? 's' : ''} synchronisée{syncResult.synced > 1 ? 's' : ''} ✓</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSyncing && (
            <motion.div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 14, padding: '10px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
              </motion.div>
              <span style={{ fontSize: 13, color: T.accent, fontWeight: 500 }}>Synchronisation en cours...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div className="header-row" style={{ marginBottom: 'clamp(24px, 4vh, 32px)', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: 12, paddingTop: isMobile ? 48 : 0 }}
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>{salut}, {user?.nom?.split(' ')[0]}</h1>
            <p style={{ color: T.text2, fontSize: 13, marginTop: 4 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bouton Export déplacé dans le header */}
            <motion.button
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 99, color: T.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => setShowExport(true)} whileHover={{ scale: 1.02 }}>
              <Download size={14} /> Exporter
            </motion.button>
            <motion.button
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 99, color: T.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onClick={ouvrirTemplates} whileHover={{ scale: 1.02 }}>
              <BookOpen size={14} /> Templates
            </motion.button>
            {rappels.length > 0 && (
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 99, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer', alignSelf: isMobile ? 'flex-start' : 'auto' }}
                onClick={() => setShowRappels(!showRappels)} whileHover={{ scale: 1.02 }}>
                <Bell size={14} />{rappels.length} rappel{rappels.length > 1 ? 's' : ''}
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Export Modal */}
        <ExportModal
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          taches={taches}
          stats={{ total, terminees, haute, enCours, pct }}
          user={user}
          theme={theme}
        />

        {/* Rappels */}
        <AnimatePresence>
          {showRappels && rappels.length > 0 && (
            <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)', marginBottom: 24 }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {rappels.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(224,92,92,0.1)', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 8 }}>
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
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'clamp(8px, 2vw, 12px)', marginBottom: 16 }}>
          {[
            { icon: CheckSquare, val: total, label: 'Total', color: T.accent },
            { icon: CheckSquare, val: terminees, label: 'Terminées', color: '#4caf82' },
            { icon: AlertTriangle, val: haute, label: 'Haute priorité', color: '#e05c5c' },
            { icon: Clock, val: enCours, label: 'En cours', color: '#6c63ff' },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px, 2vw, 16px)' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -2, borderColor: stat.color + '60' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 4 }}>
                  <Icon size={16} color={stat.color} strokeWidth={1.8} />
                  <span style={{ fontSize: 10, color: T.text2, background: T.bg3, padding: '2px 6px', borderRadius: 99 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>
                  <AnimatedNumber value={stat.val} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Alerte bloquées */}
        <AnimatePresence>
          {bloquees > 0 && (
            <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <IconLock size={15} color="#e05c5c" />
              <span style={{ flex: 1, fontSize: 13, color: '#e05c5c', fontWeight: 500 }}>{bloquees} tâche{bloquees > 1 ? 's bloquées' : ' bloquée'} — des prérequis doivent être terminés en premier.</span>
              <motion.button style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, color: '#e05c5c', fontSize: 12, cursor: 'pointer' }}
                onClick={() => setFiltre('bloquee')} whileHover={{ background: 'rgba(224,92,92,0.08)' }}>Voir</motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progression */}
        <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)', marginBottom: 24 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ color: T.text2, fontWeight: 500 }}>Progression globale</span>
            <span style={{ color: T.accent, fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, borderRadius: 99 }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </motion.div>

        {/* Formulaires */}
        <div className="forms-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(12px, 2vw, 16px)', marginBottom: 24 }}>
          {/* Nouvelle tâche - data-onboarding="form-tache" */}
          <motion.div data-onboarding="form-tache" style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} color={T.accent} /> Nouvelle tâche
            </p>
            <input style={{ width: '100%', padding: 'clamp(8px, 2vw, 10px) clamp(12px, 2.5vw, 14px)', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              placeholder="Que dois-tu faire ?" value={titre} onChange={e => setTitre(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouterTache()} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <PrioriteSelect value={priorite} onChange={setPriorite} T={T} />
              <DatePicker
                selected={deadline} onChange={date => setDeadline(date)}
                locale="fr" dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                minDate={new Date()} placeholderText="📅 Date & heure *"
                customInput={<input style={{ padding: '8px 12px', background: T.bg3, border: `1px solid ${!deadline && erreurForm ? '#e05c5c' : T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer', width: '100%' }} />}
              />
              <motion.button style={{ padding: 'clamp(7px, 1.5vw, 9px) clamp(12px, 3vw, 16px)', background: T.accent, color: T.bg, border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                onClick={ajouterTache} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Ajouter</motion.button>
              <motion.button style={{ padding: 'clamp(7px, 1.5vw, 9px) clamp(10px, 2vw, 13px)', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={genererSousTachesIA} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} disabled={iaLoading}>
                {iaLoading
                  ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>⏳</motion.span>
                  : <Sparkles size={13} />}
                {iaLoading ? 'IA...' : 'Sous-tâches IA'}
              </motion.button>
            </div>
            {erreurForm && <p style={{ fontSize: 12, color: '#e05c5c', marginTop: 6 }}>{erreurForm}</p>}
          </motion.div>

          {/* Générer avec IA - data-onboarding="form-ia" */}
          <motion.div data-onboarding="form-ia" style={{ background: T.bg2, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} strokeWidth={2} color={T.accent} /> Générer avec l'IA
            </p>
            <input style={{ width: '100%', padding: 'clamp(8px, 2vw, 10px) clamp(12px, 2.5vw, 14px)', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              placeholder="Ex: Apprendre React..." value={objectif} onChange={e => setObjectif(e.target.value)} onKeyDown={e => e.key === 'Enter' && genererTaches()} />
            <motion.button style={{ width: '100%', padding: 'clamp(7px, 1.5vw, 9px) clamp(12px, 3vw, 16px)', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              onClick={genererTaches} whileHover={{ scale: 1.02, background: `${T.accent}25` }} whileTap={{ scale: 0.98 }}>
              Générer 5 tâches automatiquement
            </motion.button>
          </motion.div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: 16, flexWrap: 'wrap' }}>
          {[['toutes','Toutes'],['haute','Haute'],['moyenne','Moyenne'],['basse','Basse'],['bloquee','Bloquées'],['terminee','Terminées']].map(([val, label]) => (
            <motion.button key={val}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: filtre === val ? `${T.accent}15` : 'transparent', border: `1px solid ${filtre === val ? T.accent : T.border}`, borderRadius: 99, color: filtre === val ? T.accent : T.text2, fontSize: 12, fontWeight: filtre === val ? 600 : 400, cursor: 'pointer' }}
              onClick={() => setFiltre(val)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {val === 'bloquee' && <IconLock size={11} color="currentColor" />}
              {label}
              {val === 'bloquee' && bloquees > 0 && <span style={{ background: '#e05c5c', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>{bloquees}</span>}
            </motion.button>
          ))}
        </div>

        {/* Liste tâches */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'clamp(40px, 10vh, 60px) 20px', color: T.text2 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Target size={32} color={T.accent} /></motion.div>
            <p style={{ marginTop: 12, fontSize: 13 }}>Chargement...</p>
          </div>
        ) : tachesFiltrees.length === 0 ? (
          <motion.div style={{ textAlign: 'center', padding: 'clamp(40px, 10vh, 60px) 20px', color: T.text2 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckSquare size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Aucune tâche ici</p>
            <p style={{ fontSize: 13, marginTop: 6, color: T.accent }}>Ajoute une tâche ou génère-en avec l'IA</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {tachesFiltrees.map((tache, i) => {
              const pts = tache.priorite === 'haute' ? 30 : tache.priorite === 'moyenne' ? 20 : 10
              const isExpanded = expandedTaches[tache.id]
              const currentMode = expandMode[tache.id]
              const isBloquee = tache.bloquee && !tache.terminee
              return (
                <motion.div key={tache.id}
                  style={{ background: T.bg2, border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.3)' : T.border}`, borderRadius: 12, padding: 'clamp(10px, 2vw, 14px)', marginBottom: 8, opacity: tache.terminee ? 0.5 : 1, position: 'relative', overflow: 'visible' }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: tache.terminee ? 0.5 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ borderColor: isBloquee ? 'rgba(224,92,92,0.5)' : T.accent + '40' }}>
                  {isBloquee && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #e05c5c, #e08a3c)', borderRadius: '12px 0 0 12px' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: isBloquee ? 8 : 0 }}>
                    {isBloquee ? (
                      <motion.div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' }}
                        animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }} title="Tâche bloquée par un prérequis">
                        <IconLock size={10} color="#e05c5c" />
                      </motion.div>
                    ) : (
                      <motion.button style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${tache.terminee ? '#4caf82' : T.border}`, background: tache.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
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
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: tache.priorite === 'haute' ? 'rgba(224,92,92,0.12)' : tache.priorite === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)', color: tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'moyenne' ? '#e08a3c' : '#4caf82', flexShrink: 0 }}>{tache.priorite}</span>
                    {tache.deadline && !tache.terminee && (
                      <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', background: 'white', border: '1px solid #dadce0', borderRadius: 8, fontSize: 11, cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        onClick={() => exporterGoogleCalendar(tache)} whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', scale: 1.03 }} whileTap={{ scale: 0.97 }} title="Exporter vers Google Calendar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="4" width="20" height="18" rx="2" fill="white" stroke="#dadce0" strokeWidth="1.2"/>
                          <rect x="2" y="4" width="20" height="5.5" rx="2" fill="#1a73e8"/>
                          <rect x="2" y="7.5" width="20" height="2" fill="#1a73e8"/>
                          <rect x="6" y="2" width="2" height="4" rx="1" fill="#1a73e8"/>
                          <rect x="16" y="2" width="2" height="4" rx="1" fill="#1a73e8"/>
                          <text x="12" y="19" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1a73e8" fontFamily="Arial">CAL</text>
                        </svg>
                        <span style={{ color: '#3c4043', fontWeight: 500, display: isMobile ? 'none' : 'inline' }}>Calendar</span>
                      </motion.button>
                    )}
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: isExpanded && currentMode === 'dependances' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'dependances' ? T.accent : T.border}`, borderRadius: 8, color: isExpanded && currentMode === 'dependances' ? T.accent : T.text2, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => toggleExpand(tache.id, 'dependances')} whileHover={{ borderColor: T.accent, color: T.accent }}>
                      <IconLink size={12} color="currentColor" />
                      <span style={{ display: isMobile ? 'none' : 'inline' }}>Prérequis</span>
                    </motion.button>
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: isExpanded && currentMode === 'sousTaches' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'sousTaches' ? T.accent : T.border}`, borderRadius: 8, color: isExpanded && currentMode === 'sousTaches' ? T.accent : T.text2, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => toggleExpand(tache.id, 'sousTaches')} whileHover={{ borderColor: T.accent, color: T.accent }}>
                      {isExpanded && currentMode === 'sousTaches' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <span style={{ display: isMobile ? 'none' : 'inline' }}>Sous-tâches</span>
                    </motion.button>
                    <motion.button style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.2)' : T.border}`, color: isBloquee ? 'rgba(224,92,92,0.4)' : T.text2, borderRadius: 8, fontSize: 12, cursor: isBloquee ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                      onClick={() => !isBloquee && toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)}
                      whileHover={!isBloquee ? { borderColor: '#4caf82', color: '#4caf82' } : {}}>
                      {tache.terminee ? 'Rouvrir' : isBloquee ? 'Bloquée' : 'Terminer'}
                    </motion.button>
                    <motion.button style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.text2, display: 'flex', flexShrink: 0 }}
                      onClick={() => supprimerTache(tache.id)} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                      <Trash2 size={14} strokeWidth={1.8} />
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                        {currentMode === 'sousTaches' && <SousTaches tache={tache} T={T} />}
                        {currentMode === 'dependances' && <Dependances tache={tache} toutesLesTaches={taches} T={T} onUpdate={chargerTaches} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </main>

      {/* ===== ONBOARDING ===== */}
      {showOnboarding && (
        <Onboarding
          T={T}
          onTerminer={() => {
            localStorage.setItem('onboarding_termine', 'true')
            setShowOnboarding(false)
          }}
          activerNotifications={activerNotifications}
        />
      )}

      {/* ===== MODAL TEMPLATES ===== */}
      <AnimatePresence>
        {showTemplates && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowTemplates(false); setTemplateSelectionne(null) }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 998, backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 999, background: T.bg2, borderRadius: 24, width: 'min(900px, 95vw)', maxHeight: '88vh', overflowY: 'auto', border: `1px solid ${T.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

              {/* Header modal */}
              <div style={{ padding: '24px 28px 0', position: 'sticky', top: 0, background: T.bg2, zIndex: 10, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={20} color={T.accent} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Templates communautaires</h2>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{templates.length} templates disponibles</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button style={{ padding: '8px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, borderRadius: 10, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => setShowCreerTemplate(!showCreerTemplate)} whileHover={{ scale: 1.02 }}>
                      <Plus size={14} /> Créer un template
                    </motion.button>
                    <motion.button style={{ width: 36, height: 36, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => { setShowTemplates(false); setTemplateSelectionne(null) }} whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Recherche + filtres catégories */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={14} color={T.text2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input style={{ width: '100%', padding: '8px 12px 8px 34px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Rechercher un template..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[['tous','Tous','🌐'],['projet','Projet','🚀'],['voyage','Voyage','✈️'],['habitude','Habitude','🌅'],['apprentissage','Apprentissage','📚'],['evenement','Événement','🎉']].map(([val, label, ico]) => (
                      <motion.button key={val}
                        style={{ padding: '5px 12px', background: templateCategorie === val ? `${T.accent}20` : 'transparent', border: `1px solid ${templateCategorie === val ? T.accent : T.border}`, borderRadius: 99, color: templateCategorie === val ? T.accent : T.text2, fontSize: 12, fontWeight: templateCategorie === val ? 600 : 400, cursor: 'pointer' }}
                        onClick={() => setTemplateCategorie(val)} whileHover={{ scale: 1.03 }}>
                        {ico} {label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px 28px 28px' }}>

                {/* Formulaire créer template */}
                <AnimatePresence>
                  {showCreerTemplate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ background: T.bg3, border: `1px solid ${T.accent}30`, borderRadius: 16, padding: 20, marginBottom: 24, overflow: 'hidden' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={14} color={T.accent} /> Nouveau template
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <input style={{ padding: '8px 12px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none' }}
                          placeholder="Titre du template *" value={nouveauTemplate.titre}
                          onChange={e => setNouveauTemplate(p => ({ ...p, titre: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input style={{ width: 50, padding: '8px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 18, outline: 'none', textAlign: 'center' }}
                            placeholder="📋" value={nouveauTemplate.icone}
                            onChange={e => setNouveauTemplate(p => ({ ...p, icone: e.target.value }))} />
                          <select style={{ flex: 1, padding: '8px 12px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none' }}
                            value={nouveauTemplate.categorie} onChange={e => setNouveauTemplate(p => ({ ...p, categorie: e.target.value }))}>
                            <option value="projet">🚀 Projet</option>
                            <option value="voyage">✈️ Voyage</option>
                            <option value="habitude">🌅 Habitude</option>
                            <option value="apprentissage">📚 Apprentissage</option>
                            <option value="evenement">🎉 Événement</option>
                            <option value="autre">📋 Autre</option>
                          </select>
                        </div>
                      </div>
                      <textarea style={{ width: '100%', padding: '8px 12px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box', marginBottom: 12 }}
                        placeholder="Description du template..." value={nouveauTemplate.description}
                        onChange={e => setNouveauTemplate(p => ({ ...p, description: e.target.value }))} />

                      {/* Tâches du template */}
                      <div style={{ marginBottom: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 8 }}>Tâches ({nouveauTemplate.taches.length})</p>
                        {nouveauTemplate.taches.map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: T.bg2, borderRadius: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, flex: 1, color: T.text }}>{t.titre}</span>
                            <span style={{ fontSize: 10, color: T.accent }}>J+{t.deadline_jours}</span>
                            <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }}
                              onClick={() => setNouveauTemplate(p => ({ ...p, taches: p.taches.filter((_, idx) => idx !== i) }))}
                              whileHover={{ color: '#e05c5c' }}><Trash2 size={12} /></motion.button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          <input style={{ flex: 1, minWidth: 150, padding: '7px 10px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none' }}
                            placeholder="Titre de la tâche..." value={nouvelleTacheTemplate.titre}
                            onChange={e => setNouvelleTacheTemplate(p => ({ ...p, titre: e.target.value }))} />
                          <select style={{ padding: '7px 10px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none' }}
                            value={nouvelleTacheTemplate.priorite} onChange={e => setNouvelleTacheTemplate(p => ({ ...p, priorite: e.target.value }))}>
                            <option value="haute">Haute</option>
                            <option value="moyenne">Moyenne</option>
                            <option value="basse">Basse</option>
                          </select>
                          <input type="number" style={{ width: 70, padding: '7px 10px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none' }}
                            placeholder="J+" value={nouvelleTacheTemplate.deadline_jours}
                            onChange={e => setNouvelleTacheTemplate(p => ({ ...p, deadline_jours: parseInt(e.target.value) }))} />
                          <motion.button style={{ padding: '7px 12px', background: `${T.accent}20`, border: `1px solid ${T.accent}40`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => {
                              if (!nouvelleTacheTemplate.titre.trim()) return
                              setNouveauTemplate(p => ({ ...p, taches: [...p.taches, { ...nouvelleTacheTemplate }] }))
                              setNouvelleTacheTemplate({ titre: '', priorite: 'moyenne', deadline_jours: 7, sous_taches: [] })
                            }} whileHover={{ scale: 1.03 }}>+ Ajouter</motion.button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <motion.button style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                          onClick={() => setShowCreerTemplate(false)}>Annuler</motion.button>
                        <motion.button style={{ padding: '8px 20px', background: T.accent, border: 'none', borderRadius: 10, color: T.bg, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          onClick={soumettreNouveauTemplate} whileHover={{ scale: 1.02 }}>Publier le template</motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Vue détail template sélectionné */}
                <AnimatePresence>
                  {templateSelectionne && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      style={{ background: T.bg3, border: `2px solid ${T.accent}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 32 }}>{templateSelectionne.icone}</span>
                          <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{templateSelectionne.titre}</h3>
                            <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 3 }}>{templateSelectionne.description}</p>
                            <p style={{ fontSize: 11, color: T.accent, margin: 0, marginTop: 3 }}>par {templateSelectionne.auteur} · {templateSelectionne.utilisations} utilisations</p>
                          </div>
                        </div>
                        <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }}
                          onClick={() => setTemplateSelectionne(null)} whileHover={{ color: '#e05c5c' }}><X size={18} /></motion.button>
                      </div>

                      {/* Tâches preview */}
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 1, marginBottom: 8 }}>{templateSelectionne.taches?.length} TÂCHES INCLUSES</p>
                        {templateSelectionne.taches?.map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: T.bg2, borderRadius: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: '50%', background: `${T.accent}20`, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</span>
                            <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500 }}>{t.titre}</span>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: t.priorite === 'haute' ? 'rgba(224,92,92,0.15)' : t.priorite === 'moyenne' ? 'rgba(224,138,60,0.15)' : 'rgba(76,175,130,0.15)', color: t.priorite === 'haute' ? '#e05c5c' : t.priorite === 'moyenne' ? '#e08a3c' : '#4caf82', fontWeight: 600 }}>{t.priorite}</span>
                            <span style={{ fontSize: 11, color: T.text2, flexShrink: 0 }}>J+{t.deadline_jours}</span>
                            {t.sous_taches?.length > 0 && <span style={{ fontSize: 10, color: T.accent }}>+{t.sous_taches.length} sous-tâches</span>}
                          </div>
                        ))}
                      </div>

                      {/* Sélection date début + bouton import */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, color: T.text2, marginBottom: 6, fontWeight: 600 }}>📅 Date de début des tâches</p>
                          <DatePicker
                            selected={templateDateDebut} onChange={date => setTemplateDateDebut(date)}
                            locale="fr" dateFormat="dd/MM/yyyy"
                            minDate={new Date()} placeholderText="Choisir une date de début"
                            customInput={<input style={{ padding: '9px 14px', background: T.bg2, border: `1px solid ${!templateDateDebut ? '#e05c5c' : T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer', width: '100%' }} />}
                          />
                        </div>
                        <motion.button
                          style={{ padding: '10px 24px', background: templateImporting ? T.bg3 : T.accent, border: 'none', borderRadius: 12, color: templateImporting ? T.text2 : T.bg, fontWeight: 700, cursor: templateImporting ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}
                          onClick={() => utiliserTemplate(templateSelectionne)} whileHover={!templateImporting ? { scale: 1.02 } : {}}>
                          {templateImporting
                            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>⏳</motion.span> Import en cours...</>
                            : <><Sparkles size={16} /> Importer ce template</>}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Grille templates */}
                {templatesLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: T.text2 }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Target size={28} color={T.accent} />
                    </motion.div>
                    <p style={{ marginTop: 12, fontSize: 13 }}>Chargement des templates...</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {templates
                      .filter(t => templateCategorie === 'tous' || t.categorie === templateCategorie)
                      .filter(t => !templateSearch || t.titre.toLowerCase().includes(templateSearch.toLowerCase()) || t.description?.toLowerCase().includes(templateSearch.toLowerCase()))
                      .map(tmpl => (
                        <motion.div key={tmpl.id}
                          style={{ background: templateSelectionne?.id === tmpl.id ? `${T.accent}10` : T.bg3, border: `1.5px solid ${templateSelectionne?.id === tmpl.id ? T.accent : T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.15s' }}
                          onClick={() => setTemplateSelectionne(templateSelectionne?.id === tmpl.id ? null : tmpl)}
                          whileHover={{ y: -3, borderColor: T.accent }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                            <span style={{ fontSize: 28, flexShrink: 0 }}>{tmpl.icone}</span>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>{tmpl.titre}</h4>
                              <p style={{ fontSize: 11, color: T.text2, margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tmpl.description}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${T.accent}15`, color: T.accent, fontWeight: 600 }}>{tmpl.taches?.length || 0} tâches</span>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: T.bg2, color: T.text2 }}>{tmpl.categorie}</span>
                            </div>
                            <span style={{ fontSize: 10, color: T.text2 }}>🔥 {tmpl.utilisations} fois</span>
                          </div>
                          <div style={{ fontSize: 10, color: T.text2, marginTop: 8 }}>par {tmpl.auteur}</div>
                        </motion.div>
                      ))}
                    {templates.filter(t => templateCategorie === 'tous' || t.categorie === templateCategorie).filter(t => !templateSearch || t.titre.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: T.text2 }}>
                        <BookOpen size={32} color={T.border} style={{ margin: '0 auto 12px' }} />
                        <p>Aucun template trouvé</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== PANEL IA SOUS-TÂCHES ===== */}
      <AnimatePresence>
        {iaPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIaPanel(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 998, backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999, background: T.bg2, borderRadius: '24px 24px 0 0', padding: 'clamp(20px, 4vw, 32px)', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${T.border}`, boxShadow: '0 -8px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ width: 40, height: 4, background: T.border, borderRadius: 99, margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color={T.accent} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Sous-tâches générées par l'IA</h3>
                  <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>
                    Pour : <span style={{ color: T.accent, fontWeight: 600 }}>"{titrePourIA}"</span>
                    {iaType && <span style={{ marginLeft: 8, background: `${T.accent}18`, color: T.accent, borderRadius: 99, padding: '1px 8px', fontSize: 11 }}>{iaType}</span>}
                  </p>
                </div>
              </div>
              {iaConseil && (
                <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.6 }}>💡 <span style={{ color: T.text }}>{iaConseil}</span></p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {iaSousTaches.map((st, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    onClick={() => toggleSousTacheIA(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: st.selectionne ? `${T.accent}12` : T.bg3, border: `1.5px solid ${st.selectionne ? T.accent : T.border}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: st.selectionne ? T.accent : 'transparent', border: `2px solid ${st.selectionne ? T.accent : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                      {st.selectionne && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke={T.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: st.selectionne ? T.text : T.text2, fontWeight: st.selectionne ? 500 : 400, flex: 1, textDecoration: st.selectionne ? 'none' : 'line-through' }}>{st.titre}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 7px', background: st.priorite === 'haute' ? '#e05c5c22' : st.priorite === 'moyenne' ? `${T.accent}18` : '#4caf8218', color: st.priorite === 'haute' ? '#e05c5c' : st.priorite === 'moyenne' ? T.accent : '#4caf82' }}>{st.priorite}</span>
                  </motion.div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setIaSousTaches(p => p.map(st => ({ ...st, selectionne: true })))} style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, cursor: 'pointer' }}>Tout sélectionner</button>
                <button onClick={() => setIaSousTaches(p => p.map(st => ({ ...st, selectionne: false })))} style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, cursor: 'pointer' }}>Tout désélectionner</button>
                <span style={{ fontSize: 11, color: T.text2, padding: '4px 0', marginLeft: 'auto' }}>{iaSousTaches.filter(st => st.selectionne).length}/{iaSousTaches.length} sélectionnées</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button onClick={() => setIaPanel(false)} whileTap={{ scale: 0.97 }} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text2, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</motion.button>
                <motion.button onClick={confirmerSousTachesIA} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ flex: 2, padding: '11px 0', background: T.accent, border: 'none', borderRadius: 12, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Sparkles size={14} />Créer la tâche + {iaSousTaches.filter(st => st.selectionne).length} sous-tâches
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== WIDGET COACH IA FLOTTANT ===== */}
      {/* Bouton flottant */}
      {!showCoach && (
        <motion.button
          onClick={ouvrirCoach}
          initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', cursor: 'pointer', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${T.accent}50`, fontSize: 22 }}>
          <Target size={22} color="white" />
        </motion.button>
      )}

      {/* Panel coach */}
      <AnimatePresence>
        {showCoach && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              onClick={() => setShowCoach(false)}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 950 }} />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40 }}
              style={{ position: 'fixed', bottom: 16, right: 16, left: 16, maxWidth: 420, margin: '0 auto', height: '80vh', maxHeight: 620, background: T.bg2, borderRadius: 20, border: `1px solid ${T.border}`, zIndex: 960, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: `linear-gradient(135deg, ${T.accent}15, transparent)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {(() => {
                    const style = COACH_STYLES_LIST.find(s => s.id === coachStyle)
                    if (!style) return null
                    if (style.emoji === 'heart') return <Heart size={16} color="#e05c5c" fill="#e05c5c" />
                    if (style.emoji === 'flame') return <Flame size={16} color="#e08a3c" />
                    if (style.emoji === 'chart') return <BarChart size={16} color="#6c63ff" />
                    return null
                  })()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                      Coach {COACH_STYLES_LIST.find(s => s.id === coachStyle)?.nom}
                    </div>
                    <div style={{ fontSize: 11, color: T.text2 }}>{COACH_STYLES_LIST.find(s => s.id === coachStyle)?.desc}</div>
                  </div>
                  <motion.button onClick={() => setShowCoach(false)} whileTap={{ scale: 0.9 }}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>×</motion.button>
                </div>
                {/* Sélection style */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {COACH_STYLES_LIST.map(s => (
                    <motion.button key={s.id} onClick={() => changerStyleCoach(s.id)} whileTap={{ scale: 0.95 }}
                      style={{ flex: 1, padding: '5px 0', background: coachStyle === s.id ? T.accent : T.bg3, border: `1px solid ${coachStyle === s.id ? T.accent : T.border}`, borderRadius: 8, color: coachStyle === s.id ? T.bg : T.text2, fontSize: 11, fontWeight: coachStyle === s.id ? 700 : 400, cursor: 'pointer' }}>
                      {s.emoji} {s.nom}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
                {[['chat', 'Chat'], ['rapport', 'Rapport']].map(([val, label]) => (
                  <button key={val} onClick={() => { setCoachTab(val); if (val === 'rapport' && !coachRapport) chargerRapportCoach() }}
                    style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: coachTab === val ? `2px solid ${T.accent}` : '2px solid transparent', color: coachTab === val ? T.accent : T.text2, fontSize: 13, fontWeight: coachTab === val ? 700 : 400, cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Chat */}
              {coachTab === 'chat' && (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {coachMessages.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 10px', color: T.text2 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{(() => {
                    const style = COACH_STYLES_LIST.find(s => s.id === coachStyle)
                    if (!style) return null
                    if (style.emoji === 'heart') return <Heart size={16} color="#e05c5c" fill="#e05c5c" />
                    if (style.emoji === 'flame') return <Flame size={16} color="#e08a3c" />
                    if (style.emoji === 'chart') return <BarChart size={16} color="#6c63ff" />
                    return null
                  })()}</div>
                        <p style={{ fontSize: 13, margin: 0 }}>Parle-moi de tes objectifs, tes blocages ou tes progrès !</p>
                      </div>
                    )}
                    {coachMessages.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {m.role === 'assistant' && (
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>
                            {(() => {
                    const style = COACH_STYLES_LIST.find(s => s.id === coachStyle)
                    if (!style) return null
                    if (style.emoji === 'heart') return <Heart size={16} color="#e05c5c" fill="#e05c5c" />
                    if (style.emoji === 'flame') return <Flame size={16} color="#e08a3c" />
                    if (style.emoji === 'chart') return <BarChart size={16} color="#6c63ff" />
                    return null
                  })()}
                          </div>
                        )}
                        <div style={{
                          maxWidth: '78%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: m.role === 'user' ? T.accent : T.bg3,
                          color: m.role === 'user' ? T.bg : T.text,
                          fontSize: 13, lineHeight: 1.5
                        }}>
                          {m.contenu}
                        </div>
                      </div>
                    ))}
                    {coachLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                          {(() => {
                    const style = COACH_STYLES_LIST.find(s => s.id === coachStyle)
                    if (!style) return null
                    if (style.emoji === 'heart') return <Heart size={16} color="#e05c5c" fill="#e05c5c" />
                    if (style.emoji === 'flame') return <Flame size={16} color="#e08a3c" />
                    if (style.emoji === 'chart') return <BarChart size={16} color="#6c63ff" />
                    return null
                  })()}
                        </div>
                        <div style={{ padding: '9px 13px', background: T.bg3, borderRadius: '14px 14px 14px 4px', display: 'flex', gap: 4 }}>
                          {[0,1,2].map(i => (
                            <motion.div key={i} animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i*0.15 }}
                              style={{ width: 6, height: 6, borderRadius: '50%', background: T.text2 }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
                    <input
                      value={coachInput} onChange={e => setCoachInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && envoyerMessageCoach()}
                      placeholder="Écris à ton coach..."
                      style={{ flex: 1, padding: '9px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 13, outline: 'none' }} />
                    <motion.button onClick={envoyerMessageCoach} disabled={coachLoading} whileTap={{ scale: 0.95 }}
                      style={{ width: 38, height: 38, borderRadius: 12, background: T.accent, border: 'none', color: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      ➤
                    </motion.button>
                  </div>
                </>
              )}

              {/* Tab Rapport */}
              {coachTab === 'rapport' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                  {coachRapportLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 13, color: T.text2 }}>Génération du rapport...</p>
                    </div>
                  ) : coachRapport ? (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>
                          {coachRapport.note_semaine >= 8 ? <Trophy size={32} color='#e08a3c' /> : coachRapport.note_semaine >= 6 ? <CheckCircle2 size={32} color='#4caf82' /> : <Flame size={32} color={T.accent} />}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>{coachRapport.titre}</h3>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 99, background: `${T.accent}18`, border: `1px solid ${T.accent}30` }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{coachRapport.note_semaine}</span>
                          <span style={{ fontSize: 12, color: T.text2 }}>/10</span>
                        </div>
                      </div>
                      {/* Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        {[
                          { label: 'Complétées', val: coachRapport.stats?.terminees_semaine, color: '#4caf82' },
                          { label: 'Créées', val: coachRapport.stats?.creees_semaine, color: T.accent },
                          { label: 'Taux global', val: `${coachRapport.stats?.taux_completion}%`, color: '#e08a3c' },
                          { label: 'Streak', val: `${coachRapport.stats?.streak}j`, color: '#6c63ff' },
                        ].map((s, i) => (
                          <div key={i} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {[
                        { label: 'Point fort', val: coachRapport.point_fort, color: '#4caf82' },
                        { label: 'À améliorer', val: coachRapport.point_amelioration, color: '#e08a3c' },
                        { label: 'Défi semaine', val: coachRapport.defi_semaine_prochaine, color: T.accent },
                      ].map((s, i) => (
                        <div key={i} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.label}</div>
                          <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.5 }}>{s.val}</p>
                        </div>
                      ))}
                      <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, marginBottom: 4 }}><MessageCircle size={10} style={{marginRight:4}} /> Message de {coachRapport.coach?.nom}</div>
                        <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>{coachRapport.message_coach}</p>
                      </div>
                      <motion.button onClick={chargerRapportCoach} whileTap={{ scale: 0.97 }}
                        style={{ width: '100%', padding: '10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        Régénérer le rapport
                      </motion.button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <p style={{ fontSize: 13, color: T.text2, marginBottom: 16 }}>Génère ton rapport de coaching hebdomadaire</p>
                      <motion.button onClick={chargerRapportCoach} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
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


      {/* ===== DRAWER PARAMÈTRES ===== */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowSettings(false); setActiveSettingsTab('badges') }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, backdropFilter: 'blur(3px)' }} />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 1051, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>

              {/* Header drawer */}
              <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={18} color={T.accent} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h2>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{user?.nom}</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => { setShowSettings(false); setActiveSettingsTab('badges') }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>

                {/* Onglets */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                  {[
                    { id: 'badges',       label: 'Badges',       icon: Award },
                    { id: 'theme',        label: 'Thème',        icon: Palette },
                    { id: 'integrations', label: 'Intégrations', icon: ExternalLink },
                  ].map(({ id, label, icon: Icon }) => (
                    <motion.button key={id}
                      onClick={() => setActiveSettingsTab(id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px', background: 'none', border: 'none', borderBottom: activeSettingsTab === id ? `2px solid ${T.accent}` : '2px solid transparent', color: activeSettingsTab === id ? T.accent : T.text2, fontSize: 13, fontWeight: activeSettingsTab === id ? 600 : 400, cursor: 'pointer', borderRadius: '8px 8px 0 0' }}
                      whileHover={{ color: T.accent }}>
                      <Icon size={14} strokeWidth={1.8} />{label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Contenu scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                {/* ── ONGLET BADGES ── */}
                {activeSettingsTab === 'badges' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Résumé */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                      <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: T.accent }}>{badgesObtenus.length}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>badges obtenus</div>
                      </div>
                      <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#e08a3c' }}>{streak}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>jours de streak</div>
                      </div>
                    </div>

                    {/* Liste badges par catégorie */}
                    {['performance', 'points', 'streak', 'special'].map(cat => (
                      <div key={cat} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>{cat}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {BADGES_CONFIG.filter(b => b.categorie === cat).map(b => {
                            const obtenu = badgesObtenus.find(ob => ob.id === b.id)
                            return (
                              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: obtenu ? `${T.accent}08` : T.bg3, border: `1px solid ${obtenu ? T.accent + '30' : T.border}`, opacity: obtenu ? 1 : 0.45, transition: 'all 0.15s' }}>
                                <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: obtenu ? 600 : 400, color: T.text }}>{b.nom}</div>
                                  <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{b.description}</div>
                                </div>
                                {obtenu
                                  ? <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4caf82', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                  : <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px dashed ${T.border}`, flexShrink: 0 }} />
                                }
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* ── ONGLET THÈME ── */}
                {activeSettingsTab === 'theme' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p style={{ fontSize: 13, color: T.text2, marginBottom: 16, lineHeight: 1.5 }}>Choisis l'apparence de GetShift. Le thème est synchronisé sur tous tes appareils.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(themes).map(([key, t]) => (
                        <motion.button key={key}
                          onClick={() => changerTheme(key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: theme === key ? `${T.accent}12` : T.bg3, border: `1.5px solid ${theme === key ? T.accent : T.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
                          whileHover={{ borderColor: T.accent }}>
                          {/* Preview couleurs */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.bg }} />
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accent }} />
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.accent2 || t.accent }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: theme === key ? 700 : 500, color: T.text }}>{t.name}</div>
                          </div>
                          {theme === key && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── ONGLET INTÉGRATIONS ── */}
                {activeSettingsTab === 'integrations' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

                    {/* Slack */}
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4A154B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 16, color: 'white', fontWeight: 700 }}>S</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Slack</div>
                          <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Notifications de tâches dans votre canal</div>
                        </div>
                        {slackWebhook && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf82' }} />}
                      </div>
                      <input
                        style={{ width: '100%', padding: '10px 14px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                        placeholder="https://hooks.slack.com/services/..."
                        value={slackWebhook}
                        onChange={e => setSlackWebhook(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sauvegarderSlack()} />
                      <motion.button
                        style={{ width: '100%', padding: '10px', background: slackSaved ? '#4caf82' : `${T.accent}15`, border: `1px solid ${slackSaved ? '#4caf82' : T.accent + '40'}`, borderRadius: 10, color: slackSaved ? 'white' : T.accent, fontSize: 13, fontWeight: 600, cursor: slackSaving ? 'not-allowed' : 'pointer' }}
                        onClick={sauvegarderSlack} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                        {slackSaving ? 'Sauvegarde...' : slackSaved ? '✓ Webhook sauvegardé !' : 'Sauvegarder le webhook'}
                      </motion.button>
                      <p style={{ fontSize: 11, color: T.text2, marginTop: 10, lineHeight: 1.5 }}>
                        Créez un Incoming Webhook sur{' '}
                        <span style={{ color: T.accent, cursor: 'pointer' }} onClick={() => window.open('https://api.slack.com/messaging/webhooks', '_blank')}>api.slack.com</span>
                        {' '}et collez l'URL ci-dessus.
                      </p>
                    </div>

                    {/* Google Calendar */}
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 16, color: 'white', fontWeight: 700 }}>G</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Google Calendar</div>
                          <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Exporter vos tâches vers Calendar</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.6, margin: 0 }}>
                        Utilisez le bouton <strong style={{ color: T.text }}>Calendar</strong> sur chaque tâche ayant une deadline pour l'exporter directement dans Google Calendar.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer drawer */}
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 12, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                  whileHover={{ background: 'rgba(224,92,92,0.12)' }}>
                  <LogOut size={16} strokeWidth={1.8} />Se déconnecter
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== POPUP TASK DNA ===== */}
      <AnimatePresence>
        {(dnaLoading || showDnaPopup) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, backdropFilter: 'blur(4px)' }}
              onClick={!dnaLoading ? annulerCreationApresDNA : undefined} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ position: 'fixed', top: 16, left: 16, right: 16, bottom: 16, maxWidth: 480, margin: '0 auto', overflowY: 'auto', background: T.bg2, borderRadius: 20, border: `1px solid ${T.border}`, zIndex: 1101, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
              {dnaLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, margin: '0 auto 16px' }} />
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600, margin: 0 }}>🧬 Analyse du Task DNA en cours...</p>
                  <p style={{ fontSize: 12, color: T.text2, marginTop: 6 }}>L'IA étudie ton historique de tâches</p>
                </div>
              ) : dnaResult && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {dnaResult.emoji_categorie || '🧬'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Task DNA</h3>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${T.accent}18`, color: T.accent, fontWeight: 700 }}>IA</span>
                      </div>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{dnaResult.label_categorie} · {dnaResult.duree_label}</p>
                    </div>
                    <div style={{
                      padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: dnaResult.prediction === 'succes' ? 'rgba(76,175,130,0.15)' : dnaResult.prediction === 'abandon' ? 'rgba(224,92,92,0.15)' : 'rgba(224,138,60,0.15)',
                      color: dnaResult.prediction === 'succes' ? '#4caf82' : dnaResult.prediction === 'abandon' ? '#e05c5c' : '#e08a3c',
                      border: `1px solid ${dnaResult.prediction === 'succes' ? 'rgba(76,175,130,0.3)' : dnaResult.prediction === 'abandon' ? 'rgba(224,92,92,0.3)' : 'rgba(224,138,60,0.3)'}`
                    }}>
                      {dnaResult.prediction === 'succes' ? 'Succès prédit' : dnaResult.prediction === 'abandon' ? 'Risque abandon' : 'À surveiller'}
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>Score de viabilité</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: dnaResult.score_viabilite >= 70 ? '#4caf82' : dnaResult.score_viabilite >= 40 ? '#e08a3c' : '#e05c5c' }}>
                        {dnaResult.score_viabilite}%
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${dnaResult.score_viabilite}%` }} transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
                        style={{ height: '100%', borderRadius: 99, background: dnaResult.score_viabilite >= 70 ? '#4caf82' : dnaResult.score_viabilite >= 40 ? '#e08a3c' : '#e05c5c' }} />
                    </div>
                    {dnaResult.explication_score && (
                      <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 6, fontStyle: 'italic' }}>{dnaResult.explication_score}</p>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(76,175,130,0.07)', border: '1px solid rgba(76,175,130,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: '#4caf82', marginBottom: 6 }}><CheckCircle2 size={11} /> Points forts</div>
                      {(dnaResult.facteurs_succes || []).map((f, i) => (
                        <div key={i} style={{ fontSize: 11, color: T.text2, padding: '2px 0', lineHeight: 1.4 }}>· {f}</div>
                      ))}
                    </div>
                    <div style={{ background: 'rgba(224,92,92,0.07)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: '#e05c5c', marginBottom: 6 }}><AlertCircle size={11} /> Risques</div>
                      {(dnaResult.facteurs_risque || []).map((r, i) => (
                        <div key={i} style={{ fontSize: 11, color: T.text2, padding: '2px 0', lineHeight: 1.4 }}>· {r}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}22`, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 4 }}><Lightbulb size={11} /> Conseil IA</div>
                    <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6 }}>{dnaResult.conseil_principal}</p>
                  </div>
                  {dnaResult.conseil_reformulation && dnaResult.conseil_reformulation !== 'null' && (
                    <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: '#6c63ff', marginBottom: 4 }}><Pencil size={11} /> Titre suggéré</div>
                      <p style={{ fontSize: 12, color: T.text, margin: 0, fontStyle: 'italic' }}>"{dnaResult.conseil_reformulation}"</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: dnaResult.duree_label },
                      { label: 'Complexité ' + (dnaResult.niveau_complexite || '—') },
                      { label: 'Moment idéal : ' + (dnaResult.meilleur_moment || '—') },
                    ].map((m, i) => (
                      <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: T.bg3, color: T.text2, border: `1px solid ${T.border}` }}>{m.label}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button onClick={annulerCreationApresDNA} whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text2, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                      Annuler
                    </motion.button>
                    <motion.button onClick={confirmerCreationApresDNA} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{ flex: 2, padding: '11px 0', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', borderRadius: 12, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> Créer la tâche
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
    {/* TOAST UNDO */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
            <Trash2 size={15} color="#e05c5c" />
            <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Tâche supprimée</span>
            <div style={{ width: 60, height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
              <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} style={{ height: '100%', background: '#e05c5c', borderRadius: 99 }} />
            </div>
            <motion.button onClick={annulerSuppression} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              style={{ padding: '5px 14px', background: `${T.accent}18`, border: `1px solid ${T.accent}50`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Annuler
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
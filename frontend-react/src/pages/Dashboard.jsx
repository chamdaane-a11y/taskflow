import { useState, useEffect, useRef } from 'react'
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
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import { useOffline } from '../useOffline'
import {
  sauvegarderTachesLocalement,
  lireTachesLocalement,
  sauvegarderProfilLocalement,
  lireProfilLocalement,
  ajouterTacheLocalement,
  mettreAJourTacheLocalement,
  supprimerTacheLocalement,
  ajouterActionSync,
} from '../db'

registerLocale('fr', fr)
const API = 'https://taskflow-production-75c1.up.railway.app'

// ============ ICÔNES SVG PROFESSIONNELLES ============
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

// ============ AnimatedNumber ============
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    if (value === 0) { setDisplay(0); return }
    const timer = setInterval(() => {
      start += 1
      setDisplay(start)
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

const badges = [
  { id: 'first', label: 'Premiere tache', condition: (t, p) => t >= 1 },
  { id: 'five', label: '5 taches terminees', condition: (t, p) => t >= 5 },
  { id: 'ten', label: '10 taches terminees', condition: (t, p) => t >= 10 },
  { id: 'points100', label: '100 points', condition: (t, p) => p >= 100 },
  { id: 'points500', label: '500 points', condition: (t, p) => p >= 500 },
]

const PRIORITES = [
  { val: 'haute',   label: 'Haute',   bg: 'rgba(224,92,92,0.12)',   color: '#e05c5c' },
  { val: 'moyenne', label: 'Moyenne', bg: 'rgba(224,138,60,0.12)',  color: '#e08a3c' },
  { val: 'basse',   label: 'Basse',   bg: 'rgba(76,175,130,0.12)', color: '#4caf82' },
]

function PrioriteSelect({ value, onChange, T }) {
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
        {current.label}
        <ChevronDown size={12} />
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
                {p.label}
                {value === p.val && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ Composant Dépendances ============
function Dependances({ tache, toutesLesTaches, T, onUpdate }) {
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
    try {
      const res = await axios.get(`${API}/taches/${tache.id}/dependances`)
      setDependances(res.data)
    } catch (err) { console.error(err) }
  }

  const ajouterDependance = async (dependDeId) => {
    setLoading(true)
    try {
      await axios.post(`${API}/taches/${tache.id}/dependances`, { depend_de_id: dependDeId })
      await chargerDependances()
      setShowDropdown(false)
      if (onUpdate) onUpdate()
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const supprimerDependance = async (depId) => {
    try {
      await axios.delete(`${API}/dependances/${depId}`)
      await chargerDependances()
      if (onUpdate) onUpdate()
    } catch (err) { console.error(err) }
  }

  const depIds = dependances.map(d => d.depend_de_id)
  const disponibles = toutesLesTaches.filter(t =>
    t.id !== tache.id && !depIds.includes(t.id) && !t.terminee
  )

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: dependances.length > 0 ? 8 : 6 }}>
        <IconLink size={12} color={T.text2} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.text2, letterSpacing: 0.5 }}>PRÉREQUIS</span>
        {dependances.length > 0 && (
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 700 }}>
            {dependances.filter(d => d.terminee).length}/{dependances.length} terminés
          </span>
        )}
      </div>

      {/* Liste des prérequis */}
      <AnimatePresence>
        {dependances.map((dep, i) => (
          <motion.div key={dep.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 5, borderRadius: 8, background: dep.terminee ? 'rgba(76,175,130,0.07)' : 'rgba(224,92,92,0.06)', border: `1px solid ${dep.terminee ? 'rgba(76,175,130,0.2)' : 'rgba(224,92,92,0.15)'}` }}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.04 }}>

            {/* Statut cercle */}
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: dep.terminee ? '#4caf82' : 'transparent', border: `2px solid ${dep.terminee ? '#4caf82' : '#e05c5c'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {dep.terminee
                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <IconLock size={9} color="#e05c5c" />
              }
            </div>

            <span style={{ flex: 1, fontSize: 12, color: dep.terminee ? T.text2 : T.text, textDecoration: dep.terminee ? 'line-through' : 'none', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dep.titre_prerequis}
            </span>

            <span style={{ fontSize: 10, fontWeight: 600, color: dep.terminee ? '#4caf82' : '#e05c5c', flexShrink: 0, padding: '1px 6px', borderRadius: 99, background: dep.terminee ? 'rgba(76,175,130,0.1)' : 'rgba(224,92,92,0.1)' }}>
              {dep.terminee ? 'Terminé' : 'En attente'}
            </span>

            <motion.button
              style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onClick={() => supprimerDependance(dep.id)}
              whileHover={{ color: '#e05c5c' }}
              title="Supprimer ce prérequis">
              <IconUnlink size={12} color="currentColor" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bouton ajouter */}
      <div ref={ref} style={{ position: 'relative', marginTop: 4 }}>
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: 'transparent', border: `1px dashed ${disponibles.length === 0 ? T.border : T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, cursor: disponibles.length === 0 ? 'not-allowed' : 'pointer', opacity: disponibles.length === 0 ? 0.5 : 1 }}
          onClick={() => disponibles.length > 0 && setShowDropdown(!showDropdown)}
          whileHover={disponibles.length > 0 ? { borderColor: T.accent, color: T.accent } : {}}>
          <IconLink size={11} color="currentColor" />
          {disponibles.length === 0 ? 'Aucune tâche disponible comme prérequis' : 'Ajouter un prérequis'}
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              style={{ position: 'absolute', bottom: '110%', left: 0, zIndex: 300, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 -8px 24px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 230, maxHeight: 200, overflowY: 'auto' }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, borderBottom: `1px solid ${T.border}` }}>
                CHOISIR UN PRÉREQUIS
              </div>
              {disponibles.map(t => {
                const couleurPrio = t.priorite === 'haute' ? '#e05c5c' : t.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
                return (
                  <motion.button key={t.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', color: T.text, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                    onClick={() => ajouterDependance(t.id)}
                    whileHover={{ background: `${T.accent}10`, color: T.accent }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: couleurPrio, flexShrink: 0 }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.titre}</span>
                    <span style={{ fontSize: 10, color: couleurPrio, flexShrink: 0 }}>{t.priorite}</span>
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

// ============ Composant SousTaches ============
function SousTaches({ tache, T }) {
  const [sousTaches, setSousTaches] = useState([])
  const [nouvelleSousTache, setNouvelleSousTache] = useState('')
  const [loading, setLoading] = useState(false)
  const [ajoutVisible, setAjoutVisible] = useState(false)

  useEffect(() => { chargerSousTaches() }, [tache.id])

  const chargerSousTaches = async () => {
    try {
      const res = await axios.get(`${API}/taches/${tache.id}/sous-taches`)
      setSousTaches(res.data)
    } catch (err) { console.error(err) }
  }

  const ajouterSousTache = async () => {
    if (!nouvelleSousTache.trim()) return
    setLoading(true)
    try {
      await axios.post(`${API}/taches/${tache.id}/sous-taches`, { titre: nouvelleSousTache, ordre: sousTaches.length })
      setNouvelleSousTache('')
      setAjoutVisible(false)
      await chargerSousTaches()
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const toggleSousTache = async (st) => {
    try {
      await axios.put(`${API}/sous-taches/${st.id}`, { terminee: !st.terminee })
      await chargerSousTaches()
    } catch (err) { console.error(err) }
  }

  const supprimerSousTache = async (id) => {
    try {
      await axios.delete(`${API}/sous-taches/${id}`)
      await chargerSousTaches()
    } catch (err) { console.error(err) }
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
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, #4caf82)`, borderRadius: 99 }}
              animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      )}
      <AnimatePresence>
        {sousTaches.map((st, i) => (
          <motion.div key={st.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.border}30` }}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ delay: i * 0.04 }}>
            <motion.button
              style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${st.terminee ? '#4caf82' : T.border}`, background: st.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => toggleSousTache(st)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
              {st.terminee && <CheckSquare size={8} color="white" strokeWidth={3} />}
            </motion.button>
            <span style={{ flex: 1, fontSize: 12, color: st.terminee ? T.text2 : T.text, textDecoration: st.terminee ? 'line-through' : 'none', lineHeight: 1.4 }}>{st.titre}</span>
            <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, display: 'flex' }}
              onClick={() => supprimerSousTache(st.id)} whileHover={{ color: '#e05c5c' }}>
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
            onKeyDown={e => { if (e.key === 'Enter') ajouterSousTache(); if (e.key === 'Escape') setAjoutVisible(false) }}
            autoFocus />
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
}

function exporterGoogleCalendar(tache) {
  const titre = encodeURIComponent(tache.titre)
  const deadline = new Date(tache.deadline)
  const dateStr = deadline.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, 8)
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titre}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent('Tâche TaskFlow - Priorité: ' + tache.priorite)}`
  window.open(url, '_blank')
}

export default function Dashboard() {
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
  const [expandMode, setExpandMode] = useState({}) // 'sousTaches' | 'dependances'
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackSaving, setSlackSaving] = useState(false)
  const [slackSaved, setSlackSaved] = useState(false)
  const [erreurForm, setErreurForm] = useState('')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [appInstalled, setAppInstalled] = useState(false)
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)
  const user = JSON.parse(localStorage.getItem('user'))
  const T = themes[theme]
  const [showGuideBanner, setShowGuideBanner] = useState(() => !localStorage.getItem('guide_vu'))
  const { isOnline, isSyncing, pendingActions, syncResult, chargerPendingCount } = useOffline(user?.id)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerProfil()
    chargerTaches()
    chargerRappels()
    chargerSlackWebhook()
    activerNotifications()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setAppInstalled(true)
      setShowInstallBanner(false)
      setInstallPrompt(null)
    })
    if (window.matchMedia('(display-mode: standalone)').matches) setAppInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const chargerProfil = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}`)
      setPoints(res.data.points || 0)
      setNiveau(res.data.niveau || 1)
      const t = res.data.theme || 'dark'
      setTheme(t)
      localStorage.setItem('theme', t)
      await sauvegarderProfilLocalement(res.data)
    } catch (err) {
      const profil = await lireProfilLocalement(user.id)
      if (profil) {
        setPoints(profil.points || 0)
        setNiveau(profil.niveau || 1)
        const t = profil.theme || 'dark'
        setTheme(t)
      }
    }
  }

  const chargerTaches = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/taches/${user.id}`)
      setTaches(res.data)
      await sauvegarderTachesLocalement(res.data)
    } catch (err) {
      const tachesLocales = await lireTachesLocalement(user.id)
      setTaches(tachesLocales)
    }
    setLoading(false)
  }

  const chargerRappels = async () => {
    const res = await axios.get(`${API}/taches/rappels/${user.id}`)
    if (res.data.rappels) setRappels(res.data.rappels)
  }

  const chargerSlackWebhook = async () => {
    try {
      const res = await axios.get(`${API}/integrations/slack?user_id=${user.id}`)
      if (res.data.webhook_url) setSlackWebhook(res.data.webhook_url)
    } catch (err) {}
  }

  const sauvegarderSlack = async () => {
    if (!slackWebhook.trim()) return
    setSlackSaving(true)
    try {
      await axios.post(`${API}/integrations/slack`, { user_id: user.id, webhook_url: slackWebhook })
      setSlackSaved(true)
      afficherNotification('Webhook Slack sauvegardé !')
      setTimeout(() => setSlackSaved(false), 3000)
    } catch (err) { afficherNotification('Erreur lors de la sauvegarde') }
    setSlackSaving(false)
  }

  const changerTheme = async (newTheme) => {
    setTheme(newTheme)
    setShowThemes(false)
    setShowSettings(false)
    localStorage.setItem('theme', newTheme)
    await axios.put(`${API}/users/${user.id}/theme`, { theme: newTheme })
  }

  const afficherNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const ajouterTache = async () => {
    if (!titre.trim()) return
    if (!deadline) { setErreurForm("La date et l'heure sont obligatoires."); return }
    const data = { titre, priorite, deadline: deadline.toISOString().slice(0, 16), user_id: user.id }
    setTitre(''); setDeadline(null); setErreurForm('')
    if (!isOnline) {
      const tacheLocale = await ajouterTacheLocalement({ ...data, bloquee: false, terminee: false })
      await ajouterActionSync({ type: 'AJOUTER_TACHE', data: { ...data, id_temp: tacheLocale.id } })
      await chargerPendingCount()
      setTaches(prev => [tacheLocale, ...prev])
      afficherNotification('Tâche sauvegardée offline ⚡')
      return
    }
    await axios.post(`${API}/taches`, data)
    afficherNotification('Tâche ajoutée avec succès')
    chargerTaches()
  }

  const toggleTache = async (id, terminee, tachePriorite, bloquee) => {
    if (!terminee && bloquee) {
      afficherNotification('⛔ Cette tâche est bloquée par des prérequis non terminés', 'error')
      return
    }
    const nouvelEtat = !terminee
    if (!isOnline) {
      await mettreAJourTacheLocalement(id, { terminee: nouvelEtat })
      await ajouterActionSync({ type: 'TERMINER_TACHE', data: { id, terminee: nouvelEtat } })
      await chargerPendingCount()
      setTaches(prev => prev.map(t => t.id === id ? { ...t, terminee: nouvelEtat } : t))
      if (nouvelEtat) {
        const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
        afficherNotification(`+${pts} pts (sync au retour réseau)`)
      }
      return
    }
    try {
      await axios.put(`${API}/taches/${id}`, { terminee: nouvelEtat })
      if (!terminee) {
        const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10
        const res = await axios.put(`${API}/users/${user.id}/points`, { points: pts })
        setPoints(res.data.points)
        setNiveau(res.data.niveau)
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
        afficherNotification(`+${pts} points gagnés`)
      }
      chargerTaches()
    } catch (err) {
      afficherNotification('⛔ Tâche bloquée par des prérequis non terminés', 'error')
    }
  }

  const supprimerTache = async (id) => {
    await supprimerTacheLocalement(id)
    if (!isOnline) {
      await ajouterActionSync({ type: 'SUPPRIMER_TACHE', data: { id } })
      await chargerPendingCount()
      setTaches(prev => prev.filter(t => t.id !== id))
      afficherNotification('Suppression en attente de sync')
      return
    }
    await axios.delete(`${API}/taches/${id}`)
    chargerTaches()
  }

  const genererTaches = async () => {
    if (!objectif.trim()) return
    afficherNotification('Génération en cours...')
    const res = await axios.post(`${API}/ia/generer-taches`, { objectif, user_id: user.id, priorite: 'moyenne' })
    if (res.data.taches) {
      afficherNotification(`${res.data.taches.length} tâches créées`)
      setObjectif('')
      chargerTaches()
      setTimeout(() => navigate('/ia'), 1500)
    }
  }

  // Toggle expand avec mode (sousTaches ou dependances)
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
    if (outcome === 'accepted') {
      setAppInstalled(true)
      setShowInstallBanner(false)
      afficherNotification('TaskFlow installé avec succès !')
    }
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
      const reg = await navigator.serviceWorker.register('/taskflow/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      const res = await axios.get(`${API}/push/vapid-public-key`)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(res.data.public_key)
      })
      await axios.post(`${API}/push/subscribe`, { user_id: user.id, subscription: sub.toJSON() })
    } catch (e) { console.log('Push non supporté', e) }
  }

  const bloquees = taches.filter(t => t.bloquee && !t.terminee).length

  const tachesFiltrees = taches.filter(t => {
    if (filtre === 'toutes') return true
    if (filtre === 'terminee') return t.terminee
    if (filtre === 'haute') return t.priorite === 'haute' && !t.terminee
    if (filtre === 'bloquee') return t.bloquee && !t.terminee
    return t.priorite === filtre
  })

  const total = taches.length
  const terminees = taches.filter(t => t.terminee).length
  const haute = taches.filter(t => t.priorite === 'haute' && !t.terminee).length
  const enCours = total - terminees
  const pct = total > 0 ? Math.round((terminees / total) * 100) : 0
  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
  const niveauActuel = niveaux.find(n => n.niveau === niveau) || niveaux[0]
  const niveauSuivant = niveaux.find(n => n.niveau === niveau + 1)
  const pctNiveau = niveauSuivant ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100) : 100
  const badgesObtenus = badges.filter(b => b.condition(terminees, points))

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
    { icon: Users, label: 'Collaboration', path: '/collaboration' },
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

      {/* ===== SIDEBAR ===== */}
      <aside style={{ width: 'min(248px, 80%)', maxWidth: '248px', background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 3vh, 24px) clamp(12px, 2vw, 16px)', position: 'fixed', top: 0, left: isMobile ? (showSidebar ? 0 : '-100%') : 0, height: '100vh', transition: 'left 0.3s ease', zIndex: 100, overflowY: 'auto', paddingBottom: '80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'clamp(24px, 4vh, 32px)', padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>

        <div style={{ background: T.bg3, borderRadius: 12, padding: 'clamp(10px, 2vh, 14px)', marginBottom: 24, border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {user?.nom?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nom}</div>
              <div style={{ fontSize: 11, color: T.text2 }}>Niveau {niveau} — {niveauActuel.label}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text2, marginBottom: 6 }}>
            <span>{points} pts</span><span>{pctNiveau}%</span>
          </div>
          <div style={{ height: 4, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, borderRadius: 99 }}
              initial={{ width: 0 }} animate={{ width: `${pctNiveau}%` }} transition={{ duration: 1 }} />
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
          {navItems.map(item => {
            const Icon = item.icon
            const active = window.location.pathname === item.path
            return (
              <motion.button key={item.path}
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

        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: showSettings ? `${T.accent}15` : 'transparent', border: 'none', color: showSettings ? T.accent : T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left', marginTop: 8, marginBottom: 2 }}
          onClick={() => { setShowSettings(!showSettings); if (showSettings) { setShowBadges(false); setShowThemes(false); setShowIntegrations(false) } }}
          whileHover={{ color: T.accent }}>
          <Settings size={16} strokeWidth={1.8} /><span>Paramètres</span>
        </motion.button>

        <AnimatePresence>
          {showSettings && (
            <motion.div style={{ background: T.bg3, borderRadius: 10, padding: 8, marginBottom: 8, border: `1px solid ${T.border}` }}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>

              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: showBadges ? `${T.accent}15` : 'transparent', border: 'none', color: showBadges ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
                onClick={() => { setShowBadges(!showBadges); setShowThemes(false); setShowIntegrations(false) }} whileHover={{ x: 2, color: T.accent }}>
                <Award size={14} strokeWidth={1.8} /><span>Badges ({badgesObtenus.length}/{badges.length})</span>
              </motion.button>
              <AnimatePresence>
                {showBadges && (
                  <motion.div style={{ background: T.bg2, borderRadius: 8, padding: 8, marginBottom: 8, border: `1px solid ${T.border}` }}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {badges.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', opacity: badgesObtenus.find(ob => ob.id === b.id) ? 1 : 0.3 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: T.text2 }}>{b.label}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: showThemes ? `${T.accent}15` : 'transparent', border: 'none', color: showThemes ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
                onClick={() => { setShowThemes(!showThemes); setShowBadges(false); setShowIntegrations(false) }} whileHover={{ x: 2, color: T.accent }}>
                <Palette size={14} strokeWidth={1.8} /><span>Thème</span>
              </motion.button>
              <AnimatePresence>
                {showThemes && (
                  <motion.div style={{ background: T.bg2, borderRadius: 8, padding: 8, marginBottom: 8, border: `1px solid ${T.border}` }}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {Object.entries(themes).map(([key, t]) => (
                      <motion.button key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: theme === key ? `${T.accent}20` : 'transparent', border: 'none', color: theme === key ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
                        onClick={() => changerTheme(key)} whileHover={{ x: 2 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent, flexShrink: 0 }} /><span>{t.name}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: showIntegrations ? `${T.accent}15` : 'transparent', border: 'none', color: showIntegrations ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
                onClick={() => { setShowIntegrations(!showIntegrations); setShowBadges(false); setShowThemes(false) }} whileHover={{ x: 2, color: T.accent }}>
                <ExternalLink size={14} strokeWidth={1.8} /><span>Intégrations</span>
              </motion.button>
              <AnimatePresence>
                {showIntegrations && (
                  <motion.div style={{ background: T.bg2, borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${T.border}` }}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: '#4A154B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>S</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Slack Webhook</span>
                        {slackWebhook && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82', marginLeft: 'auto' }} />}
                      </div>
                      <input style={{ width: '100%', padding: '6px 8px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 7, color: T.text, fontSize: 11, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
                        placeholder="https://hooks.slack.com/..." value={slackWebhook}
                        onChange={e => setSlackWebhook(e.target.value)} onKeyDown={e => e.key === 'Enter' && sauvegarderSlack()} />
                      <motion.button style={{ width: '100%', padding: '6px 10px', background: slackSaved ? '#4caf82' : `${T.accent}15`, border: `1px solid ${slackSaved ? '#4caf82' : T.accent + '40'}`, borderRadius: 7, color: slackSaved ? 'white' : T.accent, fontSize: 11, fontWeight: 600, cursor: slackSaving ? 'not-allowed' : 'pointer' }}
                        onClick={sauvegarderSlack} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        {slackSaving ? 'Sauvegarde...' : slackSaved ? '✓ Sauvegardé !' : 'Sauvegarder'}
                      </motion.button>
                      <p style={{ fontSize: 10, color: T.text2, marginTop: 5, lineHeight: 1.4 }}>
                        Créez un Incoming Webhook sur <span style={{ color: T.accent }}>api.slack.com</span> et collez l'URL ici.
                      </p>
                    </div>
                    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>G</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Google Calendar</span>
                      </div>
                      <p style={{ fontSize: 10, color: T.text2, lineHeight: 1.4 }}>Utilisez le bouton sur chaque tâche avec une deadline pour l'exporter.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 12 }}
                onClick={() => { localStorage.removeItem('user'); navigate('/') }} whileHover={{ x: 2, color: '#e05c5c' }}>
                <LogOut size={14} strokeWidth={1.8} /><span>Déconnexion</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ height: '20px' }} />
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 40, height: 40, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={20} />
        </motion.button>
      )}
      {isMobile && showSidebar && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setShowSidebar(false)} />}

      {/* ===== MAIN ===== */}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Bienvenue sur TaskFlow !</div>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Installer TaskFlow</div>
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
            <motion.div
              style={{ background: 'rgba(224,138,60,0.1)', border: '1px solid rgba(224,138,60,0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(224,138,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e08a3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                  <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                  <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
                  <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                  <line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e08a3c' }}>Mode hors ligne</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
                  {pendingActions > 0
                    ? `${pendingActions} action${pendingActions > 1 ? 's' : ''} en attente de synchronisation`
                    : 'Les modifications seront synchronisées au retour du réseau'}
                </div>
              </div>
              {pendingActions > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(224,138,60,0.15)', color: '#e08a3c' }}>
                  {pendingActions} en attente
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bannière sync au retour en ligne */}
        <AnimatePresence>
          {syncResult && (
            <motion.div
              style={{ background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4caf82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4caf82' }}>
                Synchronisation terminée — {syncResult.synced} action{syncResult.synced > 1 ? 's' : ''} synchronisée{syncResult.synced > 1 ? 's' : ''} ✓
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicateur sync en cours */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 14, padding: '10px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
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
          {rappels.length > 0 && (
            <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 99, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer', alignSelf: isMobile ? 'flex-start' : 'auto' }}
              onClick={() => setShowRappels(!showRappels)} whileHover={{ scale: 1.02 }}>
              <Bell size={14} />{rappels.length} rappel{rappels.length > 1 ? 's' : ''}
            </motion.button>
          )}
        </motion.div>

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

        {/* Alerte tâches bloquées */}
        <AnimatePresence>
          {bloquees > 0 && (
            <motion.div
              style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <IconLock size={15} color="#e05c5c" />
              <span style={{ flex: 1, fontSize: 13, color: '#e05c5c', fontWeight: 500 }}>
                {bloquees} tâche{bloquees > 1 ? 's bloquées' : ' bloquée'} — des prérequis doivent être terminés en premier.
              </span>
              <motion.button style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, color: '#e05c5c', fontSize: 12, cursor: 'pointer' }}
                onClick={() => setFiltre('bloquee')} whileHover={{ background: 'rgba(224,92,92,0.08)' }}>
                Voir
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progression */}
        <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)', marginBottom: 24 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
            </div>
            {erreurForm && <p style={{ fontSize: 12, color: '#e05c5c', marginTop: 6 }}>{erreurForm}</p>}
          </motion.div>

          <motion.div style={{ background: T.bg2, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: 'clamp(12px, 3vw, 20px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
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
          {[
            ['toutes', 'Toutes'],
            ['haute', 'Haute'],
            ['moyenne', 'Moyenne'],
            ['basse', 'Basse'],
            ['bloquee', 'Bloquées'],
            ['terminee', 'Terminées']
          ].map(([val, label]) => (
            <motion.button key={val}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', background: filtre === val ? `${T.accent}15` : 'transparent', border: `1px solid ${filtre === val ? T.accent : T.border}`, borderRadius: 99, color: filtre === val ? T.accent : T.text2, fontSize: 12, fontWeight: filtre === val ? 600 : 400, cursor: 'pointer' }}
              onClick={() => setFiltre(val)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {val === 'bloquee' && <IconLock size={11} color="currentColor" />}
              {label}
              {val === 'bloquee' && bloquees > 0 && (
                <span style={{ background: '#e05c5c', color: 'white', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>{bloquees}</span>
              )}
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

                  {/* Barre latérale rouge si bloquée */}
                  {isBloquee && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #e05c5c, #e08a3c)', borderRadius: '12px 0 0 12px' }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingLeft: isBloquee ? 8 : 0 }}>

                    {/* Checkbox ou cadenas */}
                    {isBloquee ? (
                      <motion.div
                        style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' }}
                        animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
                        title="Tâche bloquée par un prérequis">
                        <IconLock size={10} color="#e05c5c" />
                      </motion.div>
                    ) : (
                      <motion.button
                        style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${tache.terminee ? '#4caf82' : T.border}`, background: tache.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                        {tache.terminee && <CheckSquare size={10} color="white" strokeWidth={3} />}
                      </motion.button>
                    )}

                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, textDecoration: tache.terminee ? 'line-through' : 'none', color: tache.terminee ? T.text2 : isBloquee ? T.text2 : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tache.titre}</span>
                        {isBloquee && (
                          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: 'rgba(224,92,92,0.12)', color: '#e05c5c', fontWeight: 600, flexShrink: 0 }}>Bloquée</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        {tache.deadline && <span style={{ fontSize: 11, color: T.text2 }}>{new Date(tache.deadline).toLocaleDateString('fr-FR')}</span>}
                        {!tache.terminee && !isBloquee && <span style={{ fontSize: 11, color: T.accent }}>+{pts} pts</span>}
                      </div>
                    </div>

                    {/* Badge priorité */}
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: tache.priorite === 'haute' ? 'rgba(224,92,92,0.12)' : tache.priorite === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)', color: tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'moyenne' ? '#e08a3c' : '#4caf82', flexShrink: 0 }}>
                      {tache.priorite}
                    </span>

                    {/* Bouton Google Calendar */}
                    {tache.deadline && !tache.terminee && (
                      <motion.button
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', background: 'white', border: '1px solid #dadce0', borderRadius: 8, fontSize: 11, cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                        onClick={() => exporterGoogleCalendar(tache)}
                        whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        title="Exporter vers Google Calendar">
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

                    {/* Bouton Prérequis (dépendances) */}
                    <motion.button
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: isExpanded && currentMode === 'dependances' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'dependances' ? T.accent : T.border}`, borderRadius: 8, color: isExpanded && currentMode === 'dependances' ? T.accent : T.text2, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => toggleExpand(tache.id, 'dependances')}
                      whileHover={{ borderColor: T.accent, color: T.accent }}
                      title="Gérer les prérequis de cette tâche">
                      <IconLink size={12} color="currentColor" />
                      <span style={{ display: isMobile ? 'none' : 'inline' }}>Prérequis</span>
                    </motion.button>

                    {/* Bouton Sous-tâches */}
                    <motion.button
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: isExpanded && currentMode === 'sousTaches' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'sousTaches' ? T.accent : T.border}`, borderRadius: 8, color: isExpanded && currentMode === 'sousTaches' ? T.accent : T.text2, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => toggleExpand(tache.id, 'sousTaches')}
                      whileHover={{ borderColor: T.accent, color: T.accent }}>
                      {isExpanded && currentMode === 'sousTaches' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <span style={{ display: isMobile ? 'none' : 'inline' }}>Sous-tâches</span>
                    </motion.button>

                    {/* Bouton Terminer */}
                    <motion.button
                      style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.2)' : T.border}`, color: isBloquee ? 'rgba(224,92,92,0.4)' : T.text2, borderRadius: 8, fontSize: 12, cursor: isBloquee ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                      onClick={() => !isBloquee && toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)}
                      whileHover={!isBloquee ? { borderColor: '#4caf82', color: '#4caf82' } : {}}>
                      {tache.terminee ? 'Rouvrir' : isBloquee ? 'Bloquée' : 'Terminer'}
                    </motion.button>

                    {/* Bouton Supprimer */}
                    <motion.button
                      style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.text2, display: 'flex', flexShrink: 0 }}
                      onClick={() => supprimerTache(tache.id)} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                      <Trash2 size={14} strokeWidth={1.8} />
                    </motion.button>
                  </div>

                  {/* Panel dépendances ou sous-tâches */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                        {currentMode === 'sousTaches' && <SousTaches tache={tache} T={T} />}
                        {currentMode === 'dependances' && (
                          <Dependances
                            tache={tache}
                            toutesLesTaches={taches}
                            T={T}
                            onUpdate={chargerTaches}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
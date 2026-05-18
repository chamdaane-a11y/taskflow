import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import {
  LayoutDashboard, CheckSquare, Clock, AlertTriangle,
  ChevronRight, Trash2, Plus, LogOut, Bot, BarChart2,
  Calendar, Layers, Bell, Award, Palette, Sparkles, Target, Users, Settings, HelpCircle,
  ChevronDown, ChevronUp, ExternalLink, User, Download, BookOpen, X,
  Flame, Star, Heart, BarChart, CheckCircle2, Flag, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen, Link2, Sunset, ArrowRight, TrendingUp,
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import ExportModal from './ExportModal'
import Onboarding from './Onboarding'
import { useDashboard } from './useDashboard'
import React from 'react'
import axios from 'axios'
import OutilsIntegrations from './OutilsIntegrations'
import TemplateIconBox from './CustomIcons'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import { BADGES_CONFIG } from '../data/badges'
import { parseTaskInput, getPrioriteColor, getPrioriteBg } from '../utils/parseTask'

registerLocale('fr', fr)

const API = 'https://getshift-backend.onrender.com'

const PRIORITES = [
  { val: 'haute', label: 'Haute', bg: 'rgba(224,92,92,0.12)', color: '#e05c5c' },
  { val: 'moyenne', label: 'Moyenne', bg: 'rgba(224,138,60,0.12)', color: '#e08a3c' },
  { val: 'basse', label: 'Basse', bg: 'rgba(76,175,130,0.12)', color: '#4caf82' },
]

const COACH_STYLES_LIST = [
  { id: 'bienveillant', nom: 'Alex', emoji: 'heart', desc: 'Doux & encourageant' },
  { id: 'motivateur', nom: 'Max', emoji: 'flame', desc: 'Energique & challengeant' },
  { id: 'analytique', nom: 'Nova', emoji: 'chart', desc: 'Précis & factuel' },
]

// ── Icons SVG ─────────────────────────────────────────────────────────────────
const IconLock = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IconLink = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)
const IconUnlink = ({ size = 13, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
    <path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
    <line x1="8" y1="2" x2="8" y2="5" /><line x1="2" y1="8" x2="5" y2="8" />
    <line x1="16" y1="19" x2="16" y2="22" /><line x1="19" y1="16" x2="22" y2="16" />
  </svg>
)

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ w = '100%', h = 16, r = 8, style = {} }) => (
  <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    style={{ width: w, height: h, borderRadius: r, background: 'rgba(128,128,128,0.15)', ...style }} />
)
const SkeletonCard = ({ T }) => (
  <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 20px', marginBottom: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Skeleton w={22} h={22} r={11} />
      <div style={{ flex: 1 }}>
        <Skeleton h={13} r={5} style={{ marginBottom: 6 }} />
        <Skeleton w="45%" h={10} r={4} />
      </div>
      <Skeleton w={55} h={22} r={99} />
      <Skeleton w={65} h={28} r={8} />
    </div>
  </div>
)

// ── AnimatedNumber ─────────────────────────────────────────────────────────────
const AnimatedNumber = memo(function AnimatedNumber({ value }) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    let start = 0
    const step = Math.max(1, Math.floor(value / 30))
    const timer = setInterval(() => {
      start = Math.min(start + step, value)
      setDisplay(start)
      if (start >= value) clearInterval(timer)
    }, 20)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}</span>
})

// ── PrioriteSelect ─────────────────────────────────────────────────────────────
const PrioriteSelect = memo(function PrioriteSelect({ value, onChange, T }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)
  const current = PRIORITES.find(p => p.val === value) || PRIORITES[1]
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: current.bg, border: `1.5px solid ${current.color}50`, borderRadius: 10, color: current.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        whileHover={{ scale: 1.03 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: current.color, display: 'inline-block' }} />
        {current.label}<ChevronDown size={12} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: 130 }}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {PRIORITES.map(p => (
              <motion.button key={p.val}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: value === p.val ? p.bg : 'transparent', border: 'none', color: p.color, fontSize: 13, fontWeight: value === p.val ? 700 : 500, cursor: 'pointer' }}
                onClick={() => { onChange(p.val); setOpen(false) }} whileHover={{ background: p.bg }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                {p.label}{value === p.val && <span style={{ marginLeft: 'auto' }}>✓</span>}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ── SousTaches ─────────────────────────────────────────────────────────────────
const SousTaches = memo(function SousTaches({ tache, T }) {
  const [sousTaches, setSousTaches] = React.useState([])
  const [nouvelle, setNouvelle] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [ajoutVisible, setAjoutVisible] = React.useState(false)
  React.useEffect(() => { charger() }, [tache.id])
  const charger = async () => { try { const r = await axios.get(`${API}/taches/${tache.id}/sous-taches`); setSousTaches(r.data) } catch { } }
  const ajouter = async () => {
    if (!nouvelle.trim()) return; setLoading(true)
    try { await axios.post(`${API}/taches/${tache.id}/sous-taches`, { titre: nouvelle, ordre: sousTaches.length }); setNouvelle(''); setAjoutVisible(false); await charger() } catch { }
    setLoading(false)
  }
  const toggle = async (st) => { try { await axios.put(`${API}/sous-taches/${st.id}`, { terminee: !st.terminee }); await charger() } catch { } }
  const supprimer = async (id) => { try { await axios.delete(`${API}/sous-taches/${id}`); await charger() } catch { } }
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
      {sousTaches.map(st => (
        <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.border}30` }}>
          <motion.button style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${st.terminee ? '#4caf82' : T.border}`, background: st.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => toggle(st)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            {st.terminee && <CheckSquare size={8} color="white" strokeWidth={3} />}
          </motion.button>
          <span style={{ flex: 1, fontSize: 12, color: st.terminee ? T.text2 : T.text, textDecoration: st.terminee ? 'line-through' : 'none' }}>{st.titre}</span>
          <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, display: 'flex' }} onClick={() => supprimer(st.id)} whileHover={{ color: '#e05c5c' }}>
            <Trash2 size={11} strokeWidth={1.8} />
          </motion.button>
        </div>
      ))}
      {ajoutVisible ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input style={{ flex: 1, padding: '5px 10px', background: T.bg3, border: `1px solid ${T.accent}40`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none' }}
            placeholder="Nouvelle sous-tâche..." value={nouvelle} onChange={e => setNouvelle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ajouter(); if (e.key === 'Escape') setAjoutVisible(false) }} autoFocus />
          <button style={{ padding: '5px 10px', background: T.accent, border: 'none', borderRadius: 8, color: T.bg, fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={ajouter}>{loading ? '...' : 'OK'}</button>
          <button style={{ padding: '5px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 11, cursor: 'pointer' }} onClick={() => { setAjoutVisible(false); setNouvelle('') }}>✕</button>
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

// ── CoachIcon ─────────────────────────────────────────────────────────────────
const CoachIcon = ({ style, size = 16 }) => {
  if (style?.emoji === 'heart') return <Heart size={size} color="#e05c5c" fill="#e05c5c" />
  if (style?.emoji === 'flame') return <Flame size={size} color="#e08a3c" />
  if (style?.emoji === 'chart') return <BarChart size={size} color="#6c63ff" />
  return <Target size={size} color="white" />
}

// ── SmartTaskInput — Input intelligent avec parsing langage naturel ───────────
const SmartTaskInput = memo(function SmartTaskInput({ d, T, onSuccess, compact = false }) {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dateValue, setDateValue] = useState('')   // YYYY-MM-DD
  const [timeValue, setTimeValue] = useState('')   // HH:mm
  const [touched, setTouched] = useState(false)    // user has tried to submit
  const inputRef = useRef(null)

  useEffect(() => {
    if (input.length > 1) {
      const p = parseTaskInput(input)
      setParsed(p)
      // Synchroniser ce que le parser a détecté
      if (p?.dateValue && !dateValue) setDateValue(p.dateValue)
      if (p?.timeValue && !timeValue) setTimeValue(p.timeValue)
    } else {
      setParsed(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  const dateOk = !!dateValue
  const timeOk = !!timeValue
  const titreOk = !!parsed?.titre?.trim()
  const formValide = titreOk && dateOk && timeOk

  const buildDeadline = () => {
    if (!dateOk || !timeOk) return null
    const [y, m, d2] = dateValue.split('-').map(Number)
    const [h, mn] = timeValue.split(':').map(Number)
    return new Date(y, m - 1, d2, h, mn, 0, 0)
  }

  const creer = async () => {
    setTouched(true)
    if (!formValide) return
    const deadline = buildDeadline()
    if (!deadline) return
    setLoading(true)
    try {
      await d.ajouterTache({
        titre: parsed.titre,
        priorite: parsed.priorite,
        deadline: deadline,
      })
      setInput('')
      setParsed(null)
      setDateValue('')
      setTimeValue('')
      setTouched(false)
      onSuccess?.()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const pColor = getPrioriteColor(parsed?.priorite || 'moyenne')
  const pBg = getPrioriteBg(parsed?.priorite || 'moyenne')
  const todayStr = new Date().toISOString().slice(0, 10)

  // Couleur des bordures selon état
  const dateBorder = dateOk ? T.accent + '60' : (touched ? '#e05c5c' : T.border)
  const timeBorder = timeOk ? T.accent + '60' : (touched ? '#e05c5c' : T.border)

  return (
    <div className="smart-task-input" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
      {/* Input principal */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') creer()
          }}
          placeholder="Finir le rapport demain 15h haute..."
          className="smart-task-input-field"
          style={{ background: T.bg3, color: T.text }}
        />
        {input && (
          <motion.button
            onClick={() => { setInput(''); setParsed(null); setDateValue(''); setTimeValue(''); setTouched(false) }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={14} strokeWidth={2} />
          </motion.button>
        )}
      </div>

      {/* Preview */}
      <AnimatePresence>
        {parsed && input.length > 1 && (
          <motion.div
            className="smart-task-preview"
            style={{ background: T.bg3, border: `1.5px solid ${pColor}30` }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="smart-task-preview-circle" style={{ borderColor: pColor }} />
            <span className="smart-task-preview-titre" style={{ color: T.text }}>{parsed.titre}</span>
            <span className="smart-task-preview-badge" style={{ background: pBg, color: pColor }}>
              {parsed.priorite}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date + Time obligatoires — toujours visibles */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Date */}
        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: T.text2, letterSpacing: 0.5, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={11} strokeWidth={2.2} color={dateOk ? T.accent : T.text2} />
            Quel jour ? *
          </label>
          <input
            type="date"
            value={dateValue}
            min={todayStr}
            onChange={e => setDateValue(e.target.value)}
            style={{
              padding: '10px 12px',
              background: T.bg3,
              border: `1.5px solid ${dateBorder}`,
              borderRadius: 10,
              color: T.text,
              fontSize: 13,
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box',
              colorScheme: 'dark',
            }}
          />
        </div>
        {/* Time */}
        <div style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: T.text2, letterSpacing: 0.5, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} strokeWidth={2.2} color={timeOk ? T.accent : T.text2} />
            À quelle heure ? *
          </label>
          <input
            type="time"
            value={timeValue}
            onChange={e => setTimeValue(e.target.value)}
            style={{
              padding: '10px 12px',
              background: T.bg3,
              border: `1.5px solid ${timeBorder}`,
              borderRadius: 10,
              color: T.text,
              fontSize: 13,
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              width: '100%',
              boxSizing: 'border-box',
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* Message d'aide quand un champ manque */}
      {touched && !formValide && (
        <div style={{ fontSize: 12, color: '#e05c5c', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} strokeWidth={2} />
          {!titreOk ? 'Décris la tâche' : !dateOk && !timeOk ? 'Choisis le jour et l\'heure' : !dateOk ? 'Choisis le jour' : 'Choisis l\'heure'}
        </div>
      )}

      {/* Actions */}
      <div className="smart-task-actions">
        <motion.button
          onClick={creer}
          disabled={loading}
          className="smart-task-btn-primary"
          style={{
            background: loading ? T.text2 : `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
            color: T.bg,
            boxShadow: formValide ? `0 6px 20px ${T.accent}30` : 'none',
            opacity: formValide ? 1 : 0.7,
          }}
          whileHover={!loading && formValide ? { scale: 1.01 } : {}}
          whileTap={{ scale: 0.98 }}>
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={14} />
              </motion.div>
              Création...
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              Ajouter la tâche
              <kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: `${T.bg}30`, fontFamily: 'monospace' }}>↵</kbd>
            </>
          )}
        </motion.button>

        {!compact && (
          <motion.button
            onClick={d.genererSousTachesIA}
            disabled={d.iaLoading || !parsed?.titre}
            className="smart-task-btn-secondary"
            style={{ background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent }}
            whileTap={{ scale: 0.97 }}>
            <Sparkles size={13} />
            {d.iaLoading ? 'IA...' : 'Sous-tâches IA'}
          </motion.button>
        )}
      </div>

      {/* Hint */}
      {!compact && (
        <div className="smart-task-hint" style={{ background: `${T.accent}08`, color: T.text2 }}>
          <Sparkles size={12} color={T.accent} strokeWidth={2} />
          Le parser détecte automatiquement la priorité, le jour et l'heure.
        </div>
      )}
    </div>
  )
})

// ── MobileActionBar — barre d'actions visible sur mobile ─────────────────────
const MobileActionBar = ({ d, T, onOpenTemplates, onOpenExport }) => (
  // Note : "+ Ajouter" supprimé car maintenant dans la BottomNavMobile (FAB central)
  <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: T.bg2, borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
    <motion.button onClick={onOpenTemplates}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 10, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
      whileTap={{ scale: 0.96 }}>
      <BookOpen size={14} />Templates
    </motion.button>
    <motion.button onClick={onOpenExport}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 10, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
      whileTap={{ scale: 0.96 }}>
      <Download size={14} />Exporter
    </motion.button>
    {d.rappels?.length > 0 && (
      <motion.button onClick={() => d.setShowRappels(s => !s)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 10, color: '#e05c5c', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        whileTap={{ scale: 0.96 }}>
        <Bell size={14} />{d.rappels.length}
      </motion.button>
    )}
  </div>
)

// ── BottomSheetAjout ──────────────────────────────────────────────────────────
const BottomSheetAjout = memo(function BottomSheetAjout({ open, onClose, d, T }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, backdropFilter: 'blur(4px)' }} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501, background: T.bg, borderRadius: '20px 20px 0 0', padding: '0 16px 48px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)', border: `1px solid ${T.border}` }}>
            <div style={{ width: 36, height: 4, background: T.border, borderRadius: 99, margin: '14px auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} color={T.accent} /></div>
                Nouvelle tâche
              </h2>
              <motion.button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} whileHover={{ color: '#e05c5c' }}>
                <X size={16} />
              </motion.button>
            </div>

            {/* Smart Task Input */}
            <SmartTaskInput d={d} T={T} onSuccess={onClose} compact />

            {/* Section Générer avec IA */}
            <div style={{ paddingTop: 16, marginTop: 16, borderTop: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.text2, marginBottom: 10, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={11} color={T.accent} />GÉNÉRER AVEC L'IA
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ flex: 1, padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none' }}
                  placeholder="Ex: Apprendre React..." value={d.objectif} onChange={e => d.setObjectif(e.target.value)} onKeyDown={e => e.key === 'Enter' && d.genererTaches()} />
                <motion.button style={{ padding: '10px 14px', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, borderRadius: 10, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={d.genererTaches} whileTap={{ scale: 0.97 }}>Générer</motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

// ── CarteTacheMobile ──────────────────────────────────────────────────────────
const CarteTacheMobile = memo(function CarteTacheMobile({ tache, d, T, pColor, pBg }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandMode, setExpandMode] = useState(null)
  const menuRef = useRef(null)
  const pts = tache.priorite === 'haute' ? 30 : tache.priorite === 'moyenne' ? 20 : 10
  const isBloquee = tache.bloquee && !tache.terminee
  const todayStr = (() => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}` })()
  const isFocused = !!tache.focus_date && String(tache.focus_date).slice(0,10) === todayStr
  const focusFull = (d.tachesFocus?.length || 0) >= 3 && !isFocused
  const canPin = !tache.terminee && !isBloquee

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggleExpand = (mode) => {
    if (isExpanded && expandMode === mode) { setIsExpanded(false); setExpandMode(null) }
    else { setIsExpanded(true); setExpandMode(mode) }
    setMenuOpen(false)
  }

  return (
    <motion.div style={{ background: T.bg2, border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.3)' : T.border}`, borderRadius: 14, marginBottom: 8, overflow: 'visible', opacity: tache.terminee ? 0.55 : 1, position: 'relative', zIndex: menuOpen ? 50 : 'auto' }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: tache.terminee ? 0.55 : 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: pColor(tache.priorite), borderRadius: '14px 0 0 14px' }} />
      <div style={{ padding: '12px 12px 12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isBloquee ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLock size={10} color="#e05c5c" />
          </div>
        ) : (
          <motion.button style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${tache.terminee ? '#4caf82' : T.border}`, background: tache.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => d.toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)}
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            {tache.terminee && <CheckSquare size={11} color="white" strokeWidth={3} />}
          </motion.button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: tache.terminee ? T.text2 : T.text, textDecoration: tache.terminee ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tache.titre}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: pBg(tache.priorite), color: pColor(tache.priorite), fontWeight: 600 }}>{tache.priorite}</span>
            {tache.deadline && <span style={{ fontSize: 10, color: T.text2 }}>{new Date(tache.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
            {!tache.terminee && !isBloquee && <span style={{ fontSize: 10, color: T.accent, fontWeight: 600 }}>+{pts}pts</span>}
            {isBloquee && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(224,92,92,0.12)', color: '#e05c5c', fontWeight: 600 }}>Bloquée</span>}
          </div>
        </div>
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <motion.button style={{ width: 32, height: 32, borderRadius: 8, background: menuOpen ? `${T.accent}15` : 'transparent', border: `1px solid ${menuOpen ? T.accent : 'transparent'}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setMenuOpen(!menuOpen)} whileTap={{ scale: 0.9 }}>
            <MoreHorizontal size={16} />
          </motion.button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -4 }}
                style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 400, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: 190 }}>
                {!isBloquee && (
                  <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: tache.terminee ? T.text2 : '#4caf82', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => { d.toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee); setMenuOpen(false) }}>
                    <CheckSquare size={14} strokeWidth={1.8} />{tache.terminee ? 'Rouvrir' : 'Marquer terminée'}
                  </button>
                )}
                {canPin && (
                  <button
                    disabled={focusFull}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: isFocused ? T.accent : focusFull ? `${T.text2}80` : T.text, fontSize: 13, cursor: focusFull ? 'not-allowed' : 'pointer', textAlign: 'left' }}
                    onClick={() => { if (!focusFull) { d.togglerFocus(tache.id, isFocused); setMenuOpen(false) } }}>
                    <Star size={14} strokeWidth={1.8} fill={isFocused ? T.accent : 'none'} />
                    {isFocused ? 'Désépingler du focus' : focusFull ? 'Focus complet (3/3)' : 'Épingler au focus'}
                  </button>
                )}
                <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', textAlign: 'left' }} onClick={() => toggleExpand('sousTaches')}>
                  <ChevronDown size={14} strokeWidth={1.8} />Sous-tâches
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', textAlign: 'left' }} onClick={() => toggleExpand('dependances')}>
                  <IconLink size={14} color={T.text} />Prérequis
                </button>
                {tache.deadline && !tache.terminee && (
                  <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#1a73e8', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => { d.exporterGoogleCalendar(tache); setMenuOpen(false) }}>
                    <Calendar size={14} strokeWidth={1.8} />Google Calendar
                  </button>
                )}
                <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#e05c5c', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => { d.supprimerTache(tache.id); setMenuOpen(false) }}>
                  <Trash2 size={14} strokeWidth={1.8} />Supprimer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', paddingLeft: 18, paddingRight: 12, paddingBottom: 12 }}>
            {expandMode === 'sousTaches' && <SousTaches tache={tache} T={T} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

// ── WelcomeHero — Bandeau d'accueil pour nouveaux users (0 tâches) ──────────
// Sélection de templates "starter" — slugs → ce qu'on essaie de matcher
const STARTER_TEMPLATE_SLUGS = ['etude', 'projet', 'voyage', 'sante', 'productivite', 'apprentissage']

const WelcomeHero = memo(function WelcomeHero({ d, T, isMobile, onCreateTask, navigate }) {
  const prenom = d.user?.nom?.split(' ')[0] || ''
  const accent = T.accent
  const accent2 = T.accent2 || accent

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        background: T.bg2,
        border: `1px solid ${accent}35`,
        borderRadius: 18,
        padding: isMobile ? '18px 16px 16px' : '26px 28px 22px',
        marginBottom: 14,
        overflow: 'hidden',
        boxShadow: `0 12px 36px ${accent}12, 0 0 0 1px ${accent}10`,
      }}>
      {/* Halos décoratifs */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 220, height: 220,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}25, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -40, width: 200, height: 200,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent2}18, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        {/* Badge bienvenue */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          borderRadius: 99,
          background: `${accent}15`,
          border: `1px solid ${accent}30`,
          color: accent,
          fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
          marginBottom: 12,
        }}>
          <Sparkles size={11} strokeWidth={2.5} />
          Bienvenue {prenom && `· ${prenom}`}
        </div>

        {/* Titre principal */}
        <h2 style={{
          fontSize: isMobile ? 22 : 30,
          fontWeight: 800,
          color: T.text,
          margin: 0, marginBottom: 6,
          letterSpacing: '-0.6px', lineHeight: 1.15,
        }}>
          {prenom ? `Salut ${prenom}` : 'Bienvenue'} 👋
        </h2>
        <p style={{
          fontSize: isMobile ? 13 : 15,
          color: T.text2,
          margin: 0, marginBottom: isMobile ? 16 : 22,
          fontWeight: 500, lineHeight: 1.5,
          maxWidth: 540,
        }}>
          GetShift va te rendre <strong style={{ color: T.text }}>3× plus productif</strong> grâce à l'IA.
          Démarre en 30 secondes — choisis comment tu commences&nbsp;:
        </p>

        {/* 3 actions rapides — grille */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {/* Action 1 — créer 1ère tâche */}
          <motion.button
            onClick={onCreateTask}
            whileHover={{ y: -2, borderColor: accent }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: isMobile ? '12px 14px' : '14px 16px',
              background: T.bg3,
              border: `1.5px solid ${T.border}`,
              borderRadius: 13,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              minHeight: 60,
            }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Plus size={18} color={accent} strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 1 }}>Crée ta 1ère tâche</div>
              <div style={{ fontSize: 11, color: T.text2 }}>En langage naturel · 10 sec</div>
            </div>
            <ChevronRight size={14} color={T.text2} />
          </motion.button>

          {/* Action 2 — choisir un template */}
          <motion.button
            onClick={() => d.setShowTemplates?.(true)}
            whileHover={{ y: -2, borderColor: '#a855f7' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: isMobile ? '12px 14px' : '14px 16px',
              background: T.bg3,
              border: `1.5px solid ${T.border}`,
              borderRadius: 13,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              minHeight: 60,
            }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(168,85,247,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BookOpen size={18} color="#a855f7" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 1 }}>Choisis un template</div>
              <div style={{ fontSize: 11, color: T.text2 }}>25 modèles prêts à l'emploi</div>
            </div>
            <ChevronRight size={14} color={T.text2} />
          </motion.button>

          {/* Action 3 — Goal Reverse */}
          <motion.button
            onClick={() => navigate?.('/goal')}
            whileHover={{ y: -2, borderColor: '#ec4899' }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: isMobile ? '12px 14px' : '14px 16px',
              background: T.bg3,
              border: `1.5px solid ${T.border}`,
              borderRadius: 13,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              minHeight: 60,
            }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(236,72,153,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Flag size={18} color="#ec4899" strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 1 }}>Définis un objectif</div>
              <div style={{ fontSize: 11, color: T.text2 }}>L'IA te crée le plan d'action</div>
            </div>
            <ChevronRight size={14} color={T.text2} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
})

// ── StarterTemplates — Carousel des templates phares pour démarrer ──────────
const StarterTemplates = memo(function StarterTemplates({ d, T, isMobile }) {
  const templates = (d.templates || [])
    .filter(t => STARTER_TEMPLATE_SLUGS.includes(t.categorie))
    .slice(0, 6)

  if (templates.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      style={{ marginBottom: 14 }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
        <div>
          <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: T.text, letterSpacing: '-0.2px' }}>
            🚀 Démarre en 1 clic
          </div>
          <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Templates populaires pré-remplis</div>
        </div>
        <motion.button
          onClick={() => d.setShowTemplates?.(true)}
          whileTap={{ scale: 0.96 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 11px',
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: 99,
            color: T.text2,
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
          }}>
          Tous · {d.templates?.length || 0} <ChevronRight size={11} />
        </motion.button>
      </div>

      {/* Grille / scroll horizontal */}
      <div
        className="hide-scrollbar"
        style={{
          display: isMobile ? 'flex' : 'grid',
          gridTemplateColumns: isMobile ? undefined : 'repeat(3, 1fr)',
          gap: 8,
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: 4,
          margin: isMobile ? '0 -16px' : 0,
          padding: isMobile ? '2px 16px 4px' : 0,
          WebkitOverflowScrolling: 'touch',
        }}>
        {templates.map((tmpl, i) => (
          <motion.button
            key={tmpl.id}
            onClick={() => d.utiliserTemplateRapide?.(tmpl)}
            disabled={d.templateImporting}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ delay: i * 0.04 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 12px',
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 13,
              cursor: d.templateImporting ? 'wait' : 'pointer',
              textAlign: 'left',
              minWidth: isMobile ? 220 : undefined,
              flexShrink: 0,
              opacity: d.templateImporting ? 0.6 : 1,
              transition: 'border-color 0.2s',
            }}>
            <TemplateIconBox categorie={tmpl.categorie} size={16} boxSize={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
                {tmpl.titre}
              </div>
              <div style={{ fontSize: 10.5, color: T.text2, fontWeight: 500 }}>
                {tmpl.taches?.length || 0} tâches · {tmpl.categorie}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
})

// ── CoachDailyMessage — Message personnalisé du coach (Alex/Max/Nova) ────────
const COACH_WELCOME_MESSAGES = {
  bienveillant: (prenom) => `Hey ${prenom || 'toi'} ! Je suis Alex, ton coach perso. On va bâtir ta routine pas à pas, sans pression. Crée ta première tâche — je te guide.`,
  motivateur:   (prenom) => `${prenom || 'Toi'}, c'est l'heure ! Je suis Max et on va passer à l'action ensemble. Une seule règle : crée ta première tâche dans les 60 secondes. Go.`,
  analytique:   (prenom) => `Bienvenue ${prenom || ''}. Je suis Nova. Pour t'aider à devenir plus performant, j'ai besoin de données. Crée ta première tâche pour calibrer mes recommandations.`,
}

const CoachDailyMessage = memo(function CoachDailyMessage({ d, T, isMobile, isNewUser }) {
  const cdm = d.coachDailyMessage
  const loading = d.coachDailyLoading

  // Dismissible per day — clé localStorage par jour
  const todayKey = `coachDailyDismissed_${new Date().toISOString().slice(0, 10)}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(todayKey) === '1' } catch { return false }
  })
  const dismiss = () => {
    try { localStorage.setItem(todayKey, '1') } catch {}
    setDismissed(true)
  }

  if (dismissed) return null

  const styleId = cdm?.coach?.style || d.coachStyle || 'bienveillant'
  const coachLabels = {
    bienveillant: { nom: 'Alex', emoji: '🤗' },
    motivateur:   { nom: 'Max',  emoji: '🔥' },
    analytique:   { nom: 'Nova', emoji: '📊' },
  }
  let coach = cdm?.coach || coachLabels[styleId]
  let message = cdm?.message

  // ── Override pour nouveau user : message d'accueil hardcodé ───────────
  if (isNewUser) {
    const prenom = d.user?.nom?.split(' ')[0] || ''
    const welcomeFn = COACH_WELCOME_MESSAGES[styleId] || COACH_WELCOME_MESSAGES.bienveillant
    message = welcomeFn(prenom)
    coach = coachLabels[styleId] || coachLabels.bienveillant
  }

  if (!message && !loading) return null

  // Couleur par persona
  const personaColor = styleId === 'motivateur' ? '#f97316' : styleId === 'analytique' ? '#3b82f6' : '#ec4899'
  const personaIcon = styleId === 'motivateur' ? Flame : styleId === 'analytique' ? BarChart : Heart

  const PersonaIcon = personaIcon
  const ouvrirCoach = () => d.setShowCoach?.(true)
  const refreshMessage = () => d.chargerCoachDailyMessage?.()

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.bg2,
        border: `1px solid ${personaColor}40`,
        borderRadius: 16,
        padding: isMobile ? '12px 14px' : '16px 20px',
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 0 1px ${personaColor}10, 0 4px 18px ${personaColor}10`,
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${personaColor}, ${personaColor}80)` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 14 }}>
        {/* Avatar coach */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          onClick={ouvrirCoach}
          style={{
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${personaColor}, ${personaColor}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, cursor: 'pointer',
            boxShadow: `0 4px 14px ${personaColor}40`,
          }}>
          <PersonaIcon size={isMobile ? 16 : 20} color="#fff" strokeWidth={2.4} fill={styleId === 'motivateur' ? '#fff' : 'none'} />
        </motion.div>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {/* Bouton Fermer pour la journée */}
          <motion.button
            onClick={dismiss}
            whileTap={{ scale: 0.9 }}
            whileHover={{ background: T.bg3, color: T.text }}
            title="Masquer pour aujourd'hui"
            style={{
              position: 'absolute', top: -4, right: -4,
              width: 24, height: 24, borderRadius: 7,
              background: 'transparent', border: 'none',
              color: T.text2, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <X size={13} strokeWidth={2.2} />
          </motion.button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: T.text, letterSpacing: '-0.2px' }}>
              {coach?.nom || 'Coach'}
            </span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: `${personaColor}18`, color: personaColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Coach
            </span>
            <span style={{ fontSize: 10, color: T.text2 }}>· du jour</span>
          </div>

          {loading && !message ? (
            <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: isMobile ? 12.5 : 13, color: T.text2, fontStyle: 'italic' }}>
              {coach?.nom || 'Le coach'} prépare ton message…
            </motion.div>
          ) : (
            <p style={{
              margin: 0,
              fontSize: isMobile ? 12.5 : 13.5,
              lineHeight: 1.55,
              color: T.text,
              fontWeight: 500,
            }}>
              {message}
            </p>
          )}

          {/* CTA */}
          {message && (
            <div style={{ display: 'flex', gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
              <motion.button
                onClick={ouvrirCoach}
                whileTap={{ scale: 0.96 }}
                whileHover={{ background: personaColor + '25' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px',
                  background: `${personaColor}15`,
                  border: `1px solid ${personaColor}40`,
                  borderRadius: 99,
                  color: personaColor,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                <Bot size={11} strokeWidth={2.4} /> Discuter
              </motion.button>
              <motion.button
                onClick={refreshMessage}
                whileTap={{ scale: 0.96, rotate: 180 }}
                title="Régénérer le message"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 9px',
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  borderRadius: 99,
                  color: T.text2,
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>
                <Sparkles size={10} strokeWidth={2.4} /> {isMobile ? '' : 'Régénérer'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

// ── StatsHUD — Niveau / Streak / Points semaine / Conseil IA ─────────────────
const StatsHUD = memo(function StatsHUD({ d, T, isMobile }) {
  const stats = d.dashboardStats
  // Pas de skeleton — on utilise les données déjà disponibles en fallback,
  // puis on enrichit dès que /dashboard/stats arrive.
  const localTotal = (d.taches || []).length
  const localDone = (d.taches || []).filter(t => t.terminee).length
  const niveauLabelsLocal = { 1:'Débutant', 2:'Apprenti', 3:'Confirmé', 4:'Expert', 5:'Maître', 6:'Légende' }

  const niveau = stats?.niveau ?? d.niveau ?? 1
  const niveauLabel = stats?.niveau_label ?? niveauLabelsLocal[niveau] ?? `Niveau ${niveau}`
  const progres = stats?.progres_niveau ?? 0
  const points = stats?.points ?? d.points ?? 0
  const pointsToNext = stats?.points_to_next ?? 0
  const pointsSemaine = stats?.points_semaine ?? 0
  const deltaSemaine = stats?.delta_semaine ?? 0
  const streak = stats?.streak ?? d.streak ?? 0
  const total = stats?.total_taches ?? localTotal
  const terminees = stats?.terminees_total ?? localDone
  const taux = stats?.taux_completion ?? (total > 0 ? Math.round(terminees / total * 100) : 0)

  const deltaPositive = deltaSemaine >= 0
  const deltaColor = deltaPositive ? '#4caf82' : '#e05c5c'
  const streakActive = streak > 0
  const streakColor = streakActive ? '#f97316' : T.text2

  // Couleurs accent
  const niveauColor = T.accent
  const pointsColor = '#a855f7'

  // ── Mobile : grille 2x2 compacte + barre niveau pleine largeur ────────
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: '12px 12px 10px', marginBottom: 14, position: 'relative', overflow: 'hidden',
        }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${niveauColor}, ${pointsColor})` }} />
        {/* Niveau pleine largeur */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Award size={14} color={niveauColor} strokeWidth={2.2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{niveauLabel}</span>
              <span style={{ fontSize: 10, color: T.text2 }}>· Niv. {niveau}</span>
            </div>
            <span style={{ fontSize: 10, color: T.text2, fontWeight: 600 }}>
              {points} pts {pointsToNext > 0 && <span style={{ color: T.accent }}>· {pointsToNext} pour ↑</span>}
            </span>
          </div>
          <div style={{ height: 5, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progres}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${niveauColor}, ${pointsColor})`, borderRadius: 99 }} />
          </div>
        </div>

        {/* Grille 3 cartes compactes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {/* Streak */}
          <div style={{
            background: streakActive ? 'rgba(249,115,22,0.08)' : T.bg3,
            border: `1px solid ${streakActive ? 'rgba(249,115,22,0.25)' : T.border}`,
            borderRadius: 10, padding: '8px 6px', textAlign: 'center',
          }}>
            <Flame size={13} color={streakColor} strokeWidth={2.2} fill={streakActive ? streakColor : 'none'} />
            <div style={{ fontSize: 16, fontWeight: 800, color: streakColor, lineHeight: 1.1, marginTop: 2 }}>{streak}</div>
            <div style={{ fontSize: 9, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{streak > 1 ? 'jours' : 'jour'}</div>
          </div>
          {/* Points cette semaine */}
          <div style={{
            background: 'rgba(168,85,247,0.08)',
            border: `1px solid rgba(168,85,247,0.25)`,
            borderRadius: 10, padding: '8px 6px', textAlign: 'center',
          }}>
            <TrendingUp size={13} color={pointsColor} strokeWidth={2.2} />
            <div style={{ fontSize: 15, fontWeight: 800, color: pointsColor, lineHeight: 1.1, marginTop: 2 }}>{pointsSemaine}</div>
            <div style={{ fontSize: 9, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>cette sem.</div>
          </div>
          {/* Tâches : terminées / total */}
          <div style={{
            background: 'rgba(76,175,130,0.08)',
            border: '1px solid rgba(76,175,130,0.25)',
            borderRadius: 10, padding: '8px 6px', textAlign: 'center',
          }}>
            <CheckCircle2 size={13} color="#4caf82" strokeWidth={2.2} />
            <div style={{ fontSize: 14, fontWeight: 800, color: '#4caf82', lineHeight: 1.1, marginTop: 2 }}>
              {terminees}/{total}
            </div>
            <div style={{ fontSize: 9, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              tâches · {taux}%
            </div>
          </div>
        </div>

        {/* Footer DNA insight — mobile, discret */}
        <DnaInsightFooter d={d} T={T} isMobile={true} />
      </motion.div>
    )
  }

  // ── Desktop : layout horizontal riche ──────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: 18, marginBottom: 18, position: 'relative', overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${niveauColor}, ${pointsColor})` }} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14, alignItems: 'stretch' }}>
        {/* NIVEAU + barre */}
        <motion.div whileHover={{ y: -1 }} style={{
          background: T.bg3, border: `1px solid ${niveauColor}30`, borderRadius: 12, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${niveauColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={16} color={niveauColor} strokeWidth={2.2} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Niveau {niveau}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: '-0.3px' }}>{niveauLabel}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: niveauColor, lineHeight: 1 }}>{points}</div>
              <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>points</div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: T.text2, marginBottom: 4, fontWeight: 600 }}>
              <span>Progression</span>
              <span style={{ color: niveauColor }}>{progres}% {pointsToNext > 0 ? `· ${pointsToNext} pts pour ↑` : '· max'}</span>
            </div>
            <div style={{ height: 7, background: T.bg2, borderRadius: 99, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${progres}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${niveauColor}, ${pointsColor})`, borderRadius: 99 }} />
            </div>
          </div>
        </motion.div>

        {/* STREAK */}
        <motion.div whileHover={{ y: -1 }} style={{
          background: streakActive ? 'rgba(249,115,22,0.06)' : T.bg3,
          border: `1px solid ${streakActive ? 'rgba(249,115,22,0.3)' : T.border}`,
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={16} color={streakColor} strokeWidth={2.2} fill={streakActive ? streakColor : 'none'} />
            <span style={{ fontSize: 11, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Streak</span>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: streakColor, letterSpacing: '-1px', lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: 11, color: T.text2, marginTop: 4, fontWeight: 600 }}>
              {streakActive ? `jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}` : 'Démarre aujourd\'hui'}
            </div>
          </div>
        </motion.div>

        {/* POINTS SEMAINE */}
        <motion.div whileHover={{ y: -1 }} style={{
          background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.25)',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color={pointsColor} strokeWidth={2.2} />
            <span style={{ fontSize: 11, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cette semaine</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: pointsColor, letterSpacing: '-0.5px', lineHeight: 1 }}>{pointsSemaine}</span>
              <span style={{ fontSize: 11, color: T.text2 }}>pts</span>
            </div>
            <div style={{ fontSize: 11, color: deltaColor, marginTop: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
              {deltaPositive ? '↑' : '↓'} {Math.abs(deltaSemaine)}% <span style={{ color: T.text2, fontWeight: 500 }}>vs sem. dern.</span>
            </div>
          </div>
        </motion.div>

        {/* TÂCHES : terminées / total */}
        <motion.div whileHover={{ y: -1 }} style={{
          background: 'rgba(76,175,130,0.05)', border: '1px solid rgba(76,175,130,0.25)',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} color="#4caf82" strokeWidth={2.2} />
            <span style={{ fontSize: 11, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tâches</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#4caf82', letterSpacing: '-0.5px', lineHeight: 1 }}>{terminees}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.text2 }}>/{total}</span>
              <span style={{ fontSize: 11, color: '#4caf82', fontWeight: 700, marginLeft: 6 }}>{taux}%</span>
            </div>
            <div style={{ fontSize: 11, color: T.text2, marginTop: 4, fontWeight: 600 }}>{total - terminees} restante{(total - terminees) > 1 ? 's' : ''}</div>
          </div>
        </motion.div>
      </div>

      {/* Footer DNA insight — discret, n'apparaît que si analyses disponibles */}
      <DnaInsightFooter d={d} T={T} isMobile={false} />
    </motion.div>
  )
})

// ── DnaInsightFooter — petite ligne d'insight DNA en bas du HUD ──────────────
const CATEGORIE_DNA_LABELS = {
  deep_work: 'Travail profond',
  creative: 'Créatif',
  admin: 'Administratif',
  learning: 'Apprentissage',
  meeting: 'Réunion',
  routine: 'Routine',
  social: 'Social',
  planning: 'Planification',
}

const DnaInsightFooter = memo(function DnaInsightFooter({ d, T, isMobile }) {
  const dna = d.dnaInsights
  if (!dna || (dna.total_analyses || 0) < 2) return null
  const score = dna.score_global || 0
  const topCat = (dna.stats_par_categorie || [])[0]
  const topCatLabel = topCat?.categorie ? (CATEGORIE_DNA_LABELS[topCat.categorie] || topCat.categorie.replace(/_/g, ' ')) : null
  const scoreColor = score >= 71 ? '#4caf82' : score >= 41 ? '#e08a3c' : '#e05c5c'

  return (
    <div style={{
      marginTop: isMobile ? 9 : 12,
      paddingTop: isMobile ? 8 : 10,
      borderTop: `1px dashed ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: isMobile ? 10.5 : 11.5, color: T.text2, fontWeight: 600 }}>
        <Sparkles size={11} color={T.accent} strokeWidth={2.4} />
        <span>Task DNA</span>
        <span style={{ color: T.text2, opacity: 0.5 }}>·</span>
        <span>Score moyen : <strong style={{ color: scoreColor }}>{score}/100</strong></span>
        {topCatLabel && (
          <>
            <span style={{ color: T.text2, opacity: 0.5 }}>·</span>
            <span>Top catégorie : <strong style={{ color: T.text }}>{topCatLabel}</strong></span>
          </>
        )}
      </div>
      <span style={{ fontSize: 10, color: T.text2, opacity: 0.7 }}>{dna.total_analyses} analyses</span>
    </div>
  )
})

// ── TomorrowBuilderCTA — CTA flottant contextuel pour planifier demain ────────
// Apparaît uniquement après 17h ET si tâches actives > 0. Dismissible per day.
// Position: fixed en bas — toujours visible sans scroll.
const TomorrowBuilderCTA = memo(function TomorrowBuilderCTA({ d, T, isMobile, navigate, mainMarginL = 0 }) {
  const hour = new Date().getHours()
  const tachesActives = d.dashboardStats?.taches_actives ?? d.statsTaches?.enCours ?? 0

  // Dismissible per day
  const todayKey = `tomorrowCtaDismissed_${new Date().toISOString().slice(0, 10)}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(todayKey) === '1' } catch { return false }
  })
  const dismiss = (e) => {
    e.stopPropagation()
    try { localStorage.setItem(todayKey, '1') } catch {}
    setDismissed(true)
  }

  // Conditions d'affichage : après 17h ET au moins 1 tâche active ET non dismissé
  if (dismissed) return null
  if (hour < 17) return null
  if (tachesActives < 1) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      onClick={() => navigate('/tomorrow')}
      whileHover={{ y: -2 }}
      style={{
        position: 'fixed',
        bottom: isMobile ? BOTTOM_NAV_HEIGHT + 12 : 20,
        left: isMobile ? 12 : mainMarginL + 24,
        right: isMobile ? 12 : 24,
        maxWidth: isMobile ? undefined : 680,
        marginLeft: isMobile ? undefined : 'auto',
        marginRight: isMobile ? undefined : 'auto',
        zIndex: 90,
        background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 60%, #6366f1 100%)',
        borderRadius: 16,
        padding: isMobile ? '12px 14px' : '16px 22px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(236,72,153,0.32), 0 0 0 1px rgba(255,255,255,0.08)',
      }}>
      {/* Décor : halo lumineux */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 160, height: 160,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, position: 'relative' }}>
        {/* Icône Sunset */}
        <div style={{
          width: isMobile ? 44 : 52, height: isMobile ? 44 : 52,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Sunset size={isMobile ? 22 : 26} color="#fff" strokeWidth={2.2} />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2 }}>
            Planifier demain ?
          </div>
          <div style={{ fontSize: isMobile ? 11.5 : 12.5, opacity: 0.9, fontWeight: 500, lineHeight: 1.4 }}>
            L'IA construit ton planning de demain en 30 secondes — tu n'auras qu'à valider.
          </div>
        </div>

        {/* CTA bouton */}
        {!isMobile && (
          <motion.div
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              borderRadius: 99,
              background: 'rgba(255,255,255,0.95)',
              color: '#ec4899',
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
            }}>
            C'est parti <ArrowRight size={14} strokeWidth={2.6} />
          </motion.div>
        )}

        {/* Bouton Fermer pour aujourd'hui */}
        <motion.button
          onClick={dismiss}
          whileTap={{ scale: 0.9 }}
          title="Masquer pour aujourd'hui"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(0,0,0,0.18)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
          <X size={13} strokeWidth={2.4} />
        </motion.button>
      </div>

      {/* CTA mobile en bas */}
      {isMobile && (
        <motion.div
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 10,
            padding: '9px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.95)',
            color: '#ec4899',
            fontSize: 13,
            fontWeight: 800,
          }}>
          C'est parti <ArrowRight size={14} strokeWidth={2.6} />
        </motion.div>
      )}
    </motion.div>
  )
})

// ── GoalWidget — objectifs en cours avec progress ────────────────────────────
const GoalWidget = memo(function GoalWidget({ d, T, isMobile, navigate }) {
  const [objectifs, setObjectifs] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [replanningId, setReplanningId] = useState(null)
  const [replanningLoading, setReplanningLoading] = useState(false)
  const [replanningData, setReplanningData] = useState({})
  const userId = d.user?.id

  useEffect(() => {
    if (!userId) return
    axios.get(`${API}/ia/goal-reverse/list/${userId}`)
      .then(r => setObjectifs(r.data.objectifs || []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [userId])

  const lancerReplanning = async (id) => {
    setReplanningId(id)
    setReplanningLoading(true)
    try {
      const r = await axios.post(`${API}/ia/goal-reverse/${id}/replanning`)
      setReplanningData(prev => ({ ...prev, [id]: r.data.replanning }))
    } catch {}
    setReplanningLoading(false)
  }

  if (!loaded || objectifs.length === 0) return null

  const pColor = (pct) => pct >= 70 ? '#4caf82' : pct >= 30 ? '#e08a3c' : '#6c63ff'
  const niveauColor = (n) => n === 'expert' ? '#e05c5c' : n === 'intermédiaire' ? '#e08a3c' : '#4caf82'
  const urgenceInfo = (j) => {
    if (j === null || j === undefined) return null
    if (j < 0) return { label: `${Math.abs(j)}j de retard`, color: '#e05c5c' }
    if (j === 0) return { label: "Aujourd'hui !", color: '#e05c5c' }
    if (j <= 7) return { label: `J-${j}`, color: '#e08a3c' }
    if (j <= 14) return { label: `J-${j}`, color: T.text2 }
    return null
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={14} color={T.accent} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Mes objectifs</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: `${T.accent}15`, color: T.accent, fontWeight: 700 }}>
            {objectifs.length}
          </span>
        </div>
        <motion.button onClick={() => navigate('/goal')} whileHover={{ x: 2 }}
          style={{ fontSize: 12, color: T.accent, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          Voir tout <ChevronRight size={13} />
        </motion.button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {objectifs.map(obj => {
          const pct = obj.progression
          const pc = pColor(pct)
          const urg = urgenceInfo(obj.jours_restants)
          const plan = replanningData[obj.id]
          const isReplanning = replanningLoading && replanningId === obj.id

          return (
            <div key={obj.id} style={{
              background: T.bg2,
              border: `1px solid ${obj.needs_replanning ? 'rgba(224,92,92,0.25)' : T.border}`,
              borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden',
            }}>
              {/* Strip urgence */}
              {urg && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: urg.color, borderRadius: '14px 14px 0 0' }} />
              )}

              {/* Titre + badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {obj.titre}
                  </div>
                  <span style={{ fontSize: 9.5, color: niveauColor(obj.niveau), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {obj.niveau || 'intermédiaire'}
                  </span>
                </div>
                {urg && (
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: `${urg.color}18`, color: urg.color, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {urg.label}
                  </span>
                )}
              </div>

              {/* Barre de progression */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 4, fontWeight: 600 }}>
                  <span>{obj.taches_done}/{obj.taches_total} tâches</span>
                  <span style={{ color: pc, fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: T.bg3, borderRadius: 99, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${pc}, ${pc}bb)`, borderRadius: 99 }} />
                </div>
              </div>

              {/* Prochaine étape */}
              {obj.prochaine_etape && (
                <div style={{ fontSize: 11, color: T.text2, marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.4 }}>
                  <ChevronRight size={11} strokeWidth={2.5} color={T.accent} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{obj.prochaine_etape}</span>
                </div>
              )}

              {/* Bouton replanning */}
              {obj.needs_replanning && !plan && (
                <motion.button
                  onClick={() => lancerReplanning(obj.id)}
                  disabled={isReplanning}
                  whileHover={isReplanning ? {} : { scale: 1.02 }} whileTap={isReplanning ? {} : { scale: 0.98 }}
                  style={{ width: '100%', padding: '7px 10px', background: 'rgba(224,92,92,0.09)', border: '1px solid rgba(224,92,92,0.22)', borderRadius: 9, color: '#e05c5c', fontSize: 11, fontWeight: 700, cursor: isReplanning ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {isReplanning
                    ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', fontSize: 14 }}>↻</motion.span> Replanning en cours…</>
                    : <><AlertTriangle size={12} strokeWidth={2.5} /> {obj.taches_en_retard} en retard — Replanning IA</>
                  }
                </motion.button>
              )}

              {/* Résultat replanning */}
              {plan && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ marginTop: 10, padding: '10px 12px', background: `${T.accent}08`, border: `1px solid ${T.accent}20`, borderRadius: 10 }}>
                  {plan.analyse && (
                    <p style={{ fontSize: 11, color: T.text2, lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic', margin: '0 0 8px' }}>
                      {plan.analyse}
                    </p>
                  )}
                  {(plan.jalons_restants || []).map((j, i) => (
                    <div key={i} style={{ fontSize: 10.5, color: T.text2, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: T.accent }}>S{j.semaine} — {j.titre} :</span>{' '}
                      {(j.taches || []).join(', ')}
                    </div>
                  ))}
                  {plan.conseil && (
                    <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                      💡 {plan.conseil}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
})

// ── FocusDuJour — 3 priorités de la journée ──────────────────────────────────
const FocusDuJour = memo(function FocusDuJour({ d, T, isMobile, pColor, pBg }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)
  const focused = d.tachesFocus || []
  const slots = [0, 1, 2]
  const limitAtteinte = focused.length >= 3
  const dateTitre = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    const h = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const tachesCandidates = (d.taches || []).filter(t =>
    !t.terminee && !focused.some(f => f.id === t.id)
  )

  const epingler = (id) => {
    d.togglerFocus(id, false)
    setPickerOpen(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        background: T.bg2,
        border: `1px solid ${T.accent}40`,
        borderRadius: isMobile ? 14 : 16,
        padding: isMobile ? '10px 12px 10px' : '18px 22px 16px',
        marginBottom: isMobile ? 14 : 20,
        boxShadow: `0 0 0 1px ${T.accent}10, 0 4px 18px ${T.accent}10`,
        overflow: 'visible',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isMobile ? 2 : 3, background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: isMobile ? '14px 14px 0 0' : '16px 16px 0 0' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: isMobile ? (focused.length === 0 ? 8 : 8) : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0 }}>
          <div style={{ width: isMobile ? 26 : 32, height: isMobile ? 26 : 32, borderRadius: isMobile ? 8 : 10, background: `${T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target size={isMobile ? 13 : 16} color={T.accent} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: T.text, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>Focus du jour</div>
            {!isMobile && (
              <div style={{ fontSize: 11, color: T.text2, marginTop: 1, textTransform: 'capitalize' }}>{dateTitre}</div>
            )}
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 10 : 11, padding: isMobile ? '3px 8px' : '4px 10px', borderRadius: 99, background: `${T.accent}12`, color: T.accent, fontWeight: 700, flexShrink: 0 }}>
          {focused.length}/3
        </div>
      </div>

      {/* Empty state — aucun focus */}
      {focused.length === 0 && !isMobile && (
        <div style={{ textAlign: 'center', padding: '14px 6px 6px' }}>
          <div style={{ fontSize: 13, color: T.text2, marginBottom: 4, fontWeight: 500 }}>Choisis tes 3 priorités du jour</div>
          <div style={{ fontSize: 11.5, color: T.text2, opacity: 0.75, marginBottom: 12 }}>Tu n'as pas besoin d'en faire plus.</div>
        </div>
      )}

      {/* Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 5 : 10 }}>
        {slots.map(i => {
          const t = focused[i]
          if (!t) {
            const isFirst = focused.length === 0 && i === 0
            // Mobile : ne montrer qu'un seul slot vide (le premier) pour économiser l'espace
            if (isMobile && !isFirst && focused.length === 0) return null
            return (
              <motion.button
                key={`empty-${i}`}
                onClick={() => setPickerOpen(true)}
                whileHover={{ borderColor: `${T.accent}80`, background: `${T.accent}06` }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: isMobile ? '8px 10px' : '18px 12px',
                  background: 'transparent',
                  border: `1.5px dashed ${T.border}`,
                  borderRadius: isMobile ? 10 : 12,
                  color: T.text2,
                  fontSize: isMobile ? 11.5 : 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  minHeight: isMobile ? 36 : 70,
                }}>
                <Plus size={isMobile ? 12 : 14} strokeWidth={2} />
                {isMobile ? (isFirst ? 'Choisir ma 1ère tâche' : 'Épingler') : (isFirst ? 'Choisir ma première tâche' : 'Épingler une tâche')}
              </motion.button>
            )
          }
          const pts = t.priorite === 'haute' ? 30 : t.priorite === 'moyenne' ? 20 : 10

          // ── Mobile : compact 1-line row ────────────────────────────
          if (isMobile) {
            return (
              <motion.div
                key={t.id} layout
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                style={{
                  position: 'relative',
                  background: T.bg3,
                  border: `1px solid ${pColor(t.priorite)}30`,
                  borderRadius: 10,
                  padding: '7px 8px 7px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  minHeight: 38,
                }}>
                <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, background: pColor(t.priorite), borderRadius: 99 }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {t.titre}
                </span>
                {t.deadline && (
                  <span style={{ fontSize: 10, color: T.text2, flexShrink: 0 }}>
                    {new Date(t.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <motion.button
                  onClick={() => d.toggleTache(t.id, t.terminee, t.priorite, t.bloquee)}
                  whileTap={{ scale: 0.9 }}
                  title="Terminer"
                  style={{ width: 24, height: 24, borderRadius: 6, background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={13} strokeWidth={2.2} />
                </motion.button>
                <motion.button
                  onClick={() => d.togglerFocus(t.id, true)}
                  whileTap={{ scale: 0.9 }}
                  title="Désépingler"
                  style={{ width: 22, height: 22, borderRadius: 6, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={12} strokeWidth={2} />
                </motion.button>
              </motion.div>
            )
          }

          // ── Desktop : carte verticale avec bouton Terminer ─────────
          return (
            <motion.div
              key={t.id} layout
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              style={{
                position: 'relative',
                background: T.bg3,
                border: `1px solid ${pColor(t.priorite)}30`,
                borderRadius: 12,
                padding: '10px 12px 10px 14px',
                display: 'flex', flexDirection: 'column', gap: 8,
                minHeight: 70,
              }}>
              <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: pColor(t.priorite), borderRadius: 99 }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.titre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                    {t.deadline && (
                      <span style={{ fontSize: 10.5, color: T.text2, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Calendar size={9} strokeWidth={2} />
                        {new Date(t.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: T.accent, fontWeight: 700 }}>+{pts}</span>
                  </div>
                </div>
                <motion.button
                  onClick={() => d.togglerFocus(t.id, true)}
                  whileHover={{ background: 'rgba(224,92,92,0.12)', color: '#e05c5c' }} whileTap={{ scale: 0.9 }}
                  title="Désépingler"
                  style={{ width: 22, height: 22, borderRadius: 6, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={13} strokeWidth={2} />
                </motion.button>
              </div>
              <motion.button
                onClick={() => d.toggleTache(t.id, t.terminee, t.priorite, t.bloquee)}
                whileHover={{ background: `${T.accent}25` }} whileTap={{ scale: 0.97 }}
                style={{
                  alignSelf: 'flex-start',
                  padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                  background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent,
                  cursor: 'pointer',
                }}>
                Terminer
              </motion.button>
            </motion.div>
          )
        })}
      </div>

      {/* Picker dropdown */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{
              position: 'absolute', top: '100%', left: isMobile ? 12 : 22, right: isMobile ? 12 : 22, marginTop: 6,
              zIndex: 300, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
            }}>
            {limitAtteinte ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: T.text2, textAlign: 'center' }}>
                Limite de 3 tâches atteinte — désépingles-en une avant.
              </div>
            ) : tachesCandidates.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 12, color: T.text2, textAlign: 'center' }}>
                Aucune tâche disponible. Crée-en une d'abord.
              </div>
            ) : (
              tachesCandidates.slice(0, 30).map(t => (
                <button key={t.id}
                  onClick={() => epingler(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${T.border}40`,
                    color: T.text, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: pColor(t.priorite), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
                  {t.deadline && (
                    <span style={{ fontSize: 10.5, color: T.text2, flexShrink: 0 }}>
                      {new Date(t.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

// ── TaskDNAPopup — Analyse IA d'une tâche avant création ────────────────────
const TaskDNAPopup = memo(function TaskDNAPopup({ d, T, isMobile }) {
  if (!d.showDnaPopup || !d.dnaResult) return null
  const r = d.dnaResult
  const score = Math.max(0, Math.min(100, r.score_viabilite || 0))
  const scoreColor = score >= 71 ? '#4caf82' : score >= 41 ? '#e08a3c' : '#e05c5c'
  const scoreLabel = score >= 81 ? 'Très viable' : score >= 61 ? 'Viable' : score >= 41 ? 'Risquée' : 'Difficile'
  const radius = 52, circ = 2 * Math.PI * radius

  const reformulation = r.conseil_reformulation
  const facteursSucces = Array.isArray(r.facteurs_succes) ? r.facteurs_succes.filter(Boolean).slice(0, 4) : []
  const facteursRisque = Array.isArray(r.facteurs_risque) ? r.facteurs_risque.filter(Boolean).slice(0, 4) : []

  const appliquerReformulation = () => {
    if (!reformulation || !d.dnaPendingData) return
    d.setTitre(reformulation)
    // remplace dans dnaPendingData puis confirme
    const updated = { ...d.dnaPendingData, titre: reformulation }
    d.setDnaPendingData?.(updated)
  }

  return (
    <AnimatePresence>
      {d.showDnaPopup && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={d.annulerCreationApresDNA}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, backdropFilter: 'blur(6px)' }} />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1101, pointerEvents: 'none',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
          }}>
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{
              pointerEvents: 'auto',
              ...(isMobile
                ? { width: '100%', maxHeight: '92dvh', borderRadius: '20px 20px 0 0' }
                : { width: 'min(560px, 95vw)', maxHeight: '92dvh', borderRadius: 20 }
              ),
              background: T.bg2,
              border: `1px solid ${T.border}`,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>

            {/* Drag handle (mobile) */}
            {isMobile && (
              <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: T.border }} />
              </div>
            )}

            {/* Header */}
            <div style={{ padding: isMobile ? '14px 18px 14px' : '20px 24px 16px', borderBottom: `1px solid ${T.border}40`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{r.emoji_categorie || '🧬'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 0.8, textTransform: 'uppercase' }}>Task DNA</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.label_categorie || 'Analyse'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {r.niveau_complexite && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: T.bg3, color: T.text2, fontWeight: 600 }}>
                        Complexité {r.niveau_complexite}
                      </span>
                    )}
                    {r.duree_label && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: T.bg3, color: T.text2, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={9} strokeWidth={2} /> {r.duree_label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <motion.button onClick={d.annulerCreationApresDNA}
                whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}
                style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={16} />
              </motion.button>
            </div>

            {/* Body scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 18px' : '20px 24px' }}>

              {/* Score gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 22, marginBottom: 18 }}>
                <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                  <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r={radius} fill="none" stroke={T.bg3} strokeWidth="8" />
                    <motion.circle cx="60" cy="60" r={radius} fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor, lineHeight: 1, letterSpacing: '-1px' }}>
                      <AnimatedNumber value={score} />
                    </div>
                    <div style={{ fontSize: 10, color: T.text2, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>/ 100</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>Viabilité</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor, marginBottom: 8 }}>{scoreLabel}</div>
                  {r.explication_score && (
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.45 }}>{r.explication_score}</div>
                  )}
                </div>
              </div>

              {/* Conseil principal */}
              {r.conseil_principal && (
                <div style={{
                  background: `${T.accent}10`,
                  border: `1px solid ${T.accent}30`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 14,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <Sparkles size={15} color={T.accent} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>Conseil de l'IA</div>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{r.conseil_principal}</div>
                  </div>
                </div>
              )}

              {/* Reformulation suggérée */}
              {reformulation && (
                <motion.button
                  onClick={appliquerReformulation}
                  whileHover={{ background: `${T.accent}18` }} whileTap={{ scale: 0.99 }}
                  style={{
                    width: '100%',
                    background: `${T.accent}08`,
                    border: `1px dashed ${T.accent}50`,
                    borderRadius: 12,
                    padding: '11px 14px',
                    marginBottom: 16,
                    cursor: 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left',
                  }}>
                  <Target size={15} color={T.accent} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>Reformuler en (cliquer pour appliquer)</div>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 500, lineHeight: 1.4 }}>« {reformulation} »</div>
                  </div>
                </motion.button>
              )}

              {/* Facteurs succès / risque */}
              {(facteursSucces.length > 0 || facteursRisque.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : facteursSucces.length && facteursRisque.length ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 14 }}>
                  {facteursSucces.length > 0 && (
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#4caf82', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={11} strokeWidth={2.4} /> Facteurs de succès
                      </div>
                      {facteursSucces.map((f, i) => (
                        <div key={i} style={{ fontSize: 12, color: T.text, marginBottom: 5, display: 'flex', gap: 6, lineHeight: 1.4 }}>
                          <span style={{ color: '#4caf82', fontWeight: 700, flexShrink: 0 }}>+</span>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {facteursRisque.length > 0 && (
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '11px 13px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#e05c5c', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={11} strokeWidth={2.4} /> Facteurs de risque
                      </div>
                      {facteursRisque.map((f, i) => (
                        <div key={i} style={{ fontSize: 12, color: T.text, marginBottom: 5, display: 'flex', gap: 6, lineHeight: 1.4 }}>
                          <span style={{ color: '#e05c5c', fontWeight: 700, flexShrink: 0 }}>!</span>{f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Meilleur moment */}
              {r.meilleur_moment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text2, padding: '10px 13px', background: T.bg3, borderRadius: 10 }}>
                  <Clock size={13} strokeWidth={1.8} />
                  <span>Meilleur moment : <strong style={{ color: T.text, fontWeight: 600, textTransform: 'capitalize' }}>{r.meilleur_moment}</strong></span>
                </div>
              )}
            </div>

            {/* Footer sticky */}
            <div style={{ padding: isMobile ? '14px 18px calc(env(safe-area-inset-bottom) + 14px)' : '16px 24px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0, background: T.bg2 }}>
              <motion.button
                onClick={d.annulerCreationApresDNA}
                whileTap={{ scale: 0.98 }}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 11, color: T.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </motion.button>
              <motion.button
                onClick={d.confirmerCreationApresDNA}
                whileTap={{ scale: 0.98 }}
                style={{ flex: 2, padding: '12px', borderRadius: 11, background: T.accent, border: `1px solid ${T.accent}`, color: T.bg, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Sparkles size={14} strokeWidth={2.2} /> Créer la tâche
              </motion.button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
})

// ── CreerTemplateModal — Création d'un template (mobile bottom sheet + desktop) ─
const TEMPLATE_CATS = [
  { val: 'projet',          label: 'Projet' },
  { val: 'voyage',          label: 'Voyage' },
  { val: 'habitude',        label: 'Habitude' },
  { val: 'etude',           label: 'Étude' },
  { val: 'apprentissage',   label: 'Apprentissage' },
  { val: 'productivite',    label: 'Productivité' },
  { val: 'focus',           label: 'Focus' },
  { val: 'freelance',       label: 'Freelance' },
  { val: 'travail',         label: 'Travail' },
  { val: 'entrepreneuriat', label: 'Entrepreneuriat' },
  { val: 'carriere',        label: 'Carrière' },
  { val: 'sante',           label: 'Santé' },
  { val: 'vie',             label: 'Vie' },
  { val: 'finance',         label: 'Finance' },
  { val: 'challenge',       label: 'Challenge' },
  { val: 'autre',           label: 'Autre' },
]

const CreerTemplateModal = memo(function CreerTemplateModal({ d, T, isMobile }) {
  const titreOk = !!d.nouveauTemplate?.titre?.trim()
  const tachesOk = (d.nouveauTemplate?.taches?.length || 0) > 0
  const valide = titreOk && tachesOk
  const ajouterTacheTemplate = () => {
    const titre = d.nouvelleTacheTemplate?.titre?.trim()
    if (!titre) return
    d.setNouveauTemplate(prev => ({
      ...prev,
      taches: [...(prev.taches || []), {
        titre,
        priorite: d.nouvelleTacheTemplate?.priorite || 'moyenne',
        deadline_jours: d.nouvelleTacheTemplate?.deadline_jours || 7,
      }],
    }))
    d.setNouvelleTacheTemplate({ titre: '', priorite: 'moyenne', deadline_jours: 7 })
  }
  const publier = async () => {
    if (!valide) return
    await d.soumettreNouveauTemplate()
    d.setNouveauTemplate({ titre: '', description: '', categorie: 'projet', icone: '📋', taches: [] })
    d.setNouvelleTacheTemplate({ titre: '', priorite: 'moyenne', deadline_jours: 7 })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => d.setShowCreerTemplate(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1090, backdropFilter: 'blur(5px)' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1091, pointerEvents: 'none',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}>
      <motion.div
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 20 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        style={{
          pointerEvents: 'auto',
          ...(isMobile
            ? { width: '100%', maxHeight: '92dvh', height: '92dvh', borderRadius: '20px 20px 0 0' }
            : { width: 'min(580px, 95vw)', maxHeight: '90dvh', borderRadius: 20 }
          ),
          background: T.bg2,
          border: `1px solid ${T.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

        {/* Drag handle mobile */}
        {isMobile && (
          <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: T.border }} />
          </div>
        )}

        {/* Header sticky */}
        <div style={{ padding: isMobile ? '12px 18px 14px' : '20px 24px 16px', borderBottom: `1px solid ${T.border}40`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0, background: T.bg2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={18} color={T.accent} strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Créer un template</h2>
              <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 2 }}>Partage ta structure avec la communauté</p>
            </div>
          </div>
          <motion.button onClick={() => d.setShowCreerTemplate(false)}
            whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}
            style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </motion.button>
        </div>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '18px 24px', WebkitOverflowScrolling: 'touch' }}>

          {/* Section Infos */}
          <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 14px 12px', marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Titre *</label>
            <input
              value={d.nouveauTemplate?.titre || ''}
              onChange={e => d.setNouveauTemplate(prev => ({ ...prev, titre: e.target.value }))}
              placeholder="Ex: Lancer un projet SaaS"
              style={{ width: '100%', padding: '11px 14px', background: T.bg2, border: `1.5px solid ${titreOk ? T.accent + '40' : T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontWeight: 500, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

            <label style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Description</label>
            <textarea
              value={d.nouveauTemplate?.description || ''}
              onChange={e => d.setNouveauTemplate(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décris à quoi sert ce template…"
              rows={2}
              style={{ width: '100%', padding: '10px 14px', background: T.bg2, border: `1.5px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 56 }} />
          </div>

          {/* Section Catégorie — scroll horizontal */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 10, paddingLeft: 2 }}>Catégorie</label>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', margin: isMobile ? '0 -16px' : '0 -4px', padding: isMobile ? '2px 16px 4px' : '2px 4px 4px' }}
              className="hide-scrollbar">
              {TEMPLATE_CATS.map(cat => {
                const active = d.nouveauTemplate?.categorie === cat.val
                return (
                  <motion.button key={cat.val}
                    onClick={() => d.setNouveauTemplate(prev => ({ ...prev, categorie: cat.val }))}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      flexShrink: 0,
                      padding: '7px 14px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      background: active ? `${T.accent}18` : T.bg3,
                      border: `1.5px solid ${active ? T.accent : T.border}`,
                      color: active ? T.accent : T.text2,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}>
                    {cat.label}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Section Tâches */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Tâches {d.nouveauTemplate?.taches?.length > 0 && <span style={{ color: T.accent }}>({d.nouveauTemplate.taches.length})</span>}
              </label>
              <span style={{ fontSize: 10, color: tachesOk ? '#4caf82' : T.text2, fontWeight: 600 }}>{tachesOk ? '✓ OK' : 'Au moins 1 requise'}</span>
            </div>

            {/* Liste tâches */}
            {(d.nouveauTemplate?.taches || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {d.nouveauTemplate.taches.map((tache, idx) => {
                  const pColor = tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'basse' ? '#4caf82' : '#e08a3c'
                  const pBg = tache.priorite === 'haute' ? 'rgba(224,92,92,0.12)' : tache.priorite === 'basse' ? 'rgba(76,175,130,0.12)' : 'rgba(224,138,60,0.12)'
                  return (
                    <motion.div key={idx}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: T.bg3, border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: pColor }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text2, flexShrink: 0, minWidth: 18, textAlign: 'center' }}>{idx + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{tache.titre}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: pBg, color: pColor, flexShrink: 0, textTransform: 'uppercase' }}>{tache.priorite}</span>
                      <span style={{ fontSize: 10, color: T.text2, flexShrink: 0 }}>J+{tache.deadline_jours}</span>
                      <motion.button
                        onClick={() => d.setNouveauTemplate(prev => ({ ...prev, taches: prev.taches.filter((_, i) => i !== idx) }))}
                        whileHover={{ background: 'rgba(224,92,92,0.12)', color: '#e05c5c' }} whileTap={{ scale: 0.9 }}
                        style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={13} strokeWidth={1.8} />
                      </motion.button>
                    </motion.div>
                  )
                })}
              </div>
            )}

          </div>
        </div>

        {/* Form ajout tâche — pincé entre body et footer, toujours visible */}
        <div style={{ borderTop: `1px solid ${T.border}40`, padding: isMobile ? '10px 16px' : '12px 24px', background: T.bg2, flexShrink: 0 }}>
          <div style={{ background: T.bg3, border: `1.5px dashed ${T.border}`, borderRadius: 12, padding: '10px 12px' }}>
            <input
              value={d.nouvelleTacheTemplate?.titre || ''}
              onChange={e => d.setNouvelleTacheTemplate(prev => ({ ...prev, titre: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ajouterTacheTemplate() } }}
              placeholder="Titre d'une tâche…"
              style={{ width: '100%', padding: '9px 12px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={d.nouvelleTacheTemplate?.priorite || 'moyenne'}
                onChange={e => d.setNouvelleTacheTemplate(prev => ({ ...prev, priorite: e.target.value }))}
                style={{ flex: '0 0 auto', padding: '7px 10px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none', cursor: 'pointer', minWidth: 90 }}>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.text2 }}>
                <span>Dans</span>
                <input type="number" min={1} max={365}
                  value={d.nouvelleTacheTemplate?.deadline_jours || 7}
                  onChange={e => d.setNouvelleTacheTemplate(prev => ({ ...prev, deadline_jours: parseInt(e.target.value) || 7 }))}
                  style={{ width: 52, padding: '6px 8px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, outline: 'none', textAlign: 'center' }} />
                <span>j</span>
              </div>
              <motion.button
                onClick={ajouterTacheTemplate}
                disabled={!d.nouvelleTacheTemplate?.titre?.trim()}
                whileTap={{ scale: 0.96 }}
                style={{
                  marginLeft: 'auto',
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 9,
                  fontSize: 12, fontWeight: 700,
                  background: d.nouvelleTacheTemplate?.titre?.trim() ? T.accent : T.bg2,
                  border: `1.5px solid ${d.nouvelleTacheTemplate?.titre?.trim() ? T.accent : T.border}`,
                  color: d.nouvelleTacheTemplate?.titre?.trim() ? T.bg : T.text2,
                  cursor: d.nouvelleTacheTemplate?.titre?.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}>
                <Plus size={13} strokeWidth={2.5} /> Ajouter
              </motion.button>
            </div>
          </div>
        </div>

        {/* Footer sticky */}
        <div style={{
          padding: isMobile ? '12px 16px calc(env(safe-area-inset-bottom) + 12px)' : '14px 24px 18px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10,
          flexShrink: 0,
          background: T.bg2,
          boxShadow: '0 -8px 18px rgba(0,0,0,0.12)',
        }}>
          <motion.button
            onClick={() => d.setShowCreerTemplate(false)}
            whileTap={{ scale: 0.98 }}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: `1.5px solid ${T.border}`, borderRadius: 11, color: T.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </motion.button>
          <motion.button
            onClick={publier}
            disabled={!valide}
            whileTap={valide ? { scale: 0.98 } : {}}
            style={{
              flex: 2,
              padding: '12px',
              fontSize: 13.5, fontWeight: 700,
              borderRadius: 11,
              background: valide ? T.accent : T.bg3,
              border: `1.5px solid ${valide ? T.accent : T.border}`,
              color: valide ? T.bg : T.text2,
              cursor: valide ? 'pointer' : 'not-allowed',
              opacity: valide ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            <Sparkles size={14} strokeWidth={2.4} /> Publier le template
          </motion.button>
        </div>
      </motion.div>
      </div>
    </>
  )
})

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const d = useDashboard()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1100px)')
  const coachStyleObj = COACH_STYLES_LIST.find(s => s.id === d.coachStyle)
  const { statsTaches: { total, terminees, haute, enCours, pct }, T } = d

  // Nouveau user = pas chargé encore OU 0 tâche jamais créée
  const isNewUser = !d.loading && (d.taches?.length || 0) === 0 && (d.dashboardStats?.total_taches ?? 0) === 0

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen; setSidebarOpen(next)
    localStorage.setItem('sidebar_open', String(next))
    if (isMobile && d.setShowSidebar) d.setShowSidebar(next)
  }
  useEffect(() => { if (isMobile) setSidebarOpen(d.showSidebar) }, [d.showSidebar, isMobile])

  const [showBottomSheet, setShowBottomSheet] = useState(false)

  // Auto-ouvrir BottomSheet ou Coach drawer si on arrive depuis la BottomNav d'une autre page
  useEffect(() => {
    if (location.state?.openAddSheet) {
      setShowBottomSheet(true)
      navigate(location.pathname, { replace: true, state: {} })
    } else if (location.state?.openCoach) {
      d.setShowCoach?.(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.pathname, navigate])

  const mainMarginL = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  const pColor = (p) => p === 'haute' ? '#e05c5c' : p === 'moyenne' ? '#e08a3c' : '#4caf82'
  const pBg = (p) => p === 'haute' ? 'rgba(224,92,92,0.12)' : p === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        /* Stats grid */
        .gs-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        @media (max-width: 1100px) { .gs-stats { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; } }
        @media (max-width: 768px)  { .gs-stats { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; } }
        /* Forms grid */
        .gs-forms { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 1100px) { .gs-forms { grid-template-columns: 1fr !important; } }
        /* Task action labels hidden on tablet */
        .task-btn-label { display: inline; }
        @media (max-width: 1000px) { .task-btn-label { display: none !important; } }
        /* Mobile action bar scrollbar hide */
        .mobile-actions::-webkit-scrollbar { display: none; }
        /* Generic hide-scrollbar utility (template modal cat pills, picker, etc.) */
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        select option { background: #1a1a2e; }
      `}</style>

      {/* NOTIFICATIONS */}
      <AnimatePresence>
        {d.notification && (
          <motion.div style={{ position: 'fixed', top: 'clamp(16px,4vh,24px)', right: 'clamp(16px,4vw,24px)', zIndex: 2000, maxWidth: 'min(400px,90vw)', background: T.bg2, border: `1px solid ${d.notification.type === 'error' ? '#e05c5c50' : T.border}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.notification.type === 'error' ? '#e05c5c' : '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{d.notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BADGE */}
      <AnimatePresence>
        {d.badgeNotif && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
            style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: T.bg2, border: `2px solid ${T.accent}`, borderRadius: 20, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: `0 8px 40px ${T.accent}40`, minWidth: 280 }}>
            <motion.span animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1.3, 1.1, 1] }} transition={{ duration: 0.6 }} style={{ fontSize: 32 }}>{d.badgeNotif.icon}</motion.span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1, marginBottom: 2 }}>BADGE DÉBLOQUÉ !</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{d.badgeNotif.nom}</div>
              <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>{d.badgeNotif.description}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR (shared component) ── */}
      <AppSidebar
        T={T} user={d.user}
        niveau={d.niveau} points={d.points} streak={d.streak}
        niveauActuel={d.niveauActuel} pctNiveau={d.pctNiveau}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={(v) => { setSidebarOpen(v); if (isMobile) d.setShowSidebar?.(v) }}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}>
        {/* Dashboard-specific: FILTRES section */}
        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>FILTRES</p>
        {[
          { val: 'toutes', label: 'Toutes les tâches' },
          { val: 'haute', label: 'Priorité haute' },
          { val: 'bloquee', label: `Bloquées${d.bloquees > 0 ? ` (${d.bloquees})` : ''}` },
          { val: 'terminee', label: 'Terminées' },
        ].map(f => (
          <motion.button key={f.val}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', borderRadius: 10, color: d.filtre === f.val ? T.accent : T.text2, background: d.filtre === f.val ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: d.filtre === f.val ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
            onClick={() => { d.setFiltre(f.val); if (isMobile) setSidebarOpen(false) }} whileHover={{ x: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.val === 'bloquee' && <IconLock size={12} color={d.filtre === f.val ? T.accent : T.text2} />}
              {f.label}
            </span>
            {d.filtre === f.val && <ChevronRight size={14} />}
          </motion.button>
        ))}
      </AppSidebar>

      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      {/* ══════════════════════════════════════════════════════════════
          MAIN
      ══════════════════════════════════════════════════════════════ */}
      <motion.main animate={{ marginLeft: mainMarginL }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%' }}>

        {/* ── BARRE D'ACTIONS MOBILE (toujours visible) ── */}
        {isMobile && (
          <div style={{ position: 'sticky', top: 0, zIndex: 100, paddingTop: 52 }}>
            <MobileActionBar
              d={d} T={T}
              onOpenTemplates={d.ouvrirTemplates}
              onOpenExport={() => d.setShowExport(true)}
            />
          </div>
        )}

        {/* Contenu scrollable */}
        <div style={{ flex: 1, padding: isMobile ? '12px 16px 120px' : 'clamp(16px,3vw,40px)', paddingTop: isMobile ? 12 : 60, boxSizing: 'border-box' }}>

          {/* Bannière guide */}
          <AnimatePresence>
            {d.showGuideBanner && (
              <motion.div style={{ background: `linear-gradient(135deg, ${T.accent}20, ${T.accent2}15)`, border: `1px solid ${T.accent}40`, borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${T.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HelpCircle size={17} color={T.accent} strokeWidth={2} />
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

          {/* Offline */}
          <AnimatePresence>
            {!d.isOnline && (
              <motion.div style={{ background: 'rgba(224,138,60,0.1)', border: '1px solid rgba(224,138,60,0.3)', borderRadius: 14, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
                initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <span style={{ fontSize: 16 }}>📡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e08a3c' }}>Mode hors ligne</div>
                  <div style={{ fontSize: 12, color: T.text2 }}>{d.pendingActions > 0 ? `${d.pendingActions} action(s) en attente` : 'Sync au retour du réseau'}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header desktop */}
          {!isMobile && (
            <motion.div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: '-0.5px', margin: 0 }}>{d.salut}, {d.user?.nom?.split(' ')[0]}</h1>
                <p style={{ color: T.text2, fontSize: 12, marginTop: 4 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 99, color: T.accent, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => d.setShowExport(true)} whileHover={{ scale: 1.02 }}>
                  <Download size={13} />Exporter
                </motion.button>
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 99, color: T.accent, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                  onClick={d.ouvrirTemplates} whileHover={{ scale: 1.02 }}>
                  <BookOpen size={13} />Templates
                </motion.button>
                {d.rappels?.length > 0 && (
                  <motion.button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 99, color: '#e05c5c', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => d.setShowRappels(s => !s)}>
                    <Bell size={13} />{d.rappels.length}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* Header mobile simplifié */}
          {isMobile && (
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: '-0.3px', margin: '0 0 2px' }}>{d.salut}, {d.user?.nom?.split(' ')[0]}</h1>
              <p style={{ color: T.text2, fontSize: 11, margin: 0 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          )}

          <ExportModal isOpen={d.showExport} onClose={() => d.setShowExport(false)} taches={d.taches} stats={{ total, terminees, haute, enCours, pct }} user={d.user} theme={d.theme} />

          {/* ── MODE NOUVEAU USER (0 tâche jamais créée) ──────────────────── */}
          {isNewUser ? (
            <>
              <WelcomeHero
                d={d}
                T={T}
                isMobile={isMobile}
                navigate={navigate}
                onCreateTask={() => {
                  if (isMobile) {
                    setShowBottomSheet(true)
                  } else {
                    // scroll vers le SmartTaskInput
                    setTimeout(() => {
                      const input = document.querySelector('.smart-task-input-field')
                      if (input) {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        input.focus()
                      }
                    }, 80)
                  }
                }}
              />
              <StarterTemplates d={d} T={T} isMobile={isMobile} />
              <CoachDailyMessage d={d} T={T} isMobile={isMobile} isNewUser={true} />
            </>
          ) : (
            <>
              {/* Coach Daily Message — bandeau personnalisé du coach */}
              <CoachDailyMessage d={d} T={T} isMobile={isMobile} isNewUser={false} />

              {/* Focus du jour */}
              <FocusDuJour d={d} T={T} isMobile={isMobile} pColor={pColor} pBg={pBg} />
            </>
          )}

          {/* Rappels */}
          <AnimatePresence>
            {d.showRappels && d.rappels?.length > 0 && (
              <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 14, padding: '14px 20px', marginBottom: 20 }}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {d.rappels.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(224,92,92,0.1)', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: T.text }}>{r.titre}</span>
                    <span style={{ fontSize: 12, color: r.jours_restants === 0 ? '#e05c5c' : '#e08a3c', fontWeight: 600 }}>
                      {r.jours_restants === 0 ? "Aujourd'hui" : r.jours_restants === 1 ? 'Demain' : `Dans ${r.jours_restants}j`}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats HUD — Niveau / Streak / Points semaine / Réussite (caché si nouveau user) */}
          {!isNewUser && <StatsHUD d={d} T={T} isMobile={isMobile} />}

          {/* Objectifs Goal Reverse en cours */}
          {!isNewUser && <GoalWidget d={d} T={T} isMobile={isMobile} navigate={navigate} />}

          {/* Alerte bloquées */}
          <AnimatePresence>
            {d.bloquees > 0 && (
              <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <IconLock size={15} color="#e05c5c" />
                <span style={{ flex: 1, fontSize: 13, color: '#e05c5c', fontWeight: 500 }}>{d.bloquees} tâche{d.bloquees > 1 ? 's bloquées' : ' bloquée'}</span>
                <motion.button style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 8, color: '#e05c5c', fontSize: 12, cursor: 'pointer' }}
                  onClick={() => d.setFiltre('bloquee')}>Voir</motion.button>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Formulaire desktop - Smart Task Input */}
          {!isMobile && (
            <div className="gs-forms" style={{ marginBottom: 24 }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <SmartTaskInput d={d} T={T} />
              </motion.div>
              <motion.div style={{ background: T.bg2, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={15} strokeWidth={2} color={T.accent} />Générer avec l'IA
                </p>
                <input style={{ width: '100%', padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                  placeholder="Ex: Apprendre React..." value={d.objectif} onChange={e => d.setObjectif(e.target.value)} onKeyDown={e => e.key === 'Enter' && d.genererTaches()} />
                <motion.button style={{ width: '100%', padding: '9px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  onClick={d.genererTaches} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Générer 5 tâches automatiquement
                </motion.button>
              </motion.div>
            </div>
          )}

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {[['toutes', 'Toutes'], ['haute', 'Haute'], ['moyenne', 'Moyenne'], ['basse', 'Basse'], ['bloquee', 'Bloquées'], ['terminee', 'Terminées']].map(([val, label]) => (
              <motion.button key={val}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '5px 10px' : '5px 14px', background: d.filtre === val ? `${T.accent}15` : 'transparent', border: `1px solid ${d.filtre === val ? T.accent : T.border}`, borderRadius: 99, color: d.filtre === val ? T.accent : T.text2, fontSize: isMobile ? 11 : 12, fontWeight: d.filtre === val ? 600 : 400, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => d.setFiltre(val)} whileTap={{ scale: 0.97 }}>
                {val === 'bloquee' && <IconLock size={10} color="currentColor" />}
                {label}
                {val === 'bloquee' && d.bloquees > 0 && <span style={{ background: '#e05c5c', color: 'white', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '0 4px' }}>{d.bloquees}</span>}
              </motion.button>
            ))}
          </div>

          {/* Liste tâches */}
          {d.loading ? (
            <div>{[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} T={T} />)}</div>
          ) : d.tachesFiltrees.length === 0 ? (
            <motion.div
              style={{
                textAlign: 'center',
                padding: isNewUser ? '40px 20px' : '50px 20px',
                color: T.text2,
                background: isNewUser ? T.bg2 : 'transparent',
                border: isNewUser ? `1px dashed ${T.border}` : 'none',
                borderRadius: 14,
              }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ marginBottom: 14, display: 'inline-block' }}>
                {isNewUser
                  ? <Sparkles size={36} color={T.accent} strokeWidth={1.6} />
                  : <CheckSquare size={36} color={T.border} strokeWidth={1.4} />}
              </motion.div>
              <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>
                {isNewUser
                  ? "C'est tout neuf ici"
                  : d.filtre === 'terminee' ? "Aucune tâche terminée pour l'instant"
                  : d.filtre === 'bloquee' ? "Aucune tâche bloquée — bravo !"
                  : "Aucune tâche dans ce filtre"}
              </p>
              <p style={{ fontSize: 12.5, marginTop: 4, color: T.text2, marginBottom: isNewUser ? 16 : 0, fontWeight: 500 }}>
                {isNewUser
                  ? "Crée ta 1ère tâche maintenant — tu vas voir, c'est rapide."
                  : isMobile ? 'Appuie sur Ajouter pour créer une tâche' : "Ajoute une tâche ou génère-en avec l'IA"}
              </p>
              {isNewUser && (
                <motion.button
                  onClick={() => isMobile ? setShowBottomSheet(true) : (() => {
                    const input = document.querySelector('.smart-task-input-field')
                    if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus() }
                  })()}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '10px 18px',
                    background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
                    border: 'none', borderRadius: 10,
                    color: T.bg, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    boxShadow: `0 6px 20px ${T.accent}30`,
                  }}>
                  <Plus size={14} strokeWidth={2.6} /> Créer ma 1ère tâche
                </motion.button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence>
              {d.tachesFiltrees.map((tache, i) => {
                if (isMobile) return <CarteTacheMobile key={tache.id} tache={tache} d={d} T={T} pColor={pColor} pBg={pBg} />

                const pts = tache.priorite === 'haute' ? 30 : tache.priorite === 'moyenne' ? 20 : 10
                const isExpanded = d.expandedTaches[tache.id]
                const currentMode = d.expandMode[tache.id]
                const isBloquee = tache.bloquee && !tache.terminee
                const todayStr = (() => { const x = new Date(); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}` })()
                const isFocused = !!tache.focus_date && String(tache.focus_date).slice(0,10) === todayStr
                const focusFull = (d.tachesFocus?.length || 0) >= 3 && !isFocused
                const canPin = !tache.terminee && !isBloquee

                return (
                  <motion.div key={tache.id} layout
                    style={{ background: T.bg2, border: `1px solid ${isBloquee ? 'rgba(224,92,92,0.25)' : T.border}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden', opacity: tache.terminee ? 0.55 : 1, position: 'relative' }}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: tache.terminee ? 0.55 : 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    whileHover={{ borderColor: isBloquee ? 'rgba(224,92,92,0.45)' : `${T.accent}50` }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: tache.terminee ? T.border : pColor(tache.priorite), borderRadius: '14px 0 0 14px', opacity: tache.terminee ? 0.3 : 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 20px' }}>
                      {isBloquee ? (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(224,92,92,0.4)', background: 'rgba(224,92,92,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconLock size={10} color="#e05c5c" />
                        </div>
                      ) : (
                        <motion.button onClick={() => d.toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)}
                          style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${tache.terminee ? '#4caf82' : T.border}`, background: tache.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          whileHover={{ scale: 1.15, borderColor: '#4caf82' }} whileTap={{ scale: 0.9 }}>
                          {tache.terminee && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckSquare size={11} color="white" strokeWidth={3} /></motion.div>}
                        </motion.button>
                      )}
                      <div style={{ flex: '1 1 0', minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: tache.terminee ? 400 : 500, color: tache.terminee ? T.text2 : T.text, textDecoration: tache.terminee ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {tache.titre}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                          {tache.deadline && (
                            <span style={{ fontSize: 11, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Calendar size={10} strokeWidth={1.8} />
                              {new Date(tache.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              {' · '}{new Date(tache.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {!tache.terminee && !isBloquee && <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>+{pts} pts</span>}
                          {isBloquee && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: 'rgba(224,92,92,0.1)', color: '#e05c5c', fontWeight: 600 }}>Bloquée</span>}
                        </div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, flexShrink: 0, background: pBg(tache.priorite), color: pColor(tache.priorite), textTransform: 'uppercase' }}>
                        {tache.priorite}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {canPin && (
                          <motion.button
                            onClick={() => !focusFull && d.togglerFocus(tache.id, isFocused)}
                            disabled={focusFull}
                            title={isFocused ? 'Désépingler du focus' : focusFull ? 'Limite de 3 atteinte' : 'Épingler au focus du jour'}
                            style={{ padding: '5px 8px', borderRadius: 8, background: isFocused ? `${T.accent}15` : 'transparent', border: `1px solid ${isFocused ? T.accent : T.border}`, color: isFocused ? T.accent : focusFull ? `${T.text2}50` : T.text2, cursor: focusFull ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', opacity: focusFull ? 0.5 : 1 }}
                            whileHover={!focusFull ? { borderColor: T.accent, color: T.accent } : {}}>
                            <Star size={13} strokeWidth={1.8} fill={isFocused ? T.accent : 'none'} />
                          </motion.button>
                        )}
                        <motion.button onClick={() => d.toggleExpand(tache.id, 'dependances')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 8, fontSize: 11, background: isExpanded && currentMode === 'dependances' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'dependances' ? T.accent : T.border}`, color: isExpanded && currentMode === 'dependances' ? T.accent : T.text2, cursor: 'pointer' }}
                          whileHover={{ borderColor: T.accent, color: T.accent }}>
                          <IconLink size={12} color="currentColor" />
                          <span className="task-btn-label">Prérequis</span>
                        </motion.button>
                        <motion.button onClick={() => d.toggleExpand(tache.id, 'sousTaches')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 8, fontSize: 11, background: isExpanded && currentMode === 'sousTaches' ? `${T.accent}15` : 'transparent', border: `1px solid ${isExpanded && currentMode === 'sousTaches' ? T.accent : T.border}`, color: isExpanded && currentMode === 'sousTaches' ? T.accent : T.text2, cursor: 'pointer' }}
                          whileHover={{ borderColor: T.accent, color: T.accent }}>
                          {isExpanded && currentMode === 'sousTaches' ? <ChevronUp size={11} strokeWidth={2} /> : <ChevronDown size={11} strokeWidth={2} />}
                          <span className="task-btn-label">Sous-tâches</span>
                        </motion.button>
                        {tache.deadline && !tache.terminee && (
                          <motion.button onClick={() => d.exporterGoogleCalendar(tache)}
                            style={{ padding: '5px 8px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            whileHover={{ borderColor: '#1a73e8', color: '#1a73e8' }} title="Google Calendar">
                            <Calendar size={13} strokeWidth={1.8} />
                          </motion.button>
                        )}
                        <motion.button onClick={() => !isBloquee && d.toggleTache(tache.id, tache.terminee, tache.priorite, tache.bloquee)}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: tache.terminee ? 'transparent' : isBloquee ? 'transparent' : `${T.accent}12`, border: `1px solid ${tache.terminee ? T.border : isBloquee ? 'rgba(224,92,92,0.2)' : `${T.accent}30`}`, color: tache.terminee ? T.text2 : isBloquee ? 'rgba(224,92,92,0.5)' : T.accent, cursor: isBloquee ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                          whileHover={!isBloquee ? { background: `${T.accent}20` } : {}}>
                          {tache.terminee ? 'Rouvrir' : isBloquee ? 'Bloquée' : 'Terminer'}
                        </motion.button>
                        <motion.button onClick={() => d.supprimerTache(tache.id)}
                          style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          whileHover={{ borderColor: '#e05c5c', color: '#e05c5c', background: 'rgba(224,92,92,0.06)' }}>
                          <Trash2 size={13} strokeWidth={1.8} />
                        </motion.button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden', borderTop: `1px solid ${T.border}`, paddingLeft: 20, paddingRight: 14, paddingBottom: 14 }}>
                          {currentMode === 'sousTaches' && <SousTaches tache={tache} T={T} />}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}

        </div>
      </motion.main>

      {/* Tomorrow Builder CTA flottant — toujours visible (après 17h + tâches actives) */}
      <TomorrowBuilderCTA d={d} T={T} isMobile={isMobile} navigate={navigate} mainMarginL={mainMarginL} />

      {/* BottomSheet ajout mobile */}
      <BottomSheetAjout open={showBottomSheet} onClose={() => setShowBottomSheet(false)} d={d} T={T} />

      {/* Bottom Nav mobile permanente */}
      {isMobile && (
        <BottomNavMobile
          T={T}
          onCreateTask={() => setShowBottomSheet(true)}
          onOpenCoach={() => d.setShowCoach?.(true)}
          hidden={showBottomSheet}
        />
      )}

      {/* Onboarding */}
      {d.showOnboarding && (
        <Onboarding T={T} userId={d.user?.id} etapeInitiale={0}
          onTerminer={() => { localStorage.setItem('onboarding_termine', 'true'); d.setShowOnboarding(false) }}
          activerNotifications={d.activerNotifications} />
      )}

      {/* Panel IA sous-tâches */}
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
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={16} color={T.accent} /></div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Sous-tâches générées</h3>
                  <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>Pour : <span style={{ color: T.accent, fontWeight: 600 }}>"{d.titrePourIA}"</span></p>
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
                      {st.selectionne && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke={T.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: st.selectionne ? T.text : T.text2, fontWeight: st.selectionne ? 500 : 400, flex: 1 }}>{st.titre}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 7px', background: st.priorite === 'haute' ? '#e05c5c22' : `${T.accent}18`, color: st.priorite === 'haute' ? '#e05c5c' : T.accent }}>{st.priorite}</span>
                  </motion.div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button onClick={() => d.setIaPanel(false)} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 12, color: T.text2, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Annuler</motion.button>
                <motion.button onClick={d.confirmerSousTachesIA} whileHover={{ scale: 1.02 }}
                  style={{ flex: 2, padding: '11px 0', background: T.accent, border: 'none', borderRadius: 12, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Sparkles size={14} />Créer + {d.iaSousTaches.filter(st => st.selectionne).length} sous-tâches
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB Coach — desktop only (mobile a déjà Coach dans la BottomNavMobile) */}
      {!d.showCoach && !isMobile && (
        <motion.button onClick={d.ouvrirCoach} initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          style={{ position: 'fixed', bottom: 24, right: 24, width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', cursor: 'pointer', zIndex: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${T.accent}50` }}>
          <Target size={20} color="white" />
        </motion.button>
      )}

      {/* ── DRAWER PARAMÈTRES ── */}
      <AnimatePresence>
        {d.showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => d.setShowSettings(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, backdropFilter: 'blur(3px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px,100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 1051, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={18} color={T.accent} strokeWidth={1.8} />
                    </div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h2>
                  </div>
                  <motion.button onClick={() => d.setShowSettings(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>
                <div style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {[{ id: 'badges', label: 'Badges', icon: Award }, { id: 'theme', label: 'Thème', icon: Palette }, { id: 'integrations', label: 'Slack', icon: ExternalLink }, { id: 'outils', label: 'Outils', icon: Link2 }].map(({ id, label, icon: Icon }) => (
                    <motion.button key={id} onClick={() => d.setActiveSettingsTab(id)}
                      style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 12px', background: 'none', border: 'none', borderBottom: d.activeSettingsTab === id ? `2px solid ${T.accent}` : '2px solid transparent', color: d.activeSettingsTab === id ? T.accent : T.text2, fontSize: 12, fontWeight: d.activeSettingsTab === id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <Icon size={13} strokeWidth={1.8} />{label}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {d.activeSettingsTab === 'badges' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                      <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: T.accent }}>{d.badgesObtenus?.length || 0}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>badges obtenus</div>
                      </div>
                      <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#e08a3c' }}>{d.streak}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>jours de streak</div>
                      </div>
                    </div>
                    {['performance', 'points', 'streak', 'special'].map(cat => (
                      <div key={cat} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>{cat}</div>
                        {BADGES_CONFIG.filter(b => b.categorie === cat).map(b => {
                          const obtenu = d.badgesObtenus?.find(ob => ob.id === b.id)
                          return (
                            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: obtenu ? `${T.accent}08` : T.bg3, border: `1px solid ${obtenu ? T.accent + '30' : T.border}`, opacity: obtenu ? 1 : 0.45, marginBottom: 6 }}>
                              <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: obtenu ? 600 : 400, color: T.text }}>{b.nom}</div>
                                <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{b.description}</div>
                              </div>
                              {obtenu
                                ? <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4caf82', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                                : <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px dashed ${T.border}`, flexShrink: 0 }} />
                              }
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {d.activeSettingsTab === 'theme' && (
                  <div>
                    <p style={{ fontSize: 13, color: T.text2, marginBottom: 16 }}>Choisis l'apparence de GetShift.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(require('../themes').themes).map(([key, t]) => (
                        <motion.button key={key} onClick={() => d.changerTheme(key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: d.theme === key ? `${T.accent}12` : T.bg3, border: `1.5px solid ${d.theme === key ? T.accent : T.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
                          whileHover={{ borderColor: T.accent }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[t.bg, t.accent, t.accent2 || t.accent].map((c, ci) => (
                              <div key={ci} style={{ width: 20, height: 20, borderRadius: 6, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                            ))}
                          </div>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: d.theme === key ? 700 : 500, color: T.text }}>{t.name}</div></div>
                          {d.theme === key && <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                {d.activeSettingsTab === 'integrations' && (
                  <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#4A154B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16, color: 'white', fontWeight: 700 }}>S</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Slack</div>
                        <div style={{ fontSize: 11, color: T.text2 }}>Notifications dans votre canal</div>
                      </div>
                      {d.slackWebhook && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf82' }} />}
                    </div>
                    <input style={{ width: '100%', padding: '10px 14px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                      placeholder="https://hooks.slack.com/services/..." value={d.slackWebhook} onChange={e => d.setSlackWebhook(e.target.value)} />
                    <motion.button style={{ width: '100%', padding: 10, background: d.slackSaved ? '#4caf82' : `${T.accent}15`, border: `1px solid ${d.slackSaved ? '#4caf82' : T.accent + '40'}`, borderRadius: 10, color: d.slackSaved ? 'white' : T.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={d.sauvegarderSlack}>
                      {d.slackSaving ? 'Sauvegarde...' : d.slackSaved ? '✓ Sauvegardé !' : 'Sauvegarder'}
                    </motion.button>
                  </div>
                )}
                {d.activeSettingsTab === 'outils' && (
                  <div>
                    <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,188,4,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌐</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Extension Chrome</div>
                          <div style={{ fontSize: 11, color: T.text2 }}>Détecte Zoom, Meet, Notion, Drive</div>
                        </div>
                      </div>
                      <motion.a href="https://chrome.google.com/webstore/detail/getshift" target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'rgba(251,188,4,0.15)', border: '1px solid rgba(251,188,4,0.3)', borderRadius: 10, color: '#FBBC04', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                        Installer l'extension Chrome
                      </motion.a>
                    </div>
                    <OutilsIntegrations T={T} userId={d.user?.id} />
                  </div>
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

      {/* ── DRAWER TEMPLATES ── */}
      <AnimatePresence>
        {d.showTemplates && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => d.setShowTemplates(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1060, backdropFilter: 'blur(3px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px,100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 1061, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={18} color={T.accent} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Templates</h2>
                      <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 2 }}>Projets prêts à l'emploi</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button onClick={() => { d.setShowTemplates(false); d.setShowCreerTemplate(true) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: `${T.accent}15`, border: `1px solid ${T.accent}30`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      whileTap={{ scale: 0.97 }}>
                      <Plus size={13} strokeWidth={2.5} />Créer
                    </motion.button>
                    <motion.button onClick={() => d.setShowTemplates(false)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                  {['tous', ...Array.from(new Set((d.templates || []).map(t => t.categorie).filter(Boolean)))].map(cat => (
                    <motion.button key={cat} onClick={() => d.setTemplateCategorie(cat)} whileTap={{ scale: 0.97 }}
                      style={{ padding: '4px 12px', borderRadius: 99, flexShrink: 0, fontSize: 11, fontWeight: d.templateCategorie === cat ? 600 : 400, background: d.templateCategorie === cat ? `${T.accent}15` : 'transparent', border: `1px solid ${d.templateCategorie === cat ? T.accent : T.border}`, color: d.templateCategorie === cat ? T.accent : T.text2, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {cat === 'tous' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Succès inline */}
              <AnimatePresence>
                {d.templateSucces && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ background: 'rgba(34,197,94,0.08)', borderBottom: `1px solid rgba(34,197,94,0.2)`, padding: '14px 24px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                        <CheckCircle2 size={28} color="#22c55e" strokeWidth={1.8} />
                      </motion.div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Template appliqué !</div>
                        <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
                          {d.templateSucces.nb} tâche{d.templateSucces.nb > 1 ? 's' : ''} créée{d.templateSucces.nb > 1 ? 's' : ''} depuis <strong style={{ color: T.text }}>"{d.templateSucces.titre}"</strong>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                {d.templatesLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <Skeleton w={40} h={40} r={10} />
                          <div style={{ flex: 1 }}>
                            <Skeleton h={14} r={6} style={{ marginBottom: 8 }} />
                            <Skeleton w="60%" h={10} r={4} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(d.templateCategorie === 'tous' ? d.templates : d.templates.filter(t => t.categorie === d.templateCategorie))
                      .map((tmpl, i) => {
                        const isSelected = d.templateSelectionne?.id === tmpl.id
                        return (
                          <motion.div key={tmpl.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            style={{ background: isSelected ? `${T.accent}08` : T.bg3, border: `1.5px solid ${isSelected ? T.accent : T.border}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}
                            onClick={() => { d.setTemplateSelectionne(isSelected ? null : tmpl); if (isSelected) d.setTemplateDateDebut(null) }}
                            whileHover={{ borderColor: T.accent + '50' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <TemplateIconBox categorie={tmpl.categorie} size={18} boxSize={40} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <span style={{ fontSize: 13.5, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tmpl.titre}</span>
                                  <span style={{ fontSize: 10, color: T.text2, background: T.bg2, padding: '2px 7px', borderRadius: 99, border: `1px solid ${T.border}`, flexShrink: 0 }}>{tmpl.taches?.length || 0} tâches</span>
                                </div>
                                {tmpl.description && <p style={{ fontSize: 11.5, color: T.text2, margin: '3px 0 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{tmpl.description}</p>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                                  <span style={{ fontSize: 10, color: T.text2 }}>par {tmpl.auteur || 'GetShift'}</span>
                                  {tmpl.utilisations > 0 && <span style={{ fontSize: 10, color: '#4caf82' }}>{tmpl.utilisations}× utilisé</span>}
                                </div>
                              </div>
                              <div style={{ flexShrink: 0, color: T.text2, marginTop: 2 }}>
                                {isSelected ? <ChevronUp size={16} strokeWidth={1.8} /> : <ChevronRight size={16} strokeWidth={1.8} />}
                              </div>
                            </div>
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  style={{ overflow: 'hidden', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>Tâches incluses</p>
                                  {tmpl.taches?.slice(0, 5).map((t, ti) => (
                                    <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.border}30` }}>
                                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.border}`, flexShrink: 0 }} />
                                      <span style={{ fontSize: 12, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
                                      <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, color: t.priorite === 'haute' ? '#e05c5c' : t.priorite === 'moyenne' ? '#e08a3c' : '#4caf82' }}>{t.priorite}</span>
                                    </div>
                                  ))}
                                  {tmpl.taches?.length > 5 && <p style={{ fontSize: 11, color: T.text2, marginTop: 6 }}>+{tmpl.taches.length - 5} autres tâches</p>}
                                  <div style={{ marginTop: 14 }} onClick={e => e.stopPropagation()}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' }}>Date de début *</p>
                                    <DatePicker selected={d.templateDateDebut} onChange={d.setTemplateDateDebut} locale="fr" dateFormat="dd/MM/yyyy" minDate={new Date()} placeholderText="Choisir une date de début"
                                      customInput={<input readOnly style={{ width: '100%', padding: '9px 12px', background: T.bg2, border: `1.5px solid ${d.templateDateDebut ? T.accent : T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }} />} />
                                    {!d.templateDateDebut && <p style={{ fontSize: 11, color: '#e08a3c', marginTop: 4 }}>Sélectionne une date pour activer l'import</p>}
                                  </div>
                                  <motion.button
                                    onClick={(e) => { e.stopPropagation(); d.utiliserTemplate(tmpl) }}
                                    disabled={d.templateImporting || !d.templateDateDebut}
                                    style={{ width: '100%', marginTop: 12, padding: '12px', background: d.templateDateDebut ? T.accent : T.bg3, border: `1px solid ${d.templateDateDebut ? T.accent : T.border}`, borderRadius: 11, color: d.templateDateDebut ? T.bg : T.text2, fontSize: 13, fontWeight: 700, cursor: (!d.templateDateDebut || d.templateImporting) ? 'not-allowed' : 'pointer', opacity: !d.templateDateDebut ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
                                    whileHover={d.templateDateDebut && !d.templateImporting ? { scale: 1.01 } : {}} whileTap={{ scale: 0.98 }}>
                                    {d.templateImporting ? (
                                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}><Target size={14} strokeWidth={2} /></motion.div>Import en cours...</>
                                    ) : (
                                      <><Sparkles size={14} strokeWidth={2} />{d.templateDateDebut ? 'Utiliser ce template' : "Choisir une date d'abord"}</>
                                    )}
                                  </motion.button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    {d.templates.length === 0 && !d.templatesLoading && (
                      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <BookOpen size={36} color={T.border} strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>Aucun template disponible</p>
                        <motion.button onClick={() => { d.setShowTemplates(false); d.setShowCreerTemplate(true) }}
                          style={{ padding: '9px 18px', background: T.accent, border: 'none', borderRadius: 10, color: T.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Créer un template
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TOAST UNDO */}
      <AnimatePresence>
        {d.undoToast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            style={{ position: 'fixed', bottom: isMobile ? 100 : 90, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
            <Trash2 size={15} color="#e05c5c" />
            <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Tâche supprimée</span>
            <div style={{ width: 60, height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
              <motion.div initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} style={{ height: '100%', background: '#e05c5c', borderRadius: 99 }} />
            </div>
            <motion.button onClick={d.annulerSuppression}
              style={{ padding: '5px 14px', background: `${T.accent}18`, border: `1px solid ${T.accent}50`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Annuler
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWER COACH */}
      <AnimatePresence>
        {d.showCoach && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => d.setShowCoach(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1080, backdropFilter: 'blur(4px)' }} />
            <motion.div
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', ...(isMobile ? { bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', maxHeight: '88vh' } : { top: 0, right: 0, bottom: 0, width: 'min(400px,100vw)', borderLeft: `1px solid ${T.border}` }), zIndex: 1081, background: T.bg2, display: 'flex', flexDirection: 'column', boxShadow: isMobile ? '0 -8px 40px rgba(0,0,0,0.25)' : '-8px 0 40px rgba(0,0,0,0.2)' }}>
              {isMobile && <div style={{ width: 36, height: 4, background: T.border, borderRadius: 99, margin: '12px auto 0', flexShrink: 0 }} />}
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CoachIcon style={coachStyleObj} size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{coachStyleObj?.nom || 'Coach'}</div>
                      <div style={{ fontSize: 11, color: T.accent, fontWeight: 500 }}>{coachStyleObj?.desc}</div>
                    </div>
                  </div>
                  <motion.button onClick={() => d.setShowCoach(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {COACH_STYLES_LIST.map(style => (
                    <motion.button key={style.id} onClick={() => d.setCoachStyle(style.id)} whileTap={{ scale: 0.96 }}
                      style={{ flex: 1, padding: '7px 4px', borderRadius: 10, background: d.coachStyle === style.id ? `${T.accent}15` : T.bg3, border: `1.5px solid ${d.coachStyle === style.id ? T.accent : T.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: d.coachStyle === style.id ? `${T.accent}20` : T.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CoachIcon style={style} size={14} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: d.coachStyle === style.id ? 700 : 400, color: d.coachStyle === style.id ? T.accent : T.text2 }}>{style.nom}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 4 }}>
                  {[{ label: 'Tâches', val: total, color: T.accent }, { label: 'Faites', val: terminees, color: '#4caf82' }, { label: 'Streak', val: `${d.streak}j`, color: '#e08a3c' }].map(s => (
                    <div key={s.label} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: T.text2, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {(d.coachMessages || []).map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                    {msg.role === 'coach' && (
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                        <CoachIcon style={coachStyleObj} size={14} />
                      </div>
                    )}
                    <div style={{ maxWidth: '78%', padding: '10px 13px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? T.accent : T.bg3, border: msg.role === 'user' ? 'none' : `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.6, color: msg.role === 'user' ? T.bg : T.text, wordBreak: 'break-word' }}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {(!d.coachMessages || d.coachMessages.length === 0) && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CoachIcon style={coachStyleObj} size={14} />
                    </div>
                    <div style={{ maxWidth: '78%', padding: '10px 13px', borderRadius: '14px 14px 14px 4px', background: T.bg3, border: `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.6, color: T.text }}>
                      {coachStyleObj?.id === 'motivateur'
                        ? `Allez ! ${total - terminees} tâches restantes — qu'est-ce qui te bloque ?`
                        : coachStyleObj?.id === 'analytique'
                          ? `Analyse : ${pct}% de complétion, ${d.bloquees} tâche(s) bloquée(s). Que veux-tu optimiser ?`
                          : `Bonjour ! Tu as ${total - terminees} tâches en cours. Comment je peux t'aider ?`}
                    </div>
                  </motion.div>
                )}
                {d.coachLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CoachIcon style={coachStyleObj} size={14} />
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: T.bg3, border: `1px solid ${T.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                {(!d.coachMessages || d.coachMessages.length === 0) && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {['Quelles tâches prioriser ?', 'Aide-moi à débloquer', 'Analyse ma semaine'].map(s => (
                      <motion.button key={s} onClick={() => d.envoyerMessageCoach?.(s)} whileTap={{ scale: 0.96 }}
                        style={{ padding: '5px 11px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: `${T.accent}10`, border: `1px solid ${T.accent}25`, color: T.accent, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={d.coachInput || ''} onChange={e => d.setCoachInput?.(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); d.envoyerMessageCoach?.(d.coachInput) } }}
                    placeholder={`Parle à ${coachStyleObj?.nom || 'ton coach'}...`}
                    style={{ flex: 1, padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                  <motion.button onClick={() => d.envoyerMessageCoach?.(d.coachInput)}
                    disabled={!d.coachInput?.trim() || d.coachLoading}
                    style={{ width: 40, height: 40, borderRadius: 10, background: d.coachInput?.trim() ? T.accent : T.bg3, border: `1px solid ${d.coachInput?.trim() ? T.accent : T.border}`, color: d.coachInput?.trim() ? T.bg : T.text2, cursor: d.coachInput?.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    whileHover={d.coachInput?.trim() ? { scale: 1.05 } : {}} whileTap={{ scale: 0.95 }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL CRÉER TE
      MPLATE */}
      <AnimatePresence>
        {d.showCreerTemplate && (
          <CreerTemplateModal d={d} T={T} isMobile={isMobile} />
        )}
      </AnimatePresence>

      {/* Task DNA Popup */}
      <TaskDNAPopup d={d} T={T} isMobile={isMobile} />

      {/* Loading toast pendant l'analyse DNA */}
      <AnimatePresence>
        {d.dnaLoading && !d.showDnaPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: isMobile ? 60 : 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1095, background: T.bg2, border: `1px solid ${T.accent}40`, borderRadius: 99, padding: '10px 18px', boxShadow: `0 8px 28px ${T.accent}25`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Sparkles size={14} color={T.accent} strokeWidth={2.2} />
            </motion.div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Analyse Task DNA en cours…</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
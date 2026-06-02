import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import {
  Flag, Sparkles, Target, Calendar,
  CheckCircle2, AlertCircle, Clock, Zap, ArrowRight,
  Download, ChevronDown, ChevronUp, Layers, AlertTriangle,
  Wand2, BookOpen, Send, Lightbulb, X
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import { useSidebarUser } from '../components/useSidebarUser'

registerLocale('fr', fr)
const API = 'https://getshift-backend.onrender.com'

const NIVEAUX_BASE = [
  { id: 'realiste',  emoji: '🌱', color: '#4caf82' },
  { id: 'ambitieux', emoji: '🔥', color: '#e08a3c' },
  { id: 'extreme',   emoji: '⚡', color: '#e05c5c' },
]

const DIFFICULTE_COLOR = {
  'faible':  '#4caf82',
  'moyenne': '#e08a3c',
  'élevée':  '#e05c5c',
}

const QUICK_ITERATIONS_BASE = [
  { emoji: '➕', lkey: 'goal.adjust_1week', tkey: 'goal.adjust_1week_text' },
  { emoji: '🌿', lkey: 'goal.adjust_chill', tkey: 'goal.adjust_chill_text' },
  { emoji: '🔥', lkey: 'goal.adjust_intense', tkey: 'goal.adjust_intense_text' },
  { emoji: '🗜️', lkey: 'goal.adjust_merge', tkey: 'goal.adjust_merge_text' },
  { emoji: '🎯', lkey: 'goal.adjust_prep', tkey: 'goal.adjust_prep_text' },
  { emoji: '📅', lkey: 'goal.adjust_dates', tkey: 'goal.adjust_dates_text' },
]

export default function GoalReverse() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const NIVEAUX = NIVEAUX_BASE.map(n => ({
    ...n,
    label: t(`goal.niveau_${n.id}`),
    desc: t(`goal.niveau_${n.id}_desc`),
  }))
  const QUICK_ITERATIONS = QUICK_ITERATIONS_BASE.map(qi => ({
    ...qi,
    label: t(qi.lkey),
    text: t(qi.tkey),
  }))
  const { user, niveau: userNiveau, points: userPoints, streak: userStreak, niveauActuel: userNiveauActuel, pctNiveau: userPctNiveau } = useSidebarUser()
  const themeKey = localStorage.getItem('theme') || 'light'
  const T = themes[themeKey]

  const [objectif, setObjectif] = useState('')
  const [deadline, setDeadline] = useState(null)
  const [niveau, setNiveau] = useState('ambitieux')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [erreur, setErreur] = useState('')
  const [jalonsOuverts, setJalonsOuverts] = useState({})
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [notification, setNotification] = useState(null)
  const [templates, setTemplates] = useState([])
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [iterating, setIterating] = useState(false)
  const [iterationInput, setIterationInput] = useState('')
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1100px)')

  // Sidebar toggle persistant (clé globale partagée)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }

  useEffect(() => {
    axios.get(`${API}/ia/goal-reverse/templates`)
      .then(r => setTemplates(r.data.templates || []))
      .catch(() => {})
  }, [])

  const appliquerTemplate = (tpl) => {
    setObjectif(tpl.objectif)
    setNiveau(tpl.niveau)
    const d = new Date()
    d.setMonth(d.getMonth() + tpl.duree_mois)
    setDeadline(d)
    setShowTemplatesModal(false)
    setResult(null)
    setImported(false)
    afficherNotification(t('goal.template_applied', { titre: tpl.titre }))
    setTimeout(() => {
      const el = document.querySelector('textarea')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const iterer = async (instruction) => {
    const instr = (instruction || '').trim()
    if (!instr || !result) return
    setIterating(true)
    try {
      const res = await axios.post(`${API}/ia/goal-reverse/iterate`, {
        instruction: instr,
        plan: result,
        objectif: objectif.trim(),
        deadline: deadline?.toISOString().slice(0, 10),
        niveau,
        coach_style: coachStyle,
      })
      setResult(res.data)
      setIterationInput('')
      if (res.data.jalons?.length > 0) setJalonsOuverts({ 0: true })
      afficherNotification(t('goal.plan_refined', { instr: instr.length > 40 ? instr.slice(0, 40) + '…' : instr }))
    } catch {
      afficherNotification("Erreur lors de l'affinement", 'error')
    }
    setIterating(false)
  }

  const afficherNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }

  const coachStyle = (() => {
    try { return localStorage.getItem('getshift_coach_style') || 'bienveillant' } catch { return 'bienveillant' }
  })()

  const decomposer = async () => {
    if (!objectif.trim()) { setErreur(t('goal.err_no_objective')); return }
    if (!deadline) { setErreur("Choisis une deadline."); return }
    setErreur('')
    setLoading(true)
    setResult(null)
    setImported(false)
    try {
      const res = await axios.post(`${API}/ia/goal-reverse`, {
        user_id: user.id,
        objectif: objectif.trim(),
        deadline: deadline.toISOString().slice(0, 10),
        niveau,
        coach_style: coachStyle,
      })
      setResult(res.data)
      if (res.data.jalons?.length > 0) {
        setJalonsOuverts({ 0: true })
      }
    } catch (e) {
      setErreur(t('goal.err_ia'))
    }
    setLoading(false)
  }

  const importer = async () => {
    if (!result) return
    setImporting(true)
    const toutesLesTaches = result.jalons.flatMap(j =>
      j.taches.map(t => ({
        titre: `[${j.titre}] ${t.titre}`,
        priorite: t.priorite,
        deadline: t.deadline,
      }))
    )
    try {
      const res = await axios.post(`${API}/ia/goal-reverse/importer`, {
        user_id: user.id,
        taches: toutesLesTaches,
        objectif_titre: objectif.trim(),
        objectif_deadline: deadline.toISOString().slice(0, 10),
        objectif_niveau: niveau,
        objectif_plan: {
          duree_semaines: result.duree_semaines,
          score_faisabilite: result.score_faisabilite,
          conseil_global: result.conseil_global,
          risques: result.risques || [],
          jalons: result.jalons || [],
        },
        coach_style: coachStyle,
      })
      setImported(true)
      afficherNotification(`✅ ${res.data.message}`)
    } catch {
      afficherNotification("Erreur lors de l'import", 'error')
    }
    setImporting(false)
  }

  const toggleJalon = (i) => {
    setJalonsOuverts(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const totalTaches = result?.jalons?.reduce((acc, j) => acc + j.taches.length, 0) || 0
  const niveauActif = NIVEAUX.find(n => n.id === niveau)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "var(--font-ui)", overflowX: 'hidden' }}>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000, background: 'var(--surface-1)', border: `1px solid ${notification.type === 'error' ? '#e05c5c50' : 'var(--border-subtle)'}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR (shared component) ── */}
      <AppSidebar
        T={T} user={user}
        niveau={userNiveau} points={userPoints} streak={userStreak}
        niveauActuel={userNiveauActuel} pctNiveau={userPctNiveau}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile} />

      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      {/* Main */}
<main style={{
  marginLeft: isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0),
  transition: 'margin-left 0.3s ease',
  flex: 1,
  padding: isMobile ? '16px' : '40px',
  paddingTop: isMobile ? '70px' : '40px',
  paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT + 16 : '40px',
  minWidth: 0,
  maxWidth: 900,
  margin: isMobile ? '0 auto' : `0 auto 0 ${sidebarOpen ? SIDEBAR_W : 0}px`
}}>
 
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: isMobile ? 22 : 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, marginBottom: 8 }}>
            <div style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: isMobile ? 11 : 14, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px var(--ember-soft)`, flexShrink: 0 }}>
              <Flag size={isMobile ? 16 : 20} color={'var(--bg-base)'} strokeWidth={2.5} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: isMobile ? 19 : 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.15 }}>Goal Reverse</h1>
              <p style={{ fontSize: isMobile ? 11.5 : 13, color: 'var(--text-secondary)', margin: 0, marginTop: 3, lineHeight: 1.4 }}>{isMobile ? "Ton objectif → plan à rebours" : "Définis ton objectif final, l'IA construit le chemin à rebours"}</p>
            </div>
          </div>
        </motion.div>

        {/* Templates inspirants */}
        {templates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Lightbulb size={14} color="var(--ember)" strokeWidth={2.3} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1 }}>{t('goal.templates_inspire')}</span>
              </div>
              {!isMobile && (
                <motion.button
                  onClick={() => setShowTemplatesModal(true)}
                  whileHover={{ x: 2 }}
                  style={{ fontSize: 11, color: 'var(--ember)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                  Voir tous <ArrowRight size={11} />
                </motion.button>
              )}
            </div>
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6,
              scrollbarWidth: 'none', WebkitScrollbar: { display: 'none' },
            }} className="templates-scroll">
              <style>{`.templates-scroll::-webkit-scrollbar{display:none;}`}</style>
              {templates.slice(0, isMobile ? 8 : 6).map((tpl, i) => (
                <motion.button
                  key={tpl.id}
                  onClick={() => appliquerTemplate(tpl)}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
                  whileHover={{ y: -3, borderColor: tpl.couleur }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flexShrink: 0, width: isMobile ? 142 : 160, padding: isMobile ? '11px 12px' : '12px 14px',
                    background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
                    borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: isMobile ? 20 : 22 }}>{tpl.emoji}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                      background: `${tpl.couleur}18`, color: tpl.couleur, letterSpacing: 0.5,
                    }}>{tpl.duree_mois}M</span>
                  </div>
                  <div style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                    {tpl.titre}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {tpl.description}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Formulaire */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: isMobile ? 16 : 20, padding: isMobile ? 18 : 28, marginBottom: isMobile ? 22 : 28 }}>

          {/* Objectif */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>{t('goal.objective_label')}</label>
            <textarea
              data-guide="goal-input"
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              placeholder="Ex: Lancer mon SaaS GetShift avec 100 utilisateurs payants..."
              style={{ width: '100%', padding: '12px 16px', background: 'var(--surface-2)', border: `1px solid ${erreur && !objectif.trim() ? '#e05c5c' : 'var(--border-subtle)'}`, borderRadius: 12, color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'none', minHeight: 80, boxSizing: 'border-box', lineHeight: 1.6, fontFamily: "var(--font-ui)" }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); decomposer() } }}
            />
          </div>

          {/* Deadline + Niveau */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Deadline */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>{t('goal.deadline_label')}</label>
              <DatePicker
                selected={deadline}
                onChange={date => setDeadline(date)}
                locale="fr"
                dateFormat="dd/MM/yyyy"
                minDate={new Date()}
                placeholderText={t('goal.date_placeholder')}
                customInput={
                  <input style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: `1px solid ${erreur && !deadline ? '#e05c5c' : 'var(--border-subtle)'}`, borderRadius: 12, color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }} />
                }
              />
            </div>

            {/* Niveau */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>{t('goal.ambition_label')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {NIVEAUX.map(n => (
                  <motion.button key={n.id}
                    onClick={() => setNiveau(n.id)}
                    style={{ flex: 1, padding: '9px 4px', background: niveau === n.id ? `${n.color}20` : 'var(--surface-2)', border: `1.5px solid ${niveau === n.id ? n.color : 'var(--border-subtle)'}`, borderRadius: 10, color: niveau === n.id ? n.color : 'var(--text-secondary)', fontSize: 11, fontWeight: niveau === n.id ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <span style={{ fontSize: 16 }}>{n.emoji}</span>
                    {n.label}
                  </motion.button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0 0', textAlign: 'center' }}>{niveauActif.desc}</p>
            </div>
          </div>

          {erreur && <p style={{ fontSize: 12, color: '#e05c5c', marginBottom: 12 }}>{erreur}</p>}

          {/* Bouton */}
          <motion.button
            data-guide="goal-decompose"
            onClick={decomposer}
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? 'var(--surface-2)' : 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 12, color: loading ? 'var(--text-secondary)' : 'var(--bg-base)', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : `0 4px 20px var(--ember-soft)` }}
            whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}>
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTop: '2px solid var(--ember)' }} />
                {t('goal.btn_analyze')}
              </>
            ) : (
              <><Sparkles size={16} /> {t('goal.btn_decompose')}</>
            )}
          </motion.button>
        </motion.div>

        {/* Résultat */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Résumé */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 18 : 24 }}>
                {[
                  { label: t('goal.stat_weeks'), val: result.duree_semaines, icon: Calendar, color: 'var(--ember)' },
                  { label: t('goal.stat_milestones'), val: result.jalons?.length, icon: Flag, color: 'var(--ember)' },
                  { label: t('goal.stat_tasks'), val: totalTaches, icon: CheckCircle2, color: '#4caf82' },
                  { label: t('goal.stat_feasibility'), val: `${result.score_faisabilite}%`, icon: Target, color: result.score_faisabilite >= 70 ? '#4caf82' : result.score_faisabilite >= 40 ? '#e08a3c' : '#e05c5c' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: isMobile ? 12 : 14, padding: isMobile ? '11px 12px' : '14px 16px' }}>
                      <Icon size={isMobile ? 13 : 15} color={s.color} strokeWidth={1.8} style={{ marginBottom: isMobile ? 5 : 8 }} />
                      <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.val}</div>
                      <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Conseil du coach */}
              {result.conseil_global && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  style={{ background: 'var(--ember-soft)', border: `1px solid var(--ember-soft)`, borderRadius: isMobile ? 12 : 14, padding: isMobile ? '12px 14px' : '14px 18px', marginBottom: isMobile ? 12 : 16, display: 'flex', gap: isMobile ? 10 : 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: isMobile ? 16 : 18, flexShrink: 0, marginTop: -1 }}>{result._coach?.emoji || '✨'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {result._coach?.nom && (
                      <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'var(--ember)', letterSpacing: 0.6, marginBottom: 4 }}>
                        CONSEIL DE {result._coach.nom.toUpperCase()}
                      </div>
                    )}
                    <p style={{ fontSize: isMobile ? 12.5 : 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{result.conseil_global}</p>
                  </div>
                </motion.div>
              )}

              {/* Risques identifiés */}
              {result.risques && result.risques.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                  style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)', borderRadius: isMobile ? 12 : 14, padding: isMobile ? '12px 14px' : '14px 18px', marginBottom: isMobile ? 16 : 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <AlertTriangle size={isMobile ? 13 : 15} color="#e05c5c" strokeWidth={2} />
                    <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: '#e05c5c', letterSpacing: 0.8 }}>{t('goal.risks_title')}</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {result.risques.map((r, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: isMobile ? 12.5 : 13, color: 'var(--text-primary)', lineHeight: 1.55, padding: '4px 0' }}>
                        <span style={{ color: '#e05c5c', flexShrink: 0 }}>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Gantt mini — chronologie visuelle */}
              {result.jalons && result.jalons.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  style={{ marginBottom: isMobile ? 18 : 24, padding: isMobile ? '14px 14px' : '16px 18px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: isMobile ? 12 : 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 12 : 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Calendar size={13} color="var(--ember)" strokeWidth={2.2} />
                      <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1 }}>CHRONOLOGIE</span>
                    </div>
                    <span style={{ fontSize: isMobile ? 9.5 : 10, color: 'var(--text-secondary)' }}>
                      {result.duree_semaines || result.jalons.length} sem. · {result.jalons.length} jalons
                    </span>
                  </div>
                  {/* Barres jalons */}
                  <div style={{ display: 'flex', gap: isMobile ? 2 : 3, height: isMobile ? 36 : 32, alignItems: 'stretch' }}>
                    {result.jalons.map((j, i) => {
                      const c = DIFFICULTE_COLOR[j.difficulte] || 'var(--ember)'
                      const isOpen = jalonsOuverts[i]
                      return (
                        <motion.button
                          key={i}
                          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
                          transition={{ delay: 0.35 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                          onClick={() => toggleJalon(i)}
                          title={`S${j.semaine} — ${j.titre}`}
                          whileHover={{ y: -2 }}
                          style={{
                            flex: 1, minWidth: 0, height: '100%',
                            background: `linear-gradient(135deg, ${c}, ${c}bb)`,
                            border: 'none', borderRadius: 6, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: isMobile ? 11 : 10, fontWeight: 800, color: '#fff', letterSpacing: 0.3,
                            boxShadow: isOpen ? `0 0 0 2px var(--bg-base), 0 0 0 3px ${c}, 0 4px 14px ${c}50` : `0 2px 6px ${c}30`,
                            transformOrigin: 'left center', position: 'relative',
                            padding: 0,
                          }}>
                          S{j.semaine}
                        </motion.button>
                      )
                    })}
                  </div>
                  {/* Légende */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: isMobile ? 8 : 10, flexWrap: 'wrap' }}>
                      {[['faible', t('goal.difficulty_low')], ['moyenne', t('goal.difficulty_medium')], ['élevée', t('goal.difficulty_high')]].map(([k, lbl]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: DIFFICULTE_COLOR[k] }} />
                          <span style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>{lbl}</span>
                        </div>
                      ))}
                    </div>
                    {!isMobile && (
                      <span style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {t('goal.milestone_detail')}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Timeline jalons */}
              <div style={{ marginBottom: isMobile ? 18 : 24 }}>
                <p style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 1.2, marginBottom: isMobile ? 12 : 16 }}>PLAN D'ACTION</p>
                {result.jalons?.map((jalon, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ marginBottom: isMobile ? 8 : 10, position: 'relative' }}>
                    {/* Ligne verticale */}
                    {i < result.jalons.length - 1 && (
                      <div style={{ position: 'absolute', left: isMobile ? 16 : 19, top: isMobile ? 44 : 50, width: 2, height: 'calc(100% - 8px)', background: 'var(--border-subtle)', zIndex: 0 }} />
                    )}

                    {/* Header jalon */}
                    <motion.button
                      onClick={() => toggleJalon(i)}
                      style={{ width: '100%', background: 'var(--surface-1)', border: `1px solid ${jalonsOuverts[i] ? 'var(--ember-ring)' : 'var(--border-subtle)'}`, borderRadius: isMobile ? 12 : 14, padding: isMobile ? '11px 13px' : '14px 18px', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, cursor: 'pointer', textAlign: 'left', position: 'relative', zIndex: 1 }}
                      whileHover={{ borderColor: 'var(--ember-ring)' }}>
                      {/* Numéro semaine */}
                      <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: jalonsOuverts[i] ? 'var(--ember)' : 'var(--surface-2)', border: `2px solid ${jalonsOuverts[i] ? 'var(--ember)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        <span style={{ fontSize: isMobile ? 10.5 : 12, fontWeight: 800, color: jalonsOuverts[i] ? 'var(--bg-base)' : 'var(--text-secondary)' }}>S{jalon.semaine}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{jalon.titre}</div>
                        <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: isMobile ? 10.5 : 11, color: 'var(--text-secondary)' }}>📅 {new Date(jalon.date_fin).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}</span>
                          <span style={{ fontSize: isMobile ? 10.5 : 11, fontWeight: 600, color: DIFFICULTE_COLOR[jalon.difficulte] || 'var(--text-secondary)' }}>● {jalon.difficulte}</span>
                          <span style={{ fontSize: isMobile ? 10.5 : 11, color: 'var(--text-secondary)' }}>{jalon.taches.length} tâche{jalon.taches.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {jalonsOuverts[i] ? <ChevronUp size={isMobile ? 14 : 16} color="var(--text-secondary)" /> : <ChevronDown size={isMobile ? 14 : 16} color="var(--text-secondary)" />}
                    </motion.button>

                    {/* Tâches du jalon */}
                    <AnimatePresence>
                      {jalonsOuverts[i] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', paddingLeft: isMobile ? 12 : 50, paddingTop: 6 }}>
                          {jalon.taches.map((tache, j) => {
                            const pColor = tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
                            return (
                              <motion.div key={j}
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.05 }}
                                style={{
                                  display: 'flex',
                                  flexDirection: isMobile ? 'column' : 'row',
                                  alignItems: isMobile ? 'stretch' : 'center',
                                  gap: isMobile ? 6 : 10,
                                  padding: isMobile ? '10px 12px' : '9px 14px',
                                  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                                  borderRadius: 10, marginBottom: 6,
                                }}>
                                {/* Titre + bullet */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: isMobile ? 12.5 : 13, color: 'var(--text-primary)', lineHeight: 1.35, wordBreak: 'break-word' }}>{tache.titre}</span>
                                </div>
                                {/* Meta info */}
                                <div style={{ display: 'flex', gap: isMobile ? 6 : 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', paddingLeft: isMobile ? 15 : 0 }}>
                                  {tache.duree_estimee && (
                                    <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <Clock size={10} />{tache.duree_estimee}min
                                    </span>
                                  )}
                                  <span style={{ fontSize: isMobile ? 9 : 10, padding: '2px 7px', borderRadius: 99, background: `${pColor}18`, color: pColor, fontWeight: 600 }}>{tache.priorite}</span>
                                  <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-secondary)' }}>{new Date(tache.deadline).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}</span>
                                </div>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Panel Iterate — affiner le plan sans regénérer */}
              {!imported && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  style={{ background: 'var(--surface-1)', border: `1px solid var(--ember-soft)`, borderRadius: isMobile ? 12 : 14, padding: isMobile ? '14px 14px' : '16px 18px', marginBottom: isMobile ? 14 : 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isMobile ? 10 : 12, flexWrap: 'wrap' }}>
                    <div style={{ width: isMobile ? 24 : 26, height: isMobile ? 24 : 26, borderRadius: 8, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wand2 size={isMobile ? 12 : 13} color="var(--ember)" strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.5 }}>AFFINER LE PLAN</span>
                    {result._iteration && !isMobile && (
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: 'auto', maxWidth: '40%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        ✨ "{result._iteration}"
                      </span>
                    )}
                  </div>
                  {result._iteration && isMobile && (
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 10, padding: '6px 10px', background: 'var(--ember-soft)', borderRadius: 8, lineHeight: 1.4 }}>
                      {t('goal.last_iteration')} "{result._iteration}"
                    </div>
                  )}
                  {/* Quick actions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {QUICK_ITERATIONS.map(q => (
                      <motion.button
                        key={q.label}
                        onClick={() => iterer(q.text)}
                        disabled={iterating}
                        whileHover={!iterating ? { scale: 1.04, borderColor: 'var(--ember)' + '60' } : {}}
                        whileTap={!iterating ? { scale: 0.96 } : {}}
                        style={{
                          padding: '6px 11px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                          borderRadius: 99, color: 'var(--text-primary)', fontSize: 11.5, fontWeight: 500,
                          cursor: iterating ? 'not-allowed' : 'pointer', opacity: iterating ? 0.5 : 1,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                        <span style={{ fontSize: 13 }}>{q.emoji}</span>
                        {q.label}
                      </motion.button>
                    ))}
                  </div>
                  {/* Free text */}
                  <div style={{ display: 'flex', gap: 6, flexDirection: isMobile ? 'column' : 'row' }}>
                    <input
                      value={iterationInput}
                      onChange={e => setIterationInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && iterationInput.trim() && !iterating) iterer(iterationInput) }}
                      placeholder="Ex: ajoute une phase de tests utilisateurs..."
                      disabled={iterating}
                      style={{
                        flex: 1, padding: '10px 14px', background: 'var(--surface-2)',
                        border: '1px solid var(--border-subtle)', borderRadius: 10,
                        color: 'var(--text-primary)', fontSize: 12.5, outline: 'none',
                        fontFamily: "var(--font-ui)",
                      }}
                    />
                    <motion.button
                      onClick={() => iterer(iterationInput)}
                      disabled={iterating || !iterationInput.trim()}
                      whileHover={!iterating && iterationInput.trim() ? { scale: 1.03 } : {}}
                      whileTap={!iterating && iterationInput.trim() ? { scale: 0.97 } : {}}
                      style={{
                        padding: '10px 16px',
                        background: iterating || !iterationInput.trim() ? 'var(--surface-2)' : 'var(--ember)',
                        border: 'none', borderRadius: 10,
                        color: iterating || !iterationInput.trim() ? 'var(--text-secondary)' : 'var(--bg-base)',
                        fontSize: 12.5, fontWeight: 700,
                        cursor: iterating || !iterationInput.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        minWidth: isMobile ? '100%' : 110,
                      }}>
                      {iterating ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTop: '2px solid var(--ember)' }} />
                          IA…
                        </>
                      ) : (
                        <><Send size={13} /> Affiner</>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Bouton import */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                {imported ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 14, color: '#4caf82', fontWeight: 600, fontSize: 14 }}>
                    <CheckCircle2 size={18} />
                    {t('goal.import_done', { n: totalTaches })}
                    <motion.button onClick={() => navigate('/dashboard')}
                      style={{ marginLeft: 12, padding: '6px 14px', background: '#4caf82', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      whileHover={{ scale: 1.03 }}>
                      Voir le dashboard <ArrowRight size={12} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button onClick={importer} disabled={importing}
                    style={{ width: '100%', padding: '14px', background: importing ? 'var(--surface-2)' : 'var(--ember)', border: 'none', borderRadius: 14, color: importing ? 'var(--text-secondary)' : 'var(--bg-base)', fontWeight: 700, fontSize: 14, cursor: importing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: importing ? 'none' : `0 4px 20px var(--ember-soft)` }}
                    whileHover={!importing ? { scale: 1.01 } : {}} whileTap={!importing ? { scale: 0.99 } : {}}>
                    {importing ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--border-subtle)', borderTop: '2px solid var(--ember)' }} />
                      Import en cours...</>
                    ) : (
                      <><Download size={16} /> {t('goal.btn_import', { n: totalTaches })}</>
                    )}
                  </motion.button>
                )}
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Templates Modal — overlay full-page */}
      <AnimatePresence>
        {showTemplatesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTemplatesModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 1000 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 20,
                padding: isMobile ? 18 : 28,
                width: isMobile ? 'calc(100vw - 24px)' : 'min(880px, 92vw)',
                maxHeight: '88vh', overflowY: 'auto',
                zIndex: 1001,
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={18} color={'var(--bg-base)'} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>Templates inspirants</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('goal.templates_click')}</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setShowTemplatesModal(false)}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </motion.button>
              </div>

              {/* Grid templates */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {templates.map((tpl, i) => (
                  <motion.button
                    key={tpl.id}
                    onClick={() => appliquerTemplate(tpl)}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -4, borderColor: tpl.couleur, boxShadow: `0 8px 24px ${tpl.couleur}25` }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14,
                      padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden',
                    }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${tpl.couleur}15, transparent 70%)` }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
                      <span style={{ fontSize: 32 }}>{tpl.emoji}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${tpl.couleur}18`, color: tpl.couleur, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        {tpl.categorie}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 4 }}>
                        {tpl.titre}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {tpl.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Calendar size={10} /> {tpl.duree_mois} mois
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Zap size={10} /> {tpl.niveau}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}
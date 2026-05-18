import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import {
  ArrowLeft, Award, Palette, ExternalLink, LogOut, User,
  Zap, Bell, Shield, ChevronRight, Check, Flame, Star,
  Settings as SettingsIcon, Sprout, Cpu, Trophy, Medal, Crown,
  Calendar, Sun, Moon, Lock, Sparkles
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile from '../components/BottomNavMobile'
import MobileBackButton from '../components/MobileBackButton'
import OutilsIntegrations from './OutilsIntegrations'

const API = 'https://getshift-backend.onrender.com'

const BADGE_ICONS = {
  'first_task': Sprout,
  'five_tasks': Flame,
  'ten_tasks': Zap,
  'fifty_tasks': Cpu,
  'century': Trophy,
  'pts_100': Medal,
  'pts_500': Medal,
  'pts_1000': Medal,
  'pts_5000': Crown,
  'streak_3': Flame,
  'streak_7': Calendar,
  'streak_30': Star,
  'early_bird': Sun,
  'night_owl': Moon,
  'speedster': Zap,
}

// Tier system (rarity) — colors fixed across themes for a sense of prestige
const TIER_STYLES = {
  common: {
    label: 'Commun',
    color: '#a78f6f',
    bg: 'rgba(167, 143, 111, 0.10)',
    border: 'rgba(167, 143, 111, 0.35)',
    glow: 'rgba(167, 143, 111, 0.25)',
  },
  rare: {
    label: 'Rare',
    color: '#5fb4d6',
    bg: 'rgba(95, 180, 214, 0.12)',
    border: 'rgba(95, 180, 214, 0.40)',
    glow: 'rgba(95, 180, 214, 0.30)',
  },
  epic: {
    label: 'Épique',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.14)',
    border: 'rgba(167, 139, 250, 0.45)',
    glow: 'rgba(167, 139, 250, 0.35)',
  },
  legendary: {
    label: 'Légendaire',
    color: '#f5b942',
    bg: 'rgba(245, 185, 66, 0.16)',
    border: 'rgba(245, 185, 66, 0.55)',
    glow: 'rgba(245, 185, 66, 0.45)',
  },
}

const BADGE_CATEGORIES = {
  performance: { label: 'Performance', icon: Zap,      color: '#4caf82' },
  points:      { label: 'Points',      icon: Trophy,   color: '#e08a3c' },
  streak:      { label: 'Streak',      icon: Flame,    color: '#e74c3c' },
  'spécial':   { label: 'Spécial',     icon: Sparkles, color: '#a78bfa' },
}

const niveaux = [
  { niveau: 1, label: 'Débutant',  min: 0 },
  { niveau: 2, label: 'Apprenti',  min: 100 },
  { niveau: 3, label: 'Confirmé',  min: 250 },
  { niveau: 4, label: 'Expert',    min: 500 },
  { niveau: 5, label: 'Maître',    min: 1000 },
]

const BADGES_CONFIG = [
  { id: 'first_task',  nom: 'Premier pas',      description: 'Première tâche terminée',        categorie: 'performance', tier: 'common'    },
  { id: 'five_tasks',  nom: 'En rythme',         description: '5 tâches terminées',            categorie: 'performance', tier: 'common'    },
  { id: 'ten_tasks',   nom: 'Productif',         description: '10 tâches terminées',           categorie: 'performance', tier: 'rare'      },
  { id: 'fifty_tasks', nom: 'Machine',           description: '50 tâches terminées',           categorie: 'performance', tier: 'epic'      },
  { id: 'century',     nom: 'Centurion',         description: '100 tâches terminées',          categorie: 'performance', tier: 'legendary' },
  { id: 'pts_100',     nom: 'Débutant',          description: '100 points gagnés',             categorie: 'points',      tier: 'common'    },
  { id: 'pts_500',     nom: 'Confirmé',          description: '500 points gagnés',             categorie: 'points',      tier: 'rare'      },
  { id: 'pts_1000',    nom: 'Expert',            description: '1000 points gagnés',            categorie: 'points',      tier: 'epic'      },
  { id: 'pts_5000',    nom: 'Maître',            description: '5000 points gagnés',            categorie: 'points',      tier: 'legendary' },
  { id: 'streak_3',    nom: '3 jours de suite',  description: 'Actif 3 jours consécutifs',    categorie: 'streak',      tier: 'common'    },
  { id: 'streak_7',    nom: 'Semaine parfaite',  description: 'Actif 7 jours consécutifs',    categorie: 'streak',      tier: 'rare'      },
  { id: 'streak_30',   nom: 'Mois de feu',       description: 'Actif 30 jours consécutifs',   categorie: 'streak',      tier: 'legendary' },
  { id: 'early_bird',  nom: 'Lève-tôt',          description: 'Tâche terminée avant 8h',      categorie: 'spécial',     tier: 'rare'      },
  { id: 'night_owl',   nom: 'Noctambule',        description: 'Tâche terminée après 23h',     categorie: 'spécial',     tier: 'rare'      },
  { id: 'speedster',   nom: 'Fulgurant',         description: '5 tâches terminées en 1 jour', categorie: 'spécial',     tier: 'epic'      },
]

const SECTIONS = [
  { id: 'profil',       label: 'Profil & Niveau',  icon: User },
  { id: 'badges',       label: 'Badges',            icon: Award },
  { id: 'theme',        label: 'Apparence',         icon: Palette },
  { id: 'integrations', label: 'Intégrations',      icon: ExternalLink },
  { id: 'notifications',label: 'Notifications',     icon: Bell },
  { id: 'compte',       label: 'Compte',            icon: Shield },
]

export default function Settings() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const T = themes[theme]

  const [activeSection, setActiveSection] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
    return ['profil', 'badges', 'theme', 'integrations', 'notifications', 'compte'].includes(hash) ? hash : 'profil'
  })
  const [points, setPoints] = useState(0)
  const [niveau, setNiveau] = useState(1)
  const [streak, setStreak] = useState(0)
  const [badgesObtenus, setBadgesObtenus] = useState([])
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackSaving, setSlackSaving] = useState(false)
  const [slackSaved, setSlackSaved] = useState(false)
  const [notification, setNotification] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('notif_prefs')
      return saved ? JSON.parse(saved) : {
        'Rappels de deadline': true,
        'Nouvelles tâches bloquées': true,
        'Tomorrow Builder (19h)': true,
        'Résumé hebdomadaire': false,
      }
    } catch {
      return {
        'Rappels de deadline': true,
        'Nouvelles tâches bloquées': true,
        'Tomorrow Builder (19h)': true,
        'Résumé hebdomadaire': false,
      }
    }
  })

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerProfil()
    chargerBadges()
    chargerSlack()
  }, [])

  const chargerProfil = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}`)
      setPoints(res.data.points || 0)
      setNiveau(res.data.niveau || 1)
      const t = res.data.theme || 'dark'
      setTheme(t)
      localStorage.setItem('theme', t)
    } catch {}
  }

  const chargerBadges = async () => {
    try {
      const res = await axios.get(`${API}/users/${user.id}/badges`)
      setBadgesObtenus(res.data.badges.filter(b => b.obtenu))
      setStreak(res.data.streak || 0)
    } catch {}
  }

  const chargerSlack = async () => {
    try {
      const res = await axios.get(`${API}/integrations/slack?user_id=${user.id}`)
      if (res.data.webhook_url) setSlackWebhook(res.data.webhook_url)
    } catch {}
  }

  const changerTheme = async (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    try { await axios.put(`${API}/users/${user.id}/theme`, { theme: newTheme }) } catch {}
    afficherNotification('Thème mis à jour')
  }

  const sauvegarderSlack = async () => {
    if (!slackWebhook.trim()) return
    setSlackSaving(true)
    try {
      await axios.post(`${API}/integrations/slack`, { user_id: user.id, webhook_url: slackWebhook })
      setSlackSaved(true)
      afficherNotification('Webhook Slack sauvegardé')
      setTimeout(() => setSlackSaved(false), 3000)
    } catch { afficherNotification('Erreur lors de la sauvegarde', 'error') }
    setSlackSaving(false)
  }

  const afficherNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const toggleNotifPref = (label) => {
    setNotifPrefs(prev => {
      const updated = { ...prev, [label]: !prev[label] }
      localStorage.setItem('notif_prefs', JSON.stringify(updated))
      return updated
    })
  }

  const niveauActuel = niveaux.find(n => n.niveau === niveau) || niveaux[0]
  const niveauSuivant = niveaux.find(n => n.niveau === niveau + 1)
  const pctNiveau = niveauSuivant
    ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100)
    : 100

  // ─── Rendu section active ─────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {

      // ── PROFIL ──
      case 'profil': return (
        <motion.div key="profil" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Profil & Niveau</SectionTitle>

          {/* Carte profil */}
          <div style={{ background: `linear-gradient(135deg, ${T.accent}18, ${T.accent2 ? T.accent2 + '10' : T.accent + '08'})`, border: `1px solid ${T.accent}30`, borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: T.bg, flexShrink: 0 }}>
                {user?.nom?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>{user?.nom}</h2>
                <p style={{ fontSize: 13, color: T.text2, margin: 0, marginTop: 3 }}>{user?.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 600 }}>
                    Niveau {niveau} — {niveauActuel.label}
                  </span>
                  {streak > 0 && (
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'rgba(224,138,60,0.15)', color: '#e08a3c', fontWeight: 600 }}>
                      🔥 {streak} jour{streak > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* XP Bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text2, marginBottom: 8 }}>
                <span>{points} pts</span>
                <span>{niveauSuivant ? `${niveauSuivant.min - points} pts avant Niveau ${niveauSuivant.niveau}` : 'Niveau max atteint'}</span>
              </div>
              <div style={{ height: 8, background: `${T.accent}18`, borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctNiveau}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99 }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Points totaux', val: points, color: T.accent },
              { label: 'Badges obtenus', val: `${badgesObtenus.length}/${BADGES_CONFIG.length}`, color: '#e08a3c' },
              { label: 'Streak actuel', val: `${streak}j`, color: '#4caf82' },
            ].map(s => (
              <div key={s.label} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Lien vers profil complet */}
          <motion.button
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 18px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, color: T.text, cursor: 'pointer', fontSize: 14 }}
            whileHover={{ borderColor: T.accent }}>
            <span style={{ fontWeight: 500 }}>Voir mon profil complet</span>
            <ChevronRight size={16} color={T.text2} />
          </motion.button>
        </motion.div>
      )

      // ── BADGES ──
      case 'badges': {
        const pctTotal = Math.round(badgesObtenus.length / BADGES_CONFIG.length * 100)
        const prochainBadge = BADGES_CONFIG.find(b => !badgesObtenus.find(ob => ob.id === b.id))
        const ProchainIcon = prochainBadge ? BADGE_ICONS[prochainBadge.id] : null
        const prochainTier = prochainBadge ? TIER_STYLES[prochainBadge.tier] : null
        return (
        <motion.div key="badges" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Badges & Récompenses</SectionTitle>

          {/* Résumé global */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: `linear-gradient(135deg, ${T.accent}12, ${T.accent2 ? T.accent2 + '08' : T.accent + '06'})`, border: `1px solid ${T.accent}25`, borderRadius: 16, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: T.accent, letterSpacing: '-1px' }}>{badgesObtenus.length}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text2 }}>/ {BADGES_CONFIG.length}</div>
              </div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>badges débloqués</div>
              <div style={{ height: 5, background: `${T.accent}15`, borderRadius: 99, overflow: 'hidden', marginTop: 12 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctTotal}%` }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(231,76,60,0.10), rgba(224,138,60,0.06))', border: '1px solid rgba(231,76,60,0.22)', borderRadius: 16, padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={24} color="#e74c3c" strokeWidth={2} fill="#e74c3c" fillOpacity={0.15} />
                <div style={{ fontSize: 36, fontWeight: 800, color: '#e74c3c', letterSpacing: '-1px' }}>{streak}</div>
              </div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>jour{streak > 1 ? 's' : ''} de streak</div>
              <div style={{ fontSize: 10, color: T.text2, marginTop: 4, opacity: 0.7 }}>{streak === 0 ? 'lance ta première journée 🎯' : streak < 7 ? `${7 - streak}j avant Semaine parfaite` : streak < 30 ? `${30 - streak}j avant Mois de feu` : 'streak légendaire 🔥'}</div>
            </div>
          </div>

          {/* Prochain badge — motivation */}
          {prochainBadge && ProchainIcon && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                background: `linear-gradient(90deg, ${prochainTier.bg}, transparent)`,
                border: `1px solid ${prochainTier.border}`,
                borderRadius: 16, marginBottom: 28, position: 'relative', overflow: 'hidden'
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: prochainTier.bg, border: `1px solid ${prochainTier.border}`, position: 'relative'
              }}>
                <ProchainIcon size={20} color={prochainTier.color} strokeWidth={2} />
                <Lock size={10} color={T.bg} strokeWidth={3} style={{ position: 'absolute', bottom: -3, right: -3, background: prochainTier.color, borderRadius: '50%', padding: 3 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: prochainTier.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Prochain badge · {prochainTier.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{prochainBadge.nom}</div>
                <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>{prochainBadge.description}</div>
              </div>
            </motion.div>
          )}

          {/* Badges par catégorie */}
          {['performance', 'points', 'streak', 'spécial'].map((cat, catIdx) => {
            const catBadges = BADGES_CONFIG.filter(b => b.categorie === cat)
            const catUnlocked = catBadges.filter(b => badgesObtenus.find(ob => ob.id === b.id)).length
            const catPct = Math.round(catUnlocked / catBadges.length * 100)
            const catMeta = BADGE_CATEGORIES[cat]
            const CatIcon = catMeta.icon
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${catMeta.color}18`, border: `1px solid ${catMeta.color}30`, flexShrink: 0
                  }}>
                    <CatIcon size={16} color={catMeta.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '-0.2px' }}>{catMeta.label}</div>
                      <div style={{ fontSize: 11, color: T.text2, fontWeight: 500 }}>{catUnlocked}/{catBadges.length}</div>
                    </div>
                    <div style={{ height: 3, background: `${catMeta.color}12`, borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${catPct}%` }}
                        transition={{ duration: 0.9, delay: 0.1 * catIdx, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', background: catMeta.color, borderRadius: 99 }} />
                    </div>
                  </div>
                </div>

                {/* Badges grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  {catBadges.map((b, idx) => {
                    const obtenu = badgesObtenus.find(ob => ob.id === b.id)
                    const IconComponent = BADGE_ICONS[b.id]
                    const tier = TIER_STYLES[b.tier]
                    return (
                      <motion.div key={b.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * idx + 0.1 * catIdx, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={obtenu ? { y: -3, boxShadow: `0 8px 28px ${tier.glow}` } : { y: -1 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14,
                          background: obtenu
                            ? `linear-gradient(135deg, ${tier.bg}, ${T.bg2})`
                            : T.bg2,
                          border: obtenu ? `1px solid ${tier.border}` : `1.5px dashed ${T.border}`,
                          boxShadow: obtenu ? `0 0 18px ${tier.glow}` : 'none',
                          transition: 'box-shadow 0.25s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: obtenu ? 'default' : 'help'
                        }}>
                        {/* Tier shine — top right corner subtle gradient */}
                        {obtenu && (
                          <div style={{
                            position: 'absolute', top: 0, right: 0, width: 70, height: 70,
                            background: `radial-gradient(circle at top right, ${tier.glow}, transparent 70%)`,
                            pointerEvents: 'none'
                          }} />
                        )}

                        {/* Icon container */}
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          background: obtenu ? tier.bg : `${T.text2}10`,
                          border: obtenu ? `1px solid ${tier.border}` : `1px solid ${T.border}`,
                          position: 'relative'
                        }}>
                          {IconComponent && <IconComponent size={22} color={obtenu ? tier.color : T.text2} strokeWidth={2} style={{ opacity: obtenu ? 1 : 0.45 }} />}
                          {!obtenu && (
                            <div style={{
                              position: 'absolute', bottom: -4, right: -4,
                              width: 18, height: 18, borderRadius: '50%',
                              background: T.bg2, border: `1px solid ${T.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Lock size={9} color={T.text2} strokeWidth={2.5} />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: obtenu ? 700 : 500, color: obtenu ? T.text : T.text2, letterSpacing: '-0.1px' }}>{b.nom}</div>
                            {obtenu && (
                              <span style={{
                                fontSize: 8, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 99,
                                background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`
                              }}>{tier.label}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: T.text2, opacity: obtenu ? 1 : 0.65, lineHeight: 1.4 }}>{b.description}</div>
                        </div>

                        {/* Status indicator */}
                        {obtenu
                          ? <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${tier.color}, ${tier.color}dd)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              boxShadow: `0 0 12px ${tier.glow}`,
                              position: 'relative', zIndex: 1
                            }}>
                              <Check size={13} color="white" strokeWidth={2.8} />
                            </div>
                          : null
                        }
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </motion.div>
        )
      }

      // ── THÈME ──
      case 'theme': return (
        <motion.div key="theme" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Apparence</SectionTitle>
          <p style={{ fontSize: 14, color: T.text2, marginBottom: 24, lineHeight: 1.6 }}>
            Personnalise l'apparence de GetShift. Le thème est synchronisé sur tous tes appareils.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(themes).map(([key, t]) => (
              <motion.button key={key}
                onClick={() => changerTheme(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: theme === key ? `${T.accent}10` : T.bg2, border: `2px solid ${theme === key ? T.accent : T.border}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                whileHover={{ borderColor: T.accent }}>
                {/* Preview */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg2 }} />
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accent }} />
                  {t.accent2 && <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accent2 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: theme === key ? 700 : 500, color: T.text }}>{t.name}</div>
                </div>
                {theme === key && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={14} color={T.bg} strokeWidth={2.5} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )

      // ── INTÉGRATIONS ──
      case 'integrations': return (
        <motion.div key="integrations" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Intégrations</SectionTitle>

          {/* Toutes les intégrations OAuth — connect / disconnect centralisé */}
          <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '20px', marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Connexions OAuth</div>
              <p style={{ fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.5 }}>
                Connecte tes outils pour que l'IA puisse lire tes emails, pages Notion, docs Drive et événements Calendar.
              </p>
            </div>
            <OutilsIntegrations T={T} userId={user.id} />
          </div>

        </motion.div>
      )

      // ── NOTIFICATIONS ──
      case 'notifications': return (
        <motion.div key="notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Notifications</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Rappels de deadline',       desc: 'Notifiez-moi 24h avant chaque deadline' },
              { label: 'Nouvelles tâches bloquées', desc: 'Alerte quand une tâche devient bloquée' },
              { label: 'Tomorrow Builder (19h)',    desc: "Génération automatique du planning du lendemain" },
              { label: 'Résumé hebdomadaire',       desc: 'Rapport de productivité chaque lundi matin' },
            ].map((item) => {
              const active = notifPrefs[item.label] ?? true
              return (
                <motion.div key={item.label}
                  onClick={() => toggleNotifPref(item.label)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, cursor: 'pointer' }}
                  whileHover={{ background: T.bg3 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: T.text2, marginTop: 3 }}>{item.desc}</div>
                  </div>
                  <motion.div
                    style={{ width: 44, height: 24, borderRadius: 99, background: active ? T.accent : T.bg3, border: `1px solid ${active ? T.accent : T.border}`, position: 'relative', flexShrink: 0 }}
                    animate={{ borderColor: active ? T.accent : T.border }}
                    transition={{ duration: 0.2 }}>
                    <motion.div
                      style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: active ? 22 : 2, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                      animate={{ left: active ? 22 : 2 }}
                      transition={{ duration: 0.2 }} />
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
          <p style={{ fontSize: 12, color: T.text2, marginTop: 16, lineHeight: 1.6 }}>
            Les préférences de notifications seront sauvegardées automatiquement.
          </p>
        </motion.div>
      )

      // ── COMPTE ──
      case 'compte': return (
        <motion.div key="compte" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Compte & Sécurité</SectionTitle>

          {/* Infos compte */}
          <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text2, letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase', fontSize: 11 }}>INFORMATIONS DU COMPTE</h3>
            {[
              { label: 'Nom', val: user?.nom },
              { label: 'Email', val: user?.email },
              { label: 'Plan', val: 'Gratuit' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.text2 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{item.val}</span>
              </div>
            ))}
          </div>

          {/* Upgrade */}
          <div style={{ background: `linear-gradient(135deg, ${T.accent}15, ${T.accent2 ? T.accent2 + '08' : T.accent + '08'})`, border: `1px solid ${T.accent}30`, borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Star size={20} color={T.accent} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>Passer à Pro</h3>
            </div>
            <p style={{ fontSize: 13, color: T.text2, marginBottom: 16, lineHeight: 1.6 }}>Débloquez les requêtes IA illimitées, la collaboration avancée et les rapports détaillés.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>4,99€</div>
                <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>/ mois · Pro</div>
              </div>
              <div style={{ flex: 1, background: `${T.accent}12`, border: `1px solid ${T.accent}30`, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.accent }}>19,99€</div>
                <div style={{ fontSize: 11, color: T.accent, marginTop: 2 }}>/ mois · Entreprise</div>
              </div>
            </div>
          </div>

          {/* Déconnexion */}
          <AnimatePresence>
            {!showLogoutConfirm ? (
              <motion.button
                onClick={() => setShowLogoutConfirm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 18px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 14, color: '#e05c5c', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                whileHover={{ background: 'rgba(224,92,92,0.1)' }}>
                <LogOut size={18} strokeWidth={1.8} />Se déconnecter
              </motion.button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 14, padding: '18px 20px' }}>
                <p style={{ fontSize: 14, color: T.text, fontWeight: 500, marginBottom: 14 }}>Confirmer la déconnexion ?</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button onClick={() => setShowLogoutConfirm(false)}
                    style={{ flex: 1, padding: '10px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    whileTap={{ scale: 0.97 }}>Annuler</motion.button>
                  <motion.button onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                    style={{ flex: 1, padding: '10px', background: '#e05c5c', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    whileTap={{ scale: 0.97 }}>Se déconnecter</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )

      default: return null
    }
  }

  // ─── Helper composant titre section ──
  function SectionTitle({ children }) {
    return <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 20, letterSpacing: '-0.3px' }}>{children}</h2>
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, background: T.bg2, border: `1px solid ${notification.type === 'error' ? '#e05c5c50' : T.border}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: 360 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── SIDEBAR SETTINGS ── */}
        {!isMobile && (
          <aside style={{ width: 260, background: T.bg2, borderRight: `1px solid ${T.border}`, padding: '24px 16px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
            {/* Back */}
            <motion.button
              onClick={() => navigate('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13, marginBottom: 28, borderRadius: 8 }}
              whileHover={{ color: T.accent }}>
              <ArrowLeft size={16} /> Retour au Dashboard
            </motion.button>

            {/* Titre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon size={16} color={T.accent} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Paramètres</span>
            </div>

            {/* Navigation sections */}
            <nav style={{ flex: 1 }}>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <motion.button key={id}
                  onClick={() => setActiveSection(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, background: activeSection === id ? `${T.accent}15` : 'transparent', border: 'none', color: activeSection === id ? T.accent : T.text2, fontSize: 13, fontWeight: activeSection === id ? 600 : 400, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}
                  whileHover={{ color: T.accent, x: 2 }}>
                  <Icon size={16} strokeWidth={activeSection === id ? 2.5 : 1.8} />
                  {label}
                  {activeSection === id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                </motion.button>
              ))}
            </nav>

            {/* Version */}
            <p style={{ fontSize: 11, color: T.text2, padding: '0 8px', opacity: 0.5 }}>GetShift v2.0 · Sprint 6</p>
          </aside>
        )}

        {/* ── CONTENU PRINCIPAL ── */}
        <main style={{ flex: 1, padding: isMobile ? '16px' : '40px 48px', maxWidth: 720, minWidth: 0 }}>

          {/* Header mobile */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <motion.button onClick={() => navigate('/dashboard')}
                style={{ width: 36, height: 36, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                whileHover={{ color: T.accent, borderColor: T.accent }}>
                <ArrowLeft size={16} />
              </motion.button>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h1>
            </div>
          )}

          {/* Tabs mobile */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <motion.button key={id}
                  onClick={() => setActiveSection(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: activeSection === id ? `${T.accent}15` : T.bg2, border: `1px solid ${activeSection === id ? T.accent : T.border}`, borderRadius: 99, color: activeSection === id ? T.accent : T.text2, fontSize: 12, fontWeight: activeSection === id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  whileTap={{ scale: 0.97 }}>
                  <Icon size={13} strokeWidth={1.8} />{label}
                </motion.button>
              ))}
            </div>
          )}

          {/* Section active */}
          <AnimatePresence mode="wait">
            {renderSection()}
          </AnimatePresence>
        </main>
      </div>
      {isMobile && <MobileBackButton T={T} label="Dashboard" />}
      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}
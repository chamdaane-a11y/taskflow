import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import { applyTheme } from '../useTheme'
import {
  ArrowLeft, Award, Palette, ExternalLink, LogOut, User,
  Bell, Shield, ChevronRight, Check, Star, Lock,
  Settings as SettingsIcon, Flame,
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import MobileBackButton from '../components/MobileBackButton'
import OutilsIntegrations from './OutilsIntegrations'
import {
  BADGES_CONFIG, BADGE_ICONS, BADGE_CATEGORIES, TIER_STYLES, CATEGORIES_ORDER,
  niveaux, getProchainBadge,
} from '../data/badges'

const API = 'https://getshift-backend.onrender.com'

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
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const T = themes[theme]

  const VALID_SECTIONS = ['profil', 'badges', 'theme', 'integrations', 'notifications', 'compte']
  const [activeSection, setActiveSection] = useState(() => {
    const fromState = location.state?.section
    if (fromState && VALID_SECTIONS.includes(fromState)) return fromState
    return 'profil'
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
  // ── PWA install ────────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null)
  const [appInstalled, setAppInstalled]   = useState(
    window.matchMedia('(display-mode: standalone)').matches
  )
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', h)
    window.addEventListener('appinstalled', () => { setAppInstalled(true); setInstallPrompt(null) })
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const installerApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setAppInstalled(true)
    setInstallPrompt(null)
  }

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
      const t = res.data.theme || 'light'
      setTheme(t)
      applyTheme(t)
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
    applyTheme(newTheme)
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
          <div style={{ background: `linear-gradient(135deg, var(--ember-soft), ${'var(--ember-hover)' ? 'var(--ember-soft)' : 'var(--ember)' + '08'})`, border: `1px solid var(--ember-soft)`, borderRadius: 20, padding: '24px 28px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'var(--bg-base)', flexShrink: 0 }}>
                {user?.nom?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{user?.nom}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginTop: 3 }}>{user?.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)', fontWeight: 600 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span>{points} pts</span>
                <span>{niveauSuivant ? `${niveauSuivant.min - points} pts avant Niveau ${niveauSuivant.niveau}` : 'Niveau max atteint'}</span>
              </div>
              <div style={{ height: 8, background: 'var(--ember-soft)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctNiveau}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: `linear-gradient(90deg, var(--ember), var(--ember-hover))`, borderRadius: 99 }}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Points totaux', val: points, color: 'var(--ember)' },
              { label: 'Badges obtenus', val: `${badgesObtenus.length}/${BADGES_CONFIG.length}`, color: '#e08a3c' },
              { label: 'Streak actuel', val: `${streak}j`, color: '#4caf82' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Lien vers profil complet */}
          <motion.button
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 18px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}
            whileHover={{ borderColor: 'var(--ember)' }}>
            <span style={{ fontWeight: 500 }}>Voir mon profil complet</span>
            <ChevronRight size={16} color="var(--text-secondary)" />
          </motion.button>
        </motion.div>
      )

      // ── BADGES ──
      case 'badges': {
        const pctTotal = Math.round(badgesObtenus.length / BADGES_CONFIG.length * 100)
        const prochainBadge = getProchainBadge(badgesObtenus)
        const ProchainIcon = prochainBadge ? BADGE_ICONS[prochainBadge.id] : null
        const prochainTier = prochainBadge ? TIER_STYLES[prochainBadge.tier] : null
        return (
        <motion.div key="badges" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Badges & Récompenses</SectionTitle>

          {/* Résumé global */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: `linear-gradient(135deg, var(--ember-soft), ${'var(--ember-hover)' ? 'var(--ember-soft)' : 'var(--ember)' + '06'})`, border: `1px solid var(--ember-soft)`, borderRadius: 16, padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--ember)', letterSpacing: '-1px' }}>{badgesObtenus.length}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>/ {BADGES_CONFIG.length}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>badges débloqués</div>
              <div style={{ height: 5, background: 'var(--ember-soft)', borderRadius: 99, overflow: 'hidden', marginTop: 12 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctTotal}%` }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: `linear-gradient(90deg, var(--ember), var(--ember-hover))`, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(231,76,60,0.10), rgba(224,138,60,0.06))', border: '1px solid rgba(231,76,60,0.22)', borderRadius: 16, padding: '18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Flame size={24} color="#e74c3c" strokeWidth={2} fill="#e74c3c" fillOpacity={0.15} />
                <div style={{ fontSize: 36, fontWeight: 800, color: '#e74c3c', letterSpacing: '-1px' }}>{streak}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>jour{streak > 1 ? 's' : ''} de streak</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, opacity: 0.7 }}>{streak === 0 ? 'lance ta première journée 🎯' : streak < 7 ? `${7 - streak}j avant Semaine parfaite` : streak < 30 ? `${30 - streak}j avant Mois de feu` : 'streak légendaire 🔥'}</div>
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
                <Lock size={10} color={'var(--bg-base)'} strokeWidth={3} style={{ position: 'absolute', bottom: -3, right: -3, background: prochainTier.color, borderRadius: '50%', padding: 3 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: prochainTier.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Prochain badge · {prochainTier.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{prochainBadge.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{prochainBadge.description}</div>
              </div>
            </motion.div>
          )}

          {/* Badges par catégorie — 4 piliers GetShift */}
          {CATEGORIES_ORDER.map((cat, catIdx) => {
            const catBadges = BADGES_CONFIG.filter(b => b.categorie === cat)
            const catUnlocked = catBadges.filter(b => badgesObtenus.find(ob => ob.id === b.id)).length
            const catPct = Math.round(catUnlocked / catBadges.length * 100)
            const catMeta = BADGE_CATEGORIES[cat]
            const CatIcon = catMeta.icon
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                {/* Category header — pilier GetShift avec sous-titre inspirant */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${catMeta.color}18`, border: `1px solid ${catMeta.color}30`, flexShrink: 0,
                    boxShadow: `0 0 16px ${catMeta.color}25`
                  }}>
                    <CatIcon size={18} color={catMeta.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{catMeta.label}</div>
                      <div style={{ fontSize: 11, color: catMeta.color, fontWeight: 700 }}>{catUnlocked}<span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>/{catBadges.length}</span></div>
                    </div>
                    {catMeta.subtitle && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontStyle: 'italic', opacity: 0.85 }}>{catMeta.subtitle}</div>
                    )}
                    <div style={{ height: 3, background: `${catMeta.color}12`, borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${catPct}%` }}
                        transition={{ duration: 0.9, delay: 0.1 * catIdx, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', background: `linear-gradient(90deg, ${catMeta.color}, ${catMeta.color}cc)`, borderRadius: 99 }} />
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
                            ? `linear-gradient(135deg, ${tier.bg}, var(--surface-1))`
                            : 'var(--surface-1)',
                          border: obtenu ? `1px solid ${tier.border}` : '1.5px dashed var(--border-subtle)',
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
                          background: obtenu ? tier.bg : `var(--text-secondary)10`,
                          border: obtenu ? `1px solid ${tier.border}` : '1px solid var(--border-subtle)',
                          position: 'relative'
                        }}>
                          {IconComponent && <IconComponent size={22} color={obtenu ? tier.color : 'var(--text-secondary)'} strokeWidth={2} style={{ opacity: obtenu ? 1 : 0.45 }} />}
                          {!obtenu && (
                            <div style={{
                              position: 'absolute', bottom: -4, right: -4,
                              width: 18, height: 18, borderRadius: '50%',
                              background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Lock size={9} color="var(--text-secondary)" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <div style={{ fontSize: 13, fontWeight: obtenu ? 700 : 500, color: obtenu ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing: '-0.1px' }}>{b.nom}</div>
                            {obtenu && (
                              <span style={{
                                fontSize: 8, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 99,
                                background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`
                              }}>{tier.label}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: obtenu ? 1 : 0.65, lineHeight: 1.4 }}>{b.description}</div>
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
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Personnalise l'apparence de GetShift. Le thème est synchronisé sur tous tes appareils.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(themes).map(([key, t]) => (
              <motion.button key={key}
                onClick={() => changerTheme(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: theme === key ? 'var(--ember-soft)' : 'var(--surface-1)', border: `2px solid ${theme === key ? 'var(--ember)' : 'var(--border-subtle)'}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                whileHover={{ borderColor: 'var(--ember)' }}>
                {/* Preview */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg2 }} />
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accent }} />
                  {t.accent2 && <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accent2 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: theme === key ? 700 : 500, color: 'var(--text-primary)' }}>{t.name}</div>
                </div>
                {theme === key && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={14} color={'var(--bg-base)'} strokeWidth={2.5} />
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
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '20px', marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Connexions OAuth</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
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

          {/* ── Install PWA ─────────────────────────────────────────── */}
          {!appInstalled && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--ember-soft)', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>📲</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Installer GetShift
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                    Accès rapide depuis l'écran d'accueil, mode plein écran, notifications push.
                  </div>
                  {installPrompt && (
                    <button onClick={installerApp} style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--ember)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Installer l'application
                    </button>
                  )}
                  {isIOS && !installPrompt && (
                    <>
                      <button onClick={() => setShowIOSGuide(v => !v)} style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--ember)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Comment installer sur iOS
                      </button>
                      {showIOSGuide && (
                        <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8 }}>
                          1. Appuie sur <strong>⎙ Partager</strong> en bas de Safari<br />
                          2. Fais défiler et tape <strong>"Sur l'écran d'accueil"</strong><br />
                          3. Appuie sur <strong>Ajouter</strong>
                        </div>
                      )}
                    </>
                  )}
                  {!installPrompt && !isIOS && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Ouvre ce site dans Chrome pour installer l'app.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {appInstalled && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Check size={16} color="var(--ember)" />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>GetShift est installé sur cet appareil</span>
            </div>
          )}

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
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, cursor: 'pointer' }}
                  whileHover={{ background: 'var(--surface-2)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{item.desc}</div>
                  </div>
                  <motion.div
                    style={{ width: 44, height: 24, borderRadius: 99, background: active ? 'var(--ember)' : 'var(--surface-2)', border: `1px solid ${active ? 'var(--ember)' : 'var(--border-subtle)'}`, position: 'relative', flexShrink: 0 }}
                    animate={{ borderColor: active ? 'var(--ember)' : 'var(--border-subtle)' }}
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
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 16, lineHeight: 1.6 }}>
            Les préférences de notifications seront sauvegardées automatiquement.
          </p>
        </motion.div>
      )

      // ── COMPTE ──
      case 'compte': return (
        <motion.div key="compte" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Compte & Sécurité</SectionTitle>

          {/* Infos compte */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase', fontSize: 11 }}>INFORMATIONS DU COMPTE</h3>
            {[
              { label: 'Nom', val: user?.nom },
              { label: 'Email', val: user?.email },
              { label: 'Plan', val: 'Gratuit' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.val}</span>
              </div>
            ))}
          </div>

          {/* Upgrade */}
          <div style={{ background: `linear-gradient(135deg, var(--ember-soft), ${'var(--ember-hover)' ? 'var(--ember-soft)' : 'var(--ember)' + '08'})`, border: `1px solid var(--ember-soft)`, borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Star size={20} color="var(--ember)" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Passer à Pro</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>Débloquez les requêtes IA illimitées, la collaboration avancée et les rapports détaillés.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>4,99€</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>/ mois · Pro</div>
              </div>
              <div style={{ flex: 1, background: 'var(--ember-soft)', border: `1px solid var(--ember-soft)`, borderRadius: 12, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ember)' }}>19,99€</div>
                <div style={{ fontSize: 11, color: 'var(--ember)', marginTop: 2 }}>/ mois · Entreprise</div>
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
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 14 }}>Confirmer la déconnexion ?</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button onClick={() => setShowLogoutConfirm(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
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
    return <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, letterSpacing: '-0.3px' }}>{children}</h2>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "var(--font-ui)", overflowX: 'hidden' }}>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, background: 'var(--surface-1)', border: `1px solid ${notification.type === 'error' ? '#e05c5c50' : 'var(--border-subtle)'}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: 360 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── SIDEBAR SETTINGS ── */}
        {!isMobile && (
          <aside style={{ width: 260, background: 'var(--surface-1)', borderRight: '1px solid var(--border-subtle)', padding: '24px 16px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
            {/* Back */}
            <motion.button
              onClick={() => navigate('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 28, borderRadius: 8 }}
              whileHover={{ color: 'var(--ember)' }}>
              <ArrowLeft size={16} /> Retour au Dashboard
            </motion.button>

            {/* Titre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon size={16} color="var(--ember)" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Paramètres</span>
            </div>

            {/* Navigation sections */}
            <nav style={{ flex: 1 }}>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <motion.button key={id}
                  onClick={() => setActiveSection(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, background: activeSection === id ? 'var(--ember-soft)' : 'transparent', border: 'none', color: activeSection === id ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 13, fontWeight: activeSection === id ? 600 : 400, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}
                  whileHover={{ color: 'var(--ember)', x: 2 }}>
                  <Icon size={16} strokeWidth={activeSection === id ? 2.5 : 1.8} />
                  {label}
                  {activeSection === id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                </motion.button>
              ))}
            </nav>

            {/* Version */}
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '0 8px', opacity: 0.5 }}>GetShift v2.0 · Sprint 6</p>
          </aside>
        )}

        {/* ── CONTENU PRINCIPAL ── */}
        <main style={{ flex: 1, padding: isMobile ? '16px' : '40px 48px', maxWidth: 720, minWidth: 0, paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT + 16 : undefined }}>

          {/* Header mobile */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <motion.button onClick={() => navigate('/dashboard')}
                style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                whileHover={{ color: 'var(--ember)', borderColor: 'var(--ember)' }}>
                <ArrowLeft size={16} />
              </motion.button>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Paramètres</h1>
            </div>
          )}

          {/* Tabs mobile */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <motion.button key={id}
                  onClick={() => setActiveSection(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: activeSection === id ? 'var(--ember-soft)' : 'var(--surface-1)', border: `1px solid ${activeSection === id ? 'var(--ember)' : 'var(--border-subtle)'}`, borderRadius: 99, color: activeSection === id ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 12, fontWeight: activeSection === id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
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
      {isMobile && <BottomNavMobile />}
    </div>
  )
}
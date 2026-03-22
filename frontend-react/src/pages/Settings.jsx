import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import {
  ArrowLeft, Award, Palette, ExternalLink, LogOut, User,
  Zap, Bell, Shield, ChevronRight, Check, Flame, Star,
  Settings as SettingsIcon
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'

const API = 'https://getshift-backend.onrender.com'

const niveaux = [
  { niveau: 1, label: 'Débutant',  min: 0 },
  { niveau: 2, label: 'Apprenti',  min: 100 },
  { niveau: 3, label: 'Confirmé',  min: 250 },
  { niveau: 4, label: 'Expert',    min: 500 },
  { niveau: 5, label: 'Maître',    min: 1000 },
]

const BADGES_CONFIG = [
  { id: 'first_task',  nom: 'Premier pas',      icon: '🌱', description: 'Première tâche terminée',        categorie: 'performance' },
  { id: 'five_tasks',  nom: 'En rythme',         icon: '🔥', description: '5 tâches terminées',            categorie: 'performance' },
  { id: 'ten_tasks',   nom: 'Productif',         icon: '⚡', description: '10 tâches terminées',           categorie: 'performance' },
  { id: 'fifty_tasks', nom: 'Machine',           icon: '🤖', description: '50 tâches terminées',           categorie: 'performance' },
  { id: 'century',     nom: 'Centurion',         icon: '💯', description: '100 tâches terminées',          categorie: 'performance' },
  { id: 'pts_100',     nom: 'Débutant',          icon: '🥉', description: '100 points gagnés',             categorie: 'points' },
  { id: 'pts_500',     nom: 'Confirmé',          icon: '🥈', description: '500 points gagnés',             categorie: 'points' },
  { id: 'pts_1000',    nom: 'Expert',            icon: '🥇', description: '1000 points gagnés',            categorie: 'points' },
  { id: 'pts_5000',    nom: 'Maître',            icon: '👑', description: '5000 points gagnés',            categorie: 'points' },
  { id: 'streak_3',    nom: '3 jours de suite',  icon: '🔥', description: 'Actif 3 jours consécutifs',    categorie: 'streak' },
  { id: 'streak_7',    nom: 'Semaine parfaite',  icon: '📅', description: 'Actif 7 jours consécutifs',    categorie: 'streak' },
  { id: 'streak_30',   nom: 'Mois de feu',       icon: '🌟', description: 'Actif 30 jours consécutifs',   categorie: 'streak' },
  { id: 'early_bird',  nom: 'Lève-tôt',          icon: '🌅', description: 'Tâche terminée avant 8h',      categorie: 'spécial' },
  { id: 'night_owl',   nom: 'Noctambule',        icon: '🦉', description: 'Tâche terminée après 23h',     categorie: 'spécial' },
  { id: 'speedster',   nom: 'Fulgurant',         icon: '⚡', description: '5 tâches terminées en 1 jour', categorie: 'spécial' },
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

  const [activeSection, setActiveSection] = useState('profil')
  const [points, setPoints] = useState(0)
  const [niveau, setNiveau] = useState(1)
  const [streak, setStreak] = useState(0)
  const [badgesObtenus, setBadgesObtenus] = useState([])
  const [slackWebhook, setSlackWebhook] = useState('')
  const [slackSaving, setSlackSaving] = useState(false)
  const [slackSaved, setSlackSaved] = useState(false)
  const [notification, setNotification] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
      case 'badges': return (
        <motion.div key="badges" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Badges & Récompenses</SectionTitle>

          {/* Résumé */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 16, padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.accent }}>{badgesObtenus.length}</div>
              <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>badges obtenus sur {BADGES_CONFIG.length}</div>
              <div style={{ height: 4, background: `${T.accent}15`, borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${Math.round(badgesObtenus.length / BADGES_CONFIG.length * 100)}%`, background: T.accent, borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ background: 'rgba(224,138,60,0.08)', border: '1px solid rgba(224,138,60,0.2)', borderRadius: 16, padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#e08a3c' }}>{streak}</div>
              <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>jours de streak consécutifs</div>
              <div style={{ fontSize: 20, marginTop: 8 }}>🔥</div>
            </div>
          </div>

          {/* Badges par catégorie */}
          {['performance', 'points', 'streak', 'spécial'].map(cat => (
            <div key={cat} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{cat}</span>
                <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 99, background: `${T.accent}15`, color: T.accent, fontWeight: 700 }}>
                  {BADGES_CONFIG.filter(b => b.categorie === cat && badgesObtenus.find(ob => ob.id === b.id)).length}/{BADGES_CONFIG.filter(b => b.categorie === cat).length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                {BADGES_CONFIG.filter(b => b.categorie === cat).map(b => {
                  const obtenu = badgesObtenus.find(ob => ob.id === b.id)
                  return (
                    <motion.div key={b.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: obtenu ? `${T.accent}08` : T.bg2, border: `1px solid ${obtenu ? T.accent + '30' : T.border}`, opacity: obtenu ? 1 : 0.4, transition: 'all 0.2s' }}
                      whileHover={obtenu ? { scale: 1.01 } : {}}>
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{b.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: obtenu ? 700 : 500, color: T.text }}>{b.nom}</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{b.description}</div>
                      </div>
                      {obtenu
                        ? <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#4caf82', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={13} color="white" strokeWidth={2.5} />
                          </div>
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px dashed ${T.border}`, flexShrink: 0 }} />
                      }
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )

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

          {/* Slack */}
          <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#4A154B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, color: 'white', fontWeight: 800 }}>S</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Slack</div>
                <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>Recevez vos notifications de tâches dans Slack</div>
              </div>
              {slackWebhook && (
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(76,175,130,0.15)', color: '#4caf82', fontWeight: 700 }}>Connecté</span>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, display: 'block', marginBottom: 8 }}>URL du Webhook</label>
              <input
                style={{ width: '100%', padding: '11px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhook}
                onChange={e => setSlackWebhook(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sauvegarderSlack()}
              />
            </div>
            <motion.button
              style={{ width: '100%', padding: '12px', background: slackSaved ? '#4caf82' : `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', borderRadius: 12, color: slackSaved ? 'white' : T.bg, fontSize: 14, fontWeight: 700, cursor: slackSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={sauvegarderSlack}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              {slackSaving ? 'Sauvegarde...' : slackSaved ? <><Check size={16} /> Webhook sauvegardé !</> : 'Sauvegarder le webhook'}
            </motion.button>
            <p style={{ fontSize: 12, color: T.text2, marginTop: 12, lineHeight: 1.6 }}>
              Créez un Incoming Webhook sur{' '}
              <span style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => window.open('https://api.slack.com/messaging/webhooks', '_blank')}>
                api.slack.com
              </span>
              {' '}puis collez l'URL ci-dessus.
            </p>
          </div>

          {/* Google Calendar */}
          <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, color: 'white', fontWeight: 800 }}>G</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Google Calendar</div>
                <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>Exportez vos tâches vers votre agenda</div>
              </div>
            </div>
            <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 13, color: T.text2, margin: 0, lineHeight: 1.6 }}>
                Sur chaque tâche ayant une deadline, utilisez le bouton <strong style={{ color: T.text }}>Calendar</strong> pour l'exporter directement dans Google Calendar.
              </p>
            </div>
          </div>
        </motion.div>
      )

      // ── NOTIFICATIONS ──
      case 'notifications': return (
        <motion.div key="notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>Notifications</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Rappels de deadline',       desc: 'Notifiez-moi 24h avant chaque deadline',    active: true },
              { label: 'Nouvelles tâches bloquées', desc: 'Alerte quand une tâche devient bloquée',    active: true },
              { label: 'Tomorrow Builder (19h)',    desc: "Génération automatique du planning du lendemain", active: true },
              { label: 'Résumé hebdomadaire',       desc: 'Rapport de productivité chaque lundi matin', active: false },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: T.text2, marginTop: 3 }}>{item.desc}</div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 99, background: item.active ? T.accent : T.bg3, border: `1px solid ${item.active ? T.accent : T.border}`, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: item.active ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            ))}
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
    </div>
  )
}
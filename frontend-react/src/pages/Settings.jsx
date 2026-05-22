import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import { applyTheme } from '../useTheme'
import {
  ArrowLeft, Palette, ExternalLink, LogOut,
  Bell, Shield, ChevronRight, Check, Eye, EyeOff, Download,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import MobileBackButton from '../components/MobileBackButton'
import OutilsIntegrations from './OutilsIntegrations'

const API = 'https://getshift-backend.onrender.com'

const SECTIONS = [
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

  const VALID_SECTIONS = ['theme', 'integrations', 'notifications', 'compte']
  const [activeSection, setActiveSection] = useState(() => {
    const fromState = location.state?.section
    if (fromState && VALID_SECTIONS.includes(fromState)) return fromState
    return 'theme'
  })
  const [pwForm, setPwForm] = useState({ ancien: '', nouveau: '', confirm: '' })
  const [pwVisible, setPwVisible] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
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
    chargerSlack()
  }, [])

  const chargerProfil = async () => {
    try {
      const [resUser, resNotif] = await Promise.allSettled([
        axios.get(`${API}/users/${user.id}`),
        axios.get(`${API}/users/${user.id}/notif-prefs`),
      ])
      if (resUser.status === 'fulfilled') {
        const t = resUser.value.data.theme || 'light'
        setTheme(t)
        applyTheme(t)
      }
      if (resNotif.status === 'fulfilled' && resNotif.value.data?.prefs) {
        const prefs = resNotif.value.data.prefs
        setNotifPrefs(prefs)
        localStorage.setItem('notif_prefs', JSON.stringify(prefs))
      }
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
      axios.put(`${API}/users/${user.id}/notif-prefs`, { prefs: updated }).catch(() => {})
      return updated
    })
  }

  const changerMotDePasse = async () => {
    const { ancien, nouveau, confirm } = pwForm
    if (!ancien || !nouveau || !confirm) { afficherNotification('Tous les champs sont requis', 'error'); return }
    if (nouveau !== confirm) { afficherNotification('Les mots de passe ne correspondent pas', 'error'); return }
    if (nouveau.length < 8) { afficherNotification('8 caractères minimum', 'error'); return }
    setPwLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/password`, { ancien_password: ancien, nouveau_password: nouveau })
      afficherNotification('Mot de passe modifié')
      setPwForm({ ancien: '', nouveau: '', confirm: '' })
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || 'Erreur', 'error')
    }
    setPwLoading(false)
  }

  const exporterDonnees = async () => {
    setExportLoading(true)
    try {
      const res = await axios.get(`${API}/users/${user.id}/export`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `getshift-export-${user.id}-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      afficherNotification('Export téléchargé')
    } catch { afficherNotification('Erreur lors de l\'export', 'error') }
    setExportLoading(false)
  }

  // ─── Rendu section active ─────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {

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
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase', margin: '0 0 16px' }}>INFORMATIONS DU COMPTE</p>
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

          {/* Changer mot de passe */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 16px', textTransform: 'uppercase' }}>CHANGER DE MOT DE PASSE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'ancien', placeholder: 'Mot de passe actuel' },
                { key: 'nouveau', placeholder: 'Nouveau mot de passe (8 car. min.)' },
                { key: 'confirm', placeholder: 'Confirmer le nouveau mot de passe' },
              ].map(f => (
                <div key={f.key} style={{ position: 'relative' }}>
                  <input
                    type={pwVisible ? 'text' : 'password'}
                    placeholder={f.placeholder}
                    value={pwForm[f.key]}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 40px 10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                  {f.key === 'ancien' && (
                    <button onClick={() => setPwVisible(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}>
                      {pwVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </div>
              ))}
              <motion.button
                onClick={changerMotDePasse}
                disabled={pwLoading}
                style={{ padding: '10px 20px', background: 'var(--ember)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: pwLoading ? 'wait' : 'pointer', alignSelf: 'flex-start', opacity: pwLoading ? 0.7 : 1 }}
                whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.97 }}>
                {pwLoading ? 'Enregistrement…' : 'Mettre à jour'}
              </motion.button>
            </div>
          </div>

          {/* Export données */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 8px', textTransform: 'uppercase' }}>EXPORTER MES DONNÉES</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Télécharge l'intégralité de tes données GetShift (tâches, objectifs, planning, badges, intégrations) au format JSON.
            </p>
            <motion.button
              onClick={exporterDonnees}
              disabled={exportLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: exportLoading ? 'wait' : 'pointer', opacity: exportLoading ? 0.7 : 1 }}
              whileHover={{ borderColor: 'var(--ember)' }} whileTap={{ scale: 0.97 }}>
              <Download size={14} strokeWidth={2} />
              {exportLoading ? 'Génération…' : 'Télécharger (JSON)'}
            </motion.button>
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
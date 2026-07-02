import { useState, useEffect } from 'react'
import i18n from '../i18n'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTranslation, Trans } from 'react-i18next'
import { themes } from '../themes'
import { applyTheme } from '../useTheme'
import {
  ArrowLeft, Palette, ExternalLink, LogOut,
  Bell, Shield, ChevronRight, Check, Eye, EyeOff, Download,
  Settings as SettingsIcon, Monitor, Smartphone, Globe, Trash2,
  Lock, Unlock, Mail, RefreshCw, Laptop, Sparkles,
} from 'lucide-react'

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
  { code: 'pt', label: 'Português',flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
]
import { useMediaQuery } from '../useMediaQuery'
import { appTopInset } from '../utils/engagement'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import OutilsIntegrations from './OutilsIntegrations'
import PushNotifToggle from '../components/PushNotifToggle'
import { resetFirstDayGuide } from '../utils/firstDayGuide'

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
  const isTablet = useMediaQuery('(max-width: 1100px)')
  const isTiny   = useMediaQuery('(max-width: 400px)')
  const { t, i18n } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user'))
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const T = themes[theme]
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

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
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' })
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailPending, setEmailPending] = useState(null)
  const [isGoogleAccount, setIsGoogleAccount] = useState(false)
  const [deleteForm, setDeleteForm] = useState({ confirmation: '', password: '' })
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  // ── Sessions ──────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [deletingSession, setDeletingSession] = useState(null)

  // ── Rapport hebdo : jour de réception (0=Lun … 6=Dim) ─────────────
  const [weeklyReportDay, setWeeklyReportDay] = useState(4) // défaut vendredi
  const [weeklyReportSaving, setWeeklyReportSaving] = useState(false)
  const [weeklyTestSending, setWeeklyTestSending] = useState(false)

  // ── 2FA email OTP ─────────────────────────────────────────────────
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  // null | 'setup-password' | 'setup-verify' | 'disable'
  const [twoFaStep, setTwoFaStep] = useState(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaPassword, setTwoFaPassword] = useState('')
  const [twoFaEmailMasked, setTwoFaEmailMasked] = useState('')
  const [twoFaLoading, setTwoFaLoading] = useState(false)

  // Nettoie les états en mémoire dès que le wizard se ferme
  const closeTwoFaWizard = () => {
    setTwoFaStep(null)
    setTwoFaCode('')
    setTwoFaPassword('')
    setTwoFaEmailMasked('')
  }
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

  useEffect(() => {
    if (activeSection === 'compte' && sessions.length === 0 && !sessionsLoading) {
      chargerSessions()
    }
  }, [activeSection])

  const chargerProfil = async () => {
    try {
      const [resUser, resNotif, res2fa, resWeekly] = await Promise.allSettled([
        axios.get(`${API}/users/${user.id}`),
        axios.get(`${API}/users/${user.id}/notif-prefs`),
        axios.get(`${API}/users/${user.id}/2fa/status`),
        axios.get(`${API}/users/${user.id}/weekly-report-day`),
      ])
      if (resUser.status === 'fulfilled') {
        const d = resUser.value.data
        const t = d.theme || 'light'
        setTheme(t)
        applyTheme(t)
        setIsGoogleAccount(!!d.google_id)
        if (d.email_change_new) setEmailPending(d.email_change_new)
      }
      if (resNotif.status === 'fulfilled' && resNotif.value.data?.prefs) {
        const prefs = resNotif.value.data.prefs
        setNotifPrefs(prefs)
        localStorage.setItem('notif_prefs', JSON.stringify(prefs))
      }
      if (res2fa.status === 'fulfilled') {
        setTwoFaEnabled(res2fa.value.data?.enabled || false)
      }
      if (resWeekly.status === 'fulfilled' && typeof resWeekly.value.data?.day === 'number') {
        setWeeklyReportDay(resWeekly.value.data.day)
      }
    } catch {}
  }

  const chargerSessions = async () => {
    setSessionsLoading(true)
    try {
      const res = await axios.get(`${API}/users/${user.id}/sessions`, { withCredentials: true })
      setSessions(res.data.sessions || [])
    } catch {}
    setSessionsLoading(false)
  }

  const revoquerSession = async (sessionId) => {
    setDeletingSession(sessionId)
    try {
      await axios.delete(`${API}/users/${user.id}/sessions/${sessionId}`, { withCredentials: true })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      afficherNotification(t('settings.toast_session_revoked'))
    } catch { afficherNotification(t('common.error'), 'error') }
    setDeletingSession(null)
  }

  const revoquerAutresSessions = async () => {
    try {
      await axios.delete(`${API}/users/${user.id}/sessions/others`, { withCredentials: true })
      setSessions(prev => prev.filter(s => s.is_current))
      afficherNotification(t('settings.toast_others_revoked'))
    } catch { afficherNotification(t('common.error'), 'error') }
  }

  // Étape 1 : password gate → backend génère le secret + QR
  const demarrer2faSetup = async (passwordOverride = null) => {
    const pwd = passwordOverride !== null ? passwordOverride : twoFaPassword
    if (!pwd) { afficherNotification(t('settings.toast_pw_required'), 'error'); return }
    setTwoFaLoading(true)
    try {
      const res = await axios.post(`${API}/users/${user.id}/2fa/setup`, { password: pwd })
      setTwoFaEmailMasked(res.data.email_masked || '')
      setTwoFaPassword('')
      setTwoFaStep('setup-verify')
      setTwoFaCode('')
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
    }
    setTwoFaLoading(false)
  }

  // Étape 2 : code email → activation
  const verifier2fa = async () => {
    if (twoFaCode.length !== 6) { afficherNotification(t('settings.toast_code6_required'), 'error'); return }
    setTwoFaLoading(true)
    try {
      await axios.post(`${API}/users/${user.id}/2fa/verify`, { code: twoFaCode })
      setTwoFaEnabled(true)
      closeTwoFaWizard()
      afficherNotification(t('settings.toast_2fa_enabled'))
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('settings.toast_code_invalid'), 'error')
    }
    setTwoFaLoading(false)
  }

  // Désactivation : password requis pour tous (sécurité contre voleur de téléphone)
  const desactiver2fa = async () => {
    if (!twoFaPassword) { afficherNotification(t('settings.toast_pw_required'), 'error'); return }
    setTwoFaLoading(true)
    try {
      await axios.post(`${API}/users/${user.id}/2fa/disable`, { password: twoFaPassword })
      setTwoFaEnabled(false)
      closeTwoFaWizard()
      afficherNotification(t('settings.toast_2fa_disabled'))
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
    }
    setTwoFaLoading(false)
  }

  const sauvegarderJourRapport = async (day) => {
    const prev = weeklyReportDay
    setWeeklyReportDay(day)
    setWeeklyReportSaving(true)
    try {
      await axios.put(`${API}/users/${user.id}/weekly-report-day`, { day })
      afficherNotification(t('settings.toast_report_day'))
    } catch (e) {
      setWeeklyReportDay(prev)
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
    }
    setWeeklyReportSaving(false)
  }

  const envoyerRapportTest = async () => {
    setWeeklyTestSending(true)
    try {
      await axios.post(`${API}/users/${user.id}/email/resume-hebdo-test`)
      afficherNotification(t('settings.toast_report_sent'))
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
    }
    setWeeklyTestSending(false)
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
    afficherNotification(t('settings.toast_theme_updated'))
  }

  const sauvegarderSlack = async () => {
    if (!slackWebhook.trim()) return
    setSlackSaving(true)
    try {
      await axios.post(`${API}/integrations/slack`, { user_id: user.id, webhook_url: slackWebhook })
      setSlackSaved(true)
      afficherNotification(t('settings.toast_slack_saved'))
      setTimeout(() => setSlackSaved(false), 3000)
    } catch { afficherNotification(t('settings.toast_save_error'), 'error') }
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
    if (!ancien || !nouveau || !confirm) { afficherNotification(t('settings.toast_all_required'), 'error'); return }
    if (nouveau !== confirm) { afficherNotification(t('settings.toast_pw_mismatch'), 'error'); return }
    if (nouveau.length < 8) { afficherNotification(t('settings.toast_pw_min8'), 'error'); return }
    setPwLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/password`, { ancien_password: ancien, nouveau_password: nouveau })
      afficherNotification(t('settings.toast_pw_changed'))
      setPwForm({ ancien: '', nouveau: '', confirm: '' })
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
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
      afficherNotification(t('settings.toast_export_done'))
    } catch { afficherNotification(t('settings.toast_export_error'), 'error') }
    setExportLoading(false)
  }

  const changerEmail = async () => {
    const { new_email, password } = emailForm
    if (!new_email || !password) { afficherNotification(t('settings.toast_email_pw_required'), 'error'); return }
    setEmailLoading(true)
    try {
      await axios.post(`${API}/users/${user.id}/email-change/request`, { new_email, password })
      afficherNotification(t('settings.toast_email_sent'))
      setEmailPending(new_email)
      setEmailForm({ new_email: '', password: '' })
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
    }
    setEmailLoading(false)
  }

  const annulerChangementEmail = async () => {
    try {
      await axios.post(`${API}/users/${user.id}/email-change/cancel`)
      setEmailPending(null)
      afficherNotification(t('settings.toast_email_cancelled'))
    } catch { afficherNotification(t('common.error'), 'error') }
  }

  const supprimerCompte = async () => {
    const { confirmation, password } = deleteForm
    setDeleteLoading(true)
    try {
      await axios.delete(`${API}/users/${user.id}`, { data: { confirmation, password } })
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
      localStorage.removeItem('theme')
      localStorage.removeItem('notif_prefs')
      navigate('/')
    } catch (e) {
      afficherNotification(e.response?.data?.erreur || t('common.error'), 'error')
    }
    setDeleteLoading(false)
  }

  // ─── Style partagé champs texte ───────────────────────────
  const INPUT_STYLE = {
    width: '100%', padding: '10px 14px',
    background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
    borderRadius: 10, color: 'var(--text-primary)', fontSize: 16,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'var(--font-ui)',
  }

  // ─── Rendu section active ─────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {

      // ── THÈME ──
      case 'theme': return (
        <motion.div key="theme" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── INSTALL PWA — proéminent en haut de la section par défaut ── */}
          {!appInstalled && (
            <div style={{
              background: 'linear-gradient(135deg, var(--ember-soft), var(--surface-1))',
              border: '1px solid var(--ember-ring, var(--ember))',
              borderRadius: 20, padding: '22px 24px', marginBottom: 28,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, var(--ember-soft), transparent 70%)', opacity: 0.5, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-ember, 0 4px 14px rgba(184,82,28,0.25))' }}>
                  <Smartphone size={20} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {t('settings.install_title')}
                    </h3>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ember)', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring, var(--ember))', borderRadius: 99, padding: '2px 8px', letterSpacing: 0.5 }}>{t('settings.badge_new')}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.55 }}>
                    {t('settings.install_desc')}
                  </p>

                  {/* CTA principal */}
                  {installPrompt && (
                    <motion.button onClick={installerApp}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'var(--ember)', color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginBottom: 4 }}>
                      {t('settings.install_now')}
                    </motion.button>
                  )}

                  {isIOS && !installPrompt && (
                    <>
                      <motion.button onClick={() => setShowIOSGuide(v => !v)}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'var(--ember)', color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                        {showIOSGuide ? t('settings.ios_hide') : t('settings.ios_show')}
                      </motion.button>
                      {showIOSGuide && (
                        <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.85 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ember)', letterSpacing: 0.5, marginBottom: 8 }}>{t('settings.ios_safari_label')}</div>
                          <Trans i18nKey="settings.ios_step1" components={{ 1: <strong /> }} /><br/>
                          <Trans i18nKey="settings.ios_step2" components={{ 1: <strong /> }} /><br/>
                          <Trans i18nKey="settings.ios_step3" components={{ 1: <strong /> }} /><br/>
                          <Trans i18nKey="settings.ios_step4" components={{ 1: <strong /> }} />
                        </div>
                      )}
                    </>
                  )}

                  {!installPrompt && !isIOS && (
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{t('settings.android_label')}</strong> {t('settings.android_steps')}<br/>
                      <strong style={{ color: 'var(--text-primary)' }}>{t('settings.desktop_label')}</strong> {t('settings.desktop_steps')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {appInstalled && (
            <div style={{ background: 'rgba(76,175,130,0.06)', border: '1px solid rgba(76,175,130,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Check size={16} color="#4caf82" strokeWidth={2.5} />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{t('settings.installed_confirm')}</span>
            </div>
          )}

          {/* ── Langue & Région ── */}
          <SectionTitle>{t('settings.lang_region')}</SectionTitle>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            {t('settings.lang_desc')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${i18n.language.startsWith(lang.code) ? 'var(--ember)' : 'var(--border-subtle)'}`,
                  background: i18n.language.startsWith(lang.code) ? 'var(--ember-soft)' : 'var(--surface-1)',
                  fontWeight: i18n.language.startsWith(lang.code) ? 700 : 500,
                  fontSize: 14, color: 'var(--text-primary)', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {i18n.language.startsWith(lang.code) && <Check size={14} color="var(--ember)" />}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={13} /> {t('settings.timezone_detected')} <strong>{userTimezone}</strong>
          </p>

          {/* ── Apparence ── */}
          <SectionTitle>{t('settings.appearance')}</SectionTitle>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            {t('settings.appearance_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Auto (Système) */}
            <motion.button
              onClick={() => changerTheme('auto')}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: theme === 'auto' ? 'var(--ember-soft)' : 'var(--surface-1)', border: `2px solid ${theme === 'auto' ? 'var(--ember)' : 'var(--border-subtle)'}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              whileHover={{ borderColor: 'var(--ember)' }}>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0E1011 50%, #F4F1EB 50%)', border: '1px solid var(--border-subtle)' }} />
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #171A1C 50%, #FFFFFF 50%)' }} />
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #E07A3E 50%, #B8521C 50%)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: theme === 'auto' ? 700 : 500, color: 'var(--text-primary)' }}>{t('settings.theme_auto')}</span>
                  <Monitor size={13} color="var(--text-secondary)" />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('settings.theme_auto_desc')}</div>
              </div>
              {theme === 'auto' && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} color={'var(--bg-base)'} strokeWidth={2.5} />
                </div>
              )}
            </motion.button>

            {Object.entries(themes).map(([key, t]) => (
              <motion.button key={key}
                onClick={() => changerTheme(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: theme === key ? 'var(--ember-soft)' : 'var(--surface-1)', border: `2px solid ${theme === key ? 'var(--ember)' : 'var(--border-subtle)'}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                whileHover={{ borderColor: 'var(--ember)' }}>
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
          <SectionTitle>{t('settings.integrations')}</SectionTitle>

          {/* Toutes les intégrations OAuth — connect / disconnect centralisé */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '20px', marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('settings.oauth_connections')}</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {t('settings.oauth_desc')}
              </p>
            </div>
            <OutilsIntegrations T={T} userId={user.id} />
          </div>

        </motion.div>
      )

      // ── NOTIFICATIONS ──
      case 'notifications': return (
        <motion.div key="notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>{t('settings.notifications')}</SectionTitle>

          {/* Bouton maître : (ré)abonnement push de cet appareil */}
          <PushNotifToggle user={user} onToast={afficherNotification} />

          {/* Rappel install — l'install card complète est dans Apparence */}
          {!appInstalled && (
            <button onClick={() => setActiveSection('theme')}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring, var(--ember))', borderRadius: 14, marginBottom: 16, cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              <Smartphone size={18} color="var(--ember)" strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.install_push_cta')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('settings.install_push_sub')}</div>
              </div>
              <ChevronRight size={15} color="var(--text-secondary)" />
            </button>
          )}

          {/* Rapport hebdomadaire — jour configurable + test */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Mail size={16} color="var(--ember)" />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('settings.weekly_report')}</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
              {t('settings.weekly_report_desc')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
              {t('settings.days_short').split(',').map((label, idx) => {
                const fullLabels = t('settings.days_full').split(',')
                const active = weeklyReportDay === idx
                return (
                  <motion.button key={idx}
                    onClick={() => sauvegarderJourRapport(idx)}
                    disabled={weeklyReportSaving}
                    title={fullLabels[idx]}
                    style={{
                      padding: '10px 0',
                      background: active ? 'var(--ember)' : 'var(--surface-2)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'var(--ember)' : 'var(--border-subtle)'}`,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    whileTap={{ scale: 0.94 }}
                    whileHover={!active ? { borderColor: 'var(--ember)', color: 'var(--text-primary)' } : {}}>
                    {label}
                  </motion.button>
                )
              })}
            </div>
            <motion.button onClick={envoyerRapportTest} disabled={weeklyTestSending}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: 'var(--ember)', border: '1px solid var(--ember)', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: weeklyTestSending ? 0.6 : 1 }}
              whileTap={{ scale: 0.97 }}>
              {weeklyTestSending ? t('settings.sending') : t('settings.send_test_now')}
            </motion.button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'Rappels de deadline',       label: t('settings.notif_deadline'), desc: t('settings.notif_deadline_desc') },
              { id: 'Nouvelles tâches bloquées', label: t('settings.notif_blocked'),  desc: t('settings.notif_blocked_desc') },
              { id: 'Tomorrow Builder (19h)',    label: t('settings.notif_tomorrow'), desc: t('settings.notif_tomorrow_desc') },
              { id: 'Résumé hebdomadaire',       label: t('settings.notif_weekly'),   desc: t('settings.notif_weekly_desc') },
            ].map((item) => {
              const active = notifPrefs[item.id] ?? true
              return (
                <motion.div key={item.id}
                  onClick={() => toggleNotifPref(item.id)}
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
            {t('settings.prefs_synced')}
          </p>
        </motion.div>
      )

      // ── COMPTE ──
      case 'compte': return (
        <motion.div key="compte" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <SectionTitle>{t('settings.account_security')}</SectionTitle>

          {/* Infos compte */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, marginBottom: 16, textTransform: 'uppercase', margin: '0 0 16px' }}>{t('settings.account_info')}</p>
            {[
              { id: 'nom', label: t('settings.field_name'), val: user?.nom },
              { id: 'email', label: 'Email', val: user?.email },
              { id: 'plan', label: t('settings.field_plan'), val: t('settings.plan_free') },
            ].map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.val}</span>
              </div>
            ))}
          </div>

          {/* Rejouer le parcours guidé */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--ember-soft)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 8px', textTransform: 'uppercase' }}>
              {t('settings.guide_section')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.55 }}>
              {t('settings.guide_replay_desc')}
            </p>
            <motion.button
              onClick={() => {
                resetFirstDayGuide()
                setNotification({ type: 'success', msg: t('settings.guide_replay_done') })
                navigate('/dashboard')
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: 'var(--ember)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              <Sparkles size={15} strokeWidth={2} />
              {t('settings.guide_replay')}
            </motion.button>
          </div>

          {/* Changer mot de passe */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 16px', textTransform: 'uppercase' }}>{t('settings.change_password')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'ancien', placeholder: t('settings.pw_current') },
                { key: 'nouveau', placeholder: t('settings.pw_new') },
                { key: 'confirm', placeholder: t('settings.pw_confirm') },
              ].map(f => (
                <div key={f.key} style={{ position: 'relative' }}>
                  <input
                    type={pwVisible ? 'text' : 'password'}
                    placeholder={f.placeholder}
                    value={pwForm[f.key]}
                    onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ ...INPUT_STYLE, paddingRight: f.key === 'ancien' ? 40 : 14 }}
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
                {pwLoading ? t('settings.saving') : t('settings.update')}
              </motion.button>
            </div>
          </div>

          {/* Changer d'email */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 16px', textTransform: 'uppercase' }}>{t('settings.change_email')}</p>
            {isGoogleAccount ? (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {t('settings.google_email_note')}
              </p>
            ) : emailPending ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--ember-soft)', borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
                    {t('settings.email_pending_for')} <strong>{emailPending}</strong>
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  {t('settings.email_pending_note')}
                </p>
                <motion.button onClick={annulerChangementEmail}
                  style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
                  whileHover={{ borderColor: 'var(--ember)', color: 'var(--ember)' }}>
                  {t('settings.cancel_request')}
                </motion.button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="email"
                  placeholder={t('settings.email_new_placeholder')}
                  value={emailForm.new_email}
                  onChange={e => setEmailForm(p => ({ ...p, new_email: e.target.value }))}
                  style={INPUT_STYLE}
                />
                <input
                  type="password"
                  placeholder={t('settings.pw_confirm_placeholder')}
                  value={emailForm.password}
                  onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))}
                  style={INPUT_STYLE}
                />
                <motion.button onClick={changerEmail} disabled={emailLoading}
                  style={{ padding: '10px 20px', background: 'var(--ember)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: emailLoading ? 'wait' : 'pointer', alignSelf: 'flex-start', opacity: emailLoading ? 0.7 : 1 }}
                  whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.97 }}>
                  {emailLoading ? t('settings.sending') : t('settings.send_confirm_link')}
                </motion.button>
              </div>
            )}
          </div>

          {/* 2FA email OTP */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: 0, textTransform: 'uppercase' }}>{t('settings.twofa_title')}</p>
              {twoFaEnabled && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4caf82', background: 'rgba(76,175,130,0.12)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 99, padding: '3px 10px' }}>{t('settings.twofa_enabled_badge')}</span>
              )}
            </div>

            {twoFaStep === null && !twoFaEnabled && (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
                  {t('settings.twofa_intro')}
                </p>
                <motion.button
                  onClick={() => { setTwoFaStep('setup-password'); setTwoFaPassword('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--ember)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.97 }}>
                  <Lock size={14} />
                  {t('settings.twofa_enable')}
                </motion.button>
              </>
            )}

            {twoFaStep === null && twoFaEnabled && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(76,175,130,0.08)', borderRadius: 10, marginBottom: 14 }}>
                  <Lock size={14} color="#4caf82" />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t('settings.twofa_protected')}</span>
                </div>
                <motion.button
                  onClick={() => { setTwoFaStep('disable'); setTwoFaPassword('') }}
                  style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
                  whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                  {t('settings.twofa_disable')}
                </motion.button>
              </>
            )}

            {/* Étape 1 : confirmation par mot de passe */}
            {twoFaStep === 'setup-password' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
                  {t('settings.twofa_pw_gate')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="password"
                    placeholder={t('settings.pw_current')}
                    value={twoFaPassword}
                    onChange={e => setTwoFaPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && demarrer2faSetup()}
                    autoFocus
                    style={INPUT_STYLE}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button onClick={closeTwoFaWizard}
                      style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                      whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
                    <motion.button onClick={demarrer2faSetup} disabled={twoFaLoading || !twoFaPassword}
                      style={{ flex: 1, padding: '10px', background: twoFaPassword ? 'var(--ember)' : 'var(--surface-2)', border: 'none', borderRadius: 10, color: twoFaPassword ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: twoFaPassword ? 'pointer' : 'not-allowed', opacity: twoFaLoading ? 0.7 : 1, transition: 'all 0.2s' }}
                      whileTap={twoFaPassword ? { scale: 0.97 } : {}}>
                      {twoFaLoading ? t('settings.generating') : t('settings.continue')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Étape 2 : code 6 chiffres reçu par email */}
            {twoFaStep === 'setup-verify' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, marginBottom: 16 }}>
                  <Mail size={18} color="var(--ember)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {t('settings.code_sent_to')} <strong>{twoFaEmailMasked || t('settings.your_email')}</strong>. {t('settings.check_inbox_then_enter')}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
                  {t('settings.code_expires')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*"
                    placeholder={t('settings.code_placeholder')}
                    value={twoFaCode}
                    onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && verifier2fa()}
                    autoFocus
                    style={{ ...INPUT_STYLE, letterSpacing: '0.35em', fontSize: 22, textAlign: 'center', fontWeight: 600 }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button onClick={closeTwoFaWizard}
                      style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                      whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
                    <motion.button onClick={verifier2fa} disabled={twoFaLoading || twoFaCode.length !== 6}
                      style={{ flex: 1, padding: '10px', background: twoFaCode.length === 6 ? 'var(--ember)' : 'var(--surface-2)', border: 'none', borderRadius: 10, color: twoFaCode.length === 6 ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: twoFaCode.length === 6 ? 'pointer' : 'not-allowed', opacity: twoFaLoading ? 0.7 : 1, transition: 'all 0.2s' }}
                      whileTap={twoFaCode.length === 6 ? { scale: 0.97 } : {}}>
                      {twoFaLoading ? t('settings.verifying') : t('settings.activate')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Désactivation : password requis (pas le code email) — bloque accès email compromis */}
            {twoFaStep === 'disable' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.6 }}>
                  {t('settings.twofa_disable_a')} <strong>{t('settings.twofa_disable_strong')}</strong> {t('settings.twofa_disable_b')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="password"
                    placeholder={t('settings.pw_current')}
                    value={twoFaPassword}
                    onChange={e => setTwoFaPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && desactiver2fa()}
                    autoFocus
                    style={INPUT_STYLE}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button onClick={closeTwoFaWizard}
                      style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                      whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
                    <motion.button onClick={desactiver2fa} disabled={twoFaLoading || !twoFaPassword}
                      style={{ flex: 1, padding: '10px', background: twoFaPassword ? '#e05c5c' : 'var(--surface-2)', border: 'none', borderRadius: 10, color: twoFaPassword ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: twoFaPassword ? 'pointer' : 'not-allowed', opacity: twoFaLoading ? 0.7 : 1, transition: 'all 0.2s' }}
                      whileTap={twoFaPassword ? { scale: 0.97 } : {}}>
                      {twoFaLoading ? t('settings.disabling') : t('settings.twofa_disable')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sessions actives */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: 0, textTransform: 'uppercase' }}>{t('settings.active_sessions')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {sessions.filter(s => !s.is_current).length > 0 && (
                  <motion.button onClick={revoquerAutresSessions}
                    style={{ fontSize: 12, color: '#e05c5c', background: 'rgba(224,92,92,0.07)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    whileHover={{ background: 'rgba(224,92,92,0.12)' }}>
                    {t('settings.revoke_others')}
                  </motion.button>
                )}
                <motion.button onClick={chargerSessions}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  whileHover={{ color: 'var(--ember)' }}>
                  <RefreshCw size={13} />
                </motion.button>
              </div>
            </div>
            {sessionsLoading ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>{t('common.loading')}</div>
            ) : sessions.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('settings.no_sessions')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => {
                  const isHere = s.is_current
                  const lastSeen = s.last_seen ? new Date(s.last_seen).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: isHere ? 'rgba(76,175,130,0.06)' : 'var(--surface-2)', border: `1px solid ${isHere ? 'rgba(76,175,130,0.2)' : 'var(--border-subtle)'}`, borderRadius: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: isHere ? 'rgba(76,175,130,0.15)' : 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Laptop size={14} color={isHere ? '#4caf82' : 'var(--text-secondary)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.device || '—'}</span>
                          {isHere && <span style={{ fontSize: 10, fontWeight: 700, color: '#4caf82', background: 'rgba(76,175,130,0.15)', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>{t('settings.session_current')}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {s.ip} · {lastSeen}
                        </div>
                      </div>
                      {!isHere && (
                        <motion.button
                          onClick={() => revoquerSession(s.id)}
                          disabled={deletingSession === s.id}
                          style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', flexShrink: 0, opacity: deletingSession === s.id ? 0.5 : 1 }}
                          whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                          <Trash2 size={13} />
                        </motion.button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Export données */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5, margin: '0 0 8px', textTransform: 'uppercase' }}>{t('settings.export_title')}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
              {t('settings.export_desc')}
            </p>
            <motion.button
              onClick={exporterDonnees}
              disabled={exportLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: exportLoading ? 'wait' : 'pointer', opacity: exportLoading ? 0.7 : 1 }}
              whileHover={{ borderColor: 'var(--ember)' }} whileTap={{ scale: 0.97 }}>
              <Download size={14} strokeWidth={2} />
              {exportLoading ? t('settings.generating') : t('settings.export_btn')}
            </motion.button>
          </div>

          {/* Déconnexion */}
          <AnimatePresence>
            {!showLogoutConfirm ? (
              <motion.button
                onClick={() => setShowLogoutConfirm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 18px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 14, color: '#e05c5c', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                whileHover={{ background: 'rgba(224,92,92,0.1)' }}>
                <LogOut size={18} strokeWidth={1.8} />{t('settings.logout')}
              </motion.button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 14, padding: '18px 20px' }}>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 14 }}>{t('settings.logout_confirm')}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <motion.button onClick={() => setShowLogoutConfirm(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                    whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
                  <motion.button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }}
                    style={{ flex: 1, padding: '10px', background: '#e05c5c', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    whileTap={{ scale: 0.97 }}>{t('settings.logout')}</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zone danger — suppression compte */}
          <div style={{ marginTop: 32 }}>
            {!showDeleteZone ? (
              <motion.button
                onClick={() => setShowDeleteZone(true)}
                style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                whileHover={{ color: '#e05c5c' }}>
                {t('settings.delete_account_link')}
              </motion.button>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(224,92,92,0.04)', border: '1px solid rgba(224,92,92,0.25)', borderRadius: 16, padding: '20px 24px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e05c5c', margin: '0 0 4px', letterSpacing: 0.3, textTransform: 'uppercase', fontSize: 11 }}>{t('settings.danger_zone')}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
                  {t('settings.delete_warning')}
                  {!isGoogleAccount && ' ' + t('settings.delete_warning_pw')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    placeholder={t('settings.delete_confirm_placeholder')}
                    value={deleteForm.confirmation}
                    onChange={e => setDeleteForm(p => ({ ...p, confirmation: e.target.value }))}
                    style={{ ...INPUT_STYLE, borderColor: deleteForm.confirmation === t('settings.delete_confirm_word') ? '#e05c5c' : undefined }}
                  />
                  {!isGoogleAccount && (
                    <input
                      type="password"
                      placeholder={t('settings.pw_current')}
                      value={deleteForm.password}
                      onChange={e => setDeleteForm(p => ({ ...p, password: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button onClick={() => { setShowDeleteZone(false); setDeleteForm({ confirmation: '', password: '' }) }}
                      style={{ flex: 1, padding: '10px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                      whileTap={{ scale: 0.97 }}>{t('common.cancel')}</motion.button>
                    <motion.button
                      onClick={supprimerCompte}
                      disabled={deleteLoading || deleteForm.confirmation !== t('settings.delete_confirm_word')}
                      style={{ flex: 1, padding: '10px', background: deleteForm.confirmation === t('settings.delete_confirm_word') ? '#e05c5c' : 'var(--surface-2)', border: 'none', borderRadius: 10, color: deleteForm.confirmation === t('settings.delete_confirm_word') ? 'white' : 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: deleteForm.confirmation === t('settings.delete_confirm_word') ? 'pointer' : 'not-allowed', opacity: deleteLoading ? 0.7 : 1, transition: 'all 0.2s' }}
                      whileTap={deleteForm.confirmation === t('settings.delete_confirm_word') ? { scale: 0.97 } : {}}>
                      {deleteLoading ? t('settings.deleting') : t('settings.delete_forever')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
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
            initial={{ opacity: 0, y: isMobile ? 20 : -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: isMobile ? 20 : -20 }}
            style={{
              position: 'fixed', zIndex: 1000,
              ...(isMobile
                ? { bottom: BOTTOM_NAV_HEIGHT + 12, left: 16, right: 16 }
                : { top: 20, right: 20, maxWidth: 360 }
              ),
              background: 'var(--surface-1)',
              border: `1px solid ${notification.type === 'error' ? 'rgba(224,92,92,0.3)' : 'var(--border-subtle)'}`,
              borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── SIDEBAR SETTINGS ── */}
        {!isMobile && (
          <aside style={{ width: isTablet ? 200 : 260, background: 'var(--surface-1)', borderRight: '1px solid var(--border-subtle)', padding: isTablet ? '24px 10px' : '24px 16px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
            {/* Back */}
            <motion.button
              onClick={() => navigate('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 28, borderRadius: 8 }}
              whileHover={{ color: 'var(--ember)' }}>
              <ArrowLeft size={16} /> {t('settings.back_dashboard')}
            </motion.button>

            {/* Titre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SettingsIcon size={16} color="var(--ember)" strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t('nav.settings')}</span>
            </div>

            {/* Navigation sections */}
            <nav data-guide="settings-sections" style={{ flex: 1 }}>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <motion.button key={id}
                  onClick={() => setActiveSection(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, background: activeSection === id ? 'var(--ember-soft)' : 'transparent', border: 'none', color: activeSection === id ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 13, fontWeight: activeSection === id ? 600 : 400, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}
                  whileHover={{ color: 'var(--ember)', x: 2 }}>
                  <Icon size={16} strokeWidth={activeSection === id ? 2.5 : 1.8} />
                  {t('settings.section_' + id)}
                  {activeSection === id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                </motion.button>
              ))}
            </nav>

            {/* Version */}
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '0 8px', opacity: 0.5 }}>GetShift v2.0 · TIER 1–4 ✓</p>
          </aside>
        )}

        {/* ── CONTENU PRINCIPAL ── */}
        <main style={{ flex: 1, padding: isMobile ? `${appTopInset(16)} 16px 16px` : isTablet ? '24px 24px' : '40px 48px', maxWidth: 720, minWidth: 0, marginLeft: 'auto', marginRight: 'auto', paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT + 16 : undefined }}>

          {/* Header mobile */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <motion.button onClick={() => navigate('/dashboard')}
                style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                whileHover={{ color: 'var(--ember)', borderColor: 'var(--ember)' }}>
                <ArrowLeft size={16} />
              </motion.button>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('nav.settings')}</h1>
            </div>
          )}

          {/* Tabs mobile */}
          {isMobile && (
            <div data-guide="settings-tabs" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 24, paddingBottom: 2, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <motion.button key={id}
                  onClick={() => setActiveSection(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: isTiny ? 0 : 6, padding: isTiny ? '8px 12px' : '7px 14px', background: activeSection === id ? 'var(--ember-soft)' : 'var(--surface-1)', border: `1px solid ${activeSection === id ? 'var(--ember)' : 'var(--border-subtle)'}`, borderRadius: 99, color: activeSection === id ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 12, fontWeight: activeSection === id ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  whileTap={{ scale: 0.97 }}>
                  <Icon size={14} strokeWidth={activeSection === id ? 2.5 : 1.8} />
                  {!isTiny && t('settings.section_' + id)}
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
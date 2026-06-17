// ══════════════════════════════════════════════════════════════════════
// FounderConsole.jsx — Console Fondateur (réservée au fondateur)
// Onglets : Croissance / Sécurité / Système. La vraie barrière est côté
// backend (toute route /admin/* renvoie 403 si pas le fondateur) ; ici la
// garde client n'est que cosmétique (redirige si !is_founder).
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import {
  TrendingUp, Shield, Server, Users, UserPlus, Activity,
  AlertTriangle, CheckCircle2, RefreshCw, ListChecks, Bell,
  Bug, BarChart3, Zap, X, Mail, Send, MessageSquare, Star,
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { themes } from '../themes'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)
import { useMediaQuery } from '../useMediaQuery'
import { useSidebarUser } from '../components/useSidebarUser'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'

const API = 'https://getshift-backend.onrender.com'

const STATUS_COLOR = { ok: '#7A9778', warn: '#C28748', red: '#B8593F' }
const SEC_LABEL = {
  login_failed: 'Connexion échouée',
  access_denied: 'Accès refusé',
  rate_limit: 'Rate-limit déclenché',
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, minWidth: 0 }}>
        <Icon size={15} color="var(--ember)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary, var(--text-secondary))', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function FounderConsole() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { user, niveau, points, streak, niveauActuel, pctNiveau } = useSidebarUser()
  const theme = localStorage.getItem('theme') || 'light'
  const T = themes[theme]

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }
  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  const [tab, setTab] = useState('growth')
  const [overview, setOverview] = useState(null)
  const [signups, setSignups] = useState(null)
  const [timeseries, setTimeseries] = useState(null)
  const [security, setSecurity] = useState(null)
  const [system, setSystem] = useState(null)
  const [activity, setActivity] = useState(null)
  const [errors, setErrors] = useState(null)
  const [adoption, setAdoption] = useState(null)
  const [feedbacks, setFeedbacks] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [userLoading, setUserLoading] = useState(false)
  // Message aux utilisateurs (broadcast email)
  const [bcSubject, setBcSubject] = useState('')
  const [bcTitre, setBcTitre] = useState('')
  const [bcMsg, setBcMsg] = useState('')
  const [bcItems, setBcItems] = useState('')
  const [bcCtaLabel, setBcCtaLabel] = useState("J'essaie GetShift AI")
  const [bcCtaHref, setBcCtaHref] = useState('https://usegetshift.com/#/ia')
  const [bcBusy, setBcBusy] = useState(false)
  const [bcResult, setBcResult] = useState(null)
  const [bcCount, setBcCount] = useState(null)
  const [bcAudience, setBcAudience] = useState('selected')
  const [bcSelectedIds, setBcSelectedIds] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [bcMarkWelcome, setBcMarkWelcome] = useState(false)
  // Annonce push (notification)
  const [pushTitre, setPushTitre] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [pushBusy, setPushBusy] = useState(false)
  const [pushResult, setPushResult] = useState(null)

  const broadcastTarget = useCallback(() => {
    if (bcAudience === 'self') return 'self'
    if (bcAudience === 'selected') return 'selected'
    return 'all'
  }, [bcAudience])

  const broadcastUserIds = useCallback(() => (
    bcAudience === 'selected' ? bcSelectedIds : undefined
  ), [bcAudience, bcSelectedIds])

  const audienceSummary = useCallback(() => {
    if (bcAudience === 'self') return 'test (toi uniquement)'
    if (bcAudience === 'selected') return `${bcSelectedIds.length} personne(s) sélectionnée(s)`
    return 'tous les utilisateurs vérifiés'
  }, [bcAudience, bcSelectedIds.length])

  const chargerUtilisateurs = useCallback(async (q = '') => {
    setUsersLoading(true)
    try {
      const { data } = await axios.get(`${API}/admin/users/list`, {
        params: { q: q || undefined, verified_only: 1 },
      })
      setAdminUsers(data?.users || [])
    } catch {
      setAdminUsers([])
    }
    setUsersLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'message' && user?.is_founder) chargerUtilisateurs(userSearch)
  }, [tab, user, chargerUtilisateurs])

  useEffect(() => {
    if (tab !== 'message' || !user?.is_founder) return
    const t = setTimeout(() => chargerUtilisateurs(userSearch), 300)
    return () => clearTimeout(t)
  }, [userSearch, tab, user, chargerUtilisateurs])

  const pendingWelcome = useMemo(
    () => (signups?.signups || []).filter(u => u.email_verifie && u.welcome_pending),
    [signups],
  )

  const todayPendingWelcome = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return pendingWelcome.filter(u => (u.created_at || '').startsWith(today))
  }, [pendingWelcome])

  const appliquerModeleBienvenue = useCallback(() => {
    setBcSubject('Bienvenue sur GetShift — votre accès est activé')
    setBcTitre('Heureux de vous accueillir.')
    setBcMsg(
      "Bienvenue sur GetShift.\n\n"
      + "Vous venez de nous rejoindre en phase test. IA, planification, intégrations : "
      + "l'ensemble des fonctionnalités est ouvert pour vous, sans restriction.\n\n"
      + "Prenez le temps de vous familiariser avec l'outil. L'avance se ressent rarement le premier jour — "
      + "elle devient nette lorsque vous revenez quelques jours plus tard.\n\n"
      + "Nous sommes ravis de vous compter parmi les premiers utilisateurs. Votre confiance compte énormément pour nous."
    )
    setBcItems([
      'Accès complet pendant la phase test',
      'IA, dashboard et planification à votre disposition',
      'Un outil conçu pour vous accompagner au quotidien',
    ].join('\n'))
    setBcCtaLabel('Commencer avec GetShift')
    setBcCtaHref('https://usegetshift.com/#/dashboard')
    setPushTitre('{prenom}, bienvenue sur GetShift')
    setPushBody('Heureux de vous accueillir — tout est ouvert pour vous.')
    setBcAudience('selected')
    setBcMarkWelcome(true)
  }, [])

  const accueillirUtilisateurs = useCallback((list, applyTemplate = true) => {
    const ids = (list || []).filter(u => u.email_verifie).map(u => u.id)
    if (!ids.length) return
    setBcSelectedIds(ids)
    setBcAudience('selected')
    setTab('message')
    if (applyTemplate) appliquerModeleBienvenue()
  }, [appliquerModeleBienvenue])

  const accueillirUn = useCallback((u, e) => {
    e?.stopPropagation?.()
    accueillirUtilisateurs([u], true)
  }, [accueillirUtilisateurs])

  const rafraichirInscriptions = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/signups`, { params: { days: 30 } })
      setSignups(data)
    } catch {}
  }, [])

  useEffect(() => {
    if ((tab === 'message' || tab === 'growth') && user?.is_founder && !signups) {
      rafraichirInscriptions()
    }
  }, [tab, user, signups, rafraichirInscriptions])

  const toggleUserSelection = useCallback((uid) => {
    setBcSelectedIds(prev => (
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    ))
  }, [])

  const appliquerModeleTesteurs = useCallback(() => {
    setBcMarkWelcome(false)
    setBcSubject('Bienvenue dans le monde des 3★ Shifts')
    setBcTitre('Tu es dans la cohorte test GetShift')
    setBcMsg(
      "GetShift est encore en phase test — et tu fais partie des premiers à profiter du meilleur mode (celui qui deviendra payant).\n\n"
      + "Merci de tester avec exigence : chaque retour compte. Bienvenue dans le monde des 3★ Shifts."
    )
    setBcItems([
      'Accès privilégié au mode complet pendant la phase test',
      'Ton feedback façonne la version payante',
      'Merci de ta confiance dès le début',
    ].join('\n'))
    setBcCtaLabel('Ouvrir GetShift')
    setBcCtaHref('https://usegetshift.com/#/dashboard')
    setBcAudience('selected')
  }, [])

  const appliquerModeleFeedback = useCallback(() => {
    setBcMarkWelcome(false)
    setBcSubject('Votre avis compte — 2 minutes pour GetShift')
    setBcTitre('Comment se passe votre expérience ?')
    setBcMsg(
      "Vous utilisez GetShift depuis quelques jours — merci de votre confiance.\n\n"
      + "Nous aimerions connaître votre ressenti : ce qui vous convient, ce qui pourrait être amélioré, "
      + "et une note globale sur 5.\n\n"
      + "Votre retour nous aide directement à prioriser les prochaines améliorations."
    )
    setBcItems([
      'Notation sur 5 (échelle simple)',
      'Votre ressenti sur GetShift',
      'Ce que nous devrions améliorer en priorité',
    ].join('\n'))
    setBcCtaLabel('Donner mon avis')
    setBcCtaHref('https://usegetshift.com/#/dashboard?feedback=1')
    setPushTitre('{prenom}, votre avis compte')
    setPushBody('2 minutes pour nous dire ce qui fonctionne — et ce qu’on peut améliorer.')
    setBcAudience('selected')
  }, [])

  const envoyerPush = useCallback(async (targetOverride) => {
    const target = targetOverride || broadcastTarget()
    if (target === 'selected' && bcSelectedIds.length === 0) {
      setPushResult('Sélectionne au moins un utilisateur.')
      return
    }
    setPushBusy(true); setPushResult(null)
    try {
      const { data } = await axios.post(`${API}/admin/broadcast-push`, {
        titre: pushTitre, body: pushBody, url: '/ia', target,
        user_ids: target === 'selected' ? bcSelectedIds : undefined,
      })
      const label = target === 'all' ? 'tous' : target === 'selected' ? 'la sélection' : 'toi'
      setPushResult(`Envoyé à ${label} — ${data?.sent ?? 0} / ${data?.total ?? 0} appareil(s).`)
    } catch (e) {
      const d = e?.response?.data
      setPushResult(
        e?.response?.status === 403 ? 'Réservé au fondateur.'
        : d?.erreur ? `Erreur : ${d.erreur}${d.detail ? ' — ' + d.detail : ''}`
        : `Erreur (${e?.response?.status || 'réseau'}).`
      )
    }
    setPushBusy(false)
  }, [pushTitre, pushBody, broadcastTarget, bcSelectedIds])

  const bcEnvoyer = useCallback(async (dryRun, targetOverride) => {
    const target = targetOverride || broadcastTarget()
    if (target === 'selected' && bcSelectedIds.length === 0) {
      setBcResult('Sélectionne au moins un utilisateur.')
      return
    }
    setBcBusy(true); setBcResult(null)
    try {
      const items = bcItems.split('\n').map(s => s.trim()).filter(Boolean)
      const { data } = await axios.post(`${API}/admin/broadcast`, {
        subject: bcSubject, titre: bcTitre || bcSubject, intro: bcMsg, items,
        cta_label: bcCtaLabel, cta_href: bcCtaHref, target,
        user_ids: target === 'selected' ? bcSelectedIds : undefined,
        dry_run: !!dryRun,
        mark_welcome: !!bcMarkWelcome && !dryRun && target !== 'self',
      })
      if (dryRun) { setBcCount(data?.total ?? 0); setBcResult(`${data?.total ?? 0} destinataire(s) pour ${audienceSummary()}.`) }
      else if (target === 'self') setBcResult(`Test envoyé à ton adresse — vérifie ta boîte (et les spams).`)
      else {
        const inApp = data?.announcement_id ? ` Message in-app #${data.announcement_id} activé.` : ''
        const welcomed = bcMarkWelcome ? ' Marqués comme accueillis.' : ''
        setBcResult(`✅ Envoyé à ${data?.sent ?? 0} / ${data?.total ?? 0} utilisateur(s) (${audienceSummary()}).${inApp}${welcomed}`)
        if (bcMarkWelcome) rafraichirInscriptions()
      }
    } catch (e) {
      const d = e?.response?.data
      setBcResult(d?.erreur ? `Erreur : ${d.erreur}${d.detail ? ' — ' + d.detail : ''}` : `Erreur (${e?.response?.status || 'réseau'}).`)
    }
    setBcBusy(false)
  }, [bcSubject, bcTitre, bcMsg, bcItems, bcCtaLabel, bcCtaHref, broadcastTarget, bcSelectedIds, audienceSummary, bcMarkWelcome, rafraichirInscriptions])
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState(null)

  const testPush = useCallback(async () => {
    setTesting(true); setTestMsg(null)
    try {
      const r = await axios.post(`${API}/admin/test-push`)
      setTestMsg(r.data?.message || 'Test envoyé.')
    } catch (e) {
      const d = e?.response?.data
      setTestMsg(
        e?.response?.status === 403 ? 'Réservé au fondateur.'
        : d?.detail ? `Erreur : ${d.detail}`
        : `Erreur lors de l'envoi (${e?.response?.status || 'réseau'}).`
      )
    }
    setTesting(false)
  }, [])

  // Garde client (cosmétique — le backend renvoie 403 de toute façon)
  useEffect(() => {
    if (user && !user.is_founder) navigate('/dashboard')
  }, [user, navigate])

  const load = useCallback(async (which) => {
    setLoading(true); setErreur(null)
    try {
      if (which === 'growth') {
        const [o, s, ts] = await Promise.all([
          axios.get(`${API}/admin/overview`),
          axios.get(`${API}/admin/signups?days=30`),
          axios.get(`${API}/admin/timeseries?days=30`),
        ])
        setOverview(o.data); setSignups(s.data); setTimeseries(ts.data)
      } else if (which === 'security') {
        const r = await axios.get(`${API}/admin/security?limit=150`)
        setSecurity(r.data)
      } else if (which === 'system') {
        const r = await axios.get(`${API}/admin/system`)
        setSystem(r.data)
      } else if (which === 'activity') {
        const r = await axios.get(`${API}/admin/activity`)
        setActivity(r.data)
      } else if (which === 'errors') {
        const r = await axios.get(`${API}/admin/errors`)
        setErrors(r.data)
      } else if (which === 'adoption') {
        const r = await axios.get(`${API}/admin/adoption`)
        setAdoption(r.data)
      } else if (which === 'feedback') {
        const r = await axios.get(`${API}/admin/feedback`)
        setFeedbacks(r.data)
      }
    } catch (err) {
      const d = err?.response?.data
      setErreur(
        err?.response?.status === 403 ? 'Accès réservé au fondateur.'
        : d?.detail ? `Erreur : ${d.detail}`
        : `Erreur de chargement (${err?.response?.status || 'réseau'}).`
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (user?.is_founder) load(tab) }, [tab, user, load])

  if (!user?.is_founder) return null

  const ouvrirUser = useCallback(async (uid) => {
    setUserLoading(true); setUserDetail({ id: uid })
    try {
      const r = await axios.get(`${API}/admin/user/${uid}`)
      setUserDetail(r.data)
    } catch (e) {
      setUserDetail({ id: uid, erreur: e?.response?.data?.detail || 'Erreur de chargement' })
    }
    setUserLoading(false)
  }, [])

  const TABS = [
    ['growth', 'Croissance', TrendingUp],
    ['activity', 'Activité', Activity],
    ['adoption', 'Adoption', BarChart3],
    ['feedback', 'Retours', MessageSquare],
    ['errors', 'Erreurs', Bug],
    ['message', 'Message', Mail],
    ['security', 'Sécurité', Shield],
    ['system', 'Système', Server],
  ]

  return (
    <>
      <AppSidebar
        T={T} user={user}
        niveau={niveau} points={points} streak={streak}
        niveauActuel={niveauActuel} pctNiveau={pctNiveau}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        toggleSidebar={toggleSidebar} isMobile={isMobile} />
      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <motion.div
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT : 0, overflowX: 'hidden' }}>

        {/* HEADER */}
        <div style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-subtle)', padding: isMobile ? '14px 16px 14px 58px' : '16px 32px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={15} color="var(--bg-base)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Console Fondateur</h1>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Réservé à toi seul</p>
          </div>
          <motion.button
            onClick={() => load(tab)} whileTap={{ scale: 0.95 }}
            title="Rafraîchir"
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <motion.span animate={loading ? { rotate: 360 } : {}} transition={loading ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}} style={{ display: 'flex' }}>
              <RefreshCw size={15} />
            </motion.span>
          </motion.button>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '18px 16px' : '28px 32px' }}>
          {/* TABS */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
            {TABS.map(([key, label, Icon]) => (
              <motion.button key={key} onClick={() => setTab(key)} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid ' + (tab === key ? 'var(--ember)' : 'var(--border-subtle)'), background: tab === key ? 'var(--ember-soft)' : 'var(--surface-1)', color: tab === key ? 'var(--ember)' : 'var(--text-secondary)', fontSize: 13, fontWeight: tab === key ? 700 : 500, cursor: 'pointer' }}>
                <Icon size={14} />{label}
              </motion.button>
            ))}
          </div>

          {erreur && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(184,89,63,0.12)', border: '1px solid rgba(184,89,63,0.4)', color: '#B8593F', fontSize: 13, marginBottom: 16 }}>{erreur}</div>
          )}

          {/* ── CROISSANCE ── */}
          {tab === 'growth' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                <KpiCard icon={Users} label="Utilisateurs" value={overview?.total_users} sub={`${overview?.verified_users ?? '—'} vérifiés`} />
                <KpiCard icon={UserPlus} label="Inscrits aujourd'hui" value={overview?.signups_today} sub={`${overview?.signups_7d ?? '—'} sur 7j · ${overview?.signups_30d ?? '—'} sur 30j`} />
                <KpiCard icon={Activity} label="Actifs aujourd'hui" value={overview?.active_today} sub={`${overview?.active_7d ?? '—'} sur 7j · ${overview?.active_30d ?? '—'} sur 30j`} />
                <KpiCard icon={ListChecks} label="Tâches totales" value={overview?.total_taches} sub={`${overview?.avg_taches_per_user ?? '—'} / utilisateur`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
                <KpiCard icon={CheckCircle2} label="Tâches faites" value={overview?.taches_done_total} sub={`${overview?.taches_done_today ?? '—'} aujourd'hui`} />
                <KpiCard icon={TrendingUp} label="Faites (7j)" value={overview?.taches_done_7d} sub={`${overview?.taches_created_7d ?? '—'} créées (7j)`} />
                <KpiCard icon={Activity} label="Taux de complétion" value={overview != null ? `${overview.completion_rate}%` : undefined} />
                <KpiCard icon={Shield} label="Événements sécu (24h)" value={overview?.security_events_24h} />
              </div>

              {timeseries && (
                <>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Tendance sur 30 jours</h3>
                  <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 16px 12px', marginBottom: 22, height: 260 }}>
                    <Line
                      data={{
                        labels: timeseries.labels.map(d => d.slice(5)),
                        datasets: [
                          { label: 'Inscriptions', data: timeseries.signups, borderColor: '#E07A3E', backgroundColor: 'rgba(224,122,62,0.14)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 },
                          { label: 'Tâches complétées', data: timeseries.tasks_done, borderColor: '#5BA46F', backgroundColor: 'rgba(91,164,111,0.10)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 },
                          { label: 'Tâches créées', data: timeseries.tasks_created, borderColor: '#8A8F98', backgroundColor: 'transparent', fill: false, tension: 0.35, pointRadius: 0, borderWidth: 1.5, borderDash: [4, 4] },
                        ],
                      }}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { labels: { color: '#9aa0a6', boxWidth: 12, boxHeight: 3, font: { size: 11 } } } },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#9aa0a6', maxTicksLimit: 8, font: { size: 10 } } },
                          y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.12)' }, ticks: { color: '#9aa0a6', precision: 0, font: { size: 10 } } },
                        },
                      }}
                    />
                  </div>
                </>
              )}

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                Inscriptions récentes (30j)
                {pendingWelcome.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)' }}>
                    {pendingWelcome.length} à accueillir
                  </span>
                )}
              </h3>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!signups?.signups?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune inscription sur la période.</div>}
                {signups?.signups?.map((u, i) => (
                  <div key={u.id} onClick={() => ouvrirUser(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nom || '(sans nom)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                    {!u.email_verifie && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(194,135,72,0.15)', color: '#C28748', flexShrink: 0 }}>non vérifié</span>}
                    {u.email_verifie && u.welcome_pending && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)', flexShrink: 0 }}>à accueillir</span>
                    )}
                    {u.founder_welcome_at && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(122,151,120,0.15)', color: '#7A9778', flexShrink: 0 }}>accueilli</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{u.created_at}</span>
                    {u.email_verifie && u.welcome_pending && (
                      <motion.button type="button" onClick={e => accueillirUn(u, e)} whileTap={{ scale: 0.96 }}
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--ember)', background: 'var(--ember-soft)', color: 'var(--ember)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        Accueillir
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ACTIVITÉ ── */}
          {tab === 'activity' && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Activité récente</h3>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!activity?.events?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune activité récente.</div>}
                {activity?.events?.map((e, i) => {
                  const cmap = { signup: '#7A9778', task_created: 'var(--ember)', task_done: '#4caf82', ia: '#a855f7', integration: '#3b82f6' }
                  const c = cmap[e.type] || 'var(--text-secondary)'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{e.at}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── ADOPTION ── */}
          {tab === 'adoption' && adoption && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                <KpiCard icon={Activity} label="Utilisateurs IA" value={adoption.ia_users} sub={`${adoption.ia_messages ?? '—'} messages`} />
                <KpiCard icon={Zap} label="Tomorrow Builder" value={adoption.tb_users} sub={`${adoption.tb_plans ?? '—'} plans générés`} />
                <KpiCard icon={ListChecks} label="Objectifs (Goal)" value={adoption.goal_users} sub={`${adoption.goals ?? '—'} objectifs`} />
                <KpiCard icon={Bell} label="Abonnés push" value={adoption.push_subs} sub={`${adoption.teams ?? '—'} équipe(s)`} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 12px' }}>Intégrations connectées</h3>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!adoption.integrations?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune intégration connectée.</div>}
                {adoption.integrations?.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{it.type}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{it.users} utilisateur(s)</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── RETOURS UTILISATEURS ── */}
          {tab === 'feedback' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                <KpiCard icon={MessageSquare} label="Retours reçus" value={feedbacks?.count ?? 0} />
                <KpiCard icon={Star} label="Note moyenne" value={feedbacks?.avg_rating != null ? `${feedbacks.avg_rating}/5` : '—'} />
                <KpiCard icon={Users} label="Distribution" value={feedbacks?.count ? '1–5 ★' : '—'} sub={
                  feedbacks?.distribution
                    ? [5, 4, 3, 2, 1].map(n => `${n}★:${feedbacks.distribution[String(n)] || 0}`).join(' · ')
                    : undefined
                } />
              </div>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!feedbacks?.feedbacks?.length && (
                  <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Aucun retour pour l&apos;instant. Utilisez le modèle « Demande d&apos;avis » dans l&apos;onglet Message.
                  </div>
                )}
                {feedbacks?.feedbacks?.map((f, i) => (
                  <div key={f.id} style={{ padding: '14px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{f.nom || '(sans nom)'}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.email}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--ember)', flexShrink: 0 }}>
                        {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)} ({f.rating}/5)
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{f.created_at}</span>
                    </div>
                    {f.experience && (
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: f.improvements ? 8 : 0 }}>
                        <strong style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ressenti — </strong>
                        {f.experience}
                      </div>
                    )}
                    {f.improvements && (
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                        <strong style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>À améliorer — </strong>
                        {f.improvements}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ERREURS ── */}
          {tab === 'errors' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: 12, background: errors?.count_24h ? 'rgba(184,89,63,0.12)' : 'var(--surface-1)', border: `1px solid ${errors?.count_24h ? 'rgba(184,89,63,0.4)' : 'var(--border-subtle)'}` }}>
                <Bug size={16} color={errors?.count_24h ? '#B8593F' : 'var(--text-secondary)'} />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{errors?.count_24h || 0} erreur(s) sur les dernières 24h</span>
              </div>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!errors?.errors?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune erreur enregistrée. ✓</div>}
                {errors?.errors?.map((e, i) => (
                  <div key={i} style={{ padding: '11px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#B8593F', fontFamily: 'var(--font-mono, monospace)' }}>{e.method} {e.route}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto', flexShrink: 0 }}>{e.created_at}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)', wordBreak: 'break-word', lineHeight: 1.5 }}>{e.message}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── MESSAGE AUX UTILISATEURS ── */}
          {tab === 'message' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring, var(--ember))' }}>
                <Mail size={16} color="var(--ember)" />
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
                  Phase test : accueille chaque nouvel inscrit individuellement — message perso, accès complet, effet « wow » après quelques jours d&apos;usage.
                </span>
              </div>

              {pendingWelcome.length > 0 && (
                <div style={{ background: 'var(--surface-1)', border: '1px solid var(--ember-ring, var(--ember))', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {pendingWelcome.length} nouvel{pendingWelcome.length > 1 ? 's' : ''} inscrit{pendingWelcome.length > 1 ? 's' : ''} à accueillir
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {todayPendingWelcome.length > 0
                          ? `${todayPendingWelcome.length} inscrit(s) aujourd'hui · `
                          : ''}
                        Clique « Accueillir » pour pré-remplir le message de bienvenue.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {todayPendingWelcome.length > 0 && (
                        <motion.button type="button" onClick={() => accueillirUtilisateurs(todayPendingWelcome)} whileTap={{ scale: 0.97 }}
                          style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--ember)', background: 'var(--ember-soft)', color: 'var(--ember)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Accueillir aujourd&apos;hui ({todayPendingWelcome.length})
                        </motion.button>
                      )}
                      <motion.button type="button" onClick={() => accueillirUtilisateurs(pendingWelcome)} whileTap={{ scale: 0.97 }}
                        style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Tous les non-accueillis ({pendingWelcome.length})
                      </motion.button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {pendingWelcome.slice(0, 12).map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nom}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{u.created_at}</span>
                        <motion.button type="button" onClick={() => accueillirUtilisateurs([u])} whileTap={{ scale: 0.96 }}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          Accueillir
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Destinataires</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <motion.button type="button" onClick={appliquerModeleBienvenue} whileTap={{ scale: 0.97 }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--ember)', background: 'var(--ember-soft)', color: 'var(--ember)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Modèle bienvenue
                    </motion.button>
                    <motion.button type="button" onClick={appliquerModeleTesteurs} whileTap={{ scale: 0.97 }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Modèle 3★ Shifts
                    </motion.button>
                    <motion.button type="button" onClick={appliquerModeleFeedback} whileTap={{ scale: 0.97 }}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Demande d&apos;avis
                    </motion.button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[
                    ['selected', 'Sélection'],
                    ['all', 'Tous vérifiés'],
                    ['self', 'Test (moi)'],
                  ].map(([key, label]) => (
                    <motion.button key={key} type="button" onClick={() => setBcAudience(key)} whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: bcAudience === key ? 700 : 500, cursor: 'pointer',
                        border: `1px solid ${bcAudience === key ? 'var(--ember)' : 'var(--border-subtle)'}`,
                        background: bcAudience === key ? 'var(--ember-soft)' : 'transparent',
                        color: bcAudience === key ? 'var(--ember)' : 'var(--text-secondary)',
                      }}>
                      {label}
                    </motion.button>
                  ))}
                </div>
                {bcAudience === 'selected' && (
                  <>
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Rechercher nom ou email…"
                      style={{ width: '100%', marginBottom: 10, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setBcSelectedIds(pendingWelcome.map(u => u.id))}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 11, cursor: 'pointer' }}>
                        Non-accueillis ({pendingWelcome.length})
                      </button>
                      <button type="button" onClick={() => setBcSelectedIds(todayPendingWelcome.map(u => u.id))}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                        Inscrits aujourd&apos;hui ({todayPendingWelcome.length})
                      </button>
                      <button type="button" onClick={() => setBcSelectedIds(adminUsers.map(u => u.id))}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                        Tout cocher
                      </button>
                      <button type="button" onClick={() => setBcSelectedIds([])}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>
                        Tout décocher
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                        {usersLoading ? 'Chargement…' : `${bcSelectedIds.length} sélectionné(s) · ${adminUsers.length} affiché(s)`}
                      </span>
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                      {adminUsers.map(u => {
                        const checked = bcSelectedIds.includes(u.id)
                        return (
                          <label key={u.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                            background: checked ? 'var(--ember-soft)' : 'transparent',
                          }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleUserSelection(u.id)} />
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.nom}</span>
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                              #{u.id}{u.welcome_pending ? ' · à accueillir' : u.founder_welcome_at ? ' · ✓' : ''}
                            </span>
                          </label>
                        )
                      })}
                      {!usersLoading && adminUsers.length === 0 && (
                        <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucun utilisateur trouvé.</div>
                      )}
                    </div>
                  </>
                )}
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Audience active : <strong style={{ color: 'var(--text-primary)' }}>{audienceSummary()}</strong>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={bcMarkWelcome} onChange={e => setBcMarkWelcome(e.target.checked)} />
                  Marquer comme accueilli après envoi (recommandé pour les nouveaux inscrits)
                </label>
              </div>

              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Objet de l'email</label>
                  <input value={bcSubject} onChange={e => setBcSubject(e.target.value)} placeholder="Petit souci résolu — merci de ta patience 🙏"
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Titre (gros, dans l'email — optionnel)</label>
                  <input value={bcTitre} onChange={e => setBcTitre(e.target.value)} placeholder="Toutes nos excuses pour la gêne"
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Message</label>
                  <textarea value={bcMsg} onChange={e => setBcMsg(e.target.value)} rows={5} placeholder="Bonjour, nous avons rencontré un souci technique qui a pu perturber les notifications. C'est désormais corrigé. Merci de ta confiance et de ta patience."
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Points (optionnel — un par ligne)</label>
                  <textarea value={bcItems} onChange={e => setBcItems(e.target.value)} rows={3} placeholder={"Notifications réparées\nPenser à les réactiver dans Réglages → Notifications"}
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Texte du bouton</label>
                    <input value={bcCtaLabel} onChange={e => setBcCtaLabel(e.target.value)} placeholder="J'essaie GetShift AI"
                      style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lien du bouton</label>
                    <input value={bcCtaHref} onChange={e => setBcCtaHref(e.target.value)} placeholder="https://…/#/ia"
                      style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <motion.button onClick={() => bcEnvoyer(false, 'self')} disabled={bcBusy || !bcSubject || !bcMsg} whileTap={{ scale: 0.97 }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 13, fontWeight: 600, cursor: (bcBusy || !bcSubject || !bcMsg) ? 'not-allowed' : 'pointer', opacity: (bcBusy || !bcSubject || !bcMsg) ? 0.6 : 1 }}>
                    M'envoyer un test
                  </motion.button>
                  <motion.button onClick={() => bcEnvoyer(true)} disabled={bcBusy} whileTap={{ scale: 0.97 }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: bcBusy ? 'wait' : 'pointer' }}>
                    Compter les destinataires
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      if (!bcSubject || !bcMsg) return
                      if (bcAudience === 'selected' && bcSelectedIds.length === 0) {
                        setBcResult('Sélectionne au moins un utilisateur.')
                        return
                      }
                      const n = bcAudience === 'selected' ? bcSelectedIds.length : (bcCount ?? 'tous les')
                      if (window.confirm(`Envoyer cet email à ${n} utilisateur(s) (${audienceSummary()}) ?`)) bcEnvoyer(false)
                    }}
                    disabled={bcBusy || !bcSubject || !bcMsg || (bcAudience === 'selected' && bcSelectedIds.length === 0)} whileTap={{ scale: 0.97 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', fontSize: 13, fontWeight: 700, cursor: (bcBusy || !bcSubject || !bcMsg) ? 'not-allowed' : 'pointer', opacity: (bcBusy || !bcSubject || !bcMsg) ? 0.6 : 1 }}>
                    <Send size={14} /> {bcBusy ? 'Envoi…' : 'Envoyer'}
                  </motion.button>
                </div>
                {bcResult && (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>{bcResult}</div>
                )}
              </div>

              {/* ── ANNONCE PUSH (notification) ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 14px', padding: '12px 16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                <Bell size={16} color="var(--ember)" />
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>Notification push — même audience que ci-dessus. Écris <strong>{'{prenom}'}</strong> pour personnaliser.</span>
              </div>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Titre de la notif</label>
                  <input value={pushTitre} onChange={e => setPushTitre(e.target.value)} placeholder="{prenom}, ton IA voit toute ta journée"
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Message court</label>
                  <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} rows={2} placeholder={'Demande-lui « fais le point sur ma semaine » et clique.'}
                    style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <motion.button onClick={() => envoyerPush('self')} disabled={pushBusy || !pushTitre || !pushBody} whileTap={{ scale: 0.97 }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 13, fontWeight: 600, cursor: (pushBusy || !pushTitre || !pushBody) ? 'not-allowed' : 'pointer', opacity: (pushBusy || !pushTitre || !pushBody) ? 0.6 : 1 }}>
                    Tester sur moi
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      if (!pushTitre || !pushBody) return
                      if (bcAudience === 'selected' && bcSelectedIds.length === 0) {
                        setPushResult('Sélectionne au moins un utilisateur.')
                        return
                      }
                      if (window.confirm(`Envoyer cette push à ${audienceSummary()} ?`)) envoyerPush()
                    }}
                    disabled={pushBusy || !pushTitre || !pushBody || (bcAudience === 'selected' && bcSelectedIds.length === 0)} whileTap={{ scale: 0.97 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', fontSize: 13, fontWeight: 700, cursor: (pushBusy || !pushTitre || !pushBody) ? 'not-allowed' : 'pointer', opacity: (pushBusy || !pushTitre || !pushBody) ? 0.6 : 1 }}>
                    <Send size={14} /> {pushBusy ? 'Envoi…' : 'Envoyer push'}
                  </motion.button>
                </div>
                {pushResult && (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>{pushResult}</div>
                )}
              </div>
            </>
          )}

          {/* ── SÉCURITÉ ── */}
          {tab === 'security' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
                <KpiCard icon={Shield} label="Connexions échouées (24h)" value={security?.counts_24h?.login_failed ?? 0} />
                <KpiCard icon={AlertTriangle} label="Accès refusés (24h)" value={security?.counts_24h?.access_denied ?? 0} />
                <KpiCard icon={Activity} label="Rate-limit (24h)" value={security?.counts_24h?.rate_limit ?? 0} />
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Événements récents</h3>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!security?.events?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Rien à signaler — aucun événement de sécurité enregistré.</div>}
                {security?.events?.map((ev, i) => {
                  const color = ev.event_type === 'login_failed' ? '#C28748' : ev.event_type === 'access_denied' ? '#B8593F' : 'var(--text-secondary)'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{SEC_LABEL[ev.event_type] || ev.event_type}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail}</span>
                      {ev.ip && <span style={{ fontSize: 11, color: 'var(--text-tertiary, var(--text-secondary))', flexShrink: 0, fontFamily: 'var(--font-mono, monospace)' }}>{ev.ip}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{ev.created_at}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── SYSTÈME ── */}
          {tab === 'system' && (
            <>
              {/* Test notif : envoie un push réel au fondateur + remet le check "Crons notifs" au vert */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18, padding: '14px 16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Tester les notifications</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Envoie un push de test sur tes appareils abonnés.</div>
                </div>
                <motion.button onClick={testPush} disabled={testing} whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', fontSize: 13, fontWeight: 700, cursor: testing ? 'wait' : 'pointer', flexShrink: 0, opacity: testing ? 0.7 : 1 }}>
                  <Bell size={14} /> {testing ? 'Envoi…' : 'Tester une notif'}
                </motion.button>
              </div>
              {testMsg && (
                <div style={{ marginBottom: 18, padding: '11px 16px', borderRadius: 10, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring, var(--ember))', color: 'var(--text-primary)', fontSize: 12.5 }}>{testMsg}</div>
              )}

              {system && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLOR[system.overall] || 'var(--text-secondary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {system.overall === 'ok' ? 'Tout est opérationnel' : system.overall === 'warn' ? 'Vigilance' : 'Problème détecté'}
                  </span>
                </div>
              )}
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {system?.checks?.map((c, i) => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0 }}>
                    {c.status === 'ok'
                      ? <CheckCircle2 size={16} color={STATUS_COLOR.ok} style={{ flexShrink: 0 }} />
                      : <AlertTriangle size={16} color={STATUS_COLOR[c.status]} style={{ flexShrink: 0 }} />}
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{c.label}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{c.detail}</span>
                  </div>
                ))}
              </div>
              {system?.healed?.length > 0 && (
                <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'rgba(122,151,120,0.12)', border: '1px solid rgba(122,151,120,0.35)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR.ok, marginBottom: 6 }}>Réparé automatiquement</div>
                  {system.healed.map((h, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>· {h}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* ── DÉTAIL UTILISATEUR (modale) ── */}
      {userDetail && (
        <div onClick={() => setUserDetail(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 22px', width: 'min(420px, 100%)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Users size={18} color="var(--ember)" />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>Détail utilisateur</span>
              <button onClick={() => setUserDetail(null)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>
            {userLoading && <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>Chargement…</div>}
            {!userLoading && userDetail.erreur && <div style={{ fontSize: 13, color: '#B8593F' }}>{userDetail.erreur}</div>}
            {!userLoading && !userDetail.erreur && userDetail.email && (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{userDetail.nom || '(sans nom)'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{userDetail.email} {userDetail.email_verifie ? '· vérifié' : '· non vérifié'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    ['Niveau', userDetail.niveau], ['Points', userDetail.points], ['Streak', `${userDetail.streak || 0}j`],
                    ['Tâches', userDetail.taches_total], ['Faites', userDetail.taches_done], ['Msgs IA', userDetail.ia_messages],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{v ?? '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Inscrit le {userDetail.created_at || '—'} · dernière activité {userDetail.derniere_activite || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Push : {userDetail.has_push ? 'activé' : 'non'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {(userDetail.integrations || []).length === 0 && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Aucune intégration</span>}
                  {(userDetail.integrations || []).map(it => (
                    <span key={it} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'var(--ember-soft)', color: 'var(--ember)' }}>{it}</span>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {isMobile && <BottomNavMobile T={T} />}
    </>
  )
}

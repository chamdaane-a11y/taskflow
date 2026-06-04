// ══════════════════════════════════════════════════════════════════════
// FounderConsole.jsx — Console Fondateur (réservée au fondateur)
// Onglets : Croissance / Sécurité / Système. La vraie barrière est côté
// backend (toute route /admin/* renvoie 403 si pas le fondateur) ; ici la
// garde client n'est que cosmétique (redirige si !is_founder).
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import {
  TrendingUp, Shield, Server, Users, UserPlus, Activity,
  AlertTriangle, CheckCircle2, RefreshCw, ListChecks, Bell,
  Bug, BarChart3, Zap, X, Mail, Send,
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
  const [userDetail, setUserDetail] = useState(null)
  const [userLoading, setUserLoading] = useState(false)
  // Message aux utilisateurs (broadcast email)
  const [bcSubject, setBcSubject] = useState('')
  const [bcTitre, setBcTitre] = useState('')
  const [bcMsg, setBcMsg] = useState('')
  const [bcItems, setBcItems] = useState('')
  const [bcBusy, setBcBusy] = useState(false)
  const [bcResult, setBcResult] = useState(null)
  const [bcCount, setBcCount] = useState(null)

  const bcEnvoyer = useCallback(async (dryRun) => {
    setBcBusy(true); setBcResult(null)
    try {
      const items = bcItems.split('\n').map(s => s.trim()).filter(Boolean)
      const { data } = await axios.post(`${API}/admin/broadcast`, {
        subject: bcSubject, titre: bcTitre || bcSubject, intro: bcMsg, items, dry_run: !!dryRun,
      })
      if (dryRun) { setBcCount(data?.total ?? 0); setBcResult(`${data?.total ?? 0} destinataire(s) vérifié(s).`) }
      else setBcResult(`✅ Envoyé à ${data?.sent ?? 0} / ${data?.total ?? 0} utilisateur(s).`)
    } catch (e) {
      const d = e?.response?.data
      setBcResult(d?.erreur ? `Erreur : ${d.erreur}${d.detail ? ' — ' + d.detail : ''}` : `Erreur (${e?.response?.status || 'réseau'}).`)
    }
    setBcBusy(false)
  }, [bcSubject, bcTitre, bcMsg, bcItems])
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

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Inscriptions récentes (30j)</h3>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!signups?.signups?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune inscription sur la période.</div>}
                {signups?.signups?.map((u, i) => (
                  <div key={u.id} onClick={() => ouvrirUser(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nom || '(sans nom)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                    {!u.email_verifie && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(194,135,72,0.15)', color: '#C28748', flexShrink: 0 }}>non vérifié</span>}
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{u.created_at}</span>
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
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>Email envoyé à <strong>tous les utilisateurs vérifiés</strong>. Rédige, compte les destinataires, puis envoie.</span>
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
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  <motion.button onClick={() => bcEnvoyer(true)} disabled={bcBusy} whileTap={{ scale: 0.97 }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 13, fontWeight: 600, cursor: bcBusy ? 'wait' : 'pointer' }}>
                    Compter les destinataires
                  </motion.button>
                  <motion.button
                    onClick={() => { if (bcSubject && bcMsg && window.confirm(`Envoyer cet email à ${bcCount != null ? bcCount + ' ' : 'TOUS les '}utilisateur(s) vérifié(s) ?`)) bcEnvoyer(false) }}
                    disabled={bcBusy || !bcSubject || !bcMsg} whileTap={{ scale: 0.97 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', fontSize: 13, fontWeight: 700, cursor: (bcBusy || !bcSubject || !bcMsg) ? 'not-allowed' : 'pointer', opacity: (bcBusy || !bcSubject || !bcMsg) ? 0.6 : 1 }}>
                    <Send size={14} /> {bcBusy ? 'Envoi…' : 'Envoyer à tous'}
                  </motion.button>
                </div>
                {bcResult && (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>{bcResult}</div>
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

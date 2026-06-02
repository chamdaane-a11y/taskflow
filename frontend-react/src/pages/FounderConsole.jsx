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
  AlertTriangle, CheckCircle2, RefreshCw, ListChecks,
} from 'lucide-react'
import { themes } from '../themes'
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
  const [security, setSecurity] = useState(null)
  const [system, setSystem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)

  // Garde client (cosmétique — le backend renvoie 403 de toute façon)
  useEffect(() => {
    if (user && !user.is_founder) navigate('/dashboard')
  }, [user, navigate])

  const load = useCallback(async (which) => {
    setLoading(true); setErreur(null)
    try {
      if (which === 'growth') {
        const [o, s] = await Promise.all([
          axios.get(`${API}/admin/overview`),
          axios.get(`${API}/admin/signups?days=30`),
        ])
        setOverview(o.data); setSignups(s.data)
      } else if (which === 'security') {
        const r = await axios.get(`${API}/admin/security?limit=150`)
        setSecurity(r.data)
      } else if (which === 'system') {
        const r = await axios.get(`${API}/admin/system`)
        setSystem(r.data)
      }
    } catch (err) {
      setErreur(err?.response?.status === 403 ? 'Accès réservé au fondateur.' : 'Erreur de chargement.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (user?.is_founder) load(tab) }, [tab, user, load])

  if (!user?.is_founder) return null

  const TABS = [
    ['growth', 'Croissance', TrendingUp],
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
        <div style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-subtle)', padding: isMobile ? '14px 16px' : '16px 32px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
                <KpiCard icon={Users} label="Utilisateurs" value={overview?.total_users} sub={`${overview?.verified_users ?? '—'} vérifiés`} />
                <KpiCard icon={UserPlus} label="Inscrits aujourd'hui" value={overview?.signups_today} sub={`${overview?.signups_7d ?? '—'} sur 7j`} />
                <KpiCard icon={Activity} label="Actifs (7j)" value={overview?.active_7d} />
                <KpiCard icon={ListChecks} label="Tâches totales" value={overview?.total_taches} />
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Inscriptions récentes (30j)</h3>
              <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
                {!signups?.signups?.length && <div style={{ padding: '20px 16px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>Aucune inscription sur la période.</div>}
                {signups?.signups?.map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', minWidth: 0 }}>
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
      {isMobile && <BottomNavMobile T={T} />}
    </>
  )
}

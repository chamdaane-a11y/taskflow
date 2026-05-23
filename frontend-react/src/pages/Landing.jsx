import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, CheckCircle, Zap, BarChart2, Users, Calendar,
  Brain, Target, Flame, Trophy, Star, ChevronDown,
  MessageSquare, TrendingUp, Shield, Bell, Sparkles, ArrowUpRight,
} from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'
import {
  GoogleCalendarLogo, GoogleDriveLogo, GmailLogo,
  NotionLogo, SlackLogo, DiscordLogo, ZoomLogo,
} from '../components/BrandLogos'

// ── Fade-in au scroll ────────────────────────────────────────────────────────
const FadeUp = ({ children, delay = 0, className = '' }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}>
    {children}
  </motion.div>
)

// ── Mockup : Browser Frame ───────────────────────────────────────────────────
function BrowserFrame({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: '0 24px 64px -16px rgba(0,0,0,0.22), 0 4px 16px -4px rgba(0,0,0,0.12)',
      ...style,
    }}>
      {/* Chrome bar */}
      <div style={{ height: 38, background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff6b6b', '#feca57', '#1dd1a1'].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />)}
        </div>
        <div style={{ flex: 1, maxWidth: 260, margin: '0 auto', height: 20, background: 'var(--surface-3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>app.getshift.io</span>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Mockup : Dashboard complet ───────────────────────────────────────────────
function DashboardMockup() {
  const tasks = [
    { titre: 'Réviser le chapitre 4 — Algo', prio: 'haute', done: true },
    { titre: 'Rapport hebdo équipe Notion', prio: 'moyenne', done: false },
    { titre: 'Préparer présentation client', prio: 'haute', done: false },
  ]
  const prioColor = { haute: 'var(--danger)', moyenne: 'var(--warning)', basse: 'var(--success)' }
  return (
    <div style={{ display: 'flex', height: 320, fontSize: 11, fontFamily: 'var(--font-ui)' }}>
      {/* Sidebar */}
      <div style={{ width: 150, background: 'var(--bg-base)', borderRight: '1px solid var(--border-subtle)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, padding: '0 4px' }}>
          <GetShiftMark size={20} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>GetShift</span>
        </div>
        {[
          { label: 'Dashboard', active: true },
          { label: 'Planification', active: false },
          { label: 'Analytics', active: false },
          { label: 'IA Coach', active: false },
          { label: 'Collaboration', active: false },
        ].map(n => (
          <div key={n.label} style={{ padding: '6px 8px', borderRadius: 7, background: n.active ? 'var(--ember-soft)' : 'transparent', color: n.active ? 'var(--ember)' : 'var(--text-secondary)', fontWeight: n.active ? 600 : 400, borderLeft: n.active ? '2px solid var(--ember)' : '2px solid transparent' }}>
            {n.label}
          </div>
        ))}
        {/* Niveau */}
        <div style={{ marginTop: 'auto', padding: '10px 8px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Niveau 4 — Discipliné</div>
          <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
            <div style={{ width: '62%', height: '100%', background: 'var(--ember)', borderRadius: 99 }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 9, color: 'var(--ember)', fontWeight: 600 }}>620 pts · 🔥 12j</div>
        </div>
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: '14px 16px', overflowY: 'hidden' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Bonjour, Ahmed 👋</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>3 tâches prioritaires aujourd'hui</div>
        </div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
          {[
            { label: 'Streak', val: '12j', color: 'var(--warning)', icon: '🔥' },
            { label: 'Points', val: '620', color: 'var(--ember)', icon: '⭐' },
            { label: 'Ce soir', val: '5/8', color: 'var(--success)', icon: '✓' },
            { label: 'Focus', val: '82%', color: 'var(--info)', icon: '🎯' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 9px' }}>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* Tasks */}
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Tâches du jour</div>
        {tasks.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${t.done ? 'var(--success)' : 'var(--border-default)'}`, background: t.done ? 'var(--success)' : 'transparent', flexShrink: 0 }} />
            <span style={{ flex: 1, color: t.done ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: t.done ? 'line-through' : 'none', fontSize: 10 }}>{t.titre}</span>
            <div style={{ padding: '2px 6px', borderRadius: 99, background: `${prioColor[t.prio]}18`, color: prioColor[t.prio], fontSize: 9, fontWeight: 700 }}>{t.prio}</div>
          </div>
        ))}
        {/* IA suggestion */}
        <div style={{ marginTop: 8, padding: '7px 10px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={12} color="var(--ember)" />
          <span style={{ fontSize: 10, color: 'var(--ember)', fontWeight: 500 }}>Coach IA : "Tu es en train de crusher — garde le rythme sur la présentation."</span>
        </div>
      </div>
    </div>
  )
}

// ── Mockup : Analytics ───────────────────────────────────────────────────────
function AnalyticsMockup() {
  const bars = [6, 12, 8, 15, 11, 9, 17]
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const max = Math.max(...bars)
  return (
    <div style={{ padding: '16px', height: 220, fontFamily: 'var(--font-ui)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Productivité — 7 derniers jours</div>
      <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 14 }}>+18% vs semaine précédente · 🔥 12j de streak</div>
      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 80, marginBottom: 6 }}>
        {bars.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', background: i === 6 ? 'var(--ember)' : 'var(--ember-soft)', borderRadius: '4px 4px 0 0', height: `${(v / max) * 72}px`, border: i === 6 ? '1px solid var(--ember-ring)' : 'none', transition: 'height 0.5s ease' }} />
            <span style={{ fontSize: 8, color: i === 6 ? 'var(--ember)' : 'var(--text-tertiary)', fontWeight: i === 6 ? 700 : 400 }}>{days[i]}</span>
          </div>
        ))}
      </div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
        {[
          { label: 'Focus Score', val: '82 / 100', color: 'var(--success)' },
          { label: 'Chronotype', val: 'Matinal', color: 'var(--info)' },
          { label: 'Meilleur jour', val: 'Dimanche', color: 'var(--ember)' },
        ].map(s => (
          <div key={s.label} style={{ padding: '7px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 8, color: 'var(--text-tertiary)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mockup : Planification Kanban ────────────────────────────────────────────
function KanbanMockup() {
  const cols = [
    { titre: 'À faire', color: 'var(--info)', tasks: ['Finir rapport Q2', 'Setup Google Drive'] },
    { titre: 'En cours', color: 'var(--warning)', tasks: ['Préparer slides', 'Sync équipe Notion'] },
    { titre: 'Terminé', color: 'var(--success)', tasks: ['Review code PR #42', 'Rapport hebdo envoyé'] },
  ]
  return (
    <div style={{ padding: '14px', height: 220, fontFamily: 'var(--font-ui)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Sprint actuel — Équipe Dev</div>
      <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginBottom: 12 }}>4 membres · synchronisé avec Notion</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {cols.map(col => (
          <div key={col.titre}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{col.titre}</span>
            </div>
            {col.tasks.map((t, i) => (
              <div key={i} style={{ padding: '6px 8px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 7, marginBottom: 4, fontSize: 9, color: 'var(--text-primary)', lineHeight: 1.4 }}>{t}</div>
            ))}
          </div>
        ))}
      </div>
      {/* IA plan suggestion */}
      <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 7, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Brain size={11} color="var(--ember)" />
        <span style={{ fontSize: 9, color: 'var(--ember)', fontWeight: 500 }}>TomorrowBuilder a généré ton plan pour demain — 6 tâches, 3h estimées</span>
      </div>
    </div>
  )
}

// ── Mockup : iPhone ──────────────────────────────────────────────────────────
function IPhoneMockup() {
  return (
    <div style={{ width: 220, height: 430, background: 'var(--surface-3)', borderRadius: 36, border: '3px solid var(--border-strong)', position: 'relative', overflow: 'hidden', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05)', flexShrink: 0 }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 90, height: 24, background: 'var(--surface-3)', borderRadius: '0 0 16px 16px', zIndex: 10 }} />
      {/* Status bar */}
      <div style={{ height: 42, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 18px 6px', fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        <span>9:41</span>
        <span>▲▲▲ 100%</span>
      </div>
      {/* Screen content */}
      <div style={{ padding: '8px 12px', fontFamily: 'var(--font-ui)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Bonjour Ahmed 👋</div>
        <div style={{ fontSize: 9, color: 'var(--ember)', fontWeight: 600, marginBottom: 10 }}>🔥 12j de streak · 620 pts</div>
        {/* Stats 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          {[
            { l: 'Aujourd\'hui', v: '5/8', c: 'var(--success)' },
            { l: 'Focus', v: '82%', c: 'var(--ember)' },
            { l: 'Streak', v: '12j', c: 'var(--warning)' },
            { l: 'Niveau', v: 'Niv.4', c: 'var(--info)' },
          ].map(s => (
            <div key={s.l} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>{s.l}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
        {/* Tasks */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>Tâches prioritaires</div>
        {['Réviser chapitre 4', 'Rapport équipe'].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', background: 'var(--surface-1)', borderRadius: 8, marginBottom: 4, border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid var(--border-default)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--text-primary)' }}>{t}</span>
            <div style={{ marginLeft: 'auto', padding: '1px 5px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 99, fontSize: 8, fontWeight: 700 }}>haute</div>
          </div>
        ))}
        {/* Notification push */}
        <div style={{ marginTop: 8, padding: '7px 9px', background: 'var(--surface-1)', borderRadius: 10, border: '1px solid var(--ember-ring)', display: 'flex', gap: 7, alignItems: 'center' }}>
          <Bell size={12} color="var(--ember)" />
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)' }}>Rappel GetShift</div>
            <div style={{ fontSize: 8, color: 'var(--text-secondary)' }}>Rapport hebdo prêt 📊</div>
          </div>
        </div>
      </div>
      {/* Bottom nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: 'var(--bg-overlay)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', backdropFilter: 'blur(12px)' }}>
        {[
          { icon: Target, active: true },
          { icon: Calendar, active: false },
          { icon: Brain, active: false },
          { icon: BarChart2, active: false },
        ].map(({ icon: Icon, active }, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Icon size={16} color={active ? 'var(--ember)' : 'var(--text-tertiary)'} strokeWidth={active ? 2.5 : 1.8} />
            {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ember)' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Badges tiles ─────────────────────────────────────────────────────────────
const BADGES_SHOWCASE = [
  { icon: Flame, label: 'En route', desc: '3 jours consécutifs', color: 'var(--warning)', tier: 'common' },
  { icon: Trophy, label: 'Semaine parfaite', desc: '7 jours de streak', color: 'var(--ember)', tier: 'rare' },
  { icon: Zap, label: 'Centurion', desc: '100 tâches terminées', color: 'var(--info)', tier: 'epic' },
  { icon: Star, label: 'Maestro', desc: 'Score focus 95+', color: '#a855f7', tier: 'legendary' },
  { icon: Brain, label: 'Stratège', desc: 'TomorrowBuilder 10×', color: 'var(--success)', tier: 'rare' },
  { icon: Shield, label: 'Indestructible', desc: 'Streak Freeze utilisé', color: 'var(--danger)', tier: 'common' },
]

// ── Intégrations ─────────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { name: 'Google Calendar', Logo: GoogleCalendarLogo },
  { name: 'Gmail', Logo: GmailLogo },
  { name: 'Google Drive', Logo: GoogleDriveLogo },
  { name: 'Notion', Logo: NotionLogo },
  { name: 'Slack', Logo: SlackLogo },
  { name: 'Discord', Logo: DiscordLogo },
  { name: 'Zoom', Logo: ZoomLogo },
]

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    nom: 'Gratuit',
    prix: '0€',
    periode: 'pour toujours',
    cta: 'Commencer gratuitement',
    highlight: false,
    features: [
      'Tâches illimitées',
      'Assistant IA — 30 req/jour',
      'Analytics — 30 derniers jours',
      'Collaboration — jusqu\'à 5 membres',
      '5 intégrations au choix',
      'TomorrowBuilder & GoalReverse',
      'Gamification (27 badges, 10 niveaux)',
      'Rapports hebdos par email',
      'PWA + thèmes light/dark',
    ],
  },
  {
    nom: 'Pro',
    prix: '4,99€',
    periode: 'par mois',
    cta: 'Passer Pro',
    highlight: true,
    badge: 'Bientôt disponible',
    features: [
      'Tout du plan Gratuit',
      'Assistant IA illimité',
      'Analytics avancés — 90 jours + exports CSV/JSON',
      'Collaboration illimitée',
      'Toutes les intégrations (7 services)',
      'TomorrowBuilder & GoalReverse avancés (IA multi-semaines)',
      'Badge Pro exclusif',
      'Support prioritaire',
    ],
  },
]

// ════════════════════════════════════════════════════════════════════════════
// PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) try { if (JSON.parse(user)?.id) navigate('/dashboard') } catch {}
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        .landing-section { padding: clamp(72px,10vw,120px) clamp(20px,5vw,80px); }
        .ember-text { background: linear-gradient(135deg, var(--ember), var(--ember-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .serif { font-family: var(--font-display, 'Instrument Serif', Georgia, serif); font-style: italic; }
        html { scroll-behavior: smooth; }
        @media (max-width: 1024px) {
          .feature-row { flex-direction: column !important; }
          .feature-row .mockup-side { width: 100% !important; }
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 440px; margin: 0 auto; }
        }
        @media (max-width: 768px) {
          .hero-browser { display: none !important; }
          .nav-links { display: none !important; }
          .integrations-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .badges-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .mobile-section-inner { flex-direction: column !important; align-items: center !important; }
        }
        @media (max-width: 480px) {
          .hero-ctas { flex-direction: column !important; width: 100% !important; }
          .hero-ctas button { width: 100% !important; justify-content: center !important; }
          .stats-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .integrations-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          height: 60, padding: '0 clamp(20px,5vw,80px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: scrolled ? 'var(--bg-overlay)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border-subtle)' : 'none',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <GetShiftMark size={30} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.5px' }}>GetShift</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 32 }}>
          {[['#features', 'Fonctionnalités'], ['#integrations', 'Intégrations'], ['#gamification', 'Progression'], ['#pricing', 'Tarifs']].map(([href, label]) => (
            <a key={href} href={href} style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>{label}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid var(--border-default)', borderRadius: 9, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Connexion
          </motion.button>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.02, filter: 'brightness(1.07)' }} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 18px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 9, color: 'var(--text-on-ember)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)' }}>
            Essayer gratuitement
          </motion.button>
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(100px,14vh,140px) clamp(20px,5vw,80px) 60px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, var(--ember), transparent)', opacity: 0.04, top: '40%', left: '50%', transform: 'translate(-50%,-60%)' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, var(--ember-hover), transparent)', opacity: 0.03, top: '5%', right: '5%' }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 16px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, marginBottom: 24, fontSize: 12, color: 'var(--ember)', fontWeight: 600 }}>
          <Sparkles size={12} strokeWidth={2} />
          Productivité propulsée par l'IA — 100% gratuit
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}
          style={{ fontSize: 'clamp(38px, 6vw, 80px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-3px', marginBottom: 18, maxWidth: 860, color: 'var(--text-primary)' }}>
          Organise.{' '}
          <span className="ember-text serif">Performe.</span>
          <br />Évolue.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.8, marginBottom: 36, fontWeight: 400 }}>
          GetShift combine gestion de tâches, IA personnelle et analytics avancés pour t'aider à accomplir plus — chaque jour. Conçu pour les étudiants ambitieux et les pros qui performent.
        </motion.p>

        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.03, filter: 'brightness(1.07)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 28px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 12, color: 'var(--text-on-ember)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: 'var(--shadow-ember)' }}>
            Commencer gratuitement <ArrowRight size={16} />
          </motion.button>
          <motion.button onClick={() => navigate('/login')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--surface-1)', border: '1.5px solid var(--border-default)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Se connecter
          </motion.button>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 52 }}>
          Aucune carte bancaire · Sans engagement · Gratuit pour toujours
        </motion.p>

        {/* Browser mockup */}
        <motion.div className="hero-browser" initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.9 }}
          style={{ width: '100%', maxWidth: 860 }}>
          <BrowserFrame>
            <DashboardMockup />
          </BrowserFrame>
        </motion.div>

        {/* Scroll hint */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{ marginTop: 32, color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11 }}>Découvrir</span>
          <ChevronDown size={16} />
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF STRIP ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(32px,5vw,48px) clamp(20px,5vw,80px)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}>
        <div className="stats-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          {[
            { val: '8', label: 'Intégrations', sublabel: 'Google, Notion, Slack…', icon: Zap },
            { val: '27', label: 'Badges', sublabel: '4 piliers de progression', icon: Trophy },
            { val: '10', label: 'Niveaux', sublabel: 'Démarrage → Légende', icon: TrendingUp },
            { val: '100%', label: 'Gratuit', sublabel: 'Sans CB, sans engagement', icon: Shield },
          ].map(({ val, label, sublabel, icon: Icon }, i) => (
            <FadeUp key={label} delay={i * 0.07}>
              <div style={{ textAlign: 'center', padding: '20px 12px' }}>
                <Icon size={18} color="var(--ember)" strokeWidth={2} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{sublabel}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FEATURES SHOWCASE ───────────────────────────────────────────────── */}
      <section id="features" className="landing-section">
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(48px,7vw,80px)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
              <Sparkles size={12} /> Fonctionnalités
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', maxWidth: 600, margin: '0 auto 14px', lineHeight: 1.1 }}>
              Tout ce qu'il faut pour <span className="ember-text serif">performer</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Du tableau de bord à l'assistant IA en passant par les analytics — une suite complète, dans une seule app.
            </p>
          </div>
        </FadeUp>

        {/* Feature 1 : Dashboard + IA Coach */}
        <FadeUp>
          <div className="feature-row" style={{ display: 'flex', alignItems: 'center', gap: 60, marginBottom: 'clamp(60px,10vw,100px)', maxWidth: 1100, margin: '0 auto clamp(60px,10vw,100px)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 11, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
                <Target size={11} /> Dashboard & IA Coach
              </div>
              <h3 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2 }}>
                Ton hub de productivité — tout centralisé
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                Dashboard en temps réel avec stats de la journée, streak, points et tâches prioritaires. Un Coach IA analyse tes patterns et te donne des recommandations personnalisées — pas des conseils génériques.
              </p>
              {['Tâches avec priorité, deadline et dépendances', 'Score de focus calculé sur tes habitudes réelles', 'Coach IA adaptatif — 3 styles (Bienveillant / Motivateur / Analytique)', 'Rapports hebdos automatiques par email'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                  <CheckCircle size={15} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="mockup-side" style={{ width: '52%', flexShrink: 0 }}>
              <BrowserFrame>
                <DashboardMockup />
              </BrowserFrame>
            </div>
          </div>
        </FadeUp>

        {/* Feature 2 : Analytics — inversé */}
        <FadeUp>
          <div className="feature-row" style={{ display: 'flex', alignItems: 'center', gap: 60, marginBottom: 'clamp(60px,10vw,100px)', maxWidth: 1100, margin: '0 auto clamp(60px,10vw,100px)', flexDirection: 'row-reverse' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 11, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
                <BarChart2 size={11} /> Analytics avancés
              </div>
              <h3 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2 }}>
                Comprends tes patterns, optimise chaque journée
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                Courbe de progression, chronotype productif, heatmap d'activité — des analytics qui te révèlent <em>quand</em> tu es au sommet. Pas juste "combien de tâches", mais comment tu travailles.
              </p>
              {['Courbe de croissance sur 7 / 30 / 90 jours', 'Chronotype : tes heures de pic de productivité', 'Comparaison semaine actuelle vs précédente', 'Score focus, vélocité, et prédiction de la semaine'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                  <CheckCircle size={15} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="mockup-side" style={{ width: '52%', flexShrink: 0 }}>
              <BrowserFrame>
                <AnalyticsMockup />
              </BrowserFrame>
            </div>
          </div>
        </FadeUp>

        {/* Feature 3 : Planification + Collab */}
        <FadeUp>
          <div className="feature-row" style={{ display: 'flex', alignItems: 'center', gap: 60, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 11, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
                <Brain size={11} /> Planification IA + Collaboration
              </div>
              <h3 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 14, lineHeight: 1.2 }}>
                Planifie avec l'IA, exécute en équipe
              </h3>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
                TomorrowBuilder génère ton planning de demain en quelques secondes. GoalReverse décompose tes objectifs ambitieux en jalons actionnables. Le tout partageable en temps réel avec ton équipe.
              </p>
              {['TomorrowBuilder : plan IA personnalisé en 30 secondes', 'GoalReverse : objectif → jalons en quelques clics', 'Kanban collaboratif avec rôles (admin / validateur / membre)', 'Synchronisation Google Calendar bidirectionnelle'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                  <CheckCircle size={15} color="var(--ember)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="mockup-side" style={{ width: '52%', flexShrink: 0 }}>
              <BrowserFrame>
                <KanbanMockup />
              </BrowserFrame>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── INTÉGRATIONS ────────────────────────────────────────────────────── */}
      <section id="integrations" style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 12 }}>
              Connecté à tes outils du quotidien
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto' }}>
              8 intégrations OAuth réelles — pas de copier-coller, pas de friction. Tes tâches et ton calendrier se synchronisent automatiquement.
            </p>
          </div>
        </FadeUp>
        <div className="integrations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, maxWidth: 900, margin: '0 auto' }}>
          {INTEGRATIONS.map(({ name, Logo }, i) => (
            <FadeUp key={name} delay={i * 0.06}>
              <motion.div whileHover={{ scale: 1.06, translateY: -3 }} transition={{ duration: 0.18 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 10px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 14, cursor: 'default' }}>
                <Logo size={34} />
                <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{name}</span>
              </motion.div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.4}>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>
            Connexion via OAuth sécurisé — tes données ne transitent jamais par nos serveurs
          </p>
        </FadeUp>
      </section>

      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,80px)' }}>
        <div className="mobile-section-inner" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(40px,8vw,90px)', maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp delay={0.1}>
            <IPhoneMockup />
          </FadeUp>
          <FadeUp style={{ flex: 1 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 18 }}>
                <Bell size={12} /> Sur tous tes appareils
              </div>
              <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.15 }}>
                Toujours avec toi,<br />
                <span className="ember-text serif">même en déplacement</span>
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28, maxWidth: 420 }}>
                GetShift est une PWA installable — expérience native sur mobile comme sur desktop. Notifications push, accès hors ligne, interface adaptée au pouce.
              </p>
              {[
                { icon: Bell, text: 'Notifications push intelligentes — rappels de deadlines et streak' },
                { icon: Zap, text: 'Chargement instantané après installation — même sans réseau' },
                { icon: MessageSquare, text: 'Assistant IA accessible depuis n\'importe où' },
                { icon: Calendar, text: 'Synchronisation temps réel avec Google Calendar' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color="var(--ember)" />
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 5 }}>{text}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── GAMIFICATION ────────────────────────────────────────────────────── */}
      <section id="gamification" style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
              <Flame size={12} /> Progression & Récompenses
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', marginBottom: 14, maxWidth: 600, margin: '0 auto 14px', lineHeight: 1.1 }}>
              L'app qui te récompense<br />
              <span className="ember-text serif">pour chaque effort</span>
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              27 badges, 10 niveaux et un système de streak pour transformer ta productivité en progression visible. Chaque tâche terminée compte.
            </p>
          </div>
        </FadeUp>

        {/* Niveau visuel */}
        <FadeUp delay={0.1}>
          <div style={{ maxWidth: 680, margin: '0 auto 48px', padding: 'clamp(20px,3vw,32px)', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>NIVEAU 4</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Discipliné</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ember)' }}>620</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Points</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--warning)' }}>🔥 12</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Jours de streak</div>
                </div>
              </div>
            </div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} whileInView={{ width: '62%' }}
                viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.16,1,0.3,1], delay: 0.3 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--ember), var(--ember-hover))', borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 7 }}>62% vers Niveau 5 — Stratège · 380 pts restants</div>
          </div>
        </FadeUp>

        {/* Badges grid */}
        <div className="badges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 820, margin: '0 auto' }}>
          {BADGES_SHOWCASE.map(({ icon: Icon, label, desc, color, tier }, i) => (
            <FadeUp key={label} delay={i * 0.07}>
              <motion.div whileHover={{ scale: 1.04, translateY: -2 }} transition={{ duration: 0.18 }}
                style={{ padding: '16px 18px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{desc}</div>
                  <div style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>{tier}</div>
                </div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="landing-section">
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, fontSize: 12, color: 'var(--ember)', fontWeight: 600, marginBottom: 16 }}>
              <Star size={12} /> Tarifs simples
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', marginBottom: 12 }}>
              Commence <span className="ember-text serif">gratuitement</span>
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
              Tout ce dont tu as besoin pour performer est gratuit. Le Pro arrive bientôt pour ceux qui veulent plus.
            </p>
          </div>
        </FadeUp>
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, maxWidth: 780, margin: '0 auto' }}>
          {PLANS.map((plan, i) => (
            <FadeUp key={plan.nom} delay={i * 0.1}>
              <div style={{ position: 'relative', padding: 'clamp(24px,4vw,36px)', background: plan.highlight ? 'var(--surface-2)' : 'var(--surface-1)', border: plan.highlight ? '2px solid var(--ember)' : '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translate(-50%,-50%)', padding: '4px 16px', background: 'var(--ember)', borderRadius: 99, fontSize: 11, color: 'var(--text-on-ember)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                {plan.highlight && <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-xl)', background: 'radial-gradient(ellipse at 50% 0%, var(--ember-soft), transparent 60%)', pointerEvents: 'none' }} />}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: plan.highlight ? 'var(--ember)' : 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{plan.nom}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-2px' }}>{plan.prix}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{plan.periode}</span>
                  </div>
                </div>
                <div style={{ flex: 1, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
                      <CheckCircle size={14} color={plan.highlight ? 'var(--ember)' : 'var(--success)'} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={() => !plan.highlight && navigate('/register')}
                  whileHover={!plan.highlight ? { scale: 1.02 } : {}}
                  whileTap={!plan.highlight ? { scale: 0.97 } : {}}
                  style={{ width: '100%', padding: '13px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: plan.highlight ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', border: 'none', background: plan.highlight ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--ember), var(--ember-hover))', color: plan.highlight ? 'var(--text-tertiary)' : 'var(--text-on-ember)', boxShadow: plan.highlight ? 'none' : 'var(--shadow-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: plan.highlight ? 0.7 : 1 }}>
                  {plan.highlight ? '🔜 Bientôt' : <>{plan.cta} <ArrowRight size={15} /></>}
                </motion.button>
              </div>
            </FadeUp>
          ))}
        </div>
        <FadeUp delay={0.3}>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>
            Aucune carte bancaire requise · Annulation à tout moment · Le Pro arrivera lorsque tu seras prêt
          </p>
        </FadeUp>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(72px,10vw,120px) clamp(20px,5vw,80px)', background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
        <FadeUp>
          <GetShiftMark size={48} style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 'clamp(28px,5vw,56px)', fontWeight: 800, letterSpacing: '-2px', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.05, maxWidth: 700, margin: '0 auto 16px' }}>
            Prêt à passer au niveau supérieur ?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Rejoins GetShift — gratuit, sans CB, sans friction. Ton prochain streak commence maintenant.
          </p>
          <motion.button onClick={() => navigate('/register')} whileHover={{ scale: 1.04, filter: 'brightness(1.07)' }} whileTap={{ scale: 0.96 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', border: 'none', borderRadius: 14, color: 'var(--text-on-ember)', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 8px 32px -8px var(--ember)', marginBottom: 16 }}>
            Commencer gratuitement <ArrowRight size={18} />
          </motion.button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['Gratuit pour toujours', 'Sans carte bancaire', 'Données sécurisées'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                <CheckCircle size={12} color="var(--success)" /> {t}
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding: 'clamp(24px,4vw,36px) clamp(20px,5vw,80px)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GetShiftMark size={22} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>GetShift</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>© 2026 Hamdaane CHITOU</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            ['/#/cgu', 'CGU'],
            ['/#/confidentialite', 'Confidentialité'],
            ['/#/mentions-legales', 'Mentions légales'],
            ['mailto:chamdaane1@gmail.com', 'Contact'],
          ].map(([href, label]) => (
            <a key={label} href={href} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}

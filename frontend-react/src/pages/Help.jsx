import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import GetShiftLogoKick from '../components/GetShiftLogoKick'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import { useSidebarUser } from '../components/useSidebarUser'
import { GoogleCalendarLogo, GoogleDriveLogo, GmailLogo, NotionLogo } from '../components/BrandLogos'
import {
  Search, ArrowUpRight, Menu as MenuIcon, X,
  Rocket, CheckSquare, Calendar, Timer, Bot, Sunrise,
  BarChart2, Award, Plug, Settings as SettingsIcon, Lightbulb,
  HelpCircle, BookOpen, Sparkles, Bell, Mail,
  ChevronDown, Check, AlertTriangle, Info,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════
   STRUCTURE DOCUMENTAIRE
   ═══════════════════════════════════════════════════════════════════ */

const SECTIONS = [
  {
    id: 'demarrage', label: 'Démarrage', Icon: Rocket,
    sub: [
      { id: 'qu-est-ce-que-getshift', label: "Qu'est-ce que GetShift" },
      { id: 'premiers-pas', label: 'Premiers pas' },
      { id: 'installer-pwa', label: 'Installer comme app (PWA)' },
      { id: 'pwa-avantages', label: 'Pourquoi installer la PWA' },
    ],
  },
  {
    id: 'taches', label: 'Tâches', Icon: CheckSquare,
    sub: [
      { id: 'creer-tache', label: 'Créer une tâche' },
      { id: 'task-dna', label: 'Task DNA — analyse avant création' },
      { id: 'priorites-points', label: 'Priorités · deadlines · points' },
      { id: 'kanban', label: 'Vue Kanban' },
      { id: 'mode-focus', label: 'Mode focus' },
      { id: 'sources-logos', label: 'Sources Gmail · Drive · Calendar' },
    ],
  },
  {
    id: 'planification', label: 'Planification', Icon: Calendar,
    sub: [
      { id: 'calendrier', label: 'Vue calendrier' },
      { id: 'time-blocks', label: 'Time blocks' },
      { id: 'conflits', label: 'Conflits Calendar' },
      { id: 'planif-auto', label: 'Planification IA auto' },
    ],
  },
  {
    id: 'pomodoro', label: 'Pomodoro', Icon: Timer,
    sub: [
      { id: 'pomodoro-sessions', label: 'Sessions de travail' },
      { id: 'wake-lock', label: 'Wake Lock écran' },
    ],
  },
  {
    id: 'ia', label: 'Assistant IA', Icon: Bot,
    sub: [
      { id: 'ia-comment', label: 'Comment lui parler' },
      { id: 'ia-outils', label: 'Outils disponibles' },
      { id: 'ia-prompts', label: 'Exemples de prompts' },
    ],
  },
  {
    id: 'builders', label: 'Builders IA', Icon: Sunrise,
    sub: [
      { id: 'tomorrow-builder', label: 'Tomorrow Builder' },
      { id: 'goal-reverse', label: 'Goal Reverse' },
    ],
  },
  {
    id: 'analytics', label: 'Analytics', Icon: BarChart2,
    sub: [
      { id: 'metriques', label: 'Métriques clés' },
      { id: 'score-prod', label: 'Score de productivité' },
      { id: 'calibration', label: 'Calibration Task DNA' },
    ],
  },
  {
    id: 'progression', label: 'Progression', Icon: Award,
    sub: [
      { id: 'niveaux', label: 'Niveaux · 10 paliers' },
      { id: 'badges', label: 'Badges · 4 piliers' },
      { id: 'streaks', label: 'Streaks & Streak Freeze' },
    ],
  },
  {
    id: 'integrations', label: 'Intégrations', Icon: Plug,
    sub: [
      { id: 'integ-calendar', label: 'Google Calendar' },
      { id: 'integ-drive', label: 'Google Drive' },
      { id: 'integ-gmail', label: 'Gmail' },
      { id: 'integ-notion', label: 'Notion' },
      { id: 'integ-slack', label: 'Slack' },
    ],
  },
  {
    id: 'reglages', label: 'Réglages', Icon: SettingsIcon,
    sub: [
      { id: 'themes', label: 'Thèmes · Parchemin / Graphite' },
      { id: 'notifs', label: 'Notifications push' },
      { id: 'exports', label: 'Exports de données' },
      { id: 'securite', label: 'Sécurité' },
    ],
  },
  {
    id: 'bonnes-pratiques', label: 'Bonnes pratiques', Icon: Lightbulb,
    sub: [
      { id: 'bp-deep-work', label: 'Maximiser le deep work' },
      { id: 'bp-ia-prompts', label: "Tirer le max de l'IA" },
      { id: 'bp-progression', label: 'Construire sa progression' },
    ],
  },
  {
    id: 'faq', label: 'FAQ', Icon: HelpCircle,
    sub: [
      { id: 'faq-list', label: 'Questions fréquentes' },
    ],
  },
]

const SEARCH_INDEX = SECTIONS.flatMap(s =>
  s.sub.map(sub => ({
    sectionId: s.id, subId: sub.id, label: sub.label, parent: s.label,
    terms: `${s.label} ${sub.label}`.toLowerCase(),
  }))
)

/* ═══════════════════════════════════════════════════════════════════
   MOCKUPS — démonstrations visuelles inline
   ═══════════════════════════════════════════════════════════════════ */

function DemoFrame({ children, caption, height }) {
  return (
    <div style={{
      marginTop: 20, marginBottom: 12,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-1)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface-2)',
      }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#E07A3E' }} />
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#7A9778' }} />
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#C28748' }} />
        <span style={{
          marginLeft: 12, fontSize: 11, color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)', letterSpacing: 0.4,
        }}>{caption}</span>
      </div>
      <div style={{ padding: 18, height, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function MockTask({ done, prio, title, deadline, points }) {
  const prioColor = prio === 'haute' ? 'var(--danger)' : prio === 'moyenne' ? 'var(--warning)' : 'var(--info)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-2)',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 5,
        border: `1.5px solid ${done ? 'var(--ember)' : 'var(--border-default)'}`,
        background: done ? 'var(--ember)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {done && <Check size={11} color="#fff" strokeWidth={3} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.5 : 1,
        }}>{title}</div>
        <div style={{
          display: 'flex', gap: 12, marginTop: 4,
          fontSize: 11, color: 'var(--text-tertiary)',
        }}>
          <span style={{ color: prioColor, fontWeight: 600 }}>● {prio}</span>
          {deadline && <span>📅 {deadline}</span>}
          {points && <span style={{ color: 'var(--ember)' }}>+{points}pts</span>}
        </div>
      </div>
    </div>
  )
}

function MockChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 8,
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '9px 13px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--ember-soft)' : 'var(--surface-2)',
        border: `1px solid ${isUser ? 'var(--ember-ring)' : 'var(--border-subtle)'}`,
        fontSize: 12.5, lineHeight: 1.55,
        color: 'var(--text-primary)',
        whiteSpace: 'pre-line',
      }}>{text}</div>
    </div>
  )
}

function MockTimeBlock({ start, end, title, color = 'var(--ember)' }) {
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 6,
      background: `${color}22`,
      borderLeft: `3px solid ${color}`,
      fontSize: 11.5,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-tertiary)', marginBottom: 3,
      }}>{start} – {end}</div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{title}</div>
    </div>
  )
}

function MockKPI({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: 1, padding: '14px 16px',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-2)',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: 1,
        color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
        marginBottom: 8, textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 700,
        color: accent || 'var(--text-primary)',
        fontFamily: 'var(--font-ui)', letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>{sub}</div>
      )}
    </div>
  )
}

function MockBadge({ pillar, level, name, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-2)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}1a`, border: `1.5px solid ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{pillar}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '1px 6px', borderRadius: 4,
            background: `${color}22`, color,
            fontFamily: 'var(--font-mono)',
          }}>NIV. {level}</span>
        </div>
      </div>
    </div>
  )
}

function MockNotif({ title, body, when }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid var(--border-default)',
      background: 'var(--surface-1)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <GetShiftLogoKick markSize={28} showWord={false} showAccent={false} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{when}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  )
}

function Callout({ kind = 'info', children }) {
  const config = {
    info:    { color: 'var(--info)',    bg: 'var(--info-soft)',    Icon: Info },
    tip:     { color: 'var(--ember)',   bg: 'var(--ember-soft)',   Icon: Sparkles },
    warning: { color: 'var(--warning)', bg: 'var(--warning-soft)', Icon: AlertTriangle },
  }[kind]
  return (
    <div style={{
      display: 'flex', gap: 11,
      padding: '12px 14px',
      borderRadius: 10,
      background: config.bg,
      border: `1px solid ${config.color}33`,
      marginTop: 14, marginBottom: 14,
    }}>
      <config.Icon size={15} color={config.color} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  )
}

function Code({ children }) {
  return (
    <code style={{
      padding: '2px 6px',
      borderRadius: 4,
      background: 'var(--surface-3)',
      color: 'var(--ember)',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.9em',
    }}>{children}</code>
  )
}

function CodeBlock({ children }) {
  return (
    <pre style={{
      marginTop: 12, marginBottom: 12,
      padding: '12px 14px',
      borderRadius: 8,
      background: 'var(--surface-3)',
      border: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      color: 'var(--text-secondary)',
      lineHeight: 1.55,
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
    }}>{children}</pre>
  )
}

function P({ children }) {
  return (
    <p style={{
      fontSize: 14.5, lineHeight: 1.7,
      color: 'var(--text-secondary)', margin: '0 0 12px 0',
      fontFamily: 'var(--font-ui)',
    }}>{children}</p>
  )
}

function H3({ id, children }) {
  return (
    <h3 id={id} style={{
      fontSize: 18, fontWeight: 600,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-ui)',
      letterSpacing: '-0.015em',
      margin: '28px 0 6px 0',
      scrollMarginTop: 100,
    }}>{children}</h3>
  )
}

function SectionLead({ children }) {
  return (
    <p style={{
      fontSize: 16, lineHeight: 1.55,
      color: 'var(--text-secondary)', margin: '0 0 8px 0',
      maxWidth: 680,
    }}>{children}</p>
  )
}

function CTAButton({ to, children, navigate }) {
  return (
    <button onClick={() => navigate(to)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        marginTop: 4,
        padding: '8px 14px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        color: 'var(--text-primary)',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        transition: 'all 150ms var(--ease-out-quart)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ember)'; e.currentTarget.style.color = 'var(--ember)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-primary)' }}
    >
      {children} <ArrowUpRight size={13} strokeWidth={2} />
    </button>
  )
}

function Kbd({ children }) {
  return (
    <kbd style={{
      display: 'inline-block',
      padding: '1px 6px',
      minWidth: 18,
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-primary)',
      background: 'var(--surface-2)',
      border: '1px solid var(--border-default)',
      borderBottomWidth: 2,
      borderRadius: 4,
    }}>{children}</kbd>
  )
}

function DocSection({ id, Icon, eyebrow, title, lead }) {
  return (
    <section id={id} style={{
      marginTop: 64, paddingTop: 24,
      borderTop: '1px solid var(--border-subtle)',
      scrollMarginTop: 100,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--ember-soft)',
          border: '1px solid var(--ember-ring)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color="var(--ember)" strokeWidth={2} />
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
          color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}>{eyebrow}</span>
      </div>
      <h1 style={{
        fontSize: 'clamp(28px, 4vw, 42px)',
        fontWeight: 600,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        margin: '0 0 12px 0',
      }}>{title}</h1>
      <SectionLead>{lead}</SectionLead>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   FAQ DATA
   ═══════════════════════════════════════════════════════════════════ */

const FAQ_ITEMS_STATIC = null // moved to component (needs t())

/* ═══════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════════════ */

export default function Help() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const FAQ_ITEMS = useMemo(() => [
    { q: t('help.faq_q1'), r: t('help.faq_a1') },
    { q: t('help.faq_q2'), r: t('help.faq_a2') },
    { q: t('help.faq_q3'), r: t('help.faq_a3') },
    { q: t('help.faq_q4'), r: t('help.faq_a4') },
    { q: t('help.faq_q5'), r: t('help.faq_a5') },
    { q: t('help.faq_q6'), r: t('help.faq_a6') },
    { q: t('help.faq_q7'), r: t('help.faq_a7') },
    { q: t('help.faq_q8'), r: t('help.faq_a8') },
  ], [t])
  const { T } = useTheme()
  const isMobile = useMediaQuery('(max-width: 900px)')
  const { user, niveau, points, streak, niveauActuel, pctNiveau } = useSidebarUser()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [tocOpen, setTocOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState('demarrage')
  const [openFaq, setOpenFaq] = useState(null)
  const mainRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: [0.1, 0.5] }
    )
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const filteredSections = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return SEARCH_INDEX.filter(item => item.terms.includes(q))
  }, [search])

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (isMobile) setTocOpen(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-ui)',
      paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT + 20 : 0,
    }}>
      <AppSidebar
        T={T} user={user}
        niveau={niveau} points={points} streak={streak}
        niveauActuel={niveauActuel} pctNiveau={pctNiveau}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        toggleSidebar={() => setSidebarOpen(o => !o)} isMobile={isMobile} />
      {!isMobile && <SidebarToggle sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={() => setSidebarOpen(!sidebarOpen)} T={T} />}
      {!isMobile && <FloatingLogo sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={() => setSidebarOpen(true)} T={T} />}

      <div style={{
        marginLeft: !isMobile && sidebarOpen ? SIDEBAR_W : 0,
        transition: 'margin-left 220ms var(--ease-out-quart)',
      }}>

        {/* ─── TOP BAR ─────────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: isMobile ? '14px 16px' : '16px 28px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {isMobile && (
            <button onClick={() => setTocOpen(o => !o)}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <MenuIcon size={16} strokeWidth={2} />
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={18} color="var(--ember)" strokeWidth={2} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>Documentation</span>
          </div>
          <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
            <Search size={14} color="var(--text-tertiary)" strokeWidth={2}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('help.search_placeholder')}
              style={{
                width: '100%', padding: '8px 12px 8px 34px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'var(--font-ui)',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  width: 22, height: 22, borderRadius: 5,
                  background: 'var(--surface-2)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <X size={12} color="var(--text-tertiary)" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              try { localStorage.removeItem('getshift_tour_done') } catch {}
              navigate('/dashboard')
              setTimeout(() => window.dispatchEvent(new Event('getshift:start-tour')), 600)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'var(--ember-soft)', border: '1px solid var(--ember-ring, var(--ember))',
              borderRadius: 8, color: 'var(--ember)', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            <Sparkles size={14} strokeWidth={2} /> {t('tour.replay')}
          </button>
        </header>

        {/* ─── SEARCH RESULTS ──────────────────────────────────── */}
        {filteredSections && (
          <div style={{
            padding: isMobile ? '20px 16px' : '24px 28px',
            maxWidth: 760, margin: '0 auto',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 12 }}>
              {filteredSections.length > 1 ? t('help.search_results_plural', { n: filteredSections.length }) : t('help.search_results', { n: filteredSections.length })}
            </div>
            {filteredSections.length === 0 && (
              <P>{t('help.search_empty')}</P>
            )}
            {filteredSections.map(item => (
              <button key={`${item.sectionId}-${item.subId}`}
                onClick={() => { scrollTo(item.subId); setSearch('') }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 14px', marginBottom: 6,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{item.parent}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</div>
              </button>
            ))}
          </div>
        )}

        {/* ─── DOCS LAYOUT ─────────────────────────────────────── */}
        {!filteredSections && (
          <div style={{
            display: 'flex',
            maxWidth: 1280, margin: '0 auto',
            padding: isMobile ? '0' : '24px 28px',
            gap: 32,
          }}>

            {/* TOC SIDEBAR */}
            <aside style={{
              width: isMobile ? '100%' : 240,
              flexShrink: 0,
              position: isMobile ? 'fixed' : 'sticky',
              top: isMobile ? 0 : 100,
              left: isMobile ? 0 : 'auto',
              height: isMobile ? '100vh' : 'fit-content',
              maxHeight: isMobile ? '100vh' : 'calc(100vh - 120px)',
              zIndex: isMobile ? 50 : 1,
              background: isMobile ? 'var(--bg-base)' : 'transparent',
              overflowY: 'auto',
              padding: isMobile ? 'calc(60px + env(safe-area-inset-top)) 20px 20px' : 0,
              transform: isMobile ? (tocOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
              transition: 'transform 220ms var(--ease-out-quart)',
              borderRight: isMobile ? '1px solid var(--border-subtle)' : 'none',
            }}>
              {isMobile && (
                <button onClick={() => setTocOpen(false)}
                  style={{
                    position: 'absolute', top: 18, right: 18,
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <X size={14} />
                </button>
              )}
              {SECTIONS.map(section => (
                <div key={section.id} style={{ marginBottom: 18 }}>
                  <button onClick={() => scrollTo(section.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left',
                      padding: '6px 10px',
                      background: activeSection === section.id ? 'var(--ember-soft)' : 'transparent',
                      border: 'none', borderRadius: 6,
                      color: activeSection === section.id ? 'var(--ember)' : 'var(--text-primary)',
                      fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}>
                    <section.Icon size={14} strokeWidth={2} />
                    {section.label}
                  </button>
                  <div style={{ marginLeft: 30, marginTop: 2 }}>
                    {section.sub.map(sub => (
                      <button key={sub.id} onClick={() => scrollTo(sub.id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '4px 10px',
                          background: 'transparent', border: 'none',
                          color: 'var(--text-tertiary)',
                          fontSize: 12.5, cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                          transition: 'color 120ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
                      >{sub.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </aside>

            {/* MAIN CONTENT */}
            <main ref={mainRef} style={{
              flex: 1, minWidth: 0, maxWidth: 760,
              padding: isMobile ? '20px 16px 80px' : '0',
            }}>

              {/* ─── DÉMARRAGE ───────────────────────────────── */}
              <DocSection id="demarrage" Icon={Rocket} eyebrow={t('help.eyebrow_1')}
                title={t('help.title_1')}
                lead={t('help.lead_1')} />

              <H3 id="qu-est-ce-que-getshift">Qu'est-ce que GetShift</H3>
              <P>
                Un assistant de productivité avec une IA contextuelle qui connaît ton calendrier, ta progression
                et tes priorités. À la différence d'un Todoist ou d'un Notion, l'IA n'est pas un add-on — elle est
                le cœur du produit.
              </P>
              <Callout kind="tip">
                <strong>La règle qui guide tout GetShift :</strong> l'app répond à <em>tes</em> besoins — pas l'inverse.
                Aucun workflow forcé, aucun « happy path » obligatoire. L'IA propose, tu décides toujours.
              </Callout>
              <P>
                Le but unique : te rendre <strong>maximalement performant</strong>. Si une feature ne te rend pas plus performant,
                elle n'a rien à faire dans GetShift.
              </P>
              <P>Quatre piliers :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Tâches & projets</strong> — collection, priorités, deadlines, analyse de viabilité (Task DNA)</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Planification IA</strong> — time blocks auto qui respectent ton Calendar et ton rythme</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Assistant IA contextuel</strong> — un agent qui crée, analyse, planifie en langage naturel</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Progression mesurable</strong> — analytics, calibration, niveaux, badges, streaks</li>
              </ul>

              <H3 id="premiers-pas">Premiers pas</H3>
              <P>Trois étapes pour passer en mode productif :</P>
              <ol style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.8 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Connecte Google Calendar</strong> — Réglages → Intégrations. C'est la pièce maîtresse : sans, l'IA ne voit pas tes événements existants.</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Crée 5 à 10 tâches</strong> — donne du contexte à l'IA. Plus elle voit ta liste, mieux elle planifie.</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Demande à l'IA de planifier ta semaine</strong> — Page IA → <Code>« Planifie ma semaine en respectant mes meetings »</Code></li>
              </ol>
              <CTAButton to="/dashboard" navigate={navigate}>Aller au Dashboard</CTAButton>

              <H3 id="installer-pwa">Installer comme app (PWA)</H3>
              <P>
                GetShift est une <strong>Progressive Web App</strong> — la même app que tu utilises dans le navigateur peut s'installer comme une vraie application native sur <strong>iPhone, iPad, Android, Mac, Windows et Linux</strong>. Sans passer par l'App Store ni le Play Store, sans téléchargement, en 10 secondes.
              </P>
              <P>
                Une fois installée, elle apparaît sur ton écran d'accueil ou ton dock comme n'importe quelle app, s'ouvre en plein écran (sans la barre du navigateur), reçoit des notifications push, et fonctionne hors ligne pour les données déjà consultées.
              </P>

              <DemoFrame caption="ios safari — installer en 3 étapes">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🍎</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>iPhone / iPad — Safari</div>
                </div>
                <ol style={{ paddingLeft: 22, margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.85 }}>
                  <li>Ouvre GetShift dans <strong>Safari</strong> (pas Chrome ni Firefox — sur iOS, seul Safari sait installer une PWA).</li>
                  <li>Appuie sur l'icône <Code>⎙ Partager</Code> en bas de l'écran (carré avec flèche vers le haut).</li>
                  <li>Fais défiler le menu et touche <strong>« Sur l'écran d'accueil »</strong>.</li>
                  <li>Ajuste le nom si tu veux, puis touche <strong>« Ajouter »</strong> en haut à droite.</li>
                </ol>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  L'icône GetShift apparaît sur ton écran d'accueil. Touche-la pour ouvrir l'app en plein écran, sans barre Safari.
                </div>
              </DemoFrame>

              <DemoFrame caption="android — installer en 1 clic">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🤖</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Android — Chrome / Edge / Samsung Internet</div>
                </div>
                <ol style={{ paddingLeft: 22, margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.85 }}>
                  <li>Ouvre GetShift dans Chrome (ou Edge, ou Samsung Internet).</li>
                  <li>Une bannière <strong>« Installer l'application »</strong> apparaît en bas. Touche-la et confirme.</li>
                  <li>Ou bien : menu <Code>⋮</Code> en haut à droite → <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</li>
                </ol>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  GetShift s'installe comme une vraie app : tiroir d'applications, raccourci écran d'accueil, notifications push.
                </div>
              </DemoFrame>

              <DemoFrame caption="desktop — mac, windows, linux">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>💻</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Ordinateur — Chrome, Edge, Safari</div>
                </div>
                <ul style={{ paddingLeft: 22, margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.85 }}>
                  <li><strong>Chrome / Edge :</strong> icône <Code>⊕</Code> ou <Code>⊞</Code> à droite de la barre d'adresse → <strong>« Installer GetShift »</strong>.</li>
                  <li><strong>Safari (macOS Sonoma+) :</strong> menu <strong>Fichier</strong> → <strong>« Ajouter au Dock »</strong>.</li>
                  <li><strong>Firefox :</strong> pas de support natif. Reste en navigateur — fonctionne aussi très bien.</li>
                </ul>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  L'app s'ouvre dans sa propre fenêtre, avec son icône dans la barre des tâches / le dock.
                </div>
              </DemoFrame>

              <Callout kind="tip">
                Tu as déjà un raccourci dans <Code>Réglages → Notifications</Code> qui te propose l'installation en un bouton si ton navigateur le permet. Sur iOS, on t'affiche les 3 étapes inline puisque Safari ne donne pas d'API d'installation.
              </Callout>

              <H3 id="pwa-avantages">Pourquoi installer la PWA ?</H3>
              <ul style={{ paddingLeft: 22, marginBottom: 18, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.75 }}>
                <li><strong>Plein écran natif</strong> — fini la barre d'adresse, les onglets, les boutons retour du navigateur. L'app prend toute la place comme une vraie app iOS/Android.</li>
                <li><strong>Notifications push</strong> — rappels de deadline, Tomorrow Builder du soir, conflits Calendar : tu reçois les notifs même quand le navigateur est fermé.</li>
                <li><strong>Wake Lock Pomodoro</strong> — pendant une session focus, l'écran ne se met pas en veille. Tu vois le timer en permanence.</li>
                <li><strong>Hors ligne</strong> — l'interface et les dernières données chargées restent accessibles même sans connexion (lecture seule).</li>
                <li><strong>Démarrage instantané</strong> — cache local : l'app s'ouvre en &lt; 1s, même sur 3G.</li>
                <li><strong>Badge sur l'icône</strong> — sur certains OS, l'icône affiche un compteur de notifs non lues.</li>
                <li><strong>Toujours à jour</strong> — pas de mise à jour manuelle, l'app se rafraîchit toute seule en arrière-plan.</li>
              </ul>

              {/* ─── TÂCHES ─────────────────────────────────── */}
              <DocSection id="taches" Icon={CheckSquare} eyebrow={t('help.eyebrow_2')}
                title={t('help.title_2')}
                lead={t('help.lead_2')} />

              <H3 id="creer-tache">Créer une tâche</H3>
              <P>Quatre façons :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li>Dashboard → bouton « + » dans le HUD du jour</li>
                <li>Kanban → bouton « + » dans une colonne</li>
                <li>IA Chat → <Code>« Crée une tâche pour finir le rapport vendredi, priorité haute »</Code></li>
                <li>Bouton « + » flottant sur mobile (en bas à droite)</li>
              </ul>

              <DemoFrame caption="exemple — liste de tâches">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <MockTask done={false} prio="haute" title="Finaliser le rapport Q4" deadline="15 mai" points="30" />
                  <MockTask done={false} prio="moyenne" title="Préparer présentation client" deadline="18 mai" points="20" />
                  <MockTask done={true} prio="basse" title="Mettre à jour le CRM" points="10" />
                </div>
              </DemoFrame>

              <H3 id="task-dna">Task DNA — analyse avant création</H3>
              <P>
                Avant de créer une tâche, l'IA peut l'analyser et te donner un <strong>score de viabilité 0–100</strong>.
                C'est un signal — pas une censure. À toi de décider ensuite si tu crées la tâche, la reformules,
                ou la décomposes.
              </P>
              <P>Le Task DNA évalue quatre dimensions :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Clarté</strong> — la formulation est-elle assez précise pour qu'on sache quand c'est fait ?</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Atomicité</strong> — la tâche est-elle une seule action ou un projet déguisé ?</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Temps estimé</strong> — réaliste vs sous-estimé ?</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Contexte</strong> — manque-t-il une dépendance, une ressource, un prérequis ?</li>
              </ul>

              <DemoFrame caption="Task DNA — popup d'analyse">
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      border: '4px solid var(--warning)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--warning)', fontSize: 18,
                      flexShrink: 0,
                    }}>54</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Risquée — marge d'amélioration</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>« Préparer présentation »</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ember)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5, marginBottom: 6 }}>SUGGESTION DE REFORMULATION</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 10 }}>« Rédiger les 8 slides clés de la présentation client jeudi »</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>✓ FACTEURS DE SUCCÈS</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Deadline claire · Format défini</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>⚠ FACTEURS DE RISQUE</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Verbe vague · Pas de nb slides</div>
                    </div>
                  </div>
                </div>
              </DemoFrame>

              <P>
                Si le score est bas, accepter la reformulation suggérée en un clic. Tu peux toujours créer la
                tâche telle quelle si tu n'es pas d'accord — c'est ton outil, pas un examen.
              </P>

              <Callout kind="tip">
                Plus tu utilises Task DNA, plus la <strong>calibration</strong> de tes estimations s'affine —
                visible dans Analytics. À long terme, tu apprends à formuler tes tâches d'une façon qui te
                fait gagner du temps mentalement.
              </Callout>

              <H3 id="priorites-points">Priorités, deadlines, points</H3>
              <P>Le système de points est conçu pour récompenser le travail à forte valeur :</P>
              <div style={{
                display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 8,
                marginTop: 14, marginBottom: 14,
              }}>
                <MockKPI label="Haute" value="30 pts" sub="Bloque, urgent" accent="var(--danger)" />
                <MockKPI label="Moyenne" value="20 pts" sub="À traiter cette semaine" accent="var(--warning)" />
                <MockKPI label="Basse" value="10 pts" sub="Quand tu as le temps" accent="var(--info)" />
              </div>
              <Callout kind="tip">
                Une tâche en retard (deadline dépassée + non terminée) ne donne plus de points si tu la termines après échéance. C'est volontaire — l'IA détecte les retards et te le signale.
              </Callout>

              <H3 id="kanban">Vue Kanban</H3>
              <P>
                Trois colonnes par défaut — <strong>À faire · En cours · Terminé</strong>. Glisse-dépose entre colonnes,
                ou clique sur le bouton de statut de chaque carte pour la déplacer.
              </P>
              <P>
                Filtres disponibles : par priorité, par tag, par projet, par deadline (cette semaine /
                ce mois). Les filtres se cumulent.
              </P>

              <H3 id="mode-focus">Mode focus</H3>
              <P>
                Sélectionne 1 à 5 tâches « focus du jour ». Elles apparaissent en grand sur le Dashboard, masquant
                le reste. Le Pomodoro pré-fill avec la tâche focus en cours. Idéal pour bloquer les distractions.
              </P>

              <H3 id="sources-logos">Sources Gmail · Drive · Calendar</H3>
              <P>
                Quand une tâche provient d'une intégration — un email transformé en action via{' '}
                <strong>Tomorrow Builder</strong>, un événement Google Calendar importé, ou un fichier
                Drive — un petit logo apparaît sur la carte. Il est <strong>cliquable</strong> et te
                ramène directement à la source d'origine (l'email exact, l'event, le fichier).
              </P>
              <DemoFrame caption="logo cliquable sur une tâche issue de Gmail">
                <div style={{
                  background: 'var(--surface-1)', border: '1px solid var(--border-subtle)',
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border-subtle)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      Répondre à Marc — proposition contrat
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span style={{ background: 'rgba(224,138,60,0.12)', color: 'var(--ember)', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>haute</span>
                      <span className="source-link" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} title="Ouvrir l'email d'origine">
                        <GmailLogo size={12} />
                      </span>
                      <span>26 mai</span>
                    </div>
                  </div>
                </div>
              </DemoFrame>
              <P>
                <strong>4 sources visuellement reconnaissables</strong> :
              </P>
              <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap',
                margin: '8px 0 16px',
                fontSize: 13, color: 'var(--text-primary)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GmailLogo size={14} /> Gmail (email source)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GoogleDriveLogo size={14} /> Drive (fichier lié)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GoogleCalendarLogo size={14} /> Calendar (event importé)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NotionLogo size={14} /> Notion (page · sync inverse pour les to-do)
                </span>
              </div>
              <P>
                Au survol, le logo s'éclaircit légèrement — c'est un indice qu'il est interactif. Un
                clic ouvre la source dans un nouvel onglet. Aucune copie n'est stockée par GetShift :
                seul le lien est sauvegardé.
              </P>

              {/* ─── PLANIFICATION ──────────────────────────── */}
              <DocSection id="planification" Icon={Calendar} eyebrow={t('help.eyebrow_3')}
                title={t('help.title_3')}
                lead={t('help.lead_3')} />

              <H3 id="calendrier">Vue calendrier</H3>
              <P>
                Grille semaine, lundi au dimanche, 7h–23h par défaut (modifiable dans Réglages). Tes événements
                Google Calendar apparaissent en grisé hachuré <em>(non-draggable, lecture seule)</em>, tes time
                blocks GetShift en ember.
              </P>

              <DemoFrame caption="grille — lundi 09h-12h">
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 8, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    <span>09h</span><span>10h</span><span>11h</span><span>12h</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <MockTimeBlock start="09:00" end="10:30" title="Deep work — Rapport Q4" />
                    <div style={{
                      padding: '8px 10px', borderRadius: 6,
                      background: 'repeating-linear-gradient(45deg, rgba(160,163,155,0.1), rgba(160,163,155,0.1) 6px, transparent 6px, transparent 12px)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                    }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3 }}>10:30 – 11:00</div>
                      <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>📅 Calendar · Stand-up équipe</div>
                    </div>
                    <MockTimeBlock start="11:00" end="12:00" title="Préparer présentation" color="var(--info)" />
                  </div>
                </div>
              </DemoFrame>

              <H3 id="time-blocks">Time blocks</H3>
              <P>
                Lie une tâche à un créneau précis. Quand le créneau démarre, GetShift te notifie. Les blocks
                créés depuis GetShift sont automatiquement syncés vers Google Calendar (si Calendar connecté
                avec scope <Code>calendar</Code>).
              </P>

              <H3 id="conflits">Conflits Calendar</H3>
              <P>
                Si tu crées un time block qui chevauche un événement Calendar existant, un badge ⚠️ apparaît
                sur le block avec le titre de l'événement en conflit. À toi de décider : déplacer, raccourcir,
                ou ignorer.
              </P>

              <H3 id="planif-auto">Planification IA auto</H3>
              <P>
                Bouton 🪄 « Planifier auto » → l'IA récupère tes tâches non-terminées + ton agenda Calendar
                de la semaine, puis propose un planning :
              </P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li>Priorités hautes en matinée (créneau créatif)</li>
                <li>Admin et tâches courtes en fin de journée</li>
                <li>Max 6h de focus / jour</li>
                <li>Aucun chevauchement avec tes events Calendar</li>
              </ul>
              <CTAButton to="/planification" navigate={navigate}>Ouvrir la Planification</CTAButton>

              {/* ─── POMODORO ───────────────────────────────── */}
              <DocSection id="pomodoro" Icon={Timer} eyebrow={t('help.eyebrow_4')}
                title={t('help.title_4')}
                lead={t('help.lead_4')} />

              <H3 id="pomodoro-sessions">Sessions de travail</H3>
              <P>
                Cycle par défaut : <strong>25 min focus → 5 min pause</strong>. Modifiable dans Réglages
                (10/2, 50/10, 90/20…). À la fin de chaque session, une notification push s'affiche même
                si l'app est en arrière-plan.
              </P>

              <H3 id="wake-lock">Wake Lock écran</H3>
              <P>
                Pendant une session active, GetShift bloque la mise en veille de l'écran (API <Code>Screen Wake Lock</Code>).
                Plus de session interrompue parce que le téléphone s'est verrouillé. Désactivé automatiquement à la fin
                de la session ou en arrière-plan.
              </P>

              {/* ─── IA ─────────────────────────────────────── */}
              <DocSection id="ia" Icon={Bot} eyebrow={t('help.eyebrow_5')}
                title={t('help.title_5')}
                lead={t('help.lead_5')} />

              <H3 id="ia-comment">Comment lui parler</H3>
              <P>
                Pas de commandes spéciales, pas de syntaxe. Langage naturel direct. L'IA garde le contexte
                de la conversation et accède à ton état complet (tâches, agenda, profil).
              </P>

              <DemoFrame caption="conversation typique">
                <MockChatBubble role="user" text="Planifie ma semaine en évitant mes meetings Calendar" />
                <MockChatBubble role="ai" text={`J'ai analysé ton agenda : 14h de créneaux libres cette semaine.

• Lun 9h–11h — Rapport Q4 (haute priorité, deadline jeudi)
• Mar 14h–16h — Présentation client
• Jeu 10h–12h — Revue projet design

Tu veux que j'applique ces time blocks ?`} />
                <MockChatBubble role="user" text="Oui, et programme un Pomodoro pour la première session" />
                <MockChatBubble role="ai" text={`✓ 3 time blocks créés et syncés sur ton Calendar
✓ Pomodoro pré-rempli — démarrera quand tu cliques sur la tâche lundi 9h`} />
              </DemoFrame>

              <H3 id="ia-outils">Outils disponibles</H3>
              <P>L'IA dispose des outils suivants — elle choisit lesquels utiliser selon ta demande :</P>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 12, marginBottom: 14 }}>
                {[
                  { label: 'create_task',        desc: 'Crée une tâche complète' },
                  { label: 'update_task',        desc: 'Modifie titre / priorité / deadline' },
                  { label: 'analyser_task_dna',  desc: 'Évalue la viabilité d\'une tâche (Task DNA)' },
                  { label: 'schedule_block',     desc: 'Pose un time block' },
                  { label: 'analyze_week',       desc: 'Bilan rétrospectif' },
                  { label: 'naviguer_vers',      desc: 'T\'amène sur une page' },
                  { label: 'team_query',         desc: 'Données équipe (si team)' },
                  { label: 'search_web',         desc: 'Recherche externe ciblée' },
                ].map(t => (
                  <div key={t.label} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ember)', fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              <H3 id="ia-prompts">Exemples de prompts efficaces</H3>
              <CodeBlock>{`Planifie ma semaine en bloquant 2h le matin pour le projet client X
Crée 5 tâches pour préparer mon entretien vendredi : recherche, questions, tenue, repérage trajet, debrief
Quelles tâches haute priorité je peux finir avant 16h aujourd'hui ?
Analyse ma productivité de la semaine dernière, identifie 2 points d'amélioration
Quels meetings Calendar n'ont pas de tâche de préparation associée ?
Crée un Goal Reverse pour "publier mon article de blog d'ici fin du mois"`}</CodeBlock>

              <CTAButton to="/ia" navigate={navigate}>Ouvrir le chat IA</CTAButton>

              {/* ─── BUILDERS ───────────────────────────────── */}
              <DocSection id="builders" Icon={Sunrise} eyebrow={t('help.eyebrow_6')}
                title={t('help.title_6')}
                lead={t('help.lead_6')} />

              <H3 id="tomorrow-builder">Tomorrow Builder</H3>
              <P>
                À ouvrir en fin de journée. L'IA fait un récap de tes tâches accomplies, lit ton Calendar
                pour demain, et propose 3 à 5 priorités du lendemain. Tu valides ou ajustes — les tâches
                sont automatiquement marquées « focus du jour ».
              </P>
              <CTAButton to="/tomorrow" navigate={navigate}>Ouvrir Tomorrow Builder</CTAButton>

              <H3 id="goal-reverse">Goal Reverse</H3>
              <P>
                À ouvrir en début de mois ou de projet. Tu donnes un objectif (« lancer mon side-project »,
                « publier 4 articles ce trimestre »). L'IA le décompose en étapes hebdomadaires, puis en
                tâches concrètes avec deadlines suggérées.
              </P>
              <Callout kind="tip">
                Goal Reverse fonctionne mieux avec un objectif <strong>mesurable et délimité dans le temps</strong>.
                « Devenir meilleur en design » → trop flou. « Compléter 3 cours Figma d'ici fin août » → ça marche.
              </Callout>
              <CTAButton to="/goals" navigate={navigate}>Ouvrir Goal Reverse</CTAButton>

              {/* ─── ANALYTICS ──────────────────────────────── */}
              <DocSection id="analytics" Icon={BarChart2} eyebrow={t('help.eyebrow_7')}
                title={t('help.title_7')}
                lead={t('help.lead_7')} />

              <H3 id="metriques">Métriques clés</H3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 8, marginTop: 14, marginBottom: 14 }}>
                <MockKPI label="Taux complétion" value="84%" sub="↑ 12% vs sem. passée" accent="var(--success)" />
                <MockKPI label="Tâches Haute" value="11" sub="cette semaine" accent="var(--ember)" />
                <MockKPI label="Temps focus" value="22h" sub="↑ 4h vs moyenne" accent="var(--info)" />
                <MockKPI label="Streak" value="14 j" sub="Record : 21 j" accent="#C28748" />
              </div>

              <H3 id="score-prod">Score de productivité</H3>
              <P>
                Un score 0–100 par jour, combinant : tâches complétées (pondérées par priorité), respect des
                time blocks, ratio focus/admin, jour consécutif (streak). Pas une note morale — un signal pour
                identifier tes jours-types et corriger les patterns qui ne marchent pas.
              </P>

              <H3 id="calibration">Calibration Task DNA</H3>
              <P>
                À mesure que tu termines des tâches en notant leur temps réel, GetShift mesure ta capacité à
                <strong> estimer correctement</strong>. C'est une compétence — qui s'améliore avec la pratique.
              </P>
              <P>
                Tu vois trois choses dans la carte Task DNA Analytics :
              </P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Calibration globale</strong> — % de tes tâches dont le temps réel est ≤ 1.2× l'estimation</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Tâches sous-estimées</strong> — celles où tu prends 2× plus de temps que prévu (typique : tâches créatives)</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Tâches sur-estimées</strong> — celles où tu vas plus vite que prévu (typique : tâches admin)</li>
              </ul>
              <Callout kind="tip">
                Au bout de 30 jours d'usage régulier, ta calibration devrait dépasser 70%. C'est un gain concret :
                tu peux planifier ta semaine avec confiance.
              </Callout>

              <CTAButton to="/analytics" navigate={navigate}>Voir Analytics</CTAButton>

              {/* ─── PROGRESSION ────────────────────────────── */}
              <DocSection id="progression" Icon={Award} eyebrow={t('help.eyebrow_8')}
                title={t('help.title_8')}
                lead={t('help.lead_8')} />

              <H3 id="niveaux">Niveaux · 10 paliers</H3>
              <P>
                Ton niveau global passe de <strong>Apprenti</strong> à <strong>Légende</strong> selon tes points cumulés.
                Chaque palier débloque un titre + une nouvelle skin Profil. Les niveaux ne se perdent pas.
              </P>

              <H3 id="badges">Badges · 4 piliers</H3>
              <P>4 piliers indépendants, chacun avec ses propres badges progressifs :</P>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, marginBottom: 14 }}>
                <MockBadge pillar="⚡" name="Constance" level={3} color="#E07A3E" />
                <MockBadge pillar="🎯" name="Focus" level={2} color="#6B89A6" />
                <MockBadge pillar="🚀" name="Volume" level={4} color="#7A9778" />
                <MockBadge pillar="🧠" name="IA Mastery" level={1} color="#C28748" />
              </div>

              <H3 id="streaks">Streaks & Streak Freeze</H3>
              <P>
                Une <strong>streak</strong> = nombre de jours consécutifs avec au moins une tâche terminée.
                Un <strong>Streak Freeze</strong> protège ta série si tu rates un jour : il s'utilise automatiquement.
                Tu en gagnes 1 par semaine de productivité élevée (&gt;70% tâches Haute complétées). Max 3 stockés.
              </P>

              <CTAButton to="/profile" navigate={navigate}>Ouvrir ton Profil</CTAButton>

              {/* ─── INTÉGRATIONS ───────────────────────────── */}
              <DocSection id="integrations" Icon={Plug} eyebrow={t('help.eyebrow_9')}
                title={t('help.title_9')}
                lead={t('help.lead_9')} />

              <H3 id="integ-calendar">Google Calendar</H3>
              <P>
                <strong>Sync bidirectionnelle.</strong> Les events Calendar apparaissent dans la Planification GetShift,
                et les time blocks GetShift sont créés/mis à jour/supprimés sur Calendar en temps réel
                (via webhooks). Scope OAuth requis : <Code>calendar</Code> (read + write).
              </P>
              <P>L'IA utilise Calendar pour :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li>Détecter les créneaux libres pour planifier</li>
                <li>Éviter les conflits lors du time blocking</li>
                <li>Identifier les meetings sans tâche de préparation</li>
                <li>Proposer un récap matin avec ton agenda du jour</li>
              </ul>

              <H3 id="integ-drive">Google Drive</H3>
              <P>
                Lie un fichier Drive à une tâche (icône 📎 sur chaque carte). Le fichier devient accessible
                en un clic depuis la tâche. Aucun fichier n'est copié — seul le lien est stocké.
              </P>

              <H3 id="integ-gmail">Gmail</H3>
              <P>
                Sur un email reçu, l'IA peut extraire l'action sous-jacente et la transformer en tâche
                (avec deadline si mentionnée). Bouton « Transformer en tâche » sur les emails analysés.
                Aucun email n'est lu de façon automatisée sans ton action.
              </P>

              <H3 id="integ-notion">Notion</H3>
              <P>
                Intégration en deux temps — <strong>lecture intelligente</strong> + <strong>sync inverse</strong>{' '}
                des cases cochées. Connecte via Réglages → Intégrations → Notion (OAuth officiel).
              </P>
              <P>
                <strong>1. Extraction</strong> (depuis Tomorrow Builder) — GetShift lit tes pages les plus
                récentes et en extrait deux types de candidats :
              </P>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.18)', color: '#16a34a', flexShrink: 0 }}>✓ TO-DO</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Les <strong>cases à cocher Notion non cochées</strong> sont importées telles quelles.
                    Précision quasi-parfaite. Bonus : quand tu termines la tâche dans GetShift, la case
                    Notion est <strong>cochée automatiquement</strong>.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(15,23,42,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(15,23,42,0.1)', color: 'var(--text-secondary)', flexShrink: 0 }}>IA</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    L'IA lit aussi les <strong>paragraphes, titres et listes</strong> pour détecter
                    des actions implicites ("Préparer le doc X", "Répondre à Y"). Pas de sync inverse —
                    on importe juste comme nouvelle tâche.
                  </span>
                </div>
              </div>
              <P>
                <strong>2. Filtre source</strong> — par défaut, on scanne les pages éditées récemment dans
                tout ton workspace. Tu peux restreindre à <strong>une seule base de données Notion</strong>{' '}
                (ex: ta DB "Todo" ou "Project tasks") via le dropdown dans Tomorrow Builder. Le choix est
                mémorisé.
              </P>
              <P>
                <strong>3. Dédup</strong> — un to-do importé ne sera plus jamais re-proposé, même si tu
                relances le scan. Idem pour les actions implicites au niveau page. Si tu décoches la case
                dans GetShift, la case Notion est <strong>dé-cochée en retour</strong>.
              </P>
              <Callout kind="info">
                <strong>Permissions Notion</strong> — au moment de l'OAuth, Notion te demande quelles pages
                tu autorises à partager avec GetShift. Choisis ton workspace de travail, ou une sélection
                de pages/databases précises si tu veux limiter le scope.
              </Callout>

              <H3 id="integ-slack">Slack</H3>
              <P>
                Webhook entrant : reçois les rappels de tâches dans le canal Slack de ton choix.
                Configuration via Réglages → Intégrations → Slack → URL webhook (créée dans ton workspace Slack).
              </P>
              <Callout kind="warning">
                Slack utilise un webhook (pas OAuth) — c'est intentionnel pour éviter de demander des permissions
                lecture/écriture inutiles sur ton workspace. Contrepartie : les messages sont sortants uniquement.
              </Callout>

              <CTAButton to="/settings" navigate={navigate}>Gérer mes intégrations</CTAButton>

              {/* ─── RÉGLAGES ───────────────────────────────── */}
              <DocSection id="reglages" Icon={SettingsIcon} eyebrow={t('help.eyebrow_10')}
                title={t('help.title_10')}
                lead={t('help.lead_10')} />

              <H3 id="themes">Thèmes · Parchemin / Graphite</H3>
              <P>Deux thèmes <strong>Graphite & Ember</strong> exclusivement, conçus pour le deep work :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Parchemin</strong> (light) — fond papier japonais <Code>#F4F1EB</Code>, accent ember</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Graphite</strong> (dark) — fond minéral <Code>#0E1011</Code>, ember chaud</li>
              </ul>
              <P>Pas de thème système auto — tu choisis. Préférence sauvegardée par compte.</P>

              <H3 id="notifs">Notifications push</H3>
              <P>Trois canaux :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Rappels deadline</strong> — 24h avant, 2h avant, à l'heure</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Récap quotidien</strong> — 8h00 chaque matin</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Alertes priorité haute</strong> — quand une tâche Haute est créée par l'IA ou un coéquipier</li>
              </ul>
              <DemoFrame caption="exemples — notifications">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <MockNotif title="GetShift" when="il y a 5 min" body="Rapport Q4 — deadline dans 2h. Time-block 14h–16h ?" />
                  <MockNotif title="GetShift" when="08:00" body="Récap du matin : 3 tâches prioritaires, 2 réunions Calendar." />
                </div>
              </DemoFrame>

              <H3 id="exports">Exports de données</H3>
              <P>
                Un seul clic pour télécharger l'intégralité de tes données GetShift au format <strong>JSON</strong> (tâches,
                objectifs, planning, badges, intégrations). Aucune limite de fréquence.
              </P>

              <H3 id="securite">Sécurité</H3>
              <P>
                Modification du mot de passe depuis Réglages → Compte. Tokens d'intégrations OAuth chiffrés Fernet côté serveur —
                jamais loggés. Suppression de compte disponible sur demande.
              </P>
              <CTAButton to="/settings" navigate={navigate}>Ouvrir Réglages</CTAButton>

              {/* ─── BONNES PRATIQUES ───────────────────────── */}
              <DocSection id="bonnes-pratiques" Icon={Lightbulb} eyebrow={t('help.eyebrow_11')}
                title={t('help.title_11')}
                lead={t('help.lead_11')} />

              <H3 id="bp-deep-work">Maximiser le deep work</H3>
              <P>
                Time-bloque tes tâches haute priorité <strong>le matin</strong> (ou ton créneau créatif, paramétré dans
                ton profil). Les tâches admin courtes (réponse email, mise à jour CRM, etc.) en fin de journée
                quand la charge cognitive est plus faible.
              </P>
              <P>
                Ne fais pas plus de <strong>6h de focus par jour</strong>. Au-delà, la qualité chute. L'IA en
                planification auto respecte cette limite — fais-en autant manuellement.
              </P>
              <Callout kind="tip">
                Démarre un Pomodoro dès que tu ouvres une tâche focus. La friction réduite (un clic) fait
                toute la différence entre démarrer et procrastiner.
              </Callout>

              <H3 id="bp-ia-prompts">Tirer le max de l'IA</H3>
              <P>L'IA est bonne quand tu lui donnes du contexte. Quelques principes :</P>
              <ul style={{ paddingLeft: 22, marginBottom: 14, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.7 }}>
                <li><strong style={{ color: 'var(--text-primary)' }}>Sois concret</strong> — « planifie ma semaine » est moins efficace que « planifie ma semaine en gardant lundi matin pour le rapport Q4 »</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Donne le pourquoi</strong> — « crée 3 tâches préparation entretien » devient meilleur avec « pour un poste de PM dans une scale-up SaaS »</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Demande une analyse avant d'agir</strong> — « quelles tâches je dois absolument finir cette semaine ? » avant « planifie-moi ces tâches »</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Itère</strong> — si la première proposition ne convient pas, dis pourquoi : « refais en mettant l'admin en fin de semaine »</li>
              </ul>

              <H3 id="bp-progression">Construire sa progression</H3>
              <P>
                Les <strong>streaks comptent plus que les points</strong>. Une tâche par jour pendant 30 jours
                te fera bien plus progresser que 30 tâches en un week-end suivi de 4 jours d'inactivité.
              </P>
              <P>
                Le <strong>Streak Freeze</strong> n'est pas une triche — c'est un filet de sécurité. Si tu
                cumules une mauvaise journée + un jour off légitime (maladie, vacances), il préserve ta
                régularité psychologique. Utilise-le sans culpabilité.
              </P>
              <Callout kind="tip">
                Une fois par semaine, ouvre <strong>Analytics</strong> pour 5 minutes. Pas pour les chiffres en soi
                — pour identifier un pattern : quel jour tu es le plus productif, quelle catégorie de tâches tu
                procrastines le plus, etc. Ces insights orientent la semaine suivante.
              </Callout>

              {/* ─── FAQ ────────────────────────────────────── */}
              <DocSection id="faq" Icon={HelpCircle} eyebrow={t('help.eyebrow_12')}
                title={t('help.title_12')}
                lead={t('help.lead_12')} />

              <div id="faq-list" style={{ marginTop: 24, scrollMarginTop: 100 }}>
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '14px 0',
                        background: 'transparent', border: 'none',
                        color: 'var(--text-primary)', fontSize: 14.5, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left',
                      }}>
                      <span>{item.q}</span>
                      <ChevronDown size={16}
                        style={{
                          transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 180ms var(--ease-out-quart)',
                          color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 14,
                        }} />
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: 'hidden' }}>
                          <div style={{
                            padding: '0 0 18px 0', fontSize: 14, lineHeight: 1.65,
                            color: 'var(--text-secondary)',
                          }}>{item.r}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Footer CTA */}
              <div style={{
                marginTop: 60, marginBottom: 40,
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <GetShiftLogoKick markSize={40} showWord={false} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 6, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                  Quelque chose manque ?
                </div>
                <P>
                  Cette documentation est vivante. Si tu cherches une fonctionnalité et que tu ne la trouves pas ici,
                  écris-nous — ça nous indique ce qu'on doit améliorer.
                </P>
                <a href="mailto:chamdaane@gmail.com"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    marginTop: 6,
                    padding: '9px 18px',
                    background: 'var(--ember)', color: 'var(--text-on-ember)',
                    border: 'none', borderRadius: 8,
                    fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
                    boxShadow: 'var(--shadow-ember)',
                  }}>
                  <Mail size={14} strokeWidth={2} /> chamdaane@gmail.com
                </a>
              </div>

            </main>
          </div>
        )}

      </div>

      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}

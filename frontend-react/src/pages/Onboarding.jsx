import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  X, ArrowRight, ArrowLeft,
  Check, Bell, Sparkles,
  Sun, Sunset, Moon,
  Briefcase, GraduationCap, Heart, Zap,
  User, Users, Building2, Shuffle,
  Layers, Clock4, Target, Hourglass,
} from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

/* ═══════════════════════════════════════════════════════════════════
   BRAND LOGOS — SVG inline officiels
   ═══════════════════════════════════════════════════════════════════ */

const GetShiftMark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--ember-hover, #E07A3E)" />
        <stop offset="100%" stopColor="var(--ember, #B8521C)" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#gs-grad)" />
    <path
      d="M 22 22 L 38 22 Q 42 22 42 26 Q 42 30 38 30 L 26 30 Q 22 30 22 34 L 22 42 Q 22 46 26 46 L 38 46 Q 42 46 42 42"
      stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    <circle cx="42" cy="42" r="2.5" fill="white" />
  </svg>
)

const GoogleCalendarLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#fff" d="M37 9H11a2 2 0 0 0-2 2v26a2 2 0 0 0 2 2h26a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2z"/>
    <path fill="#1A73E8" d="M22.677 27.245c-.526-.355-.891-.875-1.092-1.558l1.336-.55c.112.427.308.758.589.992.279.235.618.351 1.016.351.406 0 .754-.123 1.043-.371.289-.247.434-.562.434-.943 0-.39-.152-.708-.456-.955-.305-.246-.687-.37-1.143-.37h-.772v-1.322h.693c.393 0 .724-.106.992-.319.27-.213.404-.504.404-.875 0-.331-.121-.594-.362-.79-.241-.197-.547-.296-.917-.296a1.43 1.43 0 0 0-.892.288 1.7 1.7 0 0 0-.527.71l-1.322-.55c.18-.51.51-.96.994-1.347.484-.388 1.102-.583 1.852-.583.555 0 1.054.107 1.497.32.444.213.792.51 1.045.886.252.376.378.798.378 1.267 0 .478-.115.882-.346 1.214a2.38 2.38 0 0 1-.851.776v.079c.401.169.745.42 1.024.764.281.343.421.755.421 1.236 0 .482-.122.913-.366 1.291a2.5 2.5 0 0 1-1.012.886c-.43.216-.913.325-1.451.325-.622.001-1.196-.177-1.722-.531zM30.625 21.969l-1.466 1.06-.733-1.112 2.629-1.895h1.008v8.937h-1.438v-6.991z"/>
    <path fill="#EA4335" d="M37 9H11a2 2 0 0 0-2 2v8h30v-8a2 2 0 0 0-2-2z"/>
    <path fill="#34A853" d="M39 39v-8H9v8a2 2 0 0 0 2 2h26a2 2 0 0 0 2-2z"/>
    <path fill="#FBBC04" d="M9 19h30v12H9z"/>
    <path fill="#188038" d="M9 31h30v8H9z"/>
    <path fill="#1967D2" d="M39 11v8h-4v-8h4z"/>
    <path fill="#fff" d="M11 7v6m26-6v6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const GoogleDriveLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M17 6h14l13 22.5L31 51H17L4 28.5z"/>
    <path fill="#1976D2" d="M44 28.5L31 51H17l7-12h20z"/>
    <path fill="#4CAF50" d="M4 28.5L17 6h14l-7 12z"/>
    <path fill="#388E3C" d="M24 18l-7 12 7 12 7-12z" opacity=".25"/>
    <path fill="#1565C0" d="M44 28.5L31 6l-7 12 13 22.5z" opacity=".15"/>
  </svg>
)

const GmailLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M6 38h7V18L3 10.5V35a3 3 0 0 0 3 3z"/>
    <path fill="#34A853" d="M35 38h7a3 3 0 0 0 3-3V10.5L35 18z"/>
    <path fill="#FBBC04" d="M35 13v25l10-7.5V10.5a3 3 0 0 0-3-3h-2.34z"/>
    <path fill="#EA4335" d="M6 13l29 22V13L24 21z"/>
    <path fill="#C5221F" d="M3 10.5V13l10 7.5V13l-4.5-3.34A3 3 0 0 0 3 10.5z"/>
  </svg>
)

const NotionLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="10" fill="#FFFFFF"/>
    <path d="M16 13l4-.4 14 11V47l-6-2V20l-12-1z" stroke="#000" strokeWidth="2" fill="#000"/>
    <path d="M16 13v33l5 2V20l-5-7z" fill="#000"/>
    <path d="M44 17v23l4 2V19l-4-2z" fill="#000"/>
    <path d="M48 14l-4 3v25l-7-3V21l-9-7 9-2 11 2z" fill="#000"/>
  </svg>
)

const SlackLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#E01E5A" d="M14.5 28.5a3 3 0 1 1-3-3h3v3zm1.5 0a3 3 0 1 1 6 0v7.5a3 3 0 1 1-6 0v-7.5z"/>
    <path fill="#36C5F0" d="M19 14.5a3 3 0 1 1 3-3v3h-3zm0 1.5a3 3 0 1 1 0 6h-7.5a3 3 0 1 1 0-6H19z"/>
    <path fill="#2EB67D" d="M33.5 19a3 3 0 1 1 3 3h-3v-3zm-1.5 0a3 3 0 1 1-6 0v-7.5a3 3 0 1 1 6 0V19z"/>
    <path fill="#ECB22E" d="M29 33.5a3 3 0 1 1-3 3v-3h3zm0-1.5a3 3 0 1 1 0-6h7.5a3 3 0 1 1 0 6H29z"/>
  </svg>
)

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const INTEGRATIONS = [
  { id: 'google_calendar', nom: 'Google Calendar', desc: 'Sync bidirectionnelle · time blocks IA',
    Logo: GoogleCalendarLogo, oauthPath: '/integrations/google-calendar/start' },
  { id: 'google_drive', nom: 'Google Drive', desc: 'Lie tes fichiers à tes tâches',
    Logo: GoogleDriveLogo, oauthPath: '/integrations/google-drive/start' },
  { id: 'gmail', nom: 'Gmail', desc: 'Transforme tes emails en actions',
    Logo: GmailLogo, oauthPath: '/integrations/gmail/start' },
  { id: 'notion', nom: 'Notion', desc: 'Synchronise notes et bases de données',
    Logo: NotionLogo, oauthPath: '/integrations/notion/start' },
  { id: 'slack', nom: 'Slack', desc: 'Alertes de tâches dans tes canaux',
    Logo: SlackLogo, oauthPath: null },
]

const RYTHMES = [
  { val: 'matin', Icon: Sun,    label: 'Matin',       desc: 'Avant 12h' },
  { val: 'apres', Icon: Sunset, label: 'Après-midi',  desc: '12h – 18h' },
  { val: 'soir',  Icon: Moon,   label: 'Soir',        desc: 'Après 18h' },
]

const USAGES = [
  { val: 'pro',    Icon: Briefcase,      label: 'Travail',   desc: 'Projets pro, deadlines clients' },
  { val: 'etudes', Icon: GraduationCap,  label: 'Études',    desc: 'Cours, examens, recherche' },
  { val: 'perso',  Icon: Heart,          label: 'Personnel', desc: 'Objectifs perso, habitudes' },
  { val: 'mixte',  Icon: Zap,            label: 'Mixte',     desc: 'Tout à la fois' },
]

const TEAMS = [
  { val: 'solo',    Icon: User,       label: 'Solo',      desc: 'Tu travailles seul' },
  { val: 'petite',  Icon: Users,      label: 'Petite éq.', desc: '2 à 5 personnes' },
  { val: 'grande',  Icon: Building2,  label: 'Grande éq.', desc: '6 personnes ou +' },
  { val: 'variable',Icon: Shuffle,    label: 'Variable',   desc: 'Ça dépend des projets' },
]

const CHALLENGES = [
  { val: 'surcharge',     Icon: Layers,    label: 'Surcharge',      desc: 'Trop de choses à gérer en même temps' },
  { val: 'procrastination', Icon: Clock4,  label: 'Procrastination',desc: 'Difficulté à démarrer ou à finir' },
  { val: 'focus',         Icon: Target,    label: 'Focus',          desc: 'Distractions, contexte switching' },
  { val: 'estimation',    Icon: Hourglass, label: 'Estimation',     desc: 'Mauvaise gestion du temps réel' },
]

const ETAPES_CONFIG = [
  { id: 'bienvenue' },
  { id: 'integrations' },
  { id: 'profil_rythme' },
  { id: 'profil_travail' },
  { id: 'ia' },
  { id: 'notifs' },
  { id: 'fin' },
]

const FEATURES_HERO = [
  'Tâches, deadlines, priorités — collectées dans un seul espace.',
  'Agent IA contextuel qui connaît ton calendrier et ta progression.',
  'Goal Reverse — un objectif devient un plan d\'action par étapes.',
  'Analytics temps réel sur ta productivité, sans bullshit.',
]

const CHAT_DEMO = [
  { role: 'user', text: 'Planifie-moi cette semaine en évitant mes meetings Calendar' },
  { role: 'ai', text: 'J\'ai analysé ton agenda : 14h de créneaux libres. Voici ma proposition :\n• Lun 9h–11h — Deadline rapport (priorité haute)\n• Mar 14h–16h — Préparer présentation\n• Jeu 10h–12h — Revue projet design\n\nTu veux que j\'applique ?' },
]

/* ═══════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════ */

function useIsMobile() {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 760)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 760)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function ProgressBar({ idx, total }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--text-tertiary)', letterSpacing: 0.5,
    }}>
      <span style={{ fontWeight: 600 }}>{String(idx + 1).padStart(2, '0')}</span>
      <div style={{
        width: 120, height: 2, background: 'var(--border-subtle)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <motion.div
          style={{ height: '100%', background: 'var(--ember)', transformOrigin: 'left' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (idx + 1) / total }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span>{String(total).padStart(2, '0')}</span>
    </div>
  )
}

function BrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <GetShiftMark size={28} />
      <span style={{
        fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
        fontFamily: 'var(--font-ui)', letterSpacing: '-0.02em',
      }}>GetShift</span>
    </div>
  )
}

function IntegrationRow({ integ, connectee, loading, onConnect }) {
  return (
    <motion.button
      onClick={() => !connectee && !loading && onConnect(integ)}
      disabled={connectee}
      whileHover={!connectee ? { y: -1 } : undefined}
      whileTap={!connectee ? { scale: 0.995 } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        width: '100%', padding: '14px 18px',
        background: 'var(--surface-1)',
        border: `1px solid ${connectee ? 'var(--ember)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: connectee ? 'default' : 'pointer',
        textAlign: 'left', transition: 'border-color 180ms var(--ease-out-quart)',
        position: 'relative',
      }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <integ.Logo size={32} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em',
        }}>{integ.nom}</div>
        <div style={{
          fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2,
          fontFamily: 'var(--font-ui)',
        }}>{integ.desc}</div>
      </div>
      {connectee ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--ember)', fontWeight: 600,
        }}>
          <Check size={14} strokeWidth={2.5} /> Connecté
        </div>
      ) : loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--ember)',
          }} />
      ) : (
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {integ.oauthPath ? 'Connecter' : 'Configurer'} <ArrowRight size={13} strokeWidth={2} />
        </div>
      )}
    </motion.button>
  )
}

function SelectionCard({ active, onClick, Icon, label, desc, compact }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      style={{
        flex: 1, padding: compact ? '14px 14px' : '18px 16px',
        background: active ? 'var(--ember-soft)' : 'var(--surface-1)',
        border: `1px solid ${active ? 'var(--ember)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all 180ms var(--ease-out-quart)',
        boxShadow: active ? 'var(--shadow-ember)' : 'none',
      }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, marginBottom: 10,
        background: active ? 'rgba(184,82,28,0.15)' : 'var(--surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 180ms var(--ease-out-quart)',
      }}>
        <Icon size={16} color={active ? 'var(--ember)' : 'var(--text-secondary)'} strokeWidth={1.8} />
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
        fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em',
      }}>{label}</div>
      <div style={{
        fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3,
        fontFamily: 'var(--font-ui)', lineHeight: 1.4,
      }}>{desc}</div>
    </motion.button>
  )
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}>
      <div style={{
        maxWidth: '82%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--ember-soft)' : 'var(--surface-2)',
        border: `1px solid ${isUser ? 'var(--ember-ring)' : 'var(--border-subtle)'}`,
        fontSize: 13.5, lineHeight: 1.55,
        color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
        whiteSpace: 'pre-line',
      }}>
        {text}
      </div>
    </motion.div>
  )
}

function NotifPreview({ title, body, when }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
      }}>
      <div style={{ flexShrink: 0 }}>
        <GetShiftMark size={32} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{when}</span>
        </div>
        <div style={{
          fontSize: 12.5, color: 'var(--text-secondary)',
          marginTop: 3, lineHeight: 1.45,
        }}>{body}</div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */

export default function Onboarding({ onTerminer, activerNotifications, userId, etapeInitiale = 0 }) {
  const [idx, setIdx] = useState(etapeInitiale)
  const [dir, setDir] = useState(1)
  const [integConnectees, setIntegConnectees] = useState({})
  const [integLoading, setIntegLoading] = useState(null)
  const [profil, setProfil] = useState({ rythme: '', usage: '', team: '', challenge: '' })
  const [notifActivee, setNotifActivee] = useState(false)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const etape = ETAPES_CONFIG[idx]
  const total = ETAPES_CONFIG.length
  const isLast = idx === total - 1

  // Confetti sur fin
  useEffect(() => {
    if (etape.id === 'fin') {
      import('canvas-confetti').then(({ default: c }) => {
        c({
          particleCount: 110, spread: 75, origin: { y: 0.45 },
          colors: ['#B8521C', '#E07A3E', '#9A3F12', '#F0884A', '#C66629'],
          ticks: 200,
        })
      }).catch(() => {})
    }
  }, [etape.id])

  // ESC + arrow keys
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isLast) onTerminer()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft' && idx > 0) goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line
  }, [idx, isLast])

  const goNext = () => {
    if (idx >= total - 1) { onTerminer(); return }
    setDir(1)
    setIdx(i => i + 1)
  }
  const goPrev = () => {
    if (idx <= 0) return
    setDir(-1)
    setIdx(i => i - 1)
  }

  const connecterIntegration = useCallback((integ) => {
    if (!integ.oauthPath) {
      onTerminer()
      navigate('/settings', { state: { section: 'integrations' } })
      return
    }
    setIntegLoading(integ.id)
    const url = `${API}${integ.oauthPath}?user_id=${userId}`
    const popup = window.open(url, 'oauth', 'width=520,height=640,top=100,left=100')

    const cleanup = () => {
      window.removeEventListener('message', listener)
      clearInterval(checkClosed)
    }
    const listener = (e) => {
      if (e.data?.type === 'OAUTH_SUCCESS' && e.data.service === integ.id) {
        cleanup()
        setIntegConnectees(p => ({ ...p, [integ.id]: true }))
        setIntegLoading(null)
        if (popup) popup.close()
      }
    }
    const checkClosed = setInterval(() => {
      if (popup?.closed) { cleanup(); setIntegLoading(null) }
    }, 500)
    window.addEventListener('message', listener)
  }, [userId, onTerminer, navigate])

  const handleNotifs = async () => {
    if (!notifActivee && activerNotifications) {
      await activerNotifications()
      setNotifActivee(true)
    }
    goNext()
  }

  const saveProfilPartial = () => {
    try {
      localStorage.setItem('gs_profil', JSON.stringify(profil))
      if (userId && profil.rythme) {
        axios.put(`${API}/users/${userId}/profil-etudiant`, {
          rythme: profil.rythme,
        }).catch(() => {})
      }
    } catch {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP RENDERERS
     ═══════════════════════════════════════════════════════════════════ */

  const renderStep = () => {
    switch (etape.id) {
      case 'bienvenue':
        return (
          <StepShell maxWidth={680} center>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 28 }}>
              <GetShiftMark size={72} />
            </motion.div>
            <Eyebrow>GetShift · 2026</Eyebrow>
            <Title serif>Bienvenue.</Title>
            <Subtitle>
              L'assistant IA qui pense ta semaine pour toi.
              Connecte tes outils, parle-lui en langage naturel — il s'occupe du reste.
            </Subtitle>
            <div style={{
              marginTop: 36, display: 'flex', flexDirection: 'column', gap: 0,
              borderTop: '1px solid var(--border-subtle)',
            }}>
              {FEATURES_HERO.map((line, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    padding: '14px 0', borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--ember)', flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 14.5, color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)', lineHeight: 1.5,
                  }}>{line}</span>
                </motion.div>
              ))}
            </div>
          </StepShell>
        )

      case 'integrations':
        return (
          <StepShell maxWidth={620}>
            <Eyebrow>Étape 1 · connecter tes outils</Eyebrow>
            <Title>Connecte tes outils.</Title>
            <Subtitle>
              GetShift s'intègre à tout ce que tu utilises déjà.
              Tu peux tout faire plus tard depuis Réglages — mais autant gagner du temps maintenant.
            </Subtitle>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {INTEGRATIONS.map(integ => (
                <IntegrationRow key={integ.id} integ={integ}
                  connectee={integConnectees[integ.id]}
                  loading={integLoading === integ.id}
                  onConnect={connecterIntegration} />
              ))}
            </div>
          </StepShell>
        )

      case 'profil_rythme':
        return (
          <StepShell maxWidth={620}>
            <Eyebrow>Étape 2 · ton rythme</Eyebrow>
            <Title>Quand travailles-tu le mieux ?</Title>
            <Subtitle>
              L'IA proposera tes créneaux focus sur tes meilleures heures, et garde les tâches admin pour le reste.
            </Subtitle>

            <div style={{ marginTop: 32 }}>
              <SectionLabel>Ton créneau le plus productif</SectionLabel>
              <div style={{ display: 'flex', gap: 10 }}>
                {RYTHMES.map(r => (
                  <SelectionCard key={r.val}
                    active={profil.rythme === r.val}
                    onClick={() => setProfil(p => ({ ...p, rythme: r.val }))}
                    Icon={r.Icon} label={r.label} desc={r.desc} compact />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <SectionLabel>Tu utilises GetShift pour</SectionLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
                gap: 10,
              }}>
                {USAGES.map(u => (
                  <SelectionCard key={u.val}
                    active={profil.usage === u.val}
                    onClick={() => setProfil(p => ({ ...p, usage: u.val }))}
                    Icon={u.Icon} label={u.label} desc={u.desc} compact />
                ))}
              </div>
            </div>
          </StepShell>
        )

      case 'profil_travail':
        return (
          <StepShell maxWidth={620}>
            <Eyebrow>Étape 3 · ton contexte</Eyebrow>
            <Title>Et comment tu travailles ?</Title>
            <Subtitle>
              Deux dernières infos pour que GetShift comprenne ton quotidien et anticipe ce dont tu as besoin.
            </Subtitle>

            <div style={{ marginTop: 32 }}>
              <SectionLabel>Configuration de travail</SectionLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
                gap: 10,
              }}>
                {TEAMS.map(t => (
                  <SelectionCard key={t.val}
                    active={profil.team === t.val}
                    onClick={() => setProfil(p => ({ ...p, team: t.val }))}
                    Icon={t.Icon} label={t.label} desc={t.desc} compact />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <SectionLabel>Ton plus gros défi en productivité</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CHALLENGES.map(c => (
                  <motion.button key={c.val}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setProfil(p => ({ ...p, challenge: c.val }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      background: profil.challenge === c.val ? 'var(--ember-soft)' : 'var(--surface-1)',
                      border: `1px solid ${profil.challenge === c.val ? 'var(--ember)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 180ms var(--ease-out-quart)',
                      boxShadow: profil.challenge === c.val ? 'var(--shadow-ember)' : 'none',
                    }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: profil.challenge === c.val ? 'rgba(184,82,28,0.15)' : 'var(--surface-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <c.Icon size={16} color={profil.challenge === c.val ? 'var(--ember)' : 'var(--text-secondary)'} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em',
                      }}>{c.label}</div>
                      <div style={{
                        fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2,
                        fontFamily: 'var(--font-ui)',
                      }}>{c.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </StepShell>
        )

      case 'ia':
        return (
          <StepShell maxWidth={680}>
            <Eyebrow>Étape 4 · découverte</Eyebrow>
            <Title>Ton agent IA personnel.</Title>
            <Subtitle>
              Planification, analyse, création de tâches — tout en langage naturel.
              Il connaît ton calendrier, ta progression, tes priorités.
            </Subtitle>
            <div style={{
              marginTop: 32, padding: '20px 18px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)',
              }}>
                <Sparkles size={14} color="var(--ember)" strokeWidth={2} />
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)', letterSpacing: 0.3,
                }}>ASSISTANT IA</span>
              </div>
              {CHAT_DEMO.map((m, i) => (
                <div key={i} style={{ animationDelay: `${i * 0.4}s` }}>
                  <ChatBubble role={m.role} text={m.text} />
                </div>
              ))}
            </div>
            <p style={{
              marginTop: 18, fontSize: 12.5,
              color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)',
              fontStyle: 'italic',
            }}>
              Exemples de prompts : « Planifie ma semaine », « Analyse ma productivité du mois », « Crée 3 tâches pour préparer mon entretien »
            </p>
          </StepShell>
        )

      case 'notifs':
        return (
          <StepShell maxWidth={560}>
            <Eyebrow>Étape 5 · presque fini</Eyebrow>
            <Title>Ne rate plus aucune deadline.</Title>
            <Subtitle>
              Rappels push avant chaque échéance, récap quotidien, alertes de priorité.
              Fonctionne même app fermée.
            </Subtitle>
            <div style={{
              marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <NotifPreview
                title="GetShift"
                when="il y a 5 min"
                body="Rapport trimestriel — deadline dans 2h. Tu veux time-block 14h–16h ?"
              />
              <NotifPreview
                title="GetShift"
                when="08:00"
                body="Récap du matin : 3 tâches prioritaires, 2 réunions Calendar. Bonne journée."
              />
            </div>
          </StepShell>
        )

      case 'fin':
        return (
          <StepShell maxWidth={620} center>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 28, position: 'relative' }}>
              <GetShiftMark size={80} />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', damping: 14 }}
                style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid var(--bg-base)',
                }}>
                <Check size={14} color="#fff" strokeWidth={3} />
              </motion.div>
            </motion.div>
            <Eyebrow>Étape finale</Eyebrow>
            <Title serif>Tu es prêt.</Title>
            <Subtitle>
              GetShift apprend de tes habitudes et s'améliore au fil du temps.
              Plus tu l'utilises, plus il devient pertinent.
            </Subtitle>
            <div style={{
              marginTop: 36, padding: '20px 24px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
                marginBottom: 12,
              }}>CONFIGURÉ</div>
              <ChecklistItem done={Object.keys(integConnectees).length > 0}
                label={`${Object.keys(integConnectees).length} intégration${Object.keys(integConnectees).length > 1 ? 's' : ''} connectée${Object.keys(integConnectees).length > 1 ? 's' : ''}`} />
              <ChecklistItem done={!!profil.rythme && !!profil.usage} label="Rythme de travail" />
              <ChecklistItem done={!!profil.team && !!profil.challenge} label="Contexte personnalisé" />
              <ChecklistItem done={notifActivee} label="Notifications push" last />
            </div>
          </StepShell>
        )

      default: return null
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     BUTTON LABEL + ACTION
     ═══════════════════════════════════════════════════════════════════ */

  const ctaLabel = () => {
    if (etape.id === 'bienvenue') return 'Commencer'
    if (etape.id === 'integrations') {
      const n = Object.keys(integConnectees).length
      return n > 0 ? `Continuer · ${n} connecté${n > 1 ? 's' : ''}` : 'Continuer'
    }
    if (etape.id === 'notifs') return notifActivee ? 'Continuer' : 'Activer les notifications'
    if (etape.id === 'fin') return 'Ouvrir GetShift'
    return 'Continuer'
  }

  const handleCta = () => {
    if (etape.id === 'notifs') return handleNotifs()
    if (etape.id === 'profil_rythme' || etape.id === 'profil_travail') {
      saveProfilPartial()
    }
    goNext()
  }

  /* ═══════════════════════════════════════════════════════════════════
     SLIDE TRANSITION
     ═══════════════════════════════════════════════════════════════════ */

  const variants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 32 : -32 }),
    center: { opacity: 1, x: 0 },
    exit:  (d) => ({ opacity: 0, x: d > 0 ? -32 : 32 }),
  }

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden',
    }}>

      {/* Ember glow ambient */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, right: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--ember-soft) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* HEADER : brand + progress + close */}
      <header style={{
        position: 'relative', zIndex: 2,
        padding: isMobile ? '18px 20px' : '24px 36px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        <BrandMark />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ProgressBar idx={idx} total={total} />
          {!isLast && (
            <button onClick={onTerminer}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-tertiary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'all 150ms var(--ease-out-quart)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
            >
              Passer <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </header>

      {/* CONTENT */}
      <main style={{
        position: 'relative', zIndex: 1,
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: isMobile ? '12px 20px 100px' : '20px 36px 120px',
        display: 'flex', justifyContent: 'center',
      }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={etape.id}
            custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 3,
        padding: isMobile ? '16px 20px calc(20px + env(safe-area-inset-bottom))' : '20px 36px 28px',
        background: 'linear-gradient(180deg, transparent 0%, var(--bg-base) 30%)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <button onClick={goPrev}
          disabled={idx === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: idx === 0 ? 'var(--text-disabled)' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500,
            cursor: idx === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)',
            opacity: idx === 0 ? 0.5 : 1,
            transition: 'all 150ms var(--ease-out-quart)',
          }}>
          <ArrowLeft size={14} strokeWidth={2} /> {!isMobile && 'Retour'}
        </button>

        <motion.button onClick={handleCta}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isMobile ? '12px 22px' : '12px 28px',
            background: 'var(--ember)', color: 'var(--text-on-ember)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
            letterSpacing: '-0.01em',
            boxShadow: 'var(--shadow-ember)',
            transition: 'background 150ms var(--ease-out-quart)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ember-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--ember)' }}
        >
          {etape.id === 'notifs' && !notifActivee && <Bell size={14} strokeWidth={2} />}
          {ctaLabel()}
          {etape.id !== 'notifs' && <ArrowRight size={14} strokeWidth={2} />}
        </motion.button>
      </footer>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

function StepShell({ children, maxWidth = 620, center = false }) {
  return (
    <div style={{
      width: '100%', maxWidth,
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start',
      paddingTop: center ? 'clamp(20px, 8vh, 60px)' : 'clamp(8px, 3vh, 24px)',
    }}>
      {children}
    </div>
  )
}

function Eyebrow({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
        color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', marginBottom: 18,
      }}>
      {children}
    </motion.div>
  )
}

function Title({ children, serif = false }) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        fontFamily: serif ? 'var(--font-display)' : 'var(--font-ui)',
        fontSize: serif ? 'clamp(40px, 7vw, 64px)' : 'clamp(30px, 5vw, 48px)',
        fontWeight: serif ? 400 : 600,
        lineHeight: serif ? 1.05 : 1.1,
        letterSpacing: serif ? '-0.02em' : '-0.025em',
        color: 'var(--text-primary)',
        margin: 0, marginBottom: 16,
      }}>
      {children}
    </motion.h1>
  )
}

function Subtitle({ children }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={{
        fontSize: 'clamp(15px, 1.6vw, 18px)',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)',
        margin: 0, maxWidth: 540,
      }}>
      {children}
    </motion.p>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
      color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase', margin: '0 0 12px 0',
    }}>{children}</p>
  )
}

function ChecklistItem({ done, label, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: done ? 'var(--ember)' : 'transparent',
        border: done ? 'none' : '1.5px solid var(--border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {done && <Check size={11} color="var(--text-on-ember)" strokeWidth={3} />}
      </div>
      <span style={{
        fontSize: 13.5, color: done ? 'var(--text-primary)' : 'var(--text-tertiary)',
        fontFamily: 'var(--font-ui)',
      }}>{label}</span>
    </div>
  )
}

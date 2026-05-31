import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X, ArrowRight, ArrowLeft,
  Check, Bell, Sparkles,
  Sun, Sunset, Moon,
  Briefcase, GraduationCap, Heart, Zap,
  User, Users, Building2, Shuffle,
  Layers, Clock4, Target, Hourglass,
} from 'lucide-react'
import {
  GoogleCalendarLogo, GoogleDriveLogo, GmailLogo, NotionLogo, SlackLogo,
} from '../components/BrandLogos'

const API = 'https://getshift-backend.onrender.com'

/* ═══════════════════════════════════════════════════════════════════
   BRAND LOGOS — SVG inline officiels
   ═══════════════════════════════════════════════════════════════════ */

const GetShiftMark = ({ size = 40 }) => {
  const gid = `gs-onb-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E07A3E" />
          <stop offset="100%" stopColor="#B8521C" />
        </linearGradient>
        <linearGradient id={`${gid}-hl`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gid}-bg)`} />
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gid}-hl)`} />
      <rect x="14" y="26" width="24" height="24" rx="5"
        fill="none" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.6" />
      <rect x="26" y="14" width="24" height="24" rx="5" fill="#FFFFFF" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const INTEGRATIONS_BASE = [
  { id: 'google_calendar', nom: 'Google Calendar', Logo: GoogleCalendarLogo, oauthPath: '/integrations/google-calendar/start' },
  { id: 'google_drive',    nom: 'Google Drive',    Logo: GoogleDriveLogo,    oauthPath: '/integrations/google-drive/start' },
  { id: 'gmail',           nom: 'Gmail',           Logo: GmailLogo,          oauthPath: '/integrations/gmail/start' },
  { id: 'notion',          nom: 'Notion',          Logo: NotionLogo,         oauthPath: '/integrations/notion/start' },
  { id: 'slack',           nom: 'Slack',           Logo: SlackLogo,          oauthPath: null },
]

const RYTHMES_BASE = [
  { val: 'matin', Icon: Sun    },
  { val: 'apres', Icon: Sunset },
  { val: 'soir',  Icon: Moon   },
]

const USAGES_BASE = [
  { val: 'pro',    Icon: Briefcase     },
  { val: 'etudes', Icon: GraduationCap },
  { val: 'perso',  Icon: Heart         },
  { val: 'mixte',  Icon: Zap           },
]

const TEAMS_BASE = [
  { val: 'solo',     Icon: User      },
  { val: 'petite',   Icon: Users     },
  { val: 'grande',   Icon: Building2 },
  { val: 'variable', Icon: Shuffle   },
]

const CHALLENGES_BASE = [
  { val: 'surcharge',       Icon: Layers    },
  { val: 'procrastination', Icon: Clock4    },
  { val: 'focus',           Icon: Target    },
  { val: 'estimation',      Icon: Hourglass },
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
          <Check size={14} strokeWidth={2.5} /> {t('onboarding.connected')}
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
          {integ.oauthPath ? t('onboarding.connect') : t('onboarding.configure')} <ArrowRight size={13} strokeWidth={2} />
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
  const { t } = useTranslation()
  const [idx, setIdx] = useState(etapeInitiale)
  const [dir, setDir] = useState(1)
  const [integConnectees, setIntegConnectees] = useState({})
  const [integLoading, setIntegLoading] = useState(null)
  const [profil, setProfil] = useState({ rythme: '', usage: '', team: '', challenge: '' })
  const [notifActivee, setNotifActivee] = useState(false)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const INTEGRATIONS = INTEGRATIONS_BASE.map(i => ({ ...i, desc: t(`onboarding.integ_${i.id}_desc`) }))
  const RYTHMES = RYTHMES_BASE.map(r => ({ ...r, label: t(`onboarding.rythme_${r.val}`), desc: t(`onboarding.rythme_${r.val}_desc`) }))
  const USAGES = USAGES_BASE.map(u => ({ ...u, label: t(`onboarding.usage_${u.val}`), desc: t(`onboarding.usage_${u.val}_desc`) }))
  const TEAMS = TEAMS_BASE.map(tm => ({ ...tm, label: t(`onboarding.team_${tm.val}`), desc: t(`onboarding.team_${tm.val}_desc`) }))
  const CHALLENGES = CHALLENGES_BASE.map(c => ({ ...c, label: t(`onboarding.challenge_${c.val}`), desc: t(`onboarding.challenge_${c.val}_desc`) }))
  const FEATURES_HERO = [t('onboarding.feature_1'), t('onboarding.feature_2'), t('onboarding.feature_3'), t('onboarding.feature_4')]
  const CHAT_DEMO = [
    { role: 'user', text: t('onboarding.chat_user') },
    { role: 'ai',   text: t('onboarding.chat_ai') },
  ]

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
            <Eyebrow>{t('onboarding.eyebrow_year')}</Eyebrow>
            <Title serif>{t('onboarding.welcome_title')}</Title>
            <Subtitle>{t('onboarding.welcome_sub')}</Subtitle>
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
            <Eyebrow>{t('onboarding.step1_eyebrow')}</Eyebrow>
            <Title>{t('onboarding.step1_title')}</Title>
            <Subtitle>{t('onboarding.step1_sub')}</Subtitle>
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
            <Eyebrow>{t('onboarding.step2_eyebrow')}</Eyebrow>
            <Title>{t('onboarding.step2_title')}</Title>
            <Subtitle>{t('onboarding.step2_sub')}</Subtitle>

            <div style={{ marginTop: 32 }}>
              <SectionLabel>{t('onboarding.step2_peak_label')}</SectionLabel>
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
              <SectionLabel>{t('onboarding.step2_usage_label')}</SectionLabel>
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
            <Eyebrow>{t('onboarding.step3_eyebrow')}</Eyebrow>
            <Title>{t('onboarding.step3_title')}</Title>
            <Subtitle>{t('onboarding.step3_sub')}</Subtitle>

            <div style={{ marginTop: 32 }}>
              <SectionLabel>{t('onboarding.step3_team_label')}</SectionLabel>
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
              <SectionLabel>{t('onboarding.step3_challenge_label')}</SectionLabel>
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
            <Eyebrow>{t('onboarding.step4_eyebrow')}</Eyebrow>
            <Title>{t('onboarding.step4_title')}</Title>
            <Subtitle>{t('onboarding.step4_sub')}</Subtitle>
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
                }}>{t('onboarding.step4_ia_label')}</span>
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
              {t('onboarding.step4_examples')}
            </p>
          </StepShell>
        )

      case 'notifs':
        return (
          <StepShell maxWidth={560}>
            <Eyebrow>{t('onboarding.step5_eyebrow')}</Eyebrow>
            <Title>{t('onboarding.step5_title')}</Title>
            <Subtitle>{t('onboarding.step5_sub')}</Subtitle>
            <div style={{
              marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <NotifPreview
                title="GetShift"
                when={t('onboarding.notif1_when')}
                body={t('onboarding.notif1_body')}
              />
              <NotifPreview
                title="GetShift"
                when={t('onboarding.notif2_when')}
                body={t('onboarding.notif2_body')}
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
            <Eyebrow>{t('onboarding.final_eyebrow')}</Eyebrow>
            <Title serif>{t('onboarding.final_title')}</Title>
            <Subtitle>{t('onboarding.final_sub')}</Subtitle>
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
              }}>{t('onboarding.config_badge')}</div>
              <ChecklistItem done={Object.keys(integConnectees).length > 0}
                label={Object.keys(integConnectees).length > 1
                  ? t('onboarding.integ_n_connected_plural', { n: Object.keys(integConnectees).length })
                  : t('onboarding.integ_n_connected', { n: Object.keys(integConnectees).length })} />
              <ChecklistItem done={!!profil.rythme && !!profil.usage} label={t('onboarding.checklist_rythme')} />
              <ChecklistItem done={!!profil.team && !!profil.challenge} label={t('onboarding.checklist_context')} />
              <ChecklistItem done={notifActivee} label={t('onboarding.checklist_notifs')} last />
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
    if (etape.id === 'bienvenue') return t('onboarding.cta_start')
    if (etape.id === 'integrations') {
      const n = Object.keys(integConnectees).length
      return n > 0
        ? (n > 1 ? t('onboarding.cta_connected_plural', { n }) : t('onboarding.cta_connected', { n }))
        : t('onboarding.cta_continue')
    }
    if (etape.id === 'notifs') return notifActivee ? t('onboarding.cta_continue') : t('onboarding.cta_notifs')
    if (etape.id === 'fin') return t('onboarding.cta_open')
    return t('onboarding.cta_continue')
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
              {t('onboarding.skip')} <X size={12} strokeWidth={2} />
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
          <ArrowLeft size={14} strokeWidth={2} /> {!isMobile && t('onboarding.back')}
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

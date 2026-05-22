import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  X, ArrowRight, ArrowLeft,
  Calendar, HardDrive, Mail, FileText, MessageSquare,
  Check, Bell, Sparkles,
  Sun, Sunset, Moon,
  Briefcase, GraduationCap, Heart, Zap,
} from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

/* ═══════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════ */

const INTEGRATIONS = [
  { id: 'google_calendar', nom: 'Google Calendar', desc: 'Sync bidirectionnelle · time blocks IA',
    Icon: Calendar, brand: '#4285F4', oauthPath: '/integrations/google-calendar/start' },
  { id: 'google_drive', nom: 'Google Drive', desc: 'Lie tes fichiers à tes tâches',
    Icon: HardDrive, brand: '#0F9D58', oauthPath: '/integrations/google-drive/start' },
  { id: 'gmail', nom: 'Gmail', desc: 'Transforme tes emails en actions',
    Icon: Mail, brand: '#EA4335', oauthPath: '/integrations/gmail/start' },
  { id: 'notion', nom: 'Notion', desc: 'Synchronise notes et bases de données',
    Icon: FileText, brand: 'var(--text-secondary)', oauthPath: '/integrations/notion/start' },
  { id: 'slack', nom: 'Slack', desc: 'Alertes de tâches dans tes canaux',
    Icon: MessageSquare, brand: '#4A154B', oauthPath: null },
]

const RYTHMES = [
  { val: 'matin', Icon: Sun,    label: 'Matin',       desc: 'Avant 12h' },
  { val: 'apres', Icon: Sunset, label: 'Après-midi',  desc: '12h – 18h' },
  { val: 'soir',  Icon: Moon,   label: 'Soir',        desc: 'Après 18h' },
]

const USAGES = [
  { val: 'pro',    Icon: Briefcase,      label: 'Travail',  desc: 'Projets pro, deadlines clients' },
  { val: 'etudes', Icon: GraduationCap,  label: 'Études',   desc: 'Cours, examens, deadlines acad.' },
  { val: 'perso',  Icon: Heart,          label: 'Personnel', desc: 'Objectifs perso, habitudes' },
  { val: 'mixte',  Icon: Zap,            label: 'Mixte',    desc: 'Tout à la fois' },
]

const ETAPES_CONFIG = [
  { id: 'bienvenue' },
  { id: 'integrations' },
  { id: 'profil' },
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

function IntegrationRow({ integ, connectee, loading, onConnect }) {
  const isText = typeof integ.brand === 'string' && integ.brand.startsWith('var(')
  return (
    <motion.button
      onClick={() => !connectee && !loading && onConnect(integ)}
      disabled={connectee}
      whileHover={!connectee ? { y: -1 } : undefined}
      whileTap={!connectee ? { scale: 0.995 } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        width: '100%', padding: '16px 18px',
        background: 'var(--surface-1)',
        border: `1px solid ${connectee ? 'var(--ember)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: connectee ? 'default' : 'pointer',
        textAlign: 'left', transition: 'border-color 180ms var(--ease-out-quart)',
        position: 'relative',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: isText ? 'var(--surface-3)' : `${integ.brand}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <integ.Icon size={18} color={isText ? 'var(--text-secondary)' : integ.brand} strokeWidth={1.8} />
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
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--ember)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-on-ember)', fontWeight: 600 }}>G</span>
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
  const [profil, setProfil] = useState({ rythme: '', usage: '' })
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

  // ESC pour fermer (sauf dernière étape)
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
    const cleanup = () => {
      window.removeEventListener('message', listener)
      clearInterval(checkClosed)
    }
    window.addEventListener('message', listener)
  }, [userId, onTerminer, navigate])

  const handleNotifs = async () => {
    if (!notifActivee && activerNotifications) {
      await activerNotifications()
      setNotifActivee(true)
    }
    goNext()
  }

  const handleProfilNext = () => {
    try {
      localStorage.setItem('gs_profil', JSON.stringify(profil))
      if (userId && profil.rythme) {
        axios.put(`${API}/users/${userId}/profil-etudiant`, { rythme: profil.rythme }).catch(() => {})
      }
    } catch {}
    goNext()
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP RENDERERS
     ═══════════════════════════════════════════════════════════════════ */

  const renderStep = () => {
    switch (etape.id) {
      case 'bienvenue':
        return (
          <StepShell maxWidth={680} center>
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
            <Eyebrow>Étape 1 · 3 min</Eyebrow>
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

      case 'profil':
        return (
          <StepShell maxWidth={620}>
            <Eyebrow>Étape 2 · 30 secondes</Eyebrow>
            <Title>Comment tu travailles ?</Title>
            <Subtitle>
              Deux questions pour que l'IA adapte ses suggestions à ton rythme.
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

      case 'ia':
        return (
          <StepShell maxWidth={680}>
            <Eyebrow>Étape 3 · découverte</Eyebrow>
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
            <Eyebrow>Étape 4 · presque fini</Eyebrow>
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
              <ChecklistItem done={!!profil.rythme && !!profil.usage} label="Profil personnalisé" />
              <ChecklistItem done={notifActivee} label="Notifications push" last />
            </div>
          </StepShell>
        )

      default: return null
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     BUTTON LABEL
     ═══════════════════════════════════════════════════════════════════ */

  const ctaLabel = () => {
    if (etape.id === 'bienvenue') return 'Commencer'
    if (etape.id === 'integrations') {
      const n = Object.keys(integConnectees).length
      return n > 0 ? `Continuer · ${n} connecté${n > 1 ? 's' : ''}` : 'Continuer'
    }
    if (etape.id === 'profil') return 'Continuer'
    if (etape.id === 'ia') return 'Continuer'
    if (etape.id === 'notifs') return notifActivee ? 'Continuer' : 'Activer les notifications'
    if (etape.id === 'fin') return 'Ouvrir GetShift'
    return 'Continuer'
  }

  const handleCta = () => {
    if (etape.id === 'notifs') return handleNotifs()
    if (etape.id === 'profil') return handleProfilNext()
    goNext()
  }

  /* ═══════════════════════════════════════════════════════════════════
     SLIDE TRANSITION VARIANTS
     ═══════════════════════════════════════════════════════════════════ */

  const variants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 32 : -32 }),
    center: { opacity: 1, x: 0 },
    exit:  (d) => ({ opacity: 0, x: d > 0 ? -32 : 32 }),
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div ref={containerRef} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden',
    }}>

      {/* Ember glow ambient — coin top-right */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, right: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--ember-soft) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* HEADER : progress + close */}
      <header style={{
        position: 'relative', zIndex: 2,
        padding: isMobile ? '20px 20px' : '28px 36px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <ProgressBar idx={idx} total={total} />
        {!isLast && (
          <button onClick={onTerminer}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
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
      </header>

      {/* CONTENT — scroll vertical si overflow */}
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

      {/* FOOTER — actions */}
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
   PRIMITIVES — typographie et layout cohérents
   ═══════════════════════════════════════════════════════════════════ */

function StepShell({ children, maxWidth = 620, center = false }) {
  return (
    <div style={{
      width: '100%', maxWidth,
      display: 'flex', flexDirection: 'column',
      alignItems: center ? 'flex-start' : 'flex-start',
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
        textDecoration: done ? 'none' : 'none',
      }}>{label}</span>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Bot, Bell,
  ArrowRight, X, ChevronLeft, Zap, Award,
  Link2, CheckCircle2, Shield, Brain,
  BarChart2, Target, CheckSquare,
} from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

const INTEGRATIONS = [
  {
    id: 'google_calendar',
    nom: 'Google Calendar',
    desc: 'Sync tes events · time blocks automatiques',
    icon: '📅',
    color: '#4285F4',
    bg: 'rgba(66,133,244,0.1)',
    tag: 'Recommandé',
    oauthPath: '/integrations/google-calendar/start',
  },
  {
    id: 'google_drive',
    nom: 'Google Drive',
    desc: 'Lie tes fichiers et documents à tes tâches',
    icon: '📁',
    color: '#0F9D58',
    bg: 'rgba(15,157,88,0.1)',
    tag: 'Fichiers',
    oauthPath: '/integrations/google-drive/start',
  },
  {
    id: 'gmail',
    nom: 'Gmail',
    desc: 'Transforme tes emails en tâches actionnables',
    icon: '📧',
    color: '#EA4335',
    bg: 'rgba(234,67,53,0.1)',
    tag: 'Email',
    oauthPath: '/integrations/gmail/start',
  },
  {
    id: 'notion',
    nom: 'Notion',
    desc: 'Synchronise tes notes et bases de données',
    icon: '📝',
    color: '#888',
    bg: 'rgba(136,136,136,0.08)',
    tag: 'Notes',
    oauthPath: '/integrations/notion/start',
  },
  {
    id: 'slack',
    nom: 'Slack',
    desc: 'Reçois les alertes de tâches dans tes canaux',
    icon: '💬',
    color: '#4A154B',
    bg: 'rgba(74,21,75,0.1)',
    tag: 'Équipe',
    oauthPath: null,
  },
]

const RYTHMES = [
  { val: 'matin', emoji: '🌅', label: 'Matin', desc: 'Avant 12h' },
  { val: 'apres', emoji: '☀️', label: 'Après-midi', desc: '12h–18h' },
  { val: 'soir', emoji: '🌙', label: 'Soir', desc: 'Après 18h' },
]

const TYPES_USAGE = [
  { val: 'pro', emoji: '💼', label: 'Travail', desc: 'Projets pro' },
  { val: 'etudes', emoji: '📚', label: 'Études', desc: 'Cours & examens' },
  { val: 'perso', emoji: '🎯', label: 'Perso', desc: 'Objectifs perso' },
  { val: 'mixte', emoji: '⚡', label: 'Mixte', desc: 'Tout à la fois' },
]

const FEATURES_PREVIEW = [
  { Icon: CheckSquare, color: '#4caf82', label: 'Tâches & projets' },
  { Icon: Bot, color: '#a855f7', label: 'IA contextuelle' },
  { Icon: Target, color: '#B8521C', label: 'Goal Reverse' },
  { Icon: BarChart2, color: '#0ea5e9', label: 'Analytics' },
]

const ETAPES = [
  {
    id: 'bienvenue', icon: Sparkles, iconColor: '#B8521C',
    titre: 'Bienvenue sur GetShift',
    description: "L'assistant IA qui connaît tes deadlines, tes objectifs et ton rythme. Prêt en 2 minutes.",
    cta: "C'est parti !",
    confettiStep: true, isBienvenue: true,
  },
  {
    id: 'integrations', icon: Link2, iconColor: '#0ea5e9',
    titre: 'Connecte tes outils',
    description: "GetShift s'intègre à tout ce que tu utilises — Google, Notion, Slack. Zéro re-saisie.",
    cta: 'Continuer',
    isIntegrations: true,
  },
  {
    id: 'profil', icon: Brain, iconColor: '#10b981',
    titre: 'Personnalise GetShift',
    description: "Quelques infos pour que l'IA adapte ses suggestions à ton rythme et tes objectifs.",
    cta: 'Continuer',
    isProfil: true,
  },
  {
    id: 'ia-chat', icon: Bot, iconColor: '#a855f7',
    titre: 'Ton assistant IA',
    description: "Planification, analyse, création de tâches — tout en langage naturel. Il connaît ton calendrier et ta progression.",
    cta: 'Top !',
    spotlight: 'nav-ia',
    tip: '· Essaie : "Planifie ma semaine en évitant mes réunions"',
  },
  {
    id: 'notifications', icon: Bell, iconColor: '#e05c5c',
    titre: 'Ne rate plus aucune deadline',
    description: "Rappels push avant chaque échéance, récap du matin et alertes de priorité.",
    cta: 'Activer maintenant',
    actionNotif: true,
    tip: '· Fonctionne même quand l\'app est fermée.',
  },
  {
    id: 'fin', icon: Award, iconColor: '#e08a3c',
    titre: 'Tu es prêt →',
    description: "Tout est configuré. GetShift apprend de tes habitudes et s'améliore au fil du temps.",
    cta: 'Commencer GetShift',
    confettiStep: true, fin: true,
  },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

function CarteIntegration({ integ, connectee, onConnect, loading }) {
  return (
    <motion.div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12,
        background: connectee ? `${integ.color}10` : 'transparent',
        border: `1.5px solid ${connectee ? integ.color + '50' : 'rgba(255,255,255,0.08)'}`,
        cursor: connectee ? 'default' : 'pointer', transition: 'all 0.15s',
        marginBottom: 8,
      }}
      onClick={() => !connectee && !loading && onConnect(integ)}
      whileHover={!connectee ? { borderColor: integ.color + '60', background: integ.bg } : {}}
      whileTap={!connectee ? { scale: 0.98 } : {}}>
      <div style={{ fontSize: 22, flexShrink: 0 }}>{integ.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: connectee ? integ.color : '#fff' }}>{integ.nom}</span>
          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: `${integ.color}20`, color: integ.color, fontWeight: 700 }}>{integ.tag}</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{integ.desc}</div>
      </div>
      {connectee ? (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CheckCircle2 size={14} color="white" />
        </div>
      ) : loading ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${integ.color}30`, borderTop: `2px solid ${integ.color}`, flexShrink: 0 }} />
      ) : (
        <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: `${integ.color}15`, color: integ.color, fontWeight: 600, flexShrink: 0 }}>
          {integ.oauthPath ? 'Connecter' : 'Dans Réglages →'}
        </div>
      )}
    </motion.div>
  )
}

function ProfilUtilisateur({ profil, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 10 }}>TON RYTHME DE TRAVAIL</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {RYTHMES.map(r => (
            <motion.button key={r.val}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 12,
                background: profil.rythme === r.val ? 'rgba(184,82,28,0.2)' : 'transparent',
                border: `1px solid ${profil.rythme === r.val ? '#B8521C' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer', textAlign: 'center',
              }}
              onClick={() => onChange({ ...profil, rythme: r.val })}
              whileTap={{ scale: 0.97 }}>
              <div style={{ fontSize: 18, marginBottom: 3 }}>{r.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: profil.rythme === r.val ? '#B8521C' : 'rgba(255,255,255,0.55)' }}>{r.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{r.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 10 }}>UTILISATION PRINCIPALE</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TYPES_USAGE.map(t => (
            <motion.button key={t.val}
              style={{
                padding: '10px 12px', borderRadius: 12,
                background: profil.typeUsage === t.val ? 'rgba(16,185,129,0.15)' : 'transparent',
                border: `1px solid ${profil.typeUsage === t.val ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer', textAlign: 'left',
              }}
              onClick={() => onChange({ ...profil, typeUsage: t.val })}
              whileTap={{ scale: 0.97 }}>
              <div style={{ fontSize: 16, marginBottom: 3 }}>{t.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: profil.typeUsage === t.val ? '#10b981' : 'rgba(255,255,255,0.7)' }}>{t.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{t.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Onboarding({ T, onTerminer, activerNotifications, userId, etapeInitiale = 0 }) {
  const [etapeIdx, setEtapeIdx] = useState(etapeInitiale)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const [notifActivee, setNotifActivee] = useState(false)
  const [integConnectees, setIntegConnectees] = useState({})
  const [integLoading, setIntegLoading] = useState(null)
  const [profil, setProfil] = useState({ rythme: '', typeUsage: '' })
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const etape = ETAPES[etapeIdx]
  const pct = Math.round(((etapeIdx + 1) / ETAPES.length) * 100)
  const avecSpotlight = !isMobile && !!etape.spotlight

  useEffect(() => {
    if (avecSpotlight) {
      const t = setTimeout(() => {
        const el = document.querySelector(`[data-onboarding="${etape.spotlight}"]`)
        if (el) {
          const r = el.getBoundingClientRect()
          setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        } else setSpotlightRect(null)
      }, 350)
      return () => clearTimeout(t)
    } else setSpotlightRect(null)
  }, [etapeIdx, isMobile, avecSpotlight, etape.spotlight])

  useEffect(() => {
    if (etape.confettiStep) {
      import('canvas-confetti').then(({ default: c }) => {
        c({ particleCount: 90, spread: 65, origin: { y: 0.5 }, colors: ['#B8521C', '#9A3F12', '#E07A3E', '#F0884A'] })
      }).catch(() => {})
    }
  }, [etapeIdx])

  const connecterIntegration = useCallback((integ) => {
    if (!integ.oauthPath) {
      onTerminer()
      navigate('/settings', { state: { section: 'integrations' } })
      return
    }
    setIntegLoading(integ.id)
    const url = `${API}${integ.oauthPath}?user_id=${userId}`
    const popup = window.open(url, 'oauth', 'width=500,height=600,top=100,left=100')

    const listener = (e) => {
      if (e.data?.type === 'OAUTH_SUCCESS' && e.data.service === integ.id) {
        window.removeEventListener('message', listener)
        clearInterval(checkClosed)
        setIntegConnectees(p => ({ ...p, [integ.id]: true }))
        setIntegLoading(null)
        if (popup) popup.close()
      }
    }
    window.addEventListener('message', listener)

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', listener)
        setIntegLoading(null)
      }
    }, 500)
  }, [userId, onTerminer, navigate])

  const suivant = async () => {
    if (etape.actionNotif && !notifActivee) {
      if (activerNotifications) await activerNotifications()
      setNotifActivee(true)
    }
    if (etape.isProfil) {
      try {
        localStorage.setItem('gs_profil', JSON.stringify(profil))
        if (userId && profil.rythme) {
          axios.put(`${API}/users/${userId}/profil-etudiant`, { rythme: profil.rythme }).catch(() => {})
        }
      } catch {}
    }
    if (etape.fin) { onTerminer(); return }
    setEtapeIdx(i => i + 1)
  }

  const Icon = etape.icon

  const carteBase = {
    background: 'rgba(12,12,20,0.98)',
    border: `1px solid ${etape.iconColor}30`,
    backdropFilter: 'blur(40px)',
    zIndex: 10001, pointerEvents: 'all',
  }
  const carteStyle = isMobile
    ? { ...carteBase, position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', borderRadius: '20px 20px 0 0', padding: '16px 18px 36px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -12px 48px rgba(0,0,0,0.5)' }
    : {
        ...carteBase,
        ...(spotlightRect ? getTooltipPos(spotlightRect) : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
        width: etape.isIntegrations || etape.isProfil ? Math.min(520, window.innerWidth * 0.92) : Math.min(420, window.innerWidth * 0.92),
        borderRadius: 20,
        padding: '28px 30px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
        {/* Overlay */}
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onTerminer} />

        {/* Spotlight */}
        <AnimatePresence>
          {spotlightRect && !isMobile && (
            <motion.div key={etape.spotlight}
              style={{
                position: 'fixed',
                top: spotlightRect.top - 8, left: spotlightRect.left - 8,
                width: spotlightRect.width + 16, height: spotlightRect.height + 16,
                borderRadius: 14,
                boxShadow: `0 0 0 4px ${etape.iconColor}, 0 0 0 9999px rgba(0,0,0,0.8)`,
                pointerEvents: 'none', zIndex: 10000,
              }}
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}>
              <motion.div
                style={{ position: 'absolute', inset: -6, borderRadius: 18, border: `2px solid ${etape.iconColor}`, opacity: 0.4 }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carte */}
        <motion.div key={etapeIdx} style={carteStyle}
          initial={isMobile ? { y: '100%' } : { opacity: 0, y: 14, scale: 0.97 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, y: -8 }}
          transition={{ type: 'spring', damping: 32, stiffness: 360 }}>

          {isMobile && (
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
          )}

          {/* Bouton X */}
          {!etape.fin && (
            <motion.button
              style={{
                position: 'absolute', top: isMobile ? 16 : 14, right: isMobile ? 16 : 14,
                width: 30, height: 30, borderRadius: 9,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onClick={onTerminer}
              whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
              <X size={13} />
            </motion.button>
          )}

          {/* Progression */}
          <div style={{ marginBottom: 18, paddingRight: !etape.fin ? 38 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>
              <span>Étape {etapeIdx + 1} / {ETAPES.length}</span>
              <span style={{ color: etape.iconColor, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: `linear-gradient(90deg, ${etape.iconColor}, ${etape.iconColor}bb)`, borderRadius: 99 }}
                animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: 'easeOut' }} />
            </div>
          </div>

          {/* Icône + Titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <motion.div
              style={{
                width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: 13, flexShrink: 0,
                background: `${etape.iconColor}18`, border: `1.5px solid ${etape.iconColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 0.07 }}>
              <Icon size={isMobile ? 19 : 24} color={etape.iconColor} strokeWidth={1.8} />
            </motion.div>
            <motion.h2
              style={{ fontSize: isMobile ? 16 : 19, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', margin: 0, lineHeight: 1.25 }}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {etape.titre}
            </motion.h2>
          </div>

          {/* Description */}
          <motion.p
            style={{
              fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
              marginBottom: etape.isIntegrations || etape.isProfil || etape.isBienvenue ? 16 : etape.tip ? 12 : 18,
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            {etape.description}
          </motion.p>

          {/* ── BIENVENUE : aperçu features ── */}
          {etape.isBienvenue && (
            <motion.div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {FEATURES_PREVIEW.map((f, i) => (
                <motion.div key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 12px', borderRadius: 10,
                    background: `${f.color}0e`, border: `1px solid ${f.color}20`,
                  }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}>
                  <f.Icon size={14} color={f.color} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{f.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── INTÉGRATIONS ── */}
          {etape.isIntegrations && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div style={{ maxHeight: isMobile ? 280 : 300, overflowY: 'auto', paddingRight: 4, marginBottom: 12 }}>
                {INTEGRATIONS.map(integ => (
                  <CarteIntegration key={integ.id} integ={integ}
                    connectee={integConnectees[integ.id]}
                    loading={integLoading === integ.id}
                    onConnect={connecterIntegration} />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)' }}>
                <Shield size={11} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                  Tu peux déconnecter à tout moment depuis Réglages → Intégrations.
                </span>
              </div>
            </motion.div>
          )}

          {/* ── PROFIL ── */}
          {etape.isProfil && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ProfilUtilisateur profil={profil} onChange={setProfil} />
            </motion.div>
          )}

          {/* Tip */}
          {etape.tip && (
            <motion.div
              style={{
                padding: '9px 12px', background: `${etape.iconColor}0e`,
                border: `1px solid ${etape.iconColor}20`, borderRadius: 9, marginBottom: 16,
                fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
              }}
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              {etape.tip}
            </motion.div>
          )}

          {/* Dots */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16, marginBottom: 16, justifyContent: 'center' }}>
            {ETAPES.map((_, i) => (
              <motion.div key={i}
                style={{
                  height: 3, borderRadius: 99, cursor: 'pointer',
                  background: i === etapeIdx ? etape.iconColor : i < etapeIdx ? etape.iconColor + '40' : 'rgba(255,255,255,0.1)',
                }}
                animate={{ width: i === etapeIdx ? 18 : 5 }}
                transition={{ duration: 0.22 }}
                onClick={() => setEtapeIdx(i)} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8 }}>
            {etapeIdx > 0 && !etape.fin && (
              <motion.button
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '11px 10px' : '10px 14px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: 'rgba(255,255,255,0.4)',
                  fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontWeight: 500, flexShrink: 0,
                }}
                onClick={() => setEtapeIdx(i => i - 1)}
                whileHover={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
                <ChevronLeft size={13} />
                {!isMobile && 'Retour'}
              </motion.button>
            )}
            <motion.button
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: isMobile ? '13px 16px' : '12px 20px',
                background: `linear-gradient(135deg, ${etape.iconColor}, ${etape.iconColor}bb)`,
                border: 'none', borderRadius: 10, color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 16px ${etape.iconColor}30`,
              }}
              onClick={suivant}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {etape.actionNotif && !notifActivee
                ? <><Bell size={14} /> Activer les notifications</>
                : etape.fin
                  ? <><Zap size={14} /> {etape.cta}</>
                  : etape.isIntegrations
                    ? <>{Object.keys(integConnectees).length > 0 ? `${Object.keys(integConnectees).length} outil(s) connecté(s)` : 'Passer'} <ArrowRight size={13} /></>
                    : <>{etape.cta} <ArrowRight size={13} /></>
              }
            </motion.button>
          </div>

          {/* Ignorer */}
          {!etape.fin && (
            <motion.button
              style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11.5, cursor: 'pointer' }}
              onClick={onTerminer}
              whileHover={{ color: 'rgba(255,255,255,0.6)' }}>
              Ignorer le tutoriel
            </motion.button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function getTooltipPos(rect) {
  const vw = window.innerWidth, vh = window.innerHeight
  const W = Math.min(520, vw * 0.92), H = 520, gap = 20
  if (rect.left + rect.width + gap + W < vw - 10)
    return { position: 'fixed', top: Math.max(10, Math.min(rect.top - 20, vh - H - 10)), left: rect.left + rect.width + gap, transform: 'none' }
  if (rect.left - gap - W > 10)
    return { position: 'fixed', top: Math.max(10, Math.min(rect.top - 20, vh - H - 10)), left: rect.left - gap - W, transform: 'none' }
  if (rect.top + rect.height + gap + H < vh - 10)
    return { position: 'fixed', top: rect.top + rect.height + gap, left: Math.max(10, Math.min(rect.left, vw - W - 10)), transform: 'none' }
  return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
}

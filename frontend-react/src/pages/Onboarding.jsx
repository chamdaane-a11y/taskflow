import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, CheckSquare, Bot, BarChart2, Palette, Bell,
  ArrowRight, X, ChevronLeft, Zap, Award, Calendar,
  Users, Download
} from 'lucide-react'

const ETAPES = [
  {
    id: 'bienvenue', icon: Sparkles, iconColor: '#6c63ff',
    titre: 'Bienvenue sur GetShift ✦',
    description: 'Tu es au bon endroit pour booster ta productivité. On va te faire un tour complet de toutes les fonctionnalités — ça ne prend que 2 minutes.',
    cta: "C'est parti !", spotlight: null, confettiStep: true,
  },
  {
    id: 'tache', icon: CheckSquare, iconColor: '#4caf82',
    titre: 'Crée tes tâches',
    description: 'Le formulaire "Nouvelle tâche" est ton point de départ. Donne un titre, choisis la priorité et fixe une deadline. GetShift te rappellera avant l\'échéance.',
    cta: 'Compris !', spotlight: 'form-tache',
    tip: '· Chaque tâche terminée te rapporte des points : 30 en Haute, 20 en Moyenne, 10 en Basse.',
  },
  {
    id: 'ia', icon: Bot, iconColor: '#6c63ff',
    titre: 'L\'IA génère tes tâches',
    description: 'Tu as un objectif mais tu ne sais pas par où commencer ? Décris-le dans "Générer avec l\'IA" et GetShift crée automatiquement 5 tâches structurées pour toi.',
    cta: 'Super !', spotlight: 'form-ia',
    tip: '· Essaie : "Lancer mon business en ligne en 60 jours"',
  },
  {
    id: 'ia-chat', icon: Bot, iconColor: '#a855f7',
    titre: 'Ton assistant IA',
    description: 'La page "Assistant IA" est ton coach personnel. Pose des questions sur tes tâches, demande des conseils, fais-toi coacher sur tes objectifs.',
    cta: 'Top !', spotlight: 'nav-ia',
    tip: '· Il connaît ton profil, ta progression et tes tâches en cours.',
  },
  {
    id: 'analytics', icon: BarChart2, iconColor: '#e08a3c',
    titre: 'Analytiques & Stats',
    description: 'Suis tes graphiques de productivité, tes heures les plus actives, ton taux de complétion et ta progression dans le temps.',
    cta: 'Intéressant !', spotlight: 'nav-analytics',
    tip: '· Plus tu complètes de tâches, plus tu montes en niveau — de Débutant à Maître.',
  },
  {
    id: 'planification', icon: Calendar, iconColor: '#06b6d4',
    titre: 'Planification',
    description: 'Une vue calendrier de toutes tes tâches et deadlines. Visualise ta semaine, identifie les jours chargés et répartis mieux ton travail.',
    cta: 'Parfait !', spotlight: 'nav-planification',
    tip: '· Exporte une tâche vers Google Calendar en un clic.',
  },
  {
    id: 'collaboration', icon: Users, iconColor: '#10b981',
    titre: 'Collaboration',
    description: 'Crée des équipes, partage des tâches avec tes collègues, assignez des responsabilités et suivez l\'avancement ensemble.',
    cta: 'Cool !', spotlight: 'nav-collaboration',
    tip: '· Invite tes membres par lien et partage via WhatsApp, Instagram ou Facebook.',
  },
  {
    id: 'theme', icon: Palette, iconColor: '#a855f7',
    titre: 'Personnalise ton espace',
    description: 'Choisis parmi 6 thèmes dans les Paramètres : Dark, Light, Ocean, Forest, Sunset, Purple. L\'interface change entièrement.',
    cta: "J'adore !", spotlight: 'nav-settings',
    tip: '· Ton thème est sauvegardé et synchronisé sur tous tes appareils.',
  },
  {
    id: 'export', icon: Download, iconColor: '#f59e0b',
    titre: 'Export & Rapports',
    description: 'Génère un rapport PDF avec résumé IA, ou exporte tes tâches en CSV compatible Excel et Google Sheets depuis le bouton Exporter.',
    cta: 'Utile !', spotlight: null,
    tip: '· Le rapport PDF s\'adapte à ton thème choisi.',
  },
  {
    id: 'notifications', icon: Bell, iconColor: '#e05c5c',
    titre: 'Active les notifications',
    description: 'Ne rate plus aucune deadline. GetShift t\'envoie des rappels push avant chaque échéance, un résumé chaque matin à 8h et des encouragements.',
    cta: 'Activer maintenant', spotlight: null, actionNotif: true,
    tip: '· Les notifications fonctionnent même quand l\'app est fermée.',
  },
  {
    id: 'fin', icon: Award, iconColor: '#e08a3c',
    titre: 'Tu es prêt · Bonne chance →',
    description: 'Tu connais maintenant toutes les fonctionnalités. Dashboard, IA, Analytiques, Planification, Collaboration, Export… tout est là pour toi.',
    cta: 'Commencer GetShift', spotlight: null, confettiStep: true, fin: true,
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

export default function Onboarding({ T, onTerminer, activerNotifications }) {
  const [etapeIdx, setEtapeIdx] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const [notifActivee, setNotifActivee] = useState(false)
  const isMobile = useIsMobile()
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
    } else {
      setSpotlightRect(null)
    }
  }, [etapeIdx, isMobile])

  useEffect(() => {
    if (etape.confettiStep) {
      import('canvas-confetti').then(({ default: c }) => {
        c({ particleCount: 90, spread: 65, origin: { y: 0.5 }, colors: ['#6c63ff', '#4caf82', '#e08a3c', '#e05c5c'] })
      }).catch(() => {})
    }
  }, [etapeIdx])

  const suivant = async () => {
    if (etape.actionNotif && !notifActivee) {
      if (activerNotifications) await activerNotifications()
      setNotifActivee(true)
    }
    if (etape.fin) { onTerminer(); return }
    setEtapeIdx(i => i + 1)
  }

  const Icon = etape.icon

  // ===== STYLE CARTE =====
  const carteBase = {
    background: T.bg2,
    border: `1px solid ${etape.iconColor}30`,
    zIndex: 10001,
    pointerEvents: 'all',
  }

  const carteStyle = isMobile
    ? {
        ...carteBase,
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        width: '100%',
        borderRadius: '20px 20px 0 0',
        padding: '16px 18px 32px',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: '0 -12px 48px rgba(0,0,0,0.4)',
      }
    : {
        ...carteBase,
        ...(spotlightRect
          ? getTooltipPos(spotlightRect)
          : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        ),
        width: Math.min(400, window.innerWidth * 0.92),
        borderRadius: 20,
        padding: '26px 28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>

        {/* Overlay */}
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onTerminer}
        />

        {/* Spotlight desktop uniquement */}
        <AnimatePresence>
          {spotlightRect && !isMobile && (
            <motion.div key={etape.spotlight} style={{
              position: 'fixed',
              top: spotlightRect.top - 8, left: spotlightRect.left - 8,
              width: spotlightRect.width + 16, height: spotlightRect.height + 16,
              borderRadius: 14,
              boxShadow: `0 0 0 4px ${etape.iconColor}, 0 0 0 9999px rgba(0,0,0,0.72)`,
              pointerEvents: 'none', zIndex: 10000,
            }}
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}>
              <motion.div style={{ position: 'absolute', inset: -6, borderRadius: 18, border: `2px solid ${etape.iconColor}`, opacity: 0.35 }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.1, 0.35] }}
                transition={{ duration: 2.2, repeat: Infinity }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carte principale */}
        <motion.div
          key={etapeIdx}
          style={carteStyle}
          initial={isMobile ? { y: '100%' } : { opacity: 0, y: 14, scale: 0.97 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, y: -8 }}
          transition={{ type: 'spring', damping: 32, stiffness: 360 }}
        >

          {/* Handle mobile */}
          {isMobile && (
            <div style={{ width: 36, height: 4, borderRadius: 99, background: T.border, margin: '0 auto 16px' }} />
          )}

          {/* Bouton X */}
          {!etape.fin && (
            <motion.button
              style={{
                position: 'absolute', top: isMobile ? 16 : 14, right: isMobile ? 16 : 14,
                width: 30, height: 30, borderRadius: 9,
                background: T.bg3, border: `1px solid ${T.border}`,
                color: T.text2, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onClick={onTerminer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
              <X size={13} />
            </motion.button>
          )}

          {/* Progression */}
          <div style={{ marginBottom: 16, paddingRight: !etape.fin ? 38 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text2, marginBottom: 6, fontWeight: 500 }}>
              <span>Étape {etapeIdx + 1} / {ETAPES.length}</span>
              <span style={{ color: etape.iconColor, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: etape.iconColor, borderRadius: 99 }}
                animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Icône + Titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <motion.div
              style={{
                width: isMobile ? 38 : 48, height: isMobile ? 38 : 48,
                borderRadius: 12, flexShrink: 0,
                background: `${etape.iconColor}15`,
                border: `1.5px solid ${etape.iconColor}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 0.07 }}>
              <Icon size={isMobile ? 18 : 23} color={etape.iconColor} strokeWidth={1.8} />
            </motion.div>
            <motion.h2
              style={{
                fontSize: isMobile ? 15 : 18,
                fontWeight: 800, color: T.text,
                letterSpacing: '-0.3px', margin: 0,
                fontFamily: "'Bricolage Grotesque', sans-serif",
                lineHeight: 1.25
              }}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {etape.titre}
            </motion.h2>
          </div>

          {/* Description */}
          <motion.p
            style={{ fontSize: isMobile ? 13 : 13.5, color: T.text2, lineHeight: 1.7, marginBottom: etape.tip ? 12 : 18 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            {etape.description}
          </motion.p>

          {/* Tip */}
          {etape.tip && (
            <motion.div
              style={{
                padding: '9px 12px',
                background: `${etape.iconColor}0e`, border: `1px solid ${etape.iconColor}20`,
                borderRadius: 9, marginBottom: 18,
                fontSize: isMobile ? 11.5 : 12.5, color: T.text2, lineHeight: 1.6
              }}
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              {etape.tip}
            </motion.div>
          )}

          {/* Dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {ETAPES.map((_, i) => (
              <motion.div key={i}
                style={{
                  height: 3, borderRadius: 99, cursor: 'pointer',
                  background: i === etapeIdx ? etape.iconColor : i < etapeIdx ? etape.iconColor + '40' : T.border
                }}
                animate={{ width: i === etapeIdx ? 16 : 5 }}
                transition={{ duration: 0.22 }}
                onClick={() => setEtapeIdx(i)}
              />
            ))}
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {etapeIdx > 0 && !etape.fin && (
              <motion.button
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: isMobile ? '11px 10px' : '10px 14px',
                  background: 'transparent', border: `1px solid ${T.border}`,
                  borderRadius: 10, color: T.text2,
                  fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontWeight: 500, flexShrink: 0
                }}
                onClick={() => setEtapeIdx(i => i - 1)}
                whileHover={{ borderColor: T.text2, color: T.text }}>
                <ChevronLeft size={13} />
                {!isMobile && 'Retour'}
              </motion.button>
            )}
            <motion.button
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: isMobile ? '13px 16px' : '11px 20px',
                background: `linear-gradient(135deg, ${etape.iconColor}, ${etape.iconColor}bb)`,
                border: 'none', borderRadius: 10, color: 'white',
                fontSize: isMobile ? 14 : 13.5, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 14px ${etape.iconColor}28`
              }}
              onClick={suivant}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {etape.actionNotif && !notifActivee
                ? <><Bell size={14} /> Activer les notifications</>
                : etape.fin ? <><Zap size={14} /> {etape.cta}</>
                : <>{etape.cta} <ArrowRight size={13} /></>
              }
            </motion.button>
          </div>

          {/* Ignorer */}
          {!etape.fin && (
            <motion.button
              style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: T.text2, fontSize: 11.5, cursor: 'pointer', opacity: 0.5 }}
              onClick={onTerminer} whileHover={{ opacity: 0.9 }}>
              Ignorer le tutoriel
            </motion.button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Positionnement tooltip desktop
function getTooltipPos(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const W = Math.min(400, vw * 0.92)
  const H = 460
  const gap = 20

  if (rect.left + rect.width + gap + W < vw - 10)
    return { position: 'fixed', top: Math.max(10, Math.min(rect.top - 20, vh - H - 10)), left: rect.left + rect.width + gap, transform: 'none' }
  if (rect.left - gap - W > 10)
    return { position: 'fixed', top: Math.max(10, Math.min(rect.top - 20, vh - H - 10)), left: rect.left - gap - W, transform: 'none' }
  if (rect.top + rect.height + gap + H < vh - 10)
    return { position: 'fixed', top: rect.top + rect.height + gap, left: Math.max(10, Math.min(rect.left, vw - W - 10)), transform: 'none' }
  return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
}
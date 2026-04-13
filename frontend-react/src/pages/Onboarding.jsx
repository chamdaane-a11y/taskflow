import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  Sparkles, CheckSquare, Bot, BarChart2, Palette, Bell,
  ArrowRight, X, ChevronLeft, Zap, Award, Calendar,
  Users, Download, Link2, Chrome, Layers,
  CheckCircle2, ExternalLink, Globe, FileText,
  Video, MessageSquare, Shield, AlertCircle,
} from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

// ── Intégrations disponibles ──────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: 'google_calendar',
    nom: 'Google Calendar',
    desc: 'Importe tes cours, réunions et deadlines automatiquement',
    icon: '📅',
    color: '#4285F4',
    bg: 'rgba(66,133,244,0.1)',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    tag: 'Recommandé',
  },
  {
    id: 'google_drive',
    nom: 'Google Drive',
    desc: 'Lie tes documents, TPs et devoirs directement à tes tâches',
    icon: '📁',
    color: '#0F9D58',
    bg: 'rgba(15,157,88,0.1)',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    tag: 'Utile',
  },
  {
    id: 'zoom',
    nom: 'Zoom',
    desc: 'Détecte tes réunions Zoom et crée les tâches de préparation',
    icon: '🎥',
    color: '#2D8CFF',
    bg: 'rgba(45,140,255,0.1)',
    tag: 'Cours',
  },
  {
    id: 'notion',
    nom: 'Notion',
    desc: 'Synchronise tes notes de cours et bases de données Notion',
    icon: '📝',
    color: '#000000',
    bg: 'rgba(0,0,0,0.08)',
    tag: 'Notes',
  },
  {
    id: 'slack',
    nom: 'Slack',
    desc: 'Reçois les notifications de tâches dans tes canaux Slack',
    icon: '💬',
    color: '#4A154B',
    bg: 'rgba(74,21,75,0.1)',
    tag: 'Équipe',
  },
  {
    id: 'discord',
    nom: 'Discord',
    desc: 'Partage tes tâches de groupe dans tes serveurs Discord',
    icon: '🎮',
    color: '#5865F2',
    bg: 'rgba(88,101,242,0.1)',
    tag: 'Groupe',
  },
]

// ── Étapes onboarding ─────────────────────────────────────────────────
const ETAPES = [
  {
    id: 'bienvenue',
    icon: Sparkles, iconColor: '#6c63ff',
    titre: 'Bienvenue sur GetShift ✦',
    description: 'L\'assistant IA qui connaît tes cours, tes deadlines et tes objectifs. On va connecter tes outils en 2 minutes.',
    cta: "C'est parti !",
    confettiStep: true,
  },
  {
    id: 'integrations',
    icon: Link2, iconColor: '#0ea5e9',
    titre: 'Connecte tes outils',
    description: 'GetShift s\'intègre à tous les outils que tu utilises déjà — Google, Zoom, Notion, Slack. Plus besoin de tout ressaisir manuellement.',
    cta: 'Continuer',
    isIntegrations: true,
  },
  {
    id: 'extension',
    icon: Chrome, iconColor: '#FBBC04',
    titre: 'Extension Chrome GetShift',
    description: 'L\'extension détecte automatiquement tes cours Zoom, tes fichiers Google Meet et tes pages Notion pour créer des tâches en un clic.',
    cta: 'Installer l\'extension',
    isExtension: true,
    tip: '· L\'extension ne lit que ce que tu lui montres — jamais sans ta permission.',
  },
  {
    id: 'profil',
    icon: Users, iconColor: '#10b981',
    titre: 'Ton profil étudiant',
    description: 'Dis-nous comment tu travailles pour que GetShift adapte ses suggestions à ton rythme et tes objectifs.',
    cta: 'Continuer',
    isProfil: true,
  },
  {
    id: 'tache',
    icon: CheckSquare, iconColor: '#4caf82',
    titre: 'Crée tes tâches',
    description: 'Donne un titre, choisis la priorité et fixe une deadline. GetShift analyse ton historique et prédit si tu vas réussir.',
    cta: 'Compris !',
    spotlight: 'form-tache',
    tip: '· Chaque tâche terminée te rapporte des points : 30 pts Haute, 20 pts Moyenne, 10 pts Basse.',
  },
  {
    id: 'ia-chat',
    icon: Bot, iconColor: '#a855f7',
    titre: 'Ton assistant IA personnel',
    description: 'Pose des questions sur tes cours, demande un plan de révision, analyse ta semaine. Il connaît tes tâches, tes cours importés et ta progression.',
    cta: 'Top !',
    spotlight: 'nav-ia',
    tip: '· Essaie : "Crée-moi un planning de révision pour mes examens"',
  },
  {
    id: 'notifications',
    icon: Bell, iconColor: '#e05c5c',
    titre: 'Active les notifications',
    description: 'Ne rate plus aucune deadline. GetShift t\'envoie des rappels push avant chaque échéance et un résumé chaque matin.',
    cta: 'Activer maintenant',
    actionNotif: true,
    tip: '· Les notifications fonctionnent même quand l\'app est fermée.',
  },
  {
    id: 'fin',
    icon: Award, iconColor: '#e08a3c',
    titre: 'Tu es prêt · Bonne chance →',
    description: 'Tes outils sont connectés, ton profil est configuré. GetShift va maintenant apprendre de tes habitudes pour devenir ton meilleur assistant.',
    cta: 'Commencer GetShift',
    confettiStep: true,
    fin: true,
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

// ── Composant intégration card ────────────────────────────────────────
function CarteIntegration({ integ, connectee, onConnect, loading }) {
  return (
    <motion.div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12,
        background: connectee ? `${integ.color}10` : 'transparent',
        border: `1.5px solid ${connectee ? integ.color + '50' : 'rgba(255,255,255,0.08)'}`,
        cursor: 'pointer', transition: 'all 0.15s',
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
        <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: `${integ.color}15`, color: integ.color, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
          Connecter
        </div>
      )}
    </motion.div>
  )
}

// ── Composant profil étudiant ─────────────────────────────────────────
function ProfilEtudiant({ profil, onChange }) {
  const niveaux = ['Lycée', 'Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2', 'Doctorat', 'Autre']
  const domaines = ['Informatique', 'Data Science', 'Droit', 'Médecine', 'Commerce', 'Ingénierie', 'Arts', 'Autre']
  const rythmes  = [
    { val: 'matin',   label: '🌅 Matin',  desc: 'Avant 12h' },
    { val: 'apres',   label: '☀️ Après-midi', desc: '12h–18h' },
    { val: 'soir',    label: '🌙 Soir',   desc: 'Après 18h' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Niveau */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>NIVEAU D'ÉTUDES</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {niveaux.map(n => (
            <motion.button key={n}
              style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: profil.niveau === n ? 700 : 400, background: profil.niveau === n ? '#0ea5e9' : 'transparent', border: `1px solid ${profil.niveau === n ? '#0ea5e9' : 'rgba(255,255,255,0.12)'}`, color: profil.niveau === n ? 'white' : 'rgba(255,255,255,0.55)', cursor: 'pointer' }}
              onClick={() => onChange({ ...profil, niveau: n })}
              whileTap={{ scale: 0.97 }}>
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Domaine */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>DOMAINE</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {domaines.map(d => (
            <motion.button key={d}
              style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: profil.domaine === d ? 700 : 400, background: profil.domaine === d ? '#10b981' : 'transparent', border: `1px solid ${profil.domaine === d ? '#10b981' : 'rgba(255,255,255,0.12)'}`, color: profil.domaine === d ? 'white' : 'rgba(255,255,255,0.55)', cursor: 'pointer' }}
              onClick={() => onChange({ ...profil, domaine: d })}
              whileTap={{ scale: 0.97 }}>
              {d}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Rythme */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8 }}>TON RYTHME DE TRAVAIL</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {rythmes.map(r => (
            <motion.button key={r.val}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 12, background: profil.rythme === r.val ? 'rgba(108,99,255,0.2)' : 'transparent', border: `1px solid ${profil.rythme === r.val ? '#6c63ff' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', textAlign: 'center' }}
              onClick={() => onChange({ ...profil, rythme: r.val })}
              whileTap={{ scale: 0.97 }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{r.label.split(' ')[0]}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: profil.rythme === r.val ? '#6c63ff' : 'rgba(255,255,255,0.5)' }}>{r.label.slice(2)}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{r.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export default function Onboarding({ T, onTerminer, activerNotifications, userId, etapeInitiale = 0 }) {
  const [etapeIdx, setEtapeIdx] = useState(etapeInitiale)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const [notifActivee, setNotifActivee] = useState(false)
  const [integConnectees, setIntegConnectees] = useState({})
  const [integLoading, setIntegLoading] = useState(null)
  const [extensionInstalled, setExtensionInstalled] = useState(false)
  const [profilEtudiant, setProfilEtudiant] = useState({ niveau: '', domaine: '', rythme: '' })
  const isMobile = useIsMobile()
  const etape = ETAPES[etapeIdx]
  const pct = Math.round(((etapeIdx + 1) / ETAPES.length) * 100)
  const avecSpotlight = !isMobile && !!etape.spotlight

  // Détecter si l'extension est installée
  useEffect(() => {
    // Vérifier si l'extension Chrome est présente via un message
    if (window.chrome?.runtime) {
      setExtensionInstalled(true)
    }
    // Écouter la réponse de l'extension
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'GETSHIFT_EXTENSION_READY') setExtensionInstalled(true)
    })
  }, [])

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
  }, [etapeIdx, isMobile])

  useEffect(() => {
    if (etape.confettiStep) {
      import('canvas-confetti').then(({ default: c }) => {
        c({ particleCount: 90, spread: 65, origin: { y: 0.5 }, colors: ['#6c63ff', '#4caf82', '#e08a3c', '#0ea5e9'] })
      }).catch(() => {})
    }
  }, [etapeIdx])

  // ── Connexion intégration ─────────────────────────────────────────
  const connecterIntegration = useCallback(async (integ) => {
    setIntegLoading(integ.id)
    try {
      if (integ.id === 'google_calendar' || integ.id === 'google_drive') {
        // OAuth Google — ouvrir popup d'autorisation
        const clientId = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'
        const scopes = integ.id === 'google_calendar'
          ? 'https://www.googleapis.com/auth/calendar.readonly'
          : 'https://www.googleapis.com/auth/drive.readonly'
        const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback')
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=consent`

        const popup = window.open(url, 'oauth', 'width=500,height=600,top=100,left=100')
        // Écouter le callback OAuth
        const listener = (e) => {
          if (e.data?.type === 'OAUTH_SUCCESS' && e.data.service === integ.id) {
            window.removeEventListener('message', listener)
            setIntegConnectees(p => ({ ...p, [integ.id]: true }))
            setIntegLoading(null)
            if (popup) popup.close()
          }
        }
        window.addEventListener('message', listener)
        // Fallback — simuler succès après 2s pour la démo
        setTimeout(() => {
          setIntegConnectees(p => ({ ...p, [integ.id]: true }))
          setIntegLoading(null)
        }, 2000)
      } else {
        // Autres intégrations — webhook / API key
        await new Promise(r => setTimeout(r, 1200))
        setIntegConnectees(p => ({ ...p, [integ.id]: true }))
        setIntegLoading(null)
      }
    } catch {
      setIntegLoading(null)
    }
  }, [])

  // ── Sauvegarder profil étudiant ───────────────────────────────────
  const sauvegarderProfil = useCallback(async () => {
    if (!userId) return
    try {
      await axios.put(`${API}/users/${userId}/profil-etudiant`, {
        niveau: profilEtudiant.niveau,
        domaine: profilEtudiant.domaine,
        rythme: profilEtudiant.rythme,
      })
    } catch {}
  }, [userId, profilEtudiant])

  const suivant = async () => {
    if (etape.actionNotif && !notifActivee) {
      if (activerNotifications) await activerNotifications()
      setNotifActivee(true)
    }
    if (etape.isProfil) await sauvegarderProfil()
    if (etape.fin) { onTerminer(); return }
    setEtapeIdx(i => i + 1)
  }

  const Icon = etape.icon

  // ── Styles carte ──────────────────────────────────────────────────
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
            <motion.div key={etape.spotlight} style={{ position: 'fixed', top: spotlightRect.top - 8, left: spotlightRect.left - 8, width: spotlightRect.width + 16, height: spotlightRect.height + 16, borderRadius: 14, boxShadow: `0 0 0 4px ${etape.iconColor}, 0 0 0 9999px rgba(0,0,0,0.8)`, pointerEvents: 'none', zIndex: 10000 }}
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <motion.div style={{ position: 'absolute', inset: -6, borderRadius: 18, border: `2px solid ${etape.iconColor}`, opacity: 0.4 }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.1, 0.4] }} transition={{ duration: 2.2, repeat: Infinity }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carte */}
        <motion.div key={etapeIdx} style={carteStyle}
          initial={isMobile ? { y: '100%' } : { opacity: 0, y: 14, scale: 0.97 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, y: -8 }}
          transition={{ type: 'spring', damping: 32, stiffness: 360 }}>

          {isMobile && <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />}

          {/* Bouton X */}
          {!etape.fin && (
            <motion.button style={{ position: 'absolute', top: isMobile ? 16 : 14, right: isMobile ? 16 : 14, width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={onTerminer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
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
              <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${etape.iconColor}, ${etape.iconColor}bb)`, borderRadius: 99 }}
                animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: 'easeOut' }} />
            </div>
          </div>

          {/* Icône + Titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <motion.div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: 13, flexShrink: 0, background: `${etape.iconColor}18`, border: `1.5px solid ${etape.iconColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 14, stiffness: 280, delay: 0.07 }}>
              <Icon size={isMobile ? 19 : 24} color={etape.iconColor} strokeWidth={1.8} />
            </motion.div>
            <motion.h2 style={{ fontSize: isMobile ? 16 : 19, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', margin: 0, lineHeight: 1.25 }}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {etape.titre}
            </motion.h2>
          </div>

          {/* Description */}
          <motion.p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: etape.isIntegrations || etape.isProfil || etape.isExtension ? 16 : etape.tip ? 12 : 18 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            {etape.description}
          </motion.p>

          {/* ── ÉTAPE INTÉGRATIONS ── */}
          {etape.isIntegrations && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div style={{ maxHeight: isMobile ? 280 : 320, overflowY: 'auto', paddingRight: 4, marginBottom: 12 }}>
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
                  Lecture seule — GetShift ne modifie jamais tes données. Tu peux déconnecter à tout moment.
                </span>
              </div>
            </motion.div>
          )}

          {/* ── ÉTAPE EXTENSION CHROME ── */}
          {etape.isExtension && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {/* Démo visuelle */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 12 }}>L'EXTENSION DÉTECTE</div>
                {[
                  { icon: '🎥', label: 'Réunion Zoom en cours', action: '→ Créer tâche préparation', color: '#2D8CFF' },
                  { icon: '📅', label: 'Cours Google Meet dans 30min', action: '→ Rappel automatique', color: '#0F9D58' },
                  { icon: '📝', label: 'Page Notion ouverte', action: '→ Lier à une tâche', color: '#fff' },
                  { icon: '📄', label: 'Fichier Drive détecté', action: '→ Joindre à une tâche', color: '#FBBC04' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: item.color, fontWeight: 600 }}>{item.action}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {extensionInstalled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10 }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Extension GetShift déjà installée ✓</span>
                </div>
              ) : (
                <motion.a
                  href="https://chrome.google.com/webstore/detail/getshift"
                  target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', background: '#FBBC04', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Chrome size={16} /> Installer l'extension Chrome
                  <ExternalLink size={12} />
                </motion.a>
              )}
            </motion.div>
          )}

          {/* ── ÉTAPE PROFIL ÉTUDIANT ── */}
          {etape.isProfil && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ProfilEtudiant profil={profilEtudiant} onChange={setProfilEtudiant} />
            </motion.div>
          )}

          {/* Tip */}
          {etape.tip && !etape.isExtension && (
            <motion.div style={{ padding: '9px 12px', background: `${etape.iconColor}0e`, border: `1px solid ${etape.iconColor}20`, borderRadius: 9, marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              {etape.tip}
            </motion.div>
          )}

          {/* Dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            {ETAPES.map((_, i) => (
              <motion.div key={i}
                style={{ height: 3, borderRadius: 99, cursor: 'pointer', background: i === etapeIdx ? etape.iconColor : i < etapeIdx ? etape.iconColor + '40' : 'rgba(255,255,255,0.1)' }}
                animate={{ width: i === etapeIdx ? 18 : 5 }} transition={{ duration: 0.22 }}
                onClick={() => setEtapeIdx(i)} />
            ))}
          </div>

          {/* Boutons nav */}
          <div style={{ display: 'flex', gap: 8 }}>
            {etapeIdx > 0 && !etape.fin && (
              <motion.button
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '11px 10px' : '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
                onClick={() => setEtapeIdx(i => i - 1)}
                whileHover={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
                <ChevronLeft size={13} />
                {!isMobile && 'Retour'}
              </motion.button>
            )}
            <motion.button
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: isMobile ? '13px 16px' : '12px 20px', background: `linear-gradient(135deg, ${etape.iconColor}, ${etape.iconColor}bb)`, border: 'none', borderRadius: 10, color: 'white', fontSize: isMobile ? 14 : 14, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 16px ${etape.iconColor}30` }}
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
            <motion.button style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11.5, cursor: 'pointer' }}
              onClick={onTerminer} whileHover={{ color: 'rgba(255,255,255,0.6)' }}>
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
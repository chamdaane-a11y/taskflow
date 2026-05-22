import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { applyTheme } from '../useTheme'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import MobileBackButton from '../components/MobileBackButton'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import { themes } from '../themes'
import {
  Search, ChevronDown, ChevronRight, ArrowRight,
  LayoutDashboard, Brain, Calendar, BarChart2, Sunrise,
  Target, Users, Zap, Bell, Smartphone, Wifi, Trophy,
  Clock, CalendarDays, Sparkles, CheckSquare, Star,
  ExternalLink, MessageCircle, Flag
} from 'lucide-react'

// ── FEATURES ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: LayoutDashboard, label: 'Dashboard',
    desc: 'Centre de commande : tâches, KPIs, focus du jour, assistant IA embarqué.',
    route: '/dashboard', color: 'var(--ember)',
  },
  {
    icon: Brain, label: 'Assistant IA',
    desc: 'Agent IA avec outils : crée des tâches, recherche le web, navigue dans l\'app, analyse ta semaine.',
    route: '/ia', color: '#8b5cf6',
  },
  {
    icon: Calendar, label: 'Planification',
    desc: 'Kanban + calendrier drag & drop. Time blocking, autoplan IA, overlay Google Calendar.',
    route: '/planification', color: '#0ea5e9',
  },
  {
    icon: BarChart2, label: 'Analytiques',
    desc: 'Graphiques de productivité, streak, répartition par priorité, heatmap hebdomadaire.',
    route: '/analytics', color: '#10b981',
  },
  {
    icon: Sunrise, label: 'Tomorrow Builder',
    desc: 'L\'IA génère ton planning du lendemain chaque soir à 19h, basé sur tes tâches et agenda.',
    route: '/tomorrow', color: '#f59e0b',
  },
  {
    icon: Target, label: 'Goal Reverse',
    desc: 'Décris un objectif ambitieux → l\'IA le décompose en tâches actionnables avec jalons.',
    route: '/goal', color: '#ef4444',
  },
  {
    icon: Users, label: 'Collaboration',
    desc: 'Partage des tâches, invitations par email, commentaires, tableau partagé en temps réel.',
    route: '/collaboration', color: '#6366f1',
  },
  {
    icon: CalendarDays, label: 'Google Calendar',
    desc: 'Sync bidirectionnelle : deadlines → all-day events, focus → time blocks, overlay dans Planification.',
    route: '/settings', color: '#34a853',
  },
  {
    icon: Trophy, label: 'Gamification',
    desc: 'XP, 10 niveaux, 4 piliers de badges, Streak Freeze. Chaque tâche terminée compte.',
    route: '/profile', color: '#f59e0b',
  },
  {
    icon: Clock, label: 'Pomodoro',
    desc: 'Timer 25/5 flottant, déclenché automatiquement sur la tâche en cours. Wake Lock actif.',
    route: '/planification', color: '#ef4444',
  },
]

// ── FAQ ───────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Comment installer GetShift sur mon téléphone ?',
    a: 'Sur Android (Chrome) : bannière d\'installation automatique, ou Settings > Notifications > "Installer l\'application". Sur iOS (Safari) : bouton Partager → "Sur l\'écran d\'accueil" → Ajouter. Une fois installée, l\'app fonctionne en plein écran sans barre de navigation.',
  },
  {
    q: 'Comment connecter Google Calendar ?',
    a: 'Va dans Settings > Intégrations > Google Calendar, clique "Connecter". Accepte les permissions read+write. La sync s\'active immédiatement : les deadlines créent des events all-day, les focus créent des time blocks. Tu peux aussi synchroniser manuellement chaque tâche depuis le Kanban.',
  },
  {
    q: 'La sync Google Calendar va-t-elle modifier mes événements existants ?',
    a: 'Non. GetShift ne touche jamais tes événements existants. Il crée uniquement de nouveaux events pour tes tâches GetShift, et les affiche en overlay grisé dans la vue Planification. Tu peux supprimer la sync d\'une tâche à tout moment.',
  },
  {
    q: 'Quelle est la différence entre Planification et Tomorrow Builder ?',
    a: 'Planification = ton espace de travail manuel. Tu glisses tes tâches sur un calendrier drag & drop, tu crées des time blocks. Tomorrow Builder = planification automatique : chaque soir à 19h, l\'IA analyse tes tâches, ton agenda Calendar et génère un plan optimisé pour le lendemain.',
  },
  {
    q: 'Comment fonctionne l\'IA ? Quelles données utilise-t-elle ?',
    a: 'L\'assistant utilise Groq (llama-3.3-70b) avec accès à tes tâches, ton agenda, tes stats de productivité et la recherche web (Serper). Il ne partage jamais tes données avec des tiers. Les conversations ne sont pas stockées de façon permanente.',
  },
  {
    q: 'L\'app fonctionne-t-elle hors connexion ?',
    a: 'Oui. GetShift est une PWA avec cache offline. Tu peux consulter et créer des tâches sans connexion — elles sont stockées localement et synchronisées automatiquement au retour du réseau. Les fonctionnalités IA nécessitent une connexion.',
  },
  {
    q: 'Pourquoi mes notifications push ne fonctionnent pas ?',
    a: 'Sur iOS : les push ne fonctionnent que si l\'app est installée sur l\'écran d\'accueil (iOS 16.4+). Sur Android : assure-toi que les notifications sont autorisées dans les paramètres du navigateur. Dans tous les cas, les notifications email (GetShift → Gmail) fonctionnent sans installation.',
  },
  {
    q: 'Comment débloquer des badges ?',
    a: 'Les badges sont organisés en 4 piliers : Productivité (tâches terminées), Consistance (streaks), Collaborateur (partage), Explorateur (fonctionnalités utilisées). Consulte tes badges dans Settings > Badges ou dans ton Profil pour voir ta progression.',
  },
  {
    q: 'Comment fonctionne le score de priorité intelligent ?',
    a: 'Chaque tâche reçoit un score calculé à partir de : priorité déclarée (haute/moyenne/basse), délai avant deadline, temps estimé, et si elle est bloquée. Le Dashboard affiche tes tâches triées par ce score pour toujours voir les plus urgentes en premier.',
  },
  {
    q: 'Puis-je utiliser GetShift en équipe ?',
    a: 'Oui. Dans Collaboration, tu peux partager des tâches par email, voir l\'activité de tes collaborateurs, commenter en temps réel, et suivre les performances de l\'équipe via le drawer analytiques. Chaque membre conserve son propre Dashboard.',
  },
]

// ── GUIDE STEPS ───────────────────────────────────────────────────────
const GUIDE = [
  {
    icon: '🚀', title: 'Créer ton compte',
    desc: 'Inscription gratuite en 30 secondes. Connexion Google disponible.',
    steps: ['Clique "Créer un compte" sur l\'accueil', 'Renseigne ton nom, email, mot de passe', 'Ou connecte-toi directement avec Google'],
  },
  {
    icon: '✅', title: 'Ajouter tes premières tâches',
    desc: 'Tape une tâche dans le Dashboard, choisis une priorité et une deadline.',
    steps: ['Dans le Dashboard, tape dans "Que dois-tu faire ?"', 'Choisis la priorité : Basse / Moyenne / Haute', 'Ajoute une deadline pour recevoir un rappel', 'Entrée ou "Ajouter" pour créer'],
  },
  {
    icon: '🤖', title: 'Lancer l\'Assistant IA',
    desc: 'Décris un objectif ou pose une question — l\'IA agit directement dans l\'app.',
    steps: ['Va dans "Assistant IA" dans la sidebar', 'Tape "Crée un plan pour apprendre Python"', 'L\'IA génère et ajoute les tâches directement', 'Tu peux aussi lui demander de planifier ta semaine'],
  },
  {
    icon: '📅', title: 'Planifier avec le calendrier',
    desc: 'Glisse tes tâches sur la grille horaire pour créer des time blocks.',
    steps: ['Va dans "Planification"', 'Passe en vue Calendrier', 'Glisse une tâche depuis la liste vers un créneau', 'Utilise "Planifier auto" pour laisser l\'IA tout organiser'],
  },
  {
    icon: '🔗', title: 'Connecter Google Calendar',
    desc: 'Sync bidirectionnelle — ton agenda GetShift et Google ne font plus qu\'un.',
    steps: ['Settings > Intégrations > Google Calendar', 'Clique "Connecter" et accepte les permissions', 'Les tâches avec deadline apparaissent dans Google Cal', 'Les events Google sont visibles dans Planification'],
  },
  {
    icon: '📊', title: 'Suivre ta progression',
    desc: 'Consulte tes analytiques et débloque des badges en progressant.',
    steps: ['Va dans "Analytiques" pour tes stats détaillées', 'Consulte ton streak et ton niveau dans le Profil', 'Complète des tâches haute priorité pour progresser vite', 'Tomorrow Builder génère ton planning chaque soir à 19h'],
  },
]

// ── COMPONENT ─────────────────────────────────────────────────────────
export default function Help() {
  const navigate = useNavigate()
  const { T, theme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }

  const [search, setSearch]         = useState('')
  const [openFaq, setOpenFaq]       = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  const filteredFaq = FAQ.filter(f =>
    !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  )

  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflowX: 'hidden' }}>

      <AppSidebar T={T} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile}>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>THÈME</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 4px' }}>
          {Object.entries(themes).map(([key, t]) => (
            <motion.button key={key}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 8, background: theme === key ? 'var(--ember-soft)' : 'transparent', border: `1px solid ${theme === key ? 'var(--ember-ring)' : 'var(--border-subtle)'}`, color: theme === key ? 'var(--ember)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: theme === key ? 600 : 400 }}
              onClick={() => applyTheme(key)} whileHover={{ x: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent }} />
              {t.name}
            </motion.button>
          ))}
        </div>
      </AppSidebar>

      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      <main style={{
        marginLeft: mainMargin, transition: 'margin-left 0.3s ease', flex: 1, minWidth: 0,
        paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT + 24 : 80,
      }}>

        {/* ══ HERO ══════════════════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(135deg, var(--ember) 0%, var(--ember-hover) 100%)',
          padding: isMobile ? '48px 24px 40px' : '64px 48px 56px',
          paddingTop: isMobile ? 80 : 64,
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '6px 14px', marginBottom: 20 }}>
              <Sparkles size={13} color="rgba(255,255,255,0.9)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>Centre d'aide GetShift</span>
            </div>
            <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 12, lineHeight: 1.2 }}>
              Comment pouvons-nous<br />vous aider ?
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 28, lineHeight: 1.6 }}>
              Guides, FAQ et tutoriels pour maîtriser GetShift.
            </p>
            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Chercher dans l'aide… (ex: Google Calendar, notifications)"
                style={{
                  width: '100%', padding: '14px 16px 14px 44px',
                  borderRadius: 14, border: 'none', outline: 'none',
                  fontSize: 14, background: 'rgba(255,255,255,0.95)',
                  color: 'var(--text-primary)', boxSizing: 'border-box',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              )}
            </div>
          </motion.div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '32px 20px' : '48px 40px' }}>

          {/* ══ QUICK ACTIONS ════════════════════════════════════════ */}
          {!search && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 56 }}>
              {[
                { icon: '⚡', title: 'Démarrage rapide', desc: 'Opérationnel en 5 minutes', action: () => setActiveStep(0), cta: 'Voir le guide' },
                { icon: '📱', title: 'Installer l\'app', desc: 'PWA mobile iOS & Android', action: () => navigate('/settings', { state: { section: 'notifications' } }), cta: 'Installer' },
                { icon: '🔗', title: 'Intégrations', desc: 'Google Calendar, Gmail, Notion…', action: () => navigate('/settings', { state: { section: 'integrations' } }), cta: 'Configurer' },
              ].map((card, i) => (
                <motion.div key={i}
                  onClick={card.action}
                  whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 18, padding: '24px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{card.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{card.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--ember)' }}>
                    {card.cta} <ArrowRight size={13} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ══ FEATURES GRID ════════════════════════════════════════ */}
          {!search && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ marginBottom: 56 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>Toutes les fonctionnalités</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Clique sur une feature pour y accéder directement.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 12 }}>
                {FEATURES.map((f, i) => {
                  const Icon = f.icon
                  return (
                    <motion.div key={i}
                      onClick={() => navigate(f.route)}
                      whileHover={{ y: -2, borderColor: f.color }}
                      whileTap={{ scale: 0.97 }}
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Icon size={18} color={f.color} strokeWidth={1.8} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>
          )}

          {/* ══ GUIDE INTERACTIF ═════════════════════════════════════ */}
          {!search && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: 56 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>Guide pas à pas</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>De zéro à productif en 6 étapes.</p>
              </div>

              {/* Step tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {GUIDE.map((g, i) => (
                  <motion.button key={i}
                    onClick={() => setActiveStep(i)}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', borderRadius: 99, border: '1px solid',
                      borderColor: activeStep === i ? 'var(--ember)' : 'var(--border-subtle)',
                      background: activeStep === i ? 'var(--ember-soft)' : 'var(--surface-1)',
                      color: activeStep === i ? 'var(--ember)' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: activeStep === i ? 600 : 400,
                      cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                    }}>
                    <span>{g.icon}</span>
                    <span style={{ display: isMobile ? 'none' : 'inline' }}>{g.title}</span>
                    <span style={{ display: isMobile ? 'inline' : 'none' }}>{i + 1}</span>
                  </motion.button>
                ))}
              </div>

              {/* Active step */}
              <AnimatePresence mode="wait">
                <motion.div key={activeStep}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: isMobile ? '24px 20px' : '32px 36px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                    <div style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>{GUIDE[activeStep].icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--ember)', fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ÉTAPE {activeStep + 1} / {GUIDE.length}</div>
                      <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.2px' }}>{GUIDE[activeStep].title}</h3>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>{GUIDE[activeStep].desc}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {GUIDE[activeStep].steps.map((s, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ember)', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                            <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, paddingTop: 2 }}>{s}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Nav */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => activeStep > 0 && setActiveStep(activeStep - 1)}
                      style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: activeStep === 0 ? 'not-allowed' : 'pointer', opacity: activeStep === 0 ? 0.4 : 1 }}>
                      ← Précédent
                    </button>
                    {activeStep < GUIDE.length - 1 ? (
                      <motion.button onClick={() => setActiveStep(activeStep + 1)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 10, background: 'var(--ember)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Suivant <ArrowRight size={14} />
                      </motion.button>
                    ) : (
                      <motion.button onClick={() => navigate('/dashboard')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 10, background: 'var(--ember)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <Star size={14} /> Commencer !
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.section>
          )}

          {/* ══ FAQ ══════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ marginBottom: 56 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>
                {search ? `Résultats pour "${search}"` : 'Questions fréquentes'}
              </h2>
              {search && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filteredFaq.length} résultat{filteredFaq.length !== 1 ? 's' : ''} trouvé{filteredFaq.length !== 1 ? 's' : ''}</p>}
            </div>

            {filteredFaq.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: 14 }}>
                Aucun résultat. <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--ember)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Effacer la recherche</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredFaq.map((f, i) => (
                  <motion.div key={i} layout style={{ background: 'var(--surface-1)', border: `1px solid ${openFaq === i ? 'var(--ember-ring)' : 'var(--border-subtle)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{f.q}</span>
                      <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
                        <ChevronDown size={16} color="var(--text-secondary)" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}>
                          <div style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                            {f.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* ══ FOOTER CTA ═══════════════════════════════════════════ */}
          {!search && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: isMobile ? '28px 24px' : '40px 48px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Prêt à être productif ?</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Tu as tout ce qu'il faut. Lance-toi — le Dashboard t'attend.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
                <motion.button onClick={() => navigate('/dashboard')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, background: 'var(--ember)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Ouvrir le Dashboard <ArrowRight size={15} />
                </motion.button>
                <motion.button
                  onClick={() => window.open('https://github.com/chamdaane-a11y/taskflow/issues', '_blank')}
                  whileHover={{ scale: 1.02 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  <MessageCircle size={15} /> Signaler un bug
                </motion.button>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      {isMobile && <MobileBackButton T={T} label="Dashboard" />}
      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}

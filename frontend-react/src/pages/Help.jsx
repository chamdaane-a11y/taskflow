import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { themes } from '../themes'
import { useMediaQuery } from '../useMediaQuery'
import {
  LayoutDashboard, Bot, BarChart2, Calendar, Users,
  Layers, Menu, Settings, Award, Palette, LogOut,
  ChevronRight, HelpCircle, CheckSquare, Plus, Sparkles,
  Bell, Target, Star, ArrowRight, Play, ChevronDown, ChevronUp,
  UserPlus, ListTodo, Trophy, TrendingUp, Share2
} from 'lucide-react'

const API = 'https://taskflow-production-75c1.up.railway.app'

const stepIcons = [UserPlus, ListTodo, Sparkles, Trophy, TrendingUp, Bell, Share2, Palette]

const steps = [
  {
    num: 1,
    icon: '👤➕',
    title: 'Créer ton compte',
    color: '#6c63ff',
    description: 'Commence par créer ton compte TaskFlow gratuitement.',
    details: [
      'Va sur la page d\'accueil et clique sur "Créer un compte"',
      'Entre ton nom, email et mot de passe',
      'Connecte-toi avec tes identifiants',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, #6c63ff, #4caf82)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>📝</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 8, background: T.border, borderRadius: 99, width: '60%', marginBottom: 4 }} />
              <div style={{ height: 6, background: T.border, borderRadius: 99, width: '40%', opacity: 0.5 }} />
            </div>
          </div>
          {['Nom complet', 'Email', 'Mot de passe'].map((f, i) => (
            <div key={i} style={{ padding: '8px 12px', background: T.bg2, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, color: T.text2 }}>{f}</div>
          ))}
          <div style={{ padding: '9px', background: '#6c63ff', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'white' }}>Créer mon compte</div>
        </div>
      </div>
    )
  },
  {
    num: 2,
    icon: '✓',
    title: 'Ajouter tes premières tâches',
    color: '#4caf82',
    description: 'Crée tes tâches manuellement ou laisse l\'IA le faire pour toi.',
    details: [
      'Dans le Dashboard, tape une tâche dans le champ "Que dois-tu faire ?"',
      'Choisis une priorité : Basse, Moyenne ou Haute',
      'Ajoute une deadline si tu veux un rappel',
      'Clique sur "Ajouter" ou appuie sur Entrée',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '8px 12px', background: T.bg2, borderRadius: 8, border: `1px solid #4caf82`, fontSize: 12, color: T.text }}>Finir le projet React...</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '7px 10px', background: T.bg2, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, color: '#e05c5c' }}>🔴 Haute</div>
            <div style={{ flex: 1, padding: '7px 10px', background: T.bg2, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, color: T.text2 }}>📅 14/03</div>
            <div style={{ padding: '7px 14px', background: '#4caf82', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'white' }}>+ Ajouter</div>
          </div>
          <div style={{ height: 1, background: T.border }} />
          {['Finir le projet React', 'Réviser les maths', 'Appeler le médecin'].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${i === 0 ? '#4caf82' : T.border}`, background: i === 0 ? '#4caf82' : 'transparent', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: i === 0 ? T.text2 : T.text, textDecoration: i === 0 ? 'line-through' : 'none' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    num: 3,
    icon: '✨',
    title: 'Utiliser l\'Assistant IA',
    color: '#e08a3c',
    description: 'Décris ton objectif et l\'IA génère automatiquement un plan de tâches.',
    details: [
      'Va dans "Assistant IA" dans la sidebar',
      'Tape ton objectif (ex: "Apprendre React en 30 jours")',
      'L\'IA génère 5 tâches structurées automatiquement',
      'Tu peux aussi chatter avec l\'IA pour des conseils',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, #e08a3c, #6c63ff)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color="white" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Assistant IA</span>
          </div>
          <div style={{ padding: '10px 12px', background: `#e08a3c15`, borderRadius: 8, border: `1px solid #e08a3c30`, fontSize: 11, color: T.text2 }}>
            💬 "Apprendre React en 30 jours"
          </div>
          <div style={{ fontSize: 11, color: T.text2, padding: '4px 0' }}>✨ Tâches générées :</div>
          {['Bases JavaScript ES6', 'Composants et props', 'Hooks useState/useEffect'].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#e08a3c' }} />
              <span style={{ fontSize: 11, color: T.text }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    num: 4,
    icon: '🏅',
    title: 'Gagner des points et monter de niveau',
    color: '#c9a84c',
    description: 'Chaque tâche terminée te rapporte des points et des badges.',
    details: [
      'Tâche basse priorité = +10 pts',
      'Tâche moyenne priorité = +20 pts',
      'Tâche haute priorité = +30 pts',
      'Débloque des badges en progressant',
      'Monte de Débutant jusqu\'à Maître',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: T.text2 }}>Niveau 3 — Confirmé</span>
            <span style={{ fontSize: 12, color: '#c9a84c', fontWeight: 700 }}>340 pts</span>
          </div>
          <div style={{ height: 6, background: T.bg2, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '72%', background: 'linear-gradient(90deg, #c9a84c, #e08a3c)', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['🏅 1ère tâche', '⭐ 5 tâches', '💯 100 pts'].map((b, i) => (
              <div key={i} style={{ padding: '4px 10px', borderRadius: 99, background: `#c9a84c20`, border: `1px solid #c9a84c40`, fontSize: 11, color: '#c9a84c' }}>{b}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: n <= 3 ? '#c9a84c' : T.bg2 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2 }}>
            <span>Débutant</span><span>Maître</span>
          </div>
        </div>
      </div>
    )
  },
  {
    num: 5,
    icon: '📈',
    title: 'Suivre ta progression',
    color: '#6c63ff',
    description: 'Consulte tes analytiques pour voir tes habitudes et performances.',
    details: [
      'Va dans "Analytiques" pour voir tes stats',
      'Graphiques de tâches complétées par semaine',
      'Répartition par priorité et catégorie',
      'Planifie tes tâches dans le calendrier',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Total', val: '24', color: '#6c63ff' },
              { label: 'Terminées', val: '18', color: '#4caf82' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '10px', background: T.bg2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: T.text2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, padding: '0 4px' }}>
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? '#6c63ff' : `#6c63ff40`, borderRadius: 4 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.text2 }}>
            {['L','M','M','J','V','S','D'].map((d,i) => <span key={i}>{d}</span>)}
          </div>
        </div>
      </div>
    )
  },
  {
    num: 6,
    icon: '🔔',
    title: 'Activer les notifications',
    color: '#e05c5c',
    description: 'Reçois des alertes sur ton téléphone avant chaque deadline.',
    details: [
      'Ouvre le Dashboard sur ton téléphone',
      'Accepte la demande de notifications',
      'Tu recevras une alerte 3 jours avant chaque deadline',
      'Les notifications arrivent même quand l\'app est fermée',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 56, height: 100, borderRadius: 12, background: T.bg2, border: `2px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 16, height: 3, borderRadius: 99, background: T.border }} />
            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, bottom: 0, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 40, padding: 6, background: T.bg3, borderRadius: 6, border: `1px solid #e05c5c40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                  <Bell size={8} color="#e05c5c" />
                  <span style={{ fontSize: 7, fontWeight: 600, color: T.text }}>TaskFlow</span>
                </div>
                <div style={{ fontSize: 6, color: T.text2, lineHeight: 1.4 }}>⏰ Deadline demain !</div>
              </div>
            </div>
          </div>
          <span style={{ fontSize: 11, color: T.text2, textAlign: 'center' }}>Notification push sur ton téléphone</span>
        </div>
      </div>
    )
  },
  {
    num: 7,
    icon: '👥',
    title: 'Collaborer avec d\'autres',
    color: '#4caf82',
    description: 'Partage tes tâches et travaille en équipe.',
    details: [
      'Va dans "Collaboration" dans la sidebar',
      'Clique sur "Partager" sur une tâche',
      'Entre l\'email de ton collaborateur',
      'Il reçoit une invitation et peut voir/commenter tes tâches',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Partager "Projet React"</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '7px 10px', background: T.bg2, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 11, color: T.text2 }}>email@exemple.com</div>
            <div style={{ padding: '7px 12px', background: '#4caf82', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'white' }}>Inviter</div>
          </div>
          <div style={{ height: 1, background: T.border }} />
          <div style={{ fontSize: 11, color: T.text2 }}>Membres :</div>
          {['Toi (propriétaire)', 'Alice (Actif)', 'Bob (En attente)'].map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `linear-gradient(135deg, #4caf82, #6c63ff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>
                {m.charAt(0)}
              </div>
              <span style={{ fontSize: 11, color: T.text }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    num: 8,
    icon: '🎨',
    title: 'Changer le thème',
    color: '#c9a84c',
    description: 'Personnalisez l\'apparence de TaskFlow selon vos préférences.',
    details: [
      'Cliquez sur "Paramètres" dans la barre latérale',
      'Sélectionnez "Thème" pour voir les options',
      'Choisissez parmi 5 thèmes disponibles',
      'Le thème est sauvegardé automatiquement',
    ],
    illustration: (T) => (
      <div style={{ background: T.bg3, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, color: T.text2, fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>THÈMES DISPONIBLES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'Sombre', bg: '#0f0f13', bg2: '#16161d', accent: '#c9a84c', text: '#f0f0f5' },
            { name: 'Clair', bg: '#f5f5f0', bg2: '#ffffff', accent: '#6c63ff', text: '#1a1a2e' },
            { name: 'Océan', bg: '#0a1628', bg2: '#0d2137', accent: '#00b4d8', text: '#e0f0ff' },
            { name: 'Forêt', bg: '#0a1a0f', bg2: '#0f2318', accent: '#4caf82', text: '#e0ffe8' },
            { name: 'Coucher de soleil', bg: '#1a0a0f', bg2: '#2d0f18', accent: '#ff6b6b', text: '#ffe8e8' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: t.bg2, borderRadius: 10, border: `2px solid ${t.accent}30` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, border: `1px solid ${t.accent}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 16, height: 4, borderRadius: 99, background: t.accent }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{t.name}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[t.bg, t.bg2, t.accent].map((c, j) => (
                    <div key={j} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
              </div>
              <div style={{ width: 40, height: 24, borderRadius: 6, background: t.bg, border: `1px solid ${t.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 3, borderRadius: 99, background: t.accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
]

export default function Help() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [activeStep, setActiveStep] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const user = JSON.parse(localStorage.getItem('user'))
  const T = themes[theme]

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
    { icon: Users, label: 'Collaboration', path: '/collaboration' },
    { icon: HelpCircle, label: 'Aide', path: '/help' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @media (max-width: 768px) {
          .help-grid { grid-template-columns: 1fr !important; }
          .main-padding { padding: 16px !important; }
        }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 'min(248px, 80%)', maxWidth: '248px', background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px, 3vh, 24px) clamp(12px, 2vw, 16px)', position: 'fixed', top: 0, left: isMobile ? (showSidebar ? 0 : '-100%') : 0, height: '100vh', transition: 'left 0.3s ease', zIndex: 100, overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>TaskFlow</span>
        </div>

        {user && (
          <div style={{ background: T.bg3, borderRadius: 12, padding: 14, marginBottom: 24, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {user?.nom?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nom}</div>
                <div style={{ fontSize: 11, color: T.text2 }}>Connecté</div>
              </div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
          {navItems.map(item => {
            const Icon = item.icon
            const active = window.location.pathname === item.path
            return (
              <motion.button key={item.path}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2, transition: 'all 0.15s' }}
                onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }}
                whileHover={{ x: 2, color: T.accent }}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {item.label}
              </motion.button>
            )
          })}
        </nav>

        {/* Paramètres */}
        <div style={{ position: 'relative', marginTop: 8 }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: showSettings ? `${T.accent}15` : 'transparent', border: 'none', color: showSettings ? T.accent : T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
            onClick={() => setShowSettings(!showSettings)} whileHover={{ color: T.accent }}>
            <Settings size={16} strokeWidth={1.8} />
            Paramètres
          </motion.button>
          <AnimatePresence>
            {showSettings && (
              <motion.div style={{ background: T.bg3, borderRadius: 12, padding: 8, marginTop: 4, border: `1px solid ${T.border}` }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 12 }}
                  onClick={() => setShowThemes(!showThemes)} whileHover={{ color: T.accent }}>
                  <Palette size={14} /> Thème
                </motion.button>
                <AnimatePresence>
                  {showThemes && (
                    <motion.div style={{ background: T.bg2, borderRadius: 8, padding: 6, margin: '4px 0', border: `1px solid ${T.border}` }}
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      {Object.entries(themes).map(([key, t]) => (
                        <motion.button key={key}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 6, background: theme === key ? `${T.accent}20` : 'transparent', border: 'none', color: theme === key ? T.accent : T.text2, cursor: 'pointer', fontSize: 11, marginBottom: 2 }}
                          onClick={() => { setTheme(key); localStorage.setItem('theme', key) }} whileHover={{ x: 2 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent }} />
                          {t.name}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 12, marginTop: 4 }}
                  onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                  whileHover={{ background: 'rgba(224,92,92,0.1)' }}>
                  <LogOut size={14} /> Déconnexion
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Burger mobile */}
      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 16, left: 16, zIndex: 200, width: 40, height: 40, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={20} />
        </motion.button>
      )}
      {isMobile && showSidebar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setShowSidebar(false)} />
      )}

      {/* Main */}
      <main className="main-padding" style={{ marginLeft: isMobile ? 0 : 248, flex: 1, padding: 'clamp(16px, 4vw, 40px)', minWidth: 0, paddingTop: isMobile ? 72 : 'clamp(16px, 4vw, 40px)' }}>

        {/* Header */}
        <motion.div style={{ marginBottom: 40 }} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={20} color={T.bg} strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>Guide d'utilisation</h1>
              <p style={{ color: T.text2, fontSize: 13, marginTop: 2 }}>Tout ce qu'il faut savoir pour maîtriser TaskFlow</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{ background: T.bg2, borderRadius: 14, padding: '16px 20px', marginTop: 24, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: T.text2, fontWeight: 500 }}>Progression du tutoriel</span>
              <span style={{ color: T.accent, fontWeight: 700 }}>{activeStep + 1}/{steps.length}</span>
            </div>
            <div style={{ height: 6, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, borderRadius: 99 }}
                animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {steps.map((s, i) => {
                const StepIcon = stepIcons[i]
                return (
                  <motion.button key={i}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${i <= activeStep ? s.color : T.border}`, background: i < activeStep ? s.color : i === activeStep ? `${s.color}20` : 'transparent', color: i <= activeStep ? (i < activeStep ? 'white' : s.color) : T.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
                    onClick={() => setActiveStep(i)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}>
                    {i < activeStep ? '✓' : <StepIcon size={12} strokeWidth={2} />}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Étape active */}
        <AnimatePresence mode="wait">
          <motion.div key={activeStep}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>

            <div className="help-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

              {/* Infos */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${steps[activeStep].color}20`, border: `2px solid ${steps[activeStep].color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {steps[activeStep].icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: steps[activeStep].color, fontWeight: 600, letterSpacing: 1, marginBottom: 2 }}>ÉTAPE {steps[activeStep].num}</div>
                    <h2 style={{ fontSize: 'clamp(18px, 3vw, 22px)', fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>{steps[activeStep].title}</h2>
                  </div>
                </div>

                <p style={{ fontSize: 14, color: T.text2, lineHeight: 1.7, marginBottom: 20 }}>{steps[activeStep].description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {steps[activeStep].details.map((detail, i) => (
                    <motion.div key={i}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: T.bg2, borderRadius: 10, border: `1px solid ${T.border}` }}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${steps[activeStep].color}20`, border: `1px solid ${steps[activeStep].color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: steps[activeStep].color, flexShrink: 0, marginTop: 1 }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{detail}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Illustration */}
              <div>
                <div style={{ position: 'sticky', top: 24 }}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: T.text2, fontWeight: 500 }}>APERÇU</span>
                  </div>
                  {steps[activeStep].illustration(T)}
                </div>
              </div>
            </div>

            {/* Navigation entre étapes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <motion.button
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 13, fontWeight: 500, cursor: activeStep === 0 ? 'not-allowed' : 'pointer', opacity: activeStep === 0 ? 0.4 : 1 }}
                onClick={() => activeStep > 0 && setActiveStep(activeStep - 1)}
                whileHover={activeStep > 0 ? { borderColor: T.accent, color: T.accent } : {}}>
                ← Précédent
              </motion.button>

              <span style={{ fontSize: 12, color: T.text2 }}>
                {activeStep + 1} / {steps.length}
              </span>

              {activeStep < steps.length - 1 ? (
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: steps[activeStep].color, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setActiveStep(activeStep + 1)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  Suivant <ArrowRight size={14} />
                </motion.button>
              ) : (
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: 'none', borderRadius: 10, color: T.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => navigate('/dashboard')}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Star size={14} /> Commencer !
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Toutes les étapes (aperçu rapide) */}
        <motion.div style={{ marginTop: 48 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ height: 1, flex: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.text2, fontWeight: 600, letterSpacing: 1 }}>TOUTES LES ÉTAPES</span>
            <div style={{ height: 1, flex: 1, background: T.border }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {steps.map((step, i) => {
              const StepIcon = stepIcons[i]
              return (
                <motion.button key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: activeStep === i ? `${step.color}15` : T.bg2, border: `1px solid ${activeStep === i ? step.color : T.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                  onClick={() => setActiveStep(i)}
                  whileHover={{ y: -2, borderColor: step.color }}
                  whileTap={{ scale: 0.98 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${step.color}15`, border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <StepIcon size={15} color={step.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: step.color, fontWeight: 600, marginBottom: 2 }}>Étape {step.num}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{step.title}</div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

      </main>
    </div>
  )
}
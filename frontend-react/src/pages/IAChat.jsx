import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { useTheme } from '../useTheme'
import {
  Bot, Send, History, Link, LayoutDashboard, BarChart2, Calendar,
  LogOut, Copy, Plus, X, ChevronRight, Layers, Menu, HelpCircle,
  Users, Sparkles, Zap, Brain, Code, FileText, CheckCircle, Trash2,
  Globe, Search, AlertCircle, Check
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'

const API = 'https://getshift-backend.onrender.com'

const modeles = [
  { id: 'llama-3.3-70b-versatile', nom: 'Llama 3.3', description: 'Meta — Très puissant', badge: '⚡ Recommandé' },
  { id: 'mixtral-8x7b-32768', nom: 'Mixtral', description: 'Mistral AI — Rapide', badge: '🚀 Rapide' },
  { id: 'gemma2-9b-it', nom: 'Gemma 2', description: 'Google — Efficace', badge: '✨ Léger' },
]

const SUGGESTIONS = [
  { icon: Brain, text: 'Aide-moi à planifier ma semaine', color: '#6c63ff' },
  { icon: Zap, text: 'Génère 5 tâches pour apprendre React', color: '#e08a3c' },
  { icon: Globe, text: "Recherche les dernières tendances IA", color: '#4caf82' },
  { icon: FileText, text: 'Crée une tâche : finir le rapport', color: '#e05c5c' },
]

// ── Couleurs intention ────────────────────────────────────────────────────────
const INTENTION_CONFIG = {
  search:           { label: 'Recherche web', color: '#4caf82',  icon: Globe },
  action_creer:     { label: 'Tâche créée',   color: '#6c63ff',  icon: Plus },
  action_terminer:  { label: 'Tâche terminée',color: '#4caf82',  icon: CheckCircle },
  action_planifier: { label: 'Planification', color: '#e08a3c',  icon: Calendar },
  chat:             { label: 'Assistant',     color: '#a855f7',  icon: Sparkles },
}

// ── Rendu tableau Markdown ────────────────────────────────────────────────────
function RenduTableau({ lignes, T }) {
  if (lignes.length < 2) return null
  const headers = lignes[0].split('|').map(h => h.trim()).filter(Boolean)
  const rows = lignes.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean))
  return (
    <div style={{ overflowX: 'auto', marginBottom: 12, marginTop: 8, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: `${T.accent}15` }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: T.accent, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${T.accent}05` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '7px 14px', color: T.text, borderBottom: `1px solid ${T.border}30`, fontSize: 13, lineHeight: 1.5 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Rendu Markdown enrichi (tableaux, listes, titres, code, emploi du temps) ──
function RenduMarkdown({ content, T }) {
  const lines = content.split('\n')

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} style={{ fontWeight: 700, color: T.text }}>{part.slice(2, -2)}</strong>
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 12, fontFamily: 'monospace', color: '#4caf82' }}>{part.slice(1, -1)}</code>
      return part
    })
  }

  const elements = []
  let i = 0
  let inCodeBlock = false
  let codeLines = []
  let tableLines = []

  while (i < lines.length) {
    const line = lines[i]

    // Bloc de code ```
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLines = []
      } else {
        inCodeBlock = false
        elements.push(
          <div key={`code-${i}`} style={{ background: '#0d0d14', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10, marginTop: 6, overflowX: 'auto', position: 'relative' }}>
            <div style={{ fontSize: 10, color: T.text2, marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>CODE</div>
            <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#4caf82', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        )
        codeLines = []
      }
      i++; continue
    }
    if (inCodeBlock) { codeLines.push(line); i++; continue }

    // Tableau Markdown : détecter un bloc de lignes avec |
    if (line.startsWith('|') && line.endsWith('|')) {
      tableLines = [line]
      while (i + 1 < lines.length && (lines[i + 1].startsWith('|') || lines[i + 1].match(/^\|[-| ]+\|$/))) {
        i++
        tableLines.push(lines[i])
      }
      elements.push(<RenduTableau key={`table-${i}`} lignes={tableLines} T={T} />)
      tableLines = []
      i++; continue
    }

    // Titres
    if (line.startsWith('### ')) {
      elements.push(<div key={i} style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 14, marginBottom: 5 }}>{renderInline(line.slice(4))}</div>)
      i++; continue
    }
    if (line.startsWith('## ')) {
      elements.push(<div key={i} style={{ fontSize: 15, fontWeight: 800, color: T.text, marginTop: 18, marginBottom: 7, letterSpacing: '-0.3px' }}>{renderInline(line.slice(3))}</div>)
      i++; continue
    }
    if (line.startsWith('# ')) {
      elements.push(<div key={i} style={{ fontSize: 17, fontWeight: 800, color: T.text, marginTop: 20, marginBottom: 10, letterSpacing: '-0.5px' }}>{renderInline(line.slice(2))}</div>)
      i++; continue
    }

    // Liste à puces
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const txt = line.startsWith('- ') ? line.slice(2) : line.slice(2)
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0, marginTop: 7 }} />
          <span style={{ fontSize: 14, color: T.text, lineHeight: 1.7 }}>{renderInline(txt)}</span>
        </div>
      )
      i++; continue
    }

    // Liste numérotée
    const numMatch = line.match(/^(\d+)\. (.+)/)
    if (numMatch) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 5 }}>
          <div style={{ minWidth: 22, height: 22, borderRadius: 6, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.accent, flexShrink: 0, marginTop: 2 }}>
            {numMatch[1]}
          </div>
          <span style={{ fontSize: 14, color: T.text, lineHeight: 1.7 }}>{renderInline(numMatch[2])}</span>
        </div>
      )
      i++; continue
    }

    // Séparateur ---
    if (line.match(/^-{3,}$/)) {
      elements.push(<div key={i} style={{ height: 1, background: T.border, margin: '12px 0' }} />)
      i++; continue
    }

    // Ligne vide
    if (!line.trim()) {
      elements.push(<div key={i} style={{ height: 8 }} />)
      i++; continue
    }

    // Ligne normale
    elements.push(
      <div key={i} style={{ fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: 2 }}>
        {renderInline(line)}
      </div>
    )
    i++
  }

  return <div>{elements}</div>
}

// ── Badge d'intention ─────────────────────────────────────────────────────────
function BadgeIntention({ intention, T }) {
  if (!intention || intention === 'chat') return null
  const cfg = INTENTION_CONFIG[intention]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: `${cfg.color}15`, border: `1px solid ${cfg.color}35`, borderRadius: 99, marginBottom: 8 }}>
      <Icon size={10} color={cfg.color} />
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 0.5 }}>{cfg.label.toUpperCase()}</span>
    </motion.div>
  )
}

// ── Badge abréviations ────────────────────────────────────────────────────────
function BadgeAbrev({ messageOriginal, messageExpande, T }) {
  const [show, setShow] = useState(false)
  if (!messageExpande || messageOriginal === messageExpande) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
      <motion.button
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 99, cursor: 'pointer', fontSize: 10, color: T.accent, fontWeight: 600 }}
        onClick={() => setShow(!show)}>
        <Zap size={9} />
        Abréviations détectées
      </motion.button>
      <AnimatePresence>
        {show && (
          <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: 11, color: T.text2 }}>
            "{messageOriginal}" → "{messageExpande}"
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Bloc résultats web search ─────────────────────────────────────────────────
function BlocSearchResults({ results, T }) {
  const [expanded, setExpanded] = useState(false)
  if (!results || results.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
      <motion.button
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: expanded ? 10 : 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        onClick={() => setExpanded(!expanded)}>
        <Globe size={11} color='#4caf82' />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#4caf82', letterSpacing: 0.5 }}>
          {results.length} SOURCE{results.length > 1 ? 'S' : ''} WEB
        </span>
        <ChevronRight size={10} color={T.text2} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </motion.button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', background: `${T.bg}`, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title || 'Résultat'}
                </div>
                <div style={{ fontSize: 11, color: T.text2, lineHeight: 1.5 }}>
                  {r.snippet?.substring(0, 150)}{r.snippet?.length > 150 ? '...' : ''}
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, color: '#4caf82', marginTop: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.url}
                  </a>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Bloc action directe (tâche créée / terminée) ──────────────────────────────
function BlocAction({ action, T }) {
  if (!action) return null
  if (action.type === 'tache_creee') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ marginTop: 10, padding: '10px 14px', background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Plus size={14} color={T.accent} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>Tâche créée automatiquement</div>
          <div style={{ fontSize: 11, color: T.text2 }}>"{action.titre}"</div>
        </div>
      </motion.div>
    )
  }
  if (action.type === 'tache_terminee') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ marginTop: 10, padding: '10px 14px', background: '#4caf8215', border: '1px solid #4caf8230', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Check size={14} color='#4caf82' />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4caf82' }}>Tâche marquée terminée !</div>
          <div style={{ fontSize: 11, color: T.text2 }}>"{action.titre}"</div>
        </div>
      </motion.div>
    )
  }
  if (action.type === 'redirect_tomorrow_builder') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ marginTop: 10, padding: '10px 14px', background: '#e08a3c15', border: '1px solid #e08a3c30', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={14} color='#e08a3c' />
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e08a3c' }}>Redirige vers Tomorrow Builder →</div>
      </motion.div>
    )
  }
  return null
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(user, taches, profil) {
  const terminees = taches.filter(t => t.terminee).length
  const enCours = taches.filter(t => !t.terminee)
  const enRetard = enCours.filter(t => t.deadline && new Date(t.deadline) < new Date())
  const haute = enCours.filter(t => t.priorite === 'haute')
  return `Tu es l'assistant IA personnel de ${user.nom} sur GetShift, une app de productivité.
PROFIL : Niveau ${profil?.niveau || 1} · ${profil?.points || 0} pts · Streak ${profil?.streak || 0}j
TÂCHES : ${taches.length} total · ${terminees} terminées · ${enCours.length} en cours · ${enRetard.length} en retard
${haute.length > 0 ? `HAUTE PRIORITÉ : ${haute.slice(0, 3).map(t => `"${t.titre}"`).join(', ')}` : ''}
TOP TÂCHES EN COURS :
${enCours.slice(0, 6).map(t => `- [${t.priorite.toUpperCase()}] ${t.titre}${t.deadline ? ` · deadline ${new Date(t.deadline).toLocaleDateString('fr-FR')}` : ''}`).join('\n') || '- Aucune'}
INSTRUCTIONS :
- Réponds en français (adapte si autre langue)
- Utilise markdown : ## titres, **gras**, - listes, | tableaux |, \`\`\` code \`\`\`
- Pour plannings/emplois du temps : tableau markdown Heure | Tâche | Durée | Priorité
- Pour comparaisons : tableaux markdown
- Sois concis, personnalisé, actionnable — évite le remplissage
- Tu connais ${user.nom} et son contexte, réfère-t'y naturellement`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function IAChat() {
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  const [prompt, setPrompt] = useState('')
  const [modele, setModele] = useState('llama-3.3-70b-versatile')
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`chat_messages_${user?.id}`)
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)
  const [taches, setTaches] = useState([])
  const [profil, setProfil] = useState(null)
  const [tacheSelectionnee, setTacheSelectionnee] = useState(null)
  const [historique, setHistorique] = useState([])
  const [showHistorique, setShowHistorique] = useState(false)
  const [copie, setCopie] = useState(null)
  const [forceSearch, setForceSearch] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerTaches()
    chargerHistorique()
    chargerProfil()
  }, [])

  useEffect(() => {
    if (user) chargerTaches()
  }, [location.pathname])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (user) localStorage.setItem(`chat_messages_${user.id}`, JSON.stringify(messages))
  }, [messages])

  const chargerProfil = async () => {
    try { const res = await axios.get(`${API}/users/${user.id}`); setProfil(res.data) } catch {}
  }
  const chargerTaches = async () => {
    try { const res = await axios.get(`${API}/taches/${user.id}`); setTaches(res.data) } catch {}
  }
  const chargerHistorique = async () => {
    try { const res = await axios.get(`${API}/ia/historique/${user.id}`); setHistorique(res.data) } catch {}
  }

  // ── Envoi du message — route Sprint 8 /ia/assistant ────────────────────────
  const envoyerPrompt = useCallback(async (promptTexte) => {
    const texte = (promptTexte || prompt).trim()
    if (!texte || loading) return

    const userMsg = { role: 'user', content: texte }
    setMessages(prev => [...prev, userMsg])
    setPrompt('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      // Historique pour contexte (14 derniers messages)
      const historiquePour = messages
        .filter(m => m.role === 'user' || m.role === 'ia')
        .slice(-14)
        .map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content }))

      const res = await axios.post(`${API}/ia/assistant`, {
        user_id: user.id,
        message: texte,
        modele,
        historique: historiquePour,
        tache_id: tacheSelectionnee || null,
        force_search: forceSearch,
      })

      const data = res.data
      const iaMsg = {
        role: 'ia',
        content: data.reponse,
        modele: data.modele || modele,
        intention: data.intention,
        action: data.action || null,
        abrev_expandees: data.abrev_expandees,
        message_original: data.message_original,
        message_expande: data.message_expande,
        search_results: data.search_results || null,
      }
      setMessages(prev => [...prev, iaMsg])

      // Confetti si action créer/terminer
      if (data.action?.type === 'tache_creee' || data.action?.type === 'tache_terminee') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
        chargerTaches()
      }

      // Redirect Tomorrow Builder
      if (data.action?.type === 'redirect_tomorrow_builder') {
        setTimeout(() => navigate('/planification'), 1800)
      }

      // Reset force_search après usage
      if (forceSearch) setForceSearch(false)
      if (tacheSelectionnee) setTacheSelectionnee(null)
      chargerHistorique()

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'erreur',
        content: err.response?.data?.erreur || 'Erreur de connexion. Réessaie dans quelques secondes.'
      }])
    }
    setLoading(false)
  }, [prompt, loading, messages, modele, tacheSelectionnee, forceSearch, user, T, navigate])

  const creerTacheDepuisIA = async (titre) => {
    try {
      await axios.post(`${API}/taches`, { titre: titre.substring(0, 100), priorite: 'moyenne', user_id: user.id })
      chargerTaches()
      setMessages(prev => [...prev, { role: 'systeme', content: `✓ Tâche créée : "${titre.substring(0, 50)}"` }])
    } catch {}
  }

  const copierMessage = (content, idx) => {
    navigator.clipboard.writeText(content)
    setCopie(idx)
    setTimeout(() => setCopie(null), 2000)
  }

  const effacerConversation = () => {
    localStorage.removeItem(`chat_messages_${user?.id}`)
    setMessages([])
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const modeleActuel = modeles.find(m => m.id === modele)

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
    { icon: Users, label: 'Collaboration', path: '/collaboration' },
    { icon: HelpCircle, label: 'Aide', path: '/help' },
  ]

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        textarea { scrollbar-width: none; }
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 'min(260px, 85%)', maxWidth: 260,
        background: T.bg2, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', padding: '20px 14px',
        position: 'fixed', top: 0,
        left: isMobile ? (showSidebar ? 0 : '-100%') : 0,
        height: '100vh', transition: 'left 0.3s ease',
        zIndex: 100, overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 6px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif" }}>GetShift</span>
        </div>

        {/* Profil mini */}
        {profil && (
          <div style={{ background: T.bg3, borderRadius: 12, padding: '10px 12px', marginBottom: 20, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.bg, flexShrink: 0 }}>
                {user?.nom?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom}</div>
                <div style={{ fontSize: 11, color: T.accent }}>{profil.points || 0} pts · Nv.{profil.niveau || 1}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 6px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/ia'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 9, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }}
              whileHover={{ x: 2, color: T.accent }}>
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </motion.button>
          )
        })}

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Modèles */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 6px' }}>MODÈLE IA</p>
        {modeles.map(m => (
          <motion.button key={m.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 9, background: modele === m.id ? `${T.accent}12` : 'transparent', border: `1px solid ${modele === m.id ? T.accent + '35' : 'transparent'}`, color: modele === m.id ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, textAlign: 'left', marginBottom: 3 }}
            onClick={() => setModele(m.id)} whileHover={{ x: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: modele === m.id ? T.accent : T.border, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: modele === m.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nom}</div>
              <div style={{ fontSize: 10, color: T.text2, opacity: 0.7 }}>{m.description}</div>
            </div>
            {modele === m.id && <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 700, flexShrink: 0 }}>✓</div>}
          </motion.button>
        ))}

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Lier une tâche */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 6px' }}>LIER UNE TÂCHE</p>
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 10px', borderRadius: 9, background: !tacheSelectionnee ? `${T.accent}12` : 'transparent', border: `1px solid ${!tacheSelectionnee ? T.accent + '35' : T.border}`, color: !tacheSelectionnee ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, textAlign: 'left', marginBottom: 5 }}
          onClick={() => setTacheSelectionnee(null)}>
          <Link size={11} /><span>Aucune tâche</span>
        </motion.button>
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {taches.filter(t => !t.terminee).slice(0, 10).map(t => (
            <motion.button key={t.id}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 9, background: tacheSelectionnee === t.id ? `${T.accent}12` : T.bg3, border: `1px solid ${tacheSelectionnee === t.id ? T.accent + '35' : T.border}`, color: tacheSelectionnee === t.id ? T.accent : T.text2, cursor: 'pointer', fontSize: 11, textAlign: 'left', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() => setTacheSelectionnee(t.id)} whileHover={{ x: 2 }}>
              {tacheSelectionnee === t.id ? '✓ ' : ''}{t.titre}
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 9, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 12, marginBottom: 3 }}
            onClick={() => setShowHistorique(!showHistorique)} whileHover={{ color: T.accent }}>
            <History size={14} strokeWidth={1.8} />
            Historique ({historique.length})
          </motion.button>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 9, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 12 }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#e05c5c' }}>
            <LogOut size={14} strokeWidth={1.8} />Déconnexion
          </motion.button>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 14, left: 14, zIndex: 200, width: 38, height: 38, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={18} />
        </motion.button>
      )}
      {isMobile && showSidebar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setShowSidebar(false)} />
      )}

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: isMobile ? 0 : 260, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px clamp(16px, 4vw, 28px)', borderBottom: `1px solid ${T.border}`, background: T.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: `${T.accent}12`, border: `1px solid ${T.accent}30`, borderRadius: 99 }}>
              <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf82' }}
                animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, whiteSpace: 'nowrap' }}>{modeleActuel?.nom}</span>
            </div>
            {/* Badge web search actif */}
            <motion.button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: forceSearch ? '#4caf8220' : 'transparent', border: `1px solid ${forceSearch ? '#4caf82' : T.border}`, borderRadius: 99, color: forceSearch ? '#4caf82' : T.text2, cursor: 'pointer', fontSize: 11, fontWeight: forceSearch ? 700 : 400, whiteSpace: 'nowrap' }}
              onClick={() => setForceSearch(!forceSearch)}
              whileHover={{ borderColor: '#4caf82', color: '#4caf82' }}>
              <Globe size={11} />
              {!isMobile && 'Web'}
              {forceSearch && ' ON'}
            </motion.button>
            {tacheSelectionnee && (
              <motion.div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 99, maxWidth: 180, overflow: 'hidden' }}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Link size={11} color={T.accent} />
                <span style={{ fontSize: 11, color: T.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {taches.find(t => t.id === tacheSelectionnee)?.titre}
                </span>
              </motion.div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {messages.length > 0 && (
              <motion.button
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                onClick={effacerConversation} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                <Trash2 size={12} />
                {!isMobile && 'Effacer'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Historique panel */}
        <AnimatePresence>
          {showHistorique && (
            <motion.div style={{ background: T.bg2, borderBottom: `1px solid ${T.border}`, padding: '14px clamp(16px, 4vw, 28px)', maxHeight: 220, overflowY: 'auto', flexShrink: 0 }}
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Historique</p>
                <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }} onClick={() => setShowHistorique(false)}>
                  <X size={14} />
                </motion.button>
              </div>
              {historique.length === 0
                ? <p style={{ color: T.text2, fontSize: 13 }}>Aucun historique</p>
                : historique.slice(0, 20).map(h => (
                  <motion.div key={h.id}
                    style={{ background: T.bg3, borderRadius: 9, padding: '9px 12px', marginBottom: 6, cursor: 'pointer', border: `1px solid ${T.border}` }}
                    whileHover={{ borderColor: T.accent }}
                    onClick={() => { setPrompt(h.prompt); setShowHistorique(false) }}>
                    <div style={{ fontSize: 10, color: T.text2, marginBottom: 3 }}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt?.substring(0, 80)}</div>
                  </motion.div>
                ))
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MESSAGES ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 4vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* État vide */}
          {messages.length === 0 && (
            <motion.div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <motion.div
                style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: `0 16px 48px ${T.accent}30` }}
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <Sparkles size={32} color="white" strokeWidth={1.5} />
              </motion.div>
              <h2 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: T.text, letterSpacing: '-0.5px', marginBottom: 10, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Bonjour, {user?.nom?.split(' ')[0]} 👋
              </h2>
              <p style={{ fontSize: 14, color: T.text2, marginBottom: 10, maxWidth: 420, lineHeight: 1.7 }}>
                Assistant augmenté Sprint 8 — web search, actions directes, tableaux, abréviations.
              </p>
              {/* Capacités Sprint 8 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                {[
                  { icon: Globe, label: 'Web search', color: '#4caf82' },
                  { icon: Plus, label: 'Crée des tâches', color: '#6c63ff' },
                  { icon: CheckCircle, label: 'Marque terminées', color: '#4caf82' },
                  { icon: Zap, label: 'Comprend tes abréviations', color: '#e08a3c' },
                ].map((cap, i) => {
                  const Icon = cap.icon
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: `${cap.color}12`, border: `1px solid ${cap.color}25`, borderRadius: 99, fontSize: 11, color: cap.color, fontWeight: 600 }}>
                      <Icon size={10} />{cap.label}
                    </motion.div>
                  )
                })}
              </div>
              {/* Suggestions */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10, width: '100%', maxWidth: 560 }}>
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <motion.button key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, cursor: 'pointer', textAlign: 'left', color: T.text }}
                      onClick={() => envoyerPrompt(s.text)}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      whileHover={{ borderColor: s.color, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color={s.color} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: T.text2, lineHeight: 1.4 }}>{s.text}</span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i}
                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : msg.role === 'systeme' ? 'center' : 'flex-start' }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

                {msg.role === 'systeme' ? (
                  <div style={{ padding: '5px 14px', background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.2)', borderRadius: 99, fontSize: 12, color: '#4caf82', fontWeight: 500 }}>
                    {msg.content}
                  </div>

                ) : msg.role === 'user' ? (
                  <div style={{ maxWidth: isMobile ? '88%' : '68%' }}>
                    <div style={{ padding: '12px 16px', borderRadius: '16px 16px 4px 16px', background: `linear-gradient(135deg, ${T.accent}25, ${T.accent}15)`, border: `1px solid ${T.accent}35`, fontSize: 14, color: T.text, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </div>
                  </div>

                ) : (
                  <div style={{ maxWidth: isMobile ? '92%' : '78%', width: '100%' }}>
                    {/* Header IA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={13} color="white" strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 0.5 }}>
                        {modeles.find(m => m.id === msg.modele)?.nom || 'Assistant IA'}
                      </span>
                      {/* Badge intention */}
                      {msg.intention && msg.intention !== 'chat' && (
                        <BadgeIntention intention={msg.intention} T={T} />
                      )}
                    </div>

                    {/* Bulle réponse */}
                    <div style={{ padding: '16px 18px', borderRadius: '4px 16px 16px 16px', background: T.bg2, border: `1px solid ${T.border}`, position: 'relative' }}>

                      {/* Badge abréviations */}
                      {msg.abrev_expandees && (
                        <BadgeAbrev messageOriginal={msg.message_original} messageExpande={msg.message_expande} T={T} />
                      )}

                      {/* Contenu */}
                      {msg.role === 'erreur' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#e05c5c' }}>
                          <AlertCircle size={14} color='#e05c5c' />
                          {msg.content}
                        </div>
                      ) : (
                        <RenduMarkdown content={msg.content} T={T} />
                      )}

                      {/* Bloc action directe */}
                      {msg.action && <BlocAction action={msg.action} T={T} />}

                      {/* Résultats web */}
                      {msg.search_results && <BlocSearchResults results={msg.search_results} T={T} />}

                      {/* Actions post-message */}
                      {msg.role === 'ia' && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: copie === i ? `${T.accent}15` : 'transparent', border: `1px solid ${copie === i ? T.accent : T.border}`, borderRadius: 99, color: copie === i ? T.accent : T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => copierMessage(msg.content, i)} whileHover={{ borderColor: T.accent, color: T.accent }}>
                            <Copy size={10} />{copie === i ? 'Copié !' : 'Copier'}
                          </motion.button>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => creerTacheDepuisIA(msg.content.substring(0, 80))}
                            whileHover={{ borderColor: '#4caf82', color: '#4caf82' }}>
                            <Plus size={10} />Créer une tâche
                          </motion.button>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => envoyerPrompt('Continue et développe davantage')}
                            whileHover={{ borderColor: T.accent, color: T.accent }}>
                            <ChevronRight size={10} />Continuer
                          </motion.button>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => { setForceSearch(true); envoyerPrompt(`Recherche web : ${msg.content.substring(0, 60)}`) }}
                            whileHover={{ borderColor: '#4caf82', color: '#4caf82' }}>
                            <Search size={10} />Rechercher
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading */}
          {loading && (
            <motion.div style={{ display: 'flex' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={13} color="white" strokeWidth={2} />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: T.bg2, border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }}
                        animate={{ y: [-3, 3, -3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT ─────────────────────────────────────────────────────────── */}
        <div style={{ padding: '12px clamp(16px, 4vw, 28px) clamp(16px, 4vw, 20px)', borderTop: `1px solid ${T.border}`, background: T.bg2, flexShrink: 0 }}>

          {/* Tâche liée badge */}
          <AnimatePresence>
            {tacheSelectionnee && (
              <motion.div style={{ marginBottom: 8, padding: '7px 13px', background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 9, fontSize: 12, color: T.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Link size={11} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {taches.find(t => t.id === tacheSelectionnee)?.titre}
                  </span>
                </div>
                <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => setTacheSelectionnee(null)} whileHover={{ color: '#e05c5c' }}>
                  <X size={13} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Force search badge */}
          <AnimatePresence>
            {forceSearch && (
              <motion.div style={{ marginBottom: 8, padding: '5px 12px', background: '#4caf8215', border: '1px solid #4caf8235', borderRadius: 9, fontSize: 11, color: '#4caf82', display: 'flex', alignItems: 'center', gap: 6 }}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Globe size={10} />
                Recherche web activée — le prochain message cherchera sur internet
                <motion.button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#4caf82' }}
                  onClick={() => setForceSearch(false)}><X size={11} /></motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              style={{ flex: 1, padding: '11px 15px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none', resize: 'none', minHeight: 46, maxHeight: 160, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55, transition: 'border-color 0.2s' }}
              placeholder={
                forceSearch ? 'Que veux-tu rechercher sur le web ?' :
                tacheSelectionnee ? `Que faire avec "${taches.find(t => t.id === tacheSelectionnee)?.titre}" ?` :
                `Message pour ${modeleActuel?.nom} — "crée une tâche...", "recherche...", "planifie..."`
              }
              value={prompt}
              onChange={e => { setPrompt(e.target.value); autoResize(e) }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerPrompt() } }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
              rows={1}
            />
            <motion.button
              style={{ width: 46, height: 46, background: loading || !prompt.trim() ? T.bg3 : `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, color: loading || !prompt.trim() ? T.text2 : 'white', border: 'none', borderRadius: 12, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: !loading && prompt.trim() ? `0 4px 16px ${T.accent}35` : 'none', transition: 'all 0.2s' }}
              onClick={() => envoyerPrompt()}
              whileHover={!loading && prompt.trim() ? { scale: 1.05 } : {}}
              whileTap={!loading && prompt.trim() ? { scale: 0.95 } : {}}>
              {loading
                ? <motion.div style={{ width: 16, height: 16, border: `2px solid ${T.text2}30`, borderTop: `2px solid ${T.text2}`, borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                : <Send size={16} strokeWidth={2.5} />
              }
            </motion.button>
          </div>
          <p style={{ fontSize: 11, color: T.text2, marginTop: 7, opacity: 0.6 }}>
            Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · Globe pour activer la recherche web
          </p>
        </div>
      </main>
    </div>
  )
}
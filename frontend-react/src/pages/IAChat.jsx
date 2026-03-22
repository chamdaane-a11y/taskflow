import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { useTheme } from '../useTheme'
import { Bot, Send, History, Link, LayoutDashboard, BarChart2, Calendar, LogOut, Copy, Plus, X, ChevronRight, Layers, Menu, HelpCircle, Users, Sparkles, Zap, Brain, Code, FileText, CheckCircle, Trash2 } from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'

const API = 'https://getshift-backend.onrender.com'

const modeles = [
  { id: 'llama-3.3-70b-versatile', nom: 'Llama 3.3', description: 'Meta — Très puissant', badge: '⚡ Recommandé' },
  { id: 'mixtral-8x7b-32768', nom: 'Mixtral', description: 'Mistral AI — Rapide', badge: '🚀 Rapide' },
  { id: 'gemma2-9b-it', nom: 'Gemma 2', description: 'Google — Efficace', badge: '✨ Léger' },
]

// Suggestions contextuelles
const SUGGESTIONS = [
  { icon: Brain, text: 'Aide-moi à planifier ma semaine', color: '#6c63ff' },
  { icon: Zap, text: 'Génère 5 tâches pour apprendre React', color: '#e08a3c' },
  { icon: Code, text: 'Explique-moi comment fonctionne...', color: '#4caf82' },
  { icon: FileText, text: 'Résume et structure mes idées', color: '#e05c5c' },
]

// ===== RENDU MARKDOWN BASIQUE =====
function RenduMarkdown({ content, T }) {
  const renderLine = (line, i) => {
    // Titres
    if (line.startsWith('### ')) return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: T.text, marginTop: 16, marginBottom: 6 }}>{line.slice(4)}</div>
    if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 15, fontWeight: 800, color: T.text, marginTop: 18, marginBottom: 8, letterSpacing: '-0.3px' }}>{line.slice(3)}</div>
    if (line.startsWith('# ')) return <div key={i} style={{ fontSize: 17, fontWeight: 800, color: T.text, marginTop: 20, marginBottom: 10, letterSpacing: '-0.5px' }}>{line.slice(2)}</div>

    // Liste à puces
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const txt = line.slice(2)
      return (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0, marginTop: 7 }} />
          <span style={{ fontSize: 14, color: T.text, lineHeight: 1.7 }}>{renderInline(txt)}</span>
        </div>
      )
    }

    // Liste numérotée
    const numMatch = line.match(/^(\d+)\. (.+)/)
    if (numMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 5 }}>
          <div style={{ minWidth: 22, height: 22, borderRadius: 6, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.accent, flexShrink: 0, marginTop: 2 }}>{numMatch[1]}</div>
          <span style={{ fontSize: 14, color: T.text, lineHeight: 1.7 }}>{renderInline(numMatch[2])}</span>
        </div>
      )
    }

    // Bloc de code
    if (line.startsWith('```') || line.startsWith('    ')) {
      return (
        <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontFamily: 'monospace', fontSize: 12, color: '#4caf82', overflowX: 'auto' }}>
          {line.replace(/^```\w*/, '').replace(/```$/, '').replace(/^    /, '')}
        </div>
      )
    }

    // Ligne vide
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />

    // Ligne normale
    return <div key={i} style={{ fontSize: 14, color: T.text, lineHeight: 1.75, marginBottom: 2 }}>{renderInline(line)}</div>
  }

  const renderInline = (text) => {
    // Gras **text**
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700, color: T.text }}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 12, fontFamily: 'monospace', color: '#4caf82' }}>{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  const lines = content.split('\n')
  return <div>{lines.map((line, i) => renderLine(line, i))}</div>
}

// ===== SYSTEM PROMPT INTELLIGENT =====
function buildSystemPrompt(user, taches, niveauLabel, points) {
  const terminees = taches.filter(t => t.terminee).length
  const enCours = taches.filter(t => !t.terminee).length
  const enRetard = taches.filter(t => !t.terminee && t.deadline && new Date(t.deadline) < new Date()).length
  const haute = taches.filter(t => t.priorite === 'haute' && !t.terminee)

  return `Tu es l'assistant IA personnel de ${user.nom} sur GetShift, une application de gestion de tâches et de productivité.

PROFIL UTILISATEUR :
- Nom : ${user.nom}
- Email : ${user.email || 'non renseigné'}
- Niveau : ${niveauLabel} (${points} points)
- Tâches totales : ${taches.length} (${terminees} terminées, ${enCours} en cours, ${enRetard} en retard)
${haute.length > 0 ? `- Tâches haute priorité en cours : ${haute.map(t => `"${t.titre}"`).join(', ')}` : ''}

CONTEXTE DES TÂCHES EN COURS :
${enCours > 0 ? taches.filter(t => !t.terminee).slice(0, 8).map(t => `- "${t.titre}" (${t.priorite}${t.deadline ? `, deadline: ${new Date(t.deadline).toLocaleDateString('fr-FR')}` : ''})`).join('\n') : '- Aucune tâche en cours'}

TON RÔLE :
Tu es un assistant productivité expert, bienveillant et direct. Tu connais ${user.nom} et son contexte.
- Tu SUIS l'idée et l'intention de l'utilisateur — si il commence quelque chose, tu continues dans sa direction
- Tu donnes des réponses structurées, claires et actionnables
- Tu utilises le markdown (titres ##, listes -, **gras**, \`code\`) pour formater tes réponses
- Tu es concis mais complet — pas de remplissage inutile
- Si l'utilisateur parle de ses tâches, tu t'y réfères directement
- Tu encourages et motives quand c'est pertinent
- Tu CONTINUES le fil de la conversation — tu retiens ce qui a été dit avant

LANGUE : Français (sauf si l'utilisateur écrit dans une autre langue, alors tu t'adaptes)`
}

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

  // Recharger les tâches à chaque fois qu'on arrive sur /ia
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
    try {
      const res = await axios.get(`${API}/users/${user.id}`)
      setProfil(res.data)
    } catch {}
  }

  const chargerTaches = async () => {
    try {
      const res = await axios.get(`${API}/taches/${user.id}`)
      setTaches(res.data)
    } catch {}
  }

  const chargerHistorique = async () => {
    try {
      const res = await axios.get(`${API}/ia/historique/${user.id}`)
      setHistorique(res.data)
    } catch {}
  }

  const envoyerPrompt = async (promptTexte) => {
    const texte = promptTexte || prompt
    if (!texte.trim() || loading) return

    const userMsg = { role: 'user', content: texte, modele }
    setMessages(prev => [...prev, userMsg])
    setPrompt('')
    setLoading(true)

    // Auto-resize textarea
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const niveauLabel = profil?.niveau_label || 'Débutant'
      const points = profil?.points || 0
      const systemPrompt = buildSystemPrompt(user, taches, niveauLabel, points)

      // Historique de conversation pour contexte
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'ia')
        .slice(-12)
        .map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content }))

      const res = await axios.post(`${API}/ia/executer`, {
        prompt: texte,
        modele,
        tache_id: tacheSelectionnee,
        system_prompt: systemPrompt,
        messages: conversationHistory
      })

      const iaMsg = { role: 'ia', content: res.data.reponse, modele: res.data.modele }
      setMessages(prev => [...prev, iaMsg])

      await axios.post(`${API}/ia/historique`, {
        user_id: user.id,
        prompt: texte,
        reponse: res.data.reponse,
        modele,
        tache_id: tacheSelectionnee
      })

      if (tacheSelectionnee) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
        setMessages(prev => [...prev, { role: 'systeme', content: '✓ Tâche liée complétée avec l\'IA' }])
        setTacheSelectionnee(null)
        chargerTaches()
      }
      chargerHistorique()
    } catch {
      setMessages(prev => [...prev, { role: 'erreur', content: 'Erreur de connexion à l\'IA. Réessaie dans quelques secondes.' }])
    }
    setLoading(false)
  }

  const creerTacheDepuisIA = async (titre) => {
    await axios.post(`${API}/taches`, { titre: titre.substring(0, 100), priorite: 'moyenne', user_id: user.id })
    chargerTaches()
    setMessages(prev => [...prev, { role: 'systeme', content: `✓ Tâche créée : "${titre.substring(0, 50)}..."` }])
  }

  const copierMessage = (content, idx) => {
    navigator.clipboard.writeText(content)
    setCopie(idx)
    setTimeout(() => setCopie(null), 2000)
  }

  const effacerConversation = () => {
    localStorage.removeItem(`chat_messages_${user.id}`)
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        textarea { scrollbar-width: none; }
        @media (max-width: 768px) { aside { left: ${true ? '-100%' : '0'} !important; } }
      `}</style>

      {/* ===== SIDEBAR ===== */}
      <aside style={{
        width: 'min(260px, 85%)', maxWidth: 260,
        background: T.bg2,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '20px 14px',
        position: 'fixed', top: 0,
        left: isMobile ? (showSidebar ? 0 : '-100%') : 0,
        height: '100vh', transition: 'left 0.3s ease',
        zIndex: 100, overflowY: 'auto'
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 6px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif" }}>GetShift</span>
        </div>

        {/* Profil mini */}
        {profil && (
          <div style={{ background: T.bg3, borderRadius: 12, padding: '10px 12px', marginBottom: 20, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.bg, flexShrink: 0 }}>
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
            {modele === m.id && <div style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>✓</div>}
          </motion.button>
        ))}

        <div style={{ height: 1, background: T.border, margin: '14px 0' }} />

        {/* Lier une tâche */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 6px' }}>LIER UNE TÂCHE</p>
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 10px', borderRadius: 9, background: !tacheSelectionnee ? `${T.accent}12` : 'transparent', border: `1px solid ${!tacheSelectionnee ? T.accent + '35' : T.border}`, color: !tacheSelectionnee ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, textAlign: 'left', marginBottom: 5 }}
          onClick={() => setTacheSelectionnee(null)}>
          <Link size={11} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Aucune tâche</span>
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
            <LogOut size={14} strokeWidth={1.8} />
            Déconnexion
          </motion.button>
        </div>
      </aside>

      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 14, left: 14, zIndex: 200, width: 38, height: 38, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={18} />
        </motion.button>
      )}
      {isMobile && showSidebar && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setShowSidebar(false)} />}

      {/* ===== MAIN ===== */}
      <main style={{ marginLeft: isMobile ? 0 : 260, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px clamp(16px, 4vw, 28px)', borderBottom: `1px solid ${T.border}`, background: T.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {/* Indicateur modèle actif */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: `${T.accent}12`, border: `1px solid ${T.accent}30`, borderRadius: 99 }}>
              <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf82' }}
                animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, whiteSpace: 'nowrap' }}>{modeleActuel?.nom}</span>
            </div>
            {tacheSelectionnee && (
              <motion.div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 99, maxWidth: 200, overflow: 'hidden' }}
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
                <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Historique des conversations</p>
                <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }}
                  onClick={() => setShowHistorique(false)} whileHover={{ color: T.text }}>
                  <X size={14} />
                </motion.button>
              </div>
              {historique.length === 0 ? (
                <p style={{ color: T.text2, fontSize: 13 }}>Aucun historique</p>
              ) : historique.slice(0, 20).map(h => (
                <motion.div key={h.id}
                  style={{ background: T.bg3, borderRadius: 9, padding: '9px 12px', marginBottom: 6, cursor: 'pointer', border: `1px solid ${T.border}` }}
                  whileHover={{ borderColor: T.accent }}
                  onClick={() => { setPrompt(h.prompt); setShowHistorique(false) }}>
                  <div style={{ fontSize: 10, color: T.text2, marginBottom: 3 }}>{new Date(h.created_at).toLocaleDateString('fr-FR')} · {h.modele?.split('-')[0]}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt?.substring(0, 80)}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== MESSAGES ===== */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 4vw, 28px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* État vide — accueil */}
          {messages.length === 0 && (
            <motion.div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

              {/* Icône IA animée */}
              <motion.div
                style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: `0 16px 48px ${T.accent}30` }}
                animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <Sparkles size={32} color="white" strokeWidth={1.5} />
              </motion.div>

              <h2 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: T.text, letterSpacing: '-0.5px', marginBottom: 10, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Bonjour, {user?.nom?.split(' ')[0]} 👋
              </h2>
              <p style={{ fontSize: 14, color: T.text2, marginBottom: 36, maxWidth: 420, lineHeight: 1.7 }}>
                Je connais ton profil et tes tâches. Je suis là pour t'aider à être plus productif — pose-moi n'importe quelle question.
              </p>

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

              {/* Contexte tâches */}
              {taches.filter(t => !t.terminee).length > 0 && (
                <motion.div style={{ marginTop: 28, padding: '12px 18px', background: `${T.accent}08`, border: `1px solid ${T.accent}20`, borderRadius: 12, maxWidth: 440, width: '100%' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1, marginBottom: 8 }}>TES TÂCHES EN COURS</div>
                  {taches.filter(t => !t.terminee).slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.priorite === 'haute' ? '#e05c5c' : t.priorite === 'moyenne' ? '#e08a3c' : '#4caf82', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
                    </div>
                  ))}
                  {taches.filter(t => !t.terminee).length > 3 && (
                    <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>+{taches.filter(t => !t.terminee).length - 3} autres tâches</div>
                  )}
                </motion.div>
              )}
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
                  // Message utilisateur
                  <div style={{ maxWidth: isMobile ? '88%' : '68%', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', background: `linear-gradient(135deg, ${T.accent}25, ${T.accent}15)`, border: `1px solid ${T.accent}35`, fontSize: 14, color: T.text, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                ) : (
                  // Message IA
                  <div style={{ maxWidth: isMobile ? '92%' : '75%', width: '100%' }}>
                    {/* Header IA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={13} color="white" strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 0.5 }}>
                        {modeles.find(m => m.id === msg.modele)?.nom || 'Assistant IA'}
                      </span>
                    </div>

                    {/* Contenu */}
                    <div style={{ padding: '16px 18px', borderRadius: '4px 16px 16px 16px', background: T.bg2, border: `1px solid ${T.border}`, position: 'relative' }}>
                      {msg.role === 'erreur' ? (
                        <div style={{ fontSize: 14, color: '#e05c5c', lineHeight: 1.65 }}>{msg.content}</div>
                      ) : (
                        <RenduMarkdown content={msg.content} T={T} />
                      )}

                      {/* Actions */}
                      {msg.role === 'ia' && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: copie === i ? `${T.accent}15` : 'transparent', border: `1px solid ${copie === i ? T.accent : T.border}`, borderRadius: 99, color: copie === i ? T.accent : T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => copierMessage(msg.content, i)}
                            whileHover={{ borderColor: T.accent, color: T.accent }}>
                            <Copy size={10} />
                            {copie === i ? 'Copié !' : 'Copier'}
                          </motion.button>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => creerTacheDepuisIA(msg.content.substring(0, 80))}
                            whileHover={{ borderColor: '#4caf82', color: '#4caf82' }}>
                            <Plus size={10} />
                            Créer une tâche
                          </motion.button>
                          <motion.button
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => envoyerPrompt('Continue sur ce sujet et développe davantage')}
                            whileHover={{ borderColor: T.accent, color: T.accent }}>
                            <ChevronRight size={10} />
                            Continuer
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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

        {/* ===== INPUT ===== */}
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

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              style={{ flex: 1, padding: '11px 15px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none', resize: 'none', minHeight: 46, maxHeight: 160, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55, transition: 'border-color 0.2s' }}
              placeholder={tacheSelectionnee ? `Que veux-tu faire avec "${taches.find(t => t.id === tacheSelectionnee)?.titre}" ?` : `Pose une question à ${modeleActuel?.nom}...`}
              value={prompt}
              onChange={e => { setPrompt(e.target.value); autoResize(e) }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerPrompt() } }}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
              rows={1}
            />
            <motion.button
              style={{ width: 46, height: 46, background: loading || !prompt.trim() ? T.bg3 : `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, color: loading || !prompt.trim() ? T.text2 : 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: !loading && prompt.trim() ? `0 4px 16px ${T.accent}35` : 'none', transition: 'all 0.2s' }}
              onClick={() => envoyerPrompt()}
              whileHover={!loading && prompt.trim() ? { scale: 1.05 } : {}}
              whileTap={!loading && prompt.trim() ? { scale: 0.95 } : {}}>
              {loading
                ? <motion.div style={{ width: 16, height: 16, border: `2px solid ${T.text2}30`, borderTop: `2px solid ${T.text2}`, borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                : <Send size={16} strokeWidth={2.5} />
              }
            </motion.button>
          </div>
          <p style={{ fontSize: 11, color: T.text2, marginTop: 7, opacity: 0.6 }}>Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</p>
        </div>
      </main>
    </div>
  )
}
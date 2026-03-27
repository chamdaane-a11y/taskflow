import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { useTheme } from '../useTheme'
import {
  Send, History, Link, LayoutDashboard, BarChart2, Calendar,
  LogOut, Copy, Plus, X, ChevronRight, Layers, Menu,
  Users, Sparkles, Zap, Globe, CheckCircle, Trash2,
  Search, AlertCircle, Check, Brain, ChevronDown, Database
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'

const API = 'https://getshift-backend.onrender.com'

const MODELES = [
  { id: 'llama-3.3-70b-versatile', nom: 'GetShift AI',        tag: 'Recommandé' },
  { id: 'mixtral-8x7b-32768',      nom: 'GetShift AI Rapide', tag: 'Rapide'     },
  { id: 'gemma2-9b-it',            nom: 'GetShift AI Lite',   tag: 'Léger'      },
]

const SUGGESTIONS = [
  { icon: Brain,        text: 'Analyse ma semaine et donne-moi un plan d\'action',  grad: `linear-gradient(135deg,#6c63ff,${accent2 || '#a855f7'})` },
  { icon: Globe,        text: 'Recherche les meilleures méthodes de productivité 2025', grad: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' },
  { icon: Plus,         text: 'Crée une tâche : préparer la réunion de demain',     grad: 'linear-gradient(135deg,#10b981,#4caf82)'  },
  { icon: Zap,          text: 'Je procrastine bcp, aide-moi à reprendre le focus',  grad: 'linear-gradient(135deg,#f59e0b,#ef4444)'  },
]

const INTENTION_META = {
  search:           { label: 'Web temps réel', color: '#0ea5e9', Icon: Globe        },
  action_creer:     { label: 'Tâche créée',    color: '#10b981', Icon: Plus         },
  action_terminer:  { label: 'Terminée',        color: '#10b981', Icon: CheckCircle  },
  action_planifier: { label: 'Planification',   color: '#f59e0b', Icon: Calendar     },
  chat:             { label: 'GetShift AI',     color: '#a855f7', Icon: Sparkles     },
}

// ── Rendu tableau markdown ────────────────────────────────────────────────────
function Tableau({ lignes, accent }) {
  if (lignes.length < 2) return null
  const headers = lignes[0].split('|').map(h => h.trim()).filter(Boolean)
  const rows = lignes.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean))
  return (
    <div style={{ overflowX: 'auto', margin: '14px 0', borderRadius: 12, border: `1px solid rgba(255,255,255,0.08)`, background: 'rgba(255,255,255,0.03)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: accent, fontSize: 11, letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap', background: `${accent}10` }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '9px 16px', color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, lineHeight: 1.5 }}>
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

// ── Rendu Markdown premium ────────────────────────────────────────────────────
function Markdown({ content, accent }) {
  const lines = content.split('\n')

  const inline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>{p.slice(2,-2)}</strong>
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '1px 7px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#4ade80' }}>{p.slice(1,-1)}</code>
      return p
    })
  }

  const els = []
  let i = 0, inCode = false, codeLines = [], tableLines = []

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (!inCode) { inCode = true; codeLines = [] }
      else {
        inCode = false
        els.push(
          <div key={`c${i}`} style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 18px', margin: '12px 0', overflowX: 'auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>CODE</div>
            <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, color: '#4ade80', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        )
        codeLines = []
      }
      i++; continue
    }
    if (inCode) { codeLines.push(line); i++; continue }

    if (line.startsWith('|') && line.endsWith('|')) {
      tableLines = [line]
      while (i + 1 < lines.length && (lines[i+1].startsWith('|') || lines[i+1].match(/^\|[-| ]+\|$/))) {
        i++; tableLines.push(lines[i])
      }
      els.push(<Tableau key={`t${i}`} lignes={tableLines} accent={accent} />)
      tableLines = []; i++; continue
    }

    if (line.startsWith('### '))
      els.push(<p key={i} style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '14px 0 5px', letterSpacing: '-0.2px' }}>{inline(line.slice(4))}</p>)
    else if (line.startsWith('## '))
      els.push(<p key={i} style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '18px 0 7px', letterSpacing: '-0.4px' }}>{inline(line.slice(3))}</p>)
    else if (line.startsWith('# '))
      els.push(<p key={i} style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '20px 0 10px', letterSpacing: '-0.5px' }}>{inline(line.slice(2))}</p>)
    else if (line.startsWith('- ') || line.startsWith('• '))
      els.push(
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75 }}>{inline(line.slice(2))}</span>
        </div>
      )
    else {
      const num = line.match(/^(\d+)\. (.+)/)
      if (num)
        els.push(
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 7 }}>
            <div style={{ minWidth: 22, height: 22, borderRadius: 6, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 1 }}>{num[1]}</div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75 }}>{inline(num[2])}</span>
          </div>
        )
      else if (line.match(/^-{3,}$/))
        els.push(<div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '14px 0' }} />)
      else if (!line.trim())
        els.push(<div key={i} style={{ height: 7 }} />)
      else
        els.push(<p key={i} style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.78, margin: '2px 0' }}>{inline(line)}</p>)
    }
    i++
  }
  return <div>{els}</div>
}

// ── Bloc sources web ──────────────────────────────────────────────────────────
function SourcesWeb({ results }) {
  const [open, setOpen] = useState(false)
  if (!results?.length) return null
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <Globe size={11} color="#0ea5e9" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', letterSpacing: '0.5px' }}>
          {results.length} SOURCE{results.length > 1 ? 'S' : ''} WEB
        </span>
        <ChevronDown size={10} color="rgba(255,255,255,0.3)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginTop: 10 }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title || 'Source'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {r.snippet?.substring(0, 140)}{r.snippet?.length > 140 ? '…' : ''}
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, color: '#0ea5e9', marginTop: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.url}
                  </a>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Carte action directe ──────────────────────────────────────────────────────
function CarteAction({ action }) {
  if (!action) return null
  const configs = {
    tache_creee:              { color: '#10b981', Icon: Plus,         label: 'Tâche créée'    },
    tache_terminee:           { color: '#10b981', Icon: Check,        label: 'Terminée'       },
    redirect_tomorrow_builder:{ color: '#f59e0b', Icon: Calendar,     label: 'Tomorrow Builder' },
  }
  const cfg = configs[action.type]
  if (!cfg) return null
  const { color, Icon, label } = cfg
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      style={{ marginTop: 12, padding: '10px 14px', background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.5px' }}>{label.toUpperCase()}</div>
        {action.titre && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>"{action.titre}"</div>}
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function IAChat() {
  const user    = JSON.parse(localStorage.getItem('user'))
  const { T }   = useTheme()
  const accent  = T.accent  || '#6c63ff'
  const accent2 = T.accent2 || '${accent2}'

  const [prompt,            setPrompt]           = useState('')
  const [modele,            setModele]           = useState('llama-3.3-70b-versatile')
  const [messages,          setMessages]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(`shift_msgs_${user?.id}`) || '[]') } catch { return [] }
  })
  const [loading,           setLoading]          = useState(false)
  const [taches,            setTaches]           = useState([])
  const [profil,            setProfil]           = useState(null)
  const [tacheSelectionnee, setTacheSelectionnee]= useState(null)
  const [historique,        setHistorique]       = useState([])
  const [showHistorique,    setShowHistorique]   = useState(false)
  const [forceSearch,       setForceSearch]      = useState(false)
  const [copie,             setCopie]            = useState(null)
  const [showSidebar,       setShowSidebar]      = useState(false)
  const [showModeles,       setShowModeles]      = useState(false)
  const [memoryCount,       setMemoryCount]      = useState(0)

  const endRef      = useRef(null)
  const textareaRef = useRef(null)
  const navigate    = useNavigate()
  const location    = useLocation()
  const isMobile    = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([chargerTaches(), chargerHistorique(), chargerProfil(), chargerMemoire()])
  }, [])

  useEffect(() => { if (user) chargerTaches() }, [location.pathname])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (user) localStorage.setItem(`shift_msgs_${user.id}`, JSON.stringify(messages.slice(-80)))
  }, [messages])

  const chargerProfil  = async () => { try { const r = await axios.get(`${API}/users/${user.id}`); setProfil(r.data) } catch {} }
  const chargerTaches  = async () => { try { const r = await axios.get(`${API}/taches/${user.id}`); setTaches(r.data) } catch {} }
  const chargerHistorique = async () => { try { const r = await axios.get(`${API}/ia/historique/${user.id}`); setHistorique(r.data) } catch {} }
  const chargerMemoire = async () => { try { const r = await axios.get(`${API}/ia/memory/${user.id}`); setMemoryCount(r.data.total_entrees || 0) } catch {} }

  // ── Envoi ──────────────────────────────────────────────────────────────────
  const envoyer = useCallback(async (texteForce) => {
    const texte = (texteForce || prompt).trim()
    if (!texte || loading) return

    setMessages(p => [...p, { role: 'user', content: texte }])
    setPrompt('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const hist = messages
        .filter(m => m.role === 'user' || m.role === 'ia')
        .slice(-16)
        .map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content }))

      const { data } = await axios.post(`${API}/ia/assistant`, {
        user_id: user.id,
        message: texte,
        modele,
        historique: hist,
        tache_id: tacheSelectionnee || null,
        force_search: forceSearch,
      })

      setMessages(p => [...p, {
        role:             'ia',
        content:          data.reponse,
        modele:           data.modele || modele,
        intention:        data.intention,
        action:           data.action || null,
        search_results:   data.search_results || null,
        web_searched:     data.web_searched || false,
        abrev_expandees:  data.abrev_expandees,
        message_original: data.message_original,
        message_expande:  data.message_expande,
      }])

      if (data.action?.type === 'tache_creee' || data.action?.type === 'tache_terminee') {
        confetti({ particleCount: 70, spread: 55, origin: { y: 0.65 }, colors: [accent, '#10b981', '${accent2}'] })
        chargerTaches()
      }
      if (data.action?.type === 'redirect_tomorrow_builder')
        setTimeout(() => navigate('/planification'), 1800)
      if (forceSearch) setForceSearch(false)
      if (tacheSelectionnee) setTacheSelectionnee(null)

      chargerHistorique()
      chargerMemoire()

    } catch (err) {
      setMessages(p => [...p, {
        role: 'erreur',
        content: err.response?.data?.erreur || 'Erreur de connexion. Vérifie ta connexion et réessaie.'
      }])
    }
    setLoading(false)
  }, [prompt, loading, messages, modele, tacheSelectionnee, forceSearch, user, accent, navigate])

  const creerTache = async (titre) => {
    try {
      await axios.post(`${API}/taches`, { titre: titre.substring(0, 100), priorite: 'moyenne', user_id: user.id })
      chargerTaches()
      setMessages(p => [...p, { role: 'systeme', content: `Tâche créée : "${titre.substring(0, 50)}"` }])
    } catch {}
  }

  const copier = (content, idx) => {
    navigator.clipboard.writeText(content)
    setCopie(idx); setTimeout(() => setCopie(null), 2000)
  }

  const effacer = () => {
    localStorage.removeItem(`shift_msgs_${user?.id}`)
    setMessages([])
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const modeleActuel = MODELES.find(m => m.id === modele) || MODELES[0]
  const tachesEnCours = taches.filter(t => !t.terminee)

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard'     },
    { icon: Brain,           label: 'Assistant IA', path: '/ia'            },
    { icon: BarChart2,       label: 'Analytiques',  path: '/analytics'     },
    { icon: Calendar,        label: 'Planification',path: '/planification' },
    { icon: Users,           label: 'Collaboration',path: '/collaboration' },
  ]

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#080810',
      color: '#fff',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative', overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        textarea { scrollbar-width: none; }
        .glass {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .glass-strong {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.1);
        }
      `}</style>

      {/* Orbes de fond */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, ${accent2}18 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, #0ea5e910 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className="glass-strong" style={{
        width: 'min(250px, 85%)', maxWidth: 250,
        display: 'flex', flexDirection: 'column', padding: '22px 14px',
        position: 'fixed', top: 0,
        left: isMobile ? (showSidebar ? 0 : '-100%') : 0,
        height: '100vh', transition: 'left 0.3s ease',
        zIndex: 100, overflowY: 'auto',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '0 0 0 0',
        background: 'rgba(10,10,20,0.85)',
        backdropFilter: 'blur(40px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${accent}, ${accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accent}40` }}>
            <Layers size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.3px' }}>GetShift</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', fontWeight: 600 }}>GETSHIFT AI</div>
          </div>
        </div>

        {/* Profil */}
        {profil && (
          <div className="glass" style={{ borderRadius: 12, padding: '11px 12px', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${accent}, ${accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {user?.nom?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nom}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{profil.points || 0} pts · Niveau {profil.niveau || 1}</div>
              </div>
            </div>
            {/* Mémoire indicator */}
            {memoryCount > 0 && (
              <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: `${accent}12`, borderRadius: 6, border: `1px solid ${accent}20` }}>
                <Database size={9} color={accent} />
                <span style={{ fontSize: 9, color: accent, fontWeight: 600, letterSpacing: '0.5px' }}>{memoryCount} SOUVENIRS</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: 8, padding: '0 6px' }}>NAVIGATION</div>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/ia'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 9, color: active ? '#fff' : 'rgba(255,255,255,0.45)', background: active ? `${accent}20` : 'transparent', border: active ? `1px solid ${accent}35` : '1px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) setShowSidebar(false) }}
              whileHover={{ color: '#fff', x: 2 }}>
              <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              {active && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: accent }} />}
            </motion.button>
          )
        })}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

        {/* Modèle selector */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: 8, padding: '0 6px' }}>MODÈLE IA</div>
        <motion.button
          className="glass"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}
          onClick={() => setShowModeles(!showModeles)}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{modeleActuel.nom}</div>
            <div style={{ fontSize: 10, color: accent, marginTop: 1 }}>{modeleActuel.tag}</div>
          </div>
          <ChevronDown size={13} color="rgba(255,255,255,0.3)" style={{ transform: showModeles ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </motion.button>
        <AnimatePresence>
          {showModeles && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginBottom: 8 }}>
              {MODELES.filter(m => m.id !== modele).map(m => (
                <motion.button key={m.id}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 12, textAlign: 'left', marginBottom: 4 }}
                  onClick={() => { setModele(m.id); setShowModeles(false) }}
                  whileHover={{ color: '#fff', borderColor: `${accent}50`, background: `${accent}08` }}>
                  <span style={{ fontWeight: 500 }}>{m.nom}</span>
                  <span style={{ fontSize: 10, color: accent, marginLeft: 8 }}>{m.tag}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0 16px' }} />

        {/* Tâches à lier */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: 8, padding: '0 6px' }}>LIER UNE TÂCHE</div>
        <div style={{ maxHeight: 130, overflowY: 'auto', marginBottom: 6 }}>
          {[{ id: null, titre: 'Aucune', priorite: '' }, ...tachesEnCours.slice(0, 8)].map(t => (
            <motion.button key={t.id || 'none'}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: tacheSelectionnee === t.id ? `${accent}18` : 'transparent', border: `1px solid ${tacheSelectionnee === t.id ? accent + '40' : 'transparent'}`, color: tacheSelectionnee === t.id ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, textAlign: 'left', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() => setTacheSelectionnee(t.id)}
              whileHover={{ color: '#fff' }}>
              {tacheSelectionnee === t.id ? '● ' : '○ '}{t.titre}
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
            onClick={() => setShowHistorique(!showHistorique)} whileHover={{ color: '#fff' }}>
            <History size={13} strokeWidth={1.8} />Historique ({historique.length})
          </motion.button>
          <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12 }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#ef4444' }}>
            <LogOut size={13} strokeWidth={1.8} />Déconnexion
          </motion.button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {isMobile && (
        <motion.button style={{ position: 'fixed', top: 14, left: 14, zIndex: 200, width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}
          onClick={() => setShowSidebar(!showSidebar)}>
          <Menu size={17} />
        </motion.button>
      )}
      {isMobile && showSidebar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }} onClick={() => setShowSidebar(false)} />
      )}

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: isMobile ? 0 : 250, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="glass" style={{ padding: '12px clamp(16px,4vw,28px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0, background: 'rgba(8,8,16,0.7)', backdropFilter: 'blur(30px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
            {/* Status dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: `${accent}14`, border: `1px solid ${accent}28`, borderRadius: 99 }}>
              <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}
                animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: accent, whiteSpace: 'nowrap', fontFamily: "'Clash Display', sans-serif" }}>
                SHIFT · GetShift AI
              </span>
            </div>

            {/* Toggle web search */}
            <motion.button
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: forceSearch ? 'rgba(14,165,233,0.15)' : 'transparent', border: `1px solid ${forceSearch ? '#0ea5e9' : 'rgba(255,255,255,0.1)'}`, borderRadius: 99, color: forceSearch ? '#0ea5e9' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 11, fontWeight: forceSearch ? 700 : 400, whiteSpace: 'nowrap' }}
              onClick={() => setForceSearch(!forceSearch)}
              whileHover={{ borderColor: '#0ea5e9', color: '#0ea5e9' }}>
              <Globe size={10} />
              {!isMobile && 'Web'}{forceSearch && ' ON'}
            </motion.button>

            {tacheSelectionnee && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: `${accent}12`, border: `1px solid ${accent}28`, borderRadius: 99 }}>
                <Link size={10} color={accent} />
                <span style={{ fontSize: 11, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                  {taches.find(t => t.id === tacheSelectionnee)?.titre}
                </span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }} onClick={() => setTacheSelectionnee(null)}>
                  <X size={10} />
                </button>
              </motion.div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            {messages.length > 0 && (
              <motion.button
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11 }}
                onClick={effacer} whileHover={{ borderColor: '#ef4444', color: '#ef4444' }}>
                <Trash2 size={11} />{!isMobile && 'Effacer'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Historique drawer */}
        <AnimatePresence>
          {showHistorique && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ background: 'rgba(8,8,16,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px clamp(16px,4vw,28px)', maxHeight: 200, overflowY: 'auto', flexShrink: 0, backdropFilter: 'blur(30px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Historique</span>
                <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} onClick={() => setShowHistorique(false)}>
                  <X size={13} />
                </button>
              </div>
              {historique.slice(0, 20).map(h => (
                <motion.div key={h.id}
                  className="glass"
                  style={{ borderRadius: 9, padding: '8px 12px', marginBottom: 5, cursor: 'pointer' }}
                  whileHover={{ borderColor: `${accent}50` }}
                  onClick={() => { setPrompt(h.prompt); setShowHistorique(false) }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt?.substring(0, 80)}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MESSAGES ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(20px,4vw,36px)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* État vide */}
          {messages.length === 0 && (
            <motion.div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              {/* Logo animé */}
              <motion.div style={{ position: 'relative', marginBottom: 32 }}>
                <motion.div
                  style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg, ${accent}, ${accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${accent}40, 0 0 120px ${accent}20` }}
                  animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <Sparkles size={36} color="#fff" strokeWidth={1.5} />
                </motion.div>
                {/* Ring animé */}
                <motion.div style={{ position: 'absolute', inset: -8, borderRadius: 32, border: `1px solid ${accent}30` }}
                  animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
              </motion.div>

              <h1 style={{ fontSize: 'clamp(24px,5vw,34px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.8px', marginBottom: 10, fontFamily: "'Clash Display', sans-serif", lineHeight: 1.2 }}>
                Bonjour, {user?.nom?.split(' ')[0]}
              </h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 14, maxWidth: 440, lineHeight: 1.7 }}>
                Je suis GetShift AI — votre assistant IA personnel. Je connais vos tâches, vos habitudes et j'ai accès au web en temps réel via Tavily.
              </p>

              {/* Capacités */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 36 }}>
                {[
                  { Icon: Globe,        label: 'Web temps réel',      color: '#0ea5e9' },
                  { Icon: Database,     label: `${memoryCount} souvenirs`, color: accent },
                  { Icon: Brain,        label: 'Spécialiste productivité', color: '${accent2}' },
                  { Icon: CheckCircle,  label: 'Actions directes',    color: '#10b981' },
                ].map(({ Icon, label, color }, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', background: `${color}10`, border: `1px solid ${color}22`, borderRadius: 99, fontSize: 11, color, fontWeight: 600 }}>
                    <Icon size={10} />{label}
                  </motion.div>
                ))}
              </div>

              {/* Suggestions */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10, width: '100%', maxWidth: 580 }}>
                {SUGGESTIONS.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <motion.button key={i}
                      className="glass"
                      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => envoyer(s.text)}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.18)' }} whileTap={{ scale: 0.98 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: s.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color="#fff" strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 }}>{s.text}</span>
                    </motion.button>
                  )
                })}
              </div>

              {/* Tâches preview */}
              {tachesEnCours.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="glass"
                  style={{ marginTop: 28, padding: '14px 18px', borderRadius: 14, maxWidth: 480, width: '100%', textAlign: 'left' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '2px', marginBottom: 10 }}>TES TÂCHES EN COURS</div>
                  {tachesEnCours.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.priorite === 'haute' ? '#ef4444' : t.priorite === 'moyenne' ? '#f59e0b' : '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
                    </div>
                  ))}
                  {tachesEnCours.length > 3 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>+{tachesEnCours.length - 3} autres</div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div key={idx}
                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : msg.role === 'systeme' ? 'center' : 'flex-start' }}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>

                {msg.role === 'systeme' ? (
                  <div style={{ padding: '5px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 99, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                    {msg.content}
                  </div>

                ) : msg.role === 'user' ? (
                  <div style={{ maxWidth: isMobile ? '86%' : '65%' }}>
                    <div style={{ padding: '13px 17px', borderRadius: '17px 17px 4px 17px', background: `linear-gradient(135deg, ${accent}30, ${accent}18)`, border: `1px solid ${accent}35`, fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', backdropFilter: 'blur(10px)' }}>
                      {msg.content}
                    </div>
                  </div>

                ) : (
                  <div style={{ maxWidth: isMobile ? '92%' : '80%', width: '100%' }}>
                    {/* Avatar + meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${accent}, ${accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 14px ${accent}35` }}>
                        <Sparkles size={13} color="#fff" strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', fontFamily: "'Clash Display', sans-serif" }}>
                        GetShift AI
                      </span>
                      {/* Badge intention */}
                      {msg.intention && msg.intention !== 'chat' && (() => {
                        const meta = INTENTION_META[msg.intention]
                        if (!meta) return null
                        const Icon = meta.Icon
                        return (
                          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: `${meta.color}14`, border: `1px solid ${meta.color}30`, borderRadius: 99 }}>
                            <Icon size={9} color={meta.color} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, letterSpacing: '0.5px' }}>{meta.label.toUpperCase()}</span>
                          </motion.div>
                        )
                      })()}
                      {/* Badge web */}
                      {msg.web_searched && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 99 }}>
                          <Globe size={8} color="#0ea5e9" />
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#0ea5e9', letterSpacing: '0.5px' }}>LIVE</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Bulle réponse */}
                    <div className="glass" style={{ padding: '18px 20px', borderRadius: '4px 18px 18px 18px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(30px)' }}>

                      {/* Abréviations */}
                      {msg.abrev_expandees && msg.message_expande && (
                        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${accent}10`, border: `1px solid ${accent}20`, borderRadius: 8, fontSize: 10, color: accent }}>
                          <Zap size={9} />
                          <span>Abréviations comprises : "{msg.message_original}" → "{msg.message_expande}"</span>
                        </div>
                      )}

                      {/* Contenu */}
                      {msg.role === 'erreur' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#ef4444' }}>
                          <AlertCircle size={14} color="#ef4444" />{msg.content}
                        </div>
                      ) : (
                        <Markdown content={msg.content} accent={accent} />
                      )}

                      {/* Carte action */}
                      {msg.action && <CarteAction action={msg.action} />}

                      {/* Sources web */}
                      {msg.search_results && <SourcesWeb results={msg.search_results} />}

                      {/* Actions */}
                      {msg.role === 'ia' && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                          {[
                            { label: copie === idx ? 'Copié !' : 'Copier', Icon: Copy,         action: () => copier(msg.content, idx),                                           color: copie === idx ? accent : null },
                            { label: 'Créer tâche',                          Icon: Plus,         action: () => creerTache(msg.content.substring(0, 80)),                           color: null },
                            { label: 'Continuer',                            Icon: ChevronRight, action: () => envoyer('Continue et développe davantage'),                         color: null },
                            { label: 'Rechercher',                           Icon: Search,       action: () => { setForceSearch(true); envoyer(msg.content.substring(0, 60)) }, color: '#0ea5e9' },
                          ].map(({ label, Icon, action, color }) => (
                            <motion.button key={label}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: color ? `${color}12` : 'transparent', border: `1px solid ${color ? color + '30' : 'rgba(255,255,255,0.08)'}`, borderRadius: 99, color: color || 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer' }}
                              onClick={action}
                              whileHover={{ color: color || '#fff', borderColor: color ? `${color}60` : 'rgba(255,255,255,0.25)' }}>
                              <Icon size={10} />{label}
                            </motion.button>
                          ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${accent}, ${accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${accent}35` }}>
                  <Sparkles size={13} color="#fff" strokeWidth={2} />
                </div>
                <div className="glass" style={{ padding: '12px 18px', borderRadius: '4px 16px 16px 16px' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: accent }}
                        animate={{ y: [-3, 3, -3], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </div>

        {/* ── INPUT ──────────────────────────────────────────────────────────── */}
        <div style={{ padding: '12px clamp(16px,4vw,28px) clamp(16px,4vw,22px)', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,8,16,0.8)', backdropFilter: 'blur(30px)', flexShrink: 0 }}>

          <AnimatePresence>
            {forceSearch && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginBottom: 9, padding: '6px 12px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 9, fontSize: 11, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={10} />
                Recherche web activée — prochain message cherchera sur internet
                <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(14,165,233,0.6)', display: 'flex' }} onClick={() => setForceSearch(false)}>
                  <X size={11} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#fff', fontSize: 14, outline: 'none', resize: 'none', minHeight: 50, maxHeight: 160, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55, backdropFilter: 'blur(20px)', transition: 'border-color 0.2s', caretColor: accent }}
                placeholder={
                  forceSearch            ? 'Que veux-tu rechercher sur le web ?' :
                  tacheSelectionnee      ? `Question sur "${taches.find(t => t.id === tacheSelectionnee)?.titre}" ?` :
                  'Message à GetShift AI — "crée une tâche...", "recherche...", "planifie ma semaine..."'
                }
                value={prompt}
                onChange={e => { setPrompt(e.target.value); autoResize(e) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                onFocus={e => e.target.style.borderColor = `${accent}60`}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                rows={1}
              />
            </div>
            <motion.button
              style={{ width: 50, height: 50, background: loading || !prompt.trim() ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${accent}, ${accent2})`, color: loading || !prompt.trim() ? 'rgba(255,255,255,0.2)' : '#fff', border: loading || !prompt.trim() ? '1px solid rgba(255,255,255,0.08)' : 'none', borderRadius: 14, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: !loading && prompt.trim() ? `0 4px 20px ${accent}40` : 'none', transition: 'all 0.2s' }}
              onClick={() => envoyer()}
              whileHover={!loading && prompt.trim() ? { scale: 1.06 } : {}}
              whileTap={!loading && prompt.trim() ? { scale: 0.94 } : {}}>
              {loading
                ? <motion.div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                : <Send size={17} strokeWidth={2.5} />
              }
            </motion.button>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8, letterSpacing: '0.3px' }}>
            Entrée pour envoyer · Shift+Entrée nouvelle ligne · Globe pour la recherche web
          </p>
        </div>
      </main>
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { useTheme } from '../useTheme'
import { Bot, Send, History, Link, LayoutDashboard, BarChart2, Calendar, LogOut, Copy, Plus, X, ChevronRight, Layers } from 'lucide-react'

const API = 'https://taskflow-production-75c1.up.railway.app'

const modeles = [
  { id: 'llama-3.3-70b-versatile', nom: 'Llama 3.3', description: 'Meta — Très puissant' },
  { id: 'mixtral-8x7b-32768', nom: 'Mixtral', description: 'Mistral AI — Rapide' },
  { id: 'gemma2-9b-it', nom: 'Gemma 2', description: 'Google — Efficace' },
]

export default function IAChat() {
  const [prompt, setPrompt] = useState('')
  const [modele, setModele] = useState('llama-3.3-70b-versatile')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [taches, setTaches] = useState([])
  const [tacheSelectionnee, setTacheSelectionnee] = useState(null)
  const [historique, setHistorique] = useState([])
  const [showHistorique, setShowHistorique] = useState(false)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerTaches()
    chargerHistorique()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chargerTaches = async () => {
    const res = await axios.get(`${API}/taches/${user.id}`)
    setTaches(res.data.filter(t => !t.terminee))
  }

  const chargerHistorique = async () => {
    const res = await axios.get(`${API}/ia/historique/${user.id}`)
    setHistorique(res.data)
  }

  const envoyerPrompt = async () => {
    if (!prompt.trim() || loading) return
    const userMsg = { role: 'user', content: prompt, modele }
    setMessages(prev => [...prev, userMsg])
    const promptEnvoye = prompt
    setPrompt('')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/ia/executer`, { prompt: promptEnvoye, modele, tache_id: tacheSelectionnee })
      const iaMsg = { role: 'ia', content: res.data.reponse, modele: res.data.modele }
      setMessages(prev => [...prev, iaMsg])
      await axios.post(`${API}/ia/historique`, { user_id: user.id, prompt: promptEnvoye, reponse: res.data.reponse, modele, tache_id: tacheSelectionnee })
      if (tacheSelectionnee) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
        setMessages(prev => [...prev, { role: 'systeme', content: 'Tâche marquée comme terminée' }])
        setTacheSelectionnee(null)
        chargerTaches()
      }
      chargerHistorique()
    } catch {
      setMessages(prev => [...prev, { role: 'erreur', content: 'Erreur de connexion à l\'IA' }])
    }
    setLoading(false)
  }

  const creerTacheDepuisIA = async (titre) => {
    await axios.post(`${API}/taches`, { titre, priorite: 'moyenne', user_id: user.id })
    chargerTaches()
    setMessages(prev => [...prev, { role: 'systeme', content: `Tâche créée avec succès` }])
  }

  const modeleActuel = modeles.find(m => m.id === modele)

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width: 260, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>

        {/* Navigation */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/ia'
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => navigate(item.path)} whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {item.label}
            </motion.button>
          )
        })}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Modèles IA */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>MODÈLE IA</p>
        {modeles.map(m => (
          <motion.button key={m.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, background: modele === m.id ? `${T.accent}15` : 'transparent', border: `1px solid ${modele === m.id ? T.accent + '40' : 'transparent'}`, color: modele === m.id ? T.accent : T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left', marginBottom: 4 }}
            onClick={() => setModele(m.id)} whileHover={{ x: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: modele === m.id ? T.accent : T.border, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: modele === m.id ? 600 : 400, fontSize: 13 }}>{m.nom}</div>
              <div style={{ fontSize: 11, color: T.text2, opacity: 0.7 }}>{m.description}</div>
            </div>
            {modele === m.id && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
          </motion.button>
        ))}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Lier une tâche */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>LIER UNE TÂCHE</p>
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', borderRadius: 10, background: !tacheSelectionnee ? `${T.accent}15` : 'transparent', border: `1px solid ${!tacheSelectionnee ? T.accent + '40' : T.border}`, color: !tacheSelectionnee ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, textAlign: 'left', marginBottom: 6 }}
          onClick={() => setTacheSelectionnee(null)}>
          <Link size={12} />
          Aucune tâche
        </motion.button>
        {taches.length === 0 ? (
          <p style={{ fontSize: 12, color: T.text2, padding: '4px 8px' }}>Aucune tâche en cours</p>
        ) : taches.map(t => (
          <motion.button key={t.id}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, background: tacheSelectionnee === t.id ? `${T.accent}15` : T.bg3, border: `1px solid ${tacheSelectionnee === t.id ? T.accent + '40' : T.border}`, color: tacheSelectionnee === t.id ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, textAlign: 'left', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            onClick={() => setTacheSelectionnee(t.id)} whileHover={{ x: 2 }}>
            {tacheSelectionnee === t.id ? '✓ ' : ''}{t.titre}
          </motion.button>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: showHistorique ? `${T.accent}15` : 'transparent', border: 'none', color: showHistorique ? T.accent : T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left', marginBottom: 4 }}
            onClick={() => setShowHistorique(!showHistorique)} whileHover={{ color: T.accent }}>
            <History size={16} strokeWidth={1.8} />
            Historique ({historique.length})
          </motion.button>
          <motion.button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13 }}
            onClick={() => { localStorage.removeItem('user'); navigate('/') }}
            whileHover={{ color: '#e05c5c' }}>
            <LogOut size={16} strokeWidth={1.8} />
            Déconnexion
          </motion.button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '16px 28px', borderBottom: `1px solid ${T.border}`, background: T.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>Assistant IA</h1>
            <p style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
              {tacheSelectionnee ? `Tâche liée : ${taches.find(t => t.id === tacheSelectionnee)?.titre}` : 'Prompt libre — aucune tâche liée'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: T.bg3, borderRadius: 99, border: `1px solid ${T.border}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf82' }} />
            <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{modeleActuel?.nom}</span>
          </div>
        </div>

        {/* Historique panel */}
        <AnimatePresence>
          {showHistorique && (
            <motion.div style={{ background: T.bg2, borderBottom: `1px solid ${T.border}`, padding: '16px 28px', maxHeight: 250, overflowY: 'auto' }}
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>Historique des conversations</p>
              {historique.length === 0 ? (
                <p style={{ color: T.text2, fontSize: 13 }}>Aucun historique</p>
              ) : historique.map(h => (
                <motion.div key={h.id}
                  style={{ background: T.bg3, borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', border: `1px solid ${T.border}` }}
                  whileHover={{ borderColor: T.accent }}
                  onClick={() => { setPrompt(h.prompt); setShowHistorique(false) }}>
                  <div style={{ fontSize: 11, color: T.text2, marginBottom: 4 }}>{new Date(h.created_at).toLocaleDateString('fr-FR')} • {h.modele.split('-')[0]}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{h.prompt.substring(0, 80)}...</div>
                  {h.tache_titre && <div style={{ fontSize: 11, color: T.accent, marginTop: 4 }}>Tâche : {h.tache_titre}</div>}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <motion.div style={{ textAlign: 'center', marginTop: '10%', color: T.text2 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: `${T.accent}15`, border: `1px solid ${T.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Bot size={28} color={T.accent} strokeWidth={1.5} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8, letterSpacing: '-0.3px' }}>Prêt à vous aider</h2>
              <p style={{ fontSize: 14, marginBottom: 24, color: T.text2 }}>Écrivez un prompt ou sélectionnez une tâche à terminer</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Résume cet article...', 'Génère 5 idées de...', 'Traduis ce texte...', 'Explique-moi...'].map(ex => (
                  <motion.button key={ex}
                    style={{ padding: '8px 14px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                    onClick={() => setPrompt(ex)} whileHover={{ borderColor: T.accent, color: T.accent }}>
                    {ex}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i}
                style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : msg.role === 'systeme' ? 'center' : 'flex-start' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {msg.role === 'systeme' ? (
                  <div style={{ padding: '6px 14px', background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.2)', borderRadius: 99, fontSize: 12, color: '#4caf82', fontWeight: 500 }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ maxWidth: '72%', padding: '14px 18px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? `${T.accent}15` : msg.role === 'erreur' ? 'rgba(224,92,92,0.1)' : T.bg2, border: `1px solid ${msg.role === 'user' ? T.accent + '30' : msg.role === 'erreur' ? 'rgba(224,92,92,0.2)' : T.border}` }}>
                    {msg.role === 'ia' && (
                      <div style={{ fontSize: 11, color: T.accent, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82' }} />
                        {modeles.find(m => m.id === msg.modele)?.nom}
                      </div>
                    )}
                    <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: msg.role === 'erreur' ? '#e05c5c' : T.text }}>
                      {msg.content}
                    </div>
                    {msg.role === 'ia' && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <motion.button
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          whileHover={{ borderColor: T.accent, color: T.accent }}>
                          <Copy size={11} /> Copier
                        </motion.button>
                        <motion.button
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 99, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                          onClick={() => creerTacheDepuisIA(msg.content.substring(0, 50))}
                          whileHover={{ borderColor: T.accent, color: T.accent }}>
                          <Plus size={11} /> Créer une tâche
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div style={{ display: 'flex' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ padding: '14px 18px', borderRadius: '16px 16px 16px 4px', background: T.bg2, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }}
                      animate={{ y: [-3, 3, -3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${T.border}`, background: T.bg2 }}>
          {tacheSelectionnee && (
            <motion.div style={{ marginBottom: 10, padding: '8px 14px', background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 10, fontSize: 12, color: T.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span>Tâche liée : {taches.find(t => t.id === tacheSelectionnee)?.titre}</span>
              <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', display: 'flex' }}
                onClick={() => setTacheSelectionnee(null)} whileHover={{ color: '#e05c5c' }}>
                <X size={14} />
              </motion.button>
            </motion.div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              style={{ flex: 1, padding: '12px 16px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none', resize: 'none', minHeight: 48, maxHeight: 140, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
              placeholder={tacheSelectionnee ? `Prompt pour : "${taches.find(t => t.id === tacheSelectionnee)?.titre}"` : `Écrivez votre prompt pour ${modeleActuel?.nom}...`}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerPrompt() } }}
              rows={1}
            />
            <motion.button
              style={{ padding: '12px 16px', background: loading ? T.bg3 : T.accent, color: loading ? T.text2 : T.bg, border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={envoyerPrompt} whileHover={!loading ? { scale: 1.03 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}>
              {loading ? <div style={{ display: 'flex', gap: 3 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: T.text2 }} animate={{ y: [-2, 2, -2] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />)}</div> : <Send size={16} strokeWidth={2} />}
            </motion.button>
          </div>
          <p style={{ fontSize: 11, color: T.text2, marginTop: 8 }}>Entrée pour envoyer • Shift+Entrée pour nouvelle ligne</p>
        </div>
      </main>
    </div>
  )
}

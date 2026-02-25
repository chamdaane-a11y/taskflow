import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { themes } from '../themes'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import {
  LayoutDashboard, CheckSquare, Clock, AlertTriangle,
  ChevronRight, Trash2, Plus, LogOut, Bot, BarChart2,
  Calendar, Layers, Bell, Award, Palette, Sparkles, Target, Users
} from 'lucide-react'

registerLocale('fr', fr)
const API = 'https://taskflow-production-75c1.up.railway.app'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    if (value === 0) { setDisplay(0); return }
    const timer = setInterval(() => {
      start += 1
      setDisplay(start)
      if (start >= value) clearInterval(timer)
    }, 800 / value)
    return () => clearInterval(timer)
  }, [value])
  return <span>{display}</span>
}

const niveaux = [
  { niveau: 1, label: 'Debutant', min: 0 },
  { niveau: 2, label: 'Apprenti', min: 100 },
  { niveau: 3, label: 'Confirme', min: 250 },
  { niveau: 4, label: 'Expert', min: 500 },
  { niveau: 5, label: 'Maitre', min: 1000 },
]

const badges = [
  { id: 'first', label: 'Premiere tache', condition: (t, p) => t >= 1 },
  { id: 'five', label: '5 taches terminees', condition: (t, p) => t >= 5 },
  { id: 'ten', label: '10 taches terminees', condition: (t, p) => t >= 10 },
  { id: 'points100', label: '100 points', condition: (t, p) => p >= 100 },
  { id: 'points500', label: '500 points', condition: (t, p) => p >= 500 },
]

export default function Dashboard() {
  const [taches, setTaches] = useState([])
  const [titre, setTitre] = useState('')
  const [priorite, setPriorite] = useState('moyenne')
  const [deadline, setDeadline] = useState(null)
  const [filtre, setFiltre] = useState('toutes')
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [niveau, setNiveau] = useState(1)
  const [theme, setTheme] = useState('dark')
  const [showThemes, setShowThemes] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [notification, setNotification] = useState(null)
  const [rappels, setRappels] = useState([])
  const [showRappels, setShowRappels] = useState(false)
  const [objectif, setObjectif] = useState('')
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user'))
  const T = themes[theme]

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerProfil()
    chargerTaches()
    chargerRappels()
  }, [])

  const chargerProfil = async () => {
  const res = await axios.get(`${API}/users/${user.id}`)
  setPoints(res.data.points || 0)
  setNiveau(res.data.niveau || 1)
  const t = res.data.theme || 'dark'
  setTheme(t)
  localStorage.setItem('theme', t)
}

  const chargerTaches = async () => {
    setLoading(true)
    const res = await axios.get(`${API}/taches/${user.id}`)
    setTaches(res.data)
    setLoading(false)
  }

  const chargerRappels = async () => {
    const res = await axios.get(`${API}/taches/rappels/${user.id}`)
    if (res.data.rappels) setRappels(res.data.rappels)
  }

  const changerTheme = async (newTheme) => {
  setTheme(newTheme)
  setShowThemes(false)
  localStorage.setItem('theme', newTheme)
  await axios.put(`${API}/users/${user.id}/theme`, { theme: newTheme })
}

  const afficherNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const ajouterTache = async () => {
    if (!titre.trim()) return
    await axios.post(`${API}/taches`, { titre, priorite, deadline: deadline ? deadline.toISOString().split('T')[0] : null, user_id: user.id })
    setTitre(''); setDeadline('')
    afficherNotification('Tâche ajoutée avec succès')
    chargerTaches()
  }

  const toggleTache = async (id, terminee, tachePriorite) => {
    await axios.put(`${API}/taches/${id}`, { terminee: !terminee })
    if (!terminee) {
      const pts = tachePriorite === 'haute' ? 30 : tachePriorite === 'moyenne' ? 20 : 10
      const res = await axios.put(`${API}/users/${user.id}/points`, { points: pts })
      setPoints(res.data.points)
      setNiveau(res.data.niveau)
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: [T.accent, '#4caf82'] })
      afficherNotification(`+${pts} points gagnés`)
    }
    chargerTaches()
  }

  const supprimerTache = async (id) => {
    await axios.delete(`${API}/taches/${id}`)
    chargerTaches()
  }

  const genererTaches = async () => {
    if (!objectif.trim()) return
    afficherNotification('Génération en cours...')
    const res = await axios.post(`${API}/ia/generer-taches`, {
      objectif, user_id: user.id, priorite: 'moyenne'
    })
    if (res.data.taches) {
      afficherNotification(`${res.data.taches.length} tâches créées`)
      setObjectif('')
      chargerTaches()
      setTimeout(() => navigate('/ia'), 1500)
    }
  }

  const tachesFiltrees = taches.filter(t => {
    if (filtre === 'toutes') return true
    if (filtre === 'terminee') return t.terminee
    if (filtre === 'haute') return t.priorite === 'haute' && !t.terminee
    return t.priorite === filtre
  })

  const total = taches.length
  const terminees = taches.filter(t => t.terminee).length
  const haute = taches.filter(t => t.priorite === 'haute' && !t.terminee).length
  const enCours = total - terminees
  const pct = total > 0 ? Math.round((terminees / total) * 100) : 0
  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
  const niveauActuel = niveaux.find(n => n.niveau === niveau) || niveaux[0]
  const niveauSuivant = niveaux.find(n => n.niveau === niveau + 1)
  const pctNiveau = niveauSuivant ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100) : 100
  const badgesObtenus = badges.filter(b => b.condition(terminees, points))

  const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
  { icon: Bot, label: 'Assistant IA', path: '/ia' },
  { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
  { icon: Calendar, label: 'Planification', path: '/planification' },
  { icon: Users, label: 'Collaboration', path: '/collaboration' },
]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, transition: 'all 0.5s ease', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div style={{
            position: 'fixed', top: 24, right: 24, zIndex: 1000,
            background: T.bg2, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside style={{
        width: 248, background: T.bg2,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '24px 16px', position: 'fixed',
        top: 0, left: 0, height: '100vh',
        transition: 'all 0.5s ease'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>

        {/* Profil */}
        <div style={{ background: T.bg3, borderRadius: 12, padding: 14, marginBottom: 24, border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {user?.nom?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{user?.nom}</div>
              <div style={{ fontSize: 11, color: T.text2 }}>Niveau {niveau} — {niveauActuel.label}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text2, marginBottom: 6 }}>
            <span>{points} pts</span>
            <span>{pctNiveau}%</span>
          </div>
          <div style={{ height: 4, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, borderRadius: 99 }}
              initial={{ width: 0 }} animate={{ width: `${pctNiveau}%` }} transition={{ duration: 1 }} />
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
          {navItems.map(item => {
            const Icon = item.icon
            const active = window.location.pathname === item.path
            return (
              <motion.button key={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px', borderRadius: 10,
                  color: active ? T.accent : T.text2,
                  background: active ? `${T.accent}15` : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: 'left', marginBottom: 2,
                  transition: 'all 0.15s'
                }}
                onClick={() => navigate(item.path)}
                whileHover={{ x: 2, color: T.accent }}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {item.label}
              </motion.button>
            )
          })}

          <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

          <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>FILTRES</p>
          {[
            { val: 'toutes', label: 'Toutes les tâches' },
            { val: 'haute', label: 'Priorité haute' },
            { val: 'terminee', label: 'Terminées' }
          ].map(f => (
            <motion.button key={f.val}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '8px 12px', borderRadius: 10,
                color: filtre === f.val ? T.accent : T.text2,
                background: filtre === f.val ? `${T.accent}15` : 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: filtre === f.val ? 600 : 400,
                textAlign: 'left', marginBottom: 2
              }}
              onClick={() => setFiltre(f.val)}
              whileHover={{ x: 2 }}>
              {f.label}
              {filtre === f.val && <ChevronRight size={14} />}
            </motion.button>
          ))}
        </nav>

        {/* Badges */}
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left', marginBottom: 2 }}
          onClick={() => setShowBadges(!showBadges)} whileHover={{ color: T.accent }}>
          <Award size={16} strokeWidth={1.8} />
          Badges ({badgesObtenus.length}/{badges.length})
        </motion.button>

        <AnimatePresence>
          {showBadges && (
            <motion.div style={{ background: T.bg3, borderRadius: 10, padding: 12, marginBottom: 8, border: `1px solid ${T.border}` }}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {badges.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', opacity: badgesObtenus.find(ob => ob.id === b.id) ? 1 : 0.3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
                  <span style={{ fontSize: 12, color: T.text2 }}>{b.label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme */}
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left', marginBottom: 2 }}
          onClick={() => setShowThemes(!showThemes)} whileHover={{ color: T.accent }}>
          <Palette size={16} strokeWidth={1.8} />
          Thème
        </motion.button>

        <AnimatePresence>
          {showThemes && (
            <motion.div style={{ background: T.bg3, borderRadius: 10, padding: 8, marginBottom: 8, border: `1px solid ${T.border}` }}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {Object.entries(themes).map(([key, t]) => (
                <motion.button key={key}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: theme === key ? `${T.accent}20` : 'transparent', border: 'none', color: theme === key ? T.accent : T.text2, cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
                  onClick={() => changerTheme(key)} whileHover={{ x: 2 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.accent }} />
                  {t.name}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text2, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
          onClick={() => { localStorage.removeItem('user'); navigate('/') }}
          whileHover={{ color: '#e05c5c' }}>
          <LogOut size={16} strokeWidth={1.8} />
          Déconnexion
        </motion.button>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 248, flex: 1, padding: '32px 40px', maxWidth: 'calc(100vw - 248px)' }}>

        {/* Header */}
        <motion.div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>{salut}, {user?.nom?.split(' ')[0]}</h1>
            <p style={{ color: T.text2, fontSize: 13, marginTop: 4 }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          {rappels.length > 0 && (
            <motion.button
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 99, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => setShowRappels(!showRappels)}
              whileHover={{ scale: 1.02 }}>
              <Bell size={14} />
              {rappels.length} rappel{rappels.length > 1 ? 's' : ''}
            </motion.button>
          )}
        </motion.div>

        {/* Rappels */}
        <AnimatePresence>
          {showRappels && rappels.length > 0 && (
            <motion.div style={{ background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 14, padding: 20, marginBottom: 24 }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {rappels.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(224,92,92,0.1)' }}>
                  <span style={{ fontSize: 13, color: T.text }}>{r.titre}</span>
                  <span style={{ fontSize: 12, color: r.jours_restants === 0 ? '#e05c5c' : '#e08a3c', fontWeight: 600 }}>
                    {r.jours_restants === 0 ? "Aujourd'hui" : r.jours_restants === 1 ? 'Demain' : `Dans ${r.jours_restants}j`}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: CheckSquare, val: total, label: 'Total', color: T.accent },
            { icon: CheckSquare, val: terminees, label: 'Terminées', color: '#4caf82' },
            { icon: AlertTriangle, val: haute, label: 'Haute priorité', color: '#e05c5c' },
            { icon: Clock, val: enCours, label: 'En cours', color: '#6c63ff' },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label}
                style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px' }}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -2, borderColor: stat.color + '60' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Icon size={18} color={stat.color} strokeWidth={1.8} />
                  <span style={{ fontSize: 11, color: T.text2, background: T.bg3, padding: '2px 8px', borderRadius: 99 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: T.text, letterSpacing: '-0.5px' }}>
                  <AnimatedNumber value={stat.val} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Progression */}
        <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: T.text2, fontWeight: 500 }}>Progression globale</span>
            <span style={{ color: T.accent, fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div style={{ height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, borderRadius: 99 }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </motion.div>

        {/* Formulaires côte à côte */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Nouvelle tâche */}
          <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} strokeWidth={2} color={T.accent} /> Nouvelle tâche
            </p>
            <input style={{ width: '100%', padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              placeholder="Que dois-tu faire ?" value={titre} onChange={e => setTitre(e.target.value)} onKeyDown={e => e.key === 'Enter' && ajouterTache()} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ flex: 1, padding: '9px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none' }} value={priorite} onChange={e => setPriorite(e.target.value)}>
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
              <DatePicker
  selected={deadline}
  onChange={date => setDeadline(date)}
  locale="fr"
  dateFormat="dd/MM/yyyy"
  minDate={new Date()}
  showTimeSelect
  timeFormat="HH:mm"
  timeIntervals={30}
  timeCaption="Heure"
  placeholderText="Date et heure"
  customInput={
    <motion.input
      style={{ padding: '9px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer', width: 150 }}
      whileHover={{ borderColor: T.accent }}
    />
  }
/>
              <motion.button style={{ padding: '9px 16px', background: T.accent, color: T.bg, border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }} onClick={ajouterTache} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Ajouter
              </motion.button>
            </div>
          </motion.div>

          {/* Générer avec IA */}
          <motion.div style={{ background: T.bg2, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} strokeWidth={2} color={T.accent} /> Générer avec l'IA
            </p>
            <input style={{ width: '100%', padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
              placeholder="Ex: Apprendre React, Préparer un examen..."
              value={objectif} onChange={e => setObjectif(e.target.value)} onKeyDown={e => e.key === 'Enter' && genererTaches()} />
            <motion.button style={{ width: '100%', padding: '9px 16px', background: `${T.accent}15`, border: `1px solid ${T.accent}40`, color: T.accent, borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              onClick={genererTaches} whileHover={{ scale: 1.02, background: `${T.accent}25` }} whileTap={{ scale: 0.98 }}>
              Générer 5 tâches automatiquement
            </motion.button>
          </motion.div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['toutes', 'Toutes'], ['haute', 'Haute priorité'], ['moyenne', 'Moyenne'], ['basse', 'Basse'], ['terminee', 'Terminées']].map(([val, label]) => (
            <motion.button key={val}
              style={{ padding: '6px 14px', background: filtre === val ? `${T.accent}15` : 'transparent', border: `1px solid ${filtre === val ? T.accent : T.border}`, borderRadius: 99, color: filtre === val ? T.accent : T.text2, fontSize: 12, fontWeight: filtre === val ? 600 : 400, cursor: 'pointer' }}
              onClick={() => setFiltre(val)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              {label}
            </motion.button>
          ))}
        </div>

        {/* Liste tâches */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.text2 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Target size={32} color={T.accent} />
            </motion.div>
            <p style={{ marginTop: 12, fontSize: 13 }}>Chargement...</p>
          </div>
        ) : tachesFiltrees.length === 0 ? (
          <motion.div style={{ textAlign: 'center', padding: '60px 20px', color: T.text2 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CheckSquare size={40} color={T.border} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Aucune tâche ici</p>
            <p style={{ fontSize: 13, marginTop: 6, color: T.accent }}>Ajoute une tâche ou génère-en avec l'IA</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {tachesFiltrees.map((tache, i) => {
              const pts = tache.priorite === 'haute' ? 30 : tache.priorite === 'moyenne' ? 20 : 10
              return (
                <motion.div key={tache.id}
                  style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, opacity: tache.terminee ? 0.5 : 1 }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: tache.terminee ? 0.5 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ borderColor: T.accent + '40' }}>

                  <motion.button
                    style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${tache.terminee ? '#4caf82' : T.border}`, background: tache.terminee ? '#4caf82' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => toggleTache(tache.id, tache.terminee, tache.priorite)}
                    whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                    {tache.terminee && <CheckSquare size={10} color="white" strokeWidth={3} />}
                  </motion.button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, textDecoration: tache.terminee ? 'line-through' : 'none', color: tache.terminee ? T.text2 : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tache.titre}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                      {tache.deadline && <span style={{ fontSize: 11, color: T.text2 }}>{new Date(tache.deadline).toLocaleDateString('fr-FR')}</span>}
                      {!tache.terminee && <span style={{ fontSize: 11, color: T.accent }}>+{pts} pts</span>}
                    </div>
                  </div>

                  <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: tache.priorite === 'haute' ? 'rgba(224,92,92,0.12)' : tache.priorite === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)', color: tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'moyenne' ? '#e08a3c' : '#4caf82' }}>
                    {tache.priorite}
                  </span>

                  <motion.button
                    style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                    onClick={() => toggleTache(tache.id, tache.terminee, tache.priorite)}
                    whileHover={{ borderColor: '#4caf82', color: '#4caf82' }}>
                    {tache.terminee ? 'Rouvrir' : 'Terminer'}
                  </motion.button>

                  <motion.button
                    style={{ padding: '5px 8px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, cursor: 'pointer', color: T.text2, display: 'flex' }}
                    onClick={() => supprimerTache(tache.id)}
                    whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                    <Trash2 size={14} strokeWidth={1.8} />
                  </motion.button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}

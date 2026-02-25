import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { LayoutDashboard, Bot, BarChart2, Calendar, LogOut, Layers, Clock, Sparkles, ChevronLeft, ChevronRight, Plus, X, GripVertical } from 'lucide-react'

const API = 'https://taskflow-production-75c1.up.railway.app'

const HEURES = Array.from({ length: 12 }, (_, i) => i + 8) // 8h à 19h

export default function Planification() {
  const [taches, setTaches] = useState([])
  const [planification, setPlanification] = useState([])
  const [priorites, setPriorities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIA, setLoadingIA] = useState(false)
  const [heuresDispo, setHeuresDispo] = useState(8)
  const [conseil, setConseil] = useState('')
  const [semaineOffset, setSemaineOffset] = useState(0)
  const [draggedTache, setDraggedTache] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [showEstimer, setShowEstimer] = useState(null)
  const [loadingEstime, setLoadingEstime] = useState(false)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerDonnees()
  }, [])

  const chargerDonnees = async () => {
    setLoading(true)
    const [tachesRes, planRes, prioritesRes] = await Promise.all([
      axios.get(`${API}/taches/${user.id}`),
      axios.get(`${API}/planification/${user.id}`),
      axios.get(`${API}/taches/${user.id}/priorite-intelligente`)
    ])
    setTaches(tachesRes.data.filter(t => !t.terminee))
    setPlanification(planRes.data)
    setPriorities(prioritesRes.data.slice(0, 5))
    setLoading(false)
  }

  const planifierAvecIA = async () => {
    setLoadingIA(true)
    try {
      const res = await axios.post(`${API}/ia/planifier`, { user_id: user.id, heures_dispo: heuresDispo })
      setConseil(res.data.conseil)
      await chargerDonnees()
    } catch (err) { console.error(err) }
    setLoadingIA(false)
  }

  const estimerTempsIA = async (tache) => {
    setLoadingEstime(true)
    try {
      const res = await axios.post(`${API}/ia/executer`, {
        prompt: `Estime le temps nécessaire en minutes pour accomplir cette tâche : "${tache.titre}". Réponds UNIQUEMENT avec un nombre entier représentant les minutes. Exemple: 45`,
        modele: 'llama-3.3-70b-versatile'
      })
      const minutes = parseInt(res.data.reponse.trim())
      if (!isNaN(minutes)) {
        await axios.put(`${API}/taches/${tache.id}/temps`, { temps_estime: minutes, temps_reel: null })
        await chargerDonnees()
        setShowEstimer(null)
      }
    } catch (err) { console.error(err) }
    setLoadingEstime(false)
  }

  // Jours de la semaine courante
  const getJoursSemaine = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff + i + semaineOffset * 7)
      return {
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        num: d.getDate(),
        mois: d.toLocaleDateString('fr-FR', { month: 'short' }),
        isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
      }
    })
  }

  const jours = getJoursSemaine()

  const getTachesPourJour = (date) => {
    return planification.filter(p => {
      const pDate = p.date_planifiee?.split('T')[0] || p.date_planifiee
      return pDate === date
    })
  }

  const handleDragStart = (tache) => setDraggedTache(tache)
  const handleDragEnd = () => { setDraggedTache(null); setDragOver(null) }

  const handleDrop = async (date, heure) => {
    if (!draggedTache) return
    const heureDebut = `${String(heure).padStart(2, '0')}:00`
    const heureFin = `${String(heure + 1).padStart(2, '0')}:00`
    try {
      await axios.post(`${API}/planification`, {
        user_id: user.id,
        tache_id: draggedTache.id,
        date_planifiee: date,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        charge_minutes: draggedTache.temps_estime || 60,
        genere_par_ia: false
      })
      await chargerDonnees()
    } catch (err) { console.error(err) }
    setDraggedTache(null)
    setDragOver(null)
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
    { icon: Bot, label: 'Assistant IA', path: '/ia' },
    { icon: BarChart2, label: 'Analytiques', path: '/analytics' },
    { icon: Calendar, label: 'Planification', path: '/planification' },
  ]

  const moisAnnee = jours[0] ? `${jours[0].mois} — ${new Date().getFullYear()}` : ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width: 248, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color={T.bg} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>TaskFlow</span>
        </div>

        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {navItems.map(item => {
          const Icon = item.icon
          const active = item.path === '/planification'
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

        {/* Planifier avec IA */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>PLANIFICATION IA</p>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.text2 }}>Heures / jour</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.button style={{ width: 24, height: 24, borderRadius: 6, background: T.bg3, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setHeuresDispo(Math.max(1, heuresDispo - 1))} whileHover={{ scale: 1.1 }}>-</motion.button>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text, minWidth: 20, textAlign: 'center' }}>{heuresDispo}</span>
              <motion.button style={{ width: 24, height: 24, borderRadius: 6, background: T.bg3, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setHeuresDispo(Math.min(16, heuresDispo + 1))} whileHover={{ scale: 1.1 }}>+</motion.button>
            </div>
          </div>
          <motion.button
            style={{ width: '100%', padding: '10px 14px', background: loadingIA ? T.bg3 : `${T.accent}15`, border: `1px solid ${loadingIA ? T.border : T.accent + '40'}`, color: loadingIA ? T.text2 : T.accent, borderRadius: 10, fontWeight: 600, cursor: loadingIA ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={planifierAvecIA} whileHover={!loadingIA ? { scale: 1.02 } : {}}>
            <Sparkles size={14} strokeWidth={2} />
            {loadingIA ? 'Planification...' : 'Planifier avec l\'IA'}
          </motion.button>
        </div>

        {conseil && (
          <div style={{ padding: '10px 12px', background: `${T.accent}10`, border: `1px solid ${T.accent}20`, borderRadius: 10, fontSize: 12, color: T.text2, marginBottom: 12, lineHeight: 1.5 }}>
            {conseil}
          </div>
        )}

        <div style={{ height: 1, background: T.border, margin: '8px 0 16px' }} />

        {/* Priorités intelligentes */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>PRIORITÉS</p>
        {priorites.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, marginBottom: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? '#e05c5c' : i === 1 ? '#e08a3c' : T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 12, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{t.titre}</span>
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
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
      <main style={{ marginLeft: 248, flex: 1, padding: '32px 32px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Planification</h1>
            <p style={{ color: T.text2, fontSize: 13, marginTop: 4, textTransform: 'capitalize' }}>{moisAnnee}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.button style={{ width: 36, height: 36, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setSemaineOffset(semaineOffset - 1)} whileHover={{ borderColor: T.accent, color: T.accent }}>
              <ChevronLeft size={16} />
            </motion.button>
            <motion.button style={{ padding: '8px 16px', borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', fontSize: 13 }}
              onClick={() => setSemaineOffset(0)} whileHover={{ borderColor: T.accent, color: T.accent }}>
              Aujourd'hui
            </motion.button>
            <motion.button style={{ width: 36, height: 36, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setSemaineOffset(semaineOffset + 1)} whileHover={{ borderColor: T.accent, color: T.accent }}>
              <ChevronRight size={16} />
            </motion.button>
          </div>
        </div>

        {/* Tâches non planifiées */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.text2, letterSpacing: 1.2, marginBottom: 8 }}>GLISSER UNE TÂCHE SUR LE CALENDRIER</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {taches.filter(t => !planification.find(p => p.tache_id === t.id)).slice(0, 6).map(tache => (
              <motion.div key={tache.id}
                draggable
                onDragStart={() => handleDragStart(tache)}
                onDragEnd={handleDragEnd}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: T.bg2, border: `1px solid ${draggedTache?.id === tache.id ? T.accent : T.border}`, borderRadius: 99, fontSize: 12, cursor: 'grab', color: T.text }}
                whileHover={{ borderColor: T.accent, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}>
                <GripVertical size={12} color={T.text2} />
                {tache.titre.length > 25 ? tache.titre.substring(0, 25) + '...' : tache.titre}
                {tache.temps_estime ? (
                  <span style={{ fontSize: 10, color: T.accent, background: `${T.accent}15`, padding: '2px 6px', borderRadius: 99 }}>{tache.temps_estime}min</span>
                ) : (
                  <motion.button
                    style={{ fontSize: 10, color: T.text2, background: T.bg3, border: `1px solid ${T.border}`, padding: '2px 6px', borderRadius: 99, cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setShowEstimer(tache) }}
                    whileHover={{ color: T.accent, borderColor: T.accent }}>
                    Estimer
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Calendrier semaine */}
        <div style={{ flex: 1, overflow: 'auto', background: T.bg2, borderRadius: 16, border: `1px solid ${T.border}` }}>

          {/* En-têtes jours */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, background: T.bg2, zIndex: 10 }}>
            <div style={{ padding: '12px 8px' }} />
            {jours.map(jour => (
              <div key={jour.date} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, color: T.text2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{jour.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: jour.isToday ? T.accent : T.text, marginTop: 2, width: 36, height: 36, borderRadius: '50%', background: jour.isToday ? `${T.accent}15` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 0' }}>
                  {jour.num}
                </div>
              </div>
            ))}
          </div>

          {/* Grille heures */}
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
            {HEURES.map(heure => (
              <div key={heure} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: `1px solid ${T.border}40`, minHeight: 64 }}>
                <div style={{ padding: '8px 8px 0', fontSize: 11, color: T.text2, textAlign: 'right', paddingRight: 12, fontWeight: 500 }}>
                  {String(heure).padStart(2, '0')}:00
                </div>
                {jours.map(jour => {
                  const tachesJour = getTachesPourJour(jour.date).filter(p => {
                    const h = parseInt(p.heure_debut?.split(':')[0] || 0)
                    return h === heure
                  })
                  const isDragTarget = dragOver?.date === jour.date && dragOver?.heure === heure
                  return (
                    <div key={jour.date}
                      style={{ borderLeft: `1px solid ${T.border}40`, padding: 4, minHeight: 64, background: isDragTarget ? `${T.accent}10` : 'transparent', transition: 'background 0.15s', position: 'relative' }}
                      onDragOver={e => { e.preventDefault(); setDragOver({ date: jour.date, heure }) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(jour.date, heure)}>
                      {tachesJour.map(p => (
                        <motion.div key={p.id}
                          style={{ padding: '4px 8px', background: `${T.accent}20`, border: `1px solid ${T.accent}40`, borderRadius: 6, fontSize: 11, color: T.accent, fontWeight: 500, marginBottom: 2, cursor: 'pointer' }}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}>
                          {p.titre?.length > 20 ? p.titre.substring(0, 20) + '...' : p.titre}
                          {p.heure_debut && <div style={{ fontSize: 10, opacity: 0.7 }}>{p.heure_debut} — {p.heure_fin}</div>}
                        </motion.div>
                      ))}
                      {isDragTarget && (
                        <div style={{ position: 'absolute', inset: 4, border: `2px dashed ${T.accent}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Plus size={14} color={T.accent} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal estimer temps */}
      <AnimatePresence>
        {showEstimer && (
          <motion.div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowEstimer(null)}>
            <motion.div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 380, position: 'relative' }}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Estimer avec l'IA</h3>
                <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }} onClick={() => setShowEstimer(null)} whileHover={{ color: '#e05c5c' }}>
                  <X size={18} />
                </motion.button>
              </div>
              <p style={{ fontSize: 13, color: T.text2, marginBottom: 20, lineHeight: 1.6 }}>
                L'IA va analyser la tâche <strong style={{ color: T.text }}>"{showEstimer.titre}"</strong> et estimer le temps nécessaire.
              </p>
              <motion.button
                style={{ width: '100%', padding: '12px', background: loadingEstime ? T.bg3 : T.accent, color: loadingEstime ? T.text2 : T.bg, border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: loadingEstime ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => estimerTempsIA(showEstimer)}
                whileHover={!loadingEstime ? { scale: 1.02 } : {}}>
                <Sparkles size={16} />
                {loadingEstime ? 'Estimation en cours...' : 'Estimer le temps'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

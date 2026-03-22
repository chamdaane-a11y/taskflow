import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
import {
  Flag, ChevronLeft, Sparkles, Target, Calendar,
  CheckCircle2, AlertCircle, Clock, Zap, ArrowRight,
  Download, ChevronDown, ChevronUp, Layers
} from 'lucide-react'

registerLocale('fr', fr)
const API = 'https://getshift-backend.onrender.com'

const NIVEAUX = [
  { id: 'realiste',  label: 'Réaliste',  desc: 'Progression douce et durable',       emoji: '🌱', color: '#4caf82' },
  { id: 'ambitieux', label: 'Ambitieux', desc: 'Rythme soutenu, résultats rapides',   emoji: '🔥', color: '#e08a3c' },
  { id: 'extreme',   label: 'Extrême',   desc: 'Tout-ou-rien, intensité maximale',    emoji: '⚡', color: '#e05c5c' },
]

const DIFFICULTE_COLOR = {
  'faible':  '#4caf82',
  'moyenne': '#e08a3c',
  'élevée':  '#e05c5c',
}

export default function GoalReverse() {
  const navigate = useNavigate()
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()
  const themeKey = localStorage.getItem('theme') || 'dark'
  const T = themes[themeKey]

  const [objectif, setObjectif] = useState('')
  const [deadline, setDeadline] = useState(null)
  const [niveau, setNiveau] = useState('ambitieux')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [erreur, setErreur] = useState('')
  const [jalonsOuverts, setJalonsOuverts] = useState({})
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [notification, setNotification] = useState(null)
  const isMobile = window.innerWidth <= 768

  const afficherNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3500)
  }

  const decomposer = async () => {
    if (!objectif.trim()) { setErreur("Décris ton objectif."); return }
    if (!deadline) { setErreur("Choisis une deadline."); return }
    setErreur('')
    setLoading(true)
    setResult(null)
    setImported(false)
    try {
      const res = await axios.post(`${API}/ia/goal-reverse`, {
        user_id: user.id,
        objectif: objectif.trim(),
        deadline: deadline.toISOString().slice(0, 10),
        niveau,
      })
      setResult(res.data)
      // Ouvrir le premier jalon par défaut
      if (res.data.jalons?.length > 0) {
        setJalonsOuverts({ 0: true })
      }
    } catch (e) {
      setErreur("Erreur IA — réessaie dans un instant.")
    }
    setLoading(false)
  }

  const importer = async () => {
    if (!result) return
    setImporting(true)
    const toutesLesTaches = result.jalons.flatMap(j =>
      j.taches.map(t => ({
        titre: `[${j.titre}] ${t.titre}`,
        priorite: t.priorite,
        deadline: t.deadline,
      }))
    )
    try {
      const res = await axios.post(`${API}/ia/goal-reverse/importer`, {
        user_id: user.id,
        taches: toutesLesTaches,
      })
      setImported(true)
      afficherNotification(`✅ ${res.data.message}`)
    } catch {
      afficherNotification("Erreur lors de l'import", 'error')
    }
    setImporting(false)
  }

  const toggleJalon = (i) => {
    setJalonsOuverts(prev => ({ ...prev, [i]: !prev[i] }))
  }

  const totalTaches = result?.jalons?.reduce((acc, j) => acc + j.taches.length, 0) || 0
  const niveauActif = NIVEAUX.find(n => n.id === niveau)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000, background: T.bg2, border: `1px solid ${notification.type === 'error' ? '#e05c5c50' : T.border}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notification.type === 'error' ? '#e05c5c' : '#4caf82' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar minimaliste */}
      {!isMobile && (
  <aside style={{ width: 248, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Layers size={16} color={T.bg} strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>GetShift</span>
    </div>
    <motion.button onClick={() => navigate('/dashboard')}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: T.text2, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', marginBottom: 4 }}
      whileHover={{ x: 2, color: T.accent }}>
      <ChevronLeft size={16} strokeWidth={1.8} />Tableau de bord
    </motion.button>
    <motion.button
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: T.accent, background: `${T.accent}15`, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
      <Flag size={16} strokeWidth={2} />Goal Reverse
    </motion.button>
  </aside>
)}

      {/* Main */}
<main style={{ 
  marginLeft: isMobile ? 0 : 248, 
  flex: 1, 
  padding: isMobile ? '16px' : '40px',
  paddingTop: isMobile ? '70px' : '40px',
  minWidth: 0, 
  maxWidth: 900, 
  margin: isMobile ? '0 auto' : '0 auto 0 248px'
}}>
 
    {isMobile && (
  <motion.button
    onClick={() => navigate('/dashboard')}
    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 13, cursor: 'pointer', marginBottom: 20, position: 'fixed', top: 16, left: 16, zIndex: 100 }}
    whileHover={{ color: T.accent }}>
    <ChevronLeft size={16} />Dashboard
  </motion.button>
)}

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${T.accent}40` }}>
              <Flag size={20} color={T.bg} strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: '-0.5px', margin: 0 }}>Goal Reverse Engineering</h1>
              <p style={{ fontSize: 13, color: T.text2, margin: 0, marginTop: 3 }}>Définis ton objectif final, l'IA construit le chemin à rebours</p>
            </div>
          </div>
        </motion.div>

        {/* Formulaire */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28, marginBottom: 28 }}>

          {/* Objectif */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.text2, letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>TON OBJECTIF</label>
            <textarea
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              placeholder="Ex: Lancer mon SaaS GetShift avec 100 utilisateurs payants..."
              style={{ width: '100%', padding: '12px 16px', background: T.bg3, border: `1px solid ${erreur && !objectif.trim() ? '#e05c5c' : T.border}`, borderRadius: 12, color: T.text, fontSize: 14, outline: 'none', resize: 'none', minHeight: 80, boxSizing: 'border-box', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); decomposer() } }}
            />
          </div>

          {/* Deadline + Niveau */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Deadline */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.text2, letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>DEADLINE FINALE</label>
              <DatePicker
                selected={deadline}
                onChange={date => setDeadline(date)}
                locale="fr"
                dateFormat="dd/MM/yyyy"
                minDate={new Date()}
                placeholderText="📅 Choisir une date"
                customInput={
                  <input style={{ width: '100%', padding: '10px 14px', background: T.bg3, border: `1px solid ${erreur && !deadline ? '#e05c5c' : T.border}`, borderRadius: 12, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }} />
                }
              />
            </div>

            {/* Niveau */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.text2, letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>NIVEAU D'AMBITION</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {NIVEAUX.map(n => (
                  <motion.button key={n.id}
                    onClick={() => setNiveau(n.id)}
                    style={{ flex: 1, padding: '9px 4px', background: niveau === n.id ? `${n.color}20` : T.bg3, border: `1.5px solid ${niveau === n.id ? n.color : T.border}`, borderRadius: 10, color: niveau === n.id ? n.color : T.text2, fontSize: 11, fontWeight: niveau === n.id ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <span style={{ fontSize: 16 }}>{n.emoji}</span>
                    {n.label}
                  </motion.button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: T.text2, margin: '6px 0 0', textAlign: 'center' }}>{niveauActif.desc}</p>
            </div>
          </div>

          {erreur && <p style={{ fontSize: 12, color: '#e05c5c', marginBottom: 12 }}>{erreur}</p>}

          {/* Bouton */}
          <motion.button
            onClick={decomposer}
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? T.bg3 : `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, border: 'none', borderRadius: 12, color: loading ? T.text2 : T.bg, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : `0 4px 20px ${T.accent}40` }}
            whileHover={!loading ? { scale: 1.01 } : {}} whileTap={!loading ? { scale: 0.99 } : {}}>
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${T.border}`, borderTop: `2px solid ${T.accent}` }} />
                Analyse en cours...
              </>
            ) : (
              <><Sparkles size={16} /> Décomposer mon objectif</>
            )}
          </motion.button>
        </motion.div>

        {/* Résultat */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Résumé */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
                {[
                  { label: 'Semaines', val: result.duree_semaines, icon: Calendar, color: T.accent },
                  { label: 'Jalons', val: result.jalons?.length, icon: Flag, color: '#6c63ff' },
                  { label: 'Tâches', val: totalTaches, icon: CheckCircle2, color: '#4caf82' },
                  { label: 'Faisabilité', val: `${result.score_faisabilite}%`, icon: Target, color: result.score_faisabilite >= 70 ? '#4caf82' : result.score_faisabilite >= 40 ? '#e08a3c' : '#e05c5c' },
                ].map((s, i) => {
                  const Icon = s.icon
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
                      <Icon size={15} color={s.color} strokeWidth={1.8} style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{s.label}</div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Conseil global */}
              {result.conseil_global && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}25`, borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Sparkles size={16} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 13, color: T.text, margin: 0, lineHeight: 1.7 }}>{result.conseil_global}</p>
                </motion.div>
              )}

              {/* Timeline jalons */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 16 }}>PLAN D'ACTION</p>
                {result.jalons?.map((jalon, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ marginBottom: 10, position: 'relative' }}>
                    {/* Ligne verticale */}
                    {i < result.jalons.length - 1 && (
                      <div style={{ position: 'absolute', left: 19, top: 50, width: 2, height: 'calc(100% - 10px)', background: `${T.border}`, zIndex: 0 }} />
                    )}

                    {/* Header jalon */}
                    <motion.button
                      onClick={() => toggleJalon(i)}
                      style={{ width: '100%', background: T.bg2, border: `1px solid ${jalonsOuverts[i] ? T.accent + '50' : T.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', position: 'relative', zIndex: 1 }}
                      whileHover={{ borderColor: T.accent + '40' }}>
                      {/* Numéro semaine */}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: jalonsOuverts[i] ? T.accent : T.bg3, border: `2px solid ${jalonsOuverts[i] ? T.accent : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: jalonsOuverts[i] ? T.bg : T.text2 }}>S{jalon.semaine}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{jalon.titre}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: T.text2 }}>📅 {new Date(jalon.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: DIFFICULTE_COLOR[jalon.difficulte] || T.text2 }}>● {jalon.difficulte}</span>
                          <span style={{ fontSize: 11, color: T.text2 }}>{jalon.taches.length} tâche{jalon.taches.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {jalonsOuverts[i] ? <ChevronUp size={16} color={T.text2} /> : <ChevronDown size={16} color={T.text2} />}
                    </motion.button>

                    {/* Tâches du jalon */}
                    <AnimatePresence>
                      {jalonsOuverts[i] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden', paddingLeft: 50, paddingTop: 6 }}>
                          {jalon.taches.map((tache, j) => {
                            const pColor = tache.priorite === 'haute' ? '#e05c5c' : tache.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
                            return (
                              <motion.div key={j}
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.05 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 6 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{tache.titre}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                  {tache.duree_estimee && (
                                    <span style={{ fontSize: 11, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <Clock size={10} />{tache.duree_estimee}min
                                    </span>
                                  )}
                                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: `${pColor}18`, color: pColor, fontWeight: 600 }}>{tache.priorite}</span>
                                  <span style={{ fontSize: 11, color: T.text2 }}>{new Date(tache.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                </div>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Bouton import */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                {imported ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px', background: 'rgba(76,175,130,0.1)', border: '1px solid rgba(76,175,130,0.3)', borderRadius: 14, color: '#4caf82', fontWeight: 600, fontSize: 14 }}>
                    <CheckCircle2 size={18} />
                    {totalTaches} tâches importées dans GetShift !
                    <motion.button onClick={() => navigate('/dashboard')}
                      style={{ marginLeft: 12, padding: '6px 14px', background: '#4caf82', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      whileHover={{ scale: 1.03 }}>
                      Voir le dashboard <ArrowRight size={12} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button onClick={importer} disabled={importing}
                    style={{ width: '100%', padding: '14px', background: importing ? T.bg3 : T.accent, border: 'none', borderRadius: 14, color: importing ? T.text2 : T.bg, fontWeight: 700, fontSize: 14, cursor: importing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: importing ? 'none' : `0 4px 20px ${T.accent}40` }}
                    whileHover={!importing ? { scale: 1.01 } : {}} whileTap={!importing ? { scale: 0.99 } : {}}>
                    {importing ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${T.border}`, borderTop: `2px solid ${T.accent}` }} />
                      Import en cours...</>
                    ) : (
                      <><Download size={16} /> Importer {totalTaches} tâches dans GetShift</>
                    )}
                  </motion.button>
                )}
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}
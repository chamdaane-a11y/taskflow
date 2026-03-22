import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { themes } from '../themes'
import {
  ArrowLeft, Sparkles, Zap, Clock, AlertTriangle, CheckCircle,
  Coffee, Brain, Target, TrendingUp, ChevronDown, ChevronUp,
  RefreshCw, Moon, Sun, Flame, Battery, BatteryLow, BatteryMedium,
  SkipForward, Info
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'

const API = 'https://getshift-backend.onrender.com'

// ---- Composant barre de progression animée ----
function ProgressBar({ value, color, height = 6 }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color, borderRadius: 99 }}
      />
    </div>
  )
}

// ---- Composant jauge énergie ----
function EnergyGauge({ score, T }) {
  const color = score >= 70 ? '#4caf82' : score >= 40 ? '#e08a3c' : '#e05c5c'
  const label = score >= 70 ? 'Élevé' : score >= 40 ? 'Moyen' : 'Faible'
  const Icon = score >= 70 ? Battery : score >= 40 ? BatteryMedium : BatteryLow

  return (
    <div style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1 }}>SCORE D'ÉNERGIE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.5px' }}>{score}<span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>/100</span></div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 99, background: `${color}20`, color, fontSize: 12, fontWeight: 700 }}>{label}</div>
      </div>
      <ProgressBar value={score} color={color} height={8} />
      <div style={{ fontSize: 11, color: T.text2, marginTop: 8 }}>
        {score >= 70 ? '⚡ Tu es en pleine forme — parfait pour les tâches complexes !'
          : score >= 40 ? '🌤 Énergie correcte — alterne tâches légères et complexes'
          : '😴 Énergie basse — privilégie les quick wins aujourd\'hui'}
      </div>
    </div>
  )
}

// ---- Composant card tâche planning ----
function PlanningCard({ item, index, T }) {
  const [expanded, setExpanded] = useState(false)

  if (item.type === 'pause') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.06 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(108,99,255,0.06)', border: '1px dashed rgba(108,99,255,0.2)', borderRadius: 12, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Coffee size={14} color="#6c63ff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6c63ff' }}>☕ Pause recommandée</div>
          <div style={{ fontSize: 11, color: T.text2 }}>{item.heure_debut} → {item.heure_fin} · {item.duree_minutes} min</div>
        </div>
        <div style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(108,99,255,0.1)', color: '#6c63ff', fontWeight: 600 }}>Repos</div>
      </motion.div>
    )
  }

  const prioriteColor = item.priorite === 'haute' ? '#e05c5c' : item.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
  const energieColor = item.energie_requise === 'élevée' ? '#e05c5c' : item.energie_requise === 'moyenne' ? '#e08a3c' : '#4caf82'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
      {/* Barre priorité gauche */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, background: `linear-gradient(180deg, ${prioriteColor}, ${prioriteColor}80)`, flexShrink: 0, borderRadius: '14px 0 0 14px' }} />
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Numéro ordre */}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${T.accent}20`, border: `2px solid ${T.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800, color: T.accent }}>
              {item.ordre}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{item.titre}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Heure */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.accent, fontWeight: 600 }}>
                  <Clock size={11} />{item.heure_debut} → {item.heure_fin}
                </span>
                {/* Durée */}
                <span style={{ fontSize: 11, color: T.text2 }}>⏱ {item.duree_minutes} min</span>
                {/* Priorité */}
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${prioriteColor}18`, color: prioriteColor, fontWeight: 700 }}>{item.priorite}</span>
                {/* Énergie requise */}
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${energieColor}12`, color: energieColor, fontWeight: 600 }}>
                  ⚡ {item.energie_requise}
                </span>
              </div>
            </div>
            {/* Bouton expand */}
            <motion.button
              style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 4, flexShrink: 0 }}
              onClick={() => setExpanded(!expanded)}
              whileHover={{ color: T.accent }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </motion.button>
          </div>

          {/* Détails expandés */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                {item.raison_placement && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Info size={13} color={T.text2} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.5 }}>
                      <strong style={{ color: T.text }}>Pourquoi maintenant :</strong> {item.raison_placement}
                    </p>
                  </div>
                )}
                {item.tips && (
                  <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: `${T.accent}10`, borderRadius: 8, border: `1px solid ${T.accent}20` }}>
                    <Sparkles size={13} color={T.accent} style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.5 }}>
                      {item.tips}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Composant alerte procrastination ----
function AlerteProcrastination({ alerte, T }) {
  const color = alerte.niveau === 'critique' ? '#e05c5c' : '#e08a3c'
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 10, marginBottom: 6 }}>
      <AlertTriangle size={14} color={color} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alerte.titre}</div>
        <div style={{ fontSize: 11, color: T.text2 }}>
          Inactif depuis {alerte.jours_sans_action}j
          {alerte.jours_avant_deadline >= 0 && ` · Deadline dans ${alerte.jours_avant_deadline}j`}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${color}18`, color, flexShrink: 0 }}>
        {alerte.score_procrastination}%
      </div>
    </motion.div>
  )
}

// ======= COMPOSANT PRINCIPAL =======
export default function TomorrowBuilder() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const user = JSON.parse(localStorage.getItem('user'))
  const theme = localStorage.getItem('theme') || 'dark'
  const T = themes[theme]

  const [loading, setLoading] = useState(false)
  const [planning, setPlanning] = useState(null)
  const [savedPlan, setSavedPlan] = useState(null)
  const [procrastination, setProcrastination] = useState([])
  const [activeTab, setActiveTab] = useState('planning')
  const [showTachesReportees, setShowTachesReportees] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [derniereGen, setDerniereGen] = useState(null)

  const demain = new Date()
  demain.setDate(demain.getDate() + 1)
  const demainStr = demain.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerSavedPlan()
    chargerProcrastination()
  }, [])

  const chargerSavedPlan = async () => {
    try {
      const res = await axios.get(`${API}/ia/tomorrow-builder/${user.id}/saved`)
      if (res.data.planning) {
        setSavedPlan(res.data)
        setPlanning(res.data.planning)
        setDerniereGen(res.data.cree_le)
      }
    } catch {}
  }

  const chargerProcrastination = async () => {
    try {
      const res = await axios.get(`${API}/ia/procrastination/${user.id}`)
      setProcrastination(res.data.alertes || [])
    } catch {}
  }

  const genererPlanning = async () => {
    setLoading(true)
    setErreur(null)
    try {
      const res = await axios.get(`${API}/ia/tomorrow-builder/${user.id}`)
      setPlanning(res.data)
      setSavedPlan({ planning: res.data, date_planifiee: demain.toISOString().split('T')[0] })
      setDerniereGen(new Date().toISOString())
    } catch (err) {
      setErreur(err?.response?.data?.erreur || 'Erreur lors de la génération')
    }
    setLoading(false)
  }

  const tachesPlanning = planning?.planning?.filter(p => p.type === 'tache') || []
  const pausesPlanning = planning?.planning?.filter(p => p.type === 'pause') || []

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: T.bg2, borderBottom: `1px solid ${T.border}`, padding: isMobile ? '14px 16px' : '16px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <motion.button
          style={{ width: 36, height: 36, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => navigate('/dashboard')} whileHover={{ borderColor: T.accent, color: T.accent }}>
          <ArrowLeft size={16} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color={T.bg} />
            </div>
            <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: T.text, margin: 0 }}>Tomorrow Builder</h1>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${T.accent}20`, color: T.accent, fontWeight: 700 }}>IA</span>
          </div>
          <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 2 }}>Planning IA pour {demainStr}</p>
        </div>
        {derniereGen && (
          <div style={{ fontSize: 10, color: T.text2, textAlign: 'right', display: isMobile ? 'none' : 'block' }}>
            Généré le {new Date(derniereGen).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <motion.button
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', background: loading ? T.bg3 : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: 'none', borderRadius: 12, color: loading ? T.text2 : T.bg, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13 }}
          onClick={genererPlanning} disabled={loading}
          whileHover={!loading ? { scale: 1.03 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}>
          {loading
            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}><RefreshCw size={14} /></motion.span> Génération...</>
            : <><Sparkles size={14} /> {planning ? 'Régénérer' : 'Générer mon planning'}</>}
        </motion.button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 32px' }}>

        {/* ERREUR */}
        <AnimatePresence>
          {erreur && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={16} color="#e05c5c" />
              <span style={{ fontSize: 13, color: '#e05c5c' }}>{erreur}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ÉTAT VIDE */}
        {!planning && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: `${T.accent}15`, border: `2px solid ${T.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Sparkles size={36} color={T.accent} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 10 }}>Ton planning IA t'attend</h2>
            <p style={{ fontSize: 14, color: T.text2, maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.6 }}>
              L'IA analyse tes tâches, ta productivité et tes patterns pour construire le planning optimal pour demain.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
              {[['🎯','Ordre optimal','Tâches prioritaires au bon moment'],['⚡','Score d\'énergie','Adapté à ton niveau du jour'],['🧠','Conseils IA','Tips personnalisés pour chaque tâche'],['☕','Anti-burnout','Pauses intelligentes intégrées']].map(([ico, titre, desc]) => (
                <div key={titre} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px', width: 160, textAlign: 'left' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{ico}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{titre}</div>
                  <div style={{ fontSize: 11, color: T.text2, lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>
            <motion.button
              style={{ padding: '14px 36px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: 'none', borderRadius: 14, color: T.bg, fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 10 }}
              onClick={genererPlanning} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Sparkles size={18} /> Générer mon planning pour demain
            </motion.button>
          </motion.div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, margin: '0 auto 24px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 8 }}>L'IA analyse tes tâches...</h3>
            <p style={{ fontSize: 13, color: T.text2 }}>Calcul du score d'énergie, détection des patterns, optimisation du planning</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {['Analyse des priorités', 'Détection heure productive', 'Optimisation planning', 'Calcul anti-burnout'].map((step, i) => (
                <motion.div key={step}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 99, background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}30` }}>
                  ✓ {step}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* PLANNING GÉNÉRÉ */}
        {planning && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* ALERTE BURNOUT */}
            <AnimatePresence>
              {planning.alerte_burnout && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(224,92,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={18} color="#e05c5c" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e05c5c', marginBottom: 2 }}>⚠️ Risque de surcharge détecté</div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{planning.message_alerte}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RÉSUMÉ GLOBAL */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `linear-gradient(135deg, ${T.accent}12, ${T.accent2}08)`, border: `1px solid ${T.accent}25`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={20} color={T.accent} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1, marginBottom: 4 }}>ANALYSE IA</div>
                  <p style={{ fontSize: 14, color: T.text, margin: 0, lineHeight: 1.6 }}>{planning.resume_global}</p>
                  {planning.conseil_journee && (
                    <p style={{ fontSize: 13, color: T.text2, margin: 0, marginTop: 8, fontStyle: 'italic' }}>💡 {planning.conseil_journee}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* STATS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Tâches planifiées', val: tachesPlanning.length, icon: Target, color: T.accent },
                { label: 'Pauses intégrées', val: pausesPlanning.length, icon: Coffee, color: '#6c63ff' },
                { label: 'Durée totale', val: `${Math.round((planning.duree_totale_planifiee || 0) / 60)}h${(planning.duree_totale_planifiee || 0) % 60}m`, icon: Clock, color: '#4caf82' },
                { label: 'Score énergie', val: `${planning.score_energie}/100`, icon: Zap, color: planning.score_energie >= 70 ? '#4caf82' : planning.score_energie >= 40 ? '#e08a3c' : '#e05c5c' },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon size={15} color={s.color} />
                      <span style={{ fontSize: 10, color: T.text2, fontWeight: 600 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px' }}>{s.val}</div>
                  </motion.div>
                )
              })}
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: T.bg2, padding: 6, borderRadius: 12, border: `1px solid ${T.border}`, width: 'fit-content' }}>
              {[['planning', 'Planning', Sparkles], ['energie', 'Énergie', Zap], ['procrastination', `Alertes ${procrastination.length > 0 ? `(${procrastination.length})` : ''}`, AlertTriangle]].map(([val, label, Icon]) => (
                <motion.button key={val}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: activeTab === val ? T.accent : 'transparent', border: 'none', borderRadius: 8, color: activeTab === val ? T.bg : T.text2, fontSize: 13, fontWeight: activeTab === val ? 700 : 400, cursor: 'pointer' }}
                  onClick={() => setActiveTab(val)} whileHover={{ color: activeTab === val ? T.bg : T.accent }}>
                  <Icon size={13} />{label}
                </motion.button>
              ))}
            </div>

            {/* TAB PLANNING */}
            {activeTab === 'planning' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
                      📅 Planning de {demainStr}
                    </h3>
                    <span style={{ fontSize: 11, color: T.text2 }}>{planning.planning?.length} créneaux</span>
                  </div>
                  {planning.planning?.map((item, i) => (
                    <PlanningCard key={i} item={item} index={i} T={T} />
                  ))}

                  {/* Tâches reportées */}
                  {planning.taches_reportees?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <motion.button
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text2, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                        onClick={() => setShowTachesReportees(!showTachesReportees)}
                        whileHover={{ borderColor: T.accent }}>
                        <SkipForward size={14} />
                        <span>{planning.taches_reportees.length} tâche{planning.taches_reportees.length > 1 ? 's' : ''} reportée{planning.taches_reportees.length > 1 ? 's' : ''} à plus tard</span>
                        {showTachesReportees ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
                      </motion.button>
                      <AnimatePresence>
                        {showTachesReportees && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            style={{ background: T.bg2, border: `1px solid ${T.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '8px 14px', overflow: 'hidden' }}>
                            {planning.taches_reportees.map((t, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < planning.taches_reportees.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                                <SkipForward size={12} color={T.text2} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: T.text }}>{t.titre}</span>
                                <span style={{ fontSize: 11, color: T.text2, fontStyle: 'italic' }}>{t.raison}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* SIDEBAR droite */}
                <div>
                  <EnergyGauge score={planning.score_energie || 60} T={T} />

                  {/* Heure productive */}
                  <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, padding: '16px 20px', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${T.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {planning.heure_productive < 12 ? <Sun size={16} color={T.accent} /> : <Moon size={16} color={T.accent} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, letterSpacing: 0.8 }}>HEURE DE POINTE</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{planning.heure_productive}h00 <span style={{ fontSize: 12, color: T.text2, fontWeight: 400 }}>détectée</span></div>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: T.text2, margin: 0, lineHeight: 1.5 }}>
                      Tes tâches les plus complexes sont planifiées autour de cette heure.
                    </p>
                  </div>

                  {/* Tip du jour */}
                  {planning.conseil_journee && (
                    <div style={{ background: `${T.accent}08`, border: `1px solid ${T.accent}20`, borderRadius: 16, padding: '14px 16px', marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 0.8, marginBottom: 6 }}>💡 CONSEIL IA</div>
                      <p style={{ fontSize: 12, color: T.text, margin: 0, lineHeight: 1.6 }}>{planning.conseil_journee}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB ÉNERGIE */}
            {activeTab === 'energie' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EnergyGauge score={planning.score_energie || 60} T={T} />
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginTop: 16 }}>
                  {[
                    { titre: '🌅 Matin (6h-12h)', desc: 'Idéal pour les tâches complexes et créatives. Ton cerveau est au maximum.', color: '#e08a3c' },
                    { titre: '🌞 Après-midi (12h-18h)', desc: 'Parfait pour les réunions, emails et tâches collaboratives.', color: T.accent },
                    { titre: '🌆 Soir (18h-21h)', desc: 'Réservé aux quick wins et à la planification du lendemain.', color: '#6c63ff' },
                    { titre: '😴 Nuit (21h+)', desc: 'Évite le travail. Ton cerveau consolide les apprentissages.', color: '#4caf82' },
                  ].map(c => (
                    <div key={c.titre} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c.color, marginBottom: 6 }}>{c.titre}</div>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.5 }}>{c.desc}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginTop: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>🔥 Règles anti-burnout intégrées</h4>
                  {[
                    'Maximum 6h de travail effectif planifié par jour',
                    'Pause de 15 min obligatoire après chaque 90 min de travail',
                    '20% du temps libre gardé pour l\'imprévu',
                    'Maximum 3 tâches haute priorité par jour',
                    'Aucune tâche complexe planifiée en fin de journée si énergie < 40',
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 4 ? `1px solid ${T.border}` : 'none' }}>
                      <CheckCircle size={13} color="#4caf82" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: T.text }}>{r}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB PROCRASTINATION */}
            {activeTab === 'procrastination' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {procrastination.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <CheckCircle size={40} color="#4caf82" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Aucune procrastination détectée 🎉</h3>
                    <p style={{ fontSize: 13, color: T.text2 }}>Tu gères tes tâches efficacement. Continue comme ça !</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 12, marginBottom: 16 }}>
                      <AlertTriangle size={16} color="#e05c5c" />
                      <span style={{ fontSize: 13, color: '#e05c5c', fontWeight: 600 }}>{procrastination.length} tâche{procrastination.length > 1 ? 's' : ''} en procrastination détectée{procrastination.length > 1 ? 's' : ''}</span>
                    </div>
                    {procrastination.map((a, i) => <AlerteProcrastination key={i} alerte={a} T={T} />)}
                    <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginTop: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>💡 Conseils pour sortir de la procrastination</h4>
                      {[
                        'Découpe la tâche en sous-tâches de 15 min maximum',
                        'Utilise la règle des 2 minutes : si ça prend moins de 2 min, fais-le maintenant',
                        'Place la tâche difficile en première position demain matin',
                        'Demande à l\'IA de décomposer la tâche pour toi',
                      ].map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < 3 ? `1px solid ${T.border}` : 'none' }}>
                          <span style={{ fontSize: 13, color: T.accent, flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 12, color: T.text }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// CommandBar.jsx — src/pages/CommandBar.jsx
// Barre de commande ⌘K GetShift
// Self-contained — tous imports ici
// Usage dans Dashboard.jsx :
//   import CommandBar from './CommandBar'
//   <CommandBar T={T} userId={d.user?.id} onTacheCreee={d.chargerTaches} />
//   + dans useEffect : écoute Ctrl+K / ⌘K

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Zap, Calendar, Flag, Sparkles,
  CheckCircle2, ArrowRight, Clock, AlertTriangle, X
} from 'lucide-react'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'

// ─── Parsing langage naturel ──────────────────────────────────────────────────
// "Préparer démo vendredi 15h haute" → { titre, priorite, deadline }

const JOURS_SEMAINE = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4,
  vendredi: 5, samedi: 6, dimanche: 0,
}

const MOIS = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
}

function parseCommande(texte) {
  const t = texte.toLowerCase().trim()
  let titre = texte.trim()
  let priorite = 'moyenne'
  let deadline = null

  // ── Priorité ────────────────────────────────────────────────────
  if (/\b(urgent|urgente|haute|important|critique|!)\b/.test(t)) {
    priorite = 'haute'
    titre = titre.replace(/\b(urgent|urgente|haute|important|critique|!)\b/gi, '').trim()
  } else if (/\bbasse?\b/.test(t)) {
    priorite = 'basse'
    titre = titre.replace(/\bbasse?\b/gi, '').trim()
  }

  const now = new Date()

  // ── Aujourd'hui ─────────────────────────────────────────────────
  if (/\baujourd'?hui\b/.test(t)) {
    deadline = new Date(now)
    deadline.setHours(18, 0, 0, 0)
    titre = titre.replace(/\baujourd'?hui\b/gi, '').trim()
  }

  // ── Demain ──────────────────────────────────────────────────────
  else if (/\bdemain\b/.test(t)) {
    deadline = new Date(now)
    deadline.setDate(deadline.getDate() + 1)
    deadline.setHours(9, 0, 0, 0)
    titre = titre.replace(/\bdemain\b/gi, '').trim()
  }

  // ── Dans N jours ────────────────────────────────────────────────
  else {
    const dansMatch = t.match(/\bdans\s+(\d+)\s+jours?\b/)
    if (dansMatch) {
      deadline = new Date(now)
      deadline.setDate(deadline.getDate() + parseInt(dansMatch[1]))
      deadline.setHours(9, 0, 0, 0)
      titre = titre.replace(/\bdans\s+\d+\s+jours?\b/gi, '').trim()
    }
  }

  // ── Jour de la semaine : "vendredi", "lundi prochain" ───────────
  if (!deadline) {
    for (const [nom, jourCible] of Object.entries(JOURS_SEMAINE)) {
      const reg = new RegExp(`\\b${nom}\\s*(prochain)?\\b`)
      if (reg.test(t)) {
        const d = new Date(now)
        const jourActuel = d.getDay()
        let diff = jourCible - jourActuel
        if (diff <= 0) diff += 7
        d.setDate(d.getDate() + diff)
        d.setHours(9, 0, 0, 0)
        deadline = d
        titre = titre.replace(reg, '').trim()
        break
      }
    }
  }

  // ── Date explicite : "15 avril", "3 mai" ────────────────────────
  if (!deadline) {
    const dateMatch = t.match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/)
    if (dateMatch) {
      deadline = new Date(now.getFullYear(), MOIS[dateMatch[2]], parseInt(dateMatch[1]), 9, 0, 0)
      if (deadline < now) deadline.setFullYear(deadline.getFullYear() + 1)
      titre = titre.replace(new RegExp(dateMatch[0], 'i'), '').trim()
    }
  }

  // ── Heure : "15h", "à 14h30", "9h" ─────────────────────────────
  const heureMatch = t.match(/\bà?\s*(\d{1,2})h(\d{2})?\b/)
  if (heureMatch && deadline) {
    deadline.setHours(parseInt(heureMatch[1]), parseInt(heureMatch[2] || '0'), 0, 0)
    titre = titre.replace(new RegExp(heureMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim()
  }

  // Nettoyage du titre
  titre = titre.replace(/\s+/g, ' ').replace(/^[-,\s]+|[-,\s]+$/g, '').trim()
  if (!titre) titre = texte.trim()

  return { titre, priorite, deadline }
}

// ─── Suggestions rapides ─────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'Tâche haute priorité pour demain', exemple: 'Finir le rapport demain haute' },
  { label: 'Tâche pour vendredi', exemple: 'Réunion client vendredi 10h' },
  { label: 'Tâche urgente aujourd\'hui', exemple: 'Corriger le bug urgent aujourd\'hui' },
]

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CommandBar({ T, userId, onTacheCreee }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const inputRef = useRef(null)

  // ── Écoute ⌘K / Ctrl+K ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Focus auto ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setParsed(null)
      setSucces(false)
      setErreur('')
    }
  }, [open])

  // ── Parse en temps réel ─────────────────────────────────────────
  useEffect(() => {
    if (query.length > 2) {
      setParsed(parseCommande(query))
    } else {
      setParsed(null)
    }
  }, [query])

  // ── Créer la tâche ───────────────────────────────────────────────
  const creer = useCallback(async (texteOverride) => {
    const texte = texteOverride || query
    if (!texte.trim()) return

    const { titre, priorite, deadline } = parseCommande(texte)
    if (!titre) return

    setLoading(true)
    setErreur('')
    try {
      await axios.post(`${API}/taches`, {
        titre,
        priorite,
        deadline: deadline ? deadline.toISOString().slice(0, 16) : null,
        user_id: userId,
      })
      setSucces(true)
      onTacheCreee?.()
      setTimeout(() => {
        setOpen(false)
        setSucces(false)
        setQuery('')
      }, 900)
    } catch {
      setErreur('Erreur lors de la création')
    }
    setLoading(false)
  }, [query, userId, onTacheCreee])

  // ── Couleur priorité ─────────────────────────────────────────────
  const pColor = (p) => p === 'haute' ? '#e05c5c' : p === 'moyenne' ? '#e08a3c' : '#4caf82'
  const pBg = (p) => p === 'haute' ? 'rgba(224,92,92,0.12)' : p === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)'

  return (
    <>
      {/* Bouton flottant ⌘K — affiché quand la bar est fermée */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed',
              bottom: 88,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 470,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 99,
              color: T.text2,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)',
            }}
            whileHover={{ borderColor: T.accent, color: T.accent, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Zap size={13} strokeWidth={2} />
            Ajouter une tâche
            <span style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 6px', borderRadius: 5,
              background: T.bg3, border: `1px solid ${T.border}`,
              color: T.text2, letterSpacing: '0.02em',
            }}>
              ⌘K
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay + CommandBar */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 2000,
                backdropFilter: 'blur(6px)',
              }}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              style={{
                position: 'fixed',
                top: '18vh',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(620px, 92vw)',
                zIndex: 2001,
                background: T.bg2,
                border: `1.5px solid ${T.border}`,
                borderRadius: 18,
                boxShadow: `0 24px 60px rgba(0,0,0,0.35), 0 0 0 1px ${T.border}`,
                overflow: 'hidden',
              }}
            >
              {/* Input principal */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderBottom: query.length > 2 ? `1px solid ${T.border}` : 'none',
              }}>
                <Search size={18} color={T.text2} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !loading) creer()
                    if (e.key === 'Escape') setOpen(false)
                  }}
                  placeholder="Préparer la démo vendredi 15h haute..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 16,
                    fontWeight: 400,
                    color: T.text,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                {query && (
                  <motion.button
                    onClick={() => setQuery('')}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, display: 'flex' }}>
                    <X size={15} strokeWidth={1.8} />
                  </motion.button>
                )}
                <kbd style={{
                  fontSize: 10, color: T.text2,
                  padding: '3px 7px', borderRadius: 6,
                  background: T.bg3, border: `1px solid ${T.border}`,
                  fontFamily: 'monospace', flexShrink: 0,
                }}>
                  ESC
                </kbd>
              </div>

              {/* Preview parsing */}
              <AnimatePresence>
                {parsed && query.length > 2 && !succes && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}>

                    {/* Carte preview */}
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
                        Aperçu
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: 10, padding: '12px 14px',
                        background: T.bg3,
                        border: `1.5px solid ${T.accent}30`,
                        borderRadius: 12,
                      }}>
                        {/* Checkbox déco */}
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: `2px solid ${pColor(parsed.priorite)}`,
                          flexShrink: 0,
                        }} />

                        {/* Titre */}
                        <span style={{
                          flex: 1, fontSize: 13.5, fontWeight: 500,
                          color: T.text, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {parsed.titre}
                        </span>

                        {/* Priorité */}
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 99,
                          background: pBg(parsed.priorite),
                          color: pColor(parsed.priorite),
                          flexShrink: 0,
                        }}>
                          {parsed.priorite}
                        </span>

                        {/* Deadline */}
                        {parsed.deadline ? (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, color: T.accent,
                            fontWeight: 500, flexShrink: 0,
                          }}>
                            <Calendar size={11} strokeWidth={2} />
                            {parsed.deadline.toLocaleDateString('fr-FR', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                            {' '}
                            {parsed.deadline.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: T.text2, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} strokeWidth={1.8} />
                            Sans deadline
                          </span>
                        )}
                      </div>

                      {erreur && (
                        <p style={{ fontSize: 11, color: '#e05c5c', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <AlertTriangle size={11} /> {erreur}
                        </p>
                      )}
                    </div>

                    {/* Bouton créer */}
                    <div style={{ padding: '12px 20px' }}>
                      <motion.button
                        onClick={() => creer()}
                        disabled={loading || !parsed.titre}
                        style={{
                          width: '100%',
                          padding: '11px',
                          background: succes ? '#22c55e' : T.accent,
                          border: 'none',
                          borderRadius: 11,
                          color: T.bg,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                        whileHover={!loading ? { scale: 1.01 } : {}}
                        whileTap={{ scale: 0.98 }}>
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                              style={{ display: 'inline-block' }}>
                              <Zap size={14} strokeWidth={2} />
                            </motion.div>
                            Création...
                          </>
                        ) : succes ? (
                          <>
                            <CheckCircle2 size={14} strokeWidth={2.5} />
                            Tâche créée !
                          </>
                        ) : (
                          <>
                            <Plus size={14} strokeWidth={2.5} />
                            Créer la tâche
                            <kbd style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: `${T.bg}40`, border: `1px solid ${T.bg}30`, fontFamily: 'monospace' }}>
                              ↵
                            </kbd>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Succès animation */}
              <AnimatePresence>
                {succes && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                    <motion.div
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.4 }}>
                      <CheckCircle2 size={36} color="#22c55e" strokeWidth={1.8} />
                    </motion.div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Tâche créée avec succès</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggestions quand input vide */}
              {!query && !succes && (
                <div style={{ padding: '8px 12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, padding: '6px 8px', textTransform: 'uppercase' }}>
                    Exemples
                  </div>
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setQuery(s.exemple)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 9,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      whileHover={{ background: `${T.accent}10` }}>
                      <ArrowRight size={13} color={T.text2} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, color: T.text, display: 'block' }}>{s.label}</span>
                        <span style={{ fontSize: 11, color: T.text2, fontStyle: 'italic' }}>"{s.exemple}"</span>
                      </div>
                    </motion.button>
                  ))}

                  {/* Tip raccourci */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginTop: 10, padding: '8px 10px',
                    background: `${T.accent}08`,
                    borderRadius: 9,
                    fontSize: 11, color: T.text2,
                  }}>
                    <Sparkles size={12} color={T.accent} strokeWidth={2} />
                    Le parser détecte automatiquement la priorité, le jour et l'heure.
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

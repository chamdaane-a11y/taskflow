// ══════════════════════════════════════════════════════════════════════
// CoachFloat.jsx — bulle flottante coach (Alex/Max/Nova) + mini chat
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { Send, X, Smile, Zap as ZapIcon, Brain, Sparkles, MessageCircle } from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

const COACHES = {
  alex: { label: 'Alex', tagline: 'Bienveillant',  Icon: Smile,    grad: ['#10b981', '#059669'] },
  max:  { label: 'Max',  tagline: 'Énergique',     Icon: ZapIcon,  grad: ['#f59e0b', '#d97706'] },
  nova: { label: 'Nova', tagline: 'Analytique',    Icon: Brain,    grad: ['#6366f1', '#4f46e5'] },
}

const greetingFor = (style, ctx) => {
  const { nowH, chargeMin, overdue, unplanned, capaciteMin } = ctx
  const h = (chargeMin / 60).toFixed(1)
  const pct = capaciteMin > 0 ? Math.round(chargeMin / capaciteMin * 100) : 0

  // Alex — bienveillant
  if (style === 'alex') {
    if (overdue >= 2) return `Hey ${overdue} tâches en retard — pas de panique, on les replanifie ensemble ?`
    if (chargeMin === 0 && nowH < 19) return nowH < 12 ? "Bonjour ! Prêt(e) à structurer ta journée ? Je peux t'aider." : "Tu n'as encore rien planifié — veux-tu qu'on s'y mette ?"
    if (pct > 120) return `${h}h prévues, c'est beaucoup. Pense à reporter le moins urgent.`
    if (pct >= 50) return `Bon rythme aujourd'hui (${pct}%). Une pause de 5min toutes les 90min ?`
    if (nowH >= 19) return "La journée s'achève — bravo. On prépare demain ?"
    return `${unplanned > 0 ? `${unplanned} tâches en attente. ` : ''}Comment je peux t'aider ?`
  }
  // Max — énergique
  if (style === 'max') {
    if (overdue >= 2) return `${overdue} retards ?! Allez, on attaque, je te trouve des créneaux.`
    if (chargeMin === 0) return "Aucun plan ? Let's go ! Je t'organise ça maintenant."
    if (pct > 120) return `${h}h ?! T'es une machine. Mais respire entre chaque sprint.`
    if (pct >= 50) return `${pct}% de capacité — tu déchires ! Continue.`
    if (nowH >= 19) return "Fin de journée — fais le bilan, prépare demain à fond."
    return "Prêt à exploser tes objectifs ? Dis-moi par où on commence."
  }
  // Nova — analytique
  if (overdue >= 2) return `Donnée : ${overdue} tâches en retard. Recommandation : replanification immédiate.`
  if (chargeMin === 0) return `Charge actuelle : 0h. ${unplanned} tâches non planifiées détectées.`
  if (pct > 120) return `Charge ${h}h vs capacité ${(capaciteMin/60).toFixed(0)}h → surcharge ${pct}%. Risque de burnout.`
  if (pct >= 50) return `Allocation optimale : ${pct}% de la capacité utilisée.`
  if (nowH >= 19) return `Fenêtre de planification J+1 ouverte. Données prêtes.`
  return `Système prêt. ${unplanned} tâches en file. Quel angle d'analyse ?`
}

export const CoachFloat = memo(function CoachFloat({
  T, isMobile, userId, planification, taches, heuresDispo
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState(() => {
    try { return localStorage.getItem('coach_style') || 'alex' } catch { return 'alex' }
  })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [hasNotif, setHasNotif] = useState(true)
  const scrollRef = useRef(null)

  const ctx = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayPlan = planification.filter(p =>
      (p.date_planifiee?.split('T')[0] || p.date_planifiee) === today
    )
    const chargeMin = todayPlan.reduce((s, p) => s + ((p.endMins || 0) - (p.startMins || 0)), 0)
    const open = taches.filter(t => !t.terminee)
    const planifiedIds = new Set(planification.map(p => p.tache_id))
    const unplanned = open.filter(t => !planifiedIds.has(t.id)).length
    const overdue = open.filter(t => t.deadline && t.deadline.split('T')[0] < today).length
    return {
      nowH: new Date().getHours(),
      chargeMin,
      capaciteMin: heuresDispo * 60,
      overdue,
      unplanned,
    }
  }, [planification, taches, heuresDispo])

  // Greeting on first open of the day
  useEffect(() => {
    if (!open) return
    const today = new Date().toISOString().split('T')[0]
    const greetedKey = `coach_greeted_${style}_${today}`
    let greeted = false
    try { greeted = localStorage.getItem(greetedKey) === '1' } catch {}
    if (greeted && messages.length > 0) return
    const greeting = greetingFor(style, ctx)
    setMessages(m => m.length === 0 ? [{ role: 'assistant', content: greeting }] : m)
    try { localStorage.setItem(greetedKey, '1') } catch {}
    setHasNotif(false)
  }, [open, style]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const send = async () => {
    const txt = input.trim()
    if (!txt || sending) return
    setMessages(m => [...m, { role: 'user', content: txt }])
    setInput('')
    setSending(true)
    try {
      const res = await axios.post(`${API}/ia/coach/chat`, {
        user_id: userId,
        style_coach: style,
        message: txt,
      })
      const reply = res.data?.reponse || res.data?.message || "Désolé, j'ai eu un souci."
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Connexion difficile — réessaie dans un instant." }])
    } finally {
      setSending(false)
    }
  }

  const switchCoach = (newStyle) => {
    setStyle(newStyle)
    try { localStorage.setItem('coach_style', newStyle) } catch {}
    setMessages([])
  }

  const coach = COACHES[style] || COACHES.alex
  const Icon = coach.Icon
  const [c1, c2] = coach.grad

  // Position : éviter le bottom nav mobile
  const bottomOffset = isMobile ? 80 : 24
  const rightOffset = isMobile ? 14 : 24

  return (
    <>
      {/* ── BUBBLE ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            onClick={() => setOpen(true)}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.94 }}
            style={{
              position: 'fixed',
              bottom: bottomOffset,
              right: rightOffset,
              width: isMobile ? 52 : 58,
              height: isMobile ? 52 : 58,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 24px ${c1}55, 0 0 0 4px ${T.bg}`,
              zIndex: 130,
            }}
            title={`${coach.label} — ${coach.tagline}`}
          >
            <Icon size={isMobile ? 22 : 26} color="#fff" strokeWidth={2.4} />

            {/* Pulse halo */}
            <motion.span
              animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `${c1}40`,
                pointerEvents: 'none',
              }}
            />

            {/* Notif dot */}
            {hasNotif && (
              <span style={{
                position: 'absolute',
                top: 4, right: 4,
                width: 12, height: 12,
                borderRadius: '50%',
                background: '#ef4444',
                border: `2px solid ${T.bg}`,
              }} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── PANEL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            style={{
              position: 'fixed',
              bottom: bottomOffset,
              right: rightOffset,
              width: isMobile ? `calc(100vw - ${rightOffset * 2}px)` : 360,
              maxWidth: 420,
              height: isMobile ? 'min(70vh, 480px)' : 480,
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${c1}20`,
              zIndex: 130,
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              background: `linear-gradient(135deg, ${c1}25, ${c2}10)`,
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 38, height: 38,
                borderRadius: 11,
                background: `linear-gradient(135deg, ${c1}, ${c2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${c1}40`,
              }}>
                <Icon size={18} color="#fff" strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '-0.2px' }}>
                  {coach.label}
                </div>
                <div style={{ fontSize: 10, color: T.text2, fontWeight: 600 }}>
                  Coach · {coach.tagline}
                </div>
              </div>

              {/* Switch coach */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.entries(COACHES).map(([k, c]) => {
                  const I = c.Icon
                  const active = k === style
                  return (
                    <motion.button
                      key={k}
                      onClick={() => switchCoach(k)}
                      whileTap={{ scale: 0.9 }}
                      title={c.label}
                      style={{
                        width: 26, height: 26,
                        borderRadius: 7,
                        background: active ? `linear-gradient(135deg, ${c.grad[0]}, ${c.grad[1]})` : 'transparent',
                        border: active ? 'none' : `1px solid ${T.border}`,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.18s',
                      }}>
                      <I size={12} color={active ? '#fff' : T.text2} strokeWidth={2.2} />
                    </motion.button>
                  )
                })}
              </div>

              <motion.button
                onClick={() => setOpen(false)}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: 'transparent',
                  border: 'none',
                  color: T.text2,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <X size={14} />
              </motion.button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '9px 12px',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.role === 'user'
                      ? `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`
                      : T.bg3 || T.bg,
                    color: m.role === 'user' ? '#fff' : T.text,
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    border: m.role === 'user' ? 'none' : `1px solid ${T.border}`,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                  {m.content}
                </motion.div>
              ))}
              {sending && (
                <div style={{
                  alignSelf: 'flex-start',
                  display: 'flex', gap: 4,
                  padding: '10px 14px',
                  background: T.bg3 || T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: '14px 14px 14px 4px',
                }}>
                  {[0, 1, 2].map(i => (
                    <motion.span key={i}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      style={{ width: 5, height: 5, borderRadius: '50%', background: T.text2 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: 10,
              borderTop: `1px solid ${T.border}`,
              display: 'flex',
              gap: 6,
              background: T.bg2,
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                placeholder={`Écris à ${coach.label}…`}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text,
                  fontSize: 12.5,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <motion.button
                onClick={send}
                disabled={sending || !input.trim()}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                style={{
                  width: 40, height: 40,
                  borderRadius: 10,
                  background: input.trim() && !sending
                    ? `linear-gradient(135deg, ${c1}, ${c2})`
                    : T.bg3,
                  border: 'none',
                  color: '#fff',
                  cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: input.trim() && !sending ? `0 4px 12px ${c1}35` : 'none',
                  transition: 'all 0.18s',
                }}>
                <Send size={14} strokeWidth={2.4} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})

// ══════════════════════════════════════════════════════════════════════
// PlanificationInsights.jsx
//   • FocusBar      — barre du créneau actif (countdown + terminer)
//   • InsightCard   — carte contextuelle proactive (IA propose)
// ══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, CheckCircle2, Clock, Flame,
  Sparkles, AlertTriangle, Brain, X, Sun, Coffee
} from 'lucide-react'
import { minsToTime } from './calendarUtils'

// ──────────────────────────────────────────────────────────────────────
// DailyScore — anneau jour + bandes 7 derniers jours (streak visuel)
// ──────────────────────────────────────────────────────────────────────
export const DailyScore = memo(function DailyScore({
  T, isMobile, planification, taches, heuresDispo
}) {
  const data = useMemo(() => {
    const capaciteMin = heuresDispo * 60
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const planMin = planification
        .filter(p => (p.date_planifiee?.split('T')[0] || p.date_planifiee) === dateStr)
        .reduce((s, p) => s + ((p.endMins || 0) - (p.startMins || 0)), 0)
      const doneMin = planification
        .filter(p => {
          const date = p.date_planifiee?.split('T')[0] || p.date_planifiee
          if (date !== dateStr) return false
          const t = taches.find(t => t.id === p.tache_id)
          return t && t.terminee
        })
        .reduce((s, p) => s + ((p.endMins || 0) - (p.startMins || 0)), 0)
      const pct = capaciteMin > 0 ? Math.min(120, (planMin / capaciteMin) * 100) : 0
      const donePct = capaciteMin > 0 ? Math.min(100, (doneMin / capaciteMin) * 100) : 0
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }),
        pct,
        donePct,
        isToday: i === 0,
      })
    }
    const today = days[6]
    return { days, today, capaciteMin }
  }, [planification, taches, heuresDispo])

  const { today, capaciteMin } = data
  const planMin = today.pct * capaciteMin / 100
  const heures = (planMin / 60).toFixed(1)
  const pct = Math.round(today.pct)

  const ringColor =
    pct === 0     ? 'var(--text-secondary)' :
    pct > 110     ? '#ef4444' :
    pct >= 80     ? '#10b981' :
    pct >= 40     ? 'var(--ember)' :
                    '#f59e0b'

  const SIZE = isMobile ? 56 : 64
  const STROKE = isMobile ? 5 : 6
  const RADIUS = (SIZE - STROKE) / 2
  const CIRCUM = 2 * Math.PI * RADIUS
  const offset = CIRCUM * (1 - Math.min(100, pct) / 100)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? 10 : 14,
      padding: isMobile ? '8px 12px' : '10px 14px',
      background: 'var(--surface-1)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      flexShrink: 0,
    }}>
      {/* Anneau */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={SIZE/2} cy={SIZE/2} r={RADIUS}
            stroke={'var(--border-subtle)'} strokeWidth={STROKE} fill="none"
          />
          <motion.circle
            cx={SIZE/2} cy={SIZE/2} r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUM}
            initial={{ strokeDashoffset: CIRCUM }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}>
          <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Texte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Aujourd'hui
        </div>
        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          {heures}h <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>/ {heuresDispo}h</span>
        </div>
        {/* Bandes 7 derniers jours */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16, marginTop: 2 }}>
          {data.days.map((d, i) => {
            const h = Math.max(2, (d.pct / 100) * 16)
            const color = d.pct === 0 ? 'var(--border-subtle)' :
                          d.pct > 110 ? '#ef4444' :
                          d.pct >= 80 ? '#10b981' :
                          d.pct >= 40 ? 'var(--ember)' : '#f59e0b'
            return (
              <motion.div
                key={d.date}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: h, opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                title={`${d.label} · ${Math.round(d.pct)}%`}
                style={{
                  width: 4,
                  background: color,
                  borderRadius: 1,
                  border: d.isToday ? `1px solid var(--text-primary)` : 'none',
                  boxShadow: d.isToday ? `0 0 4px ${color}80` : 'none',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
})

// ──────────────────────────────────────────────────────────────────────
// FocusBar — créneau en cours (sticky top, glow accent)
// ──────────────────────────────────────────────────────────────────────
export const FocusBar = memo(function FocusBar({
  planification, taches, T, isMobile, onComplete
}) {
  const [tick, setTick] = useState(0)

  // Re-render toutes les 30s pour update countdown
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Détecte le créneau actif : tâche statut en_cours OU créneau qui contient l'heure courante
  const active = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const nowMins = now.getHours() * 60 + now.getMinutes()

    const todayEntries = planification
      .filter(p => (p.date_planifiee?.split('T')[0] || p.date_planifiee) === today)
      .map(p => {
        const tache = taches.find(t => t.id === p.tache_id)
        return { ...p, tache }
      })
      .filter(p => p.tache && !p.tache.terminee)

    // Priorité 1 : tâche dont le statut est en_cours ET le créneau contient l'heure courante
    const inProgressNow = todayEntries.find(p =>
      p.tache.statut === 'en_cours' &&
      nowMins >= (p.startMins || 0) &&
      nowMins <= (p.endMins || 0)
    )
    if (inProgressNow) return inProgressNow

    // Priorité 2 : créneau qui contient l'heure courante (même si statut pas encore en_cours)
    const slotNow = todayEntries.find(p =>
      nowMins >= (p.startMins || 0) &&
      nowMins <= (p.endMins || 0)
    )
    if (slotNow) return slotNow

    // Priorité 3 : prochaine tâche en cours (statut en_cours mais hors créneau)
    const inProgressAny = todayEntries.find(p => p.tache.statut === 'en_cours')
    return inProgressAny || null
  }, [planification, taches, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const start = active.startMins || 0
  const end = active.endMins || (start + 60)
  const duration = end - start
  const elapsed = Math.max(0, Math.min(duration, nowMins - start))
  const remaining = Math.max(0, end - nowMins)
  const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0
  const isOverdue = nowMins > end
  const isUpcoming = nowMins < start

  const statusColor = isOverdue ? '#ef4444' : isUpcoming ? 'var(--text-secondary)' : 'var(--ember)'
  const statusBg    = isOverdue ? '#ef444415' : isUpcoming ? `var(--text-secondary)10` : 'var(--ember-soft)'

  const statusLabel = isOverdue
    ? `Dépassé de ${nowMins - end}min`
    : isUpcoming
      ? `Démarre dans ${start - nowMins}min`
      : remaining >= 60
        ? `${Math.floor(remaining / 60)}h${String(remaining % 60).padStart(2,'0')} restantes`
        : `${remaining}min restantes`

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      style={{
        background: `linear-gradient(135deg, var(--ember-soft), var(--ember-hover)10)`,
        border: `1px solid var(--ember-soft)`,
        borderRadius: 14,
        padding: isMobile ? '10px 12px' : '12px 16px',
        marginBottom: isMobile ? 10 : 12,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 6px 24px var(--ember-soft)`,
      }}>

      {/* Glow pulse on accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, var(--ember), var(--ember-hover))`,
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 10 : 14,
        flexWrap: 'nowrap',
      }}>
        {/* Icône pulse */}
        <motion.div
          animate={isUpcoming ? {} : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: isMobile ? 36 : 42, height: isMobile ? 36 : 42,
            borderRadius: 11,
            background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 14px var(--ember-soft)`,
          }}>
          <Flame size={isMobile ? 16 : 19} color="#fff" strokeWidth={2.4} />
        </motion.div>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 3,
          }}>
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              color: statusColor,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 99,
              background: statusBg,
              whiteSpace: 'nowrap',
            }}>
              {isOverdue ? 'En retard' : isUpcoming ? 'À venir' : 'En cours'}
            </span>
            <span style={{
              fontSize: 10,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              opacity: 0.7,
            }}>
              {minsToTime(start).slice(0,5)} → {minsToTime(end).slice(0,5)}
            </span>
          </div>

          <div style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 800,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.2px',
            marginBottom: 6,
          }}>
            {active.titre || active.tache?.titre}
          </div>

          {/* Progress bar */}
          <div style={{
            height: 4,
            background: `var(--border-default)`,
            borderRadius: 99,
            overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: isOverdue
                  ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                  : `linear-gradient(90deg, var(--ember), var(--ember-hover))`,
                borderRadius: 99,
              }}
            />
          </div>

          <div style={{
            fontSize: 10,
            color: 'var(--text-secondary)',
            marginTop: 4,
            fontWeight: 600,
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Bouton terminer */}
        <motion.button
          onClick={() => onComplete?.(active.tache?.id || active.tache_id)}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.94 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 4 : 6,
            padding: isMobile ? '8px 10px' : '10px 14px',
            background: `linear-gradient(135deg, #10b981, #059669)`,
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontSize: isMobile ? 11 : 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 14px #10b98140',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
          <CheckCircle2 size={isMobile ? 13 : 14} strokeWidth={2.4} />
          {isMobile ? '+XP' : 'Terminer +15 XP'}
        </motion.button>
      </div>
    </motion.div>
  )
})

// ──────────────────────────────────────────────────────────────────────
// InsightCard — message IA contextuel adaptatif
// ──────────────────────────────────────────────────────────────────────
const insightKey = () => `planification_insight_dismiss_${new Date().toISOString().split('T')[0]}`

export const InsightCard = memo(function InsightCard({
  taches, planification, T, isMobile, heuresDispo, onPlanIA, loadingIA
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(insightKey()) === '1' }
    catch { return false }
  })

  // Logique adaptive : choisir le message le plus pertinent (priorité décroissante)
  const insight = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const nowH = now.getHours()
    const todayPlan = planification.filter(p =>
      (p.date_planifiee?.split('T')[0] || p.date_planifiee) === today
    )
    const chargeToday = todayPlan.reduce(
      (s, p) => s + ((p.endMins || 0) - (p.startMins || 0)),
      0
    )
    const capaciteMin = heuresDispo * 60
    const open = taches.filter(t => !t.terminee)
    const planifiedIds = new Set(planification.map(p => p.tache_id))
    const unplanned = open.filter(t => !planifiedIds.has(t.id))
    const overdue = open.filter(t => {
      if (!t.deadline) return false
      return t.deadline.split('T')[0] < today
    })

    // P1 — Tâches en retard
    if (overdue.length >= 2) {
      return {
        type: 'overdue',
        Icon: AlertTriangle,
        color: '#ef4444',
        title: `${overdue.length} tâches en retard`,
        msg: `Tu peux les replanifier maintenant — l'IA trouvera des créneaux libres.`,
        cta: 'Replanifier',
        action: onPlanIA,
      }
    }

    // P2 — Surcharge sur aujourd'hui
    if (chargeToday > capaciteMin * 1.2) {
      const heures = Math.round(chargeToday / 60 * 10) / 10
      return {
        type: 'overload',
        Icon: AlertTriangle,
        color: '#f59e0b',
        title: `Journée chargée (${heures}h)`,
        msg: `Tu dépasses ta capacité (${heuresDispo}h). Pense à reporter les tâches basses prio.`,
        cta: null,
      }
    }

    // P3 — Rien planifié aujourd'hui ET il est < 19h
    if (chargeToday === 0 && nowH < 19 && unplanned.length > 0) {
      return {
        type: 'empty',
        Icon: Sun,
        color: 'var(--ember)',
        title: nowH < 12 ? 'Bonjour, prêt à structurer ta journée ?' : 'Tu n\'as rien planifié aujourd\'hui',
        msg: `${unplanned.length} tâche${unplanned.length > 1 ? 's' : ''} en attente. L'IA peut te proposer un planning intelligent.`,
        cta: 'Proposer un planning',
        action: onPlanIA,
      }
    }

    // P4 — Tâches non planifiées (>3) mais journée déjà commencée
    if (unplanned.length >= 4) {
      return {
        type: 'unplanned',
        Icon: Brain,
        color: 'var(--ember)',
        title: `${unplanned.length} tâches non planifiées`,
        msg: `L'IA peut les répartir dans tes créneaux libres cette semaine.`,
        cta: 'Planifier',
        action: onPlanIA,
      }
    }

    // P5 — Tout va bien — feedback positif (pas de CTA)
    if (chargeToday > 0) {
      const heures = Math.round(chargeToday / 60 * 10) / 10
      const pct = Math.round((chargeToday / capaciteMin) * 100)
      return {
        type: 'good',
        Icon: Sparkles,
        color: '#10b981',
        title: `${heures}h planifiées aujourd'hui · ${pct}% de capacité`,
        msg: pct >= 80
          ? 'Journée bien remplie — prends une pause toutes les 90min.'
          : pct >= 50
            ? 'Bon rythme. Reste concentré sur tes priorités haute.'
            : 'Tu as encore de la marge pour ajouter ou approfondir.',
        cta: null,
      }
    }

    // Soir — propose Tomorrow Builder en filigrane
    if (nowH >= 19 && chargeToday === 0) {
      return {
        type: 'tomorrow',
        Icon: Coffee,
        color: 'var(--ember)',
        title: 'La journée s\'achève',
        msg: `Prépare demain avec un planning intelligent.`,
        cta: 'Planifier demain',
        action: onPlanIA,
      }
    }

    return null
  }, [taches, planification, heuresDispo, onPlanIA, 'var(--ember)'])

  if (!insight || dismissed) return null

  const { Icon, color, title, msg, cta, action } = insight

  const handleDismiss = () => {
    try { localStorage.setItem(insightKey(), '1') } catch {}
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        style={{
          background: `linear-gradient(135deg, ${color}12, ${color}06)`,
          border: `1px solid ${color}30`,
          borderRadius: 14,
          padding: isMobile ? '12px 14px' : '14px 18px',
          marginBottom: isMobile ? 10 : 12,
          position: 'relative',
          overflow: 'hidden',
        }}>

        {/* Accent strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color}, ${color}40)`,
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 10 : 14,
        }}>
          {/* Icône */}
          <div style={{
            width: isMobile ? 34 : 40, height: isMobile ? 34 : 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${color}25, ${color}12)`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={isMobile ? 15 : 18} color={color} strokeWidth={2.2} />
          </div>

          {/* Texte */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? 12.5 : 13.5,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.2px',
              marginBottom: 2,
              lineHeight: 1.3,
            }}>
              {title}
            </div>
            <div style={{
              fontSize: isMobile ? 11 : 11.5,
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}>
              {msg}
            </div>
          </div>

          {/* CTA */}
          {cta && action && (
            <motion.button
              onClick={action}
              disabled={loadingIA}
              whileHover={!loadingIA ? { scale: 1.04, y: -1 } : {}}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: isMobile ? '8px 11px' : '10px 14px',
                background: loadingIA ? 'var(--surface-2)' : `linear-gradient(135deg, ${color}, ${color}cc)`,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: isMobile ? 11 : 12,
                fontWeight: 800,
                cursor: loadingIA ? 'not-allowed' : 'pointer',
                boxShadow: !loadingIA ? `0 4px 14px ${color}40` : 'none',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>
              <Sparkles size={isMobile ? 12 : 13} />
              {loadingIA ? '...' : cta}
            </motion.button>
          )}

          {/* Dismiss */}
          <motion.button
            onClick={handleDismiss}
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            title="Masquer pour aujourd'hui"
            style={{
              width: 24, height: 24,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.5,
              flexShrink: 0,
            }}>
            <X size={12} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
})

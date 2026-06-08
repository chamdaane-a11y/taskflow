import { memo } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight } from 'lucide-react'
import {
  BADGE_ICONS, TIER_STYLES, BADGE_CATEGORIES,
  getProchainBadge,
} from '../data/badges'

// Map id → (current, target) pour les badges à progression linéaire calculable côté frontend.
// Les badges complexes (ai_coach, mentor, etc.) tombent en fallback "description seule".
function getProgression(badgeId, { points, streak, nbTerminees }) {
  const map = {
    'streak_3':   [streak, 3],
    'streak_7':   [streak, 7],
    'streak_14':  [streak, 14],
    'streak_21':  [streak, 21],
    'streak_30':  [streak, 30],
    'streak_100': [streak, 100],
    'first_task':         [nbTerminees, 1],
    'five_tasks':         [nbTerminees, 5],
    'ten_tasks':          [nbTerminees, 10],
    'twenty_five_tasks':  [nbTerminees, 25],
    'fifty_tasks':         [nbTerminees, 50],
    'century':            [nbTerminees, 100],
    'pts_500':    [points, 500],
    'pts_2000':   [points, 2000],
    'pts_10000':  [points, 10000],
  }
  return map[badgeId] || null
}

function getRestantLabel(badgeId, current, target) {
  const restant = Math.max(0, target - current)
  if (badgeId.startsWith('streak_')) return `${restant} jour${restant > 1 ? 's' : ''} restant${restant > 1 ? 's' : ''}`
  if (badgeId.startsWith('pts_'))    return `${restant} pts restants`
  // Maîtrise : nb tâches
  return `${restant} tâche${restant > 1 ? 's' : ''} restante${restant > 1 ? 's' : ''}`
}

export const ProchainBadgePill = memo(function ProchainBadgePill({ d, isMobile, onClick, minPct = 30 }) {
  const points = d.points || 0
  const streak = d.streak || 0
  const nbTerminees = d.statsTaches?.terminees || 0
  const badgesObtenus = d.badgesObtenus || []

  const prochain = getProchainBadge(badgesObtenus)
  if (!prochain) return null

  const tier = TIER_STYLES[prochain.tier] || TIER_STYLES.common
  const Icon = BADGE_ICONS[prochain.id]
  const prog = getProgression(prochain.id, { points, streak, nbTerminees })
  if (!prog) return null

  const pct = Math.min(100, Math.round(prog[0] / prog[1] * 100))
  if (pct <= minPct) return null

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: tier.color }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: isMobile ? '8px 12px' : '9px 14px',
        background: tier.bg,
        border: `1px solid ${tier.border}`,
        borderRadius: 99,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'var(--font-ui)',
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-1)', border: `1px solid ${tier.border}`,
      }}>
        {Icon && <Icon size={14} color={tier.color} strokeWidth={2.2} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: tier.color, letterSpacing: 0.3, marginBottom: 3 }}>
          Prochain badge · {pct}%
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {prochain.nom}
        </div>
        <div style={{ height: 3, background: `${tier.color}18`, borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: tier.color, borderRadius: 99 }} />
        </div>
      </div>
      <ArrowRight size={14} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
    </motion.button>
  )
})

const ProchainBadgeBanner = memo(function ProchainBadgeBanner({ d, T, isMobile }) {
  // Données nécessaires
  const points = d.points || 0
  const streak = d.streak || 0
  const nbTerminees = d.statsTaches?.terminees || 0
  const badgesObtenus = d.badgesObtenus || []

  // Tous les badges obtenus → pas de bannière
  const prochain = getProchainBadge(badgesObtenus)
  if (!prochain) return null

  const tier = TIER_STYLES[prochain.tier] || TIER_STYLES.common
  const Icon = BADGE_ICONS[prochain.id]
  const cat = BADGE_CATEGORIES[prochain.categorie]
  const prog = getProgression(prochain.id, { points, streak, nbTerminees })
  const pct = prog ? Math.min(100, Math.round(prog[0] / prog[1] * 100)) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16,
        padding: isMobile ? '12px 14px' : '14px 18px',
        background: `linear-gradient(90deg, ${tier.bg}, var(--surface-1) 80%)`,
        border: `1px solid ${tier.border}`,
        borderRadius: 16, marginBottom: 16,
        position: 'relative', overflow: 'hidden'
      }}>
      {/* Glow subtil top-right */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 120, height: 120,
        background: `radial-gradient(circle, ${tier.glow}, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      {/* Icône badge avec lock overlay */}
      <div style={{
        width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: tier.bg, border: `1px solid ${tier.border}`,
        position: 'relative', zIndex: 1
      }}>
        {Icon && <Icon size={isMobile ? 20 : 22} color={tier.color} strokeWidth={2} />}
        <Lock size={9} color="var(--bg-base)" strokeWidth={3} style={{
          position: 'absolute', bottom: -3, right: -3,
          background: tier.color, borderRadius: '50%', padding: 3
        }} />
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: tier.color, letterSpacing: 1, textTransform: 'uppercase' }}>
            Prochain badge · {tier.label}
          </span>
          {cat && (
            <span style={{ fontSize: 9, fontWeight: 600, color: cat.color, opacity: 0.85 }}>
              · {cat.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
            {prochain.nom}
          </div>
          {prog && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {prog[0]}/{prog[1]} · {getRestantLabel(prochain.id, prog[0], prog[1])}
            </div>
          )}
        </div>
        {!prog && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{prochain.description}</div>
        )}
        {prog && (
          <div style={{ height: 4, background: `${tier.color}15`, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${tier.color}, ${tier.color}cc)`, borderRadius: 99 }} />
          </div>
        )}
      </div>

      {/* Flèche → Settings */}
      {!isMobile && (
        <ArrowRight size={16} color="var(--text-secondary)"
          style={{ flexShrink: 0, opacity: 0.6, position: 'relative', zIndex: 1 }} />
      )}
    </motion.div>
  )
})

export default ProchainBadgeBanner

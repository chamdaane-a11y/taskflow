/** Badges J-X (convention FR : J-7 = 7 jours avant, J+2 = 2 jours de retard) */

export function formatJXLabel(jours) {
  if (jours == null) return null
  const j = Number(jours)
  if (j < 0) return `J+${Math.abs(j)}`
  return `J-${j}`
}

export function getJXMeta(jours, t) {
  if (jours == null) {
    return {
      label: '—',
      caption: t('goal.jx_no_deadline'),
      color: 'var(--text-tertiary)',
      bg: 'var(--surface-2)',
      border: 'var(--border-subtle)',
      glow: 'transparent',
    }
  }
  const j = Number(jours)
  const abs = Math.abs(j)
  if (j < 0) {
    return {
      label: `J+${abs}`,
      caption: abs > 1 ? t('goal.jx_late_plural', { n: abs }) : t('goal.jx_late', { n: abs }),
      color: '#fff',
      bg: '#e05c5c',
      border: 'rgba(224,92,92,0.45)',
      glow: 'rgba(224,92,92,0.2)',
    }
  }
  if (j === 0) {
    return {
      label: 'J-0',
      caption: t('goal.jx_today'),
      color: 'var(--text-on-ember)',
      bg: 'var(--ember)',
      border: 'var(--ember-ring)',
      glow: 'var(--ember-soft)',
    }
  }
  if (j <= 3) {
    return {
      label: `J-${j}`,
      caption: j === 1 ? t('goal.jx_tomorrow') : t('goal.jx_days_left', { n: j }),
      color: '#fff',
      bg: '#e08a3c',
      border: 'rgba(224,138,60,0.4)',
      glow: 'rgba(224,138,60,0.15)',
    }
  }
  if (j <= 14) {
    return {
      label: `J-${j}`,
      caption: t('goal.jx_days_left', { n: j }),
      color: 'var(--ember)',
      bg: 'var(--ember-soft)',
      border: 'var(--ember-ring)',
      glow: 'var(--ember-soft)',
    }
  }
  return {
    label: `J-${j}`,
    caption: t('goal.jx_days_left', { n: j }),
    color: '#4caf82',
    bg: 'rgba(76,175,130,0.12)',
    border: 'rgba(76,175,130,0.28)',
    glow: 'rgba(76,175,130,0.12)',
  }
}

export function jxBadgeStyle(jours) {
  if (jours == null) return { bg: 'var(--surface-2)', color: 'var(--text-tertiary)', border: 'var(--border-subtle)' }
  const j = Number(jours)
  if (j < 0) return { bg: '#e05c5c', color: '#fff', border: 'rgba(224,92,92,0.4)' }
  if (j === 0) return { bg: 'var(--ember)', color: 'var(--text-on-ember)', border: 'var(--ember-ring)' }
  if (j <= 3) return { bg: '#e08a3c', color: '#fff', border: 'rgba(224,138,60,0.35)' }
  if (j <= 14) return { bg: 'var(--ember-soft)', color: 'var(--ember)', border: 'var(--ember-ring)' }
  return { bg: 'rgba(76,175,130,0.12)', color: '#4caf82', border: 'rgba(76,175,130,0.25)' }
}

export function progressColor(pct) {
  if (pct >= 70) return '#4caf82'
  if (pct >= 30) return '#e08a3c'
  return 'var(--ember)'
}

export function rappelLabel(jours, t) {
  const j = Number(jours)
  if (j < 0) return t('dashboard.jx_late', { n: Math.abs(j) })
  if (j === 0) return t('dashboard.jx_today')
  if (j === 1) return t('dashboard.jx_tomorrow')
  return t('dashboard.jx_in_days', { n: j })
}

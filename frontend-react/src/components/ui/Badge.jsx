/**
 * Badge — pill compact pour statuts, labels, tags
 *
 * variants : 'ember' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 * sizes    : 'sm' | 'md'
 * dot      : affiche un petit point coloré avant le label
 */

const VARIANTS = {
  ember: {
    background: 'var(--ember-soft)',
    color: 'var(--ember)',
    border: '1px solid var(--ember-ring)',
  },
  success: {
    background: 'var(--success-soft)',
    color: 'var(--success)',
    border: '1px solid transparent',
  },
  warning: {
    background: 'var(--warning-soft)',
    color: 'var(--warning)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--danger-soft)',
    color: 'var(--danger)',
    border: '1px solid transparent',
  },
  info: {
    background: 'var(--info-soft)',
    color: 'var(--info)',
    border: '1px solid transparent',
  },
  neutral: {
    background: 'var(--surface-2)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
  },
}

export default function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon: Icon,
  children,
  style: extraStyle,
}) {
  const v = VARIANTS[variant] || VARIANTS.neutral

  const sizes = {
    sm: { fontSize: 10, padding: '2px 7px', height: 20, gap: 4, iconSize: 10 },
    md: { fontSize: 11, padding: '3px 9px', height: 22, gap: 5, iconSize: 12 },
  }
  const s = sizes[size] || sizes.md

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      fontSize: s.fontSize,
      fontFamily: 'var(--font-ui)',
      fontWeight: 500,
      letterSpacing: '0.3px',
      borderRadius: 'var(--radius-full)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      lineHeight: 1,
      ...v,
      ...extraStyle,
    }}>
      {dot && (
        <span style={{
          width: size === 'sm' ? 4 : 5,
          height: size === 'sm' ? 4 : 5,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }} />
      )}
      {Icon && <Icon size={s.iconSize} strokeWidth={2} style={{ flexShrink: 0 }} />}
      {children}
    </span>
  )
}

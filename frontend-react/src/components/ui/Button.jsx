import { forwardRef } from 'react'
import { motion } from 'framer-motion'

/**
 * Button — primitive atomique GetShift
 *
 * variants : 'primary' | 'secondary' | 'ghost' | 'danger'
 * sizes    : 'sm' | 'md' | 'lg'
 * Branché sur les CSS tokens (var(--ember), var(--surface-*), etc.)
 */

const VARIANTS = {
  primary: {
    base: {
      background: 'var(--ember)',
      color: 'var(--text-on-ember)',
      border: 'none',
      boxShadow: '0 1px 0 rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.12)',
    },
    hover: { filter: 'brightness(1.08)' },
    active: { scale: 0.98, filter: 'brightness(0.96)' },
  },
  secondary: {
    base: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
      boxShadow: 'none',
    },
    hover: { background: 'var(--surface-2)' },
    active: { scale: 0.98 },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: 'none',
      boxShadow: 'none',
    },
    hover: { background: 'var(--surface-2)', color: 'var(--text-primary)' },
    active: { scale: 0.97 },
  },
  danger: {
    base: {
      background: 'var(--danger-soft)',
      color: 'var(--danger)',
      border: '1px solid var(--danger)',
      boxShadow: 'none',
    },
    hover: { filter: 'brightness(1.06)' },
    active: { scale: 0.98 },
  },
}

const SIZES = {
  sm: { padding: '7px 12px', fontSize: 12, height: 32, borderRadius: 'var(--radius-base)', gap: 6, iconSize: 14 },
  md: { padding: '10px 18px', fontSize: 14, height: 40, borderRadius: 'var(--radius-base)', gap: 8, iconSize: 16 },
  lg: { padding: '13px 24px', fontSize: 15, height: 48, borderRadius: 'var(--radius-md)', gap: 10, iconSize: 18 },
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    children,
    icon: Icon,
    iconRight: IconRight,
    disabled = false,
    loading = false,
    fullWidth = false,
    onClick,
    type = 'button',
    style: extraStyle,
    className,
    title,
    ...rest
  },
  ref
) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    fontFamily: 'var(--font-ui)',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    borderRadius: s.borderRadius,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.48 : 1,
    transition: `filter var(--dur-fast, 150ms) var(--ease-out-quart, ease),
                 background var(--dur-fast, 150ms) var(--ease-out-quart, ease),
                 color var(--dur-fast, 150ms) var(--ease-out-quart, ease),
                 border-color var(--dur-fast, 150ms) var(--ease-out-quart, ease),
                 box-shadow var(--dur-fast, 150ms) var(--ease-out-quart, ease)`,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    width: fullWidth ? '100%' : undefined,
    touchAction: 'manipulation',
    outline: 'none',
    textDecoration: 'none',
    ...v.base,
    ...extraStyle,
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={className}
      style={baseStyle}
      whileHover={!disabled && !loading ? v.hover : {}}
      whileTap={!disabled && !loading ? { ...v.active, transition: { duration: 0.06 } } : {}}
      transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
      {...rest}
    >
      {loading ? (
        <motion.span
          style={{
            width: s.iconSize, height: s.iconSize,
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            display: 'inline-block',
            flexShrink: 0,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
        />
      ) : Icon ? (
        <Icon size={s.iconSize} strokeWidth={2} style={{ flexShrink: 0 }} />
      ) : null}
      {children && <span>{children}</span>}
      {!loading && IconRight && (
        <IconRight size={s.iconSize} strokeWidth={2} style={{ flexShrink: 0 }} />
      )}
    </motion.button>
  )
})

export default Button

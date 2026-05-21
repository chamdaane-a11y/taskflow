import { forwardRef } from 'react'
import { motion } from 'framer-motion'

/**
 * Card — surface premium avec shadow tokens GetShift
 *
 * variants : 'default' | 'elevated' | 'flat' | 'ember'
 * interactive : ajoute hover translateY(-1px) + shadow-md
 */

const VARIANTS = {
  default: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-xs)',
  },
  elevated: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-sm)',
  },
  flat: {
    background: 'var(--surface-2)',
    border: '1px solid transparent',
    boxShadow: 'none',
  },
  ember: {
    background: 'var(--ember-soft)',
    border: '1px solid var(--ember-ring)',
    boxShadow: 'none',
  },
}

const RADII = {
  sm: 'var(--radius-sm)',
  base: 'var(--radius-base)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
}

const Card = forwardRef(function Card(
  {
    variant = 'default',
    radius = 'md',
    padding,
    interactive = false,
    onClick,
    children,
    style: extraStyle,
    className,
    ...rest
  },
  ref
) {
  const v = VARIANTS[variant] || VARIANTS.default
  const r = RADII[radius] || RADII.md

  const baseStyle = {
    borderRadius: r,
    padding: padding ?? 'var(--space-card-p)',
    transition: `box-shadow var(--dur-fast, 150ms) var(--ease-out-quart, ease),
                 transform var(--dur-fast, 150ms) var(--ease-out-quart, ease),
                 border-color var(--dur-fast, 150ms) var(--ease-out-quart, ease)`,
    cursor: interactive || onClick ? 'pointer' : undefined,
    ...v,
    ...extraStyle,
  }

  if (!interactive && !onClick) {
    return (
      <div ref={ref} className={className} style={baseStyle} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={baseStyle}
      onClick={onClick}
      whileHover={{
        y: -1,
        boxShadow: 'var(--shadow-md)',
        borderColor: 'var(--border-default)',
      }}
      whileTap={{ y: 0, scale: 0.995 }}
      transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  )
})

export default Card

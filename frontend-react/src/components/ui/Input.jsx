import { forwardRef, useState } from 'react'

/**
 * Input — champ texte avec focus ring Ember, branché sur les tokens
 *
 * Supporte : prefix icon, suffix icon, état error, hint text, label
 */

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    icon: Icon,
    iconRight: IconRight,
    onIconRightClick,
    placeholder,
    value,
    onChange,
    onKeyDown,
    type = 'text',
    disabled = false,
    size = 'md',
    style: extraStyle,
    inputStyle,
    className,
    rows,
    multiline = false,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false)

  const sizes = {
    sm: { height: 32, fontSize: 13, padding: '0 10px', paddingLeft: Icon ? 30 : 10, paddingRight: IconRight ? 30 : 10 },
    md: { height: 40, fontSize: 14, padding: '0 14px', paddingLeft: Icon ? 36 : 14, paddingRight: IconRight ? 36 : 14 },
    lg: { height: 48, fontSize: 15, padding: '0 16px', paddingLeft: Icon ? 42 : 16, paddingRight: IconRight ? 42 : 16 },
  }
  const s = sizes[size] || sizes.md

  const wrapStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    ...extraStyle,
  }

  const fieldWrapStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: multiline ? 'flex-start' : 'center',
  }

  const iconPosTop = multiline ? 12 : '50%'
  const iconTransform = multiline ? 'none' : 'translateY(-50%)'

  const fieldStyle = {
    width: '100%',
    height: multiline ? undefined : s.height,
    minHeight: multiline ? (rows ? undefined : 80) : undefined,
    padding: multiline
      ? `10px ${IconRight ? 36 : 12}px 10px ${Icon ? 36 : 12}px`
      : `0 ${s.paddingRight}px 0 ${s.paddingLeft}px`,
    fontSize: s.fontSize,
    fontFamily: 'var(--font-ui)',
    fontWeight: 400,
    lineHeight: 1.55,
    background: 'var(--surface-1)',
    color: 'var(--text-primary)',
    border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--ember)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-base)',
    outline: 'none',
    boxShadow: focused
      ? error
        ? '0 0 0 3px var(--danger-soft)'
        : '0 0 0 3px var(--ember-ring)'
      : 'none',
    transition: `border-color var(--dur-instant, 80ms) var(--ease-precise, ease),
                 box-shadow var(--dur-instant, 80ms) var(--ease-precise, ease)`,
    caretColor: 'var(--ember)',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : undefined,
    resize: multiline ? 'vertical' : undefined,
    rows: multiline && rows ? rows : undefined,
    ...inputStyle,
  }

  const iconStyle = (side) => ({
    position: 'absolute',
    top: iconPosTop,
    transform: iconTransform,
    [side]: side === 'left' ? (size === 'sm' ? 8 : 12) : (size === 'sm' ? 8 : 12),
    color: error ? 'var(--danger)' : focused ? 'var(--ember)' : 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: side === 'right' && onIconRightClick ? 'auto' : 'none',
    cursor: side === 'right' && onIconRightClick ? 'pointer' : undefined,
    transition: `color var(--dur-instant, 80ms)`,
    zIndex: 1,
  })

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16

  const Field = multiline ? 'textarea' : 'input'

  return (
    <div style={wrapStyle} className={className}>
      {label && (
        <label style={{
          fontSize: 12,
          fontWeight: 500,
          color: error ? 'var(--danger)' : 'var(--text-secondary)',
          letterSpacing: '0.01em',
          userSelect: 'none',
        }}>
          {label}
        </label>
      )}
      <div style={fieldWrapStyle}>
        {Icon && (
          <span style={iconStyle('left')}>
            <Icon size={iconSize} strokeWidth={2} />
          </span>
        )}
        <Field
          ref={ref}
          type={multiline ? undefined : type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          style={fieldStyle}
          rows={multiline ? (rows || 3) : undefined}
          {...rest}
        />
        {IconRight && (
          <span style={iconStyle('right')} onClick={onIconRightClick}>
            <IconRight size={iconSize} strokeWidth={2} />
          </span>
        )}
      </div>
      {(hint || error) && (
        <span style={{
          fontSize: 11,
          color: error ? 'var(--danger)' : 'var(--text-tertiary)',
          lineHeight: 1.4,
        }}>
          {error || hint}
        </span>
      )}
    </div>
  )
})

export default Input

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

/**
 * Toast — notification non-bloquante premium
 *
 * variants : 'success' | 'warning' | 'danger' | 'info' | 'ember' (défaut neutre)
 * duration : ms avant auto-close (0 = permanent)
 *
 * Usage standalone :
 *   <Toast message="Tâche créée" variant="success" onClose={() => …} />
 *
 * Usage via useToast (voir useToast.js) pour les toasts dynamiques.
 */

const VARIANTS = {
  success: { color: 'var(--success)', Icon: CheckCircle, soft: 'var(--success-soft)' },
  warning: { color: 'var(--warning)', Icon: AlertTriangle, soft: 'var(--warning-soft)' },
  danger: { color: 'var(--danger)', Icon: XCircle, soft: 'var(--danger-soft)' },
  info: { color: 'var(--info)', Icon: Info, soft: 'var(--info-soft)' },
  ember: { color: 'var(--ember)', Icon: Info, soft: 'var(--ember-soft)' },
}

export function Toast({ message, variant = 'info', onClose, duration = 4000, description }) {
  const v = VARIANTS[variant] || VARIANTS.info

  useEffect(() => {
    if (!duration || !onClose) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 12,
        padding: '12px 16px 12px 14px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderLeft: `3px solid ${v.color}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: 420,
        width: '100%',
        pointerEvents: 'auto',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span style={{ color: v.color, display: 'flex', flexShrink: 0, marginTop: description ? 1 : 0 }}>
        <v.Icon size={16} strokeWidth={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: description ? 'normal' : 'nowrap',
        }}>
          {message}
        </p>
        {description && (
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {description}
          </p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            padding: 2,
            flexShrink: 0,
            borderRadius: 4,
            marginTop: description ? 0 : 0,
          }}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </motion.div>
  )
}

/**
 * ToastContainer — zone fixe top-center qui affiche une liste de toasts
 * Utiliser avec useToast() pour la gestion d'état.
 */
export function ToastContainer({ toasts = [], onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 'max(24px, env(safe-area-inset-top))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 'min(420px, calc(100vw - 32px))',
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="sync">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            description={t.description}
            variant={t.variant}
            duration={t.duration}
            onClose={() => onClose(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

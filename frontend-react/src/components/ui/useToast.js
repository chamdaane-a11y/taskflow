import { useState, useCallback } from 'react'

let _id = 0

/**
 * useToast — état local pour gérer les toasts dynamiques
 *
 * Usage :
 *   const { toasts, toast, dismiss } = useToast()
 *   toast.success('Tâche créée !')
 *   toast.show({ message: 'Hello', variant: 'ember', duration: 5000 })
 *
 *   <ToastContainer toasts={toasts} onClose={dismiss} />
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback(({ message, description, variant = 'info', duration = 4000 }) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, message, description, variant, duration }])
    return id
  }, [])

  const toast = {
    show,
    success: (message, opts) => show({ message, variant: 'success', ...opts }),
    warning: (message, opts) => show({ message, variant: 'warning', ...opts }),
    danger: (message, opts) => show({ message, variant: 'danger', ...opts }),
    info: (message, opts) => show({ message, variant: 'info', ...opts }),
    ember: (message, opts) => show({ message, variant: 'ember', ...opts }),
  }

  return { toasts, toast, dismiss }
}

/** Ouvre un flux OAuth popup et écoute postMessage (sans lire popup.closed — bloqué par COOP Google). */
export function openOAuthPopup(url, { onSuccess, onFail, onClose, timeoutMs = 5 * 60 * 1000 } = {}) {
  const popup = window.open(url, 'oauth_popup', 'width=540,height=680,menubar=no,toolbar=no')
  if (!popup) {
    onClose?.({ reason: 'popup_blocked' })
    return () => {}
  }

  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    window.removeEventListener('message', listener)
    window.removeEventListener('focus', onFocus)
    clearTimeout(timer)
    try { popup.close() } catch {}
  }

  const listener = (e) => {
    if (e.data?.type === 'oauth_success') {
      cleanup()
      onSuccess?.(e.data)
    } else if (e.data?.type === 'oauth_error') {
      cleanup()
      onFail?.(e.data)
    }
  }

  // Quand l'utilisateur ferme la popup, le focus revient ici (sans lire popup.closed).
  const onFocus = () => {
    setTimeout(() => {
      if (!done) {
        cleanup()
        onClose?.({ reason: 'dismissed' })
      }
    }, 400)
  }

  window.addEventListener('message', listener)
  window.addEventListener('focus', onFocus)
  const timer = setTimeout(() => {
    cleanup()
    onClose?.({ reason: 'timeout' })
  }, timeoutMs)

  return cleanup
}

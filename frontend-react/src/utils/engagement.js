export const APP_ROUTES = new Set([
  '/dashboard', '/profile', '/ia', '/analytics', '/planification',
  '/collaboration', '/settings', '/help', '/admin', '/tomorrow', '/goal',
])

export const SPOTLIGHT_WC26_KEY = 'gs_spotlight_wc26_v1'
export const ANNOUNCEMENT_DISMISS_KEY = 'gs_founder_announcement_dismissed'
export const PUSH_NUDGE_DISMISS_KEY = 'gs_push_nudge_dismissed_at'
export const PUSH_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export function isAppRoute(pathname) {
  return APP_ROUTES.has(pathname)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.id ? user : null
  } catch {
    return null
  }
}

export function shouldShowPushNudge() {
  try {
    const raw = localStorage.getItem(PUSH_NUDGE_DISMISS_KEY)
    if (!raw) return true
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return true
    return Date.now() - dismissedAt > PUSH_NUDGE_COOLDOWN_MS
  } catch {
    return true
  }
}

export function dismissPushNudge() {
  try { localStorage.setItem(PUSH_NUDGE_DISMISS_KEY, String(Date.now())) } catch {}
}

/** Padding-top pages app + bannière fixe (base = zone hamburger / header mobile) */
export function appTopInset(basePx = 52) {
  return `calc(${basePx}px + env(safe-area-inset-top) + var(--gs-banner-offset, 0px))`
}

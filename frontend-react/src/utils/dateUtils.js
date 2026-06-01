import i18n from '../i18n'
// Utilitaire date/timezone — remplace tous les toLocaleDateString('fr-FR') hardcodés.
// Toujours utiliser ces fonctions pour l'affichage afin que la locale et le timezone
// du navigateur soient respectés automatiquement.

export const userLocale = () => i18n.language || navigator.language || 'fr-FR'
export const userTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function formatDate(date, opts = {}) {
  if (!date) return ''
  return new Date(date).toLocaleDateString(userLocale(), { timeZone: userTimezone(), ...opts })
}

export function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString(userLocale(), {
    timeZone: userTimezone(),
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date, opts = {}) {
  if (!date) return ''
  return new Date(date).toLocaleString(userLocale(), { timeZone: userTimezone(), ...opts })
}

// Retourne la date du jour en YYYY-MM-DD dans le timezone local (pas UTC)
export function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

// Formatage court : "15 avr" / "Apr 15" selon la locale
export function formatShort(date) {
  return formatDate(date, { day: 'numeric', month: 'short' })
}

// Formatage long : "mercredi 15 avril" / "Wednesday, April 15"
export function formatLong(date) {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })
}

// Formatage moyen : "15 avril 2026"
export function formatMedium(date) {
  return formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' })
}

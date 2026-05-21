import { useState, useEffect } from 'react'
import { themes } from './themes'

/**
 * useTheme — retourne le thème actif et synchronise data-theme sur <html>
 * pour que les CSS tokens (src/theme/tokens.css) soient cohérents avec
 * le thème JS consommé par les composants.
 *
 * Deux thèmes uniquement : "dark" (Graphite) et "light" (Parchemin).
 */
const themeToDataAttr = (themeKey) => (themeKey === 'light' ? 'parchemin' : 'graphite')

export function useTheme() {
  const [theme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    // Migration douce : tout ancien thème supprimé (ocean/forest/sunset) → parchemin
    if (stored && stored !== 'light') {
      try { localStorage.setItem('theme', 'light') } catch { /* noop */ }
    }
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', themeToDataAttr(theme))
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark'
  }, [theme])

  const T = themes[theme] || themes['light']
  return { theme, T }
}

import { useState, useEffect } from 'react'
import { themes } from './themes'

const themeToDataAttr = (themeKey) => (themeKey === 'light' ? 'parchemin' : 'graphite')

// Helper exporté — tous les endroits qui changent le thème l'utilisent
// pour que useTheme() se mette à jour dans tous les composants montés.
export function applyTheme(t) {
  const safe = (t === 'light' || t === 'dark') ? t : 'light'
  try { localStorage.setItem('theme', safe) } catch {}
  document.documentElement.setAttribute('data-theme', themeToDataAttr(safe))
  document.documentElement.style.colorScheme = safe === 'light' ? 'light' : 'dark'
  window.dispatchEvent(new CustomEvent('gs:theme-change', { detail: safe }))
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
    // Migration douce : tout ancien thème → parchemin
    if (stored && stored !== 'light') {
      try { localStorage.setItem('theme', 'light') } catch {}
    }
    return 'light'
  })

  // Réagit aux changements de thème déclenchés depuis n'importe quel composant
  useEffect(() => {
    const handler = (e) => setTheme(e.detail)
    window.addEventListener('gs:theme-change', handler)
    return () => window.removeEventListener('gs:theme-change', handler)
  }, [])

  // Applique data-theme sur <html> dès le montage et à chaque changement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeToDataAttr(theme))
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
  }, [theme])

  const T = themes[theme] || themes['light']
  return { theme, T }
}

import { useState, useEffect } from 'react'
import { themes } from './themes'

const themeToDataAttr = (themeKey) => (themeKey === 'light' ? 'parchemin' : 'graphite')

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

// Helper exporté — tous les endroits qui changent le thème l'utilisent
// pour que useTheme() se mette à jour dans tous les composants montés.
export function applyTheme(t) {
  const safe = (t === 'light' || t === 'dark' || t === 'auto') ? t : 'light'
  try { localStorage.setItem('theme', safe) } catch {}
  const resolved = safe === 'auto' ? getSystemTheme() : safe
  document.documentElement.setAttribute('data-theme', themeToDataAttr(resolved))
  document.documentElement.style.colorScheme = resolved === 'light' ? 'light' : 'dark'
  window.dispatchEvent(new CustomEvent('gs:theme-change', { detail: safe }))
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
    // Migration douce : tout ancien thème → parchemin
    if (stored && stored !== 'light') {
      try { localStorage.setItem('theme', 'light') } catch {}
    }
    return 'light'
  })

  // Préférence système pour le thème 'auto'
  const [sysPrefers, setSysPrefers] = useState(getSystemTheme)

  // Réagit aux changements de thème déclenchés depuis n'importe quel composant
  useEffect(() => {
    const handler = (e) => setTheme(e.detail)
    window.addEventListener('gs:theme-change', handler)
    return () => window.removeEventListener('gs:theme-change', handler)
  }, [])

  // Écoute les changements de préférence système si thème = 'auto'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const next = mq.matches ? 'dark' : 'light'
      setSysPrefers(next)
      if (localStorage.getItem('theme') === 'auto') {
        document.documentElement.setAttribute('data-theme', themeToDataAttr(next))
        document.documentElement.style.colorScheme = next === 'light' ? 'light' : 'dark'
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Applique data-theme sur <html> dès le montage et à chaque changement
  useEffect(() => {
    const resolved = theme === 'auto' ? sysPrefers : theme
    document.documentElement.setAttribute('data-theme', themeToDataAttr(resolved))
    document.documentElement.style.colorScheme = resolved === 'light' ? 'light' : 'dark'
  }, [theme, sysPrefers])

  const resolvedTheme = theme === 'auto' ? sysPrefers : theme
  const T = themes[resolvedTheme] || themes['light']
  return { theme, T }
}

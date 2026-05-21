import { useState, useEffect } from 'react'
import { themes } from './themes'

/**
 * useTheme — retourne le thème actif et synchronise data-theme sur <html>
 * pour que les CSS tokens (src/theme/tokens.css) soient cohérents avec
 * le thème JS consommé par les composants.
 *
 * Les clés `dark` → "graphite", `light` → "parchemin" sont mappées sur
 * les data-attributes correspondants pour activer la bonne palette CSS.
 */
const themeToDataAttr = (themeKey) => {
  if (themeKey === 'dark') return 'graphite'
  if (themeKey === 'light') return 'parchemin'
  return themeKey  // ocean, forest, sunset → utiliseront les tokens par défaut (graphite fallback)
}

export function useTheme() {
  const [theme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', themeToDataAttr(theme))
    // Sync color-scheme natif (dark/light) pour les controls navigateur
    const isDarkVariant = ['dark', 'ocean', 'forest', 'sunset'].includes(theme)
    root.style.colorScheme = isDarkVariant ? 'dark' : 'light'
  }, [theme])

  const T = themes[theme] || themes['dark']
  return { theme, T }
}

import { useState, useEffect } from 'react'
import { themes } from './themes'

export function useTheme() {
  const [themeKey, setThemeKey] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem('theme') || 'dark'
      setThemeKey(current)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const T = themes[themeKey] || themes['dark']
  return { themeKey, T }
}

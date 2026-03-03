// ============================================
// 🎨 useTheme - Hook accès au thème actuel
// ============================================
import { useState, useEffect } from 'react'
import { themes } from './themes'
import axios from 'axios'

const API = 'https://taskflow-production-75c1.up.railway.app'

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const T = themes[theme] || themes['dark']

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (!user) return
    axios.get(API + '/users/' + user.id)
      .then(res => {
        const t = res.data.theme || 'dark'
        setTheme(t)
        localStorage.setItem('theme', t)
      })
      .catch(() => {
        const t = localStorage.getItem('theme') || 'dark'
        setTheme(t)
      })
  }, [])

  const changerTheme = async (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) {
      await axios.put(API + '/users/' + user.id + '/theme', { theme: newTheme })
    }
  }

  return { theme, T, changerTheme }
}

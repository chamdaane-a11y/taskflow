import { useState } from 'react'
import { themes } from './themes'

export function useTheme() {
  const [theme] = useState(() => localStorage.getItem('theme') || 'dark')
  const T = themes[theme] || themes['dark']
  return { theme, T }
}
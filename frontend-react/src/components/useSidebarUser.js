import { useState, useEffect } from 'react'

const NIVEAUX = [
  { niveau: 1, label: 'Débutant',  min: 0 },
  { niveau: 2, label: 'Apprenti',  min: 100 },
  { niveau: 3, label: 'Confirmé',  min: 250 },
  { niveau: 4, label: 'Expert',    min: 500 },
  { niveau: 5, label: 'Maître',    min: 1000 },
]

const EMPTY = {
  user: null, niveau: 1, points: 0, streak: 0,
  niveauActuel: NIVEAUX[0], pctNiveau: 0,
}

export function useSidebarUser() {
  const [data, setData] = useState(EMPTY)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (!u?.id) return

      const niveau = u.niveau || 1
      const points = u.points || 0
      const streak = u.streak || 0
      const niveauActuel = NIVEAUX.find(n => n.niveau === niveau) || NIVEAUX[0]
      const niveauSuivant = NIVEAUX.find(n => n.niveau === niveau + 1)
      const pctNiveau = niveauSuivant
        ? Math.round(((points - niveauActuel.min) / (niveauSuivant.min - niveauActuel.min)) * 100)
        : 100

      setData({ user: u, niveau, points, streak, niveauActuel, pctNiveau })
    } catch {}
  }, [])

  return data
}

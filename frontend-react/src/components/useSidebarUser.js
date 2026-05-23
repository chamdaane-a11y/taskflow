import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'

// Source de vérité : /dashboard/stats/{id} — même endpoint que le Dashboard.
// Toutes les pages qui affichent niveau/points dans la sidebar doivent passer
// par ce hook pour rester alignées avec le Dashboard (sinon désync visible).

const EMPTY = {
  user: null, niveau: 1, points: 0, streak: 0,
  niveauActuel: { label: '' }, pctNiveau: 0,
}

function readUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u?.id ? u : null
  } catch { return null }
}

function fromLocalStorage(u) {
  if (!u) return EMPTY
  return {
    user: u,
    niveau: u.niveau || 1,
    points: u.points || 0,
    streak: u.streak || 0,
    niveauActuel: { label: '' },
    pctNiveau: 0,
  }
}

export function useSidebarUser() {
  // Render synchrone : valeurs localStorage dispo au premier render
  // pour éviter les `if (!user) navigate('/')` qui redirigent à tort.
  const [data, setData] = useState(() => fromLocalStorage(readUser()))

  useEffect(() => {
    const u = readUser()
    if (!u) return

    // Cache court partagé pour éviter N fetchs à chaque navigation.
    const cacheKey = `sidebar_stats_${u.id}`
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null')
      if (cached && Date.now() - cached.ts < 60 * 1000) {
        setData({
          user: u,
          niveau: cached.data.niveau ?? 1,
          points: cached.data.points ?? 0,
          streak: cached.data.streak ?? 0,
          niveauActuel: { label: cached.data.niveau_label || '' },
          pctNiveau: cached.data.progres_niveau ?? 0,
        })
        return
      }
    } catch {}

    axios.get(`${API}/dashboard/stats/${u.id}`, { timeout: 8000 })
      .then(r => {
        const s = r.data || {}
        setData({
          user: u,
          niveau: s.niveau ?? u.niveau ?? 1,
          points: s.points ?? u.points ?? 0,
          streak: s.streak ?? u.streak ?? 0,
          niveauActuel: { label: s.niveau_label || '' },
          pctNiveau: s.progres_niveau ?? 0,
        })
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: s, ts: Date.now() })) } catch {}
      })
      .catch(() => {
        // Réseau KO → on garde le snapshot localStorage déjà rendu
      })
  }, [])

  return data
}

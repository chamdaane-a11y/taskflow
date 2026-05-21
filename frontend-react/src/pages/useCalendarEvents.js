// ══════════════════════════════════════════════════════════════════════
// useCalendarEvents — Hook React partagé pour fetcher les events Google Calendar
// Utilisable sur Dashboard, Planification, IAChat etc.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'

/**
 * @param {number|null} userId
 * @param {string|{from:string,to:string}|null} dateOrRange  'YYYY-MM-DD' OU {from, to}
 * @returns {{events:Array, loading:boolean, connected:boolean|null, error:string|null, refresh:Function}}
 */
export function useCalendarEvents(userId, dateOrRange) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(null) // null = inconnu, true/false = connu
  const [error, setError] = useState(null)
  const cacheRef = useRef({})
  const lastKeyRef = useRef(null)

  const buildKey = useCallback((u, d) => {
    if (!u || !d) return null
    if (typeof d === 'string') return `${u}|${d}`
    return `${u}|${d.from}|${d.to}`
  }, [])

  const buildUrl = useCallback((u, d) => {
    if (typeof d === 'string') return `${API}/integrations/google-calendar/events/${u}?date=${d}&_t=${Date.now()}`
    return `${API}/integrations/google-calendar/events/${u}?from=${d.from}&to=${d.to}&_t=${Date.now()}`
  }, [])

  const fetchEvents = useCallback(async (force = false) => {
    const key = buildKey(userId, dateOrRange)
    if (!key) return
    if (!force && cacheRef.current[key]) {
      const cached = cacheRef.current[key]
      setEvents(cached.events)
      setConnected(cached.connected)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(buildUrl(userId, dateOrRange), { withCredentials: true })
      const evts = res.data.events || []
      const isConn = !!res.data.connected
      cacheRef.current[key] = { events: evts, connected: isConn }
      setEvents(evts)
      setConnected(isConn)
    } catch (e) {
      setError(e?.message || 'Erreur fetch events')
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [userId, dateOrRange, buildKey, buildUrl])

  useEffect(() => {
    const key = buildKey(userId, dateOrRange)
    if (key && key !== lastKeyRef.current) {
      lastKeyRef.current = key
      fetchEvents()
    }
  }, [userId, dateOrRange, fetchEvents, buildKey])

  // Refresh quand la fenêtre revient au focus (l'user a peut-être édité son agenda Google entre temps)
  useEffect(() => {
    const onFocus = () => fetchEvents(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchEvents])

  return {
    events,
    loading,
    connected,
    error,
    refresh: () => fetchEvents(true),
  }
}

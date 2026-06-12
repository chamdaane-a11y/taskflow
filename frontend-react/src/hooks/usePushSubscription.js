import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'

const urlB64ToUint8 = (b64) => {
  if (!b64) throw new Error('VAPID key manquante')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from([...window.atob(s)].map(c => c.charCodeAt(0)))
}

export function usePushSubscription(userId) {
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)

  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  useEffect(() => {
    if (!userId) { setState('inactive'); return }
    if (!supported) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }
    axios.get(`${API}/push/status/${userId}`)
      .then(r => setState(r.data?.subscribed ? 'active' : 'inactive'))
      .catch(() => setState('inactive'))
  }, [userId, supported])

  const activate = useCallback(async () => {
    if (!userId) return false
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); return false }
      const { data } = await axios.get(`${API}/push/vapid-public-key`)
      const key = urlB64ToUint8(data.public_key)
      const ancien = await reg.pushManager.getSubscription()
      if (ancien) { try { await ancien.unsubscribe() } catch {} }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      await axios.post(`${API}/push/subscribe`, { user_id: userId, subscription: sub.toJSON() })
      setState('active')
      return true
    } catch (e) {
      console.error('[push] activate failed', e)
      setState('error')
      return false
    } finally {
      setBusy(false)
    }
  }, [userId])

  const deactivate = useCallback(async () => {
    if (!userId) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await axios.delete(`${API}/push/unsubscribe/${userId}`)
      setState('inactive')
    } catch {
      setState('inactive')
    } finally {
      setBusy(false)
    }
  }, [userId])

  return { state, busy, supported, activate, deactivate, isActive: state === 'active' }
}

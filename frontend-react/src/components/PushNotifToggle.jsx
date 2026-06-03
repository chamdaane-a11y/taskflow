// ══════════════════════════════════════════════════════════════════════
// PushNotifToggle.jsx — bouton maître d'abonnement aux notifications push.
// Demande la permission navigateur, s'abonne via PushManager et enregistre
// la subscription côté backend (/push/subscribe). Réutilise les mêmes
// endpoints que TomorrowBuilder. Sans ça, les crons de notifs n'ont aucun
// abonnement vers qui pousser (cause du "+100h sans notif").
// NB: textes FR inline pour livraison rapide — à i18n-iser via le pipeline.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing, Check, Loader2 } from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

const urlB64ToUint8 = (b64) => {
  if (!b64) throw new Error('VAPID key manquante')
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from([...window.atob(s)].map(c => c.charCodeAt(0)))
}

export default function PushNotifToggle({ user, onToast }) {
  // loading | unsupported | denied | inactive | active | error
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)

  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  useEffect(() => {
    if (!supported) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }
    axios.get(`${API}/push/status/${user.id}`)
      .then(r => setState(r.data?.subscribed ? 'active' : 'inactive'))
      .catch(() => setState('inactive'))
  }, [user.id, supported])

  const activer = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); onToast?.('Notifications refusées.', 'error'); return }
      const { data } = await axios.get(`${API}/push/vapid-public-key`)
      const key = urlB64ToUint8(data.public_key)
      // Réutilise une subscription existante si compatible, sinon (ré)abonne.
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      }
      await axios.post(`${API}/push/subscribe`, { user_id: user.id, subscription: sub.toJSON() })
      setState('active')
      onToast?.('Notifications activées sur cet appareil.')
    } catch (e) {
      console.error('[push] activer failed', e)
      setState('error')
      onToast?.("Impossible d'activer les notifications.", 'error')
    } finally {
      setBusy(false)
    }
  }, [user.id, onToast])

  const desactiver = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await axios.delete(`${API}/push/unsubscribe/${user.id}`)
      setState('inactive')
      onToast?.('Notifications désactivées.')
    } catch {
      setState('inactive')
    } finally {
      setBusy(false)
    }
  }, [user.id, onToast])

  const tester = useCallback(async () => {
    setBusy(true)
    try {
      await axios.post(`${API}/push/test/${user.id}`)
      onToast?.('Notification de test envoyée — vérifie ton écran.')
    } catch {
      onToast?.("Échec de l'envoi du test.", 'error')
    } finally {
      setBusy(false)
    }
  }, [user.id, onToast])

  const Icon = state === 'active' ? BellRing : state === 'denied' || state === 'unsupported' ? BellOff : Bell
  const iconColor = state === 'active' ? '#4caf82' : 'var(--ember)'

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: state === 'active' ? 'rgba(76,175,130,0.12)' : 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications push</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
            {state === 'active' ? 'Activées sur cet appareil. Tu reçois rappels et plan du jour.'
              : state === 'denied' ? 'Bloquées par le navigateur. Autorise-les dans les réglages de ton navigateur/téléphone, puis recharge.'
              : state === 'unsupported' ? 'Cet appareil ou navigateur ne supporte pas les notifications push.'
              : 'Reçois rappels de deadline, plan du matin et résumés directement sur cet appareil.'}
          </div>
        </div>

        {/* Action principale selon l'état */}
        {state === 'loading' && (
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex', flexShrink: 0 }}>
            <Loader2 size={18} color="var(--text-secondary)" />
          </motion.span>
        )}
        {state === 'inactive' && (
          <motion.button onClick={activer} disabled={busy} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', flexShrink: 0, opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>
            {busy ? 'Activation…' : 'Activer'}
          </motion.button>
        )}
        {state === 'error' && (
          <motion.button onClick={activer} disabled={busy} whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
            Réessayer
          </motion.button>
        )}
      </div>

      {/* Quand actif : tester + désactiver */}
      {state === 'active' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <motion.button onClick={tester} disabled={busy} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
            <Check size={14} /> Tester
          </motion.button>
          <motion.button onClick={desactiver} disabled={busy} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? 0.6 : 1 }}>
            Désactiver
          </motion.button>
        </div>
      )}
    </div>
  )
}

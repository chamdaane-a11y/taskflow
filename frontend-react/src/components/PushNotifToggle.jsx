// ══════════════════════════════════════════════════════════════════════
// PushNotifToggle.jsx — bouton maître d'abonnement aux notifications push.
// ══════════════════════════════════════════════════════════════════════
import { useCallback, useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing, Check, Loader2 } from 'lucide-react'
import { usePushSubscription } from '../hooks/usePushSubscription'

const API = 'https://getshift-backend.onrender.com'

export default function PushNotifToggle({ user, onToast }) {
  const { state, busy, activate, deactivate } = usePushSubscription(user.id)
  const [testBusy, setTestBusy] = useState(false)

  const activer = useCallback(async () => {
    const ok = await activate()
    if (ok) onToast?.('Notifications activées sur cet appareil.')
    else if (state !== 'denied') onToast?.("Impossible d'activer les notifications.", 'error')
    else onToast?.('Notifications refusées.', 'error')
  }, [activate, onToast, state])

  const desactiver = useCallback(async () => {
    await deactivate()
    onToast?.('Notifications désactivées.')
  }, [deactivate, onToast])

  const tester = useCallback(async () => {
    setTestBusy(true)
    try {
      const { data } = await axios.post(`${API}/push/test/${user.id}`)
      const errDetail = (data?.errors && data.errors.length) ? ' — ' + data.errors[0] : ''
      onToast?.((data?.message || 'Test envoyé.') + errDetail, data?.sent ? 'success' : 'error')
    } catch (e) {
      onToast?.(e?.response?.data?.detail ? `Erreur : ${e.response.data.detail}` : "Échec de l'envoi du test.", 'error')
    } finally {
      setTestBusy(false)
    }
  }, [user.id, onToast])

  const Icon = state === 'active' ? BellRing : state === 'denied' || state === 'unsupported' ? BellOff : Bell
  const iconColor = state === 'active' ? '#4caf82' : 'var(--ember)'
  const actionBusy = busy || testBusy

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: state === 'active' ? 'rgba(76,175,130,0.12)' : 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications push</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
            {state === 'active' ? 'Activées sur cet appareil. Tu reçois rappels, annonces et plan du jour.'
              : state === 'denied' ? 'Bloquées par le navigateur. Autorise-les dans les réglages de ton navigateur/téléphone, puis recharge.'
              : state === 'unsupported' ? 'Cet appareil ou navigateur ne supporte pas les notifications push.'
              : 'Reçois rappels de deadline, annonces produit et résumés directement sur cet appareil.'}
          </div>
        </div>

        {state === 'loading' && (
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex', flexShrink: 0 }}>
            <Loader2 size={18} color="var(--text-secondary)" />
          </motion.span>
        )}
        {state === 'inactive' && (
          <motion.button onClick={activer} disabled={actionBusy} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--ember)', color: 'var(--text-on-ember, #fff)', fontSize: 13, fontWeight: 700, cursor: actionBusy ? 'wait' : 'pointer', flexShrink: 0, opacity: actionBusy ? 0.7 : 1, fontFamily: 'inherit' }}>
            {actionBusy ? 'Activation…' : 'Activer'}
          </motion.button>
        )}
        {state === 'error' && (
          <motion.button onClick={activer} disabled={actionBusy} whileTap={{ scale: 0.97 }}
            style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
            Réessayer
          </motion.button>
        )}
      </div>

      {state === 'active' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <motion.button onClick={tester} disabled={actionBusy} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: actionBusy ? 0.6 : 1 }}>
            <Check size={14} /> Tester
          </motion.button>
          <motion.button onClick={desactiver} disabled={actionBusy} whileTap={{ scale: 0.97 }}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: actionBusy ? 0.6 : 1 }}>
            Désactiver
          </motion.button>
        </div>
      )}
    </div>
  )
}

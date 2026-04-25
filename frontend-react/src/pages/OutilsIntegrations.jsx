// OutilsIntegrations.jsx — src/pages/OutilsIntegrations.jsx
// Self-contained : TOUS les imports sont dans CE fichier
// Zéro dépendance sur Dashboard.jsx

import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Unlink, CheckCircle2, Wifi } from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

// ─── LOGOS OFFICIELS SVG ──────────────────────────────────────────────────────

const LogoGoogleCalendar = () => (
  <svg viewBox="0 0 48 48" width="22" height="22">
    <path fill="#fff" d="M36 10H12A2 2 0 0010 12v24a2 2 0 002 2h24a2 2 0 002-2V12a2 2 0 00-2-2z"/>
    <path fill="#1A73E8" d="M10 16h28v-4a2 2 0 00-2-2H12a2 2 0 00-2 2v4z"/>
    <path fill="#1A73E8" d="M16 8a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-3 0v-3A1.5 1.5 0 0116 8zM32 8a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-3 0v-3A1.5 1.5 0 0132 8z"/>
    <text x="24" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1A73E8" fontFamily="Arial">24</text>
    <line x1="10" y1="24" x2="38" y2="24" stroke="#E0E0E0" strokeWidth="1"/>
    <line x1="10" y1="31" x2="38" y2="31" stroke="#E0E0E0" strokeWidth="1"/>
    <line x1="19" y1="16" x2="19" y2="38" stroke="#E0E0E0" strokeWidth="1"/>
    <line x1="29" y1="16" x2="29" y2="38" stroke="#E0E0E0" strokeWidth="1"/>
  </svg>
)

const LogoGoogleDrive = () => (
  <svg viewBox="0 0 87.3 78" width="24" height="21">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 50H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
    <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 45.5A9 9 0 000 50h27.5z" fill="#00AC47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.2z" fill="#EA4335"/>
    <path d="M43.65 25L57.4 0H29.9z" fill="#00832D"/>
    <path d="M59.8 50H87.3L73.55 25H43.65z" fill="#2684FC"/>
    <path d="M43.65 50L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#FFBA00"/>
  </svg>
)

const LogoZoom = () => (
  <svg viewBox="0 0 72 72" width="24" height="24">
    <rect width="72" height="72" rx="14" fill="#2D8CFF"/>
    <path d="M14 27a5 5 0 015-5h24a5 5 0 015 5v18a5 5 0 01-5 5H19a5 5 0 01-5-5V27z" fill="white"/>
    <path d="M50 31.5l10-7v23l-10-7V31.5z" fill="white"/>
  </svg>
)

const LogoNotion = () => (
  <svg viewBox="0 0 100 100" width="22" height="22">
    <rect width="100" height="100" rx="16" fill="white" stroke="#E8E8E8" strokeWidth="2"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M22.3 17.2c3.1 2.5 4.3 2.3 10.2 1.9l55.4-3.3c1.2 0 .2-1.2-.4-1.4l-9.2-6.7C76.5 6.2 75 6 72.5 6.2L19.3 9.9c-2 .2-2.4 1.2-1.6 2l4.6 5.3zM25 26.8V84c0 2.7 1.4 3.7 4.4 3.5l60.8-3.5c3-.2 3.4-1.8 3.4-3.7V24.3c0-1.8-.7-2.8-2.3-2.6l-63.5 3.7c-1.8.2-2.8 1-2.8 1.4zm58.4 3.7c.4 1.6 0 3.3-1.6 3.5l-2.6.4v38.4c-2.3 1.2-4.4 1.8-6.1 1.8-2.8 0-3.5-.8-5.5-3.3L48.1 44.8v36.6l5.7 1.2s0 3.3-4.6 3.3L37 86.5c-.4-1-.2-3.3 1.2-3.5l3.1-.8V43l-4.3-.4c-.4-1.6.4-4 2.4-4.2l12.2-.8 21.6 33V39.7l-4.8-.6c-.4-1.8.8-3.3 2.6-3.5l12.4-.1z" fill="#1C1C1C"/>
  </svg>
)

const LogoSlack = () => (
  <svg viewBox="0 0 54 54" width="22" height="22">
    <path d="M19.712.133a5.381 5.381 0 00-5.376 5.387 5.381 5.381 0 005.376 5.386h5.376V5.52A5.381 5.381 0 0019.712.133m0 14.365H5.376A5.381 5.381 0 000 19.884a5.381 5.381 0 005.376 5.387h14.336a5.381 5.381 0 005.376-5.387 5.381 5.381 0 00-5.376-5.386" fill="#36C5F0"/>
    <path d="M53.76 19.884a5.381 5.381 0 00-5.376-5.386 5.381 5.381 0 00-5.376 5.386v5.387h5.376a5.381 5.381 0 005.376-5.387m-14.336 0V5.52A5.381 5.381 0 0034.048.133a5.381 5.381 0 00-5.376 5.387v14.364a5.381 5.381 0 005.376 5.387 5.381 5.381 0 005.376-5.387" fill="#2EB67D"/>
    <path d="M34.048 54a5.381 5.381 0 005.376-5.387 5.381 5.381 0 00-5.376-5.386h-5.376v5.386A5.381 5.381 0 0034.048 54m0-14.365h14.336a5.381 5.381 0 005.376-5.386 5.381 5.381 0 00-5.376-5.387H34.048a5.381 5.381 0 00-5.376 5.387 5.381 5.381 0 005.376 5.386" fill="#ECB22E"/>
    <path d="M0 34.249a5.381 5.381 0 005.376 5.386 5.381 5.381 0 005.376-5.386v-5.387H5.376A5.381 5.381 0 000 34.249m14.336 0v14.364A5.381 5.381 0 0019.712 54a5.381 5.381 0 005.376-5.387V34.249a5.381 5.381 0 00-5.376-5.387 5.381 5.381 0 00-5.376 5.387" fill="#E01E5A"/>
  </svg>
)

const LogoDiscord = () => (
  <svg viewBox="0 -28.5 256 256" width="24" height="24">
    <path d="M216.856 16.597A208.502 208.502 0 00164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.823 207.823 0 00-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0079.735 175.3a136.413 136.413 0 01-21.846-10.632 108.636 108.636 0 005.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 005.355 4.237 136.07 136.07 0 01-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36zM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18z" fill="#5865F2"/>
  </svg>
)

const INTEGRATIONS = [
  { id: 'google_calendar', nom: 'Google Calendar', description: 'Synchronise tes deadlines avec ton agenda.', Logo: LogoGoogleCalendar, categorie: 'Google', oauthPath: '/auth/google/calendar', couleur: '#1A73E8' },
  { id: 'google_drive',    nom: 'Google Drive',    description: 'Attache des fichiers Drive à tes tâches.', Logo: LogoGoogleDrive,    categorie: 'Google', oauthPath: '/auth/google/drive',    couleur: '#00AC47' },
  { id: 'zoom',            nom: 'Zoom',            description: 'Crée des tâches de préparation auto.',    Logo: LogoZoom,            categorie: 'Communication', oauthPath: '/auth/zoom',        couleur: '#2D8CFF' },
  { id: 'notion',          nom: 'Notion',          description: 'Importe tes pages comme tâches GetShift.',Logo: LogoNotion,          categorie: 'Productivité',  oauthPath: '/auth/notion',      couleur: '#1C1C1C' },
  { id: 'slack',           nom: 'Slack',           description: 'Rappels de deadlines dans ton canal.',    Logo: LogoSlack,           categorie: 'Communication', oauthPath: '/auth/slack/oauth', couleur: '#E01E5A' },
  { id: 'discord',         nom: 'Discord',         description: 'Notifications pour tes tâches urgentes.', Logo: LogoDiscord,         categorie: 'Communication', oauthPath: '/auth/discord',     couleur: '#5865F2' },
]

function Spinner({ color = 'currentColor' }) {
  return (
    <motion.svg viewBox="0 0 16 16" width="13" height="13"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="10"/>
    </motion.svg>
  )
}

const CarteIntegration = memo(function CarteIntegration({ integration, connecte, loading, onConnect, onDisconnect, T, isMobile }) {
  const { id, nom, description, Logo, couleur } = integration
  const isLoading = loading === id

  return (
    <motion.div
      style={{
        background: connecte ? `${couleur}0D` : T.bg3,
        border: `1.5px solid ${connecte ? couleur + '40' : T.border}`,
        borderRadius: 14,
        padding: isMobile ? '12px' : '13px 15px',
        position: 'relative', overflow: 'hidden',
      }}
      whileHover={{ borderColor: couleur + '55' }}
      transition={{ duration: 0.12 }}>

      {connecte && (
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: couleur, transformOrigin: 'left' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: '#fff', border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <Logo />
          {connecte && (
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#22c55e', border: `2px solid ${T.bg3}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={8} color="white" strokeWidth={3} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>
              {nom}
            </span>
            {connecte && (
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(34,197,94,0.14)', color: '#16a34a', flexShrink: 0 }}>
                ACTIF
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: T.text2, margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {description}
          </p>
        </div>

        {!isMobile && (
          connecte ? (
            <motion.button onClick={() => onDisconnect(id)} disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0, background: 'transparent', border: `1.5px solid ${T.border}`, color: T.text2 }}
              whileHover={!isLoading ? { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' } : {}}>
              {isLoading ? <Spinner /> : <Unlink size={12} strokeWidth={2} />}
              Déconnecter
            </motion.button>
          ) : (
            <motion.button onClick={() => onConnect(integration)} disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0, background: couleur, border: 'none', color: '#fff', boxShadow: `0 2px 8px ${couleur}40` }}
              whileHover={!isLoading ? { opacity: 0.88, scale: 1.03 } : {}}
              whileTap={{ scale: 0.97 }}>
              {isLoading ? <Spinner color="white" /> : <Link2 size={12} strokeWidth={2.5} />}
              Connecter
            </motion.button>
          )
        )}
      </div>

      {isMobile && (
        <div style={{ marginTop: 10 }}>
          {connecte ? (
            <motion.button onClick={() => onDisconnect(id)} disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, width: '100%', background: 'transparent', border: `1.5px solid ${T.border}`, color: T.text2 }}
              whileHover={!isLoading ? { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' } : {}}>
              {isLoading ? <Spinner /> : <Unlink size={12} strokeWidth={2} />}
              Déconnecter
            </motion.button>
          ) : (
            <motion.button onClick={() => onConnect(integration)} disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, width: '100%', background: couleur, border: 'none', color: '#fff', boxShadow: `0 2px 8px ${couleur}40` }}
              whileHover={!isLoading ? { opacity: 0.88 } : {}}
              whileTap={{ scale: 0.97 }}>
              {isLoading ? <Spinner color="white" /> : <Link2 size={12} strokeWidth={2.5} />}
              Connecter
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  )
})

export default function OutilsIntegrations({ T, userId }) {
  const storageKey = `getshift_integrations_${userId}`
  const [connectes, setConnectes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {} } catch { return {} }
  })
  const [loading, setLoading] = useState(null)
  const [toast, setToast] = useState(null)
  const [filtre, setFiltre] = useState('Tous')
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480

  const notifier = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const sauvegarder = useCallback((id, val) => {
    setConnectes(prev => {
      const next = { ...prev, [id]: val }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  const handleConnect = useCallback((integration) => {
    setLoading(integration.id)
    const w = 500, h = 620
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(`${API}${integration.oauthPath}?user_id=${userId}`, `oauth_${integration.id}`, `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
    const onMsg = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === integration.id) {
        window.removeEventListener('message', onMsg); clearInterval(poll)
        popup?.close(); setLoading(null); sauvegarder(integration.id, true); notifier(`${integration.nom} connecté`)
      }
    }
    window.addEventListener('message', onMsg)
    const poll = setInterval(() => { if (popup?.closed) { clearInterval(poll); window.removeEventListener('message', onMsg); setLoading(null) } }, 500)
  }, [userId, sauvegarder, notifier])

  const handleDisconnect = useCallback(async (id) => {
    setLoading(id)
    try { await fetch(`${API}/auth/disconnect/${id}?user_id=${userId}`, { method: 'DELETE', credentials: 'include' }) } catch {}
    sauvegarder(id, false); setLoading(null)
    notifier(`Déconnecté de ${INTEGRATIONS.find(i => i.id === id)?.nom}`)
  }, [userId, sauvegarder, notifier])

  const categories = ['Tous', ...new Set(INTEGRATIONS.map(i => i.categorie))]
  const liste = filtre === 'Tous' ? INTEGRATIONS : INTEGRATIONS.filter(i => i.categorie === filtre)
  const nbConnectes = Object.values(connectes).filter(Boolean).length

  return (
    <div>
      <AnimatePresence>
        {toast && (
          <motion.div key="t" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderRadius: 10, marginBottom: 12, background: toast.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.22)' : 'rgba(34,197,94,0.22)'}` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: toast.type === 'error' ? '#ef4444' : '#22c55e' }} />
            <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
        <p style={{ fontSize: 11.5, color: T.text2, margin: 0, lineHeight: 1.5, flex: 1 }}>
          Connecte tes outils pour synchroniser GetShift.
        </p>
        <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={11} color={nbConnectes > 0 ? '#22c55e' : T.text2} strokeWidth={2} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{nbConnectes}</span>
          <span style={{ fontSize: 10, color: T.text2 }}>/ {INTEGRATIONS.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <motion.button key={cat} onClick={() => setFiltre(cat)} whileTap={{ scale: 0.95 }}
            style={{ padding: '4px 11px', borderRadius: 99, flexShrink: 0, fontSize: 11, fontWeight: filtre === cat ? 600 : 400, background: filtre === cat ? `${T.accent}18` : 'transparent', border: `1.5px solid ${filtre === cat ? T.accent : T.border}`, color: filtre === cat ? T.accent : T.text2, cursor: 'pointer' }}>
            {cat}
          </motion.button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {liste.map((integration, i) => (
          <motion.div key={integration.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <CarteIntegration integration={integration} connecte={!!connectes[integration.id]} loading={loading} onConnect={handleConnect} onDisconnect={handleDisconnect} T={T} isMobile={isMobile} />
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 10.5, color: T.text2, lineHeight: 1.5 }}>
        <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/>
        </svg>
        GetShift ne stocke que les tokens nécessaires. Tes données restent privées.
      </div>
    </div>
  )
}
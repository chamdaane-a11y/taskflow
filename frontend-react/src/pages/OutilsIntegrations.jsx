// OutilsIntegrations.jsx — src/pages/OutilsIntegrations.jsx
// Self-contained : TOUS les imports sont dans CE fichier
// Zéro dépendance sur Dashboard.jsx

import { useTranslation } from 'react-i18next'
import { useState, useCallback, memo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Unlink, CheckCircle2, Wifi } from 'lucide-react'
import axios from 'axios'
import {
  GoogleCalendarLogo as LogoGoogleCalendar,
  GoogleDriveLogo    as LogoGoogleDrive,
  GmailLogo          as LogoGmail,
  NotionLogo         as LogoNotion,
  SlackLogo          as LogoSlack,
  DiscordLogo        as LogoDiscord,
  ZoomLogo           as LogoZoom,
} from '../components/BrandLogos'

const API = 'https://getshift-backend.onrender.com'

const INTEGRATIONS = [
  { id: 'google_calendar', nom: 'Google Calendar', description: 'Évite les conflits — ton IA respecte ton agenda.', Logo: LogoGoogleCalendar, categorie: 'Google', oauthPath: '/auth/google/calendar', couleur: '#1A73E8' },
  { id: 'gmail',           nom: 'Gmail',           description: 'L\'IA extrait les vraies tâches de tes emails.', Logo: LogoGmail,           categorie: 'Google', oauthPath: '/auth/gmail',           couleur: '#EA4335' },
  { id: 'google_drive',    nom: 'Google Drive',    description: 'Attache des fichiers Drive à tes tâches.', Logo: LogoGoogleDrive,    categorie: 'Google', oauthPath: '/auth/google/drive',    couleur: '#00AC47' },
  { id: 'notion',          nom: 'Notion',          description: 'Importe tes pages comme tâches GetShift.',Logo: LogoNotion,          categorie: 'Productivité',  oauthPath: '/auth/notion',      couleur: '#1C1C1C' },
  { id: 'slack',           nom: 'Slack',           description: 'Rappels de deadlines dans ton canal.',    Logo: LogoSlack,           categorie: 'Communication', oauthPath: '/auth/slack/oauth', couleur: '#E01E5A' },
  { id: 'zoom',            nom: 'Zoom',            description: 'Crée des tâches de préparation auto.',    Logo: LogoZoom,            categorie: 'Communication', oauthPath: '/auth/zoom',        couleur: '#2D8CFF' },
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
  const { t } = useTranslation()
  const { id, nom, description, Logo, couleur } = integration
  const isLoading = loading === id

  return (
    <motion.div
      style={{
        background: connecte ? `${couleur}0D` : 'var(--surface-2)',
        border: `1.5px solid ${connecte ? couleur + '40' : 'var(--border-subtle)'}`,
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
          background: '#fff', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <Logo />
          {connecte && (
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#22c55e', border: `2px solid var(--surface-2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={8} color="white" strokeWidth={3} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {nom}
            </span>
            {connecte && (
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(34,197,94,0.14)', color: '#16a34a', flexShrink: 0 }}>
                ACTIF
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {description}
          </p>
        </div>

        {!isMobile && (
          connecte ? (
            <motion.button onClick={() => onDisconnect(id)} disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0, background: 'transparent', border: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              whileHover={!isLoading ? { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' } : {}}>
              {isLoading ? <Spinner /> : <Unlink size={12} strokeWidth={2} />}
              {t('outils.disconnect')}
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1, width: '100%', background: 'transparent', border: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              whileHover={!isLoading ? { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' } : {}}>
              {isLoading ? <Spinner /> : <Unlink size={12} strokeWidth={2} />}
              {t('outils.disconnect')}
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
  const { t } = useTranslation()
  const [connectes, setConnectes] = useState({})
  const [loading, setLoading] = useState(null)
  const [toast, setToast] = useState(null)
  const [filtre, setFiltre] = useState('Tous')
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 480

  useEffect(() => {
    if (!userId) return
    axios.get(`${API}/integrations/status/${userId}`)
      .then(r => setConnectes(r.data || {}))
      .catch(() => {})
  }, [userId])

  const notifier = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const sauvegarder = useCallback((id, val) => {
    setConnectes(prev => ({ ...prev, [id]: val }))
  }, [])

  const handleConnect = useCallback((integration) => {
    setLoading(integration.id)
    const w = 500, h = 620
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(`${API}${integration.oauthPath}?user_id=${userId}`, `oauth_${integration.id}`, `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
    const onMsg = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === integration.id) {
        window.removeEventListener('message', onMsg); clearInterval(poll)
        popup?.close(); setLoading(null); sauvegarder(integration.id, true); notifier(t('outils.toast_connected', { nom: integration.nom }))
      } else if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', onMsg); clearInterval(poll)
        popup?.close(); setLoading(null); notifier(t('outils.toast_error', { nom: integration.nom, err: e.data?.error || 'annulé' }), 'error')
      }
    }
    window.addEventListener('message', onMsg)
    const poll = setInterval(() => { if (popup?.closed) { clearInterval(poll); window.removeEventListener('message', onMsg); setLoading(null) } }, 500)
  }, [userId, sauvegarder, notifier])

  const handleDisconnect = useCallback(async (id) => {
    setLoading(id)
    try { await fetch(`${API}/auth/disconnect/${id}?user_id=${userId}`, { method: 'DELETE', credentials: 'include' }) } catch {}
    sauvegarder(id, false); setLoading(null)
    notifier(t('outils.toast_disconnected', { nom: INTEGRATIONS.find(i => i.id === id)?.nom }))
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
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, flex: 1 }}>
          Connecte tes outils pour synchroniser GetShift.
        </p>
        <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wifi size={11} color={nbConnectes > 0 ? '#22c55e' : 'var(--text-secondary)'} strokeWidth={2} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{nbConnectes}</span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>/ {INTEGRATIONS.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <motion.button key={cat} onClick={() => setFiltre(cat)} whileTap={{ scale: 0.95 }}
            style={{ padding: '4px 11px', borderRadius: 99, flexShrink: 0, fontSize: 11, fontWeight: filtre === cat ? 600 : 400, background: filtre === cat ? 'var(--ember-soft)' : 'transparent', border: `1.5px solid ${filtre === cat ? 'var(--ember)' : 'var(--border-subtle)'}`, color: filtre === cat ? 'var(--ember)' : 'var(--text-secondary)', cursor: 'pointer' }}>
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

      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
          <path fillRule="evenodd" clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"/>
        </svg>
        {t('outils.privacy')}
      </div>
    </div>
  )
}
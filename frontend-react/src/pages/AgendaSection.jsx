// ══════════════════════════════════════════════════════════════════════
// AgendaSection — Carte affichant les events Google Calendar du jour
// Réutilisable dans Dashboard, future page IA, etc.
// ══════════════════════════════════════════════════════════════════════
import { memo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ExternalLink, MapPin } from 'lucide-react'
import { useCalendarEvents } from './useCalendarEvents'

const API = 'https://getshift-backend.onrender.com'

const AgendaSection = memo(function AgendaSection({ user, T, dateStr }) {
  const today = dateStr || new Date().toISOString().split('T')[0]
  const { events, loading, connected, refresh } = useCalendarEvents(user?.id, today)

  const titreDate = new Date(today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const onConnectClick = () => {
    if (!user?.id) return
    const popup = window.open(
      `${API}/auth/google/calendar?user_id=${user.id}`,
      'gcal_oauth', 'width=540,height=680,menubar=no,toolbar=no'
    )
    const listener = (e) => {
      if (e.data?.type === 'oauth_success' && e.data?.integration === 'google_calendar') {
        window.removeEventListener('message', listener)
        setTimeout(() => refresh(), 600)
      } else if (e.data?.type === 'oauth_error') {
        window.removeEventListener('message', listener)
      }
    }
    window.addEventListener('message', listener)
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', listener)
      }
    }, 800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #4285F4, #1A73E8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white',
        }}>
          <Calendar size={16} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0 }}>
            Agenda du jour
          </h3>
          <p style={{ fontSize: 11, color: T.text2, margin: 0, marginTop: 2, textTransform: 'capitalize' }}>
            {titreDate}
          </p>
        </div>
        {connected && events.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#1A73E8',
            background: 'rgba(26,115,232,0.1)',
            padding: '4px 10px', borderRadius: 99,
          }}>
            {events.length}
          </span>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ padding: '14px 0', color: T.text2, fontSize: 12 }}>
          Chargement…
        </div>
      ) : connected === false ? (
        <div style={{
          textAlign: 'center', padding: '18px 8px',
          background: T.bg, borderRadius: 10,
          border: `1px dashed ${T.border}`,
        }}>
          <p style={{ fontSize: 12, color: T.text2, margin: 0, marginBottom: 10 }}>
            Connecte Google Calendar pour voir ton agenda du jour ici.
          </p>
          <motion.button
            onClick={onConnectClick}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(90deg, #4285F4, #1A73E8)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Calendar size={12} /> Connecter Google Calendar
          </motion.button>
        </div>
      ) : events.length === 0 ? (
        <div style={{
          padding: '14px 8px', textAlign: 'center',
          fontSize: 12, color: T.text2,
          background: T.bg, borderRadius: 10,
          border: `1px dashed ${T.border}`,
        }}>
          Aucun événement aujourd'hui — ta journée est libre 🎯
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {events.slice(0, 10).map(ev => (
            <a
              key={ev.event_id}
              href={ev.html_link || '#'}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: T.bg,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid #4285F4`,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg2}
              onMouseLeave={e => e.currentTarget.style.background = T.bg}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: T.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ev.titre}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: T.text2, fontVariantNumeric: 'tabular-nums' }}>
                    {ev.all_day ? 'Journée entière' : `${ev.heure_debut} – ${ev.heure_fin}`}
                  </span>
                  {ev.location && (
                    <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3, opacity: 0.8 }}>
                      <MapPin size={9} />
                      <span style={{ maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.location}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink size={12} color={T.text2} style={{ flexShrink: 0, opacity: 0.5 }} />
            </a>
          ))}
          {events.length > 10 && (
            <div style={{ textAlign: 'center', fontSize: 10, color: T.text2, opacity: 0.6, padding: '4px 0' }}>
              +{events.length - 10} autre(s) événement(s)
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
})

export default AgendaSection

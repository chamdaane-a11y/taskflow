// ══════════════════════════════════════════════════════════════════════
// AgendaSection — Carte collapsible affichant les events Google Calendar du jour
// Repliée par défaut pour ne pas surcharger le Dashboard, état persisté en localStorage.
// ══════════════════════════════════════════════════════════════════════
import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ExternalLink, MapPin, ChevronDown } from 'lucide-react'
import { useCalendarEvents } from './useCalendarEvents'

const API = 'https://getshift-backend.onrender.com'
const STORAGE_KEY = 'gs_agenda_section_open'

const AgendaSection = memo(function AgendaSection({ user, T, dateStr }) {
  const today = dateStr || new Date().toISOString().split('T')[0]
  const { events, loading, connected, refresh } = useCalendarEvents(user?.id, today)

  // Replié par défaut (= false), persisté
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })
  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
  }

  const titreDate = new Date(today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const onConnectClick = (e) => {
    e?.stopPropagation()
    if (!user?.id) return
    const popup = window.open(
      `${API}/auth/google/calendar?user_id=${user.id}`,
      'gcal_oauth', 'width=540,height=680,menubar=no,toolbar=no'
    )
    const listener = (ev) => {
      if (ev.data?.type === 'oauth_success' && ev.data?.integration === 'google_calendar') {
        window.removeEventListener('message', listener)
        setTimeout(() => refresh(), 600)
      } else if (ev.data?.type === 'oauth_error') {
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

  // Résumé compact pour le header replié
  const summary = (() => {
    if (loading) return '…'
    if (connected === false) return 'Non connecté'
    if (events.length === 0) return "Aucun événement"
    return `${events.length} événement${events.length > 1 ? 's' : ''}`
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header — toujours visible, cliquable */}
      <button
        onClick={toggleOpen}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          background: 'linear-gradient(135deg, #4285F4, #1A73E8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0,
        }}>
          <Calendar size={14} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
            Agenda du jour
          </div>
          <div style={{ fontSize: 11, color: T.text2, marginTop: 2, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {titreDate} · <span style={{ fontWeight: 600 }}>{summary}</span>
          </div>
        </div>
        {connected && events.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#1A73E8',
            background: 'rgba(26,115,232,0.1)',
            padding: '3px 9px', borderRadius: 99,
            flexShrink: 0,
          }}>
            {events.length}
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: T.text2 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Contenu déroulant */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 16px' }}>
              {connected === false ? (
                <div style={{
                  textAlign: 'center', padding: '14px 8px',
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
                  padding: '12px 8px', textAlign: 'center',
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default AgendaSection

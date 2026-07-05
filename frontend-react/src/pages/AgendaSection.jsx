// ══════════════════════════════════════════════════════════════════════
// AgendaSection — Carte collapsible affichant les events Google Calendar du jour
// Repliée par défaut pour ne pas surcharger le Dashboard, état persisté en localStorage.
// ══════════════════════════════════════════════════════════════════════
import { memo, useState } from 'react'
import i18n from '../i18n'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ExternalLink, MapPin, ChevronDown, Download } from 'lucide-react'
import { useCalendarEvents } from './useCalendarEvents'
import axios from 'axios'
import { openOAuthPopup } from '../utils/oauthPopup'

const API = 'https://getshift-backend.onrender.com'
const STORAGE_KEY = 'gs_agenda_section_open'

const AgendaSection = memo(function AgendaSection({ user, T, dateStr, onImport }) {
  const { t } = useTranslation()
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

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // null | {count}

  const handleImport = async (e) => {
    e?.stopPropagation()
    if (!user?.id || importing) return
    setImporting(true)
    try {
      const res = await axios.post(
        `${API}/integrations/google-calendar/import-events/${user.id}`,
        {}, { withCredentials: true }
      )
      const count = res.data?.created || 0
      setImportResult({ count })
      if (count > 0 && onImport) onImport()
      setTimeout(() => setImportResult(null), 4000)
    } catch {
      setImportResult({ count: 0, error: true })
      setTimeout(() => setImportResult(null), 3000)
    } finally {
      setImporting(false)
    }
  }

  const titreDate = new Date(today).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })

  const onConnectClick = (e) => {
    e?.stopPropagation()
    if (!user?.id) return
    openOAuthPopup(`${API}/auth/google/calendar?user_id=${user.id}`, {
      onSuccess: (data) => {
        if (data?.integration === 'google_calendar') setTimeout(() => refresh(), 600)
      },
    })
  }

  // Résumé compact pour le header replié
  const summary = (() => {
    if (loading) return '…'
    if (connected === false) return t('misc.agenda_not_connected')
    if (events.length === 0) return t('misc.agenda_no_event')
    return events.length > 1 ? t('misc.agenda_events_plural', { n: events.length }) : t('misc.agenda_events', { n: events.length })
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
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
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {t('misc.agenda_title')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-secondary)' }}
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
                  background: 'var(--bg-base)', borderRadius: 10,
                  border: '1px dashed var(--border-subtle)',
                }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginBottom: 10 }}>
                    {t('misc.agenda_connect_msg')}
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
                    <Calendar size={12} /> {t('misc.agenda_connect_btn')}
                  </motion.button>
                </div>
              ) : events.length === 0 ? (
                <div style={{
                  padding: '12px 8px', textAlign: 'center',
                  fontSize: 12, color: 'var(--text-secondary)',
                  background: 'var(--bg-base)', borderRadius: 10,
                  border: '1px dashed var(--border-subtle)',
                }}>
                  {t('misc.agenda_free_day')}
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
                        background: 'var(--bg-base)',
                        borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `3px solid #4285F4`,
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-base)'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {ev.titre}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {ev.all_day ? t('misc.agenda_all_day') : `${ev.heure_debut} – ${ev.heure_fin}`}
                          </span>
                          {ev.location && (
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3, opacity: 0.8 }}>
                              <MapPin size={9} />
                              <span style={{ maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ev.location}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink size={12} color="var(--text-secondary)" style={{ flexShrink: 0, opacity: 0.5 }} />
                    </a>
                  ))}
                  {events.length > 10 && (
                    <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6, padding: '4px 0' }}>
                      +{events.length - 10} autre(s) événement(s)
                    </div>
                  )}
                </div>
              )}

              {/* Bouton import events → tâches */}
              {connected && (
                <div style={{ marginTop: 10 }}>
                  {importResult ? (
                    <div style={{
                      textAlign: 'center', fontSize: 11, padding: '6px 10px', borderRadius: 8,
                      background: importResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(26,115,232,0.08)',
                      color: importResult.error ? '#ef4444' : '#1A73E8',
                      border: `1px solid ${importResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(26,115,232,0.2)'}`,
                    }}>
                      {importResult.error
                        ? 'Erreur lors de l\'import'
                        : importResult.count === 0
                          ? t('misc.agenda_all_synced')
                          : `${importResult.count} tâche${importResult.count > 1 ? 's' : ''} importée${importResult.count > 1 ? 's' : ''} ✓`}
                    </div>
                  ) : (
                    <motion.button
                      onClick={handleImport}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      style={{
                        width: '100%', padding: '7px 12px',
                        background: importing ? 'transparent' : 'rgba(26,115,232,0.07)',
                        border: '1px solid rgba(26,115,232,0.25)',
                        borderRadius: 8, cursor: importing ? 'not-allowed' : 'pointer',
                        color: '#1A73E8', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}>
                      <Download size={11} />
                      {importing ? t('misc.agenda_importing') : t('misc.agenda_import_btn')}
                    </motion.button>
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

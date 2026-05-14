// ══════════════════════════════════════════════════════════════════════
// CalendarGrid.jsx — Continuous timeline calendar (08:00–21:00)
// ══════════════════════════════════════════════════════════════════════
import { useRef, useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import TimeBlock from './TimeBlock'
import {
  DAY_START, DAY_END, COL_HEIGHT, PX_PER_MIN,
  pxToMins, minsToPx, minsToTime, clampMins,
  resolveCollisions, SNAP_MINS, getWeekDays, getSingleDay
} from './calendarUtils'

const CalendarGrid = memo(function CalendarGrid({
  planification, taches, T,
  semaineOffset, onOffsetChange,
  onDrop, onMove, onResize, onResizeEnd,
  daysToShow = 7,
  heuresDispo = 8,
}) {
  const gridRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [dragOver, setDragOver]   = useState(null)
  const [dragging, setDragging]   = useState(null)
  const [chipDrag, setChipDrag]   = useState(null)

  const jours = useMemo(
    () => daysToShow === 1 ? getSingleDay(semaineOffset) : getWeekDays(semaineOffset),
    [semaineOffset, daysToShow]
  )

  const chargeParJour = useMemo(() => {
    const map = {}
    for (const j of jours) {
      const total = planification
        .filter(p => (p.date_planifiee?.split('T')[0] || p.date_planifiee) === j.date)
        .reduce((sum, p) => {
          const dur = (p.endMins ?? 0) - (p.startMins ?? 0)
          return sum + (dur > 0 ? dur : (p.charge_minutes || 0))
        }, 0)
      map[j.date] = total
    }
    return map
  }, [planification, jours])

  const capaciteMin = heuresDispo * 60
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)

  const resolvedByDate = useMemo(() => {
    const map = {}
    for (const jour of jours) {
      const dayEntries = planification
        .filter(p => (p.date_planifiee?.split('T')[0] || p.date_planifiee) === jour.date)
        .map(p => ({
          ...p,
          startMins: p.startMins ?? (() => { const t = (p.heure_debut || '08:00').split(':'); return parseInt(t[0] || 8) * 60 + parseInt(t[1] || 0) })(),
          endMins: p.endMins ?? (() => { const t = (p.heure_fin || '09:00').split(':'); return parseInt(t[0] || 9) * 60 + parseInt(t[1] || 0) })(),
        }))
      map[jour.date] = resolveCollisions(dayEntries)
    }
    return map
  }, [planification, jours])

  const plannedIds = useMemo(
    () => new Set(planification.map(p => p.tache_id)),
    [planification]
  )
  const unscheduled = useMemo(
    () => taches.filter(t => !t.terminee && !plannedIds.has(t.id)),
    [taches, plannedIds]
  )

  const getPosInCol = useCallback((e, colEl) => {
    const rect = colEl.getBoundingClientRect()
    const py = Math.max(0, Math.min(e.clientY - rect.top, COL_HEIGHT))
    return pxToMins(py)
  }, [])

  const handleColumnDrop = useCallback((e, date, colEl) => {
    e.preventDefault()
    const startMins = getPosInCol(e, colEl)
    const entryId = e.dataTransfer.getData('entryId')
    const tacheId = e.dataTransfer.getData('tacheId')

    if (entryId && !tacheId) {
      const entry = planification.find(p => String(p.id) === entryId)
      if (!entry) return
      const dur = (entry.endMins ?? 60) - (entry.startMins ?? 0)
      const newStart = clampMins(startMins)
      const newEnd = clampMins(newStart + dur)
      onMove?.({ entryId: parseInt(entryId), date, startMins: newStart, endMins: newEnd })
    } else if (tacheId) {
      const task = taches.find(t => String(t.id) === tacheId)
      const dur = task?.temps_estime || 60
      const newStart = clampMins(startMins)
      const newEnd = clampMins(newStart + dur)
      onDrop?.({ date, startMins: newStart, endMins: newEnd, tacheId: parseInt(tacheId) })
    }
    setDragOver(null)
    setDragging(null)
    setChipDrag(null)
  }, [planification, taches, onMove, onDrop, getPosInCol])

  // Layout constants
  const GUTTER_W = isMobile ? 40 : 48
  const COL_MIN_W = isMobile && daysToShow === 7 ? 80 : undefined
  const needsHScroll = isMobile && daysToShow === 7
  const gridMinWidth = needsHScroll ? GUTTER_W + 80 * jours.length : undefined
  const gridCols = `${GUTTER_W}px repeat(${jours.length}, ${COL_MIN_W ? `${COL_MIN_W}px` : '1fr'})`
  const COL_W = COL_MIN_W ?? 140

  // ─── Navigation label ─────────────────────────────────────────────
  const navLabel = daysToShow === 1
    ? `${jours[0]?.label}, ${jours[0]?.num} ${jours[0]?.mois}`
    : `${jours[0]?.num}–${jours[jours.length - 1]?.num} ${jours[jours.length - 1]?.mois}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: isMobile ? 10 : 12 }}>

      {/* ── Navigation bar ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: isMobile ? '10px 12px' : '8px 12px',
      }}>
        <motion.button
          style={{
            width: isMobile ? 44 : 32, height: isMobile ? 44 : 32,
            borderRadius: 10, background: T.bg,
            border: `1px solid ${T.border}`,
            color: T.text2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
          onClick={() => onOffsetChange(-1)}
          whileHover={{ borderColor: T.accent, color: T.accent }}
          whileTap={{ scale: 0.92 }}>
          <ChevronLeft size={isMobile ? 20 : 15} />
        </motion.button>

        {/* Label */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          {daysToShow === 1 ? (
            <div>
              <div style={{
                fontSize: isMobile ? 15 : 13,
                fontWeight: 800,
                color: jours[0]?.isToday ? T.accent : T.text,
                letterSpacing: '-0.3px',
                textTransform: 'capitalize',
              }}>
                {jours[0]?.label}
              </div>
              <div style={{
                fontSize: isMobile ? 12 : 10,
                color: jours[0]?.isToday ? T.accent : T.text2,
                fontWeight: 600,
                marginTop: 1,
                opacity: jours[0]?.isToday ? 1 : 0.7,
              }}>
                {jours[0]?.num} {jours[0]?.mois}
                {jours[0]?.isToday && ' · Aujourd\'hui'}
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: isMobile ? 13 : 12,
              color: T.text,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              textTransform: 'capitalize',
            }}>
              {navLabel}
            </div>
          )}
        </div>

        <motion.button
          style={{
            padding: isMobile ? '10px 12px' : '6px 12px',
            borderRadius: 8,
            background: T.bg,
            border: `1px solid ${T.border}`,
            color: T.text2,
            cursor: 'pointer',
            fontSize: isMobile ? 12 : 11,
            fontWeight: 600,
            flexShrink: 0,
          }}
          onClick={() => onOffsetChange(0, true)}
          whileHover={{ borderColor: T.accent, color: T.accent }}
          whileTap={{ scale: 0.92 }}>
          Auj.
        </motion.button>

        <motion.button
          style={{
            width: isMobile ? 44 : 32, height: isMobile ? 44 : 32,
            borderRadius: 10, background: T.bg,
            border: `1px solid ${T.border}`,
            color: T.text2, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
          onClick={() => onOffsetChange(1)}
          whileHover={{ borderColor: T.accent, color: T.accent }}
          whileTap={{ scale: 0.92 }}>
          <ChevronRight size={isMobile ? 20 : 15} />
        </motion.button>
      </div>

      {/* ── Unscheduled task chips ── */}
      {unscheduled.length > 0 && (
        <div>
          <p style={{
            fontSize: 9, fontWeight: 700, color: T.text2,
            letterSpacing: '1.5px', marginBottom: 6, opacity: 0.5,
          }}>
            NON PLANIFIÉES — GLISSER
          </p>
          <div style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            paddingBottom: 4,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {unscheduled.slice(0, 12).map(task => (
              <motion.div
                key={task.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('tacheId', String(task.id))
                  e.dataTransfer.effectAllowed = 'copy'
                  setChipDrag(task)
                }}
                onDragEnd={() => setChipDrag(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px',
                  background: chipDrag?.id === task.id ? `${T.accent}20` : T.bg2,
                  border: `1px solid ${chipDrag?.id === task.id ? T.accent : T.border}`,
                  borderRadius: 99,
                  fontSize: 11,
                  cursor: 'grab',
                  color: T.text,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
                whileHover={{ borderColor: T.accent, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: task.priorite === 'haute' ? '#ef4444' : task.priorite === 'moyenne' ? '#f59e0b' : '#10b981',
                  flexShrink: 0,
                }} />
                <span style={{ whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.titre}
                </span>
                {task.temps_estime && (
                  <span style={{ fontSize: 9, color: T.accent, background: `${T.accent}15`, padding: '1px 5px', borderRadius: 99, flexShrink: 0 }}>
                    {task.temps_estime}m
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Calendar grid ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Horizontal scroll wrapper for 7-day on mobile */}
        <div style={{
          overflowX: needsHScroll ? 'auto' : 'visible',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          scrollbarWidth: 'thin',
        }}>

          {/* Day headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            minWidth: gridMinWidth,
            borderBottom: `1px solid ${T.border}`,
            background: T.bg2,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}>
            <div style={{ width: GUTTER_W }} />
            {jours.map(j => {
              const charge = chargeParJour[j.date] || 0
              const pct = Math.min(100, Math.round((charge / capaciteMin) * 100))
              const overload = charge > capaciteMin
              const chargeColor = overload ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981'
              const isJourMode = daysToShow === 1

              return (
                <div key={j.date} style={{
                  padding: isJourMode ? (isMobile ? '14px 12px' : '12px 8px') : '10px 6px',
                  textAlign: 'center',
                  borderLeft: `1px solid ${T.border}`,
                  background: j.isToday ? `${T.accent}08` : 'transparent',
                  transition: 'background 0.2s',
                }}>
                  {/* Day label */}
                  <div style={{
                    fontSize: isJourMode ? (isMobile ? 11 : 10) : 10,
                    color: j.isToday ? T.accent : T.text2,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}>
                    {j.label}
                  </div>

                  {/* Day number circle */}
                  <div style={{
                    width: isJourMode ? (isMobile ? 42 : 36) : 30,
                    height: isJourMode ? (isMobile ? 42 : 36) : 30,
                    borderRadius: '50%',
                    background: j.isToday
                      ? `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`
                      : T.bg,
                    border: j.isToday ? 'none' : `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto',
                    fontSize: isJourMode ? (isMobile ? 20 : 17) : 14,
                    fontWeight: 800,
                    color: j.isToday ? '#fff' : T.text,
                    boxShadow: j.isToday ? `0 4px 14px ${T.accent}45` : 'none',
                  }}>
                    {j.num}
                  </div>

                  {/* Month label in jour mode */}
                  {isJourMode && (
                    <div style={{
                      fontSize: isMobile ? 11 : 10,
                      color: j.isToday ? T.accent : T.text2,
                      fontWeight: 600,
                      marginTop: 4,
                      textTransform: 'capitalize',
                      opacity: 0.8,
                    }}>
                      {j.mois}
                    </div>
                  )}

                  {/* Charge indicator bar */}
                  <div
                    title={`${Math.round(charge / 60 * 10) / 10}h planifiées / ${heuresDispo}h dispo`}
                    style={{
                      marginTop: 6,
                      height: isJourMode ? 5 : 3,
                      background: `${T.border}60`,
                      borderRadius: 99,
                      overflow: 'hidden',
                      marginLeft: isJourMode ? 8 : 0,
                      marginRight: isJourMode ? 8 : 0,
                    }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      style={{ height: '100%', background: chargeColor, borderRadius: 99 }}
                    />
                  </div>
                  {charge > 0 && (
                    <div style={{
                      fontSize: 8,
                      color: overload ? '#ef4444' : T.text2,
                      marginTop: 3,
                      fontWeight: overload ? 700 : 500,
                      opacity: overload ? 1 : 0.65,
                    }}>
                      {overload
                        ? `Surchargé +${Math.round((charge - capaciteMin) / 60 * 10) / 10}h`
                        : `${Math.round(charge / 60 * 10) / 10}h`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: 'auto', flex: 1 }} ref={gridRef}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              minWidth: gridMinWidth,
              position: 'relative',
            }}>

              {/* Time gutter */}
              <div style={{ position: 'relative', height: COL_HEIGHT, width: GUTTER_W }}>
                {hours.map(h => (
                  <div key={h} style={{
                    position: 'absolute',
                    top: minsToPx(h * 60) - 7,
                    right: 6,
                    fontSize: 9,
                    fontWeight: 600,
                    color: T.text2,
                    opacity: 0.6,
                    whiteSpace: 'nowrap',
                  }}>
                    {String(h).padStart(2, '0')}h
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {jours.map(jour => {
                const entries = resolvedByDate[jour.date] || []
                const isDragTarget = dragOver?.date === jour.date

                return (
                  <div
                    key={jour.date}
                    data-col="true"
                    style={{
                      position: 'relative',
                      height: COL_HEIGHT,
                      borderLeft: `1px solid ${T.border}25`,
                      background: isDragTarget
                        ? `${T.accent}06`
                        : jour.isToday
                          ? `${T.accent}03`
                          : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      const colEl = e.currentTarget
                      const rect = colEl.getBoundingClientRect()
                      const py = Math.max(0, e.clientY - rect.top)
                      const snapped = pxToMins(py)
                      setDragOver({ date: jour.date, startMins: snapped })
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOver(null)
                      }
                    }}
                    onDrop={e => handleColumnDrop(e, jour.date, e.target.closest('[data-col]') || e.target)}
                  >
                    {/* Hour lines */}
                    {hours.map(h => (
                      <div key={h} style={{
                        position: 'absolute',
                        top: minsToPx(h * 60),
                        left: 0, right: 0,
                        height: 1,
                        background: `${T.border}50`,
                        pointerEvents: 'none',
                      }} />
                    ))}

                    {/* 30-min sub-lines */}
                    {hours.slice(0, -1).map(h => (
                      <div key={`${h}-30`} style={{
                        position: 'absolute',
                        top: minsToPx(h * 60 + 30),
                        left: 0, right: 0,
                        height: 1,
                        background: `${T.border}20`,
                        pointerEvents: 'none',
                      }} />
                    ))}

                    {/* Current time indicator */}
                    {jour.isToday && (() => {
                      const now = new Date()
                      const nowMins = now.getHours() * 60 + now.getMinutes()
                      if (nowMins < DAY_START * 60 || nowMins > DAY_END * 60) return null
                      return (
                        <div style={{
                          position: 'absolute',
                          top: minsToPx(nowMins),
                          left: 0, right: 0,
                          height: 2,
                          background: T.accent,
                          zIndex: 25,
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            position: 'absolute', left: -4, top: '50%',
                            transform: 'translateY(-50%)',
                            width: 8, height: 8, borderRadius: '50%',
                            background: T.accent,
                            boxShadow: `0 0 6px ${T.accent}80`,
                          }} />
                        </div>
                      )
                    })()}

                    {/* Ghost drop preview */}
                    {isDragTarget && dragOver && (
                      <div style={{
                        position: 'absolute',
                        top: minsToPx(dragOver.startMins),
                        left: 3, right: 3,
                        height: SNAP_MINS * PX_PER_MIN * 2,
                        border: `2px dashed ${T.accent}70`,
                        borderRadius: 8,
                        background: `${T.accent}10`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', zIndex: 5,
                      }}>
                        <Plus size={14} color={T.accent} style={{ opacity: 0.7 }} />
                      </div>
                    )}

                    {/* Task blocks */}
                    {entries.map(entry => (
                      <TimeBlock
                        key={entry.id}
                        entry={entry}
                        colIndex={entry.colIndex}
                        numCols={entry.numCols}
                        colWidth={COL_W}
                        T={T}
                        ghost={dragging?.id === entry.id}
                        onDragStart={e => setDragging(e)}
                        onResize={(id, newEnd) => onResize?.({ entryId: id, newEndMins: newEnd })}
                        onResizeEnd={(id, newEnd) => onResizeEnd?.({ entryId: id, newEndMins: newEnd })}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default CalendarGrid

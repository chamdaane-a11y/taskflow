// ══════════════════════════════════════════════════════════════════════
// CalendarGrid.jsx — Continuous timeline calendar (08:00–21:00)
// ══════════════════════════════════════════════════════════════════════
import { useRef, useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import TimeBlock from './TimeBlock'
import {
  DAY_START, DAY_END, COL_HEIGHT, PX_PER_MIN,
  pxToMins, minsToPx, minsToTime, clampMins,
  resolveCollisions, SNAP_MINS, getWeekDays
} from './calendarUtils'

/**
 * CalendarGrid — full week continuous timeline.
 *
 * Props:
 *  planification   — array of planification entries
 *  taches          — all user tasks (for drag chips)
 *  T               — theme object
 *  semaineOffset   — week offset integer
 *  onOffsetChange  — fn(delta) to change week
 *  onDrop          — fn({ date, startMins, endMins, tacheId }) → API call
 *  onMove          — fn({ entryId, date, startMins, endMins }) → move existing block
 *  onResize        — fn({ entryId, newEndMins }) → optimistic update
 *  onResizeEnd     — fn({ entryId, newEndMins }) → API call
 */
const CalendarGrid = memo(function CalendarGrid({
  planification, taches, T,
  semaineOffset, onOffsetChange,
  onDrop, onMove, onResize, onResizeEnd,
}) {
  const gridRef = useRef(null)
  const [dragOver, setDragOver] = useState(null)  // { date, startMins }
  const [dragging, setDragging] = useState(null)  // entry being dragged (existing block)
  const [chipDrag, setChipDrag] = useState(null)  // unscheduled task being dragged
  const [ghostPos, setGhostPos] = useState(null)  // { date, startMins, endMins }

  const jours = useMemo(() => getWeekDays(semaineOffset), [semaineOffset])

  // Hour markers: 08 → 21
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)

  // ── Per-column collision resolution ───────────────────────────────────
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

  // Unscheduled tasks (no planification entry yet)
  const plannedIds = useMemo(
    () => new Set(planification.map(p => p.tache_id)),
    [planification]
  )
  const unscheduled = useMemo(
    () => taches.filter(t => !t.terminee && !plannedIds.has(t.id)),
    [taches, plannedIds]
  )

  // ── Helpers ────────────────────────────────────────────────────────
  const getColRef = useCallback((colEl, date) => {
    // returns {date, startMins} from mouse event inside column
  }, [])

  const getPosInCol = useCallback((e, colEl) => {
    const rect = colEl.getBoundingClientRect()
    const py = Math.max(0, Math.min(e.clientY - rect.top, COL_HEIGHT))
    return pxToMins(py)
  }, [])

  // ── Drop handler ───────────────────────────────────────────────────
  const handleColumnDrop = useCallback((e, date, colEl) => {
    e.preventDefault()
    const startMins = getPosInCol(e, colEl)
    const entryId = e.dataTransfer.getData('entryId')
    const tacheId = e.dataTransfer.getData('tacheId')
    const origStart = parseInt(e.dataTransfer.getData('offsetMins') || '0')

    if (entryId && !tacheId) {
      // Moving an existing block
      const entry = planification.find(p => String(p.id) === entryId)
      if (!entry) return
      const dur = (entry.endMins ?? 60) - (entry.startMins ?? 0)
      const newStart = clampMins(startMins)
      const newEnd = clampMins(newStart + dur)
      onMove?.({ entryId: parseInt(entryId), date, startMins: newStart, endMins: newEnd })
    } else if (tacheId) {
      // Placing an unscheduled task
      const task = taches.find(t => String(t.id) === tacheId)
      const dur = task?.temps_estime || 60
      const newStart = clampMins(startMins)
      const newEnd = clampMins(newStart + dur)
      onDrop?.({ date, startMins: newStart, endMins: newEnd, tacheId: parseInt(tacheId) })
    }
    setDragOver(null)
    setGhostPos(null)
    setDragging(null)
    setChipDrag(null)
  }, [planification, taches, onMove, onDrop, getPosInCol])

  // Column width for collision math (approximate, CSS handles actual)
  const COL_W = 140

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 12 }}>

      {/* ── Unscheduled chips ── */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: '1.5px', marginBottom: 8, opacity: 0.6 }}>
          GLISSER SUR LE CALENDRIER
        </p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {unscheduled.slice(0, 10).map(task => (
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
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                background: chipDrag?.id === task.id ? `${T.accent}20` : T.bg2,
                border: `1px solid ${chipDrag?.id === task.id ? T.accent : T.border}`,
                borderRadius: 99, fontSize: 12, cursor: 'grab', color: T.text,
                transition: 'all 0.15s',
              }}
              whileHover={{ borderColor: T.accent, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: task.priorite === 'haute' ? '#ef4444' : task.priorite === 'moyenne' ? '#f59e0b' : '#10b981' }} />
              <span style={{ whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.titre}
              </span>
              {task.temps_estime && (
                <span style={{ fontSize: 10, color: T.accent, background: `${T.accent}15`, padding: '1px 6px', borderRadius: 99 }}>
                  {task.temps_estime}m
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Week navigation ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <motion.button
          style={{ width: 30, height: 30, borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => onOffsetChange(-1)} whileHover={{ borderColor: T.accent }}>
          <ChevronLeft size={14} />
        </motion.button>
        <motion.button
          style={{ padding: '5px 14px', borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
          onClick={() => onOffsetChange(0, true)} whileHover={{ borderColor: T.accent }}>
          Aujourd'hui
        </motion.button>
        <motion.button
          style={{ width: 30, height: 30, borderRadius: 8, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => onOffsetChange(1)} whileHover={{ borderColor: T.accent }}>
          <ChevronRight size={14} />
        </motion.button>
        <span style={{ fontSize: 12, color: T.text2, marginLeft: 4 }}>
          {jours[0]?.mois} – {jours[6]?.mois}
        </span>
      </div>

      {/* ── Calendar grid ── */}
      <div style={{
        flex: 1,
        background: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Day headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `48px repeat(7, 1fr)`,
          borderBottom: `1px solid ${T.border}`,
          background: T.bg2,
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <div />
          {jours.map(j => (
            <div key={j.date} style={{ padding: '10px 6px', textAlign: 'center', borderLeft: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                {j.label}
              </div>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: j.isToday ? T.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
                fontSize: 14, fontWeight: 700,
                color: j.isToday ? '#fff' : T.text,
                boxShadow: j.isToday ? `0 4px 12px ${T.accent}50` : 'none',
              }}>
                {j.num}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }} ref={gridRef}>
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(7, 1fr)`, position: 'relative' }}>

            {/* Time gutter */}
            <div style={{ position: 'relative', height: COL_HEIGHT }}>
              {hours.map(h => (
                <div key={h} style={{
                  position: 'absolute',
                  top: minsToPx(h * 60) - 7,
                  right: 8,
                  fontSize: 9, fontWeight: 600, color: T.text2, opacity: 0.5,
                  whiteSpace: 'nowrap',
                }}>
                  {String(h).padStart(2, '0')}:00
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
                    borderLeft: `1px solid ${T.border}20`,
                    background: isDragTarget ? `${T.accent}04` : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onDragOver={e => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    const colEl = e.currentTarget
                    const rect = colEl.getBoundingClientRect()
                    const py = Math.max(0, e.clientY - rect.top)
                    const snapped = pxToMins(py)

                    // Ghost preview
                    setDragOver({ date: jour.date, startMins: snapped })
                  }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setDragOver(null)
                    }
                  }}
                  onDrop={e => handleColumnDrop(e, jour.date, e.target.closest("[data-col]") || e.target)}
                >
                  {/* Hour grid lines */}
                  {hours.map(h => (
                    <div key={h} style={{
                      position: 'absolute',
                      top: minsToPx(h * 60),
                      left: 0, right: 0,
                      height: 1,
                      background: `${T.border}40`,
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
                      background: `${T.border}18`,
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
                      height: SNAP_MINS * PX_PER_MIN * 2,  // 30min preview
                      border: `2px dashed ${T.accent}60`,
                      borderRadius: 8,
                      background: `${T.accent}08`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none', zIndex: 5,
                    }}>
                      <Plus size={14} color={T.accent} style={{ opacity: 0.6 }} />
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
  )
})

export default CalendarGrid

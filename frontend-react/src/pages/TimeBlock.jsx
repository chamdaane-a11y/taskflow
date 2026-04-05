// ══════════════════════════════════════════════════════════════════════
// TimeBlock.jsx — Draggable + bottom-resizable task block
// ══════════════════════════════════════════════════════════════════════
import { useRef, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Flag, GripVertical, ChevronDown } from 'lucide-react'
import {
  minsToPx, pxToMins, clampMins, minsToTime,
  PX_PER_MIN, SNAP_MINS, pColor, pBg
} from './calendarUtils'

/**
 * A positioned, draggable, resizable task block inside a calendar column.
 *
 * Props:
 *  entry      — planification entryk { id, startMins, endMins, titre, priorite, ... }
 *  colIndex   — collision column index (0, 1, ...)
 *  numCols    — total collision columns for this time slot
 *  colWidth   — pixel width of the parent calendar column
 *  T          — theme object
 *  onDragStart(entry)              — called when user starts dragging
 *  onResize(id, newEndMins)        — called while resizing (optimistic)
 *  onResizeEnd(id, newEndMins)     — called when resize pointer released (API call)
 *  ghost      — boolean, renders semi-transparent when being dragged elsewhere
 */
const TimeBlock = memo(function TimeBlock({
  entry, colIndex, numCols, colWidth, T,
  onDragStart, onResize, onResizeEnd, ghost = false
}) {
  const resizeRef   = useRef(null)
  const startYRef   = useRef(0)
  const startEndRef = useRef(0)
  const [resizing, setResizing] = useState(false)
  const [previewEnd, setPreviewEnd] = useState(entry.endMins)

  // ── Geometry ───────────────────────────────────────────────────────
  const top      = minsToPx(entry.startMins)
  const height   = Math.max(minsToPx(entry.endMins) - top, SNAP_MINS * PX_PER_MIN)
  const gutter   = 3
  const w        = (colWidth - gutter * (numCols + 1)) / numCols
  const left     = gutter + colIndex * (w + gutter)
  const duration = (resizing ? previewEnd : entry.endMins) - entry.startMins
  const color    = pColor(entry.priorite)
  const bg       = pBg(entry.priorite)

  // ── Resize (pointer events on bottom handle) ───────────────────────
  const handleResizeDown = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    startYRef.current   = e.clientY
    startEndRef.current = entry.endMins
    setResizing(true)

    const onMove = (ev) => {
      const dy       = ev.clientY - startYRef.current
      const deltaMins = dy / PX_PER_MIN
      const raw      = startEndRef.current + deltaMins
      const snapped  = Math.round(raw / SNAP_MINS) * SNAP_MINS
      const clamped  = clampMins(snapped)
      const minEnd   = entry.startMins + SNAP_MINS
      const finalEnd = Math.max(clamped, minEnd)
      setPreviewEnd(finalEnd)
      onResize?.(entry.id, finalEnd)
    }

    const onUp = (ev) => {
      const dy        = ev.clientY - startYRef.current
      const deltaMins = dy / PX_PER_MIN
      const raw       = startEndRef.current + deltaMins
      const snapped   = Math.round(raw / SNAP_MINS) * SNAP_MINS
      const clamped   = clampMins(snapped)
      const finalEnd  = Math.max(clamped, entry.startMins + SNAP_MINS)
      setResizing(false)
      onResizeEnd?.(entry.id, finalEnd)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [entry.id, entry.startMins, entry.endMins, onResize, onResizeEnd])

  const displayEnd = resizing ? previewEnd : entry.endMins
  const displayH   = Math.max(minsToPx(displayEnd) - top, SNAP_MINS * PX_PER_MIN)

  return (
    <motion.div
      draggable={!resizing}
      onDragStart={(e) => {
        if (resizing) { e.preventDefault(); return }
        // Store entry data in drag event
        e.dataTransfer.setData('entryId', String(entry.id))
        e.dataTransfer.setData('offsetMins', String(entry.startMins))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(entry)
      }}
      style={{
        position:   'absolute',
        top,
        left,
        width:      w,
        height:     displayH,
        background: `linear-gradient(135deg, ${color}22, ${color}12)`,
        border:     `1px solid ${color}50`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding:    '5px 7px 14px',
        cursor:     resizing ? 'ns-resize' : 'grab',
        opacity:    ghost ? 0.35 : 1,
        zIndex:     resizing ? 100 : 10,
        overflow:   'hidden',
        transition: resizing ? 'none' : 'opacity 0.15s, box-shadow 0.15s',
        boxShadow:  resizing
          ? `0 8px 24px ${color}40`
          : `0 2px 8px ${color}20`,
        userSelect: 'none',
      }}
      whileHover={{ boxShadow: `0 6px 20px ${color}35`, zIndex: 20 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: ghost ? 0.35 : 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Drag handle */}
      <div style={{ position: 'absolute', top: 5, right: 5, opacity: 0.25 }}>
        <GripVertical size={10} color={color} />
      </div>

      {/* Content */}
      <p style={{
        fontSize: 11, fontWeight: 700, color, lineHeight: 1.3,
        marginBottom: 3, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        paddingRight: 12
      }}>
        {entry.titre}
        {entry.part > 1 && (
          <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>
            [{entry.part}/{entry.totalParts}]
          </span>
        )}
      </p>

      {displayH > 50 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, color, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Clock size={8} />
            {minsToTime(entry.startMins)}–{minsToTime(displayEnd)}
          </span>
          {duration >= 60 && (
            <span style={{ fontSize: 9, color, opacity: 0.7 }}>{duration}min</span>
          )}
        </div>
      )}

      {/* Resize handle — bottom strip */}
      <div
        ref={resizeRef}
        onPointerDown={handleResizeDown}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 10, cursor: 'ns-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.5,
        }}
      >
        <ChevronDown size={10} color={color} />
      </div>

      {/* Resize preview label */}
      {resizing && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          transform: 'translateX(-50%)',
          background: color, color: '#fff',
          fontSize: 9, fontWeight: 800,
          padding: '2px 6px', borderRadius: 4,
          whiteSpace: 'nowrap', zIndex: 200,
        }}>
          {minsToTime(displayEnd)}
        </div>
      )}
    </motion.div>
  )
})

export default TimeBlock

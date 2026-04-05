// ══════════════════════════════════════════════════════════════════════
// KanbanColumn.jsx — Single Kanban column, drag & drop, connected state
// ══════════════════════════════════════════════════════════════════════
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, Plus, Clock, Flag, Sparkles } from 'lucide-react'
import { pColor, pBg } from './calendarUtils'

/**
 * Props:
 *  col        — { id, label, color, bg, dot }
 *  tasks      — array of tasks in this column
 *  allCount   — total tasks (for progress bar)
 *  dragging   — currently dragged task (or null)
 *  dragOver   — column id being hovered
 *  T          — theme object
 *  onDragStart(task) — set dragging
 *  onDragEnd()       — clear dragging
 *  onDragOver(colId) — set dragOver
 *  onDragLeave()     — clear dragOver
 *  onDrop(colId)     — handle drop
 *  onEstimate(task)  — open estimate modal
 */
const KanbanColumn = memo(function KanbanColumn({
  col, tasks, allCount, dragging, dragOver, T,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onEstimate,
}) {
  const isDrop = dragOver === col.id
  const pct = allCount > 0 ? (tasks.length / allCount) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.bg2,
        borderRadius: 16,
        border: `1px solid ${isDrop ? col.color : T.border}`,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isDrop
          ? `0 0 0 3px ${col.color}18, 0 8px 32px rgba(0,0,0,0.06)`
          : '0 2px 8px rgba(0,0,0,0.03)',
        minHeight: 200,
      }}
      onDragOver={e => { e.preventDefault(); onDragOver(col.id) }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(col.id)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: col.color,
          boxShadow: `0 0 8px ${col.color}60`,
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>
          {col.label}
        </span>
        <div style={{
          minWidth: 22, height: 22, borderRadius: 7,
          background: col.bg, border: `1px solid ${col.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: col.color, padding: '0 7px',
        }}>
          {tasks.length}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 99, background: `${T.border}60`, overflow: 'hidden', marginBottom: 4 }}>
        <motion.div
          style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${col.color}, ${col.color}80)` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>

      {/* Empty drop zone */}
      <AnimatePresence>
        {isDrop && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              border: `2px dashed ${col.color}50`,
              borderRadius: 12, padding: '24px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: col.color, fontSize: 12, gap: 6, fontWeight: 500,
            }}>
            <Plus size={13} /> Déposer ici
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task cards */}
      <AnimatePresence>
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            draggable
            onDragStart={() => onDragStart(task)}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: dragging?.id === task.id ? 0.35 : 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ delay: i * 0.03 }}
            style={{
              background: T.bg3 || T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              borderLeft: `3px solid ${pColor(task.priorite)}`,
              padding: '13px 14px',
              cursor: 'grab',
              position: 'relative',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            whileHover={{
              y: -3,
              boxShadow: `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${pColor(task.priorite)}20`,
            }}
          >
            {/* Grip */}
            <div style={{ position: 'absolute', top: 10, right: 10, opacity: 0.2 }}>
              <GripVertical size={12} color={T.text} />
            </div>

            {/* Title */}
            <p style={{
              fontSize: 13, fontWeight: 500, color: T.text,
              lineHeight: 1.45, marginBottom: 10,
              paddingRight: 18, wordBreak: 'break-word',
            }}>
              {task.titre}
            </p>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 99,
                background: pBg(task.priorite), color: pColor(task.priorite),
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {task.priorite}
              </span>

              {task.deadline && (
                <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Flag size={9} strokeWidth={2} />
                  {new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              )}

              {task.temps_estime ? (
                <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={9} strokeWidth={2} />
                  {task.temps_estime < 60
                    ? `${task.temps_estime}min`
                    : task.temps_estime < 1440
                      ? `${Math.floor(task.temps_estime / 60)}h${task.temps_estime % 60 > 0 ? task.temps_estime % 60 + 'min' : ''}`
                      : `${Math.floor(task.temps_estime / 1440)}j ${Math.floor((task.temps_estime % 1440) / 60)}h`
                  }
                </span>
              ) : (
                <motion.button
                  style={{
                    fontSize: 10, color: T.accent,
                    background: `${T.accent}10`,
                    border: `1px solid ${T.accent}20`,
                    padding: '2px 8px', borderRadius: 99,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                  }}
                  onClick={e => { e.stopPropagation(); onEstimate(task) }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Sparkles size={8} /> Estimer
                </motion.button>
              )}

              {/* Priority score badge */}
              {task._score && (
                <span style={{
                  fontSize: 9, color: T.accent, opacity: 0.6,
                  background: `${T.accent}08`,
                  padding: '1px 5px', borderRadius: 99,
                }}>
                  #{Math.round(task._score)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {tasks.length === 0 && !isDrop && (
        <div style={{
          textAlign: 'center', padding: '28px 16px',
          color: T.text2, fontSize: 12, opacity: 0.3,
          border: `1px dashed ${T.border}`, borderRadius: 10, lineHeight: 1.6,
        }}>
          Aucune tâche<br />dans cette colonne
        </div>
      )}
    </motion.div>
  )
})

export default KanbanColumn

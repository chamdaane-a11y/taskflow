// ══════════════════════════════════════════════════════════════════════
// calendarUtils.js — Pure math, zero React, fully testable
// ══════════════════════════════════════════════════════════════════════

export const DAY_START  = 8            // 08:00
export const DAY_END    = 21           // 21:00
export const TOTAL_MINS = (DAY_END - DAY_START) * 60  // 780 minutes
export const PX_PER_MIN = 2            // 1 minute = 2px → column height = 1560px
export const SNAP_MINS  = 15           // snap grid
export const COL_HEIGHT = TOTAL_MINS * PX_PER_MIN

// ── pixel ↔ minute ────────────────────────────────────────────────────

/**
 * Y pixel (from top of grid) → snapped absolute minutes from midnight
 * Example: py=120 → 120/2=60 raw mins offset → 8*60+60=540 → snap → 540
 */
export function pxToMins(py) {
  const raw = DAY_START * 60 + py / PX_PER_MIN
  return Math.round(raw / SNAP_MINS) * SNAP_MINS
}

/**
 * Absolute minutes from midnight → Y pixel from top of grid
 * Example: mins=540 (09:00) → (540-480)*2 = 120px
 */
export function minsToPx(mins) {
  return (mins - DAY_START * 60) * PX_PER_MIN
}

/** "HH:MM" → absolute minutes from midnight */
export function timeToMins(str) {
  if (!str) return DAY_START * 60
  const [h, m] = str.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** absolute minutes → "HH:MM" */
export function minsToTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

/** Clamp minutes within [DAY_START*60 … DAY_END*60] */
export function clampMins(mins) {
  return Math.max(DAY_START * 60, Math.min(DAY_END * 60, mins))
}

// ── Collision Algorithm (Google Calendar style) ────────────────────────

/**
 * Assigns colIndex + numCols to overlapping events so they sit side-by-side.
 *
 * Algorithm:
 * 1. Sort events by startMins ascending
 * 2. Build collision groups — a group is a maximal set of mutually overlapping events
 * 3. Within each group, use greedy lane assignment:
 *    - Track end time of each lane
 *    - Place event in first lane whose end ≤ event.start
 *    - If no lane available, open a new lane
 * 4. numCols = total lanes in the group
 *
 * @param {Array<{id, startMins, endMins}>} events
 * @returns {Array<{...event, colIndex, numCols}>}
 */
export function resolveCollisions(events) {
  if (!events.length) return []

  const sorted = [...events].sort((a, b) => a.startMins - b.startMins)
  const tagged = sorted.map(e => ({ ...e, colIndex: 0, numCols: 1 }))

  // Build groups of overlapping events
  const groups = []
  let group = [tagged[0]]
  let groupEnd = tagged[0].endMins

  for (let i = 1; i < tagged.length; i++) {
    const ev = tagged[i]
    if (ev.startMins < groupEnd) {
      // Overlaps with current group
      group.push(ev)
      groupEnd = Math.max(groupEnd, ev.endMins)
    } else {
      groups.push(group)
      group = [ev]
      groupEnd = ev.endMins
    }
  }
  groups.push(group)

  // Assign lanes within each group
  for (const grp of groups) {
    const laneEnds = []  // tracks end time of each lane
    for (const ev of grp) {
      let placed = false
      for (let l = 0; l < laneEnds.length; l++) {
        if (laneEnds[l] <= ev.startMins) {
          ev.colIndex = l
          laneEnds[l] = ev.endMins
          placed = true
          break
        }
      }
      if (!placed) {
        ev.colIndex = laneEnds.length
        laneEnds.push(ev.endMins)
      }
    }
    const numCols = laneEnds.length
    grp.forEach(ev => { ev.numCols = numCols })
  }

  return tagged
}

// ── Priority Score ─────────────────────────────────────────────────────

/**
 * Mathematical priority score for scheduling order.
 *
 * Formula:
 *   score = (priorityWeight * 3)
 *           + urgencyFactor          // 100 / max(daysLeft, 0.5) → infinite urgency at deadline
 *           - complexityPenalty      // log2(estimatedMins/30 + 1) → slight penalty for long tasks
 *
 * Result: higher score → schedule first (deep work prime slots)
 */
export function calcPriorityScore(task) {
  const pWeight = { haute: 3, moyenne: 2, basse: 1 }[task.priorite] ?? 1
  const now = new Date()
  const daysLeft = task.deadline
    ? Math.max((new Date(task.deadline) - now) / 86400000, 0.5)
    : 999
  const urgency = 100 / daysLeft
  const estMins = task.temps_estime || 60
  const complexity = Math.log2(estMins / 30 + 1)
  return +(pWeight * 3 + urgency - complexity).toFixed(3)
}

// ── Bin Packing & Auto-Split ───────────────────────────────────────────

/**
 * Given scored tasks + already-filled slots, greedily fit tasks into
 * free time windows (prime morning first).
 *
 * If a task's estimated time > longest free slot:
 *   → Split into Task[Part 1], Task[Part 2], ...
 *
 * Returns: Array of { task, date, startMins, endMins, part, totalParts }
 *
 * @param {Array} tasks       - tasks with calcPriorityScore applied, sorted desc
 * @param {Array} weekDates   - ISO date strings for current week
 * @param {Array} occupied    - existing planification entries {date, startMins, endMins}
 * @param {number} hoursPerDay - user's available hours per day
 */
export function binPackTasks(tasks, weekDates, occupied, hoursPerDay) {
  const WORK_START = DAY_START * 60
  const WORK_END   = WORK_START + hoursPerDay * 60

  // Build free slots per day (sorted by start, prime morning first)
  const freeSlots = {}
  for (const date of weekDates) {
    const dayOccupied = occupied
      .filter(o => o.date === date)
      .sort((a, b) => a.startMins - b.startMins)

    const slots = []
    let cursor = WORK_START

    for (const block of dayOccupied) {
      if (block.startMins > cursor) {
        slots.push({ date, start: cursor, end: block.startMins })
      }
      cursor = Math.max(cursor, block.endMins)
    }
    if (cursor < WORK_END) slots.push({ date, start: cursor, end: WORK_END })
    freeSlots[date] = slots
  }

  const scheduled = []

  for (const task of tasks) {
    let remaining = (task.temps_estime || 60)  // minutes needed
    const parts = []

    for (const date of weekDates) {
      if (remaining <= 0) break
      const slots = freeSlots[date]
      if (!slots) continue

      for (let si = 0; si < slots.length; si++) {
        if (remaining <= 0) break
        const slot = slots[si]
        const available = slot.end - slot.start
        if (available < SNAP_MINS) continue

        const duration = Math.min(remaining, available)
        const snapped  = Math.floor(duration / SNAP_MINS) * SNAP_MINS
        if (snapped < SNAP_MINS) continue

        parts.push({
          task,
          date,
          startMins: slot.start,
          endMins:   slot.start + snapped,
        })

        // Shrink the slot in-place
        slots[si] = { ...slot, start: slot.start + snapped }
        remaining -= snapped
      }
    }

    const totalParts = parts.length
    parts.forEach((p, i) => {
      scheduled.push({ ...p, part: i + 1, totalParts })
    })
  }

  return scheduled
}

// ── Week helpers ───────────────────────────────────────────────────────

export function getWeekDays(offset = 0) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    const day = d.getDay()
    const monday = d.getDate() - (day === 0 ? 6 : day - 1)
    d.setDate(monday + i + offset * 7)
    return {
      date:    d.toISOString().split('T')[0],
      label:   d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      num:     d.getDate(),
      mois:    d.toLocaleDateString('fr-FR', { month: 'short' }),
      isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
    }
  })
}

export function getGanttDays(n = 30, offsetDays = -5) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + offsetDays)
    return {
      date:      d.toISOString().split('T')[0],
      label:     d.getDate(),
      isToday:   d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      mois:      d.toLocaleDateString('fr-FR', { month: 'short' }),
    }
  })
}

export const pColor = (p) => ({ haute: '#ef4444', moyenne: '#f59e0b', basse: '#10b981' })[p] ?? '#6366f1'
export const pBg    = (p) => ({ haute: '#ef444415', moyenne: '#f59e0b15', basse: '#10b98115' })[p] ?? '#6366f115'

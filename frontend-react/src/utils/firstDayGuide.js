/** Parcours guidé J1 — 3 étapes : tâche → focus → GetShift AI */

export const GUIDE_IA_KEY = 'gs_guide_ia_visited'
export const GUIDE_DISMISS_KEY = 'gs_first_day_guide_dismissed'

export function markGuideIaVisited() {
  try {
    localStorage.setItem(GUIDE_IA_KEY, '1')
    window.dispatchEvent(new Event('gs:guide-ia-visited'))
  } catch { /* ignore */ }
}

export function dismissFirstDayGuide() {
  try {
    localStorage.setItem(GUIDE_DISMISS_KEY, '1')
    window.dispatchEvent(new Event('gs:guide-dismissed'))
  } catch { /* ignore */ }
}

export function readGuideIaVisited() {
  try { return localStorage.getItem(GUIDE_IA_KEY) === '1' } catch { return false }
}

export function readGuideDismissed() {
  try { return localStorage.getItem(GUIDE_DISMISS_KEY) === '1' } catch { return false }
}

export function computeGuideSteps({ loading, taches, tachesFocus, dashboardStats, iaVisited }) {
  const totalTasks = Math.max(taches?.length || 0, dashboardStats?.total_taches ?? 0)
  const step1 = !loading && totalTasks > 0
  const step2 = !loading && (tachesFocus?.length || 0) > 0
  const step3 = iaVisited
  const allComplete = step1 && step2 && step3
  const currentStep = !step1 ? 1 : !step2 ? 2 : !step3 ? 3 : 0
  const completedCount = [step1, step2, step3].filter(Boolean).length
  return { step1, step2, step3, allComplete, currentStep, completedCount }
}

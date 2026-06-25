import { useState, useEffect, useMemo } from 'react'
import {
  computeGuideSteps,
  readGuideDismissed,
  readGuideIaVisited,
} from '../utils/firstDayGuide'

export function useFirstDayGuide({ loading, taches, tachesFocus, dashboardStats }) {
  const [iaVisited, setIaVisited] = useState(readGuideIaVisited)
  const [dismissed, setDismissed] = useState(readGuideDismissed)

  useEffect(() => {
    const onIa = () => setIaVisited(readGuideIaVisited())
    const onDismiss = () => setDismissed(readGuideDismissed())
    window.addEventListener('gs:guide-ia-visited', onIa)
    window.addEventListener('gs:guide-dismissed', onDismiss)
    window.addEventListener('storage', () => {
      onIa()
      onDismiss()
    })
    return () => {
      window.removeEventListener('gs:guide-ia-visited', onIa)
      window.removeEventListener('gs:guide-dismissed', onDismiss)
      window.removeEventListener('storage', onIa)
    }
  }, [])

  const steps = useMemo(
    () => computeGuideSteps({ loading, taches, tachesFocus, dashboardStats, iaVisited }),
    [loading, taches, tachesFocus, dashboardStats, iaVisited],
  )

  const showChecklist = !dismissed && !steps.allComplete

  return { ...steps, dismissed, showChecklist }
}

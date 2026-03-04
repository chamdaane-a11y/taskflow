// ============================================
// 🌐 useOffline - Hook détection réseau + sync
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { synchroniserAvecServeur, lireActionsSync } from './db'

const API = 'https://taskflow-production-75c1.up.railway.app'

export function useOffline(userId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingActions, setPendingActions] = useState(0)
  const [lastSync, setLastSync] = useState(null)
  const [syncResult, setSyncResult] = useState(null)

  // Charger le nombre d'actions en attente
  const chargerPendingCount = useCallback(async () => {
    const actions = await lireActionsSync()
    setPendingActions(actions.length)
  }, [])

  // Synchroniser quand on revient online
  const synchroniser = useCallback(async () => {
    if (!userId || isSyncing) return
    const actions = await lireActionsSync()
    if (actions.length === 0) return

    setIsSyncing(true)
    try {
      const result = await synchroniserAvecServeur(userId, API)
      setLastSync(new Date())
      setSyncResult(result)
      setPendingActions(0)
      setTimeout(() => setSyncResult(null), 4000)
    } catch (err) {
      console.error('Erreur synchronisation:', err)
    }
    setIsSyncing(false)
  }, [userId, isSyncing])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      synchroniser()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Charger le compteur au démarrage
    chargerPendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [synchroniser, chargerPendingCount])

  return {
    isOnline,
    isSyncing,
    pendingActions,
    lastSync,
    syncResult,
    synchroniser,
    chargerPendingCount,
  }
}

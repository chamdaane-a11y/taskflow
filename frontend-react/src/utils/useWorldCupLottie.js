import { useEffect, useState } from 'react'
import { isWorldCupSeason } from './worldCup'

/** Chemin du fichier Lottie compact (≤420×280 px recommandé pour le logo) */
export const WC_LOTTIE_PATH = '/lottie/wc26-kick.json'

let cached = undefined // undefined = pas encore chargé, null = absent, object = prêt
let loadPromise = null

function fetchLottie() {
  if (!loadPromise) {
    loadPromise = fetch(WC_LOTTIE_PATH)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('missing'))))
      .then(json => {
        cached = json
        return json
      })
      .catch(() => {
        cached = null
        return null
      })
  }
  return loadPromise
}

export function useWorldCupLottie() {
  const [data, setData] = useState(cached === undefined ? null : cached)
  const [ready, setReady] = useState(cached != null && cached !== null && typeof cached === 'object')

  useEffect(() => {
    if (!isWorldCupSeason()) return
    if (cached !== undefined) {
      setData(cached)
      setReady(cached != null)
      return
    }
    fetchLottie().then(json => {
      setData(json)
      setReady(json != null)
    })
  }, [])

  return { data: ready ? data : null, ready }
}

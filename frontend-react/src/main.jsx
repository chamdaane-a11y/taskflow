import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './theme/tokens.css'  // Design system "Graphite & Ember" — must load before index.css
import './index.css'
import './i18n'  // i18next — doit être importé avant App pour que t() soit disponible
import App from './App.jsx'

// Réveille le backend Render dès le démarrage (cold start = ~30s sinon)
fetch('https://getshift-backend.onrender.com/health').catch(() => {})

// Cache-buster GLOBAL sur tous les GET : sans ça, le navigateur peut servir
// du JSON stale en cache local (même avec Cache-Control: no-store côté serveur,
// certaines couches navigateur/proxy l'ignorent). Ajouter un _t=timestamp force
// une URL unique à chaque requête → impossible à matcher en cache.
// Application : aucun utilisateur n'a besoin de hard refresh après un déploiement.
// Envoie le cookie HttpOnly JWT sur toutes les requêtes cross-origin
axios.defaults.withCredentials = true

// Lit le cookie CSRF non-httpOnly posé par flask-jwt-extended (csrf_access_token).
// Tant que le backend n'active pas JWT_COOKIE_CSRF_PROTECT, ce cookie est absent
// → aucun header envoyé (no-op inoffensif). Quand il l'active, le header part.
export function getCsrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

// Token JWT en localStorage → header Authorization Bearer. C'est la voie d'auth
// principale : les cookies tiers (github.io ↔ onrender.com) sont bloqués par
// Safari/iOS et Android Chrome, ce qui cassait l'app sur mobile.
export function getAuthToken() {
  try { return localStorage.getItem('access_token') } catch { return null }
}

axios.interceptors.request.use(config => {
  const method = (config.method || 'get').toLowerCase()
  if (method === 'get') {
    config.params = { ...(config.params || {}), _t: Date.now() }
  } else {
    const csrf = getCsrfToken()
    if (csrf) config.headers = { ...(config.headers || {}), 'X-CSRF-TOKEN': csrf }
  }
  // N'écrase pas un Authorization déjà posé (ex. appel userinfo Google OAuth).
  const token = getAuthToken()
  if (token && !config.headers?.Authorization) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` }
  }
  return config
})

if ('serviceWorker' in navigator) {
  // Le SW envoie SW_UPDATED après activate+claim → on recharge la page
  // pour charger les nouveaux chunks JS (les anciens hashes n'existent plus sur CDN)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      window.location.reload()
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const next = reg.installing
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            // Fallback : si le message postMessage n'est pas encore arrivé
            window.location.reload()
          }
        })
      })
    }).catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)

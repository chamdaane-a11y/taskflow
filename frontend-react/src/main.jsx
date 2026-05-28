import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './theme/tokens.css'  // Design system "Graphite & Ember" — must load before index.css
import './index.css'
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

axios.interceptors.request.use(config => {
  if ((config.method || 'get').toLowerCase() === 'get') {
    config.params = { ...(config.params || {}), _t: Date.now() }
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
    navigator.serviceWorker.register('/taskflow/sw.js').then(reg => {
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
    <App />
  </StrictMode>,
)

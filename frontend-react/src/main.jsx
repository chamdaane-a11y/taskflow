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
axios.interceptors.request.use(config => {
  if ((config.method || 'get').toLowerCase() === 'get') {
    config.params = { ...(config.params || {}), _t: Date.now() }
  }
  return config
})

// Enregistrement SW dès le démarrage — toutes les pages bénéficient du cache offline
// et des push notifications, pas seulement celles qui chargent useDashboard.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/taskflow/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

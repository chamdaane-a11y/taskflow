import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Réveille le backend Render dès le démarrage (cold start = ~30s sinon)
fetch('https://getshift-backend.onrender.com/health').catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

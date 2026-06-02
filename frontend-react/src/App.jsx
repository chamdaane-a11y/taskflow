import { lazy, Suspense, useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import GuidedTour from './components/GuidedTour'

const Splash           = lazy(() => import('./pages/Splash'))
const Login            = lazy(() => import('./pages/Login'))
const Register         = lazy(() => import('./pages/Register'))
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const IAChat           = lazy(() => import('./pages/IAChat'))
const Analytics        = lazy(() => import('./pages/Analytics'))
const Planification    = lazy(() => import('./pages/Planification'))
const Collaboration    = lazy(() => import('./pages/Collaboration'))
const Help             = lazy(() => import('./pages/Help'))
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword    = lazy(() => import('./pages/ResetPassword'))
const Profile          = lazy(() => import('./pages/Profile'))
const Landing          = lazy(() => import('./pages/Landing'))
const CGU                    = lazy(() => import('./pages/CGU'))
const ConfidentialitePolicy  = lazy(() => import('./pages/ConfidentialitePolicy'))
const MentionsLegales        = lazy(() => import('./pages/MentionsLegales'))
const TomorrowBuilder  = lazy(() => import('./pages/TomorrowBuilder'))
const Settings         = lazy(() => import('./pages/Settings'))
const GoalReverse      = lazy(() => import('./pages/GoalReverse'))
const FounderConsole   = lazy(() => import('./pages/FounderConsole'))

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--ember-soft)', borderTopColor: 'var(--ember)', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

function UpdateBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const handler = () => setVisible(true)
    window.addEventListener('sw-update-ready', handler)
    return () => window.removeEventListener('sw-update-ready', handler)
  }, [])
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: 'var(--surface-1)', border: '1px solid var(--ember)',
      borderRadius: 14, padding: '12px 20px', display: 'flex', alignItems: 'center',
      gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', maxWidth: 360, width: 'calc(100% - 32px)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
        Nouvelle version disponible
      </span>
      <button
        onClick={() => window.location.reload()}
        style={{ padding: '7px 16px', borderRadius: 9, background: 'var(--ember)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
        Actualiser
      </button>
      <button
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>
        ×
      </button>
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <CookieBanner />
      <UpdateBanner />
      <GuidedTour />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/goal"              element={<GoalReverse />} />
          <Route path="/tomorrow"          element={<TomorrowBuilder />} />
          <Route path="/cgu"               element={<CGU />} />
          <Route path="/confidentialite"   element={<ConfidentialitePolicy />} />
          <Route path="/mentions-legales"  element={<MentionsLegales />} />
          <Route path="/"                  element={<Landing />} />
          <Route path="/splash"            element={<Splash />} />
          <Route path="/login"             element={<Login />} />
          <Route path="/forgot-password"   element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/register"          element={<Register />} />
          <Route path="/dashboard"         element={<Dashboard />} />
          <Route path="/profile"           element={<Profile />} />
          <Route path="/ia"                element={<IAChat />} />
          <Route path="/analytics"         element={<Analytics />} />
          <Route path="/planification"     element={<Planification />} />
          <Route path="/collaboration"     element={<Collaboration />} />
          <Route path="/settings"          element={<Settings />} />
          <Route path="/admin"             element={<FounderConsole />} />
          <Route path="/help"              element={<Help />} />
          <Route path="*"                  element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App

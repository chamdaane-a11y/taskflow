import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

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
const CGU              = lazy(() => import('./pages/CGU'))
const TomorrowBuilder  = lazy(() => import('./pages/TomorrowBuilder'))
const Settings         = lazy(() => import('./pages/Settings'))
const GoalReverse      = lazy(() => import('./pages/GoalReverse'))

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117' }}>
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(108,99,255,0.2)', borderTopColor: '#6c63ff', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
)

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/goal"              element={<GoalReverse />} />
          <Route path="/tomorrow"          element={<TomorrowBuilder />} />
          <Route path="/cgu"               element={<CGU />} />
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
          <Route path="/help"              element={<Help />} />
          <Route path="*"                  element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App

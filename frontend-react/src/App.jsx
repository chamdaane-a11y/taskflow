import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Splash from './pages/Splash'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import IAChat from './pages/IAChat'
import Analytics from './pages/Analytics'
import Planification from './pages/Planification'
import Collaboration from './pages/Collaboration'
import Help from './pages/Help'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ia" element={<IAChat />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/planification" element={<Planification />} />
        <Route path="/collaboration" element={<Collaboration />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  )
}

export default App
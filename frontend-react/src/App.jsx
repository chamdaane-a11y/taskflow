import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Splash from './pages/Splash'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import IAChat from './pages/IAChat'
import Analytics from './pages/Analytics'
import Planification from './pages/Planification'
import Collaboration from './pages/Collaboration'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ia" element={<IAChat />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/planification" element={<Planification />} />
        <Route path="/collaboration" element={<Collaboration />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { Bot, BarChart2, Bell, Layers } from 'lucide-react'

const API = 'https://taskflow-production-75c1.up.railway.app'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)
  const navigate = useNavigate()

  const login = async () => {
    if (!email || !password) { setErreur('Remplis tous les champs'); return }
    setLoading(true)
    setErreur('')
    try {
      const res = await axios.post(`${API}/login`, { email, password })
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('theme', res.data.user.theme || 'dark')
      navigate('/dashboard')
    } catch {
      setErreur('Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', position: 'relative' }}>

      {/* Fond animé */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.12, background: i === 0 ? '#6c63ff' : i === 1 ? '#c9a84c' : '#4caf82', width: i === 0 ? 600 : i === 1 ? 400 : 300, height: i === 0 ? 600 : i === 1 ? 400 : 300, left: i === 0 ? '-10%' : i === 1 ? '60%' : '30%', top: i === 0 ? '-10%' : i === 1 ? '50%' : '20%' }}
            animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Panel gauche - Branding */}
      <motion.div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>

        <div style={{ marginBottom: 60 }}>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #c9a84c, #6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>TaskFlow</span>
          </motion.div>

          <motion.h1 style={{ fontSize: 52, fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20 }}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            Gérez vos tâches<br />
            <span style={{ background: 'linear-gradient(90deg, #c9a84c, #6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              avec l'IA
            </span>
          </motion.h1>

          <motion.p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 400 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            Automatisez votre productivité. L'IA génère vos tâches, planifie votre semaine et vous guide vers vos objectifs.
          </motion.p>
        </div>

        {/* Features */}
        {[
          { icon: Bot, text: 'IA génère vos tâches automatiquement' },
          { icon: BarChart2, text: 'Analytics de productivité en temps réel' },
          { icon: Bell, text: 'Rappels intelligents pour vos deadlines' },
        ].map((f, i) => {
          const Icon = f.icon
          return (
            <motion.div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color='rgba(255,255,255,0.5)' strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{f.text}</span>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Panel droit - Formulaire */}
      <motion.div style={{ width: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 60px', position: 'relative' }}
        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8, letterSpacing: '-0.5px' }}>Bon retour</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginBottom: 40 }}>Connecte-toi pour continuer</p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>EMAIL</label>
            <motion.div style={{ borderRadius: 12, border: `1px solid ${focused === 'email' ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
              <input
                style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="ton@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                onKeyDown={e => e.key === 'Enter' && login()}
              />
            </motion.div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>MOT DE PASSE</label>
            <motion.div style={{ borderRadius: 12, border: `1px solid ${focused === 'password' ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
              <input
                type="password"
                style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onKeyDown={e => e.key === 'Enter' && login()}
              />
            </motion.div>
          </div>

          <AnimatePresence>
            {erreur && (
              <motion.div style={{ padding: '12px 16px', background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 10, fontSize: 13, color: '#e05c5c', marginBottom: 20 }}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {erreur}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #c9a84c, #e0a83c)', border: 'none', borderRadius: 12, color: '#080810', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '-0.2px' }}
            onClick={login}
            whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 32px rgba(201,168,76,0.3)' } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}>
            {loading ? 'Connexion...' : 'Se connecter →'}
          </motion.button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 24 }}>
            Pas de compte ?{' '}
            <Link to="/register" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 600 }}>
              Créer un compte
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Layers } from 'lucide-react'

const API = 'https://taskflow-production-75c1.up.railway.app'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [nonVerifie, setNonVerifie] = useState(false)
  const [renvoyeMsg, setRenvoyeMsg] = useState('')
  const navigate = useNavigate()

  const login = async () => {
    if (!email || !password) { setErreur('Remplis tous les champs'); return }
    setLoading(true)
    setErreur('')
    setNonVerifie(false)
    setRenvoyeMsg('')
    try {
      const res = await axios.post(`${API}/login`, { email, password }, { withCredentials: true })
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('theme', res.data.user.theme || 'dark')
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      if (data?.non_verifie) {
        setNonVerifie(true)
        setErreur(data.erreur)
      } else {
        setErreur(data?.erreur || 'Email ou mot de passe incorrect')
      }
    }
    setLoading(false)
  }

  const renvoyerEmail = async () => {
    try {
      await axios.post(`${API}/resend-verification`, { email })
      setRenvoyeMsg('Email de vérification renvoyé ! Vérifiez votre boîte mail.')
    } catch (err) {
      setRenvoyeMsg(err.response?.data?.erreur || 'Erreur lors de l\'envoi')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A12',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      position: 'relative'
    }}>

      <style>{`
        @media (max-width: 1024px) {
          .login-left { display: none !important; }
          .login-right { 
            width: 100% !important; 
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
        @media (max-width: 480px) {
          .login-right { padding: 40px 20px !important; }
          .login-right h2 { font-size: 24px !important; }
          .login-right input, 
          .login-right button { 
            padding: 12px 16px !important; 
            font-size: 16px !important;
          }
        }
        @media (min-width: 1025px) and (max-width: 1366px) {
          .login-left { padding: 60px !important; }
          .login-left h1 { font-size: 44px !important; }
        }
      `}</style>

      {/* Fond animé */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08, filter: 'brightness(0.6)'
        }} />
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} style={{
            position: 'absolute', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.1,
            background: i === 0 ? '#00C896' : i === 1 ? '#6C63FF' : '#FFD166',
            width: i === 0 ? 500 : i === 1 ? 400 : 300,
            height: i === 0 ? 500 : i === 1 ? 400 : 300,
            left: i === 0 ? '-10%' : i === 1 ? '60%' : '30%',
            top: i === 0 ? '-10%' : i === 1 ? '50%' : '20%'
          }}
            animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Panel gauche */}
      <motion.div className="login-left" style={{
        flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(40px, 6vw, 80px)', position: 'relative',
        borderRight: '1px solid rgba(255,255,255,0.05)'
      }}
        initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
      >
        <div style={{ marginBottom: 60 }}>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #C9A84C, #6C63FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(108,99,255,0.3)'
            }}>
              <Layers size={22} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>TaskFlow</span>
          </motion.div>

          <motion.h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, color: 'white',
            lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20
          }}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          >
            Gérez vos tâches<br />
            <span style={{ background: 'linear-gradient(90deg, #00C896, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Exécutez. Progressez.
            </span>
          </motion.h1>

          <motion.p style={{ fontSize: 'clamp(14px, 1.8vw, 16px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          >
            L'intelligence au service de votre productivité.
          </motion.p>
        </div>
      </motion.div>

      {/* Panel droit */}
      <motion.div className="login-right" style={{
        width: 'min(480px, 100%)', maxWidth: '480px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 'clamp(40px, 6vw, 80px) clamp(24px, 5vw, 60px)',
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
        borderRadius: '16px', boxShadow: '0 0 40px rgba(0,0,0,0.3)', margin: 'auto'
      }}
        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
      >
        <h2 style={{ color: 'white', fontSize: 'clamp(24px, 4vw, 28px)', fontWeight: 700, marginBottom: 'clamp(24px, 4vh, 40px)' }}>
          Connexion
        </h2>

        <input
          type="email" placeholder="Adresse e-mail" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            background: 'rgba(16,16,32,0.8)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '14px 18px', color: 'white', marginBottom: 16,
            outline: 'none', width: '100%', boxSizing: 'border-box'
          }}
        />
        <input
          type="password" placeholder="Mot de passe" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            background: 'rgba(16,16,32,0.8)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '14px 18px', color: 'white', marginBottom: 8,
            outline: 'none', width: '100%', boxSizing: 'border-box'
          }}
        />

        {/* Lien mot de passe oublié */}
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            Mot de passe oublié ?
          </Link>
        </div>

        {erreur && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: '#ff6b6b', margin: '0 0 8px 0' }}>{erreur}</p>
            {nonVerifie && (
              <motion.button
                style={{ background: 'transparent', border: '1px solid rgba(108,99,255,0.5)', borderRadius: 8, padding: '8px 14px', color: '#6C63FF', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                onClick={renvoyerEmail}
                whileHover={{ borderColor: '#6C63FF', background: 'rgba(108,99,255,0.1)' }}
              >
                📧 Renvoyer l'email de vérification
              </motion.button>
            )}
          </div>
        )}

        {renvoyeMsg && (
          <p style={{ color: '#00C896', marginBottom: 16, fontSize: 13 }}>{renvoyeMsg}</p>
        )}

        <button onClick={login} disabled={loading} style={{
          background: 'linear-gradient(90deg, #00C896, #6C63FF)', border: 'none',
          borderRadius: 8, padding: '14px 18px', color: 'white', fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 0 25px rgba(0,200,150,0.4)', width: '100%'
        }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 24, fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Pas encore de compte ? <Link to="/register" style={{ color: '#C9A84C', textDecoration: 'none' }}>Inscrivez-vous</Link>
        </p>
      </motion.div>
    </div>
  )
}
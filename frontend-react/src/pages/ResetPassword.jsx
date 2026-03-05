import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'

const API = 'https://taskflow-production-75c1.up.railway.app'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password || !password2) { setErreur('Remplis tous les champs'); return }
    if (password !== password2) { setErreur('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setErreur('Le mot de passe doit contenir au moins 8 caractères'); return }
    setLoading(true)
    setErreur('')
    try {
      await axios.post(`${API}/reset-password`, { token, password })
      setSucces('Mot de passe modifié ! Redirection...')
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setErreur(err.response?.data?.erreur || 'Lien invalide ou expiré')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      position: 'relative',
      padding: '20px'
    }}>
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

      <motion.div style={{
        width: 'min(440px, 100%)',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: 'clamp(32px, 6vw, 60px)',
        boxShadow: '0 0 40px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 2
      }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 style={{ color: 'white', fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          🔑 Nouveau mot de passe
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32 }}>
          Choisissez un nouveau mot de passe sécurisé.
        </p>

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%', background: 'rgba(16,16,32,0.8)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            padding: '14px 18px', color: 'white', marginBottom: 16,
            outline: 'none', boxSizing: 'border-box'
          }}
        />
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          style={{
            width: '100%', background: 'rgba(16,16,32,0.8)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            padding: '14px 18px', color: 'white', marginBottom: 20,
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        {erreur && <p style={{ color: '#ff6b6b', marginBottom: 16, fontSize: 14 }}>{erreur}</p>}
        {succes && <p style={{ color: '#00C896', marginBottom: 16, fontSize: 14 }}>{succes}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', background: 'linear-gradient(90deg, #00C896, #6C63FF)',
          border: 'none', borderRadius: 8, padding: '14px 18px',
          color: 'white', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 0 25px rgba(0,200,150,0.4)', fontSize: 15
        }}>
          {loading ? 'Modification...' : 'Modifier le mot de passe'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 20, fontSize: 14, textAlign: 'center' }}>
          <Link to="/" style={{ color: '#C9A84C', textDecoration: 'none' }}>← Retour à la connexion</Link>
        </p>
      </motion.div>
    </div>
  )
}
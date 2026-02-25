import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'

const API = 'https://taskflow-production-75c1.up.railway.app'

export default function Register() {
  const [form, setForm] = useState({ nom: '', email: '', password: '', password2: '' })
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      setErreur('Les mots de passe ne correspondent pas !')
      return
    }
    try {
      await axios.post(`${API}/register`, {
        nom: form.nom, email: form.email, password: form.password
      })
      setSucces('Compte créé ! Redirection...')
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de l\'inscription')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={styles.logo}>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >✦</motion.span>
          <span style={styles.logoText}>TaskFlow</span>
        </div>

        <h2 style={styles.title}>Créer un compte ✨</h2>
        <p style={styles.sub}>Rejoins TaskFlow et organise ta vie</p>

        {erreur && <div style={styles.erreur}>{erreur}</div>}
        {succes && <div style={styles.succes}>{succes}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'nom', label: 'NOM COMPLET', type: 'text', placeholder: 'John Doe' },
            { name: 'email', label: 'EMAIL', type: 'email', placeholder: 'toi@email.com' },
            { name: 'password', label: 'MOT DE PASSE', type: 'password', placeholder: '••••••••' },
            { name: 'password2', label: 'CONFIRMER', type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input
                style={styles.input}
                type={f.type}
                name={f.name}
                placeholder={f.placeholder}
                value={form[f.name]}
                onChange={handleChange}
                required
              />
            </div>
          ))}

          <motion.button
            style={styles.btn}
            type="submit"
            whileHover={{ scale: 1.02, backgroundColor: '#e8c96d' }}
            whileTap={{ scale: 0.98 }}
          >
            Créer mon compte →
          </motion.button>
        </form>

        <p style={styles.switch}>
          Déjà un compte ? <Link to="/" style={styles.link}>Se connecter</Link>
        </p>
      </motion.div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f0f13', position: 'relative',
    overflow: 'hidden', padding: '20px',
  },
  orb1: {
    position: 'fixed', width: 500, height: 500,
    borderRadius: '50%', background: '#c9a84c',
    filter: 'blur(100px)', opacity: 0.08,
    top: -100, left: -100, pointerEvents: 'none',
  },
  orb2: {
    position: 'fixed', width: 400, height: 400,
    borderRadius: '50%', background: '#6c63ff',
    filter: 'blur(100px)', opacity: 0.08,
    bottom: -100, right: -100, pointerEvents: 'none',
  },
  card: {
    background: 'rgba(22,22,29,0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 24, padding: '44px',
    width: '100%', maxWidth: 440,
    position: 'relative', zIndex: 1,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: 32, color: '#c9a84c',
    fontSize: 20, fontWeight: 800,
    fontFamily: 'Syne, sans-serif',
  },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: 800 },
  title: {
    fontFamily: 'Syne, sans-serif', fontSize: 28,
    fontWeight: 700, color: '#f0f0f5', marginBottom: 8,
  },
  sub: { color: '#8888aa', fontSize: 14, marginBottom: 28 },
  erreur: {
    background: 'rgba(224,92,92,0.15)', color: '#e05c5c',
    border: '1px solid rgba(224,92,92,0.3)',
    borderRadius: 10, padding: '12px 16px',
    fontSize: 14, marginBottom: 18,
  },
  succes: {
    background: 'rgba(76,175,130,0.15)', color: '#4caf82',
    border: '1px solid rgba(76,175,130,0.3)',
    borderRadius: 10, padding: '12px 16px',
    fontSize: 14, marginBottom: 18,
  },
  field: { marginBottom: 18 },
  label: {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: '#8888aa', marginBottom: 8, letterSpacing: 1,
  },
  input: {
    width: '100%', padding: '13px 16px',
    background: '#1e1e28',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, color: '#f0f0f5',
    fontSize: 15, outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: 14,
    background: '#c9a84c', color: '#0f0f13',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700,
    fontFamily: 'Syne, sans-serif',
    cursor: 'pointer', marginTop: 8,
  },
  switch: { textAlign: 'center', marginTop: 20, color: '#8888aa', fontSize: 14 },
  link: { color: '#c9a84c', fontWeight: 600, textDecoration: 'none' },
}
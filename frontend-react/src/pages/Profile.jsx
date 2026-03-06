import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  User, Lock, Star, Zap, Trophy, ArrowLeft, 
  CheckCircle, AlertCircle, Edit3, Shield, 
  TrendingUp, Award, Flame, Target
} from 'lucide-react'

const API = 'https://taskflow-production-75c1.up.railway.app'

const NIVEAUX = [
  { niveau: 1, nom: 'Débutant', emoji: '🌱', couleur: '#4ade80', min: 0 },
  { niveau: 2, nom: 'Apprenti', emoji: '⚡', couleur: '#facc15', min: 100 },
  { niveau: 3, nom: 'Confirmé', emoji: '🔥', couleur: '#f97316', min: 300 },
  { niveau: 4, nom: 'Expert', emoji: '💎', couleur: '#6C63FF', min: 600 },
  { niveau: 5, nom: 'Maître', emoji: '👑', couleur: '#C9A84C', min: 1000 },
]

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [onglet, setOnglet] = useState('profil')
  const [nom, setNom] = useState('')
  const [ancienPwd, setAncienPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (!u?.id) { navigate('/'); return }
    setUser(u)
    setNom(u.nom)
    chargerUser(u.id)
  }, [])

  const chargerUser = async (id) => {
    try {
      const res = await axios.get(`${API}/users/${id}`, { withCredentials: true })
      setUser(res.data)
      setNom(res.data.nom)
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch {}
  }

  const showMessage = (texte, type = 'succes') => {
    setMessage({ texte, type })
    setTimeout(() => setMessage(null), 3500)
  }

  const modifierNom = async () => {
    if (!nom.trim()) { showMessage('Le nom ne peut pas être vide', 'erreur'); return }
    setLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/nom`, { nom }, { withCredentials: true })
      const updated = { ...user, nom }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
      showMessage('✅ Nom modifié avec succès !')
    } catch (e) {
      showMessage(e.response?.data?.erreur || 'Erreur', 'erreur')
    }
    setLoading(false)
  }

  const modifierPassword = async () => {
    if (!ancienPwd || !newPwd || !confirmPwd) { showMessage('Remplis tous les champs', 'erreur'); return }
    if (newPwd !== confirmPwd) { showMessage('Les mots de passe ne correspondent pas', 'erreur'); return }
    if (newPwd.length < 8) { showMessage('Minimum 8 caractères', 'erreur'); return }
    setLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/password`, { ancien_password: ancienPwd, nouveau_password: newPwd }, { withCredentials: true })
      showMessage('✅ Mot de passe modifié !')
      setAncienPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e) {
      showMessage(e.response?.data?.erreur || 'Erreur', 'erreur')
    }
    setLoading(false)
  }

  const niveauInfo = NIVEAUX.find(n => n.niveau === (user?.niveau || 1)) || NIVEAUX[0]
  const niveauSuivant = NIVEAUX.find(n => n.niveau === (user?.niveau || 1) + 1)
  const pointsActuels = user?.points || 0
  const progression = niveauSuivant 
    ? Math.min(((pointsActuels - niveauInfo.min) / (niveauSuivant.min - niveauInfo.min)) * 100, 100)
    : 100

  if (!user) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080810',
      fontFamily: "'DM Sans', sans-serif",
      color: '#f0f0f5',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Fond ambiant */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 600, height: 600,
          borderRadius: '50%', filter: 'blur(150px)', opacity: 0.06,
          background: 'radial-gradient(circle, #6C63FF, transparent)',
          top: '-10%', left: '-10%'
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%', filter: 'blur(150px)', opacity: 0.05,
          background: 'radial-gradient(circle, #C9A84C, transparent)',
          bottom: '10%', right: '-5%'
        }} />
        {/* Grille subtile */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -60, x: '-50%' }}
            style={{
              position: 'fixed', top: 0, left: '50%', zIndex: 1000,
              background: message.type === 'succes' ? 'rgba(0,200,150,0.15)' : 'rgba(255,80,80,0.15)',
              border: `1px solid ${message.type === 'succes' ? 'rgba(0,200,150,0.4)' : 'rgba(255,80,80,0.4)'}`,
              borderRadius: 12, padding: '12px 24px',
              backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            {message.type === 'succes' 
              ? <CheckCircle size={18} color="#00C896" />
              : <AlertCircle size={18} color="#ff5050" />
            }
            <span style={{ fontSize: 14, fontWeight: 500 }}>{message.texte}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}
        >
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ x: -4, background: 'rgba(255,255,255,0.1)' }}
              style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <ArrowLeft size={18} color="#aaa" />
            </motion.div>
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
              Mon Profil
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              Gérez vos informations personnelles
            </p>
          </div>
        </motion.div>

        {/* Carte hero profil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(201,168,76,0.1))',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 24, padding: '32px',
            marginBottom: 24, position: 'relative', overflow: 'hidden'
          }}
        >
          {/* Décoration */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,99,255,0.15), transparent)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C63FF, #C9A84C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 800, flexShrink: 0,
                boxShadow: '0 0 30px rgba(108,99,255,0.4)'
              }}
            >
              {user.nom?.charAt(0).toUpperCase()}
            </motion.div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{user.nom}</h2>
                <span style={{
                  background: `${niveauInfo.couleur}22`,
                  border: `1px solid ${niveauInfo.couleur}44`,
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 12, color: niveauInfo.couleur, fontWeight: 600
                }}>
                  {niveauInfo.emoji} {niveauInfo.nom}
                </span>
              </div>
              <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                📧 {user.email}
              </p>

              {/* Barre progression */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    ⭐ {pointsActuels} points
                  </span>
                  {niveauSuivant && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                      {niveauSuivant.min} pts → {niveauSuivant.emoji} {niveauSuivant.nom}
                    </span>
                  )}
                </div>
                <div style={{
                  height: 6, background: 'rgba(255,255,255,0.08)',
                  borderRadius: 10, overflow: 'hidden'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progression}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{
                      height: '100%', borderRadius: 10,
                      background: `linear-gradient(90deg, ${niveauInfo.couleur}, ${niveauSuivant?.couleur || niveauInfo.couleur})`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats rapides */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { icon: <Trophy size={18} />, val: user.niveau || 1, label: 'Niveau', color: '#C9A84C' },
                { icon: <Flame size={18} />, val: user.points || 0, label: 'Points', color: '#f97316' },
              ].map((s, i) => (
                <motion.div key={i}
                  whileHover={{ scale: 1.05 }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, padding: '14px 18px',
                    textAlign: 'center', minWidth: 80
                  }}
                >
                  <div style={{ color: s.color, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Onglets */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: 6
        }}>
          {[
            { id: 'profil', label: 'Informations', icon: <User size={15} /> },
            { id: 'securite', label: 'Sécurité', icon: <Shield size={15} /> },
          ].map(o => (
            <motion.button key={o.id}
              onClick={() => setOnglet(o.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1, padding: '10px 20px',
                background: onglet === o.id ? 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(201,168,76,0.2))' : 'transparent',
                border: onglet === o.id ? '1px solid rgba(108,99,255,0.3)' : '1px solid transparent',
                borderRadius: 10, color: onglet === o.id ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {o.icon} {o.label}
            </motion.button>
          ))}
        </div>

        {/* Contenu onglets */}
        <AnimatePresence mode="wait">
          {onglet === 'profil' && (
            <motion.div key="profil"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 32
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(108,99,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Edit3 size={16} color="#6C63FF" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>✏️ Modifier mes informations</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Mettez à jour votre nom d'affichage</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 500 }}>
                  👤 Nom complet
                </label>
                <input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Votre nom"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(16,16,32,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: '14px 18px',
                    color: 'white', fontSize: 15, outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(108,99,255,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 500 }}>
                  📧 Adresse email
                </label>
                <input
                  value={user.email}
                  disabled
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10, padding: '14px 18px',
                    color: 'rgba(255,255,255,0.3)', fontSize: 15,
                    fontFamily: "'DM Sans', sans-serif", cursor: 'not-allowed'
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  🔒 L'email ne peut pas être modifié pour des raisons de sécurité
                </p>
              </div>

              <motion.button
                onClick={modifierNom}
                disabled={loading || nom === user.nom}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: nom !== user.nom ? 'linear-gradient(90deg, #6C63FF, #C9A84C)' : 'rgba(255,255,255,0.05)',
                  border: 'none', borderRadius: 10,
                  padding: '14px 28px', color: nom !== user.nom ? 'white' : 'rgba(255,255,255,0.3)',
                  fontWeight: 600, fontSize: 15, cursor: nom !== user.nom ? 'pointer' : 'not-allowed',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: nom !== user.nom ? '0 0 20px rgba(108,99,255,0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder les modifications'}
              </motion.button>
            </motion.div>
          )}

          {onglet === 'securite' && (
            <motion.div key="securite"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 32
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(201,168,76,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Lock size={16} color="#C9A84C" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔐 Changer le mot de passe</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Gardez votre compte sécurisé</p>
                </div>
              </div>

              {[
                { label: '🔑 Mot de passe actuel', val: ancienPwd, set: setAncienPwd, placeholder: 'Votre mot de passe actuel' },
                { label: '🆕 Nouveau mot de passe', val: newPwd, set: setNewPwd, placeholder: 'Min. 8 caractères' },
                { label: '✅ Confirmer le nouveau mot de passe', val: confirmPwd, set: setConfirmPwd, placeholder: 'Répétez le nouveau mot de passe' },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 500 }}>
                    {f.label}
                  </label>
                  <input
                    type="password"
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(16,16,32,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10, padding: '14px 18px',
                      color: 'white', fontSize: 15, outline: 'none',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              ))}

              {/* Indicateur force mot de passe */}
              {newPwd && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= (newPwd.length < 6 ? 1 : newPwd.length < 8 ? 2 : newPwd.length < 12 ? 3 : 4)
                          ? (newPwd.length < 6 ? '#ff5050' : newPwd.length < 8 ? '#f97316' : newPwd.length < 12 ? '#facc15' : '#00C896')
                          : 'rgba(255,255,255,0.1)'
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {newPwd.length < 6 ? '🔴 Trop court' : newPwd.length < 8 ? '🟠 Faible' : newPwd.length < 12 ? '🟡 Moyen' : '🟢 Fort'}
                  </p>
                </div>
              )}

              <motion.button
                onClick={modifierPassword}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(90deg, #C9A84C, #6C63FF)',
                  border: 'none', borderRadius: 10,
                  padding: '14px 28px', color: 'white',
                  fontWeight: 600, fontSize: 15, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 0 20px rgba(201,168,76,0.3)',
                }}
              >
                {loading ? '⏳ Modification...' : '🔐 Modifier le mot de passe'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

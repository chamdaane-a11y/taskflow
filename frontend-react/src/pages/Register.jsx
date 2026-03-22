import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { Layers, ArrowRight, Sparkles } from 'lucide-react'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'
const GOOGLE_CLIENT_ID = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'

function RegisterInner() {
  const [form, setForm]       = useState({ nom: '', email: '', password: '', password2: '' })
  const [erreur, setErreur]   = useState('')
  const [succes, setSucces]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const register = async () => {
    if (!form.nom || !form.email || !form.password) { setErreur('Remplis tous les champs'); return }
    if (form.password !== form.password2) { setErreur('Les mots de passe ne correspondent pas'); return }
    if (form.password.length < 6) { setErreur('Le mot de passe doit faire au moins 6 caractères'); return }
    setLoading(true); setErreur('')
    try {
      await axios.post(`${API}/register`, { nom: form.nom, email: form.email, password: form.password })
      setSucces(true)
    } catch (err) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de l\'inscription')
    }
    setLoading(false)
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGLoading(true); setErreur('')
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        const res = await axios.post(`${API}/auth/google`, {
          google_id: userInfo.data.sub,
          email: userInfo.data.email,
          nom: userInfo.data.name,
          avatar: userInfo.data.picture,
        }, { withCredentials: true })
        localStorage.setItem('user', JSON.stringify(res.data.user))
        localStorage.setItem('theme', res.data.user.theme || 'dark')
        navigate('/dashboard')
      } catch (err) {
        setErreur(err.response?.data?.erreur || 'Erreur Google')
      }
      setGLoading(false)
    },
    onError: () => setErreur('Inscription Google annulée'),
    flow: 'implicit',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #ffffff 0%, #F8F9FC 100%)',
      color: '#0f172a', fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflowX: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');
        * { box-sizing: border-box; }
        .gradient-text { background: linear-gradient(135deg, #6C63FF, #00C896); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .tf-input { width: 100%; padding: 13px 16px; background: white; border: 1.5px solid #e2e8f0; border-radius: 10px; color: #0f172a; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .tf-input:focus { border-color: #6C63FF; box-shadow: 0 0 0 3px rgba(108,99,255,0.08); }
        .tf-input::placeholder { color: #94a3b8; }
        .tf-label { display: block; font-size: 13px; font-weight: 500; color: #64748b; margin-bottom: 7px; }
        .tf-btn-main { width: 100%; padding: 14px; background: linear-gradient(135deg, #6C63FF, #00C896); color: white; border: none; border-radius: 11px; font-size: 15px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 24px rgba(108,99,255,0.22); transition: box-shadow 0.2s, transform 0.1s; }
        .tf-btn-main:hover { box-shadow: 0 12px 32px rgba(108,99,255,0.32); }
        .tf-btn-main:active { transform: scale(0.99); }
        .tf-btn-main:disabled { opacity: 0.6; cursor: not-allowed; }
        .tf-btn-google { width: 100%; padding: 13px 16px; background: #0f172a; color: white; border: none; border-radius: 11px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.15s, transform 0.1s; box-shadow: 0 4px 14px rgba(15,23,42,0.15); }
        .tf-btn-google:hover { background: #1e293b; }
        .tf-btn-google:active { transform: scale(0.99); }
        .tf-btn-google:disabled { opacity: 0.6; cursor: not-allowed; }
        .tf-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0; }
        .tf-divider-line { flex: 1; height: 1px; background: #e2e8f0; }
        .tf-divider-text { font-size: 12px; color: #94a3b8; font-weight: 500; }
        .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        @media (max-width: 960px) {
          .reg-split-left { display: none !important; }
          .reg-split-right { width: 100% !important; max-width: 100% !important; padding: 48px 24px 60px !important; box-shadow: none !important; }
          .reg-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Orbes fond */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #6C63FF, transparent)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #00C896, transparent)', bottom: '5%', right: '5%' }} />
      </div>

      {/* NAVBAR */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, padding: '0 clamp(20px, 5vw, 80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248,249,252,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(108,99,255,0.25)' }}>
            <Layers size={17} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>GetShift</span>
        </Link>
        <Link to="/" style={{ padding: '8px 20px', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: 9, color: '#475569', fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
          Se connecter
        </Link>
      </motion.nav>

      {/* CORPS */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', paddingTop: 64, position: 'relative', zIndex: 1 }}>

        {/* GAUCHE */}
        <motion.div className="reg-split-left"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px, 8vw, 100px) clamp(40px, 6vw, 100px)', borderRight: '1px solid rgba(0,0,0,0.05)' }}>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: '#6C63FF', fontWeight: 600, width: 'fit-content' }}>
            <Sparkles size={13} strokeWidth={2} />
            Gratuit · Sans carte bancaire
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            style={{ fontSize: 'clamp(40px, 5vw, 66px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-3px', marginBottom: 22, fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>
            Organisez.{' '}
            <span className="gradient-text">Automatisez.</span>
            <br />Performez.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            style={{ fontSize: 17, color: '#64748b', maxWidth: 460, lineHeight: 1.75, marginBottom: 44, fontWeight: 400 }}>
            Rejoignez des milliers d'utilisateurs qui organisent leur quotidien avec GetShift.
          </motion.p>

          {/* Avantages */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {[
              { titre: 'IA intégrée', desc: 'Générez et priorisez vos tâches automatiquement' },
              { titre: 'Collaboration', desc: 'Invitez votre équipe et travaillez ensemble' },
              { titre: 'Bilan hebdomadaire', desc: 'Recevez vos stats chaque vendredi par email' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: '#475569' }}>
                  <strong style={{ color: '#0f172a', fontWeight: 600 }}>{f.titre}</strong> — {f.desc}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* DROITE — formulaire */}
        <motion.div className="reg-split-right"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          style={{ width: 'min(500px, 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(48px, 6vw, 72px) clamp(24px, 5vw, 60px)', background: 'white', boxShadow: '-1px 0 0 rgba(0,0,0,0.04)', overflowY: 'auto' }}>

          <AnimatePresence mode="wait">
            {succes ? (
              <motion.div key="succes" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,200,150,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                    <path d="M2 10L8.5 16.5L22 2" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Compte créé !</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
                  Vérifie ta boîte mail pour activer ton compte.<br/>Pense à regarder les spams.
                </p>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #6C63FF, #00C896)', color: 'white', borderRadius: 11, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(108,99,255,0.22)' }}>
                  Se connecter <ArrowRight size={16}/>
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.6px', marginBottom: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    Créer un compte.
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b' }}>Gratuit pour toujours. Aucune carte requise.</p>
                </div>

                {/* Champs en grille 2 colonnes */}
                <div className="reg-row">
                  <div>
                    <label className="tf-label">Nom complet</label>
                    <input className="tf-input" type="text" name="nom" placeholder="John Doe" value={form.nom} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                  <div>
                    <label className="tf-label">Adresse e-mail</label>
                    <input className="tf-input" type="email" name="email" placeholder="vous@exemple.com" value={form.email} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                </div>

                <div className="reg-row">
                  <div>
                    <label className="tf-label">Mot de passe</label>
                    <input className="tf-input" type="password" name="password" placeholder="6 caractères min." value={form.password} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                  <div>
                    <label className="tf-label">Confirmer</label>
                    <input className="tf-input" type="password" name="password2" placeholder="Répéter" value={form.password2} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                </div>

                <AnimatePresence>
                  {erreur && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14 }}>
                      {erreur}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA principal */}
                <button className="tf-btn-main" onClick={register} disabled={loading}>
                  {loading ? 'Création...' : <><span>Créer mon compte</span><ArrowRight size={16}/></>}
                </button>

                {/* Séparateur */}
                <div className="tf-divider">
                  <div className="tf-divider-line" />
                  <span className="tf-divider-text">ou</span>
                  <div className="tf-divider-line" />
                </div>

                {/* Google NOIR — en dessous */}
                <button className="tf-btn-google" onClick={() => googleLogin()} disabled={gLoading}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {gLoading ? 'Connexion...' : 'Continuer avec Google'}
                </button>

                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
                  En créant un compte, vous acceptez nos{' '}
                  <Link to="/cgu" style={{ color: '#64748b', textDecoration: 'underline' }}>conditions d'utilisation</Link>
                </p>

                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>
                  Déjà un compte ?{' '}
                  <Link to="/" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RegisterInner />
    </GoogleOAuthProvider>
  )
}
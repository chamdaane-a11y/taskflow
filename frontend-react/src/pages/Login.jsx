import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { Layers, ArrowRight, Sparkles } from 'lucide-react'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'
const GOOGLE_CLIENT_ID = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'

function LoginInner() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [erreur, setErreur]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [nonVerifie, setNonVerifie] = useState(false)
  const [renvoyeMsg, setRenvoyeMsg] = useState('')
  const navigate = useNavigate()

  const login = async () => {
    if (!email || !password) { setErreur('Remplis tous les champs'); return }
    setLoading(true); setErreur(''); setNonVerifie(false); setRenvoyeMsg('')
    try {
      const res = await axios.post(`${API}/login`, { email, password }, { withCredentials: true })
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('theme', res.data.user.theme || 'dark')
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      if (data?.non_verifie) { setNonVerifie(true); setErreur(data.erreur) }
      else setErreur(data?.erreur || 'Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  const renvoyerEmail = async () => {
    try {
      await axios.post(`${API}/resend-verification`, { email })
      setRenvoyeMsg('Email envoyé — vérifie ta boîte mail.')
    } catch { setRenvoyeMsg('Erreur lors de l\'envoi') }
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
    onError: () => setErreur('Connexion Google annulée'),
    flow: 'implicit',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #ffffff 0%, #F8F9FC 100%)',
      color: '#0f172a',
      fontFamily: "'DM Sans', sans-serif",
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
        @media (max-width: 960px) {
          .login-split-left { display: none !important; }
          .login-split-right { width: 100% !important; max-width: 100% !important; padding: 48px 24px 60px !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Orbes fond */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #6C63FF, transparent)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #00C896, transparent)', top: '5%', left: '5%' }} />
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
        <Link to="/register" style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #6C63FF, #00C896)', borderRadius: 9, color: 'white', fontSize: 14, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(108,99,255,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
          S'inscrire gratuitement
        </Link>
      </motion.nav>

      {/* CORPS */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', paddingTop: 64, position: 'relative', zIndex: 1 }}>

        {/* GAUCHE — branding */}
        <motion.div className="login-split-left"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px, 8vw, 100px) clamp(40px, 6vw, 100px)', borderRight: '1px solid rgba(0,0,0,0.05)' }}>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: '#6C63FF', fontWeight: 600, width: 'fit-content' }}>
            <Sparkles size={13} strokeWidth={2} />
            Propulsé par l'Intelligence Artificielle
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            style={{ fontSize: 'clamp(40px, 5vw, 66px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-3px', marginBottom: 22, fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a' }}>
            Organisez.{' '}
            <span className="gradient-text">Automatisez.</span>
            <br />Performez.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            style={{ fontSize: 17, color: '#64748b', maxWidth: 460, lineHeight: 1.75, marginBottom: 48, fontWeight: 400 }}>
            GetShift combine la gestion de tâches et l'IA pour vous aider à accomplir plus, en moins de temps.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ display: 'flex', gap: 40 }}>
            {[{ val: '10k+', label: 'Utilisateurs actifs' }, { val: '4.9/5', label: 'Satisfaction' }, { val: '100%', label: 'Gratuit' }].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.val}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* DROITE — formulaire */}
        <motion.div className="login-split-right"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          style={{ width: 'min(480px, 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(48px, 6vw, 80px) clamp(24px, 5vw, 60px)', background: 'white', boxShadow: '-1px 0 0 rgba(0,0,0,0.04)' }}>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.6px', marginBottom: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Bon retour.
            </h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>Connectez-vous à votre espace GetShift.</p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="tf-label">Adresse e-mail</label>
            <input className="tf-input" type="email" placeholder="vous@exemple.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label className="tf-label">Mot de passe</label>
            <input className="tf-input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 22 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none' }}>
              Mot de passe oublié ?
            </Link>
          </div>

          <AnimatePresence>
            {erreur && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14, lineHeight: 1.5 }}>
                {erreur}
                {nonVerifie && (
                  <button onClick={renvoyerEmail}
                    style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', color: '#6C63FF', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                    Renvoyer l'email de vérification
                  </button>
                )}
              </motion.div>
            )}
            {renvoyeMsg && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#16A34A', fontSize: 13, marginBottom: 14 }}>
                {renvoyeMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* CTA principal */}
          <button className="tf-btn-main" onClick={login} disabled={loading}>
            {loading ? 'Connexion...' : <><span>Se connecter</span><ArrowRight size={16}/></>}
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

          <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 24 }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>
              S'inscrire gratuitement
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginInner />
    </GoogleOAuthProvider>
  )
}
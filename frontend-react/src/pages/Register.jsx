import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { applyTheme } from '../useTheme'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { ArrowRight, Sparkles } from 'lucide-react'
import GetShiftLogoKick from '../components/GetShiftLogoKick'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'
const GOOGLE_CLIENT_ID = '149080640376-8t2ah2odllgq6t83795dafhdgrajbh61.apps.googleusercontent.com'

function RegisterInner() {
  const { t } = useTranslation()
  const [form, setForm]       = useState({ nom: '', email: '', password: '', password2: '' })
  const [erreur, setErreur]   = useState('')
  const [succes, setSucces]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const register = async () => {
    if (!form.nom || !form.email || !form.password) { setErreur(t('auth.err_fill_all')); return }
    if (form.password !== form.password2) { setErreur(t('auth.err_password_mismatch')); return }
    if (form.password.length < 6) { setErreur(t('auth.err_password_6')); return }
    setLoading(true); setErreur('')
    try {
      const pendingCode = (() => { try { return localStorage.getItem('pending_invite_code') } catch { return null } })()
      await axios.post(`${API}/register`, {
        nom: form.nom, email: form.email, password: form.password,
        invite_code: pendingCode || undefined,
      })
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
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          withCredentials: false
        })
        const pendingCode = (() => { try { return localStorage.getItem('pending_invite_code') } catch { return null } })()
        const res = await axios.post(`${API}/auth/google`, {
          google_id: userInfo.data.sub,
          email: userInfo.data.email,
          nom: userInfo.data.name,
          avatar: userInfo.data.picture,
          invite_code: pendingCode || undefined,
        }, { withCredentials: true })
        if (res.data.access_token) localStorage.setItem('access_token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        applyTheme(res.data.user.theme || 'light')
        if (res.data.equipes_rejointes && res.data.equipes_rejointes.length > 0) {
          try { localStorage.removeItem('pending_invite_code') } catch {}
        }
        navigate(pendingCode ? `/collaboration?code=${encodeURIComponent(pendingCode)}` : '/dashboard')
      } catch (err) {
        setErreur(err.response?.data?.erreur || 'Erreur Google')
      }
      setGLoading(false)
    },
    onError: () => setErreur(t('auth.err_google_signup_cancelled')),
    flow: 'implicit',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflowX: 'hidden',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .ember-text { background: linear-gradient(135deg, var(--ember), var(--ember-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .tf-input { width: 100%; padding: 13px 16px; background: var(--surface-1); border: 1.5px solid var(--border-default); border-radius: 10px; color: var(--text-primary); font-size: 16px; font-family: var(--font-ui); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .tf-input:focus { border-color: var(--ember); box-shadow: 0 0 0 3px var(--ember-soft); }
        .tf-input::placeholder { color: var(--text-tertiary); }
        .tf-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 7px; }
        .tf-btn-main { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--ember), var(--ember-hover)); color: var(--text-on-ember); border: none; border-radius: 11px; font-size: 15px; font-weight: 700; font-family: var(--font-ui); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: var(--shadow-ember); transition: filter 0.15s, transform 0.1s; }
        .tf-btn-main:hover { filter: brightness(1.08); }
        .tf-btn-main:active { transform: scale(0.99); }
        .tf-btn-main:disabled { opacity: 0.6; cursor: not-allowed; }
        .tf-btn-google { width: 100%; padding: 13px 16px; background: var(--text-primary); color: var(--bg-base); border: none; border-radius: 11px; font-size: 14px; font-weight: 500; font-family: var(--font-ui); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: filter 0.15s, transform 0.1s; box-shadow: var(--shadow-md); }
        .tf-btn-google:hover { filter: brightness(1.12); }
        .tf-btn-google:active { transform: scale(0.99); }
        .tf-btn-google:disabled { opacity: 0.6; cursor: not-allowed; }
        .tf-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0; }
        .tf-divider-line { flex: 1; height: 1px; background: var(--border-default); }
        .tf-divider-text { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }
        .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        @media (max-width: 960px) {
          .reg-split-left { display: none !important; }
          .reg-split-right { width: 100% !important; max-width: 100% !important; padding: 48px 24px 60px !important; box-shadow: none !important; }
          .reg-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Orbes fond — ember subtils */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, var(--ember), transparent)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', opacity: 0.03, background: 'radial-gradient(circle, var(--ember-hover), transparent)', bottom: '5%', right: '5%' }} />
      </div>

      {/* NAVBAR */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, padding: '0 clamp(20px, 5vw, 80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <GetShiftLogoKick markSize={34} gap={10} wordStyle={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px' }} />
        </Link>
        <Link to="/" style={{ padding: '8px 20px', background: 'transparent', border: '1.5px solid var(--border-default)', borderRadius: 9, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: 'var(--font-ui)' }}>
          Se connecter
        </Link>
      </motion.nav>

      {/* CORPS */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', paddingTop: 64, position: 'relative', zIndex: 1 }}>

        {/* GAUCHE */}
        <motion.div className="reg-split-left"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(60px, 8vw, 100px) clamp(40px, 6vw, 100px)', borderRight: '1px solid var(--border-subtle)' }}>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: 'var(--ember)', fontWeight: 600, width: 'fit-content' }}>
            <Sparkles size={13} strokeWidth={2} />
            {t('auth.free_no_card')}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
            style={{ fontSize: 'clamp(40px, 5vw, 66px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-3px', marginBottom: 22, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>
            {t('auth.hero1')}{' '}
            <span className="ember-text">{t('auth.hero2')}</span>
            <br />{t('auth.hero3')}
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            style={{ fontSize: 17, color: 'var(--text-secondary)', maxWidth: 460, lineHeight: 1.75, marginBottom: 44, fontWeight: 400 }}>
            {t('auth.hero_subtitle_register')}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {[
              { titre: t('nav.collaboration'), desc: t('auth.feat_collab_desc') },
              { titre: t('auth.feat_report_title'), desc: t('auth.feat_report_desc') },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4.5L4 7.5L10 1" stroke="var(--text-on-ember)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.titre}</strong> — {f.desc}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* DROITE — formulaire */}
        <motion.div className="reg-split-right"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          style={{ width: 'min(500px, 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(48px, 6vw, 72px) clamp(24px, 5vw, 60px)', background: 'var(--surface-1)', boxShadow: '-1px 0 0 var(--border-subtle)', overflowY: 'auto' }}>

          <AnimatePresence mode="wait">
            {succes ? (
              <motion.div key="succes" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                    <path d="M2 10L8.5 16.5L22 2" stroke="var(--ember)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>{t('auth.account_created')}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                  {t('auth.check_email_full')}<br/>{t('auth.check_spam_short')}
                </p>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))', color: 'var(--text-on-ember)', borderRadius: 11, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow-ember)' }}>
                  {t('auth.login')} <ArrowRight size={16}/>
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>
                    {t('auth.create_account_title')}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('auth.free_forever')}</p>
                </div>

                <div className="reg-row">
                  <div>
                    <label className="tf-label">{t('auth.name')}</label>
                    <input className="tf-input" type="text" name="nom" placeholder={t('auth.name_ph')} value={form.nom} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                  <div>
                    <label className="tf-label">{t('auth.email_address')}</label>
                    <input className="tf-input" type="email" name="email" placeholder={t('auth.email_ph')} value={form.email} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                </div>

                <div className="reg-row">
                  <div>
                    <label className="tf-label">{t('auth.password')}</label>
                    <input className="tf-input" type="password" name="password" placeholder={t('auth.password_ph_6')} value={form.password} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                  <div>
                    <label className="tf-label">{t('auth.confirm_short')}</label>
                    <input className="tf-input" type="password" name="password2" placeholder={t('auth.repeat_ph')} value={form.password2} onChange={handleChange} onKeyDown={e => e.key === 'Enter' && register()} />
                  </div>
                </div>

                <AnimatePresence>
                  {erreur && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 14 }}>
                      {erreur}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button className="tf-btn-main" onClick={register} disabled={loading}>
                  {loading ? t('auth.creating') : <><span>{t('auth.create_account')}</span><ArrowRight size={16}/></>}
                </button>

                <div className="tf-divider">
                  <div className="tf-divider-line" />
                  <span className="tf-divider-text">{t('common.or')}</span>
                  <div className="tf-divider-line" />
                </div>

                <button className="tf-btn-google" onClick={() => googleLogin()} disabled={gLoading}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {gLoading ? t('auth.connecting') : t('auth.login_with_google')}
                </button>

                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
                  {t('auth.terms_prefix')}{' '}
                  <Link to="/cgu" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>{t('auth.terms')}</Link>
                </p>

                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 16 }}>
                  {t('auth.already_account_q')}{' '}
                  <Link to="/" style={{ color: 'var(--ember)', fontWeight: 600, textDecoration: 'none' }}>
                    {t('auth.login')}
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

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Mail } from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'
import axios from 'axios'

const API = 'https://getshift-backend.onrender.com'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email) { setErreur(t('auth.err_enter_email')); return }
    setLoading(true)
    setErreur('')
    try {
      await axios.post(`${API}/forgot-password`, { email })
      setSucces(t('auth.forgot_success'))
    } catch (err) {
      setErreur(err.response?.data?.erreur || 'Erreur lors de l\'envoi')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden',
      position: 'relative',
      padding: '20px',
      color: 'var(--text-primary)',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .fp-input { width: 100%; padding: 13px 16px; background: var(--surface-1); border: 1.5px solid var(--border-default); border-radius: 10px; color: var(--text-primary); font-size: 15px; font-family: var(--font-ui); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .fp-input:focus { border-color: var(--ember); box-shadow: 0 0 0 3px var(--ember-soft); }
        .fp-input::placeholder { color: var(--text-tertiary); }
      `}</style>

      {/* Orbes fond ember subtils */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, var(--ember), transparent)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', opacity: 0.03, background: 'radial-gradient(circle, var(--ember-hover), transparent)', top: '5%', right: '10%' }} />
      </div>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, position: 'relative', zIndex: 2 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <GetShiftMark size={34} />
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>GetShift</span>
        </Link>
      </motion.div>

      {/* Carte */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: 'clamp(32px, 6vw, 48px)',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          zIndex: 2,
        }}>

        {/* Icône */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Mail size={22} color="var(--ember)" strokeWidth={1.8} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 8 }}>
          {t('auth.forgot_title')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          {t('auth.forgot_subtitle')}
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 7 }}>
            {t('auth.email_address')}
          </label>
          <input
            className="fp-input"
            type="email"
            placeholder={t('auth.email_ph')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <AnimatePresence>
          {erreur && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 9, padding: '10px 14px', color: 'var(--danger)', marginBottom: 16, fontSize: 13 }}>
              {erreur}
            </motion.p>
          )}
          {succes && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 9, padding: '10px 14px', color: 'var(--success)', marginBottom: 16, fontSize: 13 }}>
              {succes}
            </motion.p>
          )}
        </AnimatePresence>

        <button onClick={handleSubmit} disabled={loading || !!succes} style={{
          width: '100%', background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))',
          border: 'none', borderRadius: 11, padding: '14px 18px',
          color: 'var(--text-on-ember)', fontWeight: 700, cursor: loading || succes ? 'not-allowed' : 'pointer',
          opacity: loading || succes ? 0.7 : 1, fontSize: 15, fontFamily: 'var(--font-ui)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: 'var(--shadow-ember)', transition: 'filter 0.15s, opacity 0.15s',
        }}
          onMouseEnter={e => { if (!loading && !succes) e.currentTarget.style.filter = 'brightness(1.08)' }}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
          {loading ? t('auth.sending') : <><span>{t('auth.send_link')}</span><ArrowRight size={16} /></>}
        </button>

        <p style={{ color: 'var(--text-tertiary)', marginTop: 22, fontSize: 13, textAlign: 'center' }}>
          <Link to="/" style={{ color: 'var(--ember)', textDecoration: 'none', fontWeight: 600 }}>{t('auth.back_to_login')}</Link>
        </p>
      </motion.div>
    </div>
  )
}

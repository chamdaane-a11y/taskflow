import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Bot, BarChart2, Sparkles } from 'lucide-react'
import GetShiftMark from '../components/GetShiftMark'

export default function Splash() {
  const { t } = useTranslation()
  const [etape, setEtape] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const timers = [
      setTimeout(() => setEtape(1), 700),
      setTimeout(() => setEtape(2), 1400),
      setTimeout(() => setEtape(3), 2100),
      setTimeout(() => navigate('/login'), 3600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const features = [
    { icon: CheckSquare, text: t('misc.splash_organize') },
    { icon: Bot,         text: t('misc.splash_ai') },
    { icon: BarChart2,   text: t('misc.splash_analytics') },
  ]

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
      color: 'var(--text-primary)',
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ember-text {
          background: linear-gradient(135deg, var(--ember), var(--ember-hover));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
      `}</style>

      {/* Orbes de fond — ember subtils */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.05, background: 'radial-gradient(circle, var(--ember), transparent)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, var(--ember-hover), transparent)', top: '5%', left: '5%' }}
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', opacity: 0.03, background: 'radial-gradient(circle, var(--ember), transparent)', bottom: '8%', right: '8%' }}
        />
      </div>

      {/* Badge IA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'var(--ember-soft)', border: '1px solid var(--ember-ring)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: 'var(--ember)', fontWeight: 600, zIndex: 2 }}
      >
        <Sparkles size={13} strokeWidth={2} />
        Propulsé par l'Intelligence Artificielle
      </motion.div>

      {/* Logo + nom */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, zIndex: 2 }}
      >
        <motion.div
          animate={{ boxShadow: ['var(--shadow-ember)', '0 8px 40px rgba(184,82,28,0.35)', 'var(--shadow-ember)'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ marginBottom: 22, borderRadius: 22, boxShadow: 'var(--shadow-ember)' }}
        >
          <GetShiftMark size={80} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1, marginBottom: 10, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', textAlign: 'center' }}
        >
          Get<span className="ember-text">Shift</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ fontSize: 14, color: 'var(--text-tertiary)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, textAlign: 'center' }}
        >
          Organize · Automate · Perform
        </motion.p>
      </motion.div>

      {/* Features pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 56, zIndex: 2, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <AnimatePresence key={i}>
              {etape > i && (
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'var(--surface-1)', border: '1.5px solid var(--border-default)', borderRadius: 99, boxShadow: 'var(--shadow-xs)' }}
                >
                  <Icon size={13} color="var(--ember)" strokeWidth={2} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{f.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>

      {/* Barre de progression */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ width: 200, height: 3, background: 'var(--border-default)', borderRadius: 99, overflow: 'hidden', zIndex: 2 }}
      >
        <motion.div
          initial={{ width: '0%' }} animate={{ width: '100%' }}
          transition={{ duration: 3.2, ease: 'easeInOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, var(--ember), var(--ember-hover))', borderRadius: 99 }}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 14, letterSpacing: 0.5, zIndex: 2 }}
      >
        Chargement...
      </motion.p>

      <motion.button
        onClick={() => navigate('/landing')}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.03 }}
        style={{ position: 'absolute', bottom: 36, zIndex: 2, background: 'transparent', border: '1.5px solid var(--border-default)', borderRadius: 99, padding: '9px 22px', color: 'var(--text-tertiary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}
      >
        Voir la présentation
      </motion.button>
    </div>
  )
}

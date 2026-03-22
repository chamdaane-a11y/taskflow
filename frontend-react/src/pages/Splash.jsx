import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, CheckSquare, Bot, BarChart2, Sparkles } from 'lucide-react'

export default function Splash() {
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
    { icon: CheckSquare, text: 'Organisez vos tâches' },
    { icon: Bot,         text: 'Assistant IA intégré' },
    { icon: BarChart2,   text: 'Analytics & performance' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #ffffff 0%, #F8F9FC 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      position: 'relative',
      color: '#0f172a',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .gradient-text {
          background: linear-gradient(135deg, #6C63FF, #00C896);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
      `}</style>

      {/* Orbes de fond — identiques au Landing */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', opacity: 0.05, background: 'radial-gradient(circle, #6C63FF, transparent)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #00C896, transparent)', top: '5%', left: '5%' }}
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', opacity: 0.04, background: 'radial-gradient(circle, #6C63FF, transparent)', bottom: '8%', right: '8%' }}
        />
      </div>

      {/* Badge IA — identique au Landing */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 99, marginBottom: 28, fontSize: 13, color: '#6C63FF', fontWeight: 600, zIndex: 2 }}
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
        {/* Icône */}
        <motion.div
          animate={{ boxShadow: ['0 8px 32px rgba(108,99,255,0.18)', '0 8px 40px rgba(0,200,150,0.28)', '0 8px 32px rgba(108,99,255,0.18)'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ width: 80, height: 80, borderRadius: 22, background: 'linear-gradient(135deg, #6C63FF, #00C896)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: '0 8px 32px rgba(108,99,255,0.22)' }}
        >
          <Layers size={34} color="white" strokeWidth={2.5} />
        </motion.div>

        {/* Nom */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1, marginBottom: 10, fontFamily: "'Bricolage Grotesque', sans-serif", color: '#0f172a', textAlign: 'center' }}
        >
          Get<span className="gradient-text">Shift</span>
        </motion.h1>

        {/* Slogan */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ fontSize: 14, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, textAlign: 'center' }}
        >
          Organize · Automate · Perform
        </motion.p>
      </motion.div>

      {/* Features pills — apparition progressive */}
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
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 99, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
                >
                  <Icon size={13} color="#6C63FF" strokeWidth={2} />
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{f.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>

      {/* Barre de progression — style Landing */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ width: 200, height: 3, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', zIndex: 2 }}
      >
        <motion.div
          initial={{ width: '0%' }} animate={{ width: '100%' }}
          transition={{ duration: 3.2, ease: 'easeInOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #6C63FF, #00C896)', borderRadius: 99 }}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        style={{ fontSize: 12, color: '#94a3b8', marginTop: 14, letterSpacing: 0.5, zIndex: 2 }}
      >
        Chargement...
      </motion.p>

      {/* Lien Landing — discret en bas */}
      <motion.button
        onClick={() => navigate('/landing')}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.03 }}
        style={{ position: 'absolute', bottom: 36, zIndex: 2, background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: 99, padding: '9px 22px', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
      >
        Voir la présentation
      </motion.button>
    </div>
  )
}
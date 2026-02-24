import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, CheckSquare, Bot, BarChart2 } from 'lucide-react'

export default function Splash() {
  const [etape, setEtape] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const timers = [
      setTimeout(() => setEtape(1), 800),
      setTimeout(() => setEtape(2), 1600),
      setTimeout(() => setEtape(3), 2400),
      setTimeout(() => navigate('/login'), 3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const features = [
    { icon: CheckSquare, text: 'Organisez vos tâches' },
    { icon: Bot, text: 'IA intégrée' },
    { icon: BarChart2, text: 'Analytics avancés' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', position: 'relative' }}>

      {/* Blobs animés */}
      {[...Array(3)].map((_, i) => (
        <motion.div key={i} style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.15, background: i === 0 ? '#6c63ff' : i === 1 ? '#c9a84c' : '#4caf82', width: i === 0 ? 500 : i === 1 ? 350 : 250, height: i === 0 ? 500 : i === 1 ? 350 : 250, left: i === 0 ? '-5%' : i === 1 ? '55%' : '25%', top: i === 0 ? '-5%' : i === 1 ? '40%' : '10%', pointerEvents: 'none' }}
          animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Logo */}
      <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 48 }}
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>

        <motion.div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #c9a84c, #6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 0 60px rgba(201,168,76,0.3)' }}
          animate={{ boxShadow: ['0 0 40px rgba(201,168,76,0.2)', '0 0 80px rgba(108,99,255,0.4)', '0 0 40px rgba(201,168,76,0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}>
          <Layers size={36} color="white" strokeWidth={2.5} />
        </motion.div>

        <motion.h1 style={{ fontSize: 42, fontWeight: 800, color: 'white', letterSpacing: '-2px', marginBottom: 8 }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          TaskFlow
        </motion.h1>

        <motion.p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Productivité augmentée par l'IA
        </motion.p>
      </motion.div>

      {/* Features qui apparaissent une par une */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 64 }}>
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <AnimatePresence key={i}>
              {etape > i && (
                <motion.div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99 }}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <Icon size={14} color='rgba(255,255,255,0.5)' strokeWidth={1.8} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{f.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>

      {/* Barre de progression */}
      <motion.div style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, #c9a84c, #6c63ff)', borderRadius: 99 }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3.4, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 16, letterSpacing: 1 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        Chargement...
      </motion.p>
    </div>
  )
}

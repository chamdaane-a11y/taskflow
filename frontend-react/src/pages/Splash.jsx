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
    { icon: CheckSquare, text: 'Organisez vos tâches intelligemment' },
    { icon: Bot, text: 'Assistant IA intégré' },
    { icon: BarChart2, text: 'Analyse et performance' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#05050A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* Image de fond subtile */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.05,
        filter: 'brightness(0.5)',
        zIndex: 0
      }} />

      {/* Bulles dynamiques */}
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} style={{
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(120px)',
          opacity: 0.1,
          background: i === 0 ? '#00C896' : i === 1 ? '#6C63FF' : i === 2 ? '#FFD166' : '#00C896',
          width: i === 0 ? 400 : i === 1 ? 500 : i === 2 ? 300 : 350,
          height: i === 0 ? 400 : i === 1 ? 500 : i === 2 ? 300 : 350,
          left: i === 0 ? '10%' : i === 1 ? '70%' : i === 2 ? '40%' : '20%',
          top: i === 0 ? '10%' : i === 1 ? '60%' : i === 2 ? '30%' : '80%',
          zIndex: 0
        }}
          animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Logo principal */}
      <motion.div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 48,
        zIndex: 2
      }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div style={{
          width: 90,
          height: 90,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #00C896, #6C63FF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 0 80px rgba(0,200,150,0.3)'
        }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(0,200,150,0.2)',
              '0 0 80px rgba(108,99,255,0.4)',
              '0 0 40px rgba(0,200,150,0.2)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Layers size={38} color="white" strokeWidth={2.5} />
        </motion.div>

        <motion.h1 style={{
          fontSize: 46,
          fontWeight: 800,
          color: 'white',
          letterSpacing: '-2px',
          marginBottom: 8,
          textShadow: '0 0 20px rgba(108,99,255,0.3)'
        }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          TaskFlow
        </motion.h1>

        <motion.p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 500
        }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Productivité augmentée par l’IA
        </motion.p>
      </motion.div>

      {/* Features */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 64, zIndex: 2 }}>
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <AnimatePresence key={i}>
              {etape > i && (
                <motion.div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 18px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 99,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 20px rgba(0,200,150,0.1)'
                }}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Icon size={14} color='rgba(255,255,255,0.6)' strokeWidth={1.8} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{f.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>

      {/* Barre de progression */}
      <motion.div style={{
        width: 220,
        height: 3,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 99,
        overflow: 'hidden',
        zIndex: 2
      }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #00C896, #6C63FF)',
          borderRadius: 99
        }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3.4, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.p style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        marginTop: 16,
        letterSpacing: 1,
        zIndex: 2
      }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Chargement...
      </motion.p>

      <motion.button
        onClick={() => navigate('/landing')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.05 }}
        style={{
          position: 'absolute',
          bottom: 40,
          zIndex: 2,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 99,
          padding: '10px 24px',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500
        }}
      >
        🌐 Voir la présentation
      </motion.button>
    </div>
  )
}
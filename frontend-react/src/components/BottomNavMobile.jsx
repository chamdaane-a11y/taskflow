// BottomNavMobile.jsx — barre de nav iOS-style permanente sur mobile
import { memo, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Bot, Plus, Calendar, BarChart2 } from 'lucide-react'

export const BOTTOM_NAV_HEIGHT = 64

const BottomNavMobile = memo(function BottomNavMobile({ T, onCreateTask, hidden = false, highlightIa: highlightIaProp = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [highlightIaEvent, setHighlightIaEvent] = useState(false)

  useEffect(() => {
    const onHighlight = (e) => setHighlightIaEvent(!!e.detail?.active)
    window.addEventListener('gs:guide-highlight-ia', onHighlight)
    return () => window.removeEventListener('gs:guide-highlight-ia', onHighlight)
  }, [])

  const highlightIa = highlightIaProp || highlightIaEvent

  if (hidden) return null

  const handleFab = () => {
    if (onCreateTask) onCreateTask()
    else navigate('/dashboard', { state: { openAddSheet: true } })
  }

  const isOnDashboard = location.pathname === '/dashboard'
  const isOnIa        = location.pathname === '/ia'
  const isOnPlanning  = location.pathname === '/planification'
  const isOnAnalytics = location.pathname === '/analytics'

  const itemBase = {
    flex: 1, minWidth: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 3, padding: '8px 2px 10px',
    background: 'transparent', border: 'none',
    cursor: 'pointer', position: 'relative',
    fontFamily: 'var(--font-ui)',
    touchAction: 'manipulation',
  }

  const renderItem = (key, { Icon, label, active, onClick, pulse = false, tourId }) => (
    <motion.button
      key={key}
      data-tour={tourId}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      animate={pulse ? {
        boxShadow: [
          '0 0 0 0 rgba(232,98,42,0.55)',
          '0 0 0 10px rgba(232,98,42,0)',
          '0 0 0 0 rgba(232,98,42,0)',
        ],
      } : {}}
      transition={pulse ? { duration: 1.6, repeat: Infinity } : {}}
      style={{
        ...itemBase,
        color: active || pulse ? 'var(--ember)' : 'var(--text-tertiary)',
        borderRadius: pulse ? 12 : undefined,
      }}>
      {active && (
        <motion.div layoutId="bottomNavActive"
          style={{
            position: 'absolute', top: 4,
            width: 32, height: 26, borderRadius: 99,
            background: 'var(--ember-soft)', zIndex: -1,
          }} />
      )}
      {pulse && !active && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{
            position: 'absolute', top: 4,
            width: 32, height: 26, borderRadius: 99,
            background: 'var(--ember-soft)', zIndex: -1,
          }} />
      )}
      <Icon size={19} strokeWidth={active || pulse ? 2.4 : 1.9} />
      <span style={{
        fontSize: 9.5,
        fontWeight: active || pulse ? 700 : 500,
        letterSpacing: 0.1,
        maxWidth: '100%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
    </motion.button>
  )

  return (
    <motion.nav
      data-guide="mobile-nav"
      initial={{ y: 80 }} animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 95,
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex', alignItems: 'stretch',
      }}>
      {renderItem('home', { Icon: LayoutDashboard, label: 'Accueil', active: isOnDashboard, onClick: () => navigate('/dashboard') })}
      {renderItem('ia', {
        Icon: Bot,
        label: 'GetShift AI',
        active: isOnIa,
        pulse: highlightIa,
        tourId: 'nav-ia',
        onClick: () => navigate('/ia'),
      })}

      {/* FAB central */}
      <motion.button
        onClick={handleFab}
        whileTap={{ scale: 0.92 }}
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start',
          background: 'transparent', border: 'none',
          cursor: 'pointer', position: 'relative',
          padding: '6px 2px 10px',
          touchAction: 'manipulation',
        }}>
        <div style={{
          width: 44, height: 44, marginTop: -14,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-ember)',
          flexShrink: 0,
        }}>
          <Plus size={20} color="var(--text-on-ember)" strokeWidth={2.6} />
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 700,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.1, marginTop: 4,
          maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-ui)',
        }}>Ajouter</span>
      </motion.button>

      {renderItem('plan',  { Icon: Calendar,  label: 'Planning', active: isOnPlanning,  onClick: () => navigate('/planification') })}
      {renderItem('stats', { Icon: BarChart2, label: 'Stats',    active: isOnAnalytics, onClick: () => navigate('/analytics') })}
    </motion.nav>
  )
})

export default BottomNavMobile

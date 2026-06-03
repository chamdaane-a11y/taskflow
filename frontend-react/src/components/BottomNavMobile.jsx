// BottomNavMobile.jsx — barre de nav iOS-style permanente sur mobile
import { memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Heart, Plus, Calendar, BarChart2 } from 'lucide-react'

export const BOTTOM_NAV_HEIGHT = 64

const BottomNavMobile = memo(function BottomNavMobile({ T, onCreateTask, onOpenCoach, hidden = false }) {
  const navigate = useNavigate()
  const location = useLocation()

  if (hidden) return null

  const handleFab = () => {
    if (onCreateTask) onCreateTask()
    else navigate('/dashboard', { state: { openAddSheet: true } })
  }
  const handleCoach = () => {
    if (onOpenCoach) onOpenCoach()
    else navigate('/dashboard', { state: { openCoach: true } })
  }

  const isOnDashboard = location.pathname === '/dashboard'
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

  const renderItem = (key, { Icon, label, active, onClick }) => (
    <motion.button key={key} onClick={onClick} whileTap={{ scale: 0.92 }}
      style={{ ...itemBase, color: active ? 'var(--ember)' : 'var(--text-tertiary)' }}>
      {active && (
        <motion.div layoutId="bottomNavActive"
          style={{
            position: 'absolute', top: 4,
            width: 32, height: 26, borderRadius: 99,
            background: 'var(--ember-soft)', zIndex: -1,
          }} />
      )}
      <Icon size={19} strokeWidth={active ? 2.4 : 1.9}
        fill={active && Icon === Heart ? 'var(--ember)' : 'none'} />
      <span style={{
        fontSize: 9.5,
        fontWeight: active ? 700 : 500,
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
      {renderItem('home',  { Icon: LayoutDashboard, label: 'Accueil',  active: isOnDashboard, onClick: () => navigate('/dashboard') })}
      {renderItem('coach', { Icon: Heart,            label: 'Coach',    active: false,          onClick: handleCoach })}

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
      {renderItem('stats', { Icon: BarChart2, label: 'Analytics', active: isOnAnalytics, onClick: () => navigate('/analytics') })}
    </motion.nav>
  )
})

export default BottomNavMobile

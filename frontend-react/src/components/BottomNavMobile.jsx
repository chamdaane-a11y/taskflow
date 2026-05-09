// BottomNavMobile.jsx — barre de nav iOS-style permanente sur mobile
// 5 items : Accueil / Coach / + (FAB central) / Planning / Stats

import { memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Bot, Plus, Calendar, BarChart2 } from 'lucide-react'

export const BOTTOM_NAV_HEIGHT = 64 // utilisé par les pages pour ajuster le padding

const ITEMS = [
  { path: '/dashboard',     icon: LayoutDashboard, label: 'Accueil' },
  { path: '/ia',            icon: Bot,             label: 'Coach' },
  { fab: true,              icon: Plus,            label: 'Ajouter' },
  { path: '/planification', icon: Calendar,        label: 'Planning' },
  { path: '/analytics',     icon: BarChart2,       label: 'Stats' },
]

const BottomNavMobile = memo(function BottomNavMobile({ T, onCreateTask, hidden = false }) {
  const navigate = useNavigate()
  const location = useLocation()

  if (hidden) return null

  const accent = T?.accent || '#6c63ff'
  const accent2 = T?.accent2 || accent
  const bg = T?.bg2 || '#1a1a2e'
  const border = T?.border || 'rgba(255,255,255,0.08)'
  const text = T?.text || '#fff'
  const text2 = T?.text2 || 'rgba(255,255,255,0.5)'

  const handleFab = () => {
    if (onCreateTask) {
      onCreateTask()
    } else {
      // Sur les pages autres que Dashboard, on retourne au Dashboard avec
      // un state pour ouvrir le bottom sheet d'ajout direct
      navigate('/dashboard', { state: { openAddSheet: true } })
    }
  }

  return (
    <motion.nav
      initial={{ y: 80 }} animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 95,
        background: `${bg}f5`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: `1px solid ${border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        alignItems: 'stretch',
      }}>
      {ITEMS.map((item, i) => {
        if (item.fab) {
          return (
            <motion.button
              key="fab"
              onClick={handleFab}
              whileTap={{ scale: 0.92 }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                paddingTop: 4, paddingBottom: 4,
              }}>
              <div style={{
                position: 'absolute',
                top: -18,
                width: 52, height: 52,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${accent}, ${accent2})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 22px ${accent}55, 0 0 0 4px ${bg}`,
              }}>
                <Plus size={24} color="#fff" strokeWidth={2.6} />
              </div>
              <span style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: text2,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                marginTop: 38,
              }}>{item.label}</span>
            </motion.button>
          )
        }

        const active = location.pathname === item.path
        const Icon = item.icon
        const itemColor = active ? accent : text2

        return (
          <motion.button
            key={item.path}
            onClick={() => navigate(item.path)}
            whileTap={{ scale: 0.92 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 2px 10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: itemColor,
              position: 'relative',
            }}>
            {/* Pastille active : fond accent translucide */}
            {active && (
              <motion.div
                layoutId="bottomNavActive"
                style={{
                  position: 'absolute',
                  top: 4,
                  width: 36, height: 28,
                  borderRadius: 99,
                  background: `${accent}18`,
                  zIndex: -1,
                }}
              />
            )}
            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              color: itemColor,
              letterSpacing: 0.2,
            }}>{item.label}</span>
          </motion.button>
        )
      })}
    </motion.nav>
  )
})

export default BottomNavMobile

// MobileBackButton.jsx — flèche retour mobile vers /dashboard
// Affichée uniquement sur mobile sur les pages secondaires (sidebar items)

import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

const MobileBackButton = memo(function MobileBackButton({ T, label = 'Retour', to = '/dashboard' }) {
  const navigate = useNavigate()
  const accent = T?.accent || '#6c63ff'
  const bg = T?.bg2 || '#1a1a2e'
  const border = T?.border || 'rgba(255,255,255,0.08)'
  const text = T?.text || '#fff'

  return (
    <motion.button
      onClick={() => navigate(to)}
      whileTap={{ scale: 0.94 }}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 12px)',
        left: 12,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px 8px 8px',
        background: `${bg}f0`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${border}`,
        borderRadius: 99,
        color: text,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      }}>
      <ChevronLeft size={16} strokeWidth={2.4} color={accent} />
      {label}
    </motion.button>
  )
})

export default MobileBackButton

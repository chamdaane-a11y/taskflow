// MobileBackButton.jsx — flèche retour mobile vers /dashboard
// Affichée uniquement sur mobile sur les pages secondaires (sidebar items)

import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

const MobileBackButton = memo(function MobileBackButton({ label = 'Retour', to = '/dashboard' }) {
  const navigate = useNavigate()

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
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        borderRadius: 99,
        color: 'var(--text-primary)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}>
      <ChevronLeft size={16} strokeWidth={2.4} color="var(--ember)" />
      {label}
    </motion.button>
  )
})

export default MobileBackButton

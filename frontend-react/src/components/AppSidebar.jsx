import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Bot, BarChart2, Calendar, Users, HelpCircle, Sparkles, Flag,
  Layers, PanelLeftClose, PanelLeftOpen, ChevronUp, User, Settings, Star, LogOut
} from 'lucide-react'

export const SIDEBAR_W = 248

export const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
  { icon: Bot,             label: 'Assistant IA',    path: '/ia' },
  { icon: Sparkles,        label: 'Tomorrow Builder',path: '/tomorrow' },
  { icon: Flag,            label: 'Goal Reverse',    path: '/goal' },
  { icon: BarChart2,       label: 'Analytiques',     path: '/analytics' },
  { icon: Calendar,        label: 'Planification',   path: '/planification' },
  { icon: Users,           label: 'Collaboration',   path: '/collaboration' },
  { icon: HelpCircle,      label: 'Aide',            path: '/help' },
]

// Hook for sidebar open state, synced with localStorage
export function useSidebarState(isMobile) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }
  return { sidebarOpen, setSidebarOpen, toggleSidebar }
}

// Floating GetShift logo — shown when sidebar is closed (so the logo is always visible)
export function FloatingLogo({ T, sidebarOpen, isMobile, onClick }) {
  if (sidebarOpen) return null
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'fixed', top: 14, left: 56, zIndex: 199,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px 8px',
        background: T.bg2, border: `1px solid ${T.border}`,
        borderRadius: 10, cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      title="Ouvrir la sidebar">
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Layers size={14} color={T.bg} strokeWidth={2.5} />
      </div>
      {!isMobile && (
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: '-0.3px' }}>GetShift</span>
      )}
    </motion.button>
  )
}

// Toggle button — always at top-left, position adapts to sidebar state
export function SidebarToggle({ T, sidebarOpen, isMobile, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      animate={{ left: !isMobile && sidebarOpen ? SIDEBAR_W + 12 : 12 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      style={{
        position: 'fixed', top: 14, zIndex: 200,
        width: 36, height: 36, borderRadius: 10,
        background: T.bg2, border: `1px solid ${T.border}`,
        color: T.text2, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      whileHover={{ color: T.accent, borderColor: T.accent }}>
      {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
    </motion.button>
  )
}

// Profile menu dropdown — extracted for reuse
function ProfileMenu({ T, user, niveau, points, streak, niveauActuel, pctNiveau, showProfileMenu, setShowProfileMenu, navigate }) {
  return (
    <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
      <motion.button onClick={() => setShowProfileMenu(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', borderRadius: 12,
          background: showProfileMenu ? `${T.accent}15` : T.bg3,
          border: `1.5px solid ${showProfileMenu ? T.accent + '60' : T.border}`,
          cursor: 'pointer', textAlign: 'left'
        }}
        whileHover={{ background: `${T.accent}12` }}>
        <div style={{
          width: 34, height: 34,
          background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
          color: T.bg, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 15, flexShrink: 0
        }}>
          {user?.nom?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.nom}
          </div>
          <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>
            Niveau {niveau} · {points} pts
          </div>
        </div>
        <ChevronUp size={14} color={T.accent}
          style={{ transform: showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </motion.button>
      <AnimatePresence>
        {showProfileMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProfileMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                background: T.bg2, border: `1px solid ${T.border}`,
                borderRadius: 16, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
                zIndex: 300, overflow: 'hidden'
              }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 38, height: 38,
                    background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
                    color: T.bg, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16
                  }}>
                    {user?.nom?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.nom}
                    </div>
                    <div style={{ fontSize: 11, color: T.text2 }}>{user?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 5 }}>
                  <span>Niveau {niveau}{niveauActuel?.label ? ` — ${niveauActuel.label}` : ''}</span>
                  <span style={{ color: T.accent, fontWeight: 600 }}>{points} pts</span>
                </div>
                <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pctNiveau || 0}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99 }} />
                </div>
                {streak > 0 && (
                  <div style={{ fontSize: 10, color: '#e08a3c', fontWeight: 600, marginTop: 6 }}>
                    🔥 {streak} jour{streak > 1 ? 's' : ''} de streak
                  </div>
                )}
              </div>
              <div style={{ padding: '6px' }}>
                {[
                  { label: 'Mon profil', icon: User,     onClick: () => { navigate('/profile');  setShowProfileMenu(false) } },
                  { label: 'Paramètres', icon: Settings, onClick: () => { navigate('/settings'); setShowProfileMenu(false) }, shortcut: '⌘ ,' },
                ].map(({ label, icon: Icon, onClick, shortcut }) => (
                  <motion.button key={label} onClick={onClick}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', fontSize: 13, textAlign: 'left' }}
                    whileHover={{ background: `${T.accent}10` }}>
                    <Icon size={15} color={T.text2} strokeWidth={1.8} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {shortcut && <span style={{ fontSize: 10, color: T.text2, background: T.bg3, padding: '1px 6px', borderRadius: 5 }}>{shortcut}</span>}
                  </motion.button>
                ))}
              </div>
              <div style={{ height: 1, background: T.border }} />
              <div style={{ padding: '6px' }}>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  whileHover={{ background: `${T.accent}10` }}>
                  <Star size={15} strokeWidth={1.8} />Passer à Pro — 4,99€/mois
                </motion.button>
              </div>
              <div style={{ height: 1, background: T.border }} />
              <div style={{ padding: '6px' }}>
                <motion.button onClick={() => { localStorage.removeItem('user'); navigate('/') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#e05c5c', cursor: 'pointer', fontSize: 13 }}
                  whileHover={{ background: 'rgba(224,92,92,0.08)' }}>
                  <LogOut size={15} strokeWidth={1.8} />Se déconnecter
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * AppSidebar — shared across all 8 product pages (Dashboard, IA, Tomorrow,
 * Goal, Analytics, Planification, Collaboration, Help).
 * Settings has its own custom sidebar (sections list) — do NOT use this there.
 *
 * Props:
 *  - T, user, niveau, points, streak, niveauActuel, pctNiveau: theme/user state
 *  - sidebarOpen, setSidebarOpen, toggleSidebar, isMobile
 *  - children: optional extra section (e.g. Dashboard filters)
 */
export default function AppSidebar({
  T, user, niveau = 1, points = 0, streak = 0, niveauActuel, pctNiveau,
  sidebarOpen, setSidebarOpen, toggleSidebar, isMobile,
  children
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const sidebarLeft = isMobile
    ? (sidebarOpen ? 0 : '-100%')
    : (sidebarOpen ? 0 : -SIDEBAR_W)

  return (
    <>
      <motion.aside
        animate={{ left: sidebarLeft, width: SIDEBAR_W }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          width: SIDEBAR_W, background: T.bg2, borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          padding: 'clamp(16px,3vh,24px) clamp(12px,2vw,16px)',
          position: 'fixed', top: 0, height: '100vh', zIndex: 150,
          overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80
        }}>
        {/* Logo header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(20px,4vh,32px)', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Layers size={16} color={T.bg} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>GetShift</span>
          </div>
          {!isMobile && (
            <motion.button onClick={toggleSidebar}
              style={{ width: 28, height: 28, borderRadius: 7, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              whileHover={{ color: T.accent, borderColor: T.accent }}>
              <PanelLeftClose size={14} />
            </motion.button>
          )}
        </div>

        {/* Nav items */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {NAV_ITEMS
          .filter(item => !isMobile || !['/dashboard', '/analytics', '/planification'].includes(item.path))
          .map(item => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <motion.button key={item.path}
                onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 10,
                  color: active ? T.accent : T.text2,
                  background: active ? `${T.accent}15` : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  textAlign: 'left', marginBottom: 2
                }}
                whileHover={{ x: 2, color: T.accent }}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
              </motion.button>
            )
          })
        }

        {/* Optional extra section (e.g. Dashboard filters) */}
        {children}

        {/* Profile menu */}
        <ProfileMenu
          T={T} user={user} niveau={niveau} points={points} streak={streak}
          niveauActuel={niveauActuel} pctNiveau={pctNiveau}
          showProfileMenu={showProfileMenu} setShowProfileMenu={setShowProfileMenu}
          navigate={navigate} />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 140 }} />
        )}
      </AnimatePresence>
    </>
  )
}

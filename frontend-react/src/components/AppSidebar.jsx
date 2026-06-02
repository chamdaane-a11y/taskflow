import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import GetShiftMark from './GetShiftMark'
import {
  LayoutDashboard, Bot, BarChart2, Calendar, Users, HelpCircle, Sparkles, Flag,
  PanelLeftClose, PanelLeftOpen, ChevronUp, User, Settings, Star, LogOut, Shield
} from 'lucide-react'

export const SIDEBAR_W = 248

// Les labels sont des clés i18n — traduits dynamiquement dans le rendu
export const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard',     path: '/dashboard' },
  { icon: Bot,             labelKey: 'nav.ai',            path: '/ia' },
  { icon: Sparkles,        label: 'Tomorrow Builder',     path: '/tomorrow' },
  { icon: Flag,            label: 'Goal',                 path: '/goal' },
  { icon: BarChart2,       labelKey: 'nav.analytics',     path: '/analytics' },
  { icon: Calendar,        labelKey: 'nav.planning',      path: '/planification' },
  { icon: Users,           labelKey: 'nav.collaboration', path: '/collaboration' },
  { icon: HelpCircle,      labelKey: 'nav.help',          path: '/help' },
]

export function useSidebarState() {
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

export function FloatingLogo({ sidebarOpen, isMobile, onClick, T }) {
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
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-base)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
      }}
      title="Ouvrir la sidebar">
      <GetShiftMark size={26} showAccent={false} />
      {!isMobile && (
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>GetShift</span>
      )}
    </motion.button>
  )
}

export function SidebarToggle({ sidebarOpen, isMobile, onClick, T }) {
  return (
    <AnimatePresence>
      {!sidebarOpen && (
        <motion.button
          key="hamburger"
          onClick={onClick}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', top: 14, left: 12, zIndex: 200,
            width: 36, height: 36, borderRadius: 'var(--radius-base)',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
          whileHover={{ color: 'var(--ember)', borderColor: 'var(--ember)' }}>
          <PanelLeftOpen size={16} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function ProfileMenu({ user, niveau, points, streak, niveauActuel, pctNiveau, showProfileMenu, setShowProfileMenu, navigate }) {
  const { t } = useTranslation()
  return (
    <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
      <motion.button
        onClick={() => setShowProfileMenu(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', borderRadius: 'var(--radius-md)',
          background: showProfileMenu ? 'var(--ember-soft)' : 'var(--surface-2)',
          border: `1.5px solid ${showProfileMenu ? 'var(--ember-ring)' : 'var(--border-subtle)'}`,
          cursor: 'pointer', textAlign: 'left',
        }}
        whileHover={{ background: 'var(--ember-soft)' }}>
        <div style={{
          width: 34, height: 34,
          background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))',
          color: 'var(--text-on-ember)',
          borderRadius: 'var(--radius-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 15, flexShrink: 0,
        }}>
          {user?.nom?.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.nom}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
            Niveau {niveau} · {points} pts
          </div>
        </div>
        <ChevronUp size={14} color="var(--ember)"
          style={{ transform: showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </motion.button>

      <AnimatePresence>
        {showProfileMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProfileMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 300, overflow: 'hidden',
              }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 38, height: 38,
                    background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))',
                    color: 'var(--text-on-ember)',
                    borderRadius: 'var(--radius-base)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16,
                  }}>
                    {user?.nom?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.nom}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 5 }}>
                  <span>Niveau {niveau}{niveauActuel?.label ? ` — ${niveauActuel.label}` : ''}</span>
                  <span style={{ color: 'var(--ember)', fontWeight: 600 }}>{points} pts</span>
                </div>
                <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pctNiveau || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--ember), var(--ember-hover))', borderRadius: 99 }} />
                </div>
                {streak > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--ember)', fontWeight: 600, marginTop: 6 }}>
                    🔥 {streak} jour{streak > 1 ? 's' : ''} de streak
                  </div>
                )}
              </div>
              <div style={{ padding: 6 }}>
                {[
                  { label: t('nav.profile'),  icon: User,     onClick: () => { navigate('/profile');  setShowProfileMenu(false) } },
                  { label: t('nav.settings'), icon: Settings, onClick: () => { navigate('/settings'); setShowProfileMenu(false) }, shortcut: '⌘ ,' },
                ].map(({ label, icon: Icon, onClick, shortcut }) => (
                  <motion.button key={label} onClick={onClick}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, textAlign: 'left', fontFamily: 'var(--font-ui)' }}
                    whileHover={{ background: 'var(--ember-soft)' }}>
                    <Icon size={15} color="var(--text-secondary)" strokeWidth={1.8} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {shortcut && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 5 }}>{shortcut}</span>}
                  </motion.button>
                ))}
              </div>
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              <div style={{ padding: 6 }}>
                <motion.button
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', color: 'var(--ember)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)' }}
                  whileHover={{ background: 'var(--ember-soft)' }}>
                  <Star size={15} strokeWidth={1.8} />Passer à Pro — 4,99€/mois
                </motion.button>
              </div>
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              <div style={{ padding: 6 }}>
                <motion.button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-ui)' }}
                  whileHover={{ background: 'var(--danger-soft)' }}>
                  <LogOut size={15} strokeWidth={1.8} />{t('nav.logout')}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AppSidebar({
  T, user, niveau = 1, points = 0, streak = 0, niveauActuel, pctNiveau,
  sidebarOpen, setSidebarOpen, toggleSidebar, isMobile,
  children,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const sidebarLeft = isMobile ? (sidebarOpen ? 0 : '-100%') : (sidebarOpen ? 0 : -SIDEBAR_W)

  return (
    <>
      <motion.aside
        animate={{ left: sidebarLeft, width: SIDEBAR_W }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          width: SIDEBAR_W,
          background: 'var(--bg-base)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
          padding: 'clamp(16px,3vh,24px) clamp(12px,2vw,16px)',
          position: 'fixed', top: 0, height: '100vh', zIndex: 150,
          overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80,
          fontFamily: 'var(--font-ui)',
        }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(20px,4vh,32px)', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GetShiftMark size={32} />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>GetShift</span>
          </div>
          <motion.button onClick={toggleSidebar}
            style={{ width: isMobile ? 32 : 28, height: isMobile ? 32 : 28, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            whileHover={{ color: 'var(--ember)', borderColor: 'var(--ember)' }}>
            <PanelLeftClose size={isMobile ? 16 : 14} />
          </motion.button>
        </div>

        {/* Nav label */}
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1.5, marginBottom: 8, padding: '0 8px', textTransform: 'uppercase' }}>Navigation</p>

        {/* Nav items (+ lien Console réservé au fondateur) */}
        {[...NAV_ITEMS, ...(user?.is_founder ? [{ icon: Shield, label: 'Console', path: '/admin' }] : [])]
          .filter(item => !isMobile || !['/dashboard', '/analytics', '/planification'].includes(item.path))
          .map(item => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <motion.button key={item.path}
                data-tour={'nav-' + item.path.slice(1)}
                onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 'var(--radius-base)',
                  color: active ? 'var(--ember)' : 'var(--text-secondary)',
                  background: active ? 'var(--ember-soft)' : 'transparent',
                  borderLeft: active ? '2px solid var(--ember)' : '2px solid transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  textAlign: 'left', marginBottom: 2,
                  fontFamily: 'var(--font-ui)',
                }}
                whileHover={{ x: 2, color: 'var(--ember)' }}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label || t(item.labelKey)}</span>
              </motion.button>
            )
          })
        }

        {children}

        <ProfileMenu
          user={user} niveau={niveau} points={points} streak={streak}
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

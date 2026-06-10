import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  User, Lock, ArrowLeft, CheckCircle, AlertCircle,
  Edit3, Award, Layers, Snowflake, ChevronRight, ChevronDown, Clock, UserPlus,
  Sprout, Zap, Target, Brain, Trophy, Sparkles, Crown, Flame, Star, CheckCircle2,
  Eye, EyeOff, ShieldCheck, Mail, Smartphone, Monitor, Tablet, LogOut, Loader, X,
  AlertTriangle, Download, Trash2,
} from 'lucide-react'
import { themes } from '../themes'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import {
  niveaux as NIVEAUX_SOURCE, BADGES_CONFIG,
  BADGE_ICONS, TIER_STYLES, BADGE_CATEGORIES, getProchainBadge,
} from '../data/badges'

const API = 'https://getshift-backend.onrender.com'

// Icône + couleur progression (bronze → iridescent légende) pour chaque niveau
const NIVEAU_META = {
  1:  { Icon: Sprout,        couleur: '#a78f6f' },                                       // Démarrage
  2:  { Icon: Zap,           couleur: '#4ade80' },                                       // Apprenti
  3:  { Icon: CheckCircle2,  couleur: '#facc15' },                                       // Régulier
  4:  { Icon: Target,        couleur: '#f97316' },                                       // Discipliné
  5:  { Icon: Brain,         couleur: '#5fb4d6' },                                       // Stratège
  6:  { Icon: Award,         couleur: 'var(--ember)' },                                       // Expert
  7:  { Icon: Trophy,        couleur: '#a78bfa' },                                       // Maître
  8:  { Icon: Layers,        couleur: '#f5b942' },                                       // Architecte
  9:  { Icon: Sparkles,      couleur: '#ff7ab8' },                                       // Visionnaire
  10: { Icon: Crown,         couleur: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #ff7ab8, #5fb4d6)' }, // Légende — iridescent
}

// Enrichit niveaux avec icon + couleur (source: data/badges.js)
const NIVEAUX = NIVEAUX_SOURCE.map(n => ({
  niveau: n.niveau,
  nom: n.label,
  min: n.min,
  ...NIVEAU_META[n.niveau],
}))

// Calcule la progression vers un badge simple (streak/pts/tâches)
function progresBadge(badgeId, ctx) {
  const map = {
    'streak_3':[ctx.streak,3], 'streak_7':[ctx.streak,7], 'streak_14':[ctx.streak,14],
    'streak_21':[ctx.streak,21], 'streak_30':[ctx.streak,30], 'streak_100':[ctx.streak,100],
    'first_task':[ctx.nbTerminees,1], 'five_tasks':[ctx.nbTerminees,5],
    'ten_tasks':[ctx.nbTerminees,10], 'twenty_five_tasks':[ctx.nbTerminees,25],
    'fifty_tasks':[ctx.nbTerminees,50], 'century':[ctx.nbTerminees,100],
    'pts_500':[ctx.points,500], 'pts_2000':[ctx.points,2000], 'pts_10000':[ctx.points,10000],
  }
  return map[badgeId] || null
}

// Ordre de prestige des tiers pour le tri des obtenus
const TIER_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

// Helper : date relative en français ("il y a 3 jours")
function dateRelative(iso) {
  if (!iso || iso === 'now') return i18n.t('common.ongoing')
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return i18n.t('common.rel_now')
    if (diff < 3600) { const m = Math.floor(diff / 60); return i18n.t('common.rel_min', { n: m }) }
    if (diff < 86400) { const h = Math.floor(diff / 3600); return i18n.t('common.rel_hour', { n: h }) }
    if (diff < 604800) { const j = Math.floor(diff / 86400); return i18n.t('common.rel_day', { n: j }) }
    if (diff < 2592000) { const sem = Math.floor(diff / 604800); return i18n.t('common.rel_week', { n: sem }) }
    if (diff < 31536000) { const mo = Math.floor(diff / 2592000); return i18n.t('common.rel_month', { n: mo }) }
    const an = Math.floor(diff / 31536000); return an > 1 ? i18n.t('common.rel_year_plural', { n: an }) : i18n.t('common.rel_year', { n: an })
  } catch { return '' }
}

// Section Timeline — historique chronologique
function TimelineSection({ T, cardBg, cardBorder, isLight, text, text2, accent, bg3, events }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (!events || events.length === 0) return null

  const DEFAULT_LIMIT = 6
  const visibles = expanded ? events : events.slice(0, DEFAULT_LIMIT)
  const reste = events.length - DEFAULT_LIMIT

  const renderEvent = (ev, i) => {
    let Icon, color, bg
    if (ev.type === 'register') {
      Icon = UserPlus; color = accent; bg = `${accent}18`
    } else if (ev.type === 'streak') {
      Icon = Flame; color = '#f97316'; bg = '#f9731618'
    } else if (ev.type === 'badge') {
      const tier = TIER_STYLES[ev.tier] || TIER_STYLES.common
      Icon = BADGE_ICONS[ev.badge_id] || Award
      color = tier.color; bg = tier.bg
    } else {
      Icon = Clock; color = text2; bg = `${text2}18`
    }

    const isLast = i === visibles.length - 1

    return (
      <motion.div key={`${ev.type}-${i}`}
        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}
        style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: isLast ? 0 : 16 }}>
        {/* Marker + ligne verticale */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: bg, border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1,
          }}>
            <Icon size={15} color={color} strokeWidth={2.2} />
          </div>
          {!isLast && (
            <div style={{
              position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)',
              width: 2, height: 'calc(100% - 12px)',
              background: `linear-gradient(180deg, ${color}30, ${cardBorder})`,
            }} />
          )}
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: text, letterSpacing: '-0.1px' }}>{ev.title}</span>
            {ev.tier && (
              <span style={{
                fontSize: 9, fontWeight: 700, color, letterSpacing: 0.6, textTransform: 'uppercase',
                padding: '1px 6px', borderRadius: 99,
                background: bg, border: `1px solid ${color}30`,
              }}>{TIER_STYLES[ev.tier]?.label || ev.tier}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: text2, lineHeight: 1.5 }}>
            {ev.description && <span style={{ flex: 1 }}>{ev.description}</span>}
            <span style={{ color, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{dateRelative(ev.date)}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
      style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 'clamp(18px, 3vw, 28px)', marginBottom: 20, boxShadow: isLight ? '0 2px 12px rgba(0,0,0,0.04)' : 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={16} color={accent} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: "var(--font-ui)" }}>Mon parcours</h3>
          <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{t('profile.events', { count: events.length })}</p>
        </div>
      </div>

      {/* Liste */}
      <div>{visibles.map(renderEvent)}</div>

      {/* Bouton Voir plus */}
      {reste > 0 && (
        <motion.button onClick={() => setExpanded(p => !p)} whileHover={{ x: 2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 14, padding: '8px 12px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 9, color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {expanded ? 'Voir moins' : `Voir ${reste} de plus`}
          <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </motion.button>
      )}
    </motion.div>
  )
}

// Composant Showcase — vitrine des badges débloqués + prochain à débloquer
function BadgesShowcase({ T, cardBg, cardBorder, isLight, text, text2, accent, bg3, badges, points, streak, nbTerminees, navigate }) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  // Hydrate les badges avec leur config (tier, categorie)
  const obtenusFull = (badges || [])
    .filter(b => b.obtenu)
    .map(b => {
      const cfg = BADGES_CONFIG.find(c => c.id === b.id)
      return cfg ? { ...cfg, obtenu: true } : null
    })
    .filter(Boolean)
    .sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9))

  const nbObtenus = obtenusFull.length
  const total = BADGES_CONFIG.length
  const pct = Math.round(nbObtenus / total * 100)

  // Pour le prochain badge
  const badgesObtenusIds = obtenusFull.map(b => ({ id: b.id }))
  const prochain = getProchainBadge(badgesObtenusIds)
  const prochainTier = prochain ? (TIER_STYLES[prochain.tier] || TIER_STYLES.common) : null
  const ProchainIcon = prochain ? BADGE_ICONS[prochain.id] : null
  const prochainProg = prochain ? progresBadge(prochain.id, { points, streak, nbTerminees }) : null
  const prochainPct = prochainProg ? Math.min(100, Math.round(prochainProg[0] / prochainProg[1] * 100)) : null

  // Top 6 badges à afficher (priorité légendaires)
  const featured = obtenusFull.slice(0, 6)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
      style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 'clamp(18px, 3vw, 28px)', marginBottom: 20, boxShadow: isLight ? '0 2px 12px rgba(0,0,0,0.04)' : 'none' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={18} color={accent} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: "var(--font-ui)" }}>Mes badges</h3>
            <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>
              <span style={{ color: accent, fontWeight: 700 }}>{nbObtenus}</span> / {total} {t('profile.unlocked')} · {pct}%
            </p>
          </div>
        </div>
        <motion.button onClick={() => setShowAll(s => !s)} whileHover={{ x: 2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 9, color: text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {showAll ? 'Réduire' : 'Tous voir'} {showAll ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </motion.button>
      </div>

      {/* Progress bar globale */}
      <div style={{ height: 5, background: `${accent}15`, borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, ${T?.accent2 || 'var(--ember-hover)'})`, borderRadius: 99 }} />
      </div>

      {/* Vitrine des badges débloqués (priorité légendaires) */}
      {featured.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: prochain ? 20 : 0 }}>
          {featured.map((b, i) => {
            const tier = TIER_STYLES[b.tier] || TIER_STYLES.common
            const Icon = BADGE_ICONS[b.id]
            return (
              <motion.div key={b.id}
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }}
                whileHover={{ y: -3, boxShadow: `0 10px 24px ${tier.glow}` }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${tier.bg}, ${isLight ? 'white' : bg3})`,
                  border: `1px solid ${tier.border}`,
                  boxShadow: `0 0 14px ${tier.glow}`,
                  transition: 'box-shadow 0.25s ease', cursor: 'default',
                  position: 'relative', overflow: 'hidden'
                }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: tier.bg, border: `1px solid ${tier.border}`,
                }}>
                  {Icon && <Icon size={17} color={tier.color} strokeWidth={2} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: text, letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nom}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: tier.color, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 1 }}>{tier.label}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* Empty state — encourager */
        <div style={{ padding: '20px 16px', textAlign: 'center', border: `1.5px dashed ${cardBorder}`, borderRadius: 12, marginBottom: prochain ? 20 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 4 }}>{t('profile.no_badge_yet')}</div>
          <div style={{ fontSize: 11, color: text2 }}>{t('profile.first_badge_hint')}</div>
        </div>
      )}

      {/* {t('profile.next_badge')} */}
      {prochain && ProchainIcon && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          background: `linear-gradient(90deg, ${prochainTier.bg}, transparent)`,
          border: `1px solid ${prochainTier.border}`,
          borderRadius: 12, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: prochainTier.bg, border: `1px solid ${prochainTier.border}`, position: 'relative'
          }}>
            <ProchainIcon size={18} color={prochainTier.color} strokeWidth={2} />
            <Lock size={8} color={isLight ? 'white' : 'var(--bg-base)'} strokeWidth={3}
              style={{ position: 'absolute', bottom: -2, right: -2, background: prochainTier.color, borderRadius: '50%', padding: 2.5 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: prochainTier.color, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Prochain · {prochainTier.label}
              </span>
              {BADGE_CATEGORIES[prochain.categorie] && (
                <span style={{ fontSize: 9, fontWeight: 600, color: BADGE_CATEGORIES[prochain.categorie].color, opacity: 0.85 }}>
                  · {BADGE_CATEGORIES[prochain.categorie].label}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, letterSpacing: '-0.1px' }}>{prochain.nom}</div>
            {prochainProg ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: text2, marginBottom: 3 }}>
                  <span>{prochainProg[0]}/{prochainProg[1]}</span>
                  <span style={{ color: prochainTier.color, fontWeight: 600 }}>{prochainPct}%</span>
                </div>
                <div style={{ height: 3, background: `${prochainTier.color}15`, borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${prochainPct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: '100%', background: prochainTier.color, borderRadius: 99 }} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: text2, marginTop: 3 }}>{prochain.description}</div>
            )}
          </div>
        </div>
      )}

      {/* Grille complète de tous les badges */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: 20 }}>
            {['performance', 'points', 'streak', 'special'].map(cat => (
              <div key={cat} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: text2, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 10 }}>
                  {BADGE_CATEGORIES[cat]?.label || cat}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                  {BADGES_CONFIG.filter(b => b.categorie === cat).map((b, i) => {
                    const obtenu = obtenusFull.find(ob => ob.id === b.id)
                    const tier = TIER_STYLES[b.tier] || TIER_STYLES.common
                    const Icon = BADGE_ICONS[b.id]
                    const prog = !obtenu ? progresBadge(b.id, { points, streak, nbTerminees }) : null
                    const pct = prog ? Math.min(100, Math.round(prog[0] / prog[1] * 100)) : null
                    const restant = prog ? Math.max(0, prog[1] - prog[0]) : null

                    return (
                      <motion.div key={b.id}
                        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 8,
                          padding: '12px 12px',
                          borderRadius: 14,
                          background: obtenu
                            ? `linear-gradient(135deg, ${tier.bg}, ${isLight ? 'white' : bg3})`
                            : 'var(--surface-2)',
                          border: `1px solid ${obtenu ? tier.border : cardBorder}`,
                          boxShadow: obtenu ? `0 0 14px ${tier.glow}` : 'none',
                          opacity: obtenu ? 1 : 0.65,
                          position: 'relative', overflow: 'hidden',
                        }}>

                        {/* Icône */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: obtenu ? tier.bg : 'var(--surface-3)',
                            border: `1px solid ${obtenu ? tier.border : cardBorder}`,
                            position: 'relative',
                          }}>
                            {Icon && <Icon size={17} color={obtenu ? tier.color : text2} strokeWidth={2} />}
                            {!obtenu && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                style={{ position: 'absolute', bottom: -3, right: -3, background: cardBorder, borderRadius: '50%', padding: 2 }}>
                                <rect x="3" y="4" width="4" height="5" rx="1" stroke={text2} strokeWidth="1.2" fill="none"/>
                                <path d="M3.5 4V3a1.5 1.5 0 013 0v1" stroke={text2} strokeWidth="1.2" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: obtenu ? tier.color : text2, letterSpacing: 0.5, textTransform: 'uppercase' }}>{tier.label}</div>
                          </div>
                        </div>

                        {/* Nom + description */}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: text, lineHeight: 1.3 }}>{b.nom}</div>
                          <div style={{ fontSize: 10.5, color: text2, marginTop: 3, lineHeight: 1.4 }}>{b.description}</div>
                        </div>

                        {/* Chemin de progression (badges verrouillés) */}
                        {!obtenu && prog && (
                          <div style={{ marginTop: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: text2, marginBottom: 4, fontWeight: 500 }}>
                              <span>{prog[0]}/{prog[1]}</span>
                              <span style={{ color: tier.color, fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div style={{ height: 3, background: `${tier.color}20`, borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: tier.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
                            </div>
                            <div style={{ fontSize: 9, color: text2, marginTop: 4 }}>
                              encore {restant} {b.id.startsWith('streak_') ? 'jour(s)' : b.id.startsWith('pts_') ? 'pts' : 'tâche(s)'}
                            </div>
                          </div>
                        )}

                        {/* Badge débloqué */}
                        {obtenu && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#4caf82', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <span style={{ fontSize: 9.5, color: '#4caf82', fontWeight: 600 }}>Débloqué</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { theme, T } = useTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1100px)')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen; setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }
  const [user, setUser]             = useState(null)
  const [badgesData, setBadgesData] = useState({ nb_obtenus: 0, nb_total: 28, streak_freeze_disponible: true })
  const [timeline, setTimeline]     = useState([])
  const [onglet, setOnglet]         = useState('profil')
  const [nom, setNom]               = useState('')
  const [ancienPwd, setAncienPwd]   = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]       = useState({})
  const [message, setMessage]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [sessions, setSessions]         = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [deletingSession, setDeletingSession] = useState(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail]             = useState('')
  const [emailModalPwd, setEmailModalPwd]   = useState('')
  const [showEmailPwd, setShowEmailPwd]     = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm]   = useState('')
  const [deletePwd, setDeletePwd]           = useState('')
  const [showDeletePwd, setShowDeletePwd]   = useState(false)
  const [exporting, setExporting]           = useState(false)
  const [deleting, setDeleting]             = useState(false)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (!u?.id) { navigate('/'); return }
    setUser(u); setNom(u.nom)
    chargerUser(u.id)
    chargerBadges(u.id)
    chargerTimeline(u.id)
  }, [])

  useEffect(() => {
    if (onglet === 'securite' && user?.id && sessions.length === 0 && !sessionsLoading) {
      chargerSessions(user.id)
    }
  }, [onglet])

  const chargerUser = async (id) => {
    try {
      const res = await axios.get(`${API}/users/${id}`, { withCredentials: true })
      setUser(res.data); setNom(res.data.nom)
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch {}
  }

  const chargerBadges = async (id) => {
    try {
      const res = await axios.get(`${API}/users/${id}/badges`, { withCredentials: true })
      setBadgesData({
        nb_obtenus: res.data.nb_obtenus || 0,
        nb_total: res.data.nb_total || BADGES_CONFIG.length,
        streak_freeze_disponible: res.data.streak_freeze_disponible !== false,
        badges: res.data.badges || [],
      })
    } catch {}
  }

  const chargerTimeline = async (id) => {
    try {
      const res = await axios.get(`${API}/users/${id}/timeline`, { withCredentials: true })
      setTimeline(res.data.events || [])
    } catch {}
  }

  const chargerSessions = async (id) => {
    setSessionsLoading(true)
    try {
      const res = await axios.get(`${API}/users/${id}/sessions`, { withCredentials: true })
      setSessions(res.data.sessions || [])
    } catch {}
    setSessionsLoading(false)
  }

  const deconnecterSession = async (sessionId) => {
    setDeletingSession(sessionId)
    try {
      await axios.delete(`${API}/users/${user.id}/sessions/${sessionId}`, { withCredentials: true })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch { showMessage(t('profile.err_logout'), 'erreur') }
    setDeletingSession(null)
  }

  const demanderChangementEmail = async () => {
    if (!newEmail.trim() || !emailModalPwd) { showMessage('Email et mot de passe requis', 'erreur'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { showMessage('Email invalide', 'erreur'); return }
    setLoading(true)
    try {
      await axios.post(`${API}/users/${user.id}/email-change/request`,
        { new_email: newEmail.trim(), password: emailModalPwd },
        { withCredentials: true })
      showMessage(t('profile.email_conf_sent'))
      const updated = { ...user, email_change_new: newEmail.trim() }
      setUser(updated); localStorage.setItem('user', JSON.stringify(updated))
      setEmailModalOpen(false); setNewEmail(''); setEmailModalPwd(''); setShowEmailPwd(false)
    } catch (e) { showMessage(e.response?.data?.erreur || 'Erreur', 'erreur') }
    setLoading(false)
  }

  const exporterDonnees = async () => {
    setExporting(true)
    try {
      const res = await axios.get(`${API}/users/${user.id}/export`, {
        withCredentials: true, responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `getshift-export-${user.id}-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
      showMessage(t('profile.export_done'))
    } catch { showMessage('Erreur lors de l\'export', 'erreur') }
    setExporting(false)
  }

  const supprimerCompte = async () => {
    if (deleteConfirm !== 'SUPPRIMER') { showMessage('Tape SUPPRIMER en majuscules', 'erreur'); return }
    if (!user.google_id && !deletePwd) { showMessage('Mot de passe requis', 'erreur'); return }
    setDeleting(true)
    try {
      await axios.delete(`${API}/users/${user.id}`, {
        withCredentials: true,
        data: { confirmation: deleteConfirm, password: deletePwd },
      })
      localStorage.clear()
      navigate('/')
    } catch (e) {
      showMessage(e.response?.data?.erreur || 'Erreur', 'erreur')
      setDeleting(false)
    }
  }

  const annulerChangementEmail = async () => {
    setLoading(true)
    try {
      await axios.post(`${API}/users/${user.id}/email-change/cancel`, {}, { withCredentials: true })
      const updated = { ...user, email_change_new: null }
      setUser(updated); localStorage.setItem('user', JSON.stringify(updated))
      showMessage(t('profile.change_cancelled'))
    } catch { showMessage('Erreur', 'erreur') }
    setLoading(false)
  }

  const deconnecterAutres = async () => {
    setDeletingSession('others')
    try {
      await axios.delete(`${API}/users/${user.id}/sessions/others`, { withCredentials: true })
      setSessions(prev => prev.filter(s => s.is_current))
      showMessage(t('profile.other_sessions_out'))
    } catch { showMessage('Erreur', 'erreur') }
    setDeletingSession(null)
  }

  const showMessage = (texte, type = 'succes') => {
    setMessage({ texte, type })
    setTimeout(() => setMessage(null), 3500)
  }

  const modifierNom = async () => {
    if (!nom.trim()) { showMessage(t('profile.name_empty'), 'erreur'); return }
    setLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/nom`, { nom }, { withCredentials: true })
      const updated = { ...user, nom }
      setUser(updated); localStorage.setItem('user', JSON.stringify(updated))
      showMessage(t('profile.name_changed'))
    } catch (e) { showMessage(e.response?.data?.erreur || 'Erreur', 'erreur') }
    setLoading(false)
  }

  const modifierPassword = async () => {
    if (!ancienPwd || !newPwd || !confirmPwd) { showMessage('Remplis tous les champs', 'erreur'); return }
    if (newPwd !== confirmPwd) { showMessage(t('profile.pwd_mismatch'), 'erreur'); return }
    if (newPwd.length < 8) { showMessage(t('profile.min_8'), 'erreur'); return }
    setLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/password`, { ancien_password: ancienPwd, nouveau_password: newPwd }, { withCredentials: true })
      showMessage(t('profile.pwd_changed'))
      setAncienPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e) { showMessage(e.response?.data?.erreur || 'Erreur', 'erreur') }
    setLoading(false)
  }

  const niveauInfo    = NIVEAUX.find(n => n.niveau === (user?.niveau || 1)) || NIVEAUX[0]
  const niveauSuivant = NIVEAUX.find(n => n.niveau === (user?.niveau || 1) + 1)
  const pointsActuels = user?.points || 0
  const progression   = niveauSuivant
    ? Math.min(((pointsActuels - niveauInfo.min) / (niveauSuivant.min - niveauInfo.min)) * 100, 100)
    : 100

  const initiales = user?.nom?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'GS'

  const bg         = T?.bg     || 'var(--bg-base)'
  const bg2        = T?.bg2    || 'var(--surface-1)'
  const bg3        = T?.bg3    || 'var(--surface-2)'
  const text       = T?.text   || 'var(--text-primary)'
  const text2      = T?.text2  || 'var(--text-secondary)'
  const border     = T?.border || 'var(--border-default)'
  const accent     = T?.accent || 'var(--ember)'
  const isLight    = theme === 'light'
  const cardBg     = isLight ? 'var(--surface-1)' : bg2
  const cardBorder = isLight ? 'var(--border-subtle)' : border
  const inputBg    = isLight ? 'var(--surface-1)' : 'rgba(0,0,0,0.2)'
  const inputBorder = isLight ? 'var(--border-default)' : border

  const forceLvl   = newPwd.length < 6 ? 1 : newPwd.length < 8 ? 2 : newPwd.length < 12 ? 3 : 4
  const forceLabel = ['', 'Trop court', 'Faible', 'Moyen', 'Fort'][forceLvl]
  const forceColor = ['', '#ef4444', '#f97316', '#facc15', 'var(--success)'][forceLvl]

  if (!user) return null

  const NiveauIcon = niveauInfo.Icon

  const pwdChecks = {
    len:     newPwd.length >= 8,
    upper:   /[A-Z]/.test(newPwd),
    digit:   /[0-9]/.test(newPwd),
    special: /[^a-zA-Z0-9]/.test(newPwd),
  }
  const confirmOk  = confirmPwd.length > 0 && confirmPwd === newPwd
  const confirmBad = confirmPwd.length > 0 && confirmPwd !== newPwd

  const secuItems = [
    { label: t('profile.h_email_verified'), Icon: Mail, ok: !!user.email_verifie, sub: user.email_verifie ? t('profile.h_addr_confirmed') : t('profile.h_check_inbox') },
    { label: t('profile.h_google_linked'), Icon: ShieldCheck, ok: !!user.google_id, sub: user.google_id ? t('profile.h_conn_active') : t('profile.h_not_connected') },
    { label: t('profile.h_password'), Icon: Lock, ok: true, sub: user.google_id ? t('profile.h_via_google') : t('profile.h_defined') },
    { label: '2FA', Icon: Smartphone, ok: false, sub: t('profile.soon'), soon: true },
  ]
  const secuScore = secuItems.filter(c => !c.soon && c.ok).length
  const secuMax   = secuItems.filter(c => !c.soon).length
  const secuPct   = Math.round(secuScore / secuMax * 100)
  const secuColor = secuPct >= 100 ? 'var(--success)' : secuPct >= 60 ? '#facc15' : '#ef4444'

  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bg, fontFamily: "var(--font-ui)", color: text, overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pf-input { width: 100%; padding: 13px 16px; border-radius: 10px; font-size: 16px; font-family: var(--font-ui); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        @media (max-width: 640px) {
          .pf-hero { flex-direction: column !important; text-align: center !important; align-items: center !important; }
          .pf-stats { justify-content: center !important; }
          .pf-tabs { overflow-x: auto; }
        }
      `}</style>

      <AppSidebar
        T={T} user={user}
        niveau={user?.niveau || 1} points={user?.points || 0}
        streak={user?.streak || 0}
        niveauActuel={niveauInfo} pctNiveau={progression}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />
      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      <motion.div
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, minWidth: 0, position: 'relative', paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT : 0 }}
      >

      {/* Orbes fond */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', filter: 'blur(140px)', opacity: isLight ? 0.05 : 0.08, background: `radial-gradient(circle, ${accent}, transparent)`, top: '-15%', left: '-10%' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', filter: 'blur(120px)', opacity: isLight ? 0.04 : 0.06, background: 'radial-gradient(circle, var(--ember-hover), transparent)', bottom: '5%', right: '-5%' }} />
      </div>

      {/* Modal changement email */}
      <AnimatePresence>
        {emailModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !loading && setEmailModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={16} color={accent} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>Changer mon email</h3>
                    <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>On enverra un lien de confirmation</p>
                  </div>
                </div>
                <button type="button" onClick={() => !loading && setEmailModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: text2, padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nouvelle adresse</label>
                <input className="pf-input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nouvel@email.com"
                  style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, color: text }} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Confirme ton mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input className="pf-input" type={showEmailPwd ? 'text' : 'password'} value={emailModalPwd}
                    onChange={e => setEmailModalPwd(e.target.value)} placeholder="Ton mot de passe actuel"
                    onKeyDown={e => e.key === 'Enter' && demanderChangementEmail()}
                    style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, color: text, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowEmailPwd(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: text2, display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showEmailPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => !loading && setEmailModalOpen(false)}
                  style={{ padding: '11px 18px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 10, color: text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <motion.button onClick={demanderChangementEmail} disabled={loading || !newEmail || !emailModalPwd} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '11px 22px', background: `linear-gradient(135deg, ${accent}, ${T?.accent2 || 'var(--ember-hover)'})`, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: (!newEmail || !emailModalPwd) ? 0.5 : 1 }}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal suppression compte */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeleteModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
              style={{ background: cardBg, border: '1px solid #ef444440', borderRadius: 18, padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(239,68,68,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} color="#ef4444" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>{t('profile.delete_account')}</h3>
                    <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{t('profile.irreversible')}</p>
                  </div>
                </div>
                <button type="button" onClick={() => !deleting && setDeleteModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: text2, padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 11, padding: '12px 14px', marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: text, lineHeight: 1.6 }}>
                  {t('profile.delete_modal', { badges: badgesData.nb_obtenus, niveau: user.niveau || 1, points: user.points || 0 })}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tape <code style={{ color: '#ef4444', background: '#ef444418', padding: '1px 6px', borderRadius: 4 }}>SUPPRIMER</code> pour confirmer</label>
                <input className="pf-input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="SUPPRIMER"
                  style={{ background: inputBg, border: `1.5px solid ${deleteConfirm === 'SUPPRIMER' ? '#ef4444' : inputBorder}`, color: text }} />
              </div>

              {!user.google_id && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Ton mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input className="pf-input" type={showDeletePwd ? 'text' : 'password'} value={deletePwd}
                      onChange={e => setDeletePwd(e.target.value)} placeholder="Mot de passe actuel"
                      style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, color: text, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowDeletePwd(p => !p)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: text2, display: 'flex', alignItems: 'center', padding: 0 }}>
                      {showDeletePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => !deleting && setDeleteModalOpen(false)}
                  style={{ padding: '11px 18px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 10, color: text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <motion.button onClick={supprimerCompte} disabled={deleting || deleteConfirm !== 'SUPPRIMER' || (!user.google_id && !deletePwd)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '11px 22px', background: '#ef4444', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: deleting ? 'wait' : 'pointer', opacity: (deleteConfirm !== 'SUPPRIMER' || (!user.google_id && !deletePwd)) ? 0.5 : 1 }}>
                  {deleting ? t('profile.deleting') : t('profile.delete_perma')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -60, x: '-50%' }} animate={{ opacity: 1, y: 20, x: '-50%' }} exit={{ opacity: 0, y: -60, x: '-50%' }}
            style={{ position: 'fixed', top: 0, left: '50%', zIndex: 1000, background: message.type === 'succes' ? 'var(--success-soft)' : 'var(--danger-soft)', border: `1px solid ${message.type === 'succes' ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 12, padding: '12px 22px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            {message.type === 'succes' ? <CheckCircle size={17} color="var(--success)" /> : <AlertCircle size={17} color="#ef4444" />}
            <span style={{ fontSize: 14, fontWeight: 500, color: text }}>{message.texte}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? 'calc(56px + env(safe-area-inset-top)) 16px 24px' : 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px)', position: 'relative', zIndex: 1 }}>

        {/* Retour */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} style={{ marginBottom: 32 }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: text2, fontSize: 14, fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.color = accent}
            onMouseLeave={e => e.currentTarget.style.color = text2}>
            <ArrowLeft size={16} /> Retour au dashboard
          </Link>
        </motion.div>

        {/* ══ HERO CARD ══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 'clamp(24px, 4vw, 40px)', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: isLight ? '0 4px 24px rgba(0,0,0,0.06)' : '0 4px 24px rgba(0,0,0,0.25)' }}>

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${T?.accent2 || 'var(--ember-hover)'})` }} />

          {/* Halo de prestige derrière le hero pour les niveaux élevés (≥8) */}
          {(user.niveau || 1) >= 8 && (
            <motion.div aria-hidden
              animate={{ opacity: [0.15, 0.28, 0.15] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, borderRadius: '50%', filter: 'blur(80px)', background: `radial-gradient(circle, ${niveauInfo.couleur}, transparent 70%)`, pointerEvents: 'none' }} />
          )}

          <div className="pf-hero" data-guide="profile-level" style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28, position: 'relative' }}>
            {/* Avatar — anneau gradient animé pour les niveaux ≥ 7 */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {(user.niveau || 1) >= 7 && (
                <motion.div aria-hidden
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute', inset: -5, borderRadius: 28,
                    background: niveauInfo.gradient || `conic-gradient(from 0deg, ${niveauInfo.couleur}, transparent 60%, ${niveauInfo.couleur})`,
                    pointerEvents: 'none', zIndex: 0
                  }} />
              )}
              <div style={{ position: 'relative', zIndex: 1, width: 88, height: 88, borderRadius: 24, background: `linear-gradient(135deg, ${accent}, ${T?.accent2 || 'var(--ember-hover)'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', boxShadow: `0 8px 32px ${niveauInfo.couleur}55`, fontFamily: "var(--font-ui)", overflow: 'hidden' }}>
                {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiales}
              </div>
              <div style={{ position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: 9, background: niveauInfo.gradient || niveauInfo.couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${bg}`, boxShadow: `0 2px 12px ${niveauInfo.couleur}aa`, zIndex: 2 }}>
                <NiveauIcon size={14} color="white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Infos */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: text, letterSpacing: '-0.5px', fontFamily: "var(--font-ui)" }}>{user.nom}</h1>
                <span style={{
                  padding: '3px 12px',
                  background: niveauInfo.gradient || `${niveauInfo.couleur}22`,
                  border: `1px solid ${niveauInfo.couleur}55`,
                  borderRadius: 99,
                  fontSize: 11, fontWeight: 800,
                  color: niveauInfo.gradient ? 'white' : niveauInfo.couleur,
                  letterSpacing: 0.8,
                  boxShadow: niveauInfo.gradient ? `0 0 14px ${niveauInfo.couleur}66` : 'none',
                }}>
                  NIV. {user.niveau || 1} · {niveauInfo.nom.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 14, color: text2, marginBottom: 16 }}>{user.email}</p>
              <div style={{ maxWidth: 340 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: text2, marginBottom: 6 }}>
                  <span>{pointsActuels} pts</span>
                  <span style={{ color: niveauInfo.couleur, fontWeight: 600 }}>{niveauSuivant ? `→ ${niveauSuivant.nom} à ${niveauSuivant.min} pts` : 'Niveau max atteint 🏆'}</span>
                </div>
                <div style={{ height: 6, background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progression}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: niveauInfo.gradient || `linear-gradient(90deg, ${niveauInfo.couleur}, ${accent})`, borderRadius: 99 }} />
                </div>
              </div>
            </div>
          </div>

          {/* KPIs — 6 cards (Points / Niveau / Tâches / Streak / Badges / Freeze) */}
          <div className="pf-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            {[
              { label: t('profile.kpi_points'),  val: pointsActuels,                                         color: accent,                Icon: Zap },
              { label: t('profile.kpi_level'),  val: user.niveau || 1,                                      color: niveauInfo.couleur,    Icon: NiveauIcon },
              { label: t('profile.kpi_tasks'),  val: user.taches_count || 0,                                color: 'var(--success)',             Icon: CheckCircle2 },
              { label: t('profile.kpi_streak'),  val: `${user.streak || 0}j`,                                color: '#f97316',             Icon: Flame },
              { label: t('profile.kpi_badges'),  val: `${badgesData.nb_obtenus}/${badgesData.nb_total}`,    color: '#a78bfa',             Icon: Award },
              {
                label: t('profile.kpi_freeze'),
                val: badgesData.streak_freeze_disponible ? t('profile.freeze_avail') : t('profile.freeze_used'),
                color: badgesData.streak_freeze_disponible ? '#5fb4d6' : text2,
                Icon: Snowflake,
              },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                style={{ background: bg3, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <s.Icon size={12} color={s.color} strokeWidth={2.2} />
                  <div style={{ fontSize: 10, color: text2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: '-0.5px', fontFamily: "var(--font-ui)" }}>{s.val}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ══ VITRINE BADGES ══ */}
        <div data-guide="profile-badges">
          <BadgesShowcase
            T={T} cardBg={cardBg} cardBorder={cardBorder} isLight={isLight}
            text={text} text2={text2} accent={accent} bg3={bg3}
            badges={badgesData.badges}
            points={pointsActuels} streak={user.streak || 0} nbTerminees={user.taches_count || 0}
            navigate={navigate} />
        </div>

        {/* ══ TIMELINE PARCOURS ══ */}
        <TimelineSection
          T={T} cardBg={cardBg} cardBorder={cardBorder} isLight={isLight}
          text={text} text2={text2} accent={accent} bg3={bg3}
          events={timeline} />

        {/* ══ ONGLETS ══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="pf-tabs" style={{ display: 'flex', gap: 4, background: isLight ? '#f1f5f9' : bg2, borderRadius: 14, padding: 4, marginBottom: 20, border: `1px solid ${cardBorder}` }}>
          {[
            { id: 'profil',   label: t('profile.tab_profile'),     icon: <User size={14} /> },
            { id: 'securite', label: t('profile.tab_security'),   icon: <Lock size={14} /> },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', background: onglet === o.id ? (isLight ? 'white' : 'rgba(255,255,255,0.08)') : 'transparent', border: `1px solid ${onglet === o.id ? cardBorder : 'transparent'}`, borderRadius: 10, color: onglet === o.id ? text : text2, fontSize: 13, fontWeight: onglet === o.id ? 600 : 500, cursor: 'pointer', fontFamily: "var(--font-ui)", boxShadow: onglet === o.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {o.icon} {o.label}
            </button>
          ))}
        </motion.div>

        {/* ══ CONTENUS ══ */}
        <AnimatePresence mode="wait">

          {onglet === 'profil' && (
            <motion.div key="profil" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 'clamp(20px, 4vw, 36px)', boxShadow: isLight ? '0 2px 12px rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={16} color={accent} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>{t('profile.edit_info')}</h3>
                  <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{t('profile.update_name')}</p>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nom complet</label>
                <input className="pf-input" value={nom} onChange={e => setNom(e.target.value)} placeholder={t('profile.name_ph')}
                  onKeyDown={e => e.key === 'Enter' && modifierNom()}
                  style={{ background: inputBg, border: `1.5px solid ${nom !== user.nom ? accent : inputBorder}`, color: text }} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Adresse e-mail</label>
                <div style={{ position: 'relative' }}>
                  <input className="pf-input" value={user.email} disabled
                    style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${inputBorder}`, color: text2, cursor: 'not-allowed', opacity: 0.7, paddingRight: user.google_id ? 16 : 110 }} />
                  {!user.google_id && !user.email_change_new && (
                    <button type="button" onClick={() => setEmailModalOpen(true)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: '7px 14px', background: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: 8, color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Modifier
                    </button>
                  )}
                </div>
                {user.google_id ? (
                  <p style={{ fontSize: 11, color: text2, marginTop: 6 }}>{t('profile.email_google_managed')}</p>
                ) : user.email_change_new ? (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#f9731610', border: '1px solid #f9731640', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={14} color="#f97316" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: text }}>{t('profile.change_pending')}</div>
                      <div style={{ fontSize: 11, color: text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('profile.confirm_via_link')} <strong>{user.email_change_new}</strong></div>
                    </div>
                    <button type="button" onClick={annulerChangementEmail}
                      style={{ padding: '5px 10px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 7, color: text2, fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                      Annuler
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: text2, marginTop: 6 }}>{t('profile.send_conf_link')}</p>
                )}
              </div>
              <motion.button onClick={modifierNom} disabled={loading || nom === user.nom} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ padding: '13px 28px', background: nom !== user.nom ? `linear-gradient(135deg, ${accent}, var(--success))` : (isLight ? '#f1f5f9' : bg3), border: 'none', borderRadius: 11, color: nom !== user.nom ? 'white' : text2, fontWeight: 700, fontSize: 14, cursor: nom !== user.nom ? 'pointer' : 'not-allowed', fontFamily: "var(--font-ui)", boxShadow: nom !== user.nom ? `0 8px 24px ${accent}33` : 'none', transition: 'all 0.2s' }}>
                {loading ? t('profile.saving') : t('profile.save_changes')}
              </motion.button>
            </motion.div>
          )}

          {onglet === 'securite' && (
            <motion.div key="securite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 'clamp(20px, 4vw, 36px)', boxShadow: isLight ? '0 2px 12px rgba(0,0,0,0.05)' : 'none' }}>

              {/* ── Santé du compte ── */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `${secuColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={16} color={secuColor} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>{t('profile.account_health')}</h3>
                    <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{secuScore}/{secuMax} {t('profile.criteria_met')}</p>
                  </div>
                  <div style={{ padding: '4px 12px', borderRadius: 99, background: `${secuColor}18`, border: `1px solid ${secuColor}40`, fontSize: 13, fontWeight: 800, color: secuColor }}>
                    {secuPct}%
                  </div>
                </div>
                <div style={{ height: 4, background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${secuPct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: '100%', background: secuColor, borderRadius: 99 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                  {secuItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: bg3, border: `1px solid ${item.soon ? cardBorder : item.ok ? 'var(--success-soft)' : '#ef444420'}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: item.soon ? `${text2}10` : item.ok ? 'var(--success-soft)' : '#ef444418' }}>
                        <item.Icon size={14} color={item.soon ? text2 : item.ok ? 'var(--success)' : '#ef4444'} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: item.soon ? text2 : item.ok ? 'var(--success)' : '#ef4444', marginTop: 1, fontWeight: 500 }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: cardBorder, marginBottom: 28 }} />

              {/* ── Changer le mot de passe ── */}
              {user.google_id ? (
                <div style={{ display: 'flex', gap: 12, padding: '16px', background: isLight ? '#f0f9ff' : `${accent}0d`, border: `1px solid ${accent}30`, borderRadius: 12 }}>
                  <ShieldCheck size={18} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 4 }}>{t('profile.conn_via_google')}</div>
                    <div style={{ fontSize: 12, color: text2, lineHeight: 1.6 }}>{t('profile.google_pwd_help')}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: '#C9A84C18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={16} color="#C9A84C" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>{t('profile.change_pwd')}</h3>
                      <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{t('profile.keep_secure')}</p>
                    </div>
                  </div>

                  {[
                    { label: t('profile.cur_pwd'), val: ancienPwd, set: setAncienPwd, ph: t('profile.cur_pwd_ph'), idx: 0 },
                    { label: t('profile.new_pwd'), val: newPwd, set: setNewPwd, ph: t('profile.new_pwd_ph'), idx: 1 },
                    { label: t('profile.confirm_new_pwd'), val: confirmPwd, set: setConfirmPwd, ph: t('profile.repeat_ph'), idx: 2 },
                  ].map((f) => {
                    const isConfirm   = f.idx === 2
                    const borderColor = isConfirm && confirmBad ? '#ef4444'
                      : isConfirm && confirmOk ? 'var(--success)'
                      : inputBorder
                    return (
                      <div key={f.idx} style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>{f.label}</label>
                        <div style={{ position: 'relative' }}>
                          <input className="pf-input" type={showPwd[f.idx] ? 'text' : 'password'} value={f.val}
                            onChange={e => f.set(e.target.value)} placeholder={f.ph}
                            style={{ background: inputBg, border: `1.5px solid ${borderColor}`, color: text, paddingRight: 44 }} />
                          <button type="button" onClick={() => setShowPwd(p => ({ ...p, [f.idx]: !p[f.idx] }))}
                            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: text2, display: 'flex', alignItems: 'center', padding: 0 }}>
                            {showPwd[f.idx] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {isConfirm && confirmBad && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 5, fontWeight: 500 }}>{t('profile.pwd_mismatch')}</p>}
                        {isConfirm && confirmOk  && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 5, fontWeight: 500 }}>✓ Les mots de passe correspondent</p>}
                      </div>
                    )
                  })}

                  {newPwd && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= forceLvl ? forceColor : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'), transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: forceColor, fontWeight: 600 }}>{forceLabel}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {[
                          { label: t('profile.chk_len'), ok: pwdChecks.len },
                          { label: t('profile.chk_upper'), ok: pwdChecks.upper },
                          { label: t('profile.chk_digit'), ok: pwdChecks.digit },
                          { label: t('profile.chk_special'), ok: pwdChecks.special },
                        ].map((c, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.ok ? 'var(--success-soft)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'), border: `1.5px solid ${c.ok ? 'var(--success)' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)')}`, transition: 'all 0.15s' }}>
                              {c.ok && <span style={{ color: 'var(--success)', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 11, color: c.ok ? text : text2, fontWeight: c.ok ? 600 : 400, transition: 'color 0.15s' }}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <motion.button onClick={modifierPassword} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none', borderRadius: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "var(--font-ui)", boxShadow: '0 8px 24px rgba(220,38,38,0.25)', transition: 'all 0.2s' }}>
                    {loading ? 'Modification...' : 'Modifier le mot de passe'}
                  </motion.button>
                </>
              )}

              {/* ── Sessions actives ── */}
              <div style={{ height: 1, background: cardBorder, margin: '28px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Monitor size={16} color={accent} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>{t('profile.sessions_active')}</h3>
                  <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{t('profile.devices_connected')}</p>
                </div>
                {sessions.filter(s => !s.is_current).length > 0 && (
                  <motion.button onClick={deconnecterAutres} disabled={deletingSession === 'others'} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: `1px solid #ef444440`, borderRadius: 9, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <LogOut size={13} /> {t('profile.logout_all')}
                  </motion.button>
                )}
              </div>

              {sessionsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <Loader size={20} color={text2} style={{ animation: 'spin 1s linear infinite' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', border: `1.5px dashed ${cardBorder}`, borderRadius: 12, fontSize: 13, color: text2 }}>
                  {t('profile.no_session')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map(s => {
                    const isPhone  = s.device?.includes('Mobile')
                    const isTablet = s.device?.includes('Tablette')
                    const DevIcon  = isPhone ? Smartphone : isTablet ? Tablet : Monitor
                    return (
                      <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: bg3, border: `1px solid ${s.is_current ? 'var(--ember-ring)' : cardBorder}`, borderRadius: 13 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: s.is_current ? `${accent}18` : `${text2}10` }}>
                          <DevIcon size={17} color={s.is_current ? accent : text2} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.device || '—'}</span>
                            {s.is_current && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: 0.6, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 99, background: `${accent}18`, border: `1px solid ${accent}30` }}>Session actuelle</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: text2 }}>{s.ip} · {s.last_seen ? dateRelative(s.last_seen) : '—'}</div>
                        </div>
                        {!s.is_current && (
                          <motion.button onClick={() => deconnecterSession(s.id)} disabled={deletingSession === s.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 8, color: text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                            {deletingSession === s.id ? '...' : t('profile.logout')}
                          </motion.button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* ── Zone danger ── */}
              <div style={{ height: 1, background: cardBorder, margin: '28px 0' }} />
              <div style={{ background: isLight ? '#fef2f2' : 'rgba(239,68,68,0.05)', border: '1px solid #ef444440', borderRadius: 14, padding: 'clamp(16px, 3vw, 22px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} color="#ef4444" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>{t('profile.danger_zone')}</h3>
                    <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{t('profile.irreversible_actions')}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Export */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 11 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Download size={15} color={accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{t('profile.export_data')}</div>
                      <div style={{ fontSize: 11, color: text2 }}>{t('profile.export_desc')}</div>
                    </div>
                    <motion.button onClick={exporterDonnees} disabled={exporting} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: '8px 14px', background: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: 9, color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      {exporting ? t('profile.exporting') : t('profile.export_btn')}
                    </motion.button>
                  </div>

                  {/* Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: cardBg, border: '1px solid #ef444430', borderRadius: 11 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={15} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{t('profile.delete_account')}</div>
                      <div style={{ fontSize: 11, color: text2 }}>{t('profile.delete_desc')}</div>
                    </div>
                    <motion.button onClick={() => setDeleteModalOpen(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      style={{ padding: '8px 14px', background: '#ef444418', border: '1px solid #ef444440', borderRadius: 9, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      Supprimer
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}



        </AnimatePresence>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', borderTop: `1px solid ${cardBorder}` }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${accent}, ${T?.accent2 || 'var(--ember-hover)'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={11} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 12, color: text2, fontWeight: 500 }}>{t('profile.tagline')}</span>
        </motion.div>

      </div>

      </motion.div>

      {isMobile && <BottomNavMobile />}
    </div>
  )
}
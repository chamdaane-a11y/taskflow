import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  User, Lock, ArrowLeft, CheckCircle, AlertCircle,
  Edit3, Award, Layers, Snowflake, ChevronRight, ChevronDown, Clock, UserPlus,
  Sprout, Zap, Target, Brain, Trophy, Sparkles, Crown, Flame, Star, CheckCircle2,
} from 'lucide-react'
import { themes } from '../themes'
import { useTheme } from '../useTheme'
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
  6:  { Icon: Award,         couleur: '#6c63ff' },                                       // Expert
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
  if (!iso || iso === 'now') return 'En cours'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return "À l'instant"
    if (diff < 3600) { const m = Math.floor(diff / 60); return `il y a ${m} min` }
    if (diff < 86400) { const h = Math.floor(diff / 3600); return `il y a ${h}h` }
    if (diff < 604800) { const j = Math.floor(diff / 86400); return `il y a ${j}j` }
    if (diff < 2592000) { const s = Math.floor(diff / 604800); return `il y a ${s} sem` }
    if (diff < 31536000) { const mo = Math.floor(diff / 2592000); return `il y a ${mo} mois` }
    const an = Math.floor(diff / 31536000); return `il y a ${an} an${an > 1 ? 's' : ''}`
  } catch { return '' }
}

// Section Timeline — historique chronologique
function TimelineSection({ T, cardBg, cardBorder, isLight, text, text2, accent, bg3, events }) {
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
          <h3 style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Mon parcours</h3>
          <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>{events.length} événement{events.length > 1 ? 's' : ''} dans ton historique</p>
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
            <h3 style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Mes badges</h3>
            <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>
              <span style={{ color: accent, fontWeight: 700 }}>{nbObtenus}</span> / {total} débloqués · {pct}%
            </p>
          </div>
        </div>
        <motion.button onClick={() => navigate('/settings#badges')} whileHover={{ x: 2 }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: 'transparent', border: `1px solid ${cardBorder}`, borderRadius: 9, color: text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Tous voir <ChevronRight size={13} />
        </motion.button>
      </div>

      {/* Progress bar globale */}
      <div style={{ height: 5, background: `${accent}15`, borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, #00C896)`, borderRadius: 99 }} />
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
          <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 4 }}>Aucun badge encore</div>
          <div style={{ fontSize: 11, color: text2 }}>Termine une tâche pour débloquer ton premier badge 🎯</div>
        </div>
      )}

      {/* Prochain badge à débloquer */}
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
            <Lock size={8} color={isLight ? 'white' : T.bg} strokeWidth={3}
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
    </motion.div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { theme, T } = useTheme()
  const [user, setUser]             = useState(null)
  const [badgesData, setBadgesData] = useState({ nb_obtenus: 0, nb_total: 28, streak_freeze_disponible: true })
  const [timeline, setTimeline]     = useState([])
  const [onglet, setOnglet]         = useState('profil')
  const [nom, setNom]               = useState('')
  const [ancienPwd, setAncienPwd]   = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [message, setMessage]       = useState(null)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    if (!u?.id) { navigate('/'); return }
    setUser(u); setNom(u.nom)
    chargerUser(u.id)
    chargerBadges(u.id)
    chargerTimeline(u.id)
  }, [])

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

  const showMessage = (texte, type = 'succes') => {
    setMessage({ texte, type })
    setTimeout(() => setMessage(null), 3500)
  }

  const modifierNom = async () => {
    if (!nom.trim()) { showMessage('Le nom ne peut pas être vide', 'erreur'); return }
    setLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/nom`, { nom }, { withCredentials: true })
      const updated = { ...user, nom }
      setUser(updated); localStorage.setItem('user', JSON.stringify(updated))
      showMessage('Nom modifié avec succès')
    } catch (e) { showMessage(e.response?.data?.erreur || 'Erreur', 'erreur') }
    setLoading(false)
  }

  const modifierPassword = async () => {
    if (!ancienPwd || !newPwd || !confirmPwd) { showMessage('Remplis tous les champs', 'erreur'); return }
    if (newPwd !== confirmPwd) { showMessage('Les mots de passe ne correspondent pas', 'erreur'); return }
    if (newPwd.length < 8) { showMessage('Minimum 8 caractères', 'erreur'); return }
    setLoading(true)
    try {
      await axios.put(`${API}/users/${user.id}/password`, { ancien_password: ancienPwd, nouveau_password: newPwd }, { withCredentials: true })
      showMessage('Mot de passe modifié')
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

  const bg         = T?.bg     || '#080810'
  const bg2        = T?.bg2    || 'rgba(255,255,255,0.04)'
  const bg3        = T?.bg3    || 'rgba(255,255,255,0.07)'
  const text       = T?.text   || '#f0f0f5'
  const text2      = T?.text2  || 'rgba(255,255,255,0.45)'
  const border     = T?.border || 'rgba(255,255,255,0.09)'
  const accent     = T?.accent || '#6C63FF'
  const isLight    = bg === '#F8F9FC' || bg === '#ffffff' || bg === '#f8f9fc'
  const cardBg     = isLight ? 'white' : bg2
  const cardBorder = isLight ? '#e2e8f0' : border
  const inputBg    = isLight ? '#f8f9fc' : 'rgba(0,0,0,0.2)'
  const inputBorder = isLight ? '#e2e8f0' : border

  const forceLvl   = newPwd.length < 6 ? 1 : newPwd.length < 8 ? 2 : newPwd.length < 12 ? 3 : 4
  const forceLabel = ['', 'Trop court', 'Faible', 'Moyen', 'Fort'][forceLvl]
  const forceColor = ['', '#ef4444', '#f97316', '#facc15', '#00C896'][forceLvl]

  if (!user) return null

  const NiveauIcon = niveauInfo.Icon

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'DM Sans', sans-serif", color: text, position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pf-input { width: 100%; padding: 13px 16px; border-radius: 10px; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        @media (max-width: 640px) {
          .pf-hero { flex-direction: column !important; text-align: center !important; align-items: center !important; }
          .pf-stats { justify-content: center !important; }
          .pf-tabs { overflow-x: auto; }
        }
      `}</style>

      {/* Orbes fond */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', filter: 'blur(140px)', opacity: isLight ? 0.05 : 0.08, background: `radial-gradient(circle, ${accent}, transparent)`, top: '-15%', left: '-10%' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', filter: 'blur(120px)', opacity: isLight ? 0.04 : 0.06, background: 'radial-gradient(circle, #00C896, transparent)', bottom: '5%', right: '-5%' }} />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -60, x: '-50%' }} animate={{ opacity: 1, y: 20, x: '-50%' }} exit={{ opacity: 0, y: -60, x: '-50%' }}
            style={{ position: 'fixed', top: 0, left: '50%', zIndex: 1000, background: message.type === 'succes' ? (isLight ? '#f0fdf4' : 'rgba(0,200,150,0.12)') : (isLight ? '#fef2f2' : 'rgba(239,68,68,0.12)'), border: `1px solid ${message.type === 'succes' ? '#00C89660' : '#ef444460'}`, borderRadius: 12, padding: '12px 22px', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            {message.type === 'succes' ? <CheckCircle size={17} color="#00C896" /> : <AlertCircle size={17} color="#ef4444" />}
            <span style={{ fontSize: 14, fontWeight: 500, color: text }}>{message.texte}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px)', position: 'relative', zIndex: 1 }}>

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

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, #00C896)` }} />

          {/* Halo de prestige derrière le hero pour les niveaux élevés (≥8) */}
          {(user.niveau || 1) >= 8 && (
            <motion.div aria-hidden
              animate={{ opacity: [0.15, 0.28, 0.15] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, borderRadius: '50%', filter: 'blur(80px)', background: `radial-gradient(circle, ${niveauInfo.couleur}, transparent 70%)`, pointerEvents: 'none' }} />
          )}

          <div className="pf-hero" style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28, position: 'relative' }}>
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
              <div style={{ position: 'relative', zIndex: 1, width: 88, height: 88, borderRadius: 24, background: `linear-gradient(135deg, ${accent}, #00C896)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', boxShadow: `0 8px 32px ${niveauInfo.couleur}55`, fontFamily: "'Bricolage Grotesque', sans-serif", overflow: 'hidden' }}>
                {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiales}
              </div>
              <div style={{ position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: 9, background: niveauInfo.gradient || niveauInfo.couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${bg}`, boxShadow: `0 2px 12px ${niveauInfo.couleur}aa`, zIndex: 2 }}>
                <NiveauIcon size={14} color="white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Infos */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: text, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{user.nom}</h1>
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
              { label: 'Points',  val: pointsActuels,                                         color: accent,                Icon: Zap },
              { label: 'Niveau',  val: user.niveau || 1,                                      color: niveauInfo.couleur,    Icon: NiveauIcon },
              { label: 'Tâches',  val: user.taches_count || 0,                                color: '#00C896',             Icon: CheckCircle2 },
              { label: 'Streak',  val: `${user.streak || 0}j`,                                color: '#f97316',             Icon: Flame },
              { label: 'Badges',  val: `${badgesData.nb_obtenus}/${badgesData.nb_total}`,    color: '#a78bfa',             Icon: Award },
              {
                label: 'Streak Freeze',
                val: badgesData.streak_freeze_disponible ? 'Dispo' : 'Utilisé',
                color: badgesData.streak_freeze_disponible ? '#5fb4d6' : text2,
                Icon: Snowflake,
              },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                style={{ background: isLight ? '#f8f9fc' : bg3, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <s.Icon size={12} color={s.color} strokeWidth={2.2} />
                  <div style={{ fontSize: 10, color: text2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.val}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ══ VITRINE BADGES ══ */}
        <BadgesShowcase
          T={T} cardBg={cardBg} cardBorder={cardBorder} isLight={isLight}
          text={text} text2={text2} accent={accent} bg3={bg3}
          badges={badgesData.badges}
          points={pointsActuels} streak={user.streak || 0} nbTerminees={user.taches_count || 0}
          navigate={navigate} />

        {/* ══ TIMELINE PARCOURS ══ */}
        <TimelineSection
          T={T} cardBg={cardBg} cardBorder={cardBorder} isLight={isLight}
          text={text} text2={text2} accent={accent} bg3={bg3}
          events={timeline} />

        {/* ══ ONGLETS ══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="pf-tabs" style={{ display: 'flex', gap: 4, background: isLight ? '#f1f5f9' : bg2, borderRadius: 14, padding: 4, marginBottom: 20, border: `1px solid ${cardBorder}` }}>
          {[
            { id: 'profil',   label: 'Profil',     icon: <User size={14} /> },
            { id: 'securite', label: 'Sécurité',   icon: <Lock size={14} /> },
          ].map(o => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', background: onglet === o.id ? (isLight ? 'white' : 'rgba(255,255,255,0.08)') : 'transparent', border: `1px solid ${onglet === o.id ? cardBorder : 'transparent'}`, borderRadius: 10, color: onglet === o.id ? text : text2, fontSize: 13, fontWeight: onglet === o.id ? 600 : 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: onglet === o.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
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
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>Modifier mes informations</h3>
                  <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>Mettez à jour votre nom d'affichage</p>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nom complet</label>
                <input className="pf-input" value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom"
                  onKeyDown={e => e.key === 'Enter' && modifierNom()}
                  style={{ background: inputBg, border: `1.5px solid ${nom !== user.nom ? accent : inputBorder}`, color: text }} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Adresse e-mail</label>
                <input className="pf-input" value={user.email} disabled
                  style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${inputBorder}`, color: text2, cursor: 'not-allowed', opacity: 0.7 }} />
                <p style={{ fontSize: 11, color: text2, marginTop: 6 }}>L'email ne peut pas être modifié pour des raisons de sécurité.</p>
              </div>
              <motion.button onClick={modifierNom} disabled={loading || nom === user.nom} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ padding: '13px 28px', background: nom !== user.nom ? `linear-gradient(135deg, ${accent}, #00C896)` : (isLight ? '#f1f5f9' : bg3), border: 'none', borderRadius: 11, color: nom !== user.nom ? 'white' : text2, fontWeight: 700, fontSize: 14, cursor: nom !== user.nom ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", boxShadow: nom !== user.nom ? `0 8px 24px ${accent}33` : 'none', transition: 'all 0.2s' }}>
                {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </motion.button>
            </motion.div>
          )}

          {onglet === 'securite' && (
            <motion.div key="securite" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 'clamp(20px, 4vw, 36px)', boxShadow: isLight ? '0 2px 12px rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: '#C9A84C18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={16} color="#C9A84C" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: text }}>Changer le mot de passe</h3>
                  <p style={{ fontSize: 12, color: text2, marginTop: 2 }}>Gardez votre compte sécurisé</p>
                </div>
              </div>
              {[
                { label: 'Mot de passe actuel',              val: ancienPwd,  set: setAncienPwd,  ph: 'Votre mot de passe actuel' },
                { label: 'Nouveau mot de passe',             val: newPwd,     set: setNewPwd,     ph: 'Min. 8 caractères' },
                { label: 'Confirmer le nouveau mot de passe', val: confirmPwd, set: setConfirmPwd, ph: 'Répétez' },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text2, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>{f.label}</label>
                  <input className="pf-input" type="password" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, color: text }} />
                </div>
              ))}
              {newPwd && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= forceLvl ? forceColor : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'), transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: forceColor, fontWeight: 500 }}>{forceLabel}</p>
                </div>
              )}
              <motion.button onClick={modifierPassword} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #C9A84C, #6C63FF)', border: 'none', borderRadius: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 8px 24px rgba(201,168,76,0.25)', transition: 'all 0.2s' }}>
                {loading ? 'Modification...' : 'Modifier le mot de passe'}
              </motion.button>
            </motion.div>
          )}



        </AnimatePresence>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', borderTop: `1px solid ${cardBorder}` }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${accent}, #00C896)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={11} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 12, color: text2, fontWeight: 500 }}>GetShift · Votre productivité augmentée</span>
        </motion.div>

      </div>
    </div>
  )
}
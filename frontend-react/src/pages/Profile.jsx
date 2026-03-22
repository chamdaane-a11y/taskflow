import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import {
  User, Lock, ArrowLeft, CheckCircle, AlertCircle,
  Edit3, Shield, Zap, Trophy, Star, Flame, Layers
} from 'lucide-react'
import { themes } from '../themes'
import { useTheme } from '../useTheme'

const API = 'https://getshift-backend.onrender.com'

const NIVEAUX = [
  { niveau: 1, nom: 'Débutant',  couleur: '#4ade80', min: 0,    Icon: Zap     },
  { niveau: 2, nom: 'Apprenti',  couleur: '#facc15', min: 100,  Icon: Star    },
  { niveau: 3, nom: 'Confirmé',  couleur: '#f97316', min: 300,  Icon: Flame   },
  { niveau: 4, nom: 'Expert',    couleur: '#6C63FF', min: 600,  Icon: Trophy  },
  { niveau: 5, nom: 'Maître',    couleur: '#C9A84C', min: 1000, Icon: Shield  },
]

export default function Profile() {
  const navigate = useNavigate()
  const { theme, T } = useTheme()
  const [user, setUser]             = useState(null)
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
  }, [])

  const chargerUser = async (id) => {
    try {
      const res = await axios.get(`${API}/users/${id}`, { withCredentials: true })
      setUser(res.data); setNom(res.data.nom)
      localStorage.setItem('user', JSON.stringify(res.data))
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');
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

          <div className="pf-hero" style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 88, height: 88, borderRadius: 24, background: `linear-gradient(135deg, ${accent}, #00C896)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', boxShadow: `0 8px 32px ${accent}44`, fontFamily: "'Bricolage Grotesque', sans-serif", overflow: 'hidden' }}>
                {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiales}
              </div>
              <div style={{ position: 'absolute', bottom: -6, right: -6, width: 28, height: 28, borderRadius: 8, background: niveauInfo.couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${bg}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <NiveauIcon size={13} color="white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Infos */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, color: text, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{user.nom}</h1>
                <span style={{ padding: '3px 10px', background: `${niveauInfo.couleur}22`, border: `1px solid ${niveauInfo.couleur}44`, borderRadius: 99, fontSize: 11, fontWeight: 700, color: niveauInfo.couleur, letterSpacing: 0.5 }}>
                  {niveauInfo.nom.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: 14, color: text2, marginBottom: 16 }}>{user.email}</p>
              <div style={{ maxWidth: 340 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: text2, marginBottom: 6 }}>
                  <span>{pointsActuels} pts</span>
                  <span style={{ color: accent, fontWeight: 600 }}>{niveauSuivant ? `→ ${niveauSuivant.nom} à ${niveauSuivant.min} pts` : 'Niveau max atteint'}</span>
                </div>
                <div style={{ height: 6, background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progression}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, #00C896)`, borderRadius: 99 }} />
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="pf-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Points',  val: pointsActuels,          color: accent },
              { label: 'Niveau',  val: user.niveau || 1,       color: niveauInfo.couleur },
              { label: 'Tâches',  val: user.taches_count || 0, color: '#00C896' },
              { label: 'Streak',  val: `${user.streak || 0}j`, color: '#f97316' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                style={{ flex: '1 1 80px', background: isLight ? '#f8f9fc' : bg3, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: '14px 18px', minWidth: 80 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.5px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: text2, marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
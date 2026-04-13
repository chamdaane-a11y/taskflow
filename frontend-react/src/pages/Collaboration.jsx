import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import {
  Users, Plus, Copy, Check, X, Send, MessageCircle,
  LayoutDashboard, Bot, BarChart2, Calendar, HelpCircle, Layers,
  LogOut, Menu, Crown, Share2, Link2, UserPlus, MoreHorizontal, Clock,
  PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronUp, Star, Settings, User,
  Sparkles, Flag, Target, CheckSquare, AlertTriangle
} from 'lucide-react'

const API = 'https://getshift-backend.onrender.com'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Tableau de bord',  path: '/dashboard'     },
  { icon: Bot,             label: 'Assistant IA',     path: '/ia'            },
  { icon: Sparkles,        label: 'Tomorrow Builder', path: '/tomorrow'      },
  { icon: Flag,            label: 'Goal Reverse',     path: '/goal'          },
  { icon: BarChart2,       label: 'Analytiques',      path: '/analytics'     },
  { icon: Calendar,        label: 'Planification',    path: '/planification' },
  { icon: Users,           label: 'Collaboration',    path: '/collaboration' },
  { icon: HelpCircle,      label: 'Aide',             path: '/help'          },
]

const COLONNES = [
  { id: 'todo',     label: 'À faire',   couleur: '#6c63ff', bg: '#6c63ff12' },
  { id: 'en_cours', label: 'En cours',  couleur: '#e08a3c', bg: '#e08a3c12' },
  { id: 'termine',  label: 'Terminé',   couleur: '#4caf82', bg: '#4caf8212' },
]
const PRIORITE_COLOR = { haute: '#e05c5c', moyenne: '#e08a3c', basse: '#4caf82' }

// ===== QR CODE via API publique =====
function QRCode({ value, size = 160 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=111111&margin=2&format=png`
  return <img src={url} alt="QR" width={size} height={size} style={{ borderRadius: 12, display: 'block' }} />
}

// ===== MODALE PARTAGE =====
function ModalePartage({ T, equipe, onFermer }) {
  const [copie, setCopie] = useState(false)
  const [onglet, setOnglet] = useState('lien')
  const lien = `${window.location.origin}/taskflow/#/collaboration?code=${equipe.code_invitation}`
  const texteEnc = encodeURIComponent(`Rejoins mon équipe "${equipe.nom}" sur GetShift !`)
  const lienEnc = encodeURIComponent(lien)

  const reseaux = [
    {
      nom: 'WhatsApp', couleur: '#25D366',
      url: `https://wa.me/?text=${texteEnc}%20${lienEnc}`,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    },
    {
      nom: 'Facebook', couleur: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${lienEnc}`,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    },
    {
      nom: 'Twitter / X', couleur: '#000000',
      url: `https://twitter.com/intent/tweet?text=${texteEnc}&url=${lienEnc}`,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    },
    {
      nom: 'Instagram', couleur: '#E1306C',
      url: null,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
    },
  ]

  const copierLien = () => {
    navigator.clipboard.writeText(lien)
    setCopie(true)
    setTimeout(() => setCopie(false), 2500)
  }

  return (
    <motion.div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} onClick={onFermer} />
      <motion.div style={{ background: T.bg2, borderRadius: 22, width: 'min(440px, 100%)', position: 'relative', border: `1px solid ${T.border}`, boxShadow: '0 40px 100px rgba(0,0,0,0.35)', overflow: 'hidden' }}
        initial={{ y: 28, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 28, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}>

        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0 }}>Inviter dans l'équipe</h3>
            <p style={{ fontSize: 12, color: T.text2, marginTop: 3 }}>{equipe.nom}</p>
          </div>
          <motion.button style={{ width: 32, height: 32, borderRadius: 10, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onFermer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
            <X size={14} />
          </motion.button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
          {[{ id: 'lien', label: 'Lien' }, { id: 'qr', label: 'QR Code' }, { id: 'reseaux', label: 'Réseaux' }].map(o => (
            <motion.button key={o.id}
              style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: onglet === o.id ? 700 : 500, background: onglet === o.id ? T.accent : T.bg3, color: onglet === o.id ? 'white' : T.text2, transition: 'all 0.2s' }}
              onClick={() => setOnglet(o.id)} whileTap={{ scale: 0.95 }}>
              {o.label}
            </motion.button>
          ))}
        </div>

        <div style={{ padding: '20px 24px 24px', minHeight: 200 }}>
          <AnimatePresence mode="wait">
            {onglet === 'lien' && (
              <motion.div key="lien" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p style={{ fontSize: 12, color: T.text2, marginBottom: 12, lineHeight: 1.65 }}>Partage ce lien. Toute personne qui clique peut rejoindre l'équipe directement.</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 14px' }}>
                  <Link2 size={13} color={T.text2} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{lien}</span>
                  <motion.button
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: copie ? '#4caf8220' : `${T.accent}20`, border: `1px solid ${copie ? '#4caf8240' : T.accent + '40'}`, borderRadius: 8, color: copie ? '#4caf82' : T.accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    onClick={copierLien} whileTap={{ scale: 0.95 }}>
                    {copie ? <Check size={12} /> : <Copy size={12} />}
                    {copie ? 'Copié' : 'Copier'}
                  </motion.button>
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: `${T.accent}08`, border: `1px solid ${T.accent}18`, borderRadius: 10, fontSize: 12, color: T.text2 }}>
                  Code d'invitation : <strong style={{ color: T.accent, fontFamily: 'monospace', letterSpacing: 1 }}>{equipe.code_invitation}</strong>
                </div>
              </motion.div>
            )}
            {onglet === 'qr' && (
              <motion.div key="qr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <p style={{ fontSize: 12, color: T.text2, textAlign: 'center', lineHeight: 1.65 }}>Scanne ce QR code pour rejoindre l'équipe instantanément.</p>
                <div style={{ padding: 14, background: 'white', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                  <QRCode value={lien} size={160} />
                </div>
                <p style={{ fontSize: 11, color: T.text2, opacity: 0.65 }}>Compatible avec l'appareil photo de n'importe quel téléphone</p>
              </motion.div>
            )}
            {onglet === 'reseaux' && (
              <motion.div key="reseaux" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p style={{ fontSize: 12, color: T.text2, marginBottom: 14, lineHeight: 1.65 }}>Partage directement sur tes réseaux sociaux.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {reseaux.map(r => (
                    <motion.a key={r.nom}
                      href={r.url || undefined} target={r.url ? '_blank' : undefined} rel="noopener noreferrer"
                      onClick={!r.url ? (e) => { e.preventDefault(); copierLien() } : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 13, color: T.text, textDecoration: 'none', cursor: 'pointer' }}
                      whileHover={{ borderColor: r.couleur, background: r.couleur + '10' }} whileTap={{ scale: 0.97 }}>
                      <div style={{ color: r.couleur, width: 32, height: 32, borderRadius: 9, background: r.couleur + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nom}</div>
                        {!r.url && <div style={{ fontSize: 10, color: T.text2 }}>Copie le lien</div>}
                      </div>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ===== CARTE TÂCHE KANBAN =====
function CarteTache({ T, tache, membres, onModifier, onOuvrir }) {
  const assignee = membres.find(m => m.id === tache.assignee_id)
  const col = COLONNES.find(c => c.id === tache.statut)
  return (
    <motion.div layout
      style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', marginBottom: 8 }}
      whileHover={{ borderColor: col?.couleur + '55', y: -1, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
      onClick={() => onOuvrir(tache)}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITE_COLOR[tache.priorite], flexShrink: 0, marginTop: 5 }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4, flex: 1, margin: 0 }}>{tache.titre}</p>
        <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onModifier(tache) }} whileHover={{ color: T.accent }}>
          <MoreHorizontal size={14} />
        </motion.button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {assignee && (
            <div style={{ width: 22, height: 22, borderRadius: 7, background: `${T.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.accent }} title={assignee.nom}>
              {assignee.nom.charAt(0).toUpperCase()}
            </div>
          )}
          {tache.deadline && (
            <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9} />{new Date(tache.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        {tache.nb_commentaires > 0 && (
          <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <MessageCircle size={9} />{tache.nb_commentaires}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ===== MODALE TÂCHE =====
function ModaleTache({ T, membres, tache, user, onFermer, onSauvegarder }) {
  const [form, setForm] = useState({ titre: tache?.titre || '', description: tache?.description || '', priorite: tache?.priorite || 'moyenne', statut: tache?.statut || 'todo', assignee_id: tache?.assignee_id || '' })
  return (
    <motion.div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} onClick={onFermer} />
      <motion.div style={{ background: T.bg2, borderRadius: 20, padding: '24px 26px', width: 'min(460px, 100%)', position: 'relative', border: `1px solid ${T.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
        initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }}>
        <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }} onClick={onFermer}><X size={16} /></button>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 20, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{tache ? 'Modifier' : 'Nouvelle tâche'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={{ padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13.5, outline: 'none', width: '100%' }}
            placeholder="Titre *" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} autoFocus />
          <textarea style={{ padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 70, fontFamily: "'DM Sans', sans-serif", width: '100%' }}
            placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, display: 'block', marginBottom: 5 }}>PRIORITÉ</label>
              <select style={{ width: '100%', padding: '9px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
                value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })}>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, display: 'block', marginBottom: 5 }}>STATUT</label>
              <select style={{ width: '100%', padding: '9px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
                value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                <option value="todo">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, display: 'block', marginBottom: 5 }}>ASSIGNER À</label>
            <select style={{ width: '100%', padding: '9px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
              <option value="">Non assigné</option>
              {membres.map(m => <option key={m.id} value={m.id}>{m.nom}{m.id === user.id ? ' (moi)' : ''}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <motion.button style={{ flex: 1, padding: '10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 13, cursor: 'pointer' }} onClick={onFermer}>Annuler</motion.button>
          <motion.button style={{ flex: 2, padding: '10px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => { if (form.titre.trim()) onSauvegarder({ ...form, assignee_id: form.assignee_id || null }) }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {tache ? 'Enregistrer' : 'Créer'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ===== PANNEAU COMMENTAIRES (slide from right) =====
function PanneauCommentaires({ T, tache, user, membres, onFermer }) {
  const [commentaires, setCommentaires] = useState([])
  const [texte, setTexte] = useState('')
  const endRef = useRef(null)

  useEffect(() => { charger() }, [tache.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [commentaires])

  const charger = async () => {
    try { const r = await axios.get(`${API}/equipes/taches/${tache.id}/commentaires`); setCommentaires(r.data) } catch {}
  }
  const envoyer = async () => {
    if (!texte.trim()) return
    try { await axios.post(`${API}/equipes/taches/commentaires`, { tache_id: tache.id, user_id: user.id, contenu: texte }); setTexte(''); charger() } catch {}
  }
  const assignee = membres.find(m => m.id === tache.assignee_id)
  const col = COLONNES.find(c => c.id === tache.statut)

  return (
    <motion.div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 48px rgba(0,0,0,0.18)' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}>

      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITE_COLOR[tache.priorite] }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: col?.couleur, letterSpacing: 0.6 }}>{col?.label.toUpperCase()}</span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{tache.titre}</h3>
            {tache.description && <p style={{ fontSize: 12, color: T.text2, marginTop: 6, lineHeight: 1.6 }}>{tache.description}</p>}
          </div>
          <motion.button style={{ width: 28, height: 28, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onClick={onFermer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
            <X size={13} />
          </motion.button>
        </div>
        {assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '6px 10px', background: T.bg3, borderRadius: 8, display: 'inline-flex' }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: `${T.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.accent }}>
              {assignee.nom.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 11.5, color: T.text2 }}>{assignee.nom}</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {commentaires.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <MessageCircle size={26} color={T.border} strokeWidth={1.2} style={{ margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 12, color: T.text2 }}>Aucun commentaire.</p>
          </div>
        ) : commentaires.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
              {c.nom?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.nom}</span>
                <span style={{ fontSize: 10, color: T.text2 }}>{new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ padding: '9px 12px', background: T.bg3, borderRadius: '4px 12px 12px 12px', fontSize: 13, color: T.text, lineHeight: 1.55 }}>{c.contenu}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 16px 20px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea style={{ flex: 1, padding: '10px 13px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 11, color: T.text, fontSize: 13, outline: 'none', resize: 'none', minHeight: 42, maxHeight: 110, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
            placeholder="Écrire un commentaire…" value={texte} onChange={e => setTexte(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }} rows={1} />
          <motion.button style={{ width: 40, height: 40, borderRadius: 11, background: texte.trim() ? `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)` : T.bg3, border: `1px solid ${texte.trim() ? 'transparent' : T.border}`, color: texte.trim() ? 'white' : T.text2, cursor: texte.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            onClick={envoyer} whileTap={texte.trim() ? { scale: 0.95 } : {}}>
            <Send size={15} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ===== PAGE PRINCIPALE =====
export default function Collaboration() {
  const user = JSON.parse(localStorage.getItem('user'))
  const { T } = useTheme()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // Sidebar toggle persistant (comme Dashboard)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('collab_sidebar_open') !== 'false' }
    catch { return true }
  })

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    localStorage.setItem('collab_sidebar_open', String(next))
    if (isMobile) setShowMobileSidebar(next)
  }

  useEffect(() => {
    if (isMobile) setSidebarOpen(showMobileSidebar)
  }, [showMobileSidebar, isMobile])

  const [equipes, setEquipes] = useState([])
  const [equipeActive, setEquipeActive] = useState(null)
  const [membres, setMembres] = useState([])
  const [taches, setTaches] = useState([])

  const [showPartage, setShowPartage] = useState(null)
  const [showModaleTache, setShowModaleTache] = useState(false)
  const [tacheAModifier, setTacheAModifier] = useState(null)
  const [tacheCommentaires, setTacheCommentaires] = useState(null)
  const [showCreer, setShowCreer] = useState(false)
  const [showRejoindre, setShowRejoindre] = useState(false)

  const [nomEquipe, setNomEquipe] = useState('')
  const [descEquipe, setDescEquipe] = useState('')
  const [codeRejoint, setCodeRejoint] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const profileMenuRef = useRef(null)

  // Filtres (inutilisés dans collaboration mais présents pour la sidebar identique)
  const [filtre, setFiltre] = useState('toutes')
  const bloquees = 0

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!user) { navigate('/'); return }
    chargerEquipes()
    
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const codeUrl = params.get('code')
    if (codeUrl) {
      setCodeRejoint(codeUrl)
      setShowRejoindre(true)
    }
  }, [])

  useEffect(() => {
    if (equipeActive) { chargerMembres(equipeActive.id); chargerTaches(equipeActive.id) }
  }, [equipeActive])

  const chargerEquipes = async () => {
    try { const r = await axios.get(`${API}/equipes/user/${user.id}`); setEquipes(r.data); if (r.data.length > 0) setEquipeActive(r.data[0]) } catch {}
  }
  const chargerMembres = async (id) => { try { const r = await axios.get(`${API}/equipes/${id}/membres`); setMembres(r.data) } catch {} }
  const chargerTaches = async (id) => { try { const r = await axios.get(`${API}/equipes/${id}/taches`); setTaches(r.data) } catch {} }

  const creerEquipe = async () => {
    if (!nomEquipe.trim()) { setErreur("Donne un nom à l'équipe"); return }
    setLoading(true)
    try {
      const r = await axios.post(`${API}/equipes`, { nom: nomEquipe, description: descEquipe, user_id: user.id })
      setEquipes(p => [r.data, ...p]); setEquipeActive(r.data)
      setShowCreer(false); setNomEquipe(''); setDescEquipe(''); setErreur('')
    } catch (e) { setErreur(e.response?.data?.erreur || 'Erreur') }
    setLoading(false)
  }

  const rejoindreEquipe = async () => {
    if (!codeRejoint.trim()) { setErreur("Entre le code d'invitation"); return }
    setLoading(true)
    try {
      await axios.post(`${API}/equipes/rejoindre`, { code: codeRejoint, user_id: user.id })
      await chargerEquipes(); setShowRejoindre(false); setCodeRejoint(''); setErreur('')
    } catch (e) { setErreur(e.response?.data?.erreur || 'Code invalide') }
    setLoading(false)
  }

  const sauvegarderTache = async (form) => {
    try {
      if (tacheAModifier) await axios.put(`${API}/equipes/taches/${tacheAModifier.id}`, form)
      else await axios.post(`${API}/equipes/taches`, { ...form, equipe_id: equipeActive.id, createur_id: user.id })
      chargerTaches(equipeActive.id); setShowModaleTache(false); setTacheAModifier(null)
    } catch {}
  }

  const tachesCol = (statut) => taches.filter(t => t.statut === statut)

  const SIDEBAR_W = 248
  const sidebarLeft = isMobile
    ? (sidebarOpen ? 0 : '-100%')
    : (sidebarOpen ? 0 : -SIDEBAR_W)
  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  // Mock user data for profile
  const userData = { nom: user?.nom || 'Utilisateur', email: user?.email || 'user@example.com' }
  const points = 1250
  const niveau = 3
  const niveauActuel = { label: 'Productif' }
  const pctNiveau = 42
  const streak = 5

  const IconLock = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        select option { background: ${T.bg2}; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — IDENTIQUE AU DASHBOARD (avec filtres)
      ══════════════════════════════════════════════════════════════ */}
      <motion.aside
        animate={{ left: sidebarLeft, width: SIDEBAR_W }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ width: SIDEBAR_W, background: T.bg2, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: 'clamp(16px,3vh,24px) clamp(12px,2vw,16px)', position: 'fixed', top: 0, height: '100vh', zIndex: 150, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}>

        {/* Logo + bouton fermer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'clamp(24px,4vh,32px)', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={16} color={T.bg} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>GetShift</span>
          </div>
          {!isMobile && (
            <motion.button onClick={toggleSidebar}
              style={{ width: 28, height: 28, borderRadius: 7, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              whileHover={{ color: T.accent, borderColor: T.accent }}
              title="Réduire la sidebar">
              <PanelLeftClose size={14} />
            </motion.button>
          )}
        </div>

        {/* Navigation */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>NAVIGATION</p>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = window.location.pathname === item.path || (item.path === '/collaboration' && window.location.pathname.includes('collaboration'))
          return (
            <motion.button key={item.path}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, color: active ? T.accent : T.text2, background: active ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
              onClick={() => { navigate(item.path); if (isMobile) setSidebarOpen(false) }}
              whileHover={{ x: 2, color: T.accent }}>
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </motion.button>
          )
        })}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* FILTRES (exactement comme dans Dashboard) */}
        <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>FILTRES</p>
        {[
          { val: 'toutes',   label: 'Toutes les tâches' },
          { val: 'haute',    label: 'Priorité haute' },
          { val: 'bloquee',  label: `Bloquées${bloquees > 0 ? ` (${bloquees})` : ''}` },
          { val: 'terminee', label: 'Terminées' },
        ].map(f => (
          <motion.button key={f.val}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', borderRadius: 10, color: filtre === f.val ? T.accent : T.text2, background: filtre === f.val ? `${T.accent}15` : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filtre === f.val ? 600 : 400, textAlign: 'left', marginBottom: 2 }}
            onClick={() => { setFiltre(f.val); if (isMobile) setSidebarOpen(false) }} whileHover={{ x: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.val === 'bloquee' && <IconLock size={12} color={filtre === f.val ? T.accent : T.text2} />}
              {f.label}
            </span>
            {filtre === f.val && <ChevronRight size={14} />}
          </motion.button>
        ))}

        <div style={{ height: 1, background: T.border, margin: '16px 0' }} />

        {/* Mes équipes */}
        {equipes.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.text2, letterSpacing: 1.5, marginBottom: 8, padding: '0 8px' }}>MES ÉQUIPES</p>
            {equipes.map(eq => (
              <motion.button key={eq.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 9, background: equipeActive?.id === eq.id ? `${T.accent}12` : 'transparent', border: `1px solid ${equipeActive?.id === eq.id ? T.accent + '30' : 'transparent'}`, cursor: 'pointer', textAlign: 'left', marginBottom: 2 }}
                onClick={() => { setEquipeActive(eq); if (isMobile) setSidebarOpen(false) }} whileHover={{ x: 2 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {eq.nom.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: equipeActive?.id === eq.id ? T.accent : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.nom}</div>
                  <div style={{ fontSize: 10, color: T.text2 }}>{eq.nb_membres} membre{eq.nb_membres !== 1 ? 's' : ''}</div>
                </div>
                {eq.role === 'admin' && <Crown size={10} color={T.accent} style={{ flexShrink: 0 }} />}
              </motion.button>
            ))}
          </>
        )}

        {/* Avatar avec menu déroulant (comme Dashboard) */}
        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <motion.button onClick={() => setShowProfileMenu(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, background: showProfileMenu ? `${T.accent}15` : T.bg3, border: `1.5px solid ${showProfileMenu ? T.accent + '60' : T.border}`, cursor: 'pointer', textAlign: 'left' }}
            whileHover={{ background: `${T.accent}12` }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
              {userData.nom?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData.nom}</div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Niveau {niveau} · {points} pts</div>
            </div>
            <ChevronUp size={14} color={T.accent} style={{ transform: showProfileMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
          </motion.button>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                <motion.div ref={profileMenuRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
                  style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: '0 -8px 40px rgba(0,0,0,0.25)', zIndex: 300, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || T.accent})`, color: T.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                        {userData.nom?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData.nom}</div>
                        <div style={{ fontSize: 11, color: T.text2 }}>{userData.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text2, marginBottom: 5 }}>
                      <span>Niveau {niveau} — {niveauActuel.label}</span>
                      <span style={{ color: T.accent, fontWeight: 600 }}>{points} pts</span>
                    </div>
                    <div style={{ height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pctNiveau}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.accent2 || T.accent})`, borderRadius: 99 }} />
                    </div>
                    {streak > 0 && <div style={{ fontSize: 10, color: '#e08a3c', fontWeight: 600, marginTop: 6 }}>🔥 {streak} jour{streak > 1 ? 's' : ''} de streak</div>}
                  </div>
                  <div style={{ padding: '6px' }}>
                    {[
                      { label: 'Mon profil', icon: User, onClick: () => { navigate('/profile'); setShowProfileMenu(false) } },
                      { label: 'Paramètres', icon: Settings, onClick: () => { setShowSettings(true); setShowProfileMenu(false) }, shortcut: '⌘ ,' },
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
                    <motion.button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
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
      </motion.aside>

      {/* Overlay mobile sidebar */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 140 }}
            onClick={() => { setSidebarOpen(false); setShowMobileSidebar(false) }} />
        )}
      </AnimatePresence>

      {/* Bouton toggle sidebar flottant */}
      <motion.button
        onClick={toggleSidebar}
        animate={{ left: !isMobile && sidebarOpen ? SIDEBAR_W + 12 : 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ position: 'fixed', top: 14, zIndex: 200, width: 36, height: 36, borderRadius: 10, background: T.bg2, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        whileHover={{ color: T.accent, borderColor: T.accent }}
        title={sidebarOpen ? 'Fermer la sidebar' : 'Ouvrir la sidebar'}>
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </motion.button>

      {/* MAIN */}
      <motion.main
        animate={{ marginLeft: mainMargin }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* HEADER */}
        <div style={{ padding: '13px clamp(14px,3vw,24px)', borderBottom: `1px solid ${T.border}`, background: T.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          {equipeActive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#4caf82'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                {equipeActive.nom.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipeActive.nom}</h1>
                <p style={{ fontSize: 11, color: T.text2, margin: 0 }}>{membres.length} membre{membres.length !== 1 ? 's' : ''} · {taches.length} tâche{taches.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ display: 'flex', marginLeft: 2 }}>
                {membres.slice(0, 5).map((m, i) => (
                  <div key={m.id} title={m.nom} style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent}bb, ${T.accent2 || '#4caf82'}bb)`, border: `2px solid ${T.bg2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                    {m.nom.charAt(0).toUpperCase()}
                  </div>
                ))}
                {membres.length > 5 && <div style={{ width: 26, height: 26, borderRadius: '50%', background: T.bg3, border: `2px solid ${T.bg2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.text2, marginLeft: -8 }}>+{membres.length - 5}</div>}
              </div>
            </div>
          ) : (
            <h1 style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0 }}>Collaboration</h1>
          )}

          <div style={{ display: 'flex', gap: 7, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {equipeActive && (
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                onClick={() => setShowPartage(equipeActive)} whileHover={{ borderColor: T.accent, color: T.accent }}>
                <Share2 size={13} /> {!isMobile && 'Inviter'}
              </motion.button>
            )}
            {equipeActive && (
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: `${T.accent}18`, border: `1px solid ${T.accent}35`, borderRadius: 9, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setTacheAModifier(null); setShowModaleTache(true) }} whileHover={{ scale: 1.02 }}>
                <Plus size={13} /> {!isMobile && 'Tâche'}
              </motion.button>
            )}
            <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text2, fontSize: 12, cursor: 'pointer' }}
              onClick={() => { setShowRejoindre(true); setErreur('') }} whileHover={{ borderColor: T.accent, color: T.accent }}>
              <UserPlus size={13} /> {!isMobile && 'Rejoindre'}
            </motion.button>
            <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 9, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 3px 10px ${T.accent}25` }}
              onClick={() => { setShowCreer(true); setErreur('') }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={13} /> {!isMobile && 'Équipe'}
            </motion.button>
          </div>
        </div>

        {/* CONTENU */}
        {!equipeActive ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
            <motion.div style={{ width: 68, height: 68, borderRadius: 20, background: `${T.accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
              <Users size={28} color={T.accent} strokeWidth={1.5} />
            </motion.div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif", marginBottom: 8 }}>Aucune équipe</h2>
              <p style={{ fontSize: 13, color: T.text2, lineHeight: 1.7, maxWidth: 300 }}>Crée ta première équipe ou rejoins-en une avec un code d'invitation.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <motion.button style={{ padding: '10px 18px', background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                onClick={() => { setShowRejoindre(true); setErreur('') }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                Rejoindre une équipe
              </motion.button>
              <motion.button style={{ padding: '10px 18px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${T.accent}28` }}
                onClick={() => { setShowCreer(true); setErreur('') }} whileHover={{ scale: 1.02 }}>
                Créer une équipe
              </motion.button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Barre stats */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              {COLONNES.map((col, i) => (
                <div key={col.id} style={{ flex: 1, padding: '9px 18px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.couleur }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.text2 }}>{col.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: col.couleur, marginLeft: 'auto' }}>{tachesCol(col.id).length}</span>
                </div>
              ))}
            </div>

            {/* Kanban 3 colonnes */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', overflow: isMobile ? 'auto' : 'hidden' }}>
              {COLONNES.map((col, i) => (
                <div key={col.id} style={{ display: 'flex', flexDirection: 'column', borderRight: !isMobile && i < 2 ? `1px solid ${T.border}` : 'none', overflow: 'hidden' }}>
                  <div style={{ padding: '13px 14px 8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.couleur }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{col.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: col.bg, color: col.couleur }}>{tachesCol(col.id).length}</span>
                    </div>
                    <motion.button style={{ width: 24, height: 24, borderRadius: 7, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => { setTacheAModifier(null); setShowModaleTache(true) }} whileHover={{ borderColor: col.couleur, color: col.couleur }}>
                      <Plus size={12} />
                    </motion.button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 16px' }}>
                    <AnimatePresence>
                      {tachesCol(col.id).map(t => (
                        <CarteTache key={t.id} T={T} tache={t} membres={membres}
                          onModifier={(t) => { setTacheAModifier(t); setShowModaleTache(true) }}
                          onOuvrir={setTacheCommentaires} />
                      ))}
                    </AnimatePresence>
                    {tachesCol(col.id).length === 0 && (
                      <div style={{ padding: '24px 0', textAlign: 'center' }}>
                        <p style={{ fontSize: 11, color: T.text2, opacity: 0.4 }}>Vide</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.main>

      {/* MODALES */}
      <AnimatePresence>
        {tacheCommentaires && <PanneauCommentaires key="panel" T={T} tache={tacheCommentaires} user={user} membres={membres} onFermer={() => setTacheCommentaires(null)} />}
        {showPartage && <ModalePartage key="partage" T={T} equipe={showPartage} onFermer={() => setShowPartage(null)} />}
        {showModaleTache && equipeActive && (
          <ModaleTache key="tache" T={T} membres={membres} tache={tacheAModifier} user={user}
            onFermer={() => { setShowModaleTache(false); setTacheAModifier(null) }}
            onSauvegarder={sauvegarderTache} />
        )}

        {showCreer && (
          <motion.div key="creer" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} onClick={() => setShowCreer(false)} />
            <motion.div style={{ background: T.bg2, borderRadius: 20, padding: '24px 26px', width: 'min(400px,100%)', position: 'relative', border: `1px solid ${T.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
              initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }}>
              <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }} onClick={() => setShowCreer(false)}><X size={16} /></button>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 20, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Créer une équipe</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input style={{ padding: '10px 14px', background: T.bg3, border: `1px solid ${erreur ? '#e05c5c' : T.border}`, borderRadius: 10, color: T.text, fontSize: 13.5, outline: 'none', width: '100%' }}
                  placeholder="Nom de l'équipe *" value={nomEquipe} onChange={e => { setNomEquipe(e.target.value); setErreur('') }} autoFocus onKeyDown={e => e.key === 'Enter' && creerEquipe()} />
                <input style={{ padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none', width: '100%' }}
                  placeholder="Description (optionnelle)" value={descEquipe} onChange={e => setDescEquipe(e.target.value)} />
                {erreur && <p style={{ fontSize: 12, color: '#e05c5c' }}>{erreur}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <motion.button style={{ flex: 1, padding: '10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 13, cursor: 'pointer' }} onClick={() => setShowCreer(false)}>Annuler</motion.button>
                <motion.button style={{ flex: 2, padding: '10px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                  onClick={creerEquipe} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {loading ? 'Création…' : "Créer l'équipe"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRejoindre && (
          <motion.div key="rejoindre" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} onClick={() => setShowRejoindre(false)} />
            <motion.div style={{ background: T.bg2, borderRadius: 20, padding: '24px 26px', width: 'min(400px,100%)', position: 'relative', border: `1px solid ${T.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
              initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }}>
              <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: T.text2, cursor: 'pointer' }} onClick={() => setShowRejoindre(false)}><X size={16} /></button>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Rejoindre une équipe</h3>
              <p style={{ fontSize: 12, color: T.text2, marginBottom: 18, lineHeight: 1.65 }}>Entre le code d'invitation partagé par le créateur.</p>
              <input style={{ width: '100%', padding: '11px 14px', background: T.bg3, border: `1px solid ${erreur ? '#e05c5c' : T.border}`, borderRadius: 10, color: T.text, fontSize: 14, outline: 'none', fontFamily: 'monospace', letterSpacing: 1.5 }}
                placeholder="Code d'invitation" value={codeRejoint} onChange={e => { setCodeRejoint(e.target.value); setErreur('') }}
                onKeyDown={e => e.key === 'Enter' && rejoindreEquipe()} autoFocus />
              {erreur && <p style={{ fontSize: 12, color: '#e05c5c', marginTop: 6 }}>{erreur}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <motion.button style={{ flex: 1, padding: '10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 13, cursor: 'pointer' }} onClick={() => setShowRejoindre(false)}>Annuler</motion.button>
                <motion.button style={{ flex: 2, padding: '10px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                  onClick={rejoindreEquipe} disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {loading ? 'Vérification…' : 'Rejoindre →'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWER PARAMÈTRES */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, backdropFilter: 'blur(3px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px,100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 1051, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>
              <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={18} color={T.accent} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Paramètres</h2>
                      <p style={{ fontSize: 12, color: T.text2, margin: 0, marginTop: 2 }}>{userData.nom}</p>
                    </div>
                  </div>
                  <motion.button onClick={() => setShowSettings(false)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    whileHover={{ color: '#e05c5c', borderColor: '#e05c5c' }}>
                    <X size={16} />
                  </motion.button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <p style={{ fontSize: 13, color: T.text2 }}>Paramètres généraux à venir...</p>
              </div>
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.15)', borderRadius: 12, color: '#e05c5c', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => { localStorage.removeItem('user'); navigate('/') }} whileHover={{ background: 'rgba(224,92,92,0.12)' }}>
                  <LogOut size={16} strokeWidth={1.8} />Se déconnecter
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
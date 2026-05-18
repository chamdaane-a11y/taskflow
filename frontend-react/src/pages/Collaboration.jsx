import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTheme } from '../useTheme'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile from '../components/BottomNavMobile'
import {
  Users, Plus, Copy, Check, X, Send, MessageCircle,
  LayoutDashboard, Bot, BarChart2, Calendar, HelpCircle, Layers,
  LogOut, Crown, Share2, Link2, UserPlus, MoreHorizontal, Clock,
  ChevronRight, ChevronUp, Star, Settings, User,
  Sparkles, Flag, Target, CheckSquare, AlertTriangle, Activity, GripVertical,
  ShieldCheck, ShieldX, UserMinus, Edit3, Shield, Menu,
  TrendingUp, AlertCircle, Zap, Brain, ChevronDown, Loader
} from 'lucide-react'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'

const API = 'https://getshift-backend.onrender.com'

const COLONNES = [
  { id: 'todo',          label: 'À faire',     couleur: '#6c63ff', bg: '#6c63ff12' },
  { id: 'en_cours',      label: 'En cours',    couleur: '#e08a3c', bg: '#e08a3c12' },
  { id: 'en_validation', label: 'À valider',   couleur: '#f59e0b', bg: '#f59e0b14' },
  { id: 'termine',       label: 'Terminé',     couleur: '#4caf82', bg: '#4caf8212' },
]
const PRIORITE_COLOR = { haute: '#e05c5c', moyenne: '#e08a3c', basse: '#4caf82' }

// ===== TOAST =====
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: t.bg || '#1a1a2e', border: `1px solid ${t.border || '#6c63ff44'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', cursor: 'pointer' }}
            onClick={() => removeToast(t.id)}>
            <div style={{ fontSize: 15 }}>{t.icon || '🔔'}</div>
            <span style={{ fontSize: 12.5, color: t.color || '#e2e2ff', lineHeight: 1.4, flex: 1 }}>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

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
    { nom: 'WhatsApp', couleur: '#25D366', url: `https://wa.me/?text=${texteEnc}%20${lienEnc}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
    { nom: 'Facebook', couleur: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${lienEnc}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { nom: 'Twitter / X', couleur: '#000000', url: `https://twitter.com/intent/tweet?text=${texteEnc}&url=${lienEnc}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { nom: 'Instagram', couleur: '#E1306C', url: null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
  ]

  const copierLien = () => { navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2500) }

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

// ===== QUICK ADD INLINE (en haut de chaque colonne) =====
function QuickAddInline({ T, col, onAdd }) {
  const [open, setOpen] = useState(false)
  const [titre, setTitre] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const submit = () => {
    const v = titre.trim()
    if (v) onAdd(v)
    setTitre('')
    setOpen(false)
  }

  if (open) {
    return (
      <motion.input
        ref={inputRef}
        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        value={titre}
        onChange={e => setTitre(e.target.value)}
        onBlur={submit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          else if (e.key === 'Escape') { setTitre(''); setOpen(false) }
        }}
        placeholder={`+ Tâche en ${col.label.toLowerCase()}…`}
        style={{
          width: '100%',
          padding: '9px 11px',
          background: T.bg,
          border: `1.5px solid ${col.couleur}`,
          borderRadius: 8,
          color: T.text,
          fontSize: 12.5,
          outline: 'none',
          marginBottom: 8,
          fontFamily: 'inherit',
          boxShadow: `0 0 0 3px ${col.couleur}15`,
        }}
      />
    )
  }
  return (
    <motion.button
      onClick={() => setOpen(true)}
      whileHover={{ borderColor: col.couleur, color: col.couleur }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: '100%',
        padding: '7px 11px',
        background: 'transparent',
        border: `1px dashed ${T.border}`,
        borderRadius: 8,
        color: T.text2,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginBottom: 8,
        transition: 'all 0.15s',
      }}>
      <Plus size={11} /> Ajouter une tâche
    </motion.button>
  )
}

// ===== CARTE TÂCHE — DRAGGABLE =====
function tempsRelatif(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return 'à l\'instant'
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  } catch { return '' }
}

function CarteTache({ T, tache, membres, user, onModifier, onOuvrir, onAssign, onToggleFait, onDemarrer, isDragOverlay = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(tache.id) })
  const [assignOpen, setAssignOpen] = useState(false)
  const [checkHover, setCheckHover] = useState(false)
  const popRef = useRef(null)
  const isTodo = tache.statut === 'todo'
  const isEnCours = tache.statut === 'en_cours'
  const isDone = tache.statut === 'termine'
  const isEnValidation = tache.statut === 'en_validation'
  const isCreateur = user && tache.createur_id === user.id
  const canValidate = isEnValidation && isCreateur
  // Couleur de la checkbox selon l'état
  const checkColor = isDone ? '#4caf82' : isEnValidation ? '#f59e0b' : '#4caf82'
  const checkTitle = isDone ? 'Ré-ouvrir'
    : isEnValidation ? (canValidate ? 'Valider la tâche ✓' : 'Annuler la proposition')
    : 'Marquer terminée'
  // Stripe gauche selon statut — indicateur visuel rapide
  const statusStripe = isEnCours ? '#e08a3c'
    : isEnValidation ? '#f59e0b'
    : isDone ? '#4caf82'
    : null
  const statusBadge = isEnCours ? { label: 'En cours', color: '#e08a3c', icon: 'play' }
    : null
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging && !isDragOverlay ? 0.35 : 1,
    cursor: isDragOverlay ? 'grabbing' : 'grab',
    touchAction: 'none',
  }
  const assignee = membres.find(m => m.id === tache.assignee_id)
  const col = COLONNES.find(c => c.id === tache.statut)

  useEffect(() => {
    if (!assignOpen) return
    const close = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setAssignOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [assignOpen])

  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative' }} {...attributes}>
      <motion.div layout
        style={{
          background: isDone ? `${T.bg}88` : T.bg,
          border: `1px solid ${isDone ? '#4caf8230' : T.border}`,
          borderLeft: statusStripe ? `3px solid ${statusStripe}` : `1px solid ${isDone ? '#4caf8230' : T.border}`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 8,
          boxShadow: isDragOverlay ? '0 12px 40px rgba(0,0,0,0.28)' : 'none',
          opacity: isDone ? 0.72 : 1,
          transition: 'opacity 0.2s, background 0.2s',
        }}
        whileHover={!isDragging ? { borderColor: col?.couleur + '55', y: -1, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } : {}}
        onClick={() => !isDragging && onOuvrir(tache)}
        initial={isDragOverlay ? false : { opacity: 0, y: 8 }} animate={{ opacity: isDone ? 0.72 : 1, y: 0 }}>
        {/* Chips labels (top de la carte) */}
        {tache.labels && tache.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {tache.labels.slice(0, 3).map(l => (
              <span key={l.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                  borderRadius: 99, background: `${l.couleur}22`, color: l.couleur,
                  fontSize: 9.5, fontWeight: 700, letterSpacing: 0.2,
                  border: `1px solid ${l.couleur}40`, maxWidth: 120,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                {l.nom}
              </span>
            ))}
            {tache.labels.length > 3 && (
              <span style={{ fontSize: 9.5, color: T.text2, fontWeight: 700, alignSelf: 'center' }}>
                +{tache.labels.length - 3}
              </span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          {/* Checkbox terminer/ré-ouvrir/valider */}
          <motion.button
            onClick={e => { e.stopPropagation(); onToggleFait?.(tache) }}
            onMouseEnter={() => setCheckHover(true)}
            onMouseLeave={() => setCheckHover(false)}
            whileTap={{ scale: 0.85 }}
            title={checkTitle}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `1.8px solid ${(isDone || isEnValidation) ? checkColor : (checkHover ? '#4caf82' : T.border)}`,
              background: isDone ? checkColor : isEnValidation ? `${checkColor}22` : (checkHover ? '#4caf8215' : 'transparent'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1, cursor: 'pointer', padding: 0,
              transition: 'all 0.15s',
            }}>
            {isEnValidation ? (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                <Check size={11} color={checkColor} strokeWidth={3.5} />
              </motion.div>
            ) : (isDone || checkHover) && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                <Check size={11} color={isDone ? '#fff' : '#4caf82'} strokeWidth={3.5} />
              </motion.div>
            )}
          </motion.button>
          <div {...listeners} style={{ cursor: 'grab', flexShrink: 0, color: T.text2, paddingTop: 3 }} onClick={e => e.stopPropagation()}>
            <GripVertical size={12} />
          </div>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITE_COLOR[tache.priorite], flexShrink: 0, marginTop: 5 }} />
          <p style={{
            fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1, margin: 0,
            color: isDone ? T.text2 : T.text,
            textDecoration: isDone ? 'line-through' : 'none',
          }}>{tache.titre}</p>
          <motion.button style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); onModifier(tache) }} whileHover={{ color: T.accent }}>
            <MoreHorizontal size={14} />
          </motion.button>
        </div>

        {/* Badge "terminé par X il y a Y" */}
        {isDone && tache.completed_by_nom && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#4caf82', fontWeight: 600,
            background: '#4caf8210', padding: '3px 8px', borderRadius: 99,
            marginBottom: 8, width: 'fit-content',
          }}>
            <Check size={9} strokeWidth={3} />
            <span>Par {tache.completed_by_nom} · {tempsRelatif(tache.completed_at)}</span>
          </div>
        )}

        {/* Badge "à valider — proposé par X" */}
        {isEnValidation && tache.completed_by_nom && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: '#f59e0b', fontWeight: 600,
            background: '#f59e0b15', padding: '3px 8px', borderRadius: 99,
            marginBottom: 8, width: 'fit-content',
            border: '1px solid #f59e0b30',
          }}>
            <Clock size={9} strokeWidth={3} />
            <span>
              {canValidate
                ? `Proposé par ${tache.completed_by_nom} — à valider`
                : `Proposé par ${tache.completed_by_nom} · ${tempsRelatif(tache.completed_at)}`
              }
            </span>
          </div>
        )}

        {/* Badge "En cours" (statut explicite quand pas dans la colonne visible) */}
        {statusBadge && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: statusBadge.color, fontWeight: 700,
            background: `${statusBadge.color}14`, padding: '3px 8px',
            borderRadius: 99, marginBottom: 8, width: 'fit-content',
            border: `1px solid ${statusBadge.color}30`,
          }}>
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-flex' }}>
              <Zap size={9} strokeWidth={3} />
            </motion.span>
            <span>{statusBadge.label}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Avatar cliquable : assigner / désassigner rapidement */}
            <motion.button
              onClick={e => { e.stopPropagation(); setAssignOpen(o => !o) }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              title={assignee ? `Assigné à ${assignee.nom} — cliquer pour changer` : 'Cliquer pour assigner'}
              style={{
                width: 22, height: 22, borderRadius: 7,
                background: assignee ? `${T.accent}22` : 'transparent',
                border: assignee ? 'none' : `1px dashed ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: assignee ? T.accent : T.text2,
                cursor: 'pointer',
                flexShrink: 0,
              }}>
              {assignee ? assignee.nom.charAt(0).toUpperCase() : <Plus size={10} />}
            </motion.button>
            {tache.deadline && (
              <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={9} />{new Date(tache.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </span>
            )}
            {/* Progrès sous-tâches */}
            {tache.nb_sous_taches > 0 && (
              <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 4 }}
                title={`${tache.nb_sous_taches_done}/${tache.nb_sous_taches} sous-tâches`}>
                <CheckSquare size={9} />
                {tache.nb_sous_taches_done}/{tache.nb_sous_taches}
                <span style={{ display: 'inline-block', width: 20, height: 3, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${(tache.nb_sous_taches_done / tache.nb_sous_taches) * 100}%`, background: '#4caf82', borderRadius: 99 }} />
                </span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {tache.nb_commentaires > 0 && (
              <span style={{ fontSize: 10, color: T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MessageCircle size={9} />{tache.nb_commentaires}
              </span>
            )}
            {/* Bouton "▶ Démarrer" — visible uniquement sur tâches À faire */}
            {isTodo && (
              <motion.button
                onClick={e => { e.stopPropagation(); onDemarrer?.(tache.id) }}
                whileHover={{ scale: 1.05, background: '#e08a3c22' }}
                whileTap={{ scale: 0.92 }}
                title="Démarrer la tâche"
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 9px', borderRadius: 99,
                  background: '#e08a3c14', border: `1px solid #e08a3c30`,
                  color: '#e08a3c', fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <motion.span style={{ display: 'inline-flex', marginLeft: -1 }}>
                  <svg width="8" height="8" viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9" fill="currentColor" /></svg>
                </motion.span>
                Démarrer
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Popup assignation rapide */}
      <AnimatePresence>
        {assignOpen && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 'calc(100% - 4px)',
              left: 12,
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: 4,
              minWidth: 180,
              maxHeight: 220,
              overflowY: 'auto',
              zIndex: 50,
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: T.text2, letterSpacing: 1.4, padding: '6px 10px 4px', margin: 0 }}>ASSIGNER À</p>
            <button
              onClick={() => { onAssign?.(tache.id, null); setAssignOpen(false) }}
              style={popItemStyle(T, tache.assignee_id === null)}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `1px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={9} color={T.text2} />
              </div>
              <span>Non assigné</span>
            </button>
            {membres.map(m => (
              <button
                key={m.id}
                onClick={() => { onAssign?.(tache.id, m.id); setAssignOpen(false) }}
                style={popItemStyle(T, tache.assignee_id === m.id)}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: `${T.accent}22`, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  {m.nom.charAt(0).toUpperCase()}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nom}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const popItemStyle = (T, active) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', padding: '7px 10px',
  background: active ? `${T.accent}15` : 'transparent',
  border: 'none',
  borderRadius: 7,
  color: T.text,
  fontSize: 12,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  transition: 'background 0.12s',
})

// ===== COLONNE DROPPABLE =====
function ColonneDroppable({ T, col, children, isOver }) {
  const { setNodeRef } = useDroppable({ id: col.id })
  return (
    <div ref={setNodeRef} style={{
      flex: 1, overflowY: 'auto', padding: '4px 12px 16px',
      background: isOver ? col.bg : 'transparent',
      transition: 'background 0.2s',
      borderRadius: 8,
    }}>
      {children}
    </div>
  )
}

// ===== MODALE TÂCHE =====
function ModaleTache({ T, membres, tache, user, labels = [], onToggleLabel, onFermer, onSauvegarder }) {
  const [form, setForm] = useState({ titre: tache?.titre || '', description: tache?.description || '', priorite: tache?.priorite || 'moyenne', statut: tache?.statut || 'todo', assignee_id: tache?.assignee_id || '' })
  const [sousTaches, setSousTaches] = useState([])
  const [nouvelleST, setNouvelleST] = useState('')
  const [stLoading, setStLoading] = useState(false)

  useEffect(() => {
    if (!tache?.id) return
    axios.get(`${API}/equipes/taches/${tache.id}/sous-taches`)
      .then(r => setSousTaches(r.data || []))
      .catch(() => {})
  }, [tache?.id])

  const ajouterST = async () => {
    if (!nouvelleST.trim() || !tache?.id) return
    setStLoading(true)
    try {
      const r = await axios.post(`${API}/equipes/taches/${tache.id}/sous-taches`, { titre: nouvelleST.trim() })
      if (r.data?.id) setSousTaches(p => [...p, r.data])
      setNouvelleST('')
    } catch {}
    setStLoading(false)
  }

  const toggleST = async (id) => {
    setSousTaches(p => p.map(s => s.id === id ? { ...s, terminee: s.terminee ? 0 : 1 } : s))
    try { await axios.patch(`${API}/equipes/sous-taches/${id}/toggle`) } catch {}
  }

  const supprimerST = async (id) => {
    setSousTaches(p => p.filter(s => s.id !== id))
    try { await axios.delete(`${API}/equipes/sous-taches/${id}`) } catch {}
  }

  const stTotal = sousTaches.length
  const stDone = sousTaches.filter(s => s.terminee).length
  const stPct = stTotal ? Math.round(stDone / stTotal * 100) : 0

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
                <option value="en_validation">À valider</option>
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

          {/* Labels (uniquement si la tâche existe) */}
          {tache?.id && labels.length > 0 && (() => {
            const tacheLabels = tache.labels || []
            const labelIds = new Set(tacheLabels.map(l => l.id))
            return (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.text2, display: 'block', marginBottom: 8 }}>
                  LABELS {tacheLabels.length > 0 && <span style={{ color: T.text, marginLeft: 4 }}>· {tacheLabels.length}</span>}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {labels.map(l => {
                    const active = labelIds.has(l.id)
                    return (
                      <button
                        key={l.id}
                        onClick={() => onToggleLabel?.(tache.id, l.id, active)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', borderRadius: 99,
                          background: active ? `${l.couleur}28` : T.bg3,
                          color: active ? l.couleur : T.text2,
                          fontSize: 11.5, fontWeight: 600,
                          border: `1px solid ${active ? l.couleur + '60' : T.border}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}>
                        {active && <Check size={10} strokeWidth={3} />}
                        {l.nom}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Sous-tâches (uniquement si la tâche existe) */}
          {tache?.id && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>
                  SOUS-TÂCHES {stTotal > 0 && <span style={{ color: T.text, marginLeft: 4 }}>· {stDone}/{stTotal}</span>}
                </label>
                {stTotal > 0 && (
                  <span style={{ fontSize: 10, color: stPct === 100 ? '#4caf82' : T.text2, fontWeight: 700 }}>{stPct}%</span>
                )}
              </div>
              {stTotal > 0 && (
                <div style={{ height: 4, background: T.bg3, borderRadius: 99, marginBottom: 8, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stPct}%` }} transition={{ duration: 0.5 }}
                    style={{ height: '100%', background: '#4caf82', borderRadius: 99 }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                {sousTaches.map(s => (
                  <motion.div key={s.id}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: T.bg3, borderRadius: 8 }}>
                    <button
                      onClick={() => toggleST(s.id)}
                      style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: `1.8px solid ${s.terminee ? '#4caf82' : T.border}`,
                        background: s.terminee ? '#4caf82' : 'transparent',
                        cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}>
                      {s.terminee ? <Check size={10} color="#fff" strokeWidth={3.5} /> : null}
                    </button>
                    <span style={{ flex: 1, fontSize: 12.5, color: s.terminee ? T.text2 : T.text, textDecoration: s.terminee ? 'line-through' : 'none', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {s.titre}
                    </span>
                    <button
                      onClick={() => supprimerST(s.id)}
                      title="Supprimer"
                      style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 2, flexShrink: 0, opacity: 0.6 }}>
                      <X size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={nouvelleST}
                  onChange={e => setNouvelleST(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !stLoading && nouvelleST.trim()) { e.preventDefault(); ajouterST() } }}
                  placeholder="Ajouter une sous-tâche…"
                  disabled={stLoading}
                  style={{ flex: 1, padding: '8px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 12.5, outline: 'none' }}
                />
                <motion.button
                  onClick={ajouterST}
                  disabled={stLoading || !nouvelleST.trim()}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '8px 12px',
                    background: nouvelleST.trim() ? T.accent : T.bg3,
                    border: 'none', borderRadius: 9,
                    color: nouvelleST.trim() ? 'white' : T.text2,
                    fontSize: 12.5, fontWeight: 600,
                    cursor: nouvelleST.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  <Plus size={13} />
                </motion.button>
              </div>
            </div>
          )}
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

// Highlight @mentions dans un texte
function HighlightMentions({ texte, T }) {
  const parts = texte.split(/(@\w[\w\s]*?)(?=\s|$|@)/g)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('@') ? (
          <span key={i} style={{ color: T.accent, fontWeight: 700, background: `${T.accent}18`, borderRadius: 4, padding: '0 3px' }}>{p}</span>
        ) : p
      )}
    </span>
  )
}

// ===== PANNEAU COMMENTAIRES avec @mentions =====
function PanneauCommentaires({ T, tache, user, membres, onFermer }) {
  const [commentaires, setCommentaires] = useState([])
  const [texte, setTexte] = useState('')
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionIdx, setMentionIdx] = useState(0)
  const endRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { charger() }, [tache.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [commentaires])

  const charger = async () => {
    try { const r = await axios.get(`${API}/equipes/taches/${tache.id}/commentaires`); setCommentaires(r.data) } catch {}
  }

  const envoyer = async () => {
    if (!texte.trim()) return
    try {
      await axios.post(`${API}/equipes/taches/commentaires`, {
        tache_id: tache.id, user_id: user.id, contenu: texte, equipe_id: tache.equipe_id
      })
      setTexte(''); setMentionQuery(null); charger()
    } catch {}
  }

  const handleTexteChange = (e) => {
    const val = e.target.value
    setTexte(val)
    const cursor = e.target.selectionStart
    const before = val.slice(0, cursor)
    const match = before.match(/@(\w[\w ]*)$/)
    if (match) { setMentionQuery(match[1]); setMentionIdx(0) }
    else setMentionQuery(null)
  }

  const mentionsSuggerees = mentionQuery !== null
    ? membres.filter(m => m.id !== user.id && m.nom.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : []

  const insererMention = (membre) => {
    const ta = textareaRef.current
    const cursor = ta.selectionStart
    const before = texte.slice(0, cursor)
    const after = texte.slice(cursor)
    const newBefore = before.replace(/@(\w[\w ]*)$/, `@${membre.nom} `)
    setTexte(newBefore + after)
    setMentionQuery(null)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newBefore.length, newBefore.length) }, 0)
  }

  const handleKeyDown = (e) => {
    if (mentionsSuggerees.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionsSuggerees.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insererMention(mentionsSuggerees[mentionIdx]); return }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '6px 10px', background: T.bg3, borderRadius: 8 }}>
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
            <p style={{ fontSize: 12, color: T.text2 }}>Aucun commentaire. Tape @ pour mentionner quelqu'un.</p>
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
              <div style={{ padding: '9px 12px', background: T.bg3, borderRadius: '4px 12px 12px 12px', fontSize: 13, color: T.text, lineHeight: 1.55 }}>
                <HighlightMentions texte={c.contenu} T={T} />
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 16px 20px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        {/* Popup @mentions */}
        <AnimatePresence>
          {mentionsSuggerees.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '4px', marginBottom: 8, boxShadow: '0 -8px 24px rgba(0,0,0,0.2)' }}>
              {mentionsSuggerees.map((m, i) => (
                <motion.div key={m.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: i === mentionIdx ? `${T.accent}15` : 'transparent' }}
                  onClick={() => insererMention(m)}
                  onMouseEnter={() => setMentionIdx(i)}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: `${T.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
                    {m.nom.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: i === mentionIdx ? T.accent : T.text }}>{m.nom}</span>
                  {m.role === 'admin' && <Crown size={10} color={T.accent} style={{ marginLeft: 'auto' }} />}
                </motion.div>
              ))}
              <div style={{ padding: '3px 10px 4px', fontSize: 10, color: T.text2 }}>↑↓ naviguer · Enter sélectionner · Esc annuler</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea ref={textareaRef}
            style={{ flex: 1, padding: '10px 13px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 11, color: T.text, fontSize: 13, outline: 'none', resize: 'none', minHeight: 42, maxHeight: 110, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
            placeholder="Écrire un commentaire… (@ pour mentionner)" value={texte}
            onChange={handleTexteChange} onKeyDown={handleKeyDown} rows={1} />
          <motion.button style={{ width: 40, height: 40, borderRadius: 11, background: texte.trim() ? `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)` : T.bg3, border: `1px solid ${texte.trim() ? 'transparent' : T.border}`, color: texte.trim() ? 'white' : T.text2, cursor: texte.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            onClick={envoyer} whileTap={texte.trim() ? { scale: 0.95 } : {}}>
            <Send size={15} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ===== DRAWER ACTIVITÉ =====
function DrawerActivite({ T, equipe_id, onFermer }) {
  const [activites, setActivites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const charger = async () => {
      try {
        const r = await axios.get(`${API}/equipes/${equipe_id}/activites`)
        setActivites(r.data)
      } catch {}
      setLoading(false)
    }
    charger()
    const iv = setInterval(charger, 10000)
    return () => clearInterval(iv)
  }, [equipe_id])

  const ACTION_ICON = {
    'a créé la tâche': '✅',
    'a modifié la tâche': '✏️',
    'a commenté sur': '💬',
    'a déplacé vers À faire': '📋',
    'a déplacé vers En cours': '⚡',
    'a déplacé vers Terminé': '🎉',
  }

  const tempsRelatif = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000
    if (diff < 60) return 'à l\'instant'
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <motion.div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(360px, 100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 48px rgba(0,0,0,0.18)' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} color={T.accent} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Activité</h3>
            <p style={{ fontSize: 11, color: T.text2, margin: 0 }}>30 dernières actions</p>
          </div>
        </div>
        <motion.button style={{ width: 28, height: 28, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onFermer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
          <X size={13} />
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 12, color: T.text2 }}>Chargement…</p>
          </div>
        ) : activites.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <Activity size={28} color={T.border} strokeWidth={1.2} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>Aucune activité</p>
            <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.6 }}>Les actions de l'équipe apparaîtront ici.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 1, background: T.border }} />
            {activites.map((a, i) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{ display: 'flex', gap: 14, marginBottom: 18, paddingLeft: 4 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.bg3, border: `2px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, zIndex: 1, marginTop: 2 }}>
                  {ACTION_ICON[a.action] || '🔹'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: T.text, lineHeight: 1.45, margin: 0, marginBottom: 2 }}>
                    <strong>{a.nom_user}</strong>{' '}{a.action}
                    {a.cible && <span style={{ color: T.text2 }}> « {a.cible} »</span>}
                  </p>
                  <span style={{ fontSize: 10.5, color: T.text2 }}>{tempsRelatif(a.created_at)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

// ===== DRAWER GESTION ÉQUIPE (admin) =====
function DrawerGestion({ T, equipe, membres, user, onFermer, onEquipeRenommee, onMembreExclu, onRoleChange }) {
  const [nomEdit, setNomEdit] = useState(equipe.nom)
  const [editingNom, setEditingNom] = useState(false)
  const [confirmKick, setConfirmKick] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null)

  const renommer = async () => {
    if (!nomEdit.trim() || nomEdit === equipe.nom) { setEditingNom(false); return }
    setLoadingAction('nom')
    try {
      await axios.patch(`${API}/equipes/${equipe.id}/nom`, { user_id: user.id, nom: nomEdit.trim() })
      onEquipeRenommee(nomEdit.trim())
      setEditingNom(false)
    } catch {}
    setLoadingAction(null)
  }

  const exclure = async (membreId) => {
    setLoadingAction('kick-' + membreId)
    try {
      await axios.delete(`${API}/equipes/${equipe.id}/membres/${membreId}`, { data: { user_id: user.id } })
      onMembreExclu(membreId)
      setConfirmKick(null)
    } catch {}
    setLoadingAction(null)
  }

  const changerRole = async (membreId, nouveauRole) => {
    setLoadingAction('role-' + membreId)
    try {
      await axios.patch(`${API}/equipes/${equipe.id}/membres/${membreId}/role`, { user_id: user.id, role: nouveauRole })
      onRoleChange(membreId, nouveauRole)
    } catch {}
    setLoadingAction(null)
  }

  return (
    <motion.div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 48px rgba(0,0,0,0.18)' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}>

      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={16} color={T.accent} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Gérer l'équipe</h3>
            <p style={{ fontSize: 11, color: T.text2, margin: 0 }}>Paramètres admin</p>
          </div>
        </div>
        <motion.button style={{ width: 28, height: 28, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onFermer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
          <X size={13} />
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Renommer l'équipe */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.3, marginBottom: 10 }}>NOM DE L'ÉQUIPE</p>
        {editingNom ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input style={{ flex: 1, padding: '9px 12px', background: T.bg3, border: `1px solid ${T.accent}50`, borderRadius: 10, color: T.text, fontSize: 13, outline: 'none' }}
              value={nomEdit} onChange={e => setNomEdit(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') renommer(); if (e.key === 'Escape') setEditingNom(false) }} />
            <motion.button style={{ padding: '9px 14px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 10, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: loadingAction === 'nom' ? 0.7 : 1 }}
              onClick={renommer} whileTap={{ scale: 0.97 }}>
              {loadingAction === 'nom' ? '…' : <Check size={14} />}
            </motion.button>
            <motion.button style={{ padding: '9px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text2, fontSize: 12, cursor: 'pointer' }}
              onClick={() => { setEditingNom(false); setNomEdit(equipe.nom) }}>
              <X size={14} />
            </motion.button>
          </div>
        ) : (
          <motion.div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 24, cursor: 'pointer' }}
            onClick={() => setEditingNom(true)} whileHover={{ borderColor: T.accent }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{nomEdit}</span>
            <Edit3 size={13} color={T.text2} />
          </motion.div>
        )}

        {/* Liste membres */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.3, marginBottom: 10 }}>MEMBRES ({membres.length})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {membres.map(m => {
            const isMe = m.id === user.id
            const isCreateur = m.id === equipe.createur_id
            return (
              <div key={m.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}90, ${T.accent2 || '#4caf82'}90)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {m.nom.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.nom}{isMe ? ' (moi)' : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <div style={{ fontSize: 10, color: m.role === 'admin' ? T.accent : T.text2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {m.role === 'admin' ? <><Crown size={9} /> Admin</> : 'Membre'}
                      </div>
                      {isCreateur && <span style={{ fontSize: 9, background: `${T.accent}18`, color: T.accent, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>CRÉATEUR</span>}
                    </div>
                  </div>
                  {!isMe && !isCreateur && (
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <motion.button title={m.role === 'admin' ? 'Rétrograder' : 'Promouvoir admin'}
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loadingAction === 'role-' + m.id ? 0.5 : 1 }}
                        onClick={() => changerRole(m.id, m.role === 'admin' ? 'membre' : 'admin')}
                        whileHover={{ borderColor: T.accent, color: T.accent }}>
                        {m.role === 'admin' ? <ShieldX size={12} /> : <ShieldCheck size={12} />}
                      </motion.button>
                      <motion.button title="Exclure"
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loadingAction === 'kick-' + m.id ? 0.5 : 1 }}
                        onClick={() => setConfirmKick(m)}
                        whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
                        <UserMinus size={12} />
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Confirm kick */}
                <AnimatePresence>
                  {confirmKick?.id === m.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderTop: 'none', borderRadius: '0 0 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#e05c5c' }}>Exclure <strong>{m.nom}</strong> ?</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <motion.button style={{ padding: '5px 10px', background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 7, color: '#e05c5c', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => exclure(m.id)} whileTap={{ scale: 0.97 }}>
                            Exclure
                          </motion.button>
                          <motion.button style={{ padding: '5px 10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 7, color: T.text2, fontSize: 11, cursor: 'pointer' }}
                            onClick={() => setConfirmKick(null)}>
                            Annuler
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ===== LABEL_PALETTE — couleurs prédéfinies pour les labels =====
const LABEL_PALETTE = [
  '#6c63ff', '#3b82f6', '#06b6d4', '#22a06b',
  '#4caf82', '#f59e0b', '#e08a3c', '#e05c5c',
  '#ec4899', '#a855f7', '#64748b', '#374151',
]

// ===== DRAWER LABELS — gérer les étiquettes d'une équipe =====
function DrawerLabels({ T, equipe_id, labels, onFermer, onLabelsChange }) {
  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleCouleur, setNouvelleCouleur] = useState(LABEL_PALETTE[0])
  const [editingId, setEditingId] = useState(null)
  const [editNom, setEditNom] = useState('')
  const [editCouleur, setEditCouleur] = useState('')
  const [loading, setLoading] = useState(false)

  const creer = async () => {
    if (!nouveauNom.trim()) return
    setLoading(true)
    try {
      const r = await axios.post(`${API}/equipes/${equipe_id}/labels`, {
        nom: nouveauNom.trim(), couleur: nouvelleCouleur
      })
      if (r.data?.id) onLabelsChange([...labels, r.data])
      setNouveauNom(''); setNouvelleCouleur(LABEL_PALETTE[0])
    } catch {}
    setLoading(false)
  }

  const debuterEdit = (label) => {
    setEditingId(label.id); setEditNom(label.nom); setEditCouleur(label.couleur)
  }

  const sauvegarderEdit = async (id) => {
    if (!editNom.trim()) return
    try {
      const r = await axios.patch(`${API}/equipes/labels/${id}`, { nom: editNom.trim(), couleur: editCouleur })
      if (r.data?.id) onLabelsChange(labels.map(l => l.id === id ? r.data : l))
      setEditingId(null)
    } catch {}
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer ce label ? Il sera retiré de toutes les tâches.')) return
    try {
      await axios.delete(`${API}/equipes/labels/${id}`)
      onLabelsChange(labels.filter(l => l.id !== id))
    } catch {}
  }

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 100%)',
        background: T.bg2, borderLeft: `1px solid ${T.border}`,
        boxShadow: '-16px 0 48px rgba(0,0,0,0.25)', zIndex: 400,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#a855f7'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={15} color="#fff" strokeWidth={2.3} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Labels</h3>
            <p style={{ margin: 0, fontSize: 11, color: T.text2 }}>{labels.length} étiquette{labels.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={onFermer} style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      {/* Corps scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {/* Création */}
        <div style={{ background: T.bg3, borderRadius: 12, padding: 14, marginBottom: 18, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 8, margin: '0 0 8px' }}>NOUVEAU LABEL</p>
          <input
            value={nouveauNom}
            onChange={e => setNouveauNom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !loading && nouveauNom.trim()) creer() }}
            placeholder="Nom du label (ex: Bug, Feature, Urgent…)"
            style={{ width: '100%', padding: '9px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 12.5, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {LABEL_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => setNouvelleCouleur(c)}
                style={{
                  width: 24, height: 24, borderRadius: 7, background: c,
                  border: nouvelleCouleur === c ? `2.5px solid ${T.text}` : 'none',
                  cursor: 'pointer', padding: 0,
                  boxShadow: nouvelleCouleur === c ? `0 0 0 2px ${T.bg2}, 0 0 0 4px ${c}80` : 'none',
                  transition: 'all 0.15s',
                }} />
            ))}
          </div>
          {/* Preview */}
          {nouveauNom.trim() && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.text2, letterSpacing: 1, marginRight: 8 }}>APERÇU :</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 99, background: `${nouvelleCouleur}22`, color: nouvelleCouleur, fontSize: 11, fontWeight: 700, border: `1px solid ${nouvelleCouleur}50` }}>
                {nouveauNom.trim()}
              </span>
            </div>
          )}
          <motion.button
            onClick={creer}
            disabled={loading || !nouveauNom.trim()}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '8px 12px',
              background: nouveauNom.trim() ? `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)` : T.bg,
              border: 'none', borderRadius: 9,
              color: nouveauNom.trim() ? '#fff' : T.text2,
              fontSize: 12.5, fontWeight: 700,
              cursor: nouveauNom.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Plus size={13} /> Créer le label
          </motion.button>
        </div>

        {/* Liste */}
        <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 10 }}>TOUS LES LABELS</p>
        {labels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: T.text2, fontSize: 12, fontStyle: 'italic' }}>
            Aucun label pour l'instant.<br />Crée-en un pour catégoriser tes tâches.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {labels.map(label => (
              <motion.div
                key={label.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 10 }}>
                {editingId === label.id ? (
                  <div>
                    <input
                      value={editNom}
                      onChange={e => setEditNom(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sauvegarderEdit(label.id); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                      style={{ width: '100%', padding: '7px 10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 7, color: T.text, fontSize: 12.5, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {LABEL_PALETTE.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditCouleur(c)}
                          style={{
                            width: 20, height: 20, borderRadius: 6, background: c,
                            border: editCouleur === c ? `2px solid ${T.text}` : 'none',
                            cursor: 'pointer', padding: 0,
                          }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditingId(null)}
                        style={{ flex: 1, padding: '6px 10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 7, color: T.text2, fontSize: 11.5, cursor: 'pointer' }}>
                        Annuler
                      </button>
                      <button onClick={() => sauvegarderEdit(label.id)}
                        style={{ flex: 1, padding: '6px 10px', background: T.accent, border: 'none', borderRadius: 7, color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                        Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '3px 11px',
                      borderRadius: 99, background: `${label.couleur}22`,
                      color: label.couleur, fontSize: 12, fontWeight: 700,
                      border: `1px solid ${label.couleur}50`, flex: 1, minWidth: 0,
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label.nom}</span>
                    </span>
                    <button onClick={() => debuterEdit(label)} title="Modifier"
                      style={{ background: 'none', border: 'none', color: T.text2, cursor: 'pointer', padding: 4 }}>
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => supprimer(label.id)} title="Supprimer"
                      style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer', padding: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ===== MINI BAR CHART CSS =====
function MiniBar({ valeur, max, couleur, label, T }) {
  const pct = max > 0 ? Math.round((valeur / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.text2 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: couleur }}>{valeur}</span>
      </div>
      <div style={{ height: 6, background: T.bg3, borderRadius: 99, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ height: '100%', background: couleur, borderRadius: 99 }} />
      </div>
    </div>
  )
}

// ===== DRAWER ANALYTICS ÉQUIPE =====
function DrawerAnalytiques({ T, equipe_id, onFermer }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const charger = async () => {
      try { const r = await axios.get(`${API}/equipes/${equipe_id}/stats`); setStats(r.data) } catch {}
      setLoading(false)
    }
    charger()
  }, [equipe_id])

  const STATUT_COLOR = { todo: '#6c63ff', en_cours: '#e08a3c', termine: '#4caf82' }
  const STATUT_LABEL = { todo: 'À faire', en_cours: 'En cours', termine: 'Terminé' }

  return (
    <motion.div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(400px, 100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 48px rgba(0,0,0,0.18)', overflowY: 'auto' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}>

      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: T.bg2, zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} color={T.accent} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Analytics équipe</h3>
            <p style={{ fontSize: 11, color: T.text2, margin: 0 }}>Vélocité & contribution</p>
          </div>
        </div>
        <motion.button style={{ width: 28, height: 28, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onFermer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
          <X size={13} />
        </motion.button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.accent, margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : !stats ? (
          <p style={{ color: T.text2, fontSize: 13 }}>Erreur de chargement.</p>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total', valeur: stats.total, couleur: T.accent },
                { label: 'Terminées', valeur: stats.par_statut?.termine || 0, couleur: '#4caf82' },
                { label: 'En retard', valeur: stats.en_retard?.length || 0, couleur: stats.en_retard?.length > 0 ? '#e05c5c' : T.text2 },
              ].map(k => (
                <div key={k.label} style={{ padding: '12px 10px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.couleur, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{k.valeur}</div>
                  <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Taux completion anneau */}
            <div style={{ padding: '16px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="28" fill="none" stroke={T.border} strokeWidth="7" />
                  <motion.circle cx="34" cy="34" r="28" fill="none" stroke="#4caf82" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 28}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - stats.taux_completion / 100) }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    transform="rotate(-90 34 34)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#4caf82' }}>{stats.taux_completion}%</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Taux de complétion</div>
                <div style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>{stats.par_statut?.termine || 0} tâches terminées sur {stats.total}</div>
              </div>
            </div>

            {/* Répartition par statut */}
            <div style={{ padding: '16px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 12 }}>RÉPARTITION</p>
              {Object.entries(STATUT_LABEL).map(([statut, label]) => (
                <MiniBar key={statut} T={T}
                  valeur={stats.par_statut?.[statut] || 0}
                  max={stats.total}
                  couleur={STATUT_COLOR[statut]}
                  label={label} />
              ))}
            </div>

            {/* Contribution par membre */}
            {stats.membres?.length > 0 && (
              <div style={{ padding: '16px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1.2, marginBottom: 12 }}>CHARGE PAR MEMBRE</p>
                {stats.membres.map(m => (
                  <div key={m.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: `${T.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
                        {m.nom.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text, flex: 1 }}>{m.nom}</span>
                      <span style={{ fontSize: 11, color: T.text2 }}>{m.total || 0} tâches</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[['todo', '#6c63ff'], ['en_cours', '#e08a3c'], ['termine', '#4caf82']].map(([s, c]) => {
                        const v = m[s] || 0
                        return v > 0 ? (
                          <div key={s} title={`${STATUT_LABEL[s]}: ${v}`}
                            style={{ height: 5, flex: v, background: c, borderRadius: 99, transition: 'all 0.5s' }} />
                        ) : null
                      })}
                      {(m.total || 0) === 0 && <div style={{ height: 5, flex: 1, background: T.border, borderRadius: 99 }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* En retard */}
            {stats.en_retard?.length > 0 && (
              <div style={{ padding: '16px', background: 'rgba(224,92,92,0.05)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <AlertCircle size={14} color="#e05c5c" />
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#e05c5c', letterSpacing: 1.2, margin: 0 }}>EN RETARD ({stats.en_retard.length})</p>
                </div>
                {stats.en_retard.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '8px 10px', background: 'rgba(224,92,92,0.04)', borderRadius: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITE_COLOR[t.priorite] || '#e05c5c', marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</div>
                      <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>
                        {t.assignee_nom || 'Non assigné'} · {t.deadline ? new Date(t.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

// ===== DRAWER IA COACH D'ÉQUIPE =====
const SUGGESTIONS_IA_EQUIPE = [
  { icon: '🔍', text: 'Qui est surchargé dans l\'équipe ?' },
  { icon: '⚡', text: 'Génère un sprint planning pour cette semaine' },
  { icon: '⚠️', text: 'Quelles tâches sont en retard ?' },
  { icon: '🔄', text: 'Comment répartir mieux les tâches ?' },
]

function DrawerIAEquipe({ T, equipe_id, equipe_nom, user, onFermer }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const envoyer = async (texte) => {
    const msg = texte || input.trim()
    if (!msg || loading) return
    setInput('')
    const userMsg = { role: 'user', content: msg }
    setMessages(p => [...p, userMsg])
    setLoading(true)
    try {
      const r = await axios.post(`${API}/equipes/${equipe_id}/ia`, {
        message: msg,
        user_id: user.id,
        historique: messages.slice(-8)
      })
      setMessages(p => [...p, { role: 'assistant', content: r.data.reponse }])
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Désolé, une erreur s\'est produite.' }])
    }
    setLoading(false)
  }

  return (
    <motion.div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: T.bg2, borderLeft: `1px solid ${T.border}`, zIndex: 500, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 48px rgba(0,0,0,0.18)' }}
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}>

      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#a855f7'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: T.text, margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Coach IA</h3>
            <p style={{ fontSize: 11, color: T.text2, margin: 0 }}>{equipe_nom}</p>
          </div>
        </div>
        <motion.button style={{ width: 28, height: 28, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={onFermer} whileHover={{ borderColor: '#e05c5c', color: '#e05c5c' }}>
          <X size={13} />
        </motion.button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${T.accent}20, ${T.accent2 || '#a855f7'}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Brain size={26} color={T.accent} strokeWidth={1.5} />
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 4px', fontFamily: "'Bricolage Grotesque', sans-serif" }}>Coach IA de l'équipe</h4>
            <p style={{ fontSize: 12, color: T.text2, textAlign: 'center', lineHeight: 1.6, marginBottom: 20, maxWidth: 280 }}>Je connais toutes les tâches et membres de ton équipe. Demande-moi n'importe quoi.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
              {SUGGESTIONS_IA_EQUIPE.map((s, i) => (
                <motion.button key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 12.5, cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => envoyer(s.text)} whileHover={{ borderColor: T.accent, x: 2 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span>{s.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#a855f7'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={13} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 13px', borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              background: m.role === 'user' ? `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)` : T.bg3,
              color: m.role === 'user' ? 'white' : T.text,
              fontSize: 13, lineHeight: 1.55,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2 || '#a855f7'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Brain size={13} color="white" />
            </div>
            <div style={{ padding: '12px 16px', background: T.bg3, borderRadius: '4px 12px 12px 12px', display: 'flex', gap: 5 }}>
              {[0, 1, 2].map(d => (
                <motion.div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }}
                  animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, delay: d * 0.15, repeat: Infinity }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px 20px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea ref={inputRef}
            style={{ flex: 1, padding: '10px 13px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 11, color: T.text, fontSize: 13, outline: 'none', resize: 'none', minHeight: 42, maxHeight: 110, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
            placeholder="Demande au Coach IA d'équipe…" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
            rows={1} />
          <motion.button
            style={{ width: 40, height: 40, borderRadius: 11, background: input.trim() && !loading ? `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)` : T.bg3, border: `1px solid ${input.trim() && !loading ? 'transparent' : T.border}`, color: input.trim() && !loading ? 'white' : T.text2, cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
            onClick={() => envoyer()} whileTap={input.trim() && !loading ? { scale: 0.95 } : {}}>
            {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
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

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' }
    catch { return true }
  })

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
    if (isMobile) setShowMobileSidebar(next)
  }

  useEffect(() => {
    if (isMobile) setSidebarOpen(showMobileSidebar)
  }, [showMobileSidebar, isMobile])

  const [equipes, setEquipes] = useState([])
  const [equipeActive, setEquipeActive] = useState(null)
  const [membres, setMembres] = useState([])
  const membresRef = useRef([])
  membresRef.current = membres
  const [taches, setTaches] = useState([])
  const tachesRef = useRef(taches)
  tachesRef.current = taches

  const [showPartage, setShowPartage] = useState(null)
  const [showModaleTache, setShowModaleTache] = useState(false)
  const [tacheAModifier, setTacheAModifier] = useState(null)
  const [tacheCommentaires, setTacheCommentaires] = useState(null)
  const [showCreer, setShowCreer] = useState(false)
  const [showRejoindre, setShowRejoindre] = useState(false)
  const [showActivite, setShowActivite] = useState(false)
  const [showGestion, setShowGestion] = useState(false)
  const [showAnalytiques, setShowAnalytiques] = useState(false)
  const [showIAEquipe, setShowIAEquipe] = useState(false)
  const [showLabelsDrawer, setShowLabelsDrawer] = useState(false)
  const [labels, setLabels] = useState([])
  const [filtreLabelId, setFiltreLabelId] = useState(null)
  const [showLabelsPopover, setShowLabelsPopover] = useState(false)

  const isAdmin = membres.some(m => m.id === user?.id && m.role === 'admin')

  const fermerTousDrawers = () => {
    setShowActivite(false); setShowGestion(false)
    setShowAnalytiques(false); setShowIAEquipe(false)
    setShowLabelsDrawer(false)
  }

  // Drag & Drop state
  const [activeId, setActiveId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  // Toasts
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const addToast = useCallback((message, icon = '🔔', color) => {
    const id = ++toastIdRef.current
    setToasts(p => [...p, { id, message, icon, color }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])

  const removeToast = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), [])

  const [nomEquipe, setNomEquipe] = useState('')
  const [descEquipe, setDescEquipe] = useState('')
  const [codeRejoint, setCodeRejoint] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const profileMenuRef = useRef(null)

  const [filtre, setFiltre] = useState('toutes')
  const bloquees = 0

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

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
    if (codeUrl) { setCodeRejoint(codeUrl); setShowRejoindre(true) }
  }, [])

  useEffect(() => {
    if (equipeActive) { chargerMembres(equipeActive.id); chargerTaches(equipeActive.id); chargerLabels(equipeActive.id); setFiltreLabelId(null) }
  }, [equipeActive])

  // ===== POLLING INTELLIGENT =====
  const pollingRef = useRef(null)
  const isVisibleRef = useRef(true)

  const chargerTachesSilent = useCallback(async (equipe_id) => {
    try {
      const r = await axios.get(`${API}/equipes/${equipe_id}/taches`)
      const nouvelles = r.data
      const anciennes = tachesRef.current

      // Détecter les changements
      if (anciennes.length > 0 && nouvelles.length !== anciennes.length) {
        const diff = nouvelles.length - anciennes.length
        if (diff > 0) addToast(`${diff} nouvelle${diff > 1 ? 's' : ''} tâche${diff > 1 ? 's' : ''} ajoutée${diff > 1 ? 's' : ''}`, '✅', '#4caf82')
      } else if (anciennes.length > 0) {
        // Détecte spécifiquement les tâches qui me concernent en tant que créateur
        const maTacheProposee = nouvelles.find(n => {
          const old = anciennes.find(a => a.id === n.id)
          return old && old.statut !== 'en_validation' && n.statut === 'en_validation'
            && n.createur_id === user.id && n.completed_by && n.completed_by !== user.id
        })
        if (maTacheProposee) {
          addToast(
            `📥 ${maTacheProposee.completed_by_nom} a terminé "${maTacheProposee.titre.slice(0, 30)}${maTacheProposee.titre.length > 30 ? '…' : ''}" — à valider`,
            '📥',
            '#f59e0b'
          )
        } else {
          const maTacheTerminee = nouvelles.find(n => {
            const old = anciennes.find(a => a.id === n.id)
            return old && old.statut !== 'termine' && n.statut === 'termine'
              && n.createur_id === user.id && n.completed_by && n.completed_by !== user.id
          })
          if (maTacheTerminee) {
            addToast(
              `🎉 ${maTacheTerminee.completed_by_nom} a terminé "${maTacheTerminee.titre.slice(0, 35)}${maTacheTerminee.titre.length > 35 ? '…' : ''}"`,
              '🎉',
              '#4caf82'
            )
          } else {
            const changed = nouvelles.find(n => {
              const old = anciennes.find(a => a.id === n.id)
              return old && old.statut !== n.statut
            })
            if (changed) {
              const labels = { todo: 'À faire', en_cours: 'En cours', en_validation: 'À valider', termine: 'Terminé' }
              addToast(`"${changed.titre}" → ${labels[changed.statut]}`, '🔄', '#6c63ff')
            }
          }
        }
      }

      setTaches(nouvelles)
    } catch {}
  }, [addToast, user])

  // ── Polling MEMBRES (détecte nouveaux arrivants live) ──
  const chargerMembresSilent = useCallback(async (equipe_id) => {
    try {
      const r = await axios.get(`${API}/equipes/${equipe_id}/membres`)
      const nouveaux = r.data
      const anciens = membresRef.current
      if (anciens.length > 0) {
        const arrivants = nouveaux.filter(n => !anciens.some(a => a.id === n.id))
        arrivants.forEach(m => addToast(`${m.nom} a rejoint l'équipe`, '👋', '#4caf82'))
        const partis = anciens.filter(a => !nouveaux.some(n => n.id === a.id))
        partis.forEach(m => addToast(`${m.nom} a quitté l'équipe`, '👋', '#888'))
      }
      setMembres(nouveaux)
    } catch {}
  }, [addToast])

  useEffect(() => {
    if (!equipeActive) return

    const refreshAll = () => {
      if (!isVisibleRef.current) return
      chargerTachesSilent(equipeActive.id)
      chargerMembresSilent(equipeActive.id)
    }

    const demarrerPolling = () => {
      pollingRef.current = setInterval(refreshAll, 8000)
    }

    const handleVisibility = () => {
      isVisibleRef.current = !document.hidden
      if (!document.hidden) refreshAll()
    }

    demarrerPolling()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(pollingRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [equipeActive, chargerTachesSilent, chargerMembresSilent])

  const chargerEquipes = async () => {
    try { const r = await axios.get(`${API}/equipes/user/${user.id}`); setEquipes(r.data); if (r.data.length > 0) setEquipeActive(r.data[0]) } catch {}
  }
  const chargerMembres = async (id) => { try { const r = await axios.get(`${API}/equipes/${id}/membres`); setMembres(r.data) } catch {} }
  const chargerTaches = async (id) => { try { const r = await axios.get(`${API}/equipes/${id}/taches`); setTaches(r.data) } catch {} }
  const chargerLabels = async (id) => { try { const r = await axios.get(`${API}/equipes/${id}/labels`); setLabels(r.data || []) } catch {} }

  // Démarrer une tâche : todo → en_cours (1 clic depuis la carte)
  const demarrerTache = useCallback(async (tacheId) => {
    const prev = tachesRef.current
    setTaches(p => p.map(t => t.id === tacheId ? { ...t, statut: 'en_cours' } : t))
    try {
      await axios.put(`${API}/equipes/taches/${tacheId}`, {
        statut: 'en_cours', user_id: user.id, nom_user: user.nom,
      })
      addToast('Tâche démarrée', '▶', '#e08a3c')
    } catch {
      setTaches(prev)
      addToast('Erreur — réessaie', '❌', '#e05c5c')
    }
  }, [user, addToast])

  // Toggle assignation d'un label sur une tâche
  const toggleLabelTache = useCallback(async (tacheId, labelId, deja) => {
    setTaches(p => p.map(t => {
      if (t.id !== tacheId) return t
      const current = t.labels || []
      if (deja) {
        return { ...t, labels: current.filter(l => l.id !== labelId) }
      } else {
        const labelObj = labels.find(l => l.id === labelId)
        if (!labelObj) return t
        return { ...t, labels: [...current, labelObj] }
      }
    }))
    try {
      if (deja) {
        await axios.delete(`${API}/equipes/taches/${tacheId}/labels/${labelId}`)
      } else {
        await axios.post(`${API}/equipes/taches/${tacheId}/labels/${labelId}`)
      }
    } catch {
      // Rollback : recharge depuis serveur
      if (equipeActive) chargerTaches(equipeActive.id)
    }
  }, [labels, equipeActive])

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
      if (tacheAModifier) {
        await axios.put(`${API}/equipes/taches/${tacheAModifier.id}`, {
          ...form, user_id: user.id, nom_user: user.nom
        })
      } else {
        await axios.post(`${API}/equipes/taches`, { ...form, equipe_id: equipeActive.id, createur_id: user.id })
      }
      chargerTaches(equipeActive.id)
      setShowModaleTache(false); setTacheAModifier(null)
    } catch {}
  }

  // ── Création rapide inline (titre + statut, defaults pour le reste) ──
  const creerTacheRapide = useCallback(async (titre, statut) => {
    if (!titre.trim() || !equipeActive) return
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId, titre: titre.trim(), description: '', priorite: 'moyenne',
      statut, assignee_id: null, deadline: null, createur_id: user.id,
      nb_commentaires: 0,
    }
    setTaches(p => [...p, optimistic])
    try {
      const r = await axios.post(`${API}/equipes/taches`, {
        titre: titre.trim(), description: '', priorite: 'moyenne', statut,
        equipe_id: equipeActive.id, createur_id: user.id,
      })
      const real = r.data?.id ? r.data : { ...optimistic, id: r.data }
      setTaches(p => p.map(t => t.id === tempId ? real : t))
    } catch {
      setTaches(p => p.filter(t => t.id !== tempId))
      addToast('Erreur création tâche', '❌', '#e05c5c')
    }
  }, [equipeActive, user, addToast])

  // ── Toggle terminer/valider/annuler/ré-ouvrir une tâche depuis la checkbox ──
  const toggleFait = useCallback(async (tache) => {
    const tacheId = tache.id
    const prev = tachesRef.current
    // Prédit l'état cible côté frontend pour optimistic update
    const isCreateur = tache.createur_id === user.id
    const hasAssignee = tache.assignee_id != null
    const assigneeDiff = hasAssignee && tache.assignee_id !== tache.createur_id
    const besoinValidation = assigneeDiff && !isCreateur

    let nouveauStatut, action
    if (tache.statut === 'termine') {
      nouveauStatut = 'todo'
      action = 'reopen'
    } else if (tache.statut === 'en_validation') {
      if (isCreateur) { nouveauStatut = 'termine'; action = 'valider' }
      else { nouveauStatut = 'todo'; action = 'annuler' }
    } else if (besoinValidation) {
      nouveauStatut = 'en_validation'
      action = 'proposer'
    } else {
      nouveauStatut = 'termine'
      action = 'terminer'
    }

    // Optimistic update
    setTaches(p => p.map(t => t.id === tacheId
      ? {
          ...t,
          statut: nouveauStatut,
          completed_at: (action === 'terminer' || action === 'proposer') ? new Date().toISOString()
                      : action === 'valider' ? t.completed_at
                      : null,
          completed_by: (action === 'terminer' || action === 'proposer') ? user.id
                      : action === 'valider' ? t.completed_by
                      : null,
          completed_by_nom: (action === 'terminer' || action === 'proposer') ? user.nom
                          : action === 'valider' ? t.completed_by_nom
                          : null,
        }
      : t
    ))
    try {
      const r = await axios.patch(`${API}/equipes/taches/${tacheId}/toggle-fait`, {
        user_id: user.id, nom_user: user.nom,
      })
      if (r.data?.id) {
        setTaches(p => p.map(t => t.id === tacheId ? { ...t, ...r.data } : t))
      }
      const toastMsg = {
        terminer: ['Tâche terminée — bien joué', '✓', '#4caf82'],
        proposer: ['Proposée au créateur pour validation', '📥', '#f59e0b'],
        valider:  ['Tâche validée ✓', '✓', '#4caf82'],
        annuler:  ['Proposition annulée', '↩', '#6c63ff'],
        reopen:   ['Tâche ré-ouverte', '↻', '#6c63ff'],
      }[action]
      addToast(...toastMsg)
    } catch {
      setTaches(prev)
      addToast('Erreur — réessaie', '❌', '#e05c5c')
    }
  }, [user, addToast])

  // ── Assignation rapide depuis la carte (sans modale) ──
  const quickAssigner = useCallback(async (tacheId, assigneeId) => {
    const prev = tachesRef.current
    setTaches(p => p.map(t => t.id === tacheId ? { ...t, assignee_id: assigneeId } : t))
    try {
      await axios.put(`${API}/equipes/taches/${tacheId}`, {
        assignee_id: assigneeId, user_id: user.id, nom_user: user.nom,
      })
      const assignee = membresRef.current.find(m => m.id === assigneeId)
      if (assignee) addToast(`Assignée à ${assignee.nom}`, '👤', '#6c63ff')
      else addToast('Tâche désassignée', '👤', '#888')
    } catch {
      setTaches(prev)
      addToast('Erreur assignation', '❌', '#e05c5c')
    }
  }, [user, addToast])

  // ===== DRAG & DROP HANDLERS =====
  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragOver = ({ over }) => setOverCol(over?.id || null)

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    setOverCol(null)
    if (!over) return

    const tacheId = parseInt(active.id)
    const newStatut = over.id
    const tache = taches.find(t => t.id === tacheId)
    if (!tache || tache.statut === newStatut) return

    // Optimistic update
    setTaches(prev => prev.map(t => t.id === tacheId ? { ...t, statut: newStatut } : t))

    try {
      await axios.put(`${API}/equipes/taches/${tacheId}`, {
        statut: newStatut,
        user_id: user.id,
        nom_user: user.nom
      })
    } catch {
      // Rollback
      setTaches(prev => prev.map(t => t.id === tacheId ? { ...t, statut: tache.statut } : t))
      addToast('Erreur lors du déplacement', '❌', '#e05c5c')
    }
  }

  const tachesCol = (statut) => {
    let list = taches.filter(t => t.statut === statut)
    if (filtre === 'mes_taches') list = list.filter(t => t.assignee_id === user.id)
    else if (filtre === 'en_retard') {
      const today = new Date().toISOString().slice(0, 10)
      list = list.filter(t => t.deadline && t.deadline < today && t.statut !== 'termine')
    }
    else if (filtre === 'haute') list = list.filter(t => t.priorite === 'haute')
    else if (filtre === 'a_valider') list = list.filter(t => t.statut === 'en_validation')
    if (filtreLabelId) list = list.filter(t => (t.labels || []).some(l => l.id === filtreLabelId))
    return list
  }

  // Compteurs pour les pills
  const filtreCounts = {
    toutes: taches.length,
    mes_taches: taches.filter(t => t.assignee_id === user.id).length,
    en_retard: (() => {
      const today = new Date().toISOString().slice(0, 10)
      return taches.filter(t => t.deadline && t.deadline < today && t.statut !== 'termine').length
    })(),
    haute: taches.filter(t => t.priorite === 'haute').length,
    a_valider: taches.filter(t => t.statut === 'en_validation' && t.createur_id === user.id).length,
  }
  const tacheActive = activeId ? taches.find(t => t.id === parseInt(activeId)) : null

  const mainMargin = isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0)

  const userData = { nom: user?.nom || 'Utilisateur', email: user?.email || 'user@example.com' }
  const points = 1250; const niveau = 3
  const niveauActuel = { label: 'Productif' }
  const pctNiveau = 42; const streak = 5

  const IconLock = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
        select option { background: ${T.bg2}; }
      `}</style>

      {/* ── SIDEBAR (shared component) ── */}
      <AppSidebar
        T={T} user={userData}
        niveau={niveau} points={points} streak={streak}
        niveauActuel={niveauActuel} pctNiveau={pctNiveau}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={(v) => { setSidebarOpen(v); if (isMobile) setShowMobileSidebar(v) }}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}>
        {/* Collaboration-specific: MES ÉQUIPES section */}
        {equipes.length > 0 && (
          <>
            <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
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
      </AppSidebar>

      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      {/* MAIN */}
      <motion.main animate={{ marginLeft: mainMargin }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* HEADER */}
        <div style={{ padding: '13px clamp(14px,3vw,24px)', paddingLeft: isMobile ? 62 : undefined, borderBottom: `1px solid ${T.border}`, background: T.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0, position: 'relative' }}>
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

          {isMobile ? (
            /* Mobile — +Tâche + ••• overflow */
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: `${T.accent}18`, border: `1px solid ${T.accent}35`, borderRadius: 9, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setTacheAModifier(null); setShowModaleTache(true) }} whileTap={{ scale: 0.95 }}>
                  <Plus size={14} />
                </motion.button>
              )}
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: showMoreMenu ? `${T.accent}18` : T.bg3, border: `1px solid ${showMoreMenu ? T.accent + '55' : T.border}`, borderRadius: 9, color: showMoreMenu ? T.accent : T.text2, fontSize: 12, cursor: 'pointer' }}
                onClick={() => setShowMoreMenu(p => !p)} whileTap={{ scale: 0.95 }}>
                <MoreHorizontal size={14} />
              </motion.button>
              <AnimatePresence>
                {showMoreMenu && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, zIndex: 290 }} onClick={() => setShowMoreMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 300, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.28)', minWidth: 200, padding: 6 }}>
                      {equipeActive && [
                        { icon: Brain, label: 'Coach IA', active: showIAEquipe, onClick: () => { fermerTousDrawers(); setShowIAEquipe(p => !p); setShowMoreMenu(false) } },
                        { icon: TrendingUp, label: 'Stats', active: showAnalytiques, onClick: () => { fermerTousDrawers(); setShowAnalytiques(p => !p); setShowMoreMenu(false) } },
                        { icon: Sparkles, label: 'Labels', active: showLabelsDrawer, onClick: () => { fermerTousDrawers(); setShowLabelsDrawer(p => !p); setShowMoreMenu(false) } },
                        ...(isAdmin ? [{ icon: Shield, label: 'Gérer', active: showGestion, onClick: () => { fermerTousDrawers(); setShowGestion(p => !p); setShowMoreMenu(false) } }] : []),
                        { icon: Activity, label: 'Activité', active: showActivite, onClick: () => { fermerTousDrawers(); setShowActivite(p => !p); setShowMoreMenu(false) } },
                        { icon: Share2, label: 'Inviter', active: false, onClick: () => { setShowPartage(equipeActive); setShowMoreMenu(false) } },
                      ].map(({ icon: Icon, label, active, onClick }) => (
                        <motion.button key={label} onClick={onClick}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, background: active ? `${T.accent}12` : 'transparent', border: 'none', color: active ? T.accent : T.text, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400 }}
                          whileHover={{ background: `${T.accent}12` }}>
                          <Icon size={15} color={active ? T.accent : T.text2} />
                          {label}
                        </motion.button>
                      ))}
                      <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                      <motion.button onClick={() => { setShowRejoindre(true); setErreur(''); setShowMoreMenu(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', fontSize: 13 }}
                        whileHover={{ background: `${T.accent}12` }}>
                        <UserPlus size={15} color={T.text2} />Rejoindre
                      </motion.button>
                      <motion.button onClick={() => { setShowCreer(true); setErreur(''); setShowMoreMenu(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                        whileHover={{ background: `${T.accent}12` }}>
                        <Plus size={15} />+ Équipe
                      </motion.button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Desktop — tous les boutons */
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: showIAEquipe ? `linear-gradient(135deg, ${T.accent}30, ${T.accent2 || '#a855f7'}30)` : T.bg3, border: `1px solid ${showIAEquipe ? T.accent + '55' : T.border}`, borderRadius: 9, color: showIAEquipe ? T.accent : T.text2, fontSize: 12, fontWeight: showIAEquipe ? 700 : 400, cursor: 'pointer' }}
                  onClick={() => { fermerTousDrawers(); setShowIAEquipe(p => !p) }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                  <Brain size={13} /> Coach IA
                </motion.button>
              )}
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: showAnalytiques ? `${T.accent}18` : T.bg3, border: `1px solid ${showAnalytiques ? T.accent + '35' : T.border}`, borderRadius: 9, color: showAnalytiques ? T.accent : T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { fermerTousDrawers(); setShowAnalytiques(p => !p) }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                  <TrendingUp size={13} /> Stats
                </motion.button>
              )}
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: showLabelsDrawer ? `${T.accent}18` : T.bg3, border: `1px solid ${showLabelsDrawer ? T.accent + '35' : T.border}`, borderRadius: 9, color: showLabelsDrawer ? T.accent : T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { fermerTousDrawers(); setShowLabelsDrawer(p => !p) }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                  <Sparkles size={13} /> Labels{labels.length > 0 && <span style={{ marginLeft: 2, fontSize: 10, padding: '1px 5px', borderRadius: 99, background: T.accent + '20', color: T.accent, fontWeight: 700 }}>{labels.length}</span>}
                </motion.button>
              )}
              {equipeActive && isAdmin && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: showGestion ? `${T.accent}18` : T.bg3, border: `1px solid ${showGestion ? T.accent + '35' : T.border}`, borderRadius: 9, color: showGestion ? T.accent : T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { fermerTousDrawers(); setShowGestion(p => !p) }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                  <Shield size={13} /> Gérer
                </motion.button>
              )}
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: showActivite ? `${T.accent}18` : T.bg3, border: `1px solid ${showActivite ? T.accent + '35' : T.border}`, borderRadius: 9, color: showActivite ? T.accent : T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => { fermerTousDrawers(); setShowActivite(p => !p) }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                  <Activity size={13} /> Activité
                </motion.button>
              )}
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => setShowPartage(equipeActive)} whileHover={{ borderColor: T.accent, color: T.accent }}>
                  <Share2 size={13} /> Inviter
                </motion.button>
              )}
              {equipeActive && (
                <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: `${T.accent}18`, border: `1px solid ${T.accent}35`, borderRadius: 9, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { setTacheAModifier(null); setShowModaleTache(true) }} whileHover={{ scale: 1.02 }}>
                  <Plus size={13} /> Tâche
                </motion.button>
              )}
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text2, fontSize: 12, cursor: 'pointer' }}
                onClick={() => { setShowRejoindre(true); setErreur('') }} whileHover={{ borderColor: T.accent, color: T.accent }}>
                <UserPlus size={13} /> Rejoindre
              </motion.button>
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: `linear-gradient(135deg, ${T.accent}, ${T.accent}cc)`, border: 'none', borderRadius: 9, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 3px 10px ${T.accent}25` }}
                onClick={() => { setShowCreer(true); setErreur('') }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Plus size={13} /> Équipe
              </motion.button>
            </div>
          )}
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

            {/* Filtres rapides — pills */}
            <div style={{
              display: 'flex', gap: 6, padding: '10px clamp(14px,3vw,24px)',
              borderBottom: `1px solid ${T.border}`, flexShrink: 0,
              overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center',
            }} className="filtres-pills">
              <style>{`.filtres-pills::-webkit-scrollbar{display:none;}`}</style>
              {[
                { id: 'toutes',     label: 'Toutes',      icon: null, color: T.accent },
                { id: 'mes_taches', label: 'Mes tâches',  icon: User, color: '#6c63ff' },
                { id: 'en_retard',  label: 'En retard',   icon: AlertTriangle, color: '#e05c5c' },
                { id: 'haute',      label: 'Haute prio',  icon: Zap, color: '#e05c5c' },
                { id: 'a_valider',  label: 'À valider',   icon: Clock, color: '#f59e0b' },
              ].map(f => {
                const Icon = f.icon
                const active = filtre === f.id
                const count = filtreCounts[f.id] ?? 0
                return (
                  <motion.button
                    key={f.id}
                    onClick={() => setFiltre(f.id)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 99,
                      background: active ? `${f.color}18` : T.bg3,
                      border: `1px solid ${active ? f.color + '50' : T.border}`,
                      color: active ? f.color : T.text2,
                      fontSize: 11.5, fontWeight: active ? 700 : 500,
                      cursor: 'pointer', flexShrink: 0,
                      transition: 'all 0.15s',
                    }}>
                    {Icon && <Icon size={11} strokeWidth={2.2} />}
                    {f.label}
                    {count > 0 && f.id !== 'toutes' && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                        background: active ? f.color : T.bg2, color: active ? '#fff' : T.text2,
                      }}>{count}</span>
                    )}
                  </motion.button>
                )
              })}

              {/* Pill labels (popover multi-select) */}
              {labels.length > 0 && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <motion.button
                    onClick={() => setShowLabelsPopover(p => !p)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 99,
                      background: filtreLabelId ? `${(labels.find(l => l.id === filtreLabelId)?.couleur || T.accent)}18` : T.bg3,
                      border: `1px solid ${filtreLabelId ? (labels.find(l => l.id === filtreLabelId)?.couleur || T.accent) + '50' : T.border}`,
                      color: filtreLabelId ? (labels.find(l => l.id === filtreLabelId)?.couleur || T.accent) : T.text2,
                      fontSize: 11.5, fontWeight: filtreLabelId ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <Sparkles size={11} strokeWidth={2.2} />
                    {filtreLabelId
                      ? labels.find(l => l.id === filtreLabelId)?.nom || 'Label'
                      : 'Filtrer par label'
                    }
                    {filtreLabelId && <X size={11} style={{ marginLeft: 2 }} onClick={(e) => { e.stopPropagation(); setFiltreLabelId(null) }} />}
                  </motion.button>

                  <AnimatePresence>
                    {showLabelsPopover && (
                      <>
                        <div onClick={() => setShowLabelsPopover(false)}
                          style={{ position: 'fixed', inset: 0, zIndex: 290 }} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            background: T.bg2, border: `1px solid ${T.border}`,
                            borderRadius: 12, padding: 6, minWidth: 200, maxHeight: 280,
                            overflowY: 'auto', zIndex: 300,
                            boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
                          }}>
                          <p style={{ fontSize: 9, fontWeight: 800, color: T.text2, letterSpacing: 1.3, padding: '7px 10px 5px', margin: 0 }}>FILTRER PAR LABEL</p>
                          {filtreLabelId && (
                            <button
                              onClick={() => { setFiltreLabelId(null); setShowLabelsPopover(false) }}
                              style={popItemStyle(T, false)}>
                              <div style={{ width: 14, height: 14, borderRadius: 4, border: `1px dashed ${T.border}`, flexShrink: 0 }} />
                              <span>Effacer le filtre</span>
                            </button>
                          )}
                          {labels.map(l => (
                            <button
                              key={l.id}
                              onClick={() => { setFiltreLabelId(l.id); setShowLabelsPopover(false) }}
                              style={popItemStyle(T, filtreLabelId === l.id)}>
                              <div style={{ width: 12, height: 12, borderRadius: 4, background: l.couleur, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{l.nom}</span>
                              {filtreLabelId === l.id && <Check size={11} color={T.accent} strokeWidth={3} />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Barre stats */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              {COLONNES.map((col, i) => (
                <div key={col.id} style={{ flex: 1, padding: '9px 18px', borderRight: i < COLONNES.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.couleur }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: T.text2 }}>{col.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: col.couleur, marginLeft: 'auto' }}>{tachesCol(col.id).length}</span>
                </div>
              ))}
            </div>

            {/* KANBAN avec DnD */}
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <div style={{ flex: 1, display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? undefined : `repeat(${COLONNES.length}, 1fr)`, flexDirection: isMobile ? 'row' : undefined, overflowX: isMobile ? 'auto' : undefined, overflowY: isMobile ? 'hidden' : 'hidden', scrollSnapType: isMobile ? 'x mandatory' : undefined, WebkitOverflowScrolling: 'touch' }}>
                {COLONNES.map((col, i) => (
                  <div key={col.id} style={{ display: 'flex', flexDirection: 'column', borderRight: !isMobile && i < COLONNES.length - 1 ? `1px solid ${T.border}` : 'none', overflow: 'hidden', ...(isMobile ? { minWidth: '85vw', maxWidth: '85vw', scrollSnapAlign: 'start', flexShrink: 0, borderRight: i < COLONNES.length - 1 ? `1px solid ${T.border}` : 'none' } : {}) }}>
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
                    <ColonneDroppable T={T} col={col} isOver={overCol === col.id}>
                      <QuickAddInline T={T} col={col} onAdd={(titre) => creerTacheRapide(titre, col.id)} />
                      <AnimatePresence>
                        {tachesCol(col.id).map(t => (
                          <CarteTache key={t.id} T={T} tache={t} membres={membres} user={user}
                            onModifier={(t) => { setTacheAModifier(t); setShowModaleTache(true) }}
                            onOuvrir={setTacheCommentaires}
                            onAssign={quickAssigner}
                            onToggleFait={toggleFait}
                            onDemarrer={demarrerTache} />
                        ))}
                      </AnimatePresence>
                      {tachesCol(col.id).length === 0 && (
                        <div style={{ padding: '24px 0', textAlign: 'center', border: `2px dashed ${overCol === col.id ? col.couleur + '60' : T.border}`, borderRadius: 10, transition: 'border-color 0.2s' }}>
                          <p style={{ fontSize: 11, color: overCol === col.id ? col.couleur : T.text2, opacity: 0.6 }}>
                            {overCol === col.id ? '↓ Déposer ici' : 'Vide'}
                          </p>
                        </div>
                      )}
                    </ColonneDroppable>
                  </div>
                ))}
              </div>
            </DndContext>
          </div>
        )}
      </motion.main>

      {/* TOASTS */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* MODALES */}
      <AnimatePresence>
        {showActivite && equipeActive && (
          <DrawerActivite key="activite" T={T} equipe_id={equipeActive.id} onFermer={() => setShowActivite(false)} />
        )}
        {tacheCommentaires && (
          <PanneauCommentaires key="panel" T={T} tache={tacheCommentaires} user={user} membres={membres} onFermer={() => setTacheCommentaires(null)} />
        )}
        {showIAEquipe && equipeActive && (
          <DrawerIAEquipe key="ia-equipe" T={T} equipe_id={equipeActive.id} equipe_nom={equipeActive.nom} user={user} onFermer={() => setShowIAEquipe(false)} />
        )}
        {showAnalytiques && equipeActive && (
          <DrawerAnalytiques key="analytiques" T={T} equipe_id={equipeActive.id} onFermer={() => setShowAnalytiques(false)} />
        )}
        {showGestion && equipeActive && isAdmin && (
          <DrawerGestion key="gestion" T={T} equipe={equipeActive} membres={membres} user={user}
            onFermer={() => setShowGestion(false)}
            onEquipeRenommee={(nom) => {
              setEquipeActive(e => ({ ...e, nom }))
              setEquipes(es => es.map(e => e.id === equipeActive.id ? { ...e, nom } : e))
              addToast(`Équipe renommée → ${nom}`, '✏️')
            }}
            onMembreExclu={(membreId) => {
              setMembres(ms => ms.filter(m => m.id !== membreId))
              addToast('Membre exclu', '🚪')
            }}
            onRoleChange={(membreId, role) => {
              setMembres(ms => ms.map(m => m.id === membreId ? { ...m, role } : m))
              addToast(role === 'admin' ? 'Promu admin' : 'Rétrogradé membre', role === 'admin' ? '👑' : '👤')
            }}
          />
        )}
        {showPartage && <ModalePartage key="partage" T={T} equipe={showPartage} onFermer={() => setShowPartage(null)} />}
        {showModaleTache && equipeActive && (
          <ModaleTache key="tache" T={T} membres={membres} tache={tacheAModifier} user={user}
            labels={labels} onToggleLabel={toggleLabelTache}
            onFermer={() => { setShowModaleTache(false); setTacheAModifier(null) }}
            onSauvegarder={sauvegarderTache} />
        )}

        {showLabelsDrawer && equipeActive && (
          <DrawerLabels key="labels-drawer" T={T} equipe_id={equipeActive.id} labels={labels}
            onFermer={() => setShowLabelsDrawer(false)}
            onLabelsChange={(nouveaux) => {
              setLabels(nouveaux)
              // Recharge les tâches pour mettre à jour les labels qui ont changé de nom/couleur ou été supprimés
              chargerTaches(equipeActive.id)
            }} />
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

      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}

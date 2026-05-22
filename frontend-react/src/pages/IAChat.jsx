import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { useTheme } from '../useTheme'
import {
  Send, History, Link, BarChart2, Calendar,
  Copy, Plus, X, ChevronRight, Layers,
  Sparkles, Zap, Globe, CheckCircle, Trash2,
  Search, AlertCircle, Check, Brain, ChevronDown, Database,
  Heart, Flame, BarChart, Target, Paperclip, Bookmark,
  Users, Compass, UserPlus,
} from 'lucide-react'
import { useMediaQuery } from '../useMediaQuery'
import BottomNavMobile, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavMobile'
import MobileBackButton from '../components/MobileBackButton'
import AppSidebar, { SIDEBAR_W, SidebarToggle, FloatingLogo } from '../components/AppSidebar'

const API = 'https://getshift-backend.onrender.com'

// ── Constantes statiques (hors composant = jamais recréées) ──────────
const MODELES = [
  { id: 'llama-3.3-70b-versatile', nom: 'GetShift AI',        tag: 'Recommandé' },
  { id: 'mixtral-8x7b-32768',      nom: 'GetShift AI Rapide', tag: 'Rapide'     },
  { id: 'gemma2-9b-it',            nom: 'GetShift AI Lite',   tag: 'Léger'      },
]

const SUGGESTIONS = [
  { icon: Brain,       text: "Analyse ma semaine et donne-moi un plan d'action",       grad: 'linear-gradient(135deg,var(--ember),var(--ember-hover))' },
  { icon: Globe,       text: 'Recherche les meilleures méthodes de productivité 2025', grad: 'linear-gradient(135deg,var(--ember-hover),var(--ember))' },
  { icon: Plus,        text: 'Crée une tâche : préparer la réunion de demain',         grad: 'linear-gradient(135deg,var(--ember),var(--ember-hover))' },
  { icon: Zap,         text: 'Je procrastine bcp, aide-moi à reprendre le focus',      grad: 'linear-gradient(135deg,var(--ember-hover),var(--ember))' },
]

const INTENTION_META = {
  search:           { label: 'Web temps réel', color: '#0ea5e9', Icon: Globe       },
  action_creer:     { label: 'Tâche créée',    color: '#10b981', Icon: Plus        },
  action_terminer:  { label: 'Terminée',        color: '#10b981', Icon: CheckCircle },
  action_planifier: { label: 'Planification',   color: '#f59e0b', Icon: Calendar    },
  chat:             { label: 'GetShift AI',     color: '#a855f7', Icon: Sparkles    },
}

// ── Personas Coach (lien avec le drawer Coach du Dashboard) ────────────
const COACHES = {
  bienveillant: { id: 'bienveillant', nom: 'Alex',  Icon: Heart,    color: '#ec4899', tag: 'Bienveillant', accroche: 'Doux, encourageant, à ton écoute' },
  motivateur:   { id: 'motivateur',   nom: 'Max',   Icon: Flame,    color: '#f97316', tag: 'Motivateur',   accroche: 'Énergique, challengeant, on passe à l\'action' },
  analytique:   { id: 'analytique',   nom: 'Nova',  Icon: BarChart, color: '#3b82f6', tag: 'Analytique',   accroche: 'Précis, factuel, basé sur tes données' },
}
const getCoach = (style) => COACHES[style] || COACHES.bienveillant

// ── Slash commands ────────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: '/tache',  Icon: Plus,         color: '#10b981', desc: "Crée une tâche : préciser le titre",                     prefix: 'Crée une tâche : ' },
  { cmd: '/focus',  Icon: Target,       color: '#a855f7', desc: 'Choisis mes 3 priorités du jour parmi mes tâches',         prefix: 'Choisis mes 3 priorités du jour parmi mes tâches actives' },
  { cmd: '/plan',   Icon: Calendar,     color: '#f59e0b', desc: 'Construis mon planning de la semaine',                     prefix: 'Construis mon planning de la semaine' },
  { cmd: '/dna',    Icon: Brain,        color: '#0ea5e9', desc: 'Analyse mes patterns Task DNA et donne 3 conseils',        prefix: 'Analyse mes patterns Task DNA et donne 3 conseils actionnables' },
  { cmd: '/find',   Icon: Search,       color: 'var(--ember)', desc: 'Cherche dans mes tâches : préciser ce que tu cherches',    prefix: 'Cherche dans mes tâches : ' },
  { cmd: '/web',    Icon: Globe,        color: '#0ea5e9', desc: 'Recherche sur le web temps réel',                          prefix: '' /* spécial : active forceSearch */, special: 'web' },
  { cmd: '/clear',  Icon: Trash2,       color: '#ef4444', desc: 'Efface la conversation actuelle',                          prefix: '', special: 'clear' },
]

// ── Tableau markdown memoïsé ─────────────────────────────────────────
const Tableau = memo(function Tableau({ lignes, accent, T }) {
  if (lignes.length < 2) return null
  const headers = lignes[0].split('|').map(h => h.trim()).filter(Boolean)
  const rows    = lignes.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean))
  return (
    <div style={{ overflowX: 'auto', margin: '14px 0', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{headers.map((h, i) => (
            <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: accent, fontSize: 11, letterSpacing: '0.5px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', background: `${accent}10` }}>
              {h.toUpperCase()}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '9px 16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, lineHeight: 1.5 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

// ── Markdown memoïsé ─────────────────────────────────────────────────
const Markdown = memo(function Markdown({ content, accent, T }) {
  const lines = content.split('\n')

  const inline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.slice(2,-2)}</strong>
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 5, padding: '1px 7px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#4ade80' }}>{p.slice(1,-1)}</code>
      return p
    })
  }

  const els = []
  let i = 0, inCode = false, codeLines = []

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (!inCode) { inCode = true; codeLines = [] }
      else {
        inCode = false
        els.push(
          <div key={`c${i}`} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 18px', margin: '12px 0', overflowX: 'auto' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 2, marginBottom: 10 }}>CODE</div>
            <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, color: '#4ade80', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{codeLines.join('\n')}</pre>
          </div>
        )
        codeLines = []
      }
      i++; continue
    }
    if (inCode) { codeLines.push(line); i++; continue }

    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines = [line]
      while (i + 1 < lines.length && (lines[i+1].startsWith('|') || lines[i+1].match(/^\|[-| ]+\|$/))) {
        i++; tableLines.push(lines[i])
      }
      els.push(<Tableau key={`t${i}`} lignes={tableLines} accent={accent} T={T} />)
      i++; continue
    }

    if (line.startsWith('### '))      els.push(<p key={i} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '14px 0 5px', letterSpacing: '-0.2px' }}>{inline(line.slice(4))}</p>)
    else if (line.startsWith('## ')) els.push(<p key={i} style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '18px 0 7px', letterSpacing: '-0.4px' }}>{inline(line.slice(3))}</p>)
    else if (line.startsWith('# '))  els.push(<p key={i} style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '20px 0 10px', letterSpacing: '-0.5px' }}>{inline(line.slice(2))}</p>)
    else if (line.startsWith('- ') || line.startsWith('• '))
      els.push(
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75 }}>{inline(line.slice(2))}</span>
        </div>
      )
    else {
      const num = line.match(/^(\d+)\. (.+)/)
      if (num)
        els.push(
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 7 }}>
            <div style={{ minWidth: 22, height: 22, borderRadius: 6, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 1 }}>{num[1]}</div>
            <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75 }}>{inline(num[2])}</span>
          </div>
        )
      else if (line.match(/^-{3,}$/)) els.push(<div key={i} style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }} />)
      else if (!line.trim())          els.push(<div key={i} style={{ height: 7 }} />)
      else                            els.push(<p key={i} style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.78, margin: '2px 0' }}>{inline(line)}</p>)
    }
    i++
  }
  return <div>{els}</div>
})

// ── Sources web memoïsé ───────────────────────────────────────────────
const SourcesWeb = memo(function SourcesWeb({ results, T }) {
  const [open, setOpen] = useState(false)
  if (!results?.length) return null
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <Globe size={11} color="#0ea5e9" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', letterSpacing: '0.5px' }}>{results.length} SOURCE{results.length > 1 ? 'S' : ''} WEB</span>
        <ChevronDown size={10} color="var(--text-secondary)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: 10 }}>
            {results.map((r, i) => (
              <div key={i} style={{ padding: '9px 12px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 9, marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || 'Source'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.snippet?.substring(0, 140)}{r.snippet?.length > 140 ? '…' : ''}</div>
                {r.url && <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#0ea5e9', marginTop: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</a>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ── Carte action memoïsé ──────────────────────────────────────────────
// Supporte 2 formats : ancien {type, ...} et nouveau tool format {tool, ok, ...}
const CarteAction = memo(function CarteAction({ action, T }) {
  if (!action) return null
  // Anciens formats (legacy)
  const legacyConfigs = {
    tache_creee:               { color: '#10b981', Icon: Plus,     label: 'Tâche créée' },
    tache_terminee:            { color: '#10b981', Icon: Check,    label: 'Terminée' },
    redirect_tomorrow_builder: { color: '#f59e0b', Icon: Calendar, label: 'Tomorrow Builder' },
  }
  // Nouveaux formats (tool use)
  const toolConfigs = {
    creer_tache:        { color: '#10b981', Icon: Plus,        label: 'Tâche créée' },
    creer_taches_lot:   { color: '#10b981', Icon: Layers,      label: 'Tâches créées' },
    terminer_tache:     { color: '#10b981', Icon: CheckCircle, label: 'Terminée' },
    supprimer_tache:    { color: '#ef4444', Icon: Trash2,      label: 'Supprimée' },
    modifier_tache:     { color: '#f59e0b', Icon: Sparkles,    label: 'Modifiée' },
    epingler_focus_jour:{ color: '#a855f7', Icon: Target,      label: 'Épinglée(s) au focus' },
    lister_taches:      { color: 'var(--ember)', Icon: Search,      label: 'Liste tâches' },
    obtenir_stats:      { color: '#0ea5e9', Icon: BarChart2,   label: 'Stats récupérées' },
    analyser_task_dna:  { color: '#a855f7', Icon: Brain,       label: 'Task DNA' },
    rechercher_web:     { color: '#0ea5e9', Icon: Globe,       label: 'Web temps réel' },
    lister_membres_equipe:  { color: '#3b82f6', Icon: Users,    label: 'Membres équipe' },
    creer_tache_equipe:     { color: '#10b981', Icon: UserPlus, label: 'Tâche équipe créée' },
    assigner_tache_equipe:  { color: '#3b82f6', Icon: UserPlus, label: 'Tâche assignée' },
    naviguer_vers:          { color: '#a855f7', Icon: Compass,  label: 'Navigation' },
  }

  const isToolFormat = !!action.tool
  const cfg = isToolFormat ? toolConfigs[action.tool] : legacyConfigs[action.type]
  if (!cfg) return null

  // Sous-titre intelligent selon le tool
  let subtitle = null
  if (isToolFormat) {
    if (!action.ok) subtitle = action.erreur || 'Échec'
    else if (action.tool === 'creer_tache') subtitle = `"${action.titre}"${action.priorite ? ` · ${action.priorite}` : ''}`
    else if (action.tool === 'creer_taches_lot') subtitle = `${action.nb} tâches : ${(action.crees||[]).slice(0,3).map(t => `"${t.titre}"`).join(', ')}${action.nb > 3 ? '…' : ''}`
    else if (action.tool === 'terminer_tache' || action.tool === 'supprimer_tache') subtitle = `"${action.titre}"`
    else if (action.tool === 'epingler_focus_jour') subtitle = `${action.nb} tâche${action.nb > 1 ? 's' : ''} épinglée${action.nb > 1 ? 's' : ''}`
    else if (action.tool === 'lister_taches') subtitle = `${action.nb} tâches (${action.filtre})`
    else if (action.tool === 'obtenir_stats') subtitle = `${action.terminees_total}/${action.total} tâches · ${action.points} pts · streak ${action.streak}j`
    else if (action.tool === 'analyser_task_dna') subtitle = `Score ${action.dna?.score_viabilite || '?'}/100`
    else if (action.tool === 'rechercher_web') subtitle = `${action.nb} sources sur "${action.requete}"`
    else if (action.tool === 'lister_membres_equipe') subtitle = `${action.nb} membre${action.nb > 1 ? 's' : ''} dans l'équipe`
    else if (action.tool === 'creer_tache_equipe') subtitle = `"${action.titre}"${action.assignee_nom ? ` → ${action.assignee_nom}` : ''}`
    else if (action.tool === 'assigner_tache_equipe') subtitle = `"${action.titre}" → ${action.assignee_nom}`
    else if (action.tool === 'naviguer_vers') subtitle = `Vers ${action.page}${action.section ? ` · ${action.section}` : ''}`
  } else {
    subtitle = action.titre ? `"${action.titre}"` : null
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      style={{ marginTop: 8, padding: '10px 14px', background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <cfg.Icon size={14} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.5px' }}>{cfg.label.toUpperCase()}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
    </motion.div>
  )
})

// ── Bulle message memoïsé ─────────────────────────────────────────────
const MessageBubble = memo(function MessageBubble({ msg, idx, accent, accent2, isMobile, copie, onCopy, onEnvoyer, onCreerTache, onForceSearch, onPin, isPinned, T, coach }) {
  if (msg.role === 'systeme') return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '5px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 99, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
        {msg.content}
      </div>
    </div>
  )

  if (msg.role === 'user') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: isMobile ? '86%' : '65%', padding: '13px 17px', borderRadius: '17px 17px 4px 17px', background: `linear-gradient(135deg, ${accent}30, ${accent}18)`, border: `1px solid ${accent}35`, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', backdropFilter: 'blur(10px)' }}>
        {msg.content}
      </div>
    </div>
  )

  const meta = msg.intention && msg.intention !== 'chat' ? INTENTION_META[msg.intention] : null
  // Coach affiché pour cette bulle : prioriser celui stocké sur le message, sinon fallback au coach actuel
  const bubbleCoachStyle = msg.coach_style || coach?.id || 'bienveillant'
  const bubbleCoach = COACHES[bubbleCoachStyle] || coach || COACHES.bienveillant
  const bColor = bubbleCoach.color
  const BubbleIcon = bubbleCoach.Icon

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: isMobile ? '92%' : '80%', width: '100%' }}>
        {/* Avatar persona Coach + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${bColor}, ${bColor}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 14px ${bColor}55` }}>
            <BubbleIcon size={13} color="#fff" strokeWidth={2.2} fill={bubbleCoach.id === 'motivateur' ? '#fff' : 'none'} />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px', fontFamily: "'Clash Display', sans-serif" }}>{bubbleCoach.nom}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${bColor}18`, color: bColor, letterSpacing: 0.4, textTransform: 'uppercase' }}>Coach</span>
          {meta && (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: `${meta.color}14`, border: `1px solid ${meta.color}30`, borderRadius: 99 }}>
              <meta.Icon size={9} color={meta.color} />
              <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, letterSpacing: '0.5px' }}>{meta.label.toUpperCase()}</span>
            </motion.div>
          )}
          {msg.web_searched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 99 }}>
              <Globe size={8} color="#0ea5e9" />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#0ea5e9', letterSpacing: '0.5px' }}>LIVE</span>
            </motion.div>
          )}
          {msg.calendar_used && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(26,115,232,0.12)', border: '1px solid rgba(26,115,232,0.25)', borderRadius: 99 }}>
              <span style={{ fontSize: 9 }}>📅</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#1A73E8', letterSpacing: '0.5px' }}>CALENDAR</span>
            </motion.div>
          )}
        </div>

        {/* Bulle */}
        <div style={{ padding: '18px 20px', borderRadius: '4px 18px 18px 18px', background: 'var(--surface-1)', backdropFilter: 'blur(30px)', border: '1px solid var(--border-subtle)' }}>
          {msg.abrev_expandees && msg.message_expande && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${accent}10`, border: `1px solid ${accent}20`, borderRadius: 8, fontSize: 10, color: accent }}>
              <Zap size={9} />
              <span>"{msg.message_original}" → "{msg.message_expande}"</span>
            </div>
          )}
          {msg.role === 'erreur' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#ef4444' }}>
              <AlertCircle size={14} color="#ef4444" />{msg.content}
            </div>
          ) : (
            <>
              {msg.content
                ? <Markdown content={msg.content} accent={accent} T={T} />
                : msg.streaming && (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: bColor }}
                        animate={{ y: [-3, 3, -3], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                )
              }
              {msg.streaming && msg.content && (
                <motion.span
                  style={{ display: 'inline-block', width: 8, height: 14, background: bColor, marginLeft: 2, verticalAlign: 'middle', borderRadius: 1 }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              )}
            </>
          )}
          {/* Actions multiples (tool use) ou action legacy */}
          {Array.isArray(msg.actions) && msg.actions.length > 0
            ? msg.actions.map((a, i) => <CarteAction key={i} action={a} T={T} />)
            : msg.action && <CarteAction action={msg.action} T={T} />}
          {msg.search_results && <SourcesWeb results={msg.search_results} T={T} />}
          {msg.role === 'ia' && !msg.streaming && msg.content && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { label: copie === idx ? 'Copié !' : 'Copier', Icon: Copy,         action: () => onCopy(msg.content, idx),                         color: copie === idx ? accent : null },
                { label: 'Créer tâche',                         Icon: Plus,         action: () => onCreerTache(msg.content.substring(0, 80)),       color: null },
                { label: 'Continuer',                           Icon: ChevronRight, action: () => onEnvoyer('Continue et développe davantage'),     color: null },
                { label: 'Rechercher',                          Icon: Search,       action: () => { onForceSearch(); onEnvoyer(msg.content.substring(0, 60)) }, color: '#0ea5e9' },
              ].map(({ label, Icon, action, color }) => (
                <motion.button key={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: color ? `${color}12` : 'transparent', border: `1px solid ${color ? color + "30" : 'var(--border-subtle)'}`, borderRadius: 99, color: color || 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
                  onClick={action}
                  whileHover={{ color: color || 'var(--text-primary)', borderColor: color ? `${color}60` : 'var(--border-subtle)' }}>
                  <Icon size={10} />{label}
                </motion.button>
              ))}
              <motion.button
                onClick={() => onPin(msg)}
                title={isPinned ? 'Retirer des Insights' : 'Épingler dans Insights'}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: isPinned ? `${accent}18` : 'transparent', border: `1px solid ${isPinned ? accent + '40' : 'var(--border-subtle)'}`, borderRadius: 99, color: isPinned ? accent : 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
                whileHover={{ color: accent, borderColor: `${accent}50` }}>
                <Bookmark size={10} fill={isPinned ? accent : 'none'} />
                {isPinned ? 'Épinglé' : 'Insights'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

function detectWebSearch(text) {
  const t = text.toLowerCase()
  return /\b(actualit[eé]|news|dernier[es]?|r[eé]cent[es]?|prix de|combien co[uû]te|comparaison|versus|\bvs\b|tendance|classement|meilleur[es]? de|qu['’]est-ce que|quand est|quelle date|quel est le|où trouver|cherche|trouve moi|info sur|d['’]apr[eè]s|selon|statistique[s]?)\b/.test(t)
    || /\b(2025|2026)\b/.test(t)
}

// ══════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
export default function IAChat() {
  const user    = useMemo(() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } }, [])
  const { T }   = useTheme()
  const accent  = 'var(--ember)'
  const accent2 = 'var(--ember-hover)'

  const [prompt,            setPrompt]            = useState('')
  const modele = 'llama-3.3-70b-versatile'
  const [messages,          setMessages]          = useState(() => {
    try { return JSON.parse(localStorage.getItem(`shift_msgs_${user?.id}`) || '[]') } catch { return [] }
  })
  const [loading,           setLoading]           = useState(false)
  const [taches,            setTaches]            = useState([])
  const [profil,            setProfil]            = useState(null)
  const [tacheSelectionnee, setTacheSelectionnee] = useState(null)
  const [historique,        setHistorique]        = useState([])
  const [showHistorique,    setShowHistorique]    = useState(false)
  const [forceSearch,       setForceSearch]       = useState(false)
  const [copie,             setCopie]             = useState(null)
  const [showSidebar,       setShowSidebar]       = useState(false)
  // Sidebar toggle persistant (clé globale partagée avec les autres pages)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_open') !== 'false' } catch { return true }
  })
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try { localStorage.setItem('sidebar_open', String(next)) } catch {}
  }
  const [memoryCount,       setMemoryCount]       = useState(0)
  const [pinnedMessages,    setPinnedMessages]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(`shift_pins_${user?.id}`) || '[]') } catch { return [] }
  })
  // Coach persona — lien avec le drawer Coach du Dashboard
  const [coachStyle,        setCoachStyle]        = useState(() => {
    try { return localStorage.getItem('getshift_coach_style') || 'bienveillant' } catch { return 'bienveillant' }
  })
  const coach = useMemo(() => getCoach(coachStyle), [coachStyle])
  // Suggestions personnalisées (rules-based backend)
  const [suggestions, setSuggestions] = useState(null)
  // Mémoire visible (drawer)
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false)
  const [memoryItems, setMemoryItems] = useState([])
  const [memoryLoading, setMemoryLoading] = useState(false)
  // Slash commands (popup)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashIndex, setSlashIndex] = useState(0)
  // Upload fichier
  const [attachment, setAttachment] = useState(null) // { filename, type, texte, longueur }
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  // Tâches panel mobile
  const [showTasksPanelMobile, setShowTasksPanelMobile] = useState(false)

  const endRef      = useRef(null)
  const textareaRef = useRef(null)
  // Ref pour messages — évite de mettre messages dans les dépendances de envoyer
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/'); return }
    // Tout en parallèle, sans bloquer l'UI
    chargerTaches()
    chargerHistorique()
    chargerProfil()
    chargerMemoire()
    chargerSuggestions()
  }, [])

  useEffect(() => { chargerTaches() }, [location.pathname])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (user) localStorage.setItem(`shift_msgs_${user.id}`, JSON.stringify(messages.slice(-80)))
  }, [messages])

  useEffect(() => {
    if (user) localStorage.setItem(`shift_pins_${user.id}`, JSON.stringify(pinnedMessages.slice(-30)))
  }, [pinnedMessages])

  // ── Loaders (fire & forget) ───────────────────────────────────────
  const chargerProfil      = useCallback(async () => { try { const r = await axios.get(`${API}/users/${user.id}`);          setProfil(r.data)                                  } catch {} }, [user?.id])
  const chargerTaches      = useCallback(async () => { try { const r = await axios.get(`${API}/taches/${user.id}`);          setTaches(r.data)                                  } catch {} }, [user?.id])
  const chargerHistorique  = useCallback(async () => { try { const r = await axios.get(`${API}/ia/historique/${user.id}`);   setHistorique(r.data)                              } catch {} }, [user?.id])
  const chargerMemoire     = useCallback(async () => { try { const r = await axios.get(`${API}/ia/memory/${user.id}`);       setMemoryCount(r.data.total_entrees || 0)          } catch {} }, [user?.id])
  const chargerSuggestions = useCallback(async () => { try { const r = await axios.get(`${API}/ia/suggestions/${user.id}`);  setSuggestions(r.data?.suggestions || null)        } catch {} }, [user?.id])

  const chargerMemoryItems = useCallback(async () => {
    if (!user?.id) return
    setMemoryLoading(true)
    try {
      const r = await axios.get(`${API}/ia/memory/${user.id}/full`)
      setMemoryItems(r.data?.items || [])
    } catch {}
    setMemoryLoading(false)
  }, [user?.id])

  const oublierUnSouvenir = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/ia/memory/${user.id}/${id}`)
      setMemoryItems(p => p.filter(m => m.id !== id))
      setMemoryCount(p => Math.max(0, p - 1))
    } catch {}
  }, [user?.id])

  const oublierToutSouvenirs = useCallback(async () => {
    if (!confirm("Effacer toute la mémoire de l'IA ? L'IA oubliera tout ce qu'elle sait de toi.")) return
    try {
      await axios.delete(`${API}/ia/memory/${user.id}`)
      setMemoryItems([]); setMemoryCount(0)
    } catch {}
  }, [user?.id])

  const ouvrirMemoryDrawer = useCallback(() => {
    setShowMemoryDrawer(true)
    chargerMemoryItems()
  }, [chargerMemoryItems])

  // Upload fichier
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Fichier trop gros (max 5 Mo)'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await axios.post(`${API}/ia/upload-extract`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (r.data?.texte) {
        setAttachment({ filename: r.data.filename, type: r.data.type, texte: r.data.texte, longueur: r.data.longueur })
      } else {
        alert(r.data?.erreur || 'Extraction échouée')
      }
    } catch (e) {
      alert(e.response?.data?.erreur || "Erreur lors de l'upload")
    }
    setUploading(false)
  }, [])

  const removeAttachment = useCallback(() => setAttachment(null), [])

  // Slash commands action — utilise effacer via ref pour éviter TDZ
  // (effacer est déclaré plus bas, donc le mettre dans les deps causerait
  // "Cannot access 'effacer' before initialization")
  const effacerRef = useRef(null)
  const applySlash = useCallback((c) => {
    setShowSlashMenu(false)
    if (c.special === 'web') {
      setForceSearch(true)
      setPrompt('')
      return
    }
    if (c.special === 'clear') {
      effacerRef.current?.()
      setPrompt('')
      return
    }
    // Sinon : remplacer le prompt par le préfixe (l'utilisateur complète + envoie)
    setPrompt(c.prefix)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Persister le choix de coach
  useEffect(() => {
    try { localStorage.setItem('getshift_coach_style', coachStyle) } catch {}
  }, [coachStyle])

  // ── Envoi — streaming SSE + fallback non-stream sur action/erreur ───
  const envoyer = useCallback(async (texteForce) => {
    const texte = (texteForce || prompt).trim()
    if (!texte || loading) return

    // 1. OPTIMISTIC — message user apparaît immédiatement
    const msgUser = { role: 'user', content: texte, timestamp: Date.now() }
    setMessages(p => [...p, msgUser])
    setPrompt('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const hist = messagesRef.current
      .filter(m => m.role === 'user' || m.role === 'ia')
      .slice(-16)
      .map(m => ({ role: m.role === 'ia' ? 'assistant' : 'user', content: m.content }))

    const payload = {
      user_id:        user.id,
      message:        texte,
      modele,
      historique:     hist,
      tache_id:       tacheSelectionnee || null,
      force_search:   forceSearch || detectWebSearch(texte),
      coach_style:    coachStyle,
      attachment_text: attachment?.texte || '',
    }
    const localAttachment = attachment
    setAttachment(null) // reset après envoi

    // Détection d'une intention "tool use" → endpoint non-stream (seul à avoir GETSHIFT_TOOLS)
    const lowerMsg = texte.toLowerCase()
    const looksLikeAction = /\b(cr[eé][eé]|ajoute|nouvelle? tâche|nouvelle? tache|terminée?|terminer|fini[s]?|marque|planifie|planifier|tomorrow|supprime|supprimer|efface|modifie|modifier|change|mets? [àa] jour|renomme|liste|montre|affiche|donne.moi|quelles? sont|mes stats|mes points|mon streak|mon niveau|[eé]pingle|focus du jour|analyse|task dna|d[eé]place|repousse|deadline|assigne|assigner|coll[eè]gue|[eé]quipe|membre|va dans|ouvre|emm[èe]ne|montre[- ]moi (le|la|l[ae]s)|aller (à|sur|dans)|naviguer?)\b/.test(lowerMsg)

    if (looksLikeAction) {
      // Mode classique non-stream pour gérer les actions
      try {
        const { data } = await axios.post(`${API}/ia/assistant`, payload)
        setMessages(p => [...p, {
          role: 'ia', content: data.reponse, modele: data.modele || modele,
          intention: data.intention, action: data.action || null, actions: data.actions || [],
          search_results: data.search_results || null, web_searched: data.web_searched || false,
          calendar_used: data.calendar_used || false,
          abrev_expandees: data.abrev_expandees, message_original: data.message_original,
          message_expande: data.message_expande, coach_style: coachStyle, timestamp: Date.now(),
        }])
        // Réactions aux tool actions (nouveau format) + legacy
        const toolsDone = (data.actions || []).filter(a => a.ok)
        const toolNames = toolsDone.map(a => a.tool)
        const taskMutatingTools = ['creer_tache', 'creer_taches_lot', 'terminer_tache', 'supprimer_tache', 'modifier_tache', 'epingler_focus_jour']
        const celebrationTools  = ['creer_tache', 'creer_taches_lot', 'terminer_tache', 'creer_tache_equipe', 'assigner_tache_equipe']
        if (toolNames.some(t => celebrationTools.includes(t)) || data.action?.type === 'tache_creee' || data.action?.type === 'tache_terminee') {
          confetti({ particleCount: 70, spread: 55, origin: { y: 0.65 }, colors: [accent, '#10b981', accent2] })
        }
        if (toolNames.some(t => taskMutatingTools.includes(t)) || data.action?.type === 'tache_creee' || data.action?.type === 'tache_terminee') {
          chargerTaches()
        }
        if (data.action?.type === 'redirect_tomorrow_builder')
          setTimeout(() => navigate('/planification'), 1800)

        // Navigation déclenchée explicitement par l'IA via naviguer_vers
        const navAction = toolsDone.find(a => a.tool === 'naviguer_vers')
        if (navAction) {
          const page = navAction.page
          const section = navAction.section
          const route = page === 'ia' ? '/ia' : `/${page}`
          const state = section ? { section } : undefined
          setTimeout(() => navigate(route, state ? { state } : undefined), 1000)
        }
      } catch (err) {
        setMessages(p => [...p, { role: 'erreur', content: err.response?.data?.erreur || 'Erreur de connexion. Vérifie ta connexion et réessaie.' }])
      }
      if (forceSearch) setForceSearch(false)
      if (tacheSelectionnee) setTacheSelectionnee(null)
      chargerHistorique(); chargerMemoire(); chargerSuggestions()
      setLoading(false)
      return
    }

    // ── STREAMING ──────────────────────────────────────────────────
    let placeholderIdx = null
    setMessages(p => {
      placeholderIdx = p.length
      return [...p, { role: 'ia', content: '', streaming: true, coach_style: coachStyle, timestamp: Date.now() }]
    })

    try {
      const resp = await fetch(`${API}/ia/assistant/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let metaApplied = false

      const updateLast = (mut) => {
        setMessages(p => {
          const out = [...p]
          if (out.length === 0) return out
          const lastIdx = out.length - 1
          out[lastIdx] = { ...out[lastIdx], ...mut(out[lastIdx]) }
          return out
        })
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const evt of events) {
          if (!evt.startsWith('data: ')) continue
          const json = evt.slice(6).trim()
          if (!json) continue
          try {
            const obj = JSON.parse(json)
            if (obj.type === 'meta' && !metaApplied) {
              metaApplied = true
              updateLast(m => ({
                modele:         obj.modele || modele,
                intention:      obj.intention,
                search_results: obj.search_results || null,
                web_searched:   !!obj.web_searched,
              }))
            } else if (obj.type === 'token') {
              updateLast(m => ({ content: (m.content || '') + obj.content }))
            } else if (obj.type === 'done') {
              updateLast(m => ({ content: obj.full || m.content, streaming: false }))
            } else if (obj.type === 'error') {
              updateLast(m => ({ content: m.content || `Erreur : ${obj.message}`, streaming: false }))
            }
          } catch {}
        }
      }
      // Sécurité : si le stream a fini sans 'done' explicit
      updateLast(m => ({ streaming: false }))
    } catch (err) {
      // Fallback non-stream si streaming échoue
      try {
        const { data } = await axios.post(`${API}/ia/assistant`, payload)
        setMessages(p => {
          const out = [...p]
          // remplacer le placeholder vide par la réponse complète
          if (out.length && out[out.length - 1].role === 'ia' && (out[out.length - 1].streaming || !out[out.length - 1].content)) {
            out[out.length - 1] = {
              role: 'ia', content: data.reponse, modele: data.modele || modele,
              intention: data.intention, action: data.action || null,
              search_results: data.search_results || null, web_searched: data.web_searched || false,
              coach_style: coachStyle,
            }
          } else {
            out.push({ role: 'ia', content: data.reponse, modele: data.modele || modele, intention: data.intention, action: data.action, coach_style: coachStyle })
          }
          return out
        })
      } catch (err2) {
        setMessages(p => {
          const out = [...p]
          if (out.length && out[out.length - 1].streaming) {
            out[out.length - 1] = { role: 'erreur', content: 'Erreur de connexion. Vérifie ta connexion et réessaie.' }
          } else {
            out.push({ role: 'erreur', content: 'Erreur de connexion.' })
          }
          return out
        })
      }
    }

    if (forceSearch) setForceSearch(false)
    if (tacheSelectionnee) setTacheSelectionnee(null)
    chargerHistorique(); chargerMemoire()
    setLoading(false)
  }, [prompt, loading, tacheSelectionnee, forceSearch, user?.id, accent, accent2, navigate, chargerTaches, chargerHistorique, chargerMemoire, chargerSuggestions, coachStyle, attachment])
  // Note: messages retiré des dépendances — on utilise messagesRef à la place

  const creerTache = useCallback(async (titre) => {
    try {
      await axios.post(`${API}/taches`, { titre: titre.substring(0, 100), priorite: 'moyenne', user_id: user.id })
      chargerTaches()
      setMessages(p => [...p, { role: 'systeme', content: `Tâche créée : "${titre.substring(0, 50)}"` }])
    } catch {}
  }, [user?.id, chargerTaches])

  const copier = useCallback((content, idx) => {
    navigator.clipboard.writeText(content)
    setCopie(idx); setTimeout(() => setCopie(null), 2000)
  }, [])

  const effacer = useCallback(() => {
    localStorage.removeItem(`shift_msgs_${user?.id}`)
    setMessages([])
  }, [user?.id])
  // Brancher la ref pour applySlash (déclaré plus haut)
  useEffect(() => { effacerRef.current = effacer }, [effacer])

  const autoResize = useCallback((e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }, [])

  const handleForceSearch = useCallback(() => setForceSearch(true), [])

  const togglePin = useCallback((msg) => {
    setPinnedMessages(prev => {
      const exists = prev.find(p => p.content === msg.content && p.timestamp === msg.timestamp)
      if (exists) return prev.filter(p => !(p.content === msg.content && p.timestamp === msg.timestamp))
      return [...prev, { content: msg.content, coach_style: msg.coach_style, timestamp: msg.timestamp || Date.now() }]
    })
  }, [])

  // ── Computed ──────────────────────────────────────────────────────
  const tachesEnCours = useMemo(() => taches.filter(t => !t.terminee), [taches])

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: "var(--font-ui)", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
        textarea { scrollbar-width: none; }
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
      `}</style>

      {/* Orbes de fond */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${accent2}18 0%, transparent 70%)`, filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, #0ea5e910 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* ── SIDEBAR (shared component) ── */}
      <AppSidebar
        T={T} user={user}
        niveau={profil?.niveau ?? 1}
        points={profil?.points ?? 0}
        streak={profil?.streak ?? 0}
        niveauActuel={{ label: profil?.label || '' }}
        pctNiveau={profil?.pctNiveau ?? 0}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}>
        {/* IAChat-specific: SOUVENIRS button */}
        {memoryCount > 0 && (
          <>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />
            <motion.button
              onClick={ouvrirMemoryDrawer}
              whileHover={{ background: `${accent}22` }}
              whileTap={{ scale: 0.97 }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', background: `${accent}12`, borderRadius: 8, border: `1px solid ${accent}30`, cursor: 'pointer', marginBottom: 8 }}>
              <Database size={11} color={accent} />
              <span style={{ fontSize: 10, color: accent, fontWeight: 700, letterSpacing: '0.5px', flex: 1, textAlign: 'left' }}>{memoryCount} SOUVENIRS</span>
              <ChevronRight size={11} color={accent} />
            </motion.button>
          </>
        )}

        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

        {/* Insights — messages épinglés */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', marginBottom: 8, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bookmark size={9} />INSIGHTS {pinnedMessages.length > 0 && <span style={{ background: `${accent}20`, color: accent, borderRadius: 99, padding: '1px 6px', fontSize: 8 }}>{pinnedMessages.length}</span>}
        </div>
        {pinnedMessages.length === 0 ? (
          <div style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', opacity: 0.6 }}>
            Épingle un message IA pour le retrouver ici.
          </div>
        ) : (
          <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 6 }}>
            {pinnedMessages.slice().reverse().map((p, i) => (
              <motion.div key={i}
                style={{ padding: '7px 10px', borderRadius: 8, background: `${accent}08`, border: `1px solid ${accent}18`, marginBottom: 4, cursor: 'default' }}
                whileHover={{ background: `${accent}12` }}>
                <div style={{ fontSize: 10, color: 'var(--text-primary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {p.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{new Date(p.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  <motion.button
                    onClick={() => togglePin(p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}
                    whileHover={{ color: '#ef4444' }}>
                    <X size={10} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: 'var(--surface-2)', margin: '4px 0 16px' }} />

        {/* Tâches à lier */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', marginBottom: 8, padding: '0 6px' }}>LIER UNE TÂCHE</div>
        <div style={{ maxHeight: 130, overflowY: 'auto', marginBottom: 6 }}>
          {[{ id: null, titre: 'Aucune', priorite: '' }, ...tachesEnCours.slice(0, 8)].map(t => (
            <motion.button key={t.id || 'none'}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: tacheSelectionnee === t.id ? `${accent}18` : 'transparent', border: `1px solid ${tacheSelectionnee === t.id ? accent + '40' : 'transparent'}`, color: tacheSelectionnee === t.id ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, textAlign: 'left', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onClick={() => setTacheSelectionnee(t.id)}
              whileHover={{ color: 'var(--text-primary)' }}>
              {tacheSelectionnee === t.id ? '● ' : '○ '}{t.titre}
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <motion.button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, marginBottom: 2 }}
            onClick={() => setShowHistorique(!showHistorique)} whileHover={{ color: 'var(--text-primary)' }}>
            <History size={13} strokeWidth={1.8} />Historique ({historique.length})
          </motion.button>
        </div>
      </AppSidebar>

      <SidebarToggle T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />
      <FloatingLogo T={T} sidebarOpen={sidebarOpen} isMobile={isMobile} onClick={toggleSidebar} />

      {/* ── MAIN ────────────────────────────────────────────────────── */}
      <main
        style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? SIDEBAR_W : 0), transition: 'margin-left 0.3s ease', flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, position: 'relative', zIndex: 1, paddingBottom: isMobile ? BOTTOM_NAV_HEIGHT : 0 }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!isDragging) setIsDragging(true) }}
        onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }}
        onDrop={e => {
          e.preventDefault(); setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleFileUpload(file)
        }}
      >
        {isDragging && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: `${accent}18`, border: `2px dashed ${accent}`, borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
            <Paperclip size={36} color={accent} strokeWidth={1.5} />
            <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>Dépose le fichier ici</span>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '12px clamp(16px,4vw,28px)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0, background: 'var(--surface-1)', backdropFilter: 'blur(30px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: `${coach.color}14`, border: `1px solid ${coach.color}40`, borderRadius: 99 }}>
              <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <coach.Icon size={11} color={coach.color} strokeWidth={2.4} fill={coach.id === 'motivateur' ? coach.color : 'none'} />
              <span style={{ fontSize: 11, fontWeight: 700, color: coach.color, whiteSpace: 'nowrap', fontFamily: "'Clash Display', sans-serif" }}>{coach.nom} · {coach.tag}</span>
            </div>
            <AnimatePresence>
              {forceSearch && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.35)', borderRadius: 99, color: '#0ea5e9', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <Globe size={10} />Web ON
                </motion.div>
              )}
            </AnimatePresence>
            {tacheSelectionnee && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: `${accent}12`, border: `1px solid ${accent}28`, borderRadius: 99 }}>
                <Link size={10} color={accent} />
                <span style={{ fontSize: 11, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{taches.find(t => t.id === tacheSelectionnee)?.titre}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }} onClick={() => setTacheSelectionnee(null)}><X size={10} /></button>
              </motion.div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            {/* Bouton tâches mobile (split view light) */}
            {isMobile && tachesEnCours.length > 0 && (
              <motion.button onClick={() => setShowTasksPanelMobile(true)} whileTap={{ scale: 0.92 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 8, color: accent, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                <Layers size={11} />{tachesEnCours.length}
              </motion.button>
            )}
            {messages.length > 0 && (
              <motion.button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11 }}
                onClick={effacer} whileHover={{ borderColor: '#ef4444', color: '#ef4444' }}>
                <Trash2 size={11} />{!isMobile && 'Effacer'}
              </motion.button>
            )}
          </div>
        </div>

        {/* Historique */}
        <AnimatePresence>
          {showHistorique && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-subtle)', padding: '14px clamp(16px,4vw,28px)', maxHeight: 200, overflowY: 'auto', flexShrink: 0, backdropFilter: 'blur(30px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Historique</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowHistorique(false)}><X size={13} /></button>
              </div>
              {historique.slice(0, 20).map(h => (
                <motion.div key={h.id} className="glass" style={{ borderRadius: 9, padding: '8px 12px', marginBottom: 5, cursor: 'pointer' }}
                  whileHover={{ borderColor: `${accent}50` }}
                  onClick={() => { setPrompt(h.prompt); setShowHistorique(false) }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt?.substring(0, 80)}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MESSAGES ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(20px,4vw,36px)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* État vide — accueil avec persona Coach + suggestions perso */}
          {messages.length === 0 && (
            <motion.div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Avatar Coach */}
              <motion.div style={{ position: 'relative', marginBottom: 28 }}>
                <motion.div style={{ width: 84, height: 84, borderRadius: '50%', background: `linear-gradient(135deg, ${coach.color}, ${coach.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${coach.color}55, 0 0 120px ${coach.color}30` }}
                  animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
                  <coach.Icon size={36} color="#fff" strokeWidth={2} fill={coach.id === 'motivateur' ? '#fff' : 'none'} />
                </motion.div>
                <motion.div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${coach.color}40` }}
                  animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
              </motion.div>

              {/* Salutation personnalisée par le coach */}
              <h1 style={{ fontSize: 'clamp(22px,5vw,32px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px', marginBottom: 6, fontFamily: "'Clash Display', sans-serif", lineHeight: 1.2 }}>
                {coach.nom} — coach <span style={{ color: coach.color }}>{coach.tag.toLowerCase()}</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, maxWidth: 440, lineHeight: 1.6, fontStyle: 'italic' }}>
                « {coach.accroche} »
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 14, maxWidth: 480, lineHeight: 1.65 }}>
                Salut <strong>{user?.nom?.split(' ')[0]}</strong>. Je connais tes tâches, ton focus du jour, ton streak et tes patterns. On commence par quoi ?
              </p>

              {/* Switch coach rapide */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
                {Object.values(COACHES).map(c => (
                  <motion.button key={c.id}
                    onClick={() => setCoachStyle(c.id)}
                    whileTap={{ scale: 0.94 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 11px',
                      background: c.id === coach.id ? `${c.color}18` : 'transparent',
                      border: `1px solid ${c.id === coach.id ? c.color : 'var(--border-subtle)'}`,
                      borderRadius: 99,
                      color: c.id === coach.id ? c.color : 'var(--text-secondary)',
                      fontSize: 11, fontWeight: c.id === coach.id ? 700 : 500,
                      cursor: 'pointer',
                    }}>
                    <c.Icon size={11} fill={c.id === coach.id && c.id === 'motivateur' ? c.color : 'none'} />
                    {c.nom}
                  </motion.button>
                ))}
              </div>

              {/* Capacités */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                {[
                  { Icon: Globe,       label: 'Web temps réel',          color: '#0ea5e9', onClick: null },
                  { Icon: Database,    label: `${memoryCount} souvenirs`, color: accent,    onClick: memoryCount > 0 ? ouvrirMemoryDrawer : null },
                  { Icon: Brain,       label: 'Spécialiste productivité', color: '#a855f7', onClick: null },
                  { Icon: CheckCircle, label: 'Actions directes',         color: '#10b981', onClick: null },
                ].map(({ Icon, label, color, onClick }, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                    onClick={onClick || undefined}
                    whileHover={onClick ? { scale: 1.05 } : {}}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 99, fontSize: 10.5, color, fontWeight: 600, cursor: onClick ? 'pointer' : 'default' }}>
                    <Icon size={10} />{label}
                  </motion.div>
                ))}
              </div>

              {/* Suggestions DYNAMIQUES (rules-based backend) avec fallback statique */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10, width: '100%', maxWidth: 580 }}>
                {(suggestions && suggestions.length > 0 ? suggestions : SUGGESTIONS).slice(0, 4).map((s, i) => {
                  // Suggestions backend = string icon name ; fallback statique = composant
                  const iconMap = { Brain, Globe, Plus, Zap, AlertCircle, Target, Flame, Calendar, Sparkles, CheckCircle }
                  const Icon = typeof s.icon === 'string' ? (iconMap[s.icon] || Sparkles) : (s.icon || Sparkles)
                  return (
                    <motion.button key={i} className="glass"
                      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                      onClick={() => envoyer(s.text)}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
                      whileHover={{ scale: 1.02, borderColor: `${s.color || coach.color}55` }} whileTap={{ scale: 0.98 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: s.grad || `linear-gradient(135deg, ${coach.color}, ${coach.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color="#fff" strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.45 }}>{s.text}</span>
                    </motion.button>
                  )
                })}
              </div>
              {tachesEnCours.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="glass" style={{ marginTop: 28, padding: '14px 18px', borderRadius: 14, maxWidth: 480, width: '100%', textAlign: 'left' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '2px', marginBottom: 10 }}>TES TÂCHES EN COURS</div>
                  {tachesEnCours.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.priorite === 'haute' ? '#ef4444' : t.priorite === 'moyenne' ? '#f59e0b' : '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
                    </div>
                  ))}
                  {tachesEnCours.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>+{tachesEnCours.length - 3} autres</div>}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Messages — chaque bulle est memoïsée */}
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                <MessageBubble
                  msg={msg} idx={idx}
                  accent={accent} accent2={accent2}
                  isMobile={isMobile}
                  copie={copie}
                  onCopy={copier}
                  onEnvoyer={envoyer}
                  onCreerTache={creerTache}
                  onForceSearch={handleForceSearch}
                  onPin={togglePin}
                  isPinned={pinnedMessages.some(p => p.content === msg.content && p.timestamp === msg.timestamp)}
                  T={T}
                  coach={coach}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading — N'AFFICHE QUE si le dernier message n'est pas en streaming
               (le streaming a déjà sa propre bulle qui se remplit progressivement) */}
          {loading && (() => {
            const last = messages[messages.length - 1]
            if (last && last.role === 'ia' && (last.streaming || last.content)) return null
            return (
              <motion.div style={{ display: 'flex' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${coach.color}, ${coach.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${coach.color}55` }}>
                    <coach.Icon size={13} color="#fff" strokeWidth={2.2} fill={coach.id === 'motivateur' ? '#fff' : 'none'} />
                  </div>
                  <div style={{ padding: '12px 18px', borderRadius: '4px 16px 16px 16px', background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: coach.color }}
                          animate={{ y: [-3, 3, -3], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })()}
          <div ref={endRef} />
        </div>

        {/* ── INPUT ─────────────────────────────────────────────────── */}
        <div style={{ padding: '12px clamp(16px,4vw,28px) clamp(16px,4vw,22px)', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-1)', backdropFilter: 'blur(30px)', flexShrink: 0 }}>
          <AnimatePresence>
            {forceSearch && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ marginBottom: 9, padding: '6px 12px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 9, fontSize: 11, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={10} />Recherche web activée
                <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(14,165,233,0.6)', display: 'flex' }} onClick={() => setForceSearch(false)}><X size={11} /></button>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Attachment chip */}
          {attachment && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 9, padding: '8px 12px', background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 10, fontSize: 12, color: accent, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paperclip size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <strong>{attachment.filename}</strong> · {attachment.longueur} caractères extraits
              </span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, display: 'flex', padding: 0 }} onClick={removeAttachment}><X size={14} /></button>
            </motion.div>
          )}
          {uploading && (
            <div style={{ marginBottom: 9, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={12} color={accent} />
              </motion.div>
              Extraction du contenu en cours…
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {/* Bouton attache fichier */}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }}
              accept=".txt,.md,.markdown,.pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg,.webp,.gif"
              onChange={e => { handleFileUpload(e.target.files?.[0]); e.target.value = '' }} />
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !!attachment}
              whileTap={{ scale: 0.92 }}
              title="Joindre un fichier (PDF, Word, Excel, CSV, image, txt)"
              style={{
                width: 50, height: 50,
                background: attachment ? `${accent}18` : 'var(--surface-2)',
                border: `1px solid ${attachment ? accent : 'var(--border-subtle)'}`,
                color: attachment ? accent : 'var(--text-secondary)',
                borderRadius: 14, cursor: uploading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
              <Paperclip size={17} strokeWidth={2} />
            </motion.button>

            <div style={{ flex: 1, position: 'relative' }}>
              {/* Slash menu popup */}
              {showSlashMenu && (() => {
                const search = prompt.slice(1).toLowerCase()
                const filtered = SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(search))
                if (filtered.length === 0) return null
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                      background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 12,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.25)', padding: 6, zIndex: 50,
                      maxHeight: 320, overflowY: 'auto',
                    }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', padding: '6px 10px 4px', letterSpacing: '1.5px' }}>COMMANDES RAPIDES</div>
                    {filtered.map((c, idx) => {
                      const active = idx === slashIndex
                      return (
                        <motion.button key={c.cmd}
                          onClick={() => applySlash(c)}
                          whileHover={{ background: 'var(--surface-2)' }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                            padding: '8px 10px', borderRadius: 9,
                            background: active ? `${c.color}12` : 'transparent',
                            border: `1px solid ${active ? c.color + '40' : 'transparent'}`,
                            cursor: 'pointer', textAlign: 'left',
                          }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <c.Icon size={13} color={c.color} strokeWidth={2.2} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.cmd}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</div>
                          </div>
                        </motion.button>
                      )
                    })}
                    <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', padding: '6px 10px 2px', borderTop: '1px solid var(--border-subtle)', marginTop: 4, opacity: 0.7 }}>
                      ↑↓ pour naviguer · Entrée ou Tab pour valider · Esc pour fermer
                    </div>
                  </motion.div>
                )
              })()}

              <textarea
                ref={textareaRef}
                style={{ width: '100%', padding: '13px 16px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'none', minHeight: 50, maxHeight: 160, fontFamily: "var(--font-ui)", lineHeight: 1.55, backdropFilter: 'blur(20px)', transition: 'border-color 0.2s', caretColor: accent }}
                placeholder={
                  forceSearch       ? 'Que veux-tu rechercher sur le web ?' :
                  tacheSelectionnee ? `Question sur "${taches.find(t => t.id === tacheSelectionnee)?.titre}" ?` :
                  `Message à ${coach.nom}... (tape / pour les commandes)`
                }
                value={prompt}
                onChange={e => {
                  const v = e.target.value
                  setPrompt(v); autoResize(e)
                  // Slash menu : afficher si texte commence par '/' et pas d'espace
                  if (v.startsWith('/') && !v.includes(' ')) {
                    setShowSlashMenu(true); setSlashIndex(0)
                  } else {
                    setShowSlashMenu(false)
                  }
                }}
                onKeyDown={e => {
                  if (showSlashMenu) {
                    const search = prompt.slice(1).toLowerCase()
                    const filtered = SLASH_COMMANDS.filter(c => c.cmd.slice(1).startsWith(search))
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filtered.length - 1)) }
                    else if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)) }
                    else if (e.key === 'Enter' || e.key === 'Tab') {
                      if (filtered[slashIndex]) { e.preventDefault(); applySlash(filtered[slashIndex]) }
                    } else if (e.key === 'Escape') { e.preventDefault(); setShowSlashMenu(false) }
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); envoyer()
                  }
                }}
                onPaste={e => {
                  const file = e.clipboardData?.files?.[0]
                  if (file) { e.preventDefault(); handleFileUpload(file) }
                }}
                onFocus={e => e.target.style.borderColor = `${accent}60`}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                rows={1}
              />
            </div>
            <motion.button
              style={{ width: 50, height: 50, background: loading || !prompt.trim() ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${accent}, ${accent2})`, color: loading || !prompt.trim() ? 'rgba(255,255,255,0.2)' : '#fff', border: loading || !prompt.trim() ? '1px solid rgba(255,255,255,0.08)' : 'none', borderRadius: 14, cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: !loading && prompt.trim() ? `0 4px 20px ${accent}40` : 'none', transition: 'all 0.2s' }}
              onClick={() => envoyer()}
              whileHover={!loading && prompt.trim() ? { scale: 1.06 } : {}}
              whileTap={!loading && prompt.trim() ? { scale: 0.94 } : {}}>
              {loading
                ? <motion.div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.15)', borderTop: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%' }} animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                : <Send size={17} strokeWidth={2.5} />
              }
            </motion.button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8, letterSpacing: '0.3px' }}>
            Entrée pour envoyer · Shift+Entrée nouvelle ligne · Ctrl+V ou glisser un fichier pour l'analyser
          </p>
        </div>
      </main>

      {/* ── DRAWER MÉMOIRE — ce que l'IA sait de toi ─────────────────── */}
      <AnimatePresence>
        {showMemoryDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMemoryDrawer(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1090, backdropFilter: 'blur(6px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 'min(420px, 95vw)',
                background: 'var(--surface-1)',
                borderLeft: '1px solid var(--border-subtle)',
                zIndex: 1091, display: 'flex', flexDirection: 'column',
                boxShadow: '-12px 0 40px rgba(0,0,0,0.3)',
              }}>
              {/* Header drawer */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={16} color={accent} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Mémoire de l'IA</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ce que {coach.nom} sait de toi · {memoryItems.length} souvenirs</div>
                  </div>
                </div>
                <motion.button onClick={() => setShowMemoryDrawer(false)} whileTap={{ scale: 0.9 }}
                  style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </motion.button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
                {memoryLoading && (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)', fontSize: 12 }}>
                    Chargement de tes souvenirs…
                  </div>
                )}
                {!memoryLoading && memoryItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    <Brain size={36} color="var(--border-subtle)" strokeWidth={1.4} style={{ marginBottom: 14 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Aucun souvenir pour l'instant</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6 }}>Au fil de tes conversations, {coach.nom} retient ce qui te concerne (préférences, projets, contraintes…).</div>
                  </div>
                )}
                {!memoryLoading && memoryItems.length > 0 && (() => {
                  // Grouper par catégorie
                  const grouped = memoryItems.reduce((acc, m) => {
                    const cat = m.categorie || 'autre'
                    if (!acc[cat]) acc[cat] = []
                    acc[cat].push(m)
                    return acc
                  }, {})
                  const catLabels = { preferences: 'Préférences', objectifs: 'Objectifs', contraintes: 'Contraintes', habitudes: 'Habitudes', faits: 'Faits', autre: 'Autre' }
                  return Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '1.5px', marginBottom: 8, textTransform: 'uppercase' }}>{catLabels[cat] || cat}</div>
                      {items.map(m => (
                        <motion.div key={m.id}
                          initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 11, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {m.cle && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{m.cle}</div>}
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.valeur}</div>
                            <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', marginTop: 5, opacity: 0.6, display: 'flex', gap: 8 }}>
                              <span>poids {m.poids}</span>
                              {m.created_at && <span>· {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                            </div>
                          </div>
                          <motion.button onClick={() => oublierUnSouvenir(m.id)}
                            whileTap={{ scale: 0.88 }} title="Oublier ce souvenir"
                            style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Trash2 size={13} />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  ))
                })()}
              </div>

              {/* Footer */}
              {memoryItems.length > 0 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                  <motion.button onClick={oublierToutSouvenirs} whileTap={{ scale: 0.97 }}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Trash2 size={13} /> Tout oublier
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BOTTOM SHEET TÂCHES MOBILE — split view light ─────────────── */}
      <AnimatePresence>
        {isMobile && showTasksPanelMobile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTasksPanelMobile(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1090, backdropFilter: 'blur(6px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                maxHeight: '70dvh',
                background: 'var(--surface-1)',
                borderTop: '1px solid var(--border-subtle)',
                borderRadius: '20px 20px 0 0',
                zIndex: 1091, display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}>
              <div style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-subtle)' }} />
              </div>
              <div style={{ padding: '12px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={15} color={accent} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Tes tâches actives</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tap → lier à la conversation</div>
                  </div>
                </div>
                <motion.button onClick={() => setShowTasksPanelMobile(false)} whileTap={{ scale: 0.9 }}
                  style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </motion.button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px' }}>
                {tachesEnCours.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)', fontSize: 12 }}>Aucune tâche active</div>
                ) : (
                  tachesEnCours.slice(0, 30).map(t => {
                    const pColor = t.priorite === 'haute' ? '#e05c5c' : t.priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
                    return (
                      <motion.button key={t.id}
                        onClick={() => { setTacheSelectionnee(t.id); setShowTasksPanelMobile(false) }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '10px 12px', marginBottom: 6,
                          background: tacheSelectionnee === t.id ? `${accent}15` : 'var(--surface-2)',
                          border: `1px solid ${tacheSelectionnee === t.id ? accent : 'var(--border-subtle)'}`,
                          borderRadius: 11, cursor: 'pointer', textAlign: 'left',
                        }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</span>
                        {t.deadline && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{new Date(t.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                      </motion.button>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isMobile && <MobileBackButton T={T} label="Dashboard" />}
      {isMobile && <BottomNavMobile T={T} />}
    </div>
  )
}
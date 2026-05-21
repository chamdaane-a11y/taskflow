// CustomIcons.jsx — src/pages/CustomIcons.jsx
// Icônes Lucide React avec background-color • Zéro emoji • Zéro dépendance externe

import {
  BookOpen, PlaneTakeoff, RefreshCw, Briefcase,
  CalendarDays, Sun, LayoutGrid, Layers, FileText,
  Brain, Target, Handshake, TrendingUp, Rocket,
  Award, HeartPulse, Home, Wallet, Trophy,
} from 'lucide-react'

// ─── Mapping catégorie → { LucideIcon, bgColor, iconColor } ──────────────────

const ICON_MAP = {
  projet:          { LucideIcon: Layers,       bgColor: 'var(--ember)', iconColor: '#ffffff', borderColor: 'var(--ember)' },
  voyage:          { LucideIcon: PlaneTakeoff, bgColor: '#4caf82', iconColor: '#ffffff', borderColor: '#4caf82' },
  habitude:        { LucideIcon: RefreshCw,    bgColor: '#4caf82', iconColor: '#ffffff', borderColor: '#4caf82' },
  etude:           { LucideIcon: BookOpen,     bgColor: 'var(--ember)', iconColor: '#ffffff', borderColor: 'var(--ember)' },
  matin:           { LucideIcon: Sun,          bgColor: '#e08a3c', iconColor: '#ffffff', borderColor: '#e08a3c' },
  job:             { LucideIcon: Briefcase,    bgColor: 'var(--ember)', iconColor: '#ffffff', borderColor: 'var(--ember)' },
  event:           { LucideIcon: CalendarDays, bgColor: '#e05c5c', iconColor: '#ffffff', borderColor: '#e05c5c' },
  learn:           { LucideIcon: BookOpen,     bgColor: 'var(--ember)', iconColor: '#ffffff', borderColor: 'var(--ember)' },
  apprentissage:   { LucideIcon: Brain,        bgColor: '#a855f7', iconColor: '#ffffff', borderColor: '#a855f7' },
  focus:           { LucideIcon: Target,       bgColor: '#a855f7', iconColor: '#ffffff', borderColor: '#a855f7' },
  freelance:       { LucideIcon: Handshake,    bgColor: '#14b8a6', iconColor: '#ffffff', borderColor: '#14b8a6' },
  travail:         { LucideIcon: Briefcase,    bgColor: 'var(--ember)', iconColor: '#ffffff', borderColor: 'var(--ember)' },
  productivite:    { LucideIcon: TrendingUp,   bgColor: '#10b981', iconColor: '#ffffff', borderColor: '#10b981' },
  entrepreneuriat: { LucideIcon: Rocket,       bgColor: '#f59e0b', iconColor: '#ffffff', borderColor: '#f59e0b' },
  carriere:        { LucideIcon: Award,        bgColor: '#3b82f6', iconColor: '#ffffff', borderColor: '#3b82f6' },
  sante:           { LucideIcon: HeartPulse,   bgColor: '#ec4899', iconColor: '#ffffff', borderColor: '#ec4899' },
  vie:             { LucideIcon: Home,         bgColor: '#f97316', iconColor: '#ffffff', borderColor: '#f97316' },
  finance:         { LucideIcon: Wallet,       bgColor: '#22c55e', iconColor: '#ffffff', borderColor: '#22c55e' },
  challenge:       { LucideIcon: Trophy,       bgColor: '#ef4444', iconColor: '#ffffff', borderColor: '#ef4444' },
  autre:           { LucideIcon: FileText,     bgColor: '#888888', iconColor: '#ffffff', borderColor: '#888888' },
}

// ─── Composant TemplateIconBox ────────────────────────────────────────────────
// Usage : <TemplateIconBox categorie="voyage" size={18} boxSize={40} />

export function TemplateIconBox({ categorie, size = 18, boxSize = 40 }) {
  const config = ICON_MAP[categorie] || ICON_MAP.autre
  const { LucideIcon, bgColor, iconColor, borderColor } = config

  return (
    <div style={{
      width: boxSize,
      height: boxSize,
      borderRadius: 10,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <LucideIcon size={size} color={iconColor} strokeWidth={2.2} />
    </div>
  )
}

// ─── Export de la config pour usage avancé ────────────────────────────────────

export function getTemplateConfig(categorie) {
  return ICON_MAP[categorie] || ICON_MAP.autre
}

export default TemplateIconBox
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
  projet:          { LucideIcon: Layers,       bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  voyage:          { LucideIcon: PlaneTakeoff, bgColor: '#4caf8220', iconColor: '#4caf82', borderColor: '#4caf8230' },
  habitude:        { LucideIcon: RefreshCw,    bgColor: '#4caf8220', iconColor: '#4caf82', borderColor: '#4caf8230' },
  etude:           { LucideIcon: BookOpen,     bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  matin:           { LucideIcon: Sun,          bgColor: '#e08a3c20', iconColor: '#e08a3c', borderColor: '#e08a3c30' },
  job:             { LucideIcon: Briefcase,    bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  event:           { LucideIcon: CalendarDays, bgColor: '#e05c5c20', iconColor: '#e05c5c', borderColor: '#e05c5c30' },
  learn:           { LucideIcon: BookOpen,     bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  apprentissage:   { LucideIcon: Brain,        bgColor: '#a855f720', iconColor: '#a855f7', borderColor: '#a855f730' },
  focus:           { LucideIcon: Target,       bgColor: '#a855f720', iconColor: '#a855f7', borderColor: '#a855f730' },
  freelance:       { LucideIcon: Handshake,    bgColor: '#14b8a620', iconColor: '#14b8a6', borderColor: '#14b8a630' },
  travail:         { LucideIcon: Briefcase,    bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  productivite:    { LucideIcon: TrendingUp,   bgColor: '#10b98120', iconColor: '#10b981', borderColor: '#10b98130' },
  entrepreneuriat: { LucideIcon: Rocket,       bgColor: '#f59e0b20', iconColor: '#f59e0b', borderColor: '#f59e0b30' },
  carriere:        { LucideIcon: Award,        bgColor: '#3b82f620', iconColor: '#3b82f6', borderColor: '#3b82f630' },
  sante:           { LucideIcon: HeartPulse,   bgColor: '#ec489920', iconColor: '#ec4899', borderColor: '#ec489930' },
  vie:             { LucideIcon: Home,         bgColor: '#f9731620', iconColor: '#f97316', borderColor: '#f9731630' },
  finance:         { LucideIcon: Wallet,       bgColor: '#22c55e20', iconColor: '#22c55e', borderColor: '#22c55e30' },
  challenge:       { LucideIcon: Trophy,       bgColor: '#ef444420', iconColor: '#ef4444', borderColor: '#ef444430' },
  autre:           { LucideIcon: FileText,     bgColor: '#88888820', iconColor: '#888888', borderColor: '#88888830' },
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
      <LucideIcon size={size} color={iconColor} strokeWidth={1.8} />
    </div>
  )
}

// ─── Export de la config pour usage avancé ────────────────────────────────────

export function getTemplateConfig(categorie) {
  return ICON_MAP[categorie] || ICON_MAP.autre
}

export default TemplateIconBox
// CustomIcons.jsx — src/pages/CustomIcons.jsx
// Icônes Lucide React avec background-color • Zéro emoji • Zéro dépendance externe

import {
  BookOpen, PlaneTakeoff, RefreshCw, Briefcase,
  CalendarDays, Sun, LayoutGrid, Layers, FileText
} from 'lucide-react'

// ─── Mapping catégorie → { LucideIcon, bgColor, iconColor } ──────────────────

const ICON_MAP = {
  projet:   { LucideIcon: Layers,       bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  voyage:   { LucideIcon: PlaneTakeoff, bgColor: '#4caf8220', iconColor: '#4caf82', borderColor: '#4caf8230' },
  habitude: { LucideIcon: RefreshCw,    bgColor: '#4caf8220', iconColor: '#4caf82', borderColor: '#4caf8230' },
  etude:    { LucideIcon: BookOpen,     bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  matin:    { LucideIcon: Sun,          bgColor: '#e08a3c20', iconColor: '#e08a3c', borderColor: '#e08a3c30' },
  job:      { LucideIcon: Briefcase,    bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  event:    { LucideIcon: CalendarDays, bgColor: '#e05c5c20', iconColor: '#e05c5c', borderColor: '#e05c5c30' },
  learn:    { LucideIcon: BookOpen,     bgColor: '#6c63ff20', iconColor: '#6c63ff', borderColor: '#6c63ff30' },
  autre:    { LucideIcon: FileText,     bgColor: '#88888820', iconColor: '#888888', borderColor: '#88888830' },
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
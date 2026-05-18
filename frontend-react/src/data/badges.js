// ══════════════════════════════════════════════════════════════════════
// Source unique pour le système de gamification (badges + niveaux)
// Refonte 2026-05-18 — 4 piliers, 10 niveaux, anti-burnout
// ══════════════════════════════════════════════════════════════════════
import {
  Flame, Calendar, CheckCircle2, Repeat, Star, Trophy, Bird,
  Target, Zap, Flag, Brain,
  Sprout, TrendingUp, BarChart3, Cpu, Medal, Crown,
  Sunrise, MessageCircle, Bot, Scale, Users,
  Award, Sparkles,
} from 'lucide-react'

// ─── BADGE_ICONS — id → composant Lucide ─────────────────────────────
export const BADGE_ICONS = {
  // Discipline
  'streak_3':    Flame,
  'streak_7':    Calendar,
  'streak_14':   CheckCircle2,
  'streak_21':   Repeat,
  'streak_30':   Star,
  'streak_100':  Trophy,
  'comeback':    Bird,
  // Excellence
  'priority_first': Target,
  'clean_week':     CheckCircle2,
  'deep_focus':     Brain,
  'triple_high':    Zap,
  'goal_crusher':   Flag,
  // Maîtrise
  'first_task':         Sprout,
  'five_tasks':         TrendingUp,
  'ten_tasks':          Zap,
  'twenty_five_tasks':  BarChart3,
  'fifty_tasks':        Cpu,
  'century':            Trophy,
  'pts_500':            Medal,
  'pts_2000':           Medal,
  'pts_10000':          Crown,
  // Sagesse
  'tomorrow_user':  Sunrise,
  'planner_pro':    Calendar,
  'ai_coach':       MessageCircle,
  'goal_setter':    Flag,
  'balance_master': Scale,
  'mentor':         Users,
  'ia_power_user':  Bot,
}

// ─── TIER_STYLES — rareté (couleurs fixes — sens du prestige) ────────
export const TIER_STYLES = {
  common: {
    label: 'Commun',
    color: '#a78f6f',
    bg: 'rgba(167, 143, 111, 0.10)',
    border: 'rgba(167, 143, 111, 0.35)',
    glow: 'rgba(167, 143, 111, 0.25)',
  },
  rare: {
    label: 'Rare',
    color: '#5fb4d6',
    bg: 'rgba(95, 180, 214, 0.12)',
    border: 'rgba(95, 180, 214, 0.40)',
    glow: 'rgba(95, 180, 214, 0.30)',
  },
  epic: {
    label: 'Épique',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.14)',
    border: 'rgba(167, 139, 250, 0.45)',
    glow: 'rgba(167, 139, 250, 0.35)',
  },
  legendary: {
    label: 'Légendaire',
    color: '#f5b942',
    bg: 'rgba(245, 185, 66, 0.16)',
    border: 'rgba(245, 185, 66, 0.55)',
    glow: 'rgba(245, 185, 66, 0.45)',
  },
}

// ─── BADGE_CATEGORIES — 4 piliers GetShift ───────────────────────────
export const BADGE_CATEGORIES = {
  discipline: { label: 'Discipline', icon: Flame,    color: '#e74c3c', subtitle: 'La régularité forge l\'habitude' },
  excellence: { label: 'Excellence', icon: Target,   color: '#4caf82', subtitle: 'Le travail qui compte vraiment' },
  maitrise:   { label: 'Maîtrise',   icon: Award,    color: '#e08a3c', subtitle: 'Volume, progression, expertise'   },
  sagesse:    { label: 'Sagesse',    icon: Sparkles, color: '#a78bfa', subtitle: 'L\'intelligence et l\'équilibre' },
}

export const CATEGORIES_ORDER = ['discipline', 'excellence', 'maitrise', 'sagesse']

// ─── BADGES_CONFIG — la liste complète (27 badges) ───────────────────
export const BADGES_CONFIG = [
  // ── DISCIPLINE — régularité + comeback ─────────────────────────────
  { id: 'streak_3',    nom: 'En route',              description: 'Actif 3 jours consécutifs',                   categorie: 'discipline', tier: 'common'    },
  { id: 'streak_7',    nom: 'Semaine parfaite',      description: 'Actif 7 jours consécutifs',                   categorie: 'discipline', tier: 'rare'      },
  { id: 'streak_14',   nom: 'Quinzaine d\'or',       description: 'Actif 14 jours consécutifs',                  categorie: 'discipline', tier: 'rare'      },
  { id: 'streak_21',   nom: 'Habit Loop',            description: '21 jours — l\'habitude est ancrée',           categorie: 'discipline', tier: 'epic'      },
  { id: 'streak_30',   nom: 'Mois de feu',           description: 'Actif 30 jours consécutifs',                  categorie: 'discipline', tier: 'legendary' },
  { id: 'streak_100',  nom: 'Centurion du temps',    description: '100 jours consécutifs — discipline ultime',   categorie: 'discipline', tier: 'legendary' },
  { id: 'comeback',    nom: 'Phénix',                description: 'Reprendre après 5 jours d\'absence',          categorie: 'discipline', tier: 'rare'      },

  // ── EXCELLENCE — qualité, focus, priorités ─────────────────────────
  { id: 'priority_first', nom: 'Premier tir',         description: 'Tâche haute priorité en 1ère action du jour', categorie: 'excellence', tier: 'common'    },
  { id: 'clean_week',     nom: 'Tableau propre',      description: '7 jours sans tâche en retard',                categorie: 'excellence', tier: 'rare'      },
  { id: 'triple_high',    nom: 'Triple impact',       description: '3 tâches haute priorité terminées en 1 jour', categorie: 'excellence', tier: 'rare'      },
  { id: 'deep_focus',     nom: 'Flow d\'or',          description: 'Session focus ≥ 90 min sans pause',           categorie: 'excellence', tier: 'epic'      },
  { id: 'goal_crusher',   nom: 'Briseur d\'objectif', description: 'Compléter un Goal Reverse entier',            categorie: 'excellence', tier: 'legendary' },

  // ── MAÎTRISE — volume + points ─────────────────────────────────────
  { id: 'first_task',        nom: 'Premier pas',          description: 'Première tâche terminée',  categorie: 'maitrise', tier: 'common'    },
  { id: 'five_tasks',        nom: 'En rythme',            description: '5 tâches terminées',       categorie: 'maitrise', tier: 'common'    },
  { id: 'ten_tasks',         nom: 'Productif',            description: '10 tâches terminées',      categorie: 'maitrise', tier: 'rare'      },
  { id: 'twenty_five_tasks', nom: 'Vitesse de croisière', description: '25 tâches terminées',      categorie: 'maitrise', tier: 'rare'      },
  { id: 'fifty_tasks',       nom: 'Machine',              description: '50 tâches terminées',      categorie: 'maitrise', tier: 'epic'      },
  { id: 'century',           nom: 'Centurion',            description: '100 tâches terminées',     categorie: 'maitrise', tier: 'legendary' },
  { id: 'pts_500',           nom: 'Ascension',            description: '500 points gagnés',        categorie: 'maitrise', tier: 'rare'      },
  { id: 'pts_2000',          nom: 'Sommet',               description: '2 000 points gagnés',      categorie: 'maitrise', tier: 'epic'      },
  { id: 'pts_10000',         nom: 'Cinq chiffres',        description: '10 000 points gagnés',     categorie: 'maitrise', tier: 'legendary' },

  // ── SAGESSE — features IA + équilibre ──────────────────────────────
  { id: 'tomorrow_user',  nom: 'Plan B+',                description: 'Première utilisation de Tomorrow Builder',     categorie: 'sagesse', tier: 'common'    },
  { id: 'goal_setter',    nom: 'Cap fixé',               description: 'Premier objectif créé avec Goal Reverse',      categorie: 'sagesse', tier: 'rare'      },
  { id: 'ai_coach',       nom: 'Disciple du coach',      description: '5 conversations avec le Coach IA',             categorie: 'sagesse', tier: 'rare'      },
  { id: 'planner_pro',    nom: 'Architecte du lendemain',description: 'Tomorrow Builder utilisé 7 jours d\'affilée',  categorie: 'sagesse', tier: 'epic'      },
  { id: 'ia_power_user',  nom: 'Architecte IA',          description: 'Les 3 IA (Tomorrow, Goal, Coach) en 1 semaine',categorie: 'sagesse', tier: 'epic'      },
  { id: 'balance_master', nom: 'Équilibriste',           description: 'Streak 7j + 1 jour de pause volontaire',       categorie: 'sagesse', tier: 'epic'      },
  { id: 'mentor',         nom: 'Bâtisseur',              description: 'Équipe avec ≥ 3 collaborateurs actifs',        categorie: 'sagesse', tier: 'legendary' },
]

// ─── niveaux — 10 paliers, courbe géométrique ────────────────────────
export const niveaux = [
  { niveau: 1,  label: 'Démarrage',    min: 0     },
  { niveau: 2,  label: 'Apprenti',     min: 100   },
  { niveau: 3,  label: 'Régulier',     min: 250   },
  { niveau: 4,  label: 'Discipliné',   min: 500   },
  { niveau: 5,  label: 'Stratège',     min: 1000  },
  { niveau: 6,  label: 'Expert',       min: 2000  },
  { niveau: 7,  label: 'Maître',       min: 4000  },
  { niveau: 8,  label: 'Architecte',   min: 8000  },
  { niveau: 9,  label: 'Visionnaire',  min: 15000 },
  { niveau: 10, label: 'Légende',      min: 30000 },
]

// ─── Helper: trouver le prochain badge à débloquer ───────────────────
export function getProchainBadge(badgesObtenus = []) {
  return BADGES_CONFIG.find(b => !badgesObtenus.find(ob => ob.id === b.id)) || null
}

// ─── Helper: calculer niveau actuel à partir des points ──────────────
export function getNiveauFromPoints(points = 0) {
  let current = niveaux[0]
  for (const n of niveaux) {
    if (points >= n.min) current = n
    else break
  }
  return current
}

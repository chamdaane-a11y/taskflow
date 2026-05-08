// parseTask.js — Utilitaire de parsing langage naturel pour tâches
// Extrait de CommandBar.jsx pour réutilisation

const JOURS_SEMAINE = {
  lundi: 1, mardi: 2, mercredi: 3, jeudi: 4,
  vendredi: 5, samedi: 6, dimanche: 0,
}

const MOIS = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
}

/**
 * Parse une commande en langage naturel pour extraire titre, priorité et deadline
 * Exemples :
 *   "Finir le rapport demain 15h haute" → { titre: "Finir le rapport", priorite: "haute", deadline: Date }
 *   "Réunion client vendredi 10h" → { titre: "Réunion client", priorite: "moyenne", deadline: Date }
 */
export function parseTaskInput(texte) {
  const t = texte.toLowerCase().trim()
  let titre = texte.trim()
  let priorite = 'moyenne'
  let deadline = null

  // Détection priorité
  if (/\b(urgent|urgente|haute|important|critique|!)\b/.test(t)) {
    priorite = 'haute'
    titre = titre.replace(/\b(urgent|urgente|haute|important|critique|!)\b/gi, '').trim()
  } else if (/\bbasse?\b/.test(t)) {
    priorite = 'basse'
    titre = titre.replace(/\bbasse?\b/gi, '').trim()
  }

  const now = new Date()

  // Détection deadline : aujourd'hui / demain / dans N jours
  if (/\baujourd'?hui\b/.test(t)) {
    deadline = new Date(now)
    deadline.setHours(18, 0, 0, 0)
    titre = titre.replace(/\baujourd'?hui\b/gi, '').trim()
  } else if (/\bdemain\b/.test(t)) {
    deadline = new Date(now)
    deadline.setDate(deadline.getDate() + 1)
    deadline.setHours(9, 0, 0, 0)
    titre = titre.replace(/\bdemain\b/gi, '').trim()
  } else {
    const dansMatch = t.match(/\bdans\s+(\d+)\s+jours?\b/)
    if (dansMatch) {
      deadline = new Date(now)
      deadline.setDate(deadline.getDate() + parseInt(dansMatch[1]))
      deadline.setHours(9, 0, 0, 0)
      titre = titre.replace(/\bdans\s+\d+\s+jours?\b/gi, '').trim()
    }
  }

  // Détection jour de la semaine
  if (!deadline) {
    for (const [nom, jourCible] of Object.entries(JOURS_SEMAINE)) {
      const reg = new RegExp(`\\b${nom}\\s*(prochain)?\\b`)
      if (reg.test(t)) {
        const d = new Date(now)
        const jourActuel = d.getDay()
        let diff = jourCible - jourActuel
        if (diff <= 0) diff += 7
        d.setDate(d.getDate() + diff)
        d.setHours(9, 0, 0, 0)
        deadline = d
        titre = titre.replace(reg, '').trim()
        break
      }
    }
  }

  // Détection date complète (ex: "15 janvier")
  if (!deadline) {
    const dateMatch = t.match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/)
    if (dateMatch) {
      deadline = new Date(now.getFullYear(), MOIS[dateMatch[2]], parseInt(dateMatch[1]), 9, 0, 0)
      if (deadline < now) deadline.setFullYear(deadline.getFullYear() + 1)
      titre = titre.replace(new RegExp(dateMatch[0], 'i'), '').trim()
    }
  }

  // Détection heure (ex: "15h30", "9h")
  const heureMatch = t.match(/\bà?\s*(\d{1,2})h(\d{2})?\b/)
  if (heureMatch && deadline) {
    deadline.setHours(parseInt(heureMatch[1]), parseInt(heureMatch[2] || '0'), 0, 0)
    titre = titre.replace(new RegExp(heureMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim()
  }

  // Nettoyage final du titre
  titre = titre.replace(/\s+/g, ' ').replace(/^[-,\s]+|[-,\s]+$/g, '').trim()
  if (!titre) titre = texte.trim()

  return { titre, priorite, deadline }
}

/**
 * Convertit une Date JS en format MySQL DATETIME local "YYYY-MM-DD HH:MM:SS"
 */
export function toMysqlDatetime(d) {
  if (!d) return null
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/**
 * Couleur selon priorité
 */
export function getPrioriteColor(priorite) {
  return priorite === 'haute' ? '#e05c5c' : priorite === 'moyenne' ? '#e08a3c' : '#4caf82'
}

/**
 * Background selon priorité
 */
export function getPrioriteBg(priorite) {
  return priorite === 'haute' ? 'rgba(224,92,92,0.12)' : priorite === 'moyenne' ? 'rgba(224,138,60,0.12)' : 'rgba(76,175,130,0.12)'
}

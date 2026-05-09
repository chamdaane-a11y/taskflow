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
  let dateDetected = false
  let timeDetected = false
  let dateValue = null   // YYYY-MM-DD si détecté
  let timeValue = null   // HH:mm si détecté

  // Détection priorité
  if (/\b(urgent|urgente|haute|important|critique|!)\b/.test(t)) {
    priorite = 'haute'
    titre = titre.replace(/\b(urgent|urgente|haute|important|critique|!)\b/gi, '').trim()
  } else if (/\bbasse?\b/.test(t)) {
    priorite = 'basse'
    titre = titre.replace(/\bbasse?\b/gi, '').trim()
  }

  const now = new Date()
  let dateBase = null // Date object (sans heure significative)

  if (/\baujourd'?hui\b/.test(t)) {
    dateBase = new Date(now)
    dateDetected = true
    titre = titre.replace(/\baujourd'?hui\b/gi, '').trim()
  } else if (/\bdemain\b/.test(t)) {
    dateBase = new Date(now)
    dateBase.setDate(dateBase.getDate() + 1)
    dateDetected = true
    titre = titre.replace(/\bdemain\b/gi, '').trim()
  } else {
    const dansMatch = t.match(/\bdans\s+(\d+)\s+jours?\b/)
    if (dansMatch) {
      dateBase = new Date(now)
      dateBase.setDate(dateBase.getDate() + parseInt(dansMatch[1]))
      dateDetected = true
      titre = titre.replace(/\bdans\s+\d+\s+jours?\b/gi, '').trim()
    }
  }

  // Jour de la semaine
  if (!dateDetected) {
    for (const [nom, jourCible] of Object.entries(JOURS_SEMAINE)) {
      const reg = new RegExp(`\\b${nom}\\s*(prochain)?\\b`)
      if (reg.test(t)) {
        const d = new Date(now)
        const jourActuel = d.getDay()
        let diff = jourCible - jourActuel
        if (diff <= 0) diff += 7
        d.setDate(d.getDate() + diff)
        dateBase = d
        dateDetected = true
        titre = titre.replace(reg, '').trim()
        break
      }
    }
  }

  // Date explicite (ex: "15 janvier")
  if (!dateDetected) {
    const dateMatch = t.match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/)
    if (dateMatch) {
      const y = now.getFullYear()
      dateBase = new Date(y, MOIS[dateMatch[2]], parseInt(dateMatch[1]))
      if (dateBase < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        dateBase.setFullYear(y + 1)
      }
      dateDetected = true
      titre = titre.replace(new RegExp(dateMatch[0], 'i'), '').trim()
    }
  }

  // Heure (ex: "15h30", "9h", "à 14h")
  const heureMatch = t.match(/\bà?\s*(\d{1,2})h(\d{2})?\b/)
  if (heureMatch) {
    const hh = parseInt(heureMatch[1])
    const mm = parseInt(heureMatch[2] || '0')
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) {
      timeDetected = true
      timeValue = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      titre = titre.replace(new RegExp(heureMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim()
    }
  }

  if (dateBase) {
    dateValue = `${dateBase.getFullYear()}-${String(dateBase.getMonth() + 1).padStart(2, '0')}-${String(dateBase.getDate()).padStart(2, '0')}`
  }

  // Construction de la deadline finale (Date) si on a au moins la date
  let deadline = null
  if (dateDetected && dateBase) {
    deadline = new Date(dateBase)
    if (timeDetected && timeValue) {
      const [hh, mm] = timeValue.split(':').map(Number)
      deadline.setHours(hh, mm, 0, 0)
    } else {
      deadline.setHours(9, 0, 0, 0)
    }
  }

  // Nettoyage final du titre
  titre = titre.replace(/\s+/g, ' ').replace(/^[-,\s]+|[-,\s]+$/g, '').trim()
  if (!titre) titre = texte.trim()

  return { titre, priorite, deadline, dateDetected, timeDetected, dateValue, timeValue }
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

// ══════════════════════════════════════════════════════════════════════
// GetShift Extension — background.js (Service Worker)
// Gère les communications entre content scripts et popup
// ══════════════════════════════════════════════════════════════════════

const API = 'https://getshift-backend.onrender.com'
const APP_URL = 'https://chamdaane-a11y.github.io/taskflow'

// ── Détecteurs de contexte par domaine ────────────────────────────────
const DETECTEURS = {
  'zoom.us': {
    nom: 'Zoom',
    icon: '🎥',
    color: '#2D8CFF',
    detecter: (tab) => ({
      type: 'reunion',
      titre: extraireRéunionZoom(tab.title),
      url: tab.url,
      action: 'Préparer la réunion',
    }),
  },
  'meet.google.com': {
    nom: 'Google Meet',
    icon: '📹',
    color: '#0F9D58',
    detecter: (tab) => ({
      type: 'reunion',
      titre: tab.title.replace(' - Google Meet', '').trim() || 'Réunion Google Meet',
      url: tab.url,
      action: 'Prendre des notes',
    }),
  },
  'calendar.google.com': {
    nom: 'Google Calendar',
    icon: '📅',
    color: '#4285F4',
    detecter: (tab) => ({
      type: 'calendrier',
      titre: 'Événement Google Calendar',
      url: tab.url,
      action: 'Importer dans GetShift',
    }),
  },
  'drive.google.com': {
    nom: 'Google Drive',
    icon: '📁',
    color: '#0F9D58',
    detecter: (tab) => ({
      type: 'fichier',
      titre: tab.title.replace(' - Google Drive', '').replace(' - Lecteur', '').trim(),
      url: tab.url,
      action: 'Lier à une tâche',
    }),
  },
  'docs.google.com': {
    nom: 'Google Docs',
    icon: '📄',
    color: '#4285F4',
    detecter: (tab) => ({
      type: 'document',
      titre: tab.title.replace(' - Google Docs', '').replace(' - Google Sheets', '').replace(' - Google Slides', '').trim(),
      url: tab.url,
      action: 'Créer une tâche depuis ce doc',
    }),
  },
  'notion.so': {
    nom: 'Notion',
    icon: '📝',
    color: '#ffffff',
    detecter: (tab) => ({
      type: 'note',
      titre: tab.title.replace(' | Notion', '').replace(' – Notion', '').trim(),
      url: tab.url,
      action: 'Créer une tâche depuis cette page',
    }),
  },
  'app.slack.com': {
    nom: 'Slack',
    icon: '💬',
    color: '#4A154B',
    detecter: (tab) => ({
      type: 'message',
      titre: 'Message Slack',
      url: tab.url,
      action: 'Convertir en tâche',
    }),
  },
  'discord.com': {
    nom: 'Discord',
    icon: '🎮',
    color: '#5865F2',
    detecter: (tab) => ({
      type: 'message',
      titre: 'Message Discord',
      url: tab.url,
      action: 'Convertir en tâche',
    }),
  },
}

function extraireRéunionZoom(title) {
  const clean = title
    .replace('Zoom Meeting', '')
    .replace('Zoom Webinar', '')
    .replace('Zoom Video Conference', '')
    .trim()
  return clean || 'Réunion Zoom'
}

function getDomaine(url) {
  try {
    const hostname = new URL(url).hostname
    return Object.keys(DETECTEURS).find(d => hostname.includes(d)) || null
  } catch { return null }
}

// ── Écouter les changements d'onglets ─────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  const domaine = getDomaine(tab.url)
  if (!domaine) return

  const detecteur = DETECTEURS[domaine]
  const context = detecteur.detecter(tab)

  // Stocker le contexte détecté
  const stored = await chrome.storage.local.get('contextes_detectes')
  const contextes = stored.contextes_detectes || []
  const now = Date.now()

  // Éviter les doublons récents (< 5 min)
  const recent = contextes.find(c => c.url === tab.url && (now - c.timestamp) < 300000)
  if (!recent) {
    contextes.unshift({
      ...context,
      domaine,
      icon: detecteur.icon,
      color: detecteur.color,
      timestamp: now,
      tabId,
    })
    // Garder seulement les 20 derniers
    await chrome.storage.local.set({ contextes_detectes: contextes.slice(0, 20) })

    // Notifier l'icône extension (badge)
    chrome.action.setBadgeText({ text: '!', tabId })
    chrome.action.setBadgeBackgroundColor({ color: detecteur.color, tabId })
  }
})

// Effacer le badge quand on quitte l'onglet
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  chrome.action.setBadgeText({ text: '', tabId })
})

// ── Recevoir les messages du content script et popup ──────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_CONTEXTES') {
    chrome.storage.local.get('contextes_detectes', (data) => {
      sendResponse({ contextes: data.contextes_detectes || [] })
    })
    return true // async
  }

  if (msg.type === 'CREER_TACHE') {
    creerTacheGetShift(msg.data).then(result => sendResponse(result))
    return true
  }

  if (msg.type === 'EFFACER_CONTEXTES') {
    chrome.storage.local.set({ contextes_detectes: [] })
    sendResponse({ ok: true })
  }

  if (msg.type === 'GET_USER') {
    chrome.storage.local.get('getshift_user', (data) => {
      sendResponse({ user: data.getshift_user || null })
    })
    return true
  }

  if (msg.type === 'SET_USER') {
    chrome.storage.local.set({ getshift_user: msg.user })
    sendResponse({ ok: true })
  }
})

// ── Créer une tâche via l'API GetShift ────────────────────────────────
async function creerTacheGetShift({ titre, priorite, user_id, source_url, source_type }) {
  try {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 1) // J+1 par défaut
    deadline.setHours(23, 59, 0, 0)

    const res = await fetch(`${API}/taches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: titre.substring(0, 120),
        priorite: priorite || 'moyenne',
        deadline: deadline.toISOString().slice(0, 16),
        user_id,
        source: source_url,
        notes: `Créée depuis ${source_type} via l'extension GetShift`,
      }),
    })

    if (!res.ok) throw new Error('API error')
    const data = await res.json()

    // Notification Chrome
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Tâche créée dans GetShift ✓',
      message: titre.substring(0, 80),
      priority: 1,
    })

    return { ok: true, tache: data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── Alarmes périodiques (rappels) ─────────────────────────────────────
chrome.alarms.create('check_rappels', { periodInMinutes: 15 })

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'check_rappels') return

  const stored = await chrome.storage.local.get('getshift_user')
  const user = stored.getshift_user
  if (!user?.id) return

  try {
    const res = await fetch(`${API}/taches/rappels/${user.id}`)
    const data = await res.json()
    const urgents = (data.rappels || []).filter(r => r.jours_restants === 0)

    if (urgents.length > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${urgents.length} tâche(s) à rendre aujourd'hui`,
        message: urgents.slice(0, 3).map(r => `• ${r.titre}`).join('\n'),
        priority: 2,
      })
    }
  } catch {}
})

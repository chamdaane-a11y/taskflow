const CACHE_NAME = 'getshift-v28'
const STATIC_ASSETS = [
  '/taskflow/',
  '/taskflow/index.html',
  '/taskflow/icons/icon-192.png',
  '/taskflow/icons/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => clients.forEach(client => {
        // Force un rechargement de toutes les pages ouvertes après activation
        // du nouveau SW — élimine les JS hashés stale qui n'existent plus sur CDN
        client.postMessage({ type: 'SW_UPDATED' })
      }))
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // ── API externes → bypass total, jamais intercepté par le SW ────────
  const BYPASS_HOSTS = [
    'railway.app', 'onrender.com',
    'googleapis.com', 'google.com', 'accounts.google.com',
    'groq.com', 'api.groq.com',
    'fonts.googleapis.com', 'fonts.gstatic.com',
  ]
  if (BYPASS_HOSTS.some(h => url.hostname.includes(h))) {
    return // laisse le navigateur gérer directement, sans e.respondWith
  }

  // ── HTML / navigation → NETWORK FIRST (sinon les nouveaux deploys cassent) ──
  // L'index.html change à chaque deploy car il référence des chunks JS hashés.
  // Si on cache l'ancien index.html, il pointe vers des JS qui n'existent plus → 404.
  const isHtml = e.request.mode === 'navigate'
    || url.pathname.endsWith('.html')
    || url.pathname === '/taskflow/'
    || url.pathname === '/taskflow'
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          // Cache la nouvelle version pour fallback offline
          if (resp && resp.status === 200) {
            const clone = resp.clone()
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          }
          return resp
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/taskflow/index.html')))
    )
    return
  }

  // ── Fichiers de traduction (/locales/*.json) → NETWORK FIRST ──
  // Ces fichiers changent à chaque ajout de clé i18n mais gardent la même URL
  // (pas de hash). En cache-first, les nouvelles traductions n'apparaissent jamais
  // et i18next affiche le nom de la clé brute (ex: "dashboard.complete_btn").
  if (url.pathname.includes('/locales/') && url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone()
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          }
          return resp
        })
        .catch(() => caches.match(e.request).then(c => c || new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })))
    )
    return
  }

  // ── Assets hashés (JS/CSS/img/font) → Cache First (immutable car hash dans URL) ──
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response
        }
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache))
        return response
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/taskflow/index.html')
        }
        // Retourner une Response valide — undefined ferait TypeError dans respondWith
        return new Response('', { status: 503, statusText: 'Offline' })
      })
    })
  )
})

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'GetShift', body: 'Nouvelle notification' }
  const targetUrl = data.url || '/dashboard'
  const options = {
    body: data.body || '',
    icon: '/taskflow/icons/icon-192.png',
    badge: '/taskflow/icons/icon-72.png',
    // Couleur thème ember pour Android (statut bar + accent)
    // Chrome/Android utilise theme_color du manifest mais on peut surcharger ici
    color: '#E07A3E',
    // Signature vibrate GetShift — pattern court, premium
    vibrate: [120, 60, 120],
    data: { url: targetUrl, ts: Date.now() },
    // Tag groupe les notifs du même type (remplace au lieu d'empiler)
    tag: data.tag || 'getshift',
    // Renotify = nouvelle notif même si même tag (par défaut false = silencieux pour le remplacement)
    renotify: !!data.renotify,
    // Image bannière riche (Android Chrome). Peut être surchargée par le backend.
    image: data.image || undefined,
    requireInteraction: !!data.require_interaction,
    silent: false,
    actions: [
      { action: 'open', title: 'Ouvrir', icon: '/taskflow/icons/icon-72.png' },
      { action: 'dismiss', title: 'Ignorer' }
    ],
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'GetShift', options)
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  if (e.action === 'dismiss') return
  const target = e.notification.data?.url || '/dashboard'
  const targetFull = `/taskflow/#${target.startsWith('/') ? target : '/' + target}`
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('/taskflow') && 'focus' in client) {
          client.navigate(targetFull).catch(() => {})
          return client.focus()
        }
      }
      return clients.openWindow(targetFull)
    })
  )
})

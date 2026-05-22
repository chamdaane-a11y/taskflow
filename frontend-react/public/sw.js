const CACHE_NAME = 'getshift-v16'
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
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // ── API backend → Network First, pas de cache ────────────────────────
  if (url.hostname.includes('railway.app') || url.hostname.includes('onrender.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline', { status: 503 })))
    return
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
      })
    })
  )
})

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'GetShift', body: 'Nouvelle notification' }
  const targetUrl = data.url || '/dashboard'
  e.waitUntil(
    self.registration.showNotification(data.title || 'GetShift', {
      body: data.body || '',
      icon: '/taskflow/icons/icon-192.png',
      badge: '/taskflow/icons/icon-72.png',
      data: { url: targetUrl },
      tag: data.tag || 'getshift',
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'dismiss', title: 'Ignorer' }
      ]
    })
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

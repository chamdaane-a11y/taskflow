const CACHE_NAME = 'taskflow-v4'
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

  // API Railway → Network First, pas de cache
  if (url.hostname.includes('railway.app')) {
    e.respondWith(fetch(e.request).catch(() => new Response('offline', { status: 503 })))
    return
  }

  // Assets statiques → Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(response => {
        // Ne pas cacher les réponses invalides
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response
        }
        // Cloner AVANT de mettre en cache
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache))
        return response
      }).catch(() => {
        // Fallback offline pour navigation
        if (e.request.mode === 'navigate') {
          return caches.match('/taskflow/index.html')
        }
      })
    })
  )
})

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'TaskFlow', body: 'Nouvelle notification' }
  e.waitUntil(
    self.registration.showNotification(data.title || 'TaskFlow', {
      body: data.body || '',
      icon: '/taskflow/icons/icon-192.png',
      badge: '/taskflow/icons/icon-72.png',
      actions: [
        { action: 'open', title: 'Voir les tâches' },
        { action: 'dismiss', title: 'Ignorer' }
      ]
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  if (e.action === 'dismiss') return
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('/taskflow') && 'focus' in client) return client.focus()
      }
      return clients.openWindow('/taskflow/#/dashboard')
    })
  )
})
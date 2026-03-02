const CACHE_NAME = 'taskflow-v3'
const STATIC_CACHE = 'taskflow-static-v3'
const API_CACHE = 'taskflow-api-v3'
const API_BASE = 'https://taskflow-production-75c1.up.railway.app'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(['/taskflow/', '/taskflow/index.html']).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET') return
  if (url.origin === new URL(API_BASE).origin) {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.ok) caches.open(API_CACHE).then((c) => c.put(request, res.clone()))
        return res
      }).catch(() => caches.match(request).then((c) => c || new Response(JSON.stringify({ erreur: 'Hors ligne', offline: true }), { headers: { 'Content-Type': 'application/json' }, status: 503 })))
    )
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/taskflow/index.html').then((c) => c || new Response('<h1>Hors ligne</h1>', { headers: { 'Content-Type': 'text/html' } }))
      )
    )
    return
  }
  event.respondWith(
    caches.match(request).then((c) => c || fetch(request).then((res) => {
      if (res.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, res.clone()))
      return res
    }))
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'TaskFlow', body: 'Nouvelle notification' }
  try { data = event.data.json() } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/taskflow/icons/icon-192.png',
      badge: '/taskflow/icons/icon-72.png',
      vibrate: [200, 100, 200],
      tag: 'taskflow-rappel',
      renotify: true,
      actions: [{ action: 'open', title: 'Voir les tâches' }, { action: 'dismiss', title: 'Ignorer' }],
      data: { url: '/taskflow/#/dashboard' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url || '/taskflow/#/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/taskflow') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

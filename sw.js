self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'TaskFlow'
  const options = {
    body: data.body || '',
    icon: '/taskflow/icon.png',
    badge: '/taskflow/icon.png',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow('/taskflow/#/dashboard'))
})

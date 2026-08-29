const CACHE = 'fertigation-binder-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/app', '/app/index.html', '/manifest.webmanifest', '/favicon.svg']),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const isApp = path === '/app' || path === '/admin' || path.startsWith('/app/')
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isApp) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/app/index.html', copy))
          }
          return response
        })
        .catch(() => (isApp ? caches.match('/app/index.html') : caches.match(request))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})

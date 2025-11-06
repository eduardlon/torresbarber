// Service Worker para JP Barber - Corregido
const CACHE_NAME = 'jpbarber-v4';

self.addEventListener('install', (event) => {
  console.log('SW: Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activado');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map(name => name !== CACHE_NAME ? caches.delete(name) : null)
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Ignorar requests que no debemos interceptar
  if (!url.startsWith('http') ||
      url.includes('chrome-extension') ||
      url.includes('moz-extension') ||
      url.includes(':8001') ||
      url.includes(':4342') ||
      url.includes('/api/') ||
      url.includes('/@vite') ||
      url.includes('/__') ||
      event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || !response.ok || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        }).catch(() => {});
        
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'JP Barber', body: 'Notificacion' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'JP Barber', data)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

console.log('JP Barber SW cargado');

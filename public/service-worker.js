
const CACHE_NAME = 'bizflow-simple-v36';
const DYNAMIC_CACHE = 'bizflow-dynamic-v36';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn("Cache install warning:", err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }

  if (!url || !url.pathname) return;

  // Ignorar requisições de API/Supabase para não cachear dados dinâmicos
  if (event.request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  // Estratégia de Navegação (HTML): Network First -> Fallback para Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status === 404 || networkResponse.status >= 500) {
              return caches.match('./index.html').then(cacheRes => cacheRes || networkResponse);
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para Assets e Imagens Externas
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Cachear respostas válidas (200) ou opacas (external images)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});

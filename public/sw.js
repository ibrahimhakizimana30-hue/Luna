// Service worker de Luna : ouverture rapide et page de secours hors connexion.
// Il ne met jamais en cache les données du serveur (Supabase) : soldes,
// transactions et comptes sont toujours lus en direct.
const CACHE = 'luna-v10';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Uniquement les fichiers de Luna elle-même, jamais le serveur ni les autres sites
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Pages : toujours la dernière version en ligne, la copie locale seulement hors connexion
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Seule la page principale sert de secours (pas les pages légales)
          if (url.pathname === '/' && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Fichiers de l'application (noms uniques à chaque version) : copie locale d'abord
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

// --- Notifications ----------------------------------------------------------

// Notification reçue du serveur Luna (même quand Luna est fermé)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Luna', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Luna';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    requireInteraction: data.category === 'calls',
    vibrate: data.category === 'calls' ? [400, 200, 400, 200, 400] : [200, 100, 200],
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Luna déjà ouvert et visible : l'application affiche elle-même l'événement
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return undefined;
      return self.registration.showNotification(title, options);
    })
  );
});

// Appui sur la notification : ouvre Luna sur le bon onglet
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        // Luna déjà ouvert : on le met au premier plan et on change d'onglet, sans recharger
        open.postMessage({ type: 'luna-open', url: target });
        return open.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});

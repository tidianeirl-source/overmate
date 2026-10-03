/* Coopô — service worker
   - Le site se met à jour tout seul : la page est toujours demandée au réseau en premier.
   - Hors connexion, la dernière version enregistrée s'affiche.
   - Firebase, Google, CinetPay et les polices ne sont jamais mis en cache ici. */
const CACHE = 'coopo-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // services externes : pas de cache
  if (req.mode === 'navigate') {                            // la page : réseau d'abord, puis cache
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));   // icônes et manifeste : cache d'abord
});

/* Coopô — service worker
   - Le site se met à jour tout seul : la page est toujours demandée au réseau en premier.
   - Connexion lente : si le réseau n'a pas répondu en 3 secondes, la dernière version enregistrée s'affiche tout de suite
     (la nouvelle version continue d'arriver en arrière-plan et sera là à la prochaine ouverture).
   - Hors connexion, la dernière version enregistrée s'affiche.
   - Firebase, Google, CinetPay et les polices ne sont jamais mis en cache ici. */
const CACHE = 'coopo-v8';
const WAIT_MS = 3000;
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
    let saved = Promise.resolve();
    const net = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); saved = caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {}); }
      return res;
    });
    e.respondWith((async () => {
      const cached = await caches.match('./index.html');
      if (!cached) return net;                              // première visite : le réseau est obligatoire
      try {
        const res = await Promise.race([net, new Promise(r => setTimeout(r, WAIT_MS))]);
        if (res && res.ok) return res;                      // réseau assez rapide : version à jour
      } catch (err) {}
      return cached;                                        // réseau lent, en erreur ou coupé : dernière version enregistrée
    })());
    e.waitUntil(net.then(() => saved, () => {}));           // la mise à jour du cache se termine même si la page est déjà affichée
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));   // icônes et manifeste : cache d'abord
});

// Clic sur une notification : ouvre (ou ramène) Coopô sur la bonne page
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

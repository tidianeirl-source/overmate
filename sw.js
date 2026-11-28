/* Coopô — service worker
   - Le site se met à jour tout seul : la page est toujours demandée au réseau en premier.
   - Connexion lente : si le réseau n'a pas répondu en 3 secondes, la dernière version enregistrée s'affiche tout de suite
     (la nouvelle version continue d'arriver en arrière-plan et sera là à la prochaine ouverture).
   - Hors connexion, la dernière version enregistrée s'affiche.
   - Firebase, Google, CinetPay et les polices ne sont jamais mis en cache ici. */
// v22 — Le code du site est dans js/ : à chaque mise en ligne, changer V ici ET le ?v= des balises <script> d'index.html (même nombre).
// Ainsi une page est toujours servie avec le code de sa version (jamais une page neuve avec un vieux fichier gardé en cache).
const V = 62;
const CACHE = 'coopo-v' + V;
const WAIT_MS = 3000;
const JS = ['base', 'navigation', 'pages', 'themes', 'boutique', 'appareil', 'apparence', 'connexion', 'mates', 'messages', 'appels', 'medias', 'sessions-flammes', 'groupes', 'communaute', 'pages-infos', 'firebase', 'demarrage'];   // dans l'ordre d'index.html
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/v2/icon-192.png', './icons/v2/icon-512.png', ...JS.map(n => './js/' + n + '.js?v=' + V)];

self.addEventListener('install', e => {
  // { cache: 'reload' } : à chaque nouvelle version, ces fichiers sont redemandés au serveur (jamais une vieille copie gardée par le navigateur)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));   // icônes, manifeste et code (js/…?v=) : cache d'abord
});

// v14 — Notifications « push » (envoyées par le serveur via Firebase Cloud Messaging) : un appel arrive même quand Coopô est fermée.
//   step « ring » : « Appel vocal de … » qui sonne jusqu'à ce qu'on y touche ; step « end » : on l'enlève, et « Appel manqué » si personne n'a décroché.
self.addEventListener('push', e => {
  let p = {}; try { p = e.data ? e.data.json() : {}; } catch (x) {}
  const d = (p && p.data) || {};
  if (d.type !== 'call' || !d.pair || !d.from) return;
  const reg = self.registration, tag = 'call-' + d.pair, icon = 'icons/v2/icon-192.png', badge = 'icons/v2/badge-96.png', who = String(d.name || 'Ton mate').slice(0, 40);
  const url = reg.scope + '#/messages/' + encodeURIComponent(d.from), at = +d.at || Date.now();
  e.waitUntil((async () => {
    const shown = await reg.getNotifications({ tag });
    if (d.step === 'end') {
      shown.forEach(n => n.close());
      if (d.missed === '1') await reg.showNotification('Appel manqué', { body: who + " a essayé de t'appeler.", tag: 'missed-' + d.pair, icon, badge, timestamp: at, data: { url } });
      return;
    }
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (shown.length || wins.some(w => w.visibilityState === 'visible')) return;   // déjà affichée, ou Coopô est à l'écran (elle sonne déjà)
    await reg.showNotification((d.kind === 'video' ? 'Appel vidéo' : 'Appel vocal') + ' de ' + who, { body: 'Touche pour répondre', tag, renotify: true,
      requireInteraction: true, vibrate: [500, 250, 500, 250, 500, 250, 500], icon, badge, timestamp: at, data: { url } });
  })());
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

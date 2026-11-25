// v14 — le service worker (sw.js) reçoit les notifications « push » des appels : on le fait tourner dans un faux navigateur
const fs = require('fs'), vm = require('vm'), path = require('path');
const REPO = process.env.REPO || path.resolve(__dirname, '..');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 500))); if (!c) fails++; };
function boot(wins = []) {
  const H = {}, shown = [];
  const reg = { scope: 'https://tidianeirl-source.github.io/overmate/',
    showNotification: async (title, o) => { const n = { title, ...o, open: true, close() { n.open = false; } }; shown.push(n); },
    getNotifications: async f => shown.filter(n => n.open && (!f || !f.tag || n.tag === f.tag)) };
  const self = { addEventListener: (t, f) => { H[t] = f; }, registration: reg, location: new URL(reg.scope + 'sw.js'),
    clients: { matchAll: async () => wins, claim: async () => {}, openWindow: async u => { self.opened = u; } }, skipWaiting: () => {} };
  vm.runInNewContext(fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8'), { self, caches: {}, fetch: () => {}, URL, Promise, setTimeout, console });
  const push = async data => { let w = null; const e = { data: data === undefined ? null : { json: () => (typeof data === 'string' ? JSON.parse(data) : data) }, waitUntil: p => { w = p; } }; H.push(e); if (w) await w; };
  return { H, shown, push, self };
}
(async () => {
  const pair = 'aliceUid1234567890_bobUid123456789012', from = 'aliceUid1234567890';
  const ring = { data: { type: 'call', step: 'ring', pair, from, name: 'Alice', kind: 'audio', at: '1795401082678' }, from: '632209817465', fcmMessageId: 'x' };
  let b = boot();
  ok(typeof b.H.push === 'function' && typeof b.H.notificationclick === 'function', 'le service worker écoute les notifications « push » et les clics', Object.keys(b.H));
  await b.push(ring);
  let n = b.shown[0];
  ok(b.shown.length === 1 && n.title === 'Appel vocal de Alice' && n.tag === 'call-' + pair && n.requireInteraction && n.renotify && n.body === 'Touche pour répondre' && n.data.url === 'https://tidianeirl-source.github.io/overmate/#/messages/' + from && n.timestamp === 1795401082678 && Array.isArray(n.vibrate), 'Coopô fermée : « Appel vocal de Alice », qui sonne et reste jusqu\'à ce qu\'on y touche', n);
  await b.push(ring); ok(b.shown.length === 1, 'la même sonnerie n\'est pas affichée deux fois', b.shown.length);
  await b.push({ data: { ...ring.data, step: 'end', missed: '1' } });
  ok(!b.shown[0].open && b.shown.length === 2 && b.shown[1].title === 'Appel manqué' && b.shown[1].body === "Alice a essayé de t'appeler." && b.shown[1].tag === 'missed-' + pair, 'fin sans réponse : la sonnerie disparaît, « Appel manqué » s\'affiche', b.shown.map(x => [x.title, x.open]));
  b = boot(); await b.push(ring); await b.push({ data: { ...ring.data, step: 'end', missed: '0' } });
  ok(!b.shown[0].open && b.shown.length === 1, 'refusé par le mate : la sonnerie disparaît, sans « Appel manqué »', b.shown.map(x => [x.title, x.open]));
  b = boot(); await b.push({ data: { ...ring.data, kind: 'video', name: '' } });
  ok(b.shown[0] && b.shown[0].title === 'Appel vidéo de Ton mate', 'appel vidéo, pseudo absent : « Appel vidéo de Ton mate »', b.shown[0] && b.shown[0].title);
  b = boot([{ visibilityState: 'visible' }]); await b.push(ring);
  ok(b.shown.length === 0, 'Coopô est à l\'écran : pas de notification (la page sonne déjà)', b.shown.length);
  b = boot([{ visibilityState: 'hidden' }]); await b.push(ring);
  ok(b.shown.length === 1, 'Coopô ouverte mais cachée : la notification s\'affiche', b.shown.length);
  b = boot(); await b.push({ data: { type: 'autre' } }); await b.push(undefined); await b.push('pas du json');
  ok(b.shown.length === 0, 'autre chose qu\'un appel (ou un message abîmé) : rien', b.shown.length);
  b = boot(); await b.push({ data: { ...ring.data, name: 'A'.repeat(300) } });
  ok(b.shown[0].title.length <= 'Appel vocal de '.length + 40, 'un pseudo trop long est coupé', b.shown[0].title.length);
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// v14 — activer les notifications : bandeau des Messages, réglage, adresse « push » de l'appareil rangée dans private/{uid}.push
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
const FCM = `(function(){ const c = window.__fcm = { get: [], del: 0 };
  firebase.messaging = Object.assign(function(){ return { getToken: async o => { c.get.push({ vapid: o && o.vapidKey, reg: !!(o && o.serviceWorkerRegistration) }); return localStorage.getItem('__fcmTok') || 'fcmTokenA_' + 'x'.repeat(40); },
    deleteToken: async () => { c.del++; return true; } }; }, { isSupported: async () => true }); })();`;
(async () => {
  const W = +(process.env.W || 360);
  const { browser, context, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800 });
  await context.route('**/firebase-messaging-compat.js', r => { log.fcmLoads = (log.fcmLoads || 0) + 1; r.fulfill({ contentType: 'application/javascript', body: FCM }); });
  await page.addInitScript(() => {
    const perm = () => localStorage.getItem('__perm') || 'default';
    try { Object.defineProperty(Notification, 'permission', { configurable: true, get: perm }); Notification.requestPermission = async () => { const a = localStorage.getItem('__permAnswer') || 'granted'; localStorage.setItem('__perm', a); return a; }; } catch (e) {}
    const reg = { showNotification: async () => {}, getNotifications: async () => [] };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg, ready: Promise.resolve(reg), register: async () => reg, controller: null, addEventListener() {} } });
  });
  const sd = mkSeed(), now = Date.now();
  sd.db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: now - 9e6 };
  await seed(page, sd.db, sd.users);
  const ev = (f, a) => page.evaluate(f, a); const priv = () => ev(() => window.__mock.db['private/a01']);
  await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2500);
  // --- bandeau des Messages (autorisation pas encore demandée)
  await nav(page, 'messages', 800);
  let ban = await ev(() => { const b = document.getElementById('nt-ban'); return b && b.innerText.replace(/\s+/g, ' ').trim(); });
  ok(ban && /^Ne rate plus aucun appel Active les notifications : tes mates pourront t'appeler même quand Coopô est fermée\. Activer/.test(ban), 'page Messages : bandeau « Ne rate plus aucun appel »', ban);
  if (W < 800) await page.screenshot({ path: `shots/push-${W}-bandeau.png` });
  ok(!(await overflow(page)).length, 'le bandeau tient dans l\'écran', await overflow(page));
  await page.click('[data-nb-x]'); await page.waitForTimeout(200); await nav(page, 'accueil', 300); await nav(page, 'messages', 500);
  ok(!(await page.$('#nt-ban')) && (await ev(() => localStorage.getItem('coopo_nb_x'))) === '1', '« × » : le bandeau ne revient plus', 0);
  ok(!log.fcmLoads, 'rien de Firebase Messaging n\'est chargé tant qu\'on n\'a pas activé', log.fcmLoads);
  // --- « Activer » depuis le bandeau
  await ev(() => localStorage.removeItem('coopo_nb_x')); await nav(page, 'accueil', 300); await nav(page, 'messages', 500);
  await page.click('[data-nb-on]'); await page.waitForTimeout(1500);
  let p = await priv(), fc = await ev(() => window.__fcm), tt = await ev(() => document.getElementById('toast').textContent);
  ok(fc && fc.get.length === 1 && fc.get[0].vapid === 'BPxo2lfyQraUCGxMm-JUZSKFVOJhxeN-XLoy_yS_uS-iOmMhEfA-IwIjRtTcelg-SzWLUFQKev6QHR47ZID9PEo' && fc.get[0].reg, 'l\'adresse est demandée avec la clé publique Web Push et le service worker de Coopô', fc);
  ok(p && JSON.stringify(p.push) === JSON.stringify(['fcmTokenA_' + 'x'.repeat(40)]) && p.dob === sd.db['private/a01'].dob, 'l\'adresse est rangée dans private/a01.push ; la date de naissance n\'a pas bougé', p);
  ok(/Notifications activées : tes appels sonneront même quand Coopô est fermée\./.test(tt) && !(await page.$('#nt-ban')) && (await ev(() => S.notifyOn)), 'message « tes appels sonneront même quand Coopô est fermée »', tt);
  // --- le réglage
  await nav(page, 'parametres', 700);
  let set = await ev(() => { const t = document.getElementById('notif-toggle'); return t && { btn: t.textContent, txt: t.closest('.toggle').innerText.replace(/\s+/g, ' ') }; });
  ok(set && set.btn === 'Désactiver' && /Les appels sonnent même quand Coopô est fermée\./.test(set.txt), 'Réglages : « Désactiver », et l\'explication des appels', set);
  // --- à la visite suivante, l'adresse est tenue à jour (elle a changé)
  await ev(() => localStorage.setItem('__fcmTok', 'fcmTokenB_' + 'y'.repeat(40)));
  await page.reload(); await page.waitForTimeout(6500);
  p = await priv();
  ok(p && JSON.stringify(p.push) === JSON.stringify(['fcmTokenB_' + 'y'.repeat(40)]) && (await ev(() => localStorage.getItem('coopo_push'))) === 'fcmTokenB_' + 'y'.repeat(40), 'visite suivante : la nouvelle adresse remplace l\'ancienne', p);
  // --- un deuxième appareil, puis on désactive sur celui-ci
  await ev(() => { const k = 'private/a01'; window.__mock.set(k, { ...window.__mock.db[k], push: ['autreAppareil_' + 'z'.repeat(30), ...window.__mock.db[k].push] }); });
  await nav(page, 'parametres', 700); await page.click('#notif-toggle'); await page.waitForTimeout(1200);
  p = await priv(); fc = await ev(() => window.__fcm);
  ok(JSON.stringify(p.push) === JSON.stringify(['autreAppareil_' + 'z'.repeat(30)]) && fc.del === 1 && !(await ev(() => S.notifyOn)) && !(await ev(() => localStorage.getItem('coopo_push'))), 'Désactiver : seule l\'adresse de cet appareil est retirée (l\'autre appareil garde la sienne)', { p, fc });
  // --- notifications bloquées : pas de bandeau, une explication dans les Réglages
  await ev(() => { localStorage.setItem('__perm', 'denied'); localStorage.removeItem('coopo_nb_x'); }); await page.reload(); await page.waitForTimeout(2500);
  await nav(page, 'messages', 600); const b2 = !!(await page.$('#nt-ban'));
  await nav(page, 'parametres', 600); const hint = await ev(() => [...document.querySelectorAll('.hint')].map(x => x.textContent).find(t => /bloquées/.test(t)));
  ok(!b2 && hint, 'notifications bloquées : pas de bandeau, et les Réglages expliquent pourquoi', { b2, hint });
  // --- iPhone sans Coopô sur l'écran d'accueil : on explique comment faire
  const ios = await ev(() => { const N = window.Notification; Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }); delete window.Notification; const h = notifySettingHTML(); window.Notification = N; return h; });
  ok(/Sur iPhone, ajoute d'abord Coopô à ton écran d'accueil/.test(ios), 'iPhone : explique d\'ajouter Coopô à l\'écran d\'accueil', ios);
  ok(!log.errors.length, 'aucune erreur JavaScript', log.errors);
  await browser.close();
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// v14 — sonnerie, « ça sonne », notifications d'appel (Coopô cachée) et demandes au serveur pour faire sonner le mate (push)
const { launch, seed, open, nav, mkSeed, ORIGIN } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 600))); if (!c) fails++; };
(async () => {
  const W = +(process.env.W || 360);
  const { browser, context, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800 });
  await context.grantPermissions(['notifications'], { origin: ORIGIN });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async c => { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
    window.__peer = {
      async answer(pair) { const d = window.__mock.db['calls/' + pair]; const pc = this.pc = new RTCPeerConnection(); const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => pc.addTrack(t, s));
        await pc.setRemoteDescription(d.offer); await pc.setLocalDescription(await pc.createAnswer()); await new Promise(r => setTimeout(r, 800));
        window.__mock.set('calls/' + pair, { ...d, status: 'active', answer: { type: 'answer', sdp: pc.localDescription.sdp } }); },
      async call(pair, from, to, kind) { const pc = this.pc = new RTCPeerConnection(); const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => pc.addTrack(t, s));
        await pc.setLocalDescription(await pc.createOffer()); await new Promise(r => setTimeout(r, 600)); this.at = Date.now();
        window.__mock.set('calls/' + pair, { parts: [from, to].sort(), from, to, kind, status: 'ringing', offer: { type: 'offer', sdp: pc.localDescription.sdp }, at: this.at }); },
      hang(pair, who) { const d = window.__mock.db['calls/' + pair]; window.__mock.set('calls/' + pair, { ...d, status: 'ended', why: 'hangup', endedBy: who }); try { this.pc.close(); } catch (e) { } } };
    // les sons : on compte les notes jouées
    window.__osc = 0; const O = window.AudioContext; window.AudioContext = class extends O { constructor(...a) { super(...a); window.__ctx = (window.__ctx || 0) + 1; } createOscillator() { const o = super.createOscillator(); const st = o.start.bind(o); o.start = (...a) => { window.__osc++; window.__lastFreq = o.frequency.value; return st(...a); }; return o; } };
    window.__vib = []; navigator.vibrate = p => { window.__vib.push(JSON.stringify(p)); return true; };
    // Coopô cachée ou pas, et un faux service worker pour les notifications
    window.__hidden = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden });
    try { Object.defineProperty(Notification, 'permission', { configurable: true, get: () => window.__perm || 'granted' }); Notification.requestPermission = async () => window.__perm || 'granted'; } catch (e) {}   // Chromium sans écran répond toujours « refusé »
    window.__notifs = []; const shown = [];
    const reg = { showNotification: async (title, o) => { const n = { title, ...o, open: true, close() { n.open = false; } }; shown.push(n); window.__notifs.push({ title, tag: o.tag, body: o.body, ri: !!o.requireInteraction }); },
      getNotifications: async f => shown.filter(n => n.open && (!f || !f.tag || n.tag === f.tag)) };
    window.__shown = shown;
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg, ready: Promise.resolve(reg), register: async () => reg, controller: null, addEventListener() {} } });
  });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: now - 9e6 };
  await seed(page, db, sd.users);
  const ev = (f, a) => page.evaluate(f, a); const P = 'a01_a02';
  await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  await nav(page, 'messages/a02', 700);
  await ev(() => { S.notifyOn = true; save(); });
  // --- le son se prépare au premier appui (avant : rien)
  const before = await ev(() => ({ acx: ACX, ctx: window.__ctx || 0 }));
  await page.mouse.click(W / 2, 300); await page.waitForTimeout(300);
  const after = await ev(() => ({ acx: !!ACX, st: ACX && ACX.state }));
  ok(before.acx === null && before.ctx === 0 && after.acx && after.st === 'running', 'le son est préparé au premier appui sur l\'écran (pas avant)', { before, after });
  // --- appel qui arrive, Coopô à l'écran : la mélodie joue, ça vibre, pas de notification
  await ev(p => window.__peer.call(p, 'a02', 'a01', 'audio'), P); await page.waitForTimeout(1500);
  let st = await ev(() => ({ call: CALL && CALL.status, role: CALL && CALL.role, ring: !!RING, soft: RING && RING.soft, played: RING && RING.played, osc: window.__osc, vib: window.__vib.slice(-1)[0], notifs: window.__notifs.length, etat: (document.getElementById('co-state') || {}).textContent }));
  ok(st.call === 'ringing' && st.role === 'in' && st.ring && !st.soft && st.played >= 1 && st.osc >= 18 && st.vib === '[400,200,400]' && st.notifs === 0, 'appel entrant : la sonnerie joue (mélodie), le téléphone vibre, pas de notification puisque Coopô est à l\'écran', st);
  await page.screenshot({ path: `shots/ring-${W}-entrant.png` });
  await ev(p => window.__peer.hang(p, 'a02'), P); await page.waitForTimeout(600);
  st = await ev(() => ({ call: !!CALL, ring: !!RING, vib: window.__vib.slice(-1)[0], notifs: window.__notifs.length }));
  ok(!st.call && !st.ring && st.vib === '0' && st.notifs === 0, 'le mate raccroche : la sonnerie et les vibrations s\'arrêtent', st);
  // --- Coopô cachée : notification « Appel vocal de … », puis « Appel manqué »
  await ev(() => { window.__hidden = true; }); await page.waitForTimeout(8500);   // attendre que le mate puisse rappeler (8 s)
  await ev(p => window.__peer.call(p, 'a02', 'a01', 'audio'), P); await page.waitForTimeout(1500);
  let ns = await ev(() => window.__notifs.slice());
  ok(ns.length === 1 && ns[0].title === 'Appel vocal de AwaBuild' && ns[0].tag === 'call-a01_a02' && ns[0].ri && ns[0].body === 'Touche pour répondre', 'Coopô cachée : notification « Appel vocal de AwaBuild » qui reste jusqu\'à ce qu\'on y touche', ns);
  await ev(p => window.__peer.hang(p, 'a02'), P); await page.waitForTimeout(800);
  ns = await ev(() => ({ all: window.__notifs.slice(), open: window.__shown.filter(n => n.open).map(n => n.title) }));
  ok(ns.all.length === 2 && ns.all[1].title === 'Appel manqué' && ns.all[1].body === "AwaBuild a essayé de t'appeler." && ns.open.join() === 'Appel manqué', 'le mate raccroche : la sonnerie disparaît, « Appel manqué » s\'affiche', ns);
  // --- refuser un appel : pas « manqué »
  await page.waitForTimeout(8500); await ev(p => window.__peer.call(p, 'a02', 'a01', 'audio'), P); await page.waitForTimeout(1500);
  await ev(() => { window.__hidden = false; }); await page.click('[data-co="no"]'); await page.waitForTimeout(700);
  ns = await ev(() => ({ last: window.__notifs.slice(-1)[0].title, open: window.__shown.filter(n => n.open).map(n => n.title), doc: window.__mock.db['calls/a01_a02'].why }));
  ok(ns.last === 'Appel vocal de AwaBuild' && !ns.open.includes('Appel vocal de AwaBuild') && ns.doc === 'refused', 'refuser : la notification d\'appel est enlevée, sans « Appel manqué »', ns);
  // --- j'appelle : « ça sonne » (tonalité douce) et le serveur est prévenu pour faire sonner le mate
  log.pay.length = 0; await page.waitForTimeout(8500);
  await page.click('[data-call="audio"]'); await page.waitForTimeout(4200);
  st = await ev(() => ({ status: CALL && CALL.status, soft: RING && RING.soft, played: RING && RING.played, f: window.__lastFreq }));
  let pays = log.pay.filter(x => /notifyCall/.test(x.url)).map(x => ({ b: JSON.parse(x.body), auth: x.auth }));
  const at = await ev(() => window.__mock.db['calls/a01_a02'].at);
  ok(st.status === 'ringing' && st.soft && st.played >= 1 && st.f === 425, 'appel sortant : « ça sonne » (un « tuut » doux)', st);
  ok(pays.length === 1 && pays[0].b.to === 'a02' && pays[0].b.step === 'ring' && pays[0].b.at === at && pays[0].auth === 'Bearer tok-a01', 'le serveur est prévenu (ring) pour faire sonner le mate, avec ma connexion', pays);
  await page.screenshot({ path: `shots/ring-${W}-sortant.png` });
  await page.click('[data-co="end"]'); await page.waitForTimeout(900);
  pays = log.pay.filter(x => /notifyCall/.test(x.url)).map(x => JSON.parse(x.body));
  const docEnd = await ev(() => window.__mock.db['calls/a01_a02'].status);
  ok(pays.length === 2 && pays[1].step === 'end' && pays[1].at === at && docEnd === 'ended', 'j\'annule avant la réponse : le serveur est prévenu (end), une fois l\'appel noté « terminé »', { pays, docEnd });
  // --- appel décroché puis raccroché : pas de « end »
  await page.waitForTimeout(8500); log.pay.length = 0;
  await page.click('[data-call="audio"]'); await page.waitForTimeout(4200);
  await ev(p => window.__peer.answer(p), P); await page.waitForTimeout(3500);
  const live = await ev(() => CALL && CALL.status);
  await page.click('[data-co="end"]'); await page.waitForTimeout(900);
  pays = log.pay.filter(x => /notifyCall/.test(x.url)).map(x => JSON.parse(x.body).step);
  ok(live === 'active' && pays.join() === 'ring', 'appel décroché puis raccroché : seulement « ring », pas de « manqué »', { live, pays });
  ok(!log.errors.length, 'aucune erreur JavaScript', log.errors);
  await browser.close();
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

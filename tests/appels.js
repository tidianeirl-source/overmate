const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const W = +(process.env.W || 360);
  const { browser, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800 });
  await page.addInitScript(() => {
    // faux micro et fausse caméra
    navigator.mediaDevices.getUserMedia = async c => { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); const s = d.stream;
      if (c && c.video) { const cv = document.createElement('canvas'); cv.width = 160; cv.height = 120; const x = cv.getContext('2d'); setInterval(() => { x.fillStyle = `hsl(${Date.now() / 20 % 360},70%,50%)`; x.fillRect(0, 0, 160, 120); }, 100); cv.captureStream(10).getVideoTracks().forEach(t => s.addTrack(t)); }
      window.__gum = (window.__gum || 0) + 1; return s; };
    // le « mate » simulé : un deuxième téléphone joué dans la même page
    window.__peer = {
      async answer(pair) { const d = window.__mock.db['calls/' + pair]; const pc = this.pc = new RTCPeerConnection(); const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: d.kind === 'video' }); s.getTracks().forEach(t => pc.addTrack(t, s));
        await pc.setRemoteDescription(d.offer); await pc.setLocalDescription(await pc.createAnswer()); await new Promise(r => setTimeout(r, 800));
        window.__mock.set('calls/' + pair, { ...d, status: 'active', answer: { type: 'answer', sdp: pc.localDescription.sdp } }); },
      async call(pair, from, to, kind) { const pc = this.pc = new RTCPeerConnection(); const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' }); s.getTracks().forEach(t => pc.addTrack(t, s));
        await pc.setLocalDescription(await pc.createOffer()); await new Promise(r => setTimeout(r, 800)); this.at = Date.now();
        window.__mock.set('calls/' + pair, { parts: [from, to].sort(), from, to, kind, status: 'ringing', offer: { type: 'offer', sdp: pc.localDescription.sdp }, at: this.at }); },
      async onAnswer(pair) { await this.pc.setRemoteDescription(window.__mock.db['calls/' + pair].answer); },
      hang(pair, who) { const d = window.__mock.db['calls/' + pair]; window.__mock.set('calls/' + pair, { ...d, status: 'ended', why: 'hangup', endedBy: who }); try { this.pc.close(); } catch (e) { } } };
  });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: now - 9e6 };
  await seed(page, db, sd.users);
  const ev = (f, a) => page.evaluate(f, a); const out = []; const P = 'a01_a02';
  await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  await nav(page, 'messages/a02', 700);
  out.push(['boutons', await ev(() => document.querySelectorAll('[data-call]').length), await overflow(page)]);
  await page.screenshot({ path: `shots_app/0-entete-${W}.png` });
  // 1) j'appelle en vocal, le mate répond, puis il raccroche
  await page.click('[data-call="audio"]'); await page.waitForTimeout(3800);
  out.push(['sortant', await ev(p => { const d = window.__mock.db['calls/' + p]; return d && { status: d.status, kind: d.kind, from: d.from, sdp: d.offer.sdp.length, etat: document.getElementById('co-state').textContent }; }, P), await overflow(page)]);
  await page.screenshot({ path: `shots_app/1-sonne-${W}.png` });
  await ev(p => window.__peer.answer(p), P); await page.waitForTimeout(3500);
  out.push(['décroché', await ev(() => ({ status: CALL && CALL.status, pc: CALL && CALL.pc.connectionState, etat: document.getElementById('co-state').textContent, son: !!(document.getElementById('call-audio') || {}).srcObject }))]);
  await page.screenshot({ path: `shots_app/2-en-appel-${W}.png` });
  await page.click('[data-co="mute"]'); out.push(['micro coupé', await ev(() => CALL.stream.getAudioTracks()[0].enabled)]);
  await ev(p => window.__peer.hang(p, 'a02'), P); await page.waitForTimeout(600);
  out.push(['raccroché par le mate', await ev(() => ({ call: !!CALL, ov: !!document.getElementById('call-ov'), toast: document.getElementById('toast').textContent }))]);
  // 2) le mate m'appelle en vidéo, je réponds, puis je raccroche
  await ev(p => window.__peer.call(p, 'a02', 'a01', 'video'), P); await page.waitForTimeout(1500);
  out.push(['entrant', await ev(() => ({ role: CALL && CALL.role, etat: (document.getElementById('co-state') || {}).textContent, btns: [...document.querySelectorAll('[data-co]')].map(b => b.textContent) })), await overflow(page)]);
  await page.screenshot({ path: `shots_app/3-entrant-${W}.png` });
  await page.click('[data-co="yes"]'); await page.waitForTimeout(3600); await ev(p => window.__peer.onAnswer(p), P); await page.waitForTimeout(3000);
  out.push(['vidéo', await ev(() => ({ status: CALL && CALL.status, pc: CALL && CALL.pc.connectionState, w: (document.getElementById('call-remote') || {}).videoWidth, local: !!(document.getElementById('call-local') || {}).srcObject, db: window.__mock.db['calls/a01_a02'].status })), await overflow(page)]);
  await page.screenshot({ path: `shots_app/4-video-${W}.png` });
  await page.click('[data-co="end"]'); await page.waitForTimeout(600);
  out.push(['je raccroche', await ev(() => ({ call: !!CALL, db: window.__mock.db['calls/a01_a02'].status, why: window.__mock.db['calls/a01_a02'].why, by: window.__mock.db['calls/a01_a02'].endedBy }))]);
  // 3) le mate appelle, je refuse
  await ev(p => window.__peer.call(p, 'a02', 'a01', 'audio'), P); await page.waitForTimeout(1500); await page.click('[data-co="no"]'); await page.waitForTimeout(500);
  out.push(['refus', await ev(() => ({ call: !!CALL, db: window.__mock.db['calls/a01_a02'].status, why: window.__mock.db['calls/a01_a02'].why }))]);
  out.forEach(o => console.log(JSON.stringify(o))); console.log('erreurs', JSON.stringify(log.errors).slice(0, 600), JSON.stringify(log.console.filter(x => !/preload|Service Worker/.test(x))).slice(0, 600));
  await browser.close();
})();

// v15 — appel à plusieurs : a01 (la page) appelle a02, puis ajoute a03 et a04. Les mates sont joués dans la même page.
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const W = +(process.env.W || 360);
  const { browser, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800, args: ['--autoplay-policy=no-user-gesture-required'] });
  await page.addInitScript(() => {
    const tone = f => { const ac = new AudioContext(), o = ac.createOscillator(), g = ac.createGain(), d = ac.createMediaStreamDestination(); o.frequency.value = f; g.gain.value = .5; o.connect(g); g.connect(d); o.start(); return d.stream; };
    navigator.mediaDevices.getUserMedia = async () => tone(window.__freq || 440);
    window.__peers = {};
    window.__mkPeer = (id, f, withDc) => { const P = window.__peers[id] = { id, f, got: [], async answer(pair) { const d = window.__mock.db['calls/' + pair]; const pc = this.pc = new RTCPeerConnection(); tone(f).getTracks().forEach(t => pc.addTrack(t));
          if (withDc) { const dc = this.dc = pc.createDataChannel('coopo', { negotiated: true, id: 0 }); dc.onmessage = e => this.got.push(JSON.parse(e.data)); }
          pc.ontrack = e => { this.remote = new MediaStream([e.track]); const a = this.el = new Audio(); a.srcObject = this.remote; a.muted = true; a.play().catch(() => { }); };
          await pc.setRemoteDescription(d.offer); await pc.setLocalDescription(await pc.createAnswer()); await new Promise(r => setTimeout(r, 700));
          window.__mock.set('calls/' + pair, { ...d, status: 'active', answer: { type: 'answer', sdp: pc.localDescription.sdp } }); },
        hang(pair, why) { const d = window.__mock.db['calls/' + pair]; window.__mock.set('calls/' + pair, { ...d, status: 'ended', why: why || 'hangup', endedBy: id }); try { this.pc.close(); } catch (e) { } },
        // ce que ce mate entend : la force du son autour de chaque fréquence
        async hears(freqs) { const ac = new AudioContext(), src = ac.createMediaStreamSource(this.remote), an = ac.createAnalyser(); an.fftSize = 8192; src.connect(an); await new Promise(r => setTimeout(r, 900));
          const buf = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(buf); const hz = ac.sampleRate / an.fftSize; const out = {};
          freqs.forEach(q => { let m = -200; for (let k = Math.round(q / hz) - 3; k <= Math.round(q / hz) + 3; k++) m = Math.max(m, buf[k]); out[q] = Math.round(m); }); ac.close(); return out; } }; return P; };
  });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a04', 'a05', 'a06', 'k01'].forEach(u => { db['requests/' + u + '_a01'] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  await seed(page, db, sd.users);
  const ev = (f, a) => page.evaluate(f, a); const out = [];
  await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  await nav(page, 'messages/a02', 700);
  await page.click('[data-call="audio"]'); await page.waitForTimeout(3600);
  await ev(() => { window.__mkPeer('a02', 660, true).answer('a01_a02'); }); await page.waitForTimeout(3500);
  out.push(['à deux', await ev(() => ({ status: CALL.status, btns: [...document.querySelectorAll('[data-co]')].map(b => b.textContent), multi: !!document.querySelector('.co-who.multi'), roster: window.__peers.a02.got.slice(-1)[0] }))]);
  await page.screenshot({ path: `shots_v15/c1-deux-${W}.png` });
  // ajouter : la liste
  await page.click('[data-co="add"]'); await page.waitForTimeout(300);
  out.push(['liste', await ev(() => ({ rows: [...document.querySelectorAll('.co-pick-row b')].map(b => b.textContent), focus: document.activeElement.className })), await overflow(page)]);
  await page.screenshot({ path: `shots_v15/c2-liste-${W}.png` });
  await page.click('[data-co-add="a03"]'); await page.waitForTimeout(3600);
  out.push(['ça sonne chez a03', await ev(() => ({ doc: (d => d && { status: d.status, kind: d.kind, from: d.from, to: d.to })(window.__mock.db['calls/a01_a03']), extra: CALL.extra.map(L => L.status), grid: [...document.querySelectorAll('.co-p')].map(x => x.textContent), mix: !!CALL.mix, acx: ACX && ACX.state }))]);
  await page.screenshot({ path: `shots_v15/c3-sonne-${W}.png` });
  await ev(() => { window.__mkPeer('a03', 880, true).answer('a01_a03'); }); await page.waitForTimeout(4000);
  out.push(['à trois', await ev(() => ({ extra: CALL.extra.map(L => [L.status, L.pc.connectionState]), titre: document.querySelector('.co-who b').textContent, grid: [...document.querySelectorAll('.co-p')].map(x => x.textContent), audios: [...document.querySelectorAll('#call-ov audio')].map(a => !!a.srcObject),
    r2: window.__peers.a02.got.slice(-1)[0], r3: window.__peers.a03.got.slice(-1)[0] })), await overflow(page)]);
  await page.screenshot({ path: `shots_v15/c4-trois-${W}.png` });
  out.push(['a02 entend (440 moi, 660 lui, 880 a03)', await ev(() => window.__peers.a02.hears([440, 660, 880]))]);
  out.push(['a03 entend', await ev(() => window.__peers.a03.hears([440, 660, 880]))]);
  // micro coupé : ma voix disparaît chez les deux, pas celle des autres
  await page.click('[data-co="mute"]'); await page.waitForTimeout(700);
  out.push(['micro coupé : a02 entend', await ev(() => window.__peers.a02.hears([440, 660, 880]))]);
  await page.click('[data-co="mute"]');
  // un quatrième, puis la limite
  await page.click('[data-co="add"]'); await page.waitForTimeout(200); await page.click('[data-co-add="a04"]'); await page.waitForTimeout(3600);
  await ev(() => { window.__mkPeer('a04', 1100, false).answer('a01_a04'); }); await page.waitForTimeout(4000);
  out.push(['à quatre', await ev(() => ({ n: document.querySelectorAll('.co-p').length, titre: document.querySelector('.co-who b').textContent, add: !!document.querySelector('[data-co="add"]'), r2: window.__peers.a02.got.slice(-1)[0].r.map(x => x.id) })), await overflow(page)]);
  await page.screenshot({ path: `shots_v15/c5-quatre-${W}.png` });
  out.push(['a04 (ancien site, sans canal) entend', await ev(() => window.__peers.a04.hears([440, 660, 880, 1100]))]);
  // a03 quitte
  await ev(() => window.__peers.a03.hang('a01_a03')); await page.waitForTimeout(900);
  out.push(['a03 quitte', await ev(() => ({ n: document.querySelectorAll('.co-p').length, toast: document.getElementById('toast').textContent, extra: CALL.extra.map(L => L.id), r2: window.__peers.a02.got.slice(-1)[0].r.map(x => x.id) }))]);
  // le premier mate (a02) quitte : l'appel continue avec a04
  await ev(() => window.__peers.a02.hang('a01_a02')); await page.waitForTimeout(900);
  out.push(['a02 quitte', await ev(() => ({ call: !!CALL, id: CALL && CALL.id, pair: CALL && CALL.pair, status: CALL && CALL.status, extra: CALL && CALL.extra.length, nom: (document.querySelector('.co-who b') || {}).textContent, etat: (document.getElementById('co-state') || {}).textContent, audio: !!(document.getElementById('call-audio') || {}).srcObject }))]);
  await page.screenshot({ path: `shots_v15/c6-reste-${W}.png` });
  out.push(['a04 entend encore', await ev(() => window.__peers.a04.hears([440, 1100]))]);
  // j'ajoute a05 qui ne répond pas… puis je raccroche pendant que ça sonne
  await page.click('[data-co="add"]'); await page.waitForTimeout(200); await page.click('[data-co-add="a05"]'); await page.waitForTimeout(3400);
  await page.click('[data-co="end"]'); await page.waitForTimeout(700);
  out.push(['je raccroche', await ev(() => ({ call: !!CALL, ov: !!document.getElementById('call-ov'), d4: window.__mock.db['calls/a01_a04'].status, d5: window.__mock.db['calls/a01_a05'].status, by5: window.__mock.db['calls/a01_a05'].endedBy }))]);
  out.push(['serveur prévenu', log.pay.filter(p => /notifyCall/.test(p.url)).map(p => p.body)]);
  // refus d'un mate ajouté, et 13-17 ans écarté de la liste
  await page.click('[data-call="audio"]'); await page.waitForTimeout(3600);
  await ev(() => { window.__mkPeer('a02', 660, true).answer('a01_a02'); }); await page.waitForTimeout(3500);
  await page.click('[data-co="add"]'); await page.waitForTimeout(200);
  out.push(['liste sans le 13-17 ans', await ev(() => [...document.querySelectorAll('.co-pick-row b')].map(b => b.textContent))]);
  await page.click('[data-co-add="a06"]'); await page.waitForTimeout(3400);
  await ev(() => window.__peers.a02 && window.__mock.set('calls/a01_a06', { ...window.__mock.db['calls/a01_a06'], status: 'ended', why: 'refused', endedBy: 'a06' })); await page.waitForTimeout(700);
  out.push(['a06 refuse', await ev(() => ({ toast: document.getElementById('toast').textContent, extra: CALL.extra.length, multi: !!document.querySelector('.co-who.multi'), status: CALL.status }))]);
  await ev(() => window.__peers.a02.hang('a01_a02')); await page.waitForTimeout(700);
  out.push(['fin', await ev(() => ({ call: !!CALL, toast: document.getElementById('toast').textContent, acx: ACX && ACX.state }))]);
  out.forEach(o => console.log(JSON.stringify(o))); console.log('erreurs', JSON.stringify(log.errors).slice(0, 800), JSON.stringify(log.console.filter(x => !/preload|Service Worker/.test(x))).slice(0, 800));
  await browser.close();
})();

// v15 — épingler, « Vu », « écrit… », vocaux plus longs
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const W = +(process.env.W || 360);
  const { browser, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800 });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08'].forEach(u => { db['requests/' + u + '_a01'] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['chats/a01_a02/messages/m1'] = { from: 'a02', text: 'Salut !', at: now - 60000 };
  db['chats/a01_a02/messages/m2'] = { from: 'a01', text: 'Yo, ranked ce soir ?', at: now - 50000 };
  db['chats/a01_a03/messages/m1'] = { from: 'a01', text: 'Tu joues ?', at: now - 90000 };
  db['chats/a01_a03/meta/a03'] = { seen: now - 90000 };
  db['groups/g1'] = { name: 'Les Ranked', desc: '', game: 'Free Fire', image: '', private: false, owner: 'a01', mods: [], members: ['a01', 'a02', 'a03', 'a04'], invited: [], kicked: [], ageGroup: 'adult', at: now - 9e5, lastAt: now - 4000 };
  db['groups/g1/messages/g1'] = { from: 'a02', text: 'Qui est chaud ?', at: now - 30000 };
  db['groups/g1/messages/g2'] = { from: 'a01', text: 'Moi !', at: now - 20000 };
  await seed(page, db, sd.users);
  const ev = (f, a) => page.evaluate(f, a); const out = []; const wr = () => ev(() => window.__mock.writes.filter(w => /\/meta\//.test(w.path)).map(w => w.path + ' ' + JSON.stringify(w.data).replace(/\d{10,}/g, 'T')));
  await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  // ---- conversation : « Vu »
  await nav(page, 'messages/a02', 900);
  out.push(['ouverture : je note ce que j\'ai lu', await wr(), await ev(() => document.querySelector('.seen-tag') ? 'Vu affiché' : 'pas de Vu')]);
  await ev(n => window.__mock.set('chats/a01_a02/meta/a02', { seen: n - 50000 }), now); await page.waitForTimeout(300);
  out.push(['le mate a lu', await ev(() => [...document.querySelectorAll('#chatbox .bubble')].map(b => b.querySelector('small').textContent.trim())), await ev(() => S.seenBy)]);
  // ---- « écrit… »
  await ev(() => window.__mock.set('chats/a01_a02/meta/a02', { ...window.__mock.db['chats/a01_a02/meta/a02'], t: 'w', tAt: Date.now() })); await page.waitForTimeout(300);
  out.push(['il écrit', await ev(() => ({ txt: document.getElementById('typing').textContent, hidden: document.getElementById('typing').hidden })), await overflow(page)]);
  await page.screenshot({ path: `shots_v15/v1-ecrit-${W}.png` });
  await ev(() => window.__mock.set('chats/a01_a02/meta/a02', { ...window.__mock.db['chats/a01_a02/meta/a02'], t: 'v', tAt: Date.now() })); await page.waitForTimeout(300);
  out.push(['il enregistre', await ev(() => document.getElementById('typing').textContent)]);
  await ev(() => window.__mock.set('chats/a01_a02/messages/m3', { from: 'a02', text: 'Go !', at: Date.now() })); await page.waitForTimeout(400);
  out.push(['son message arrive', await ev(() => ({ hidden: document.getElementById('typing').hidden, last: [...document.querySelectorAll('#chatbox .bubble')].pop().textContent.slice(0, 20) })), (await wr()).slice(-1)]);
  await ev(() => window.__mock.set('chats/a01_a02/meta/a02', { ...window.__mock.db['chats/a01_a02/meta/a02'], t: 'w', tAt: Date.now() })); await page.waitForTimeout(300);
  const t1 = await ev(() => document.getElementById('typing').hidden); await page.waitForTimeout(7300);
  out.push(['s\'efface tout seul après 7 s', t1, await ev(() => document.getElementById('typing').hidden)]);
  // j'écris : un signal, pas plus d'un toutes les 5 s
  const n0 = (await wr()).length;
  await page.fill('#chatin', 'S'); await page.type('#chatin', 'alut ça va', { delay: 60 }); await page.waitForTimeout(300);
  const n1 = (await wr()).length; await page.waitForTimeout(5000); await page.type('#chatin', ' ?', { delay: 60 }); await page.waitForTimeout(200);
  out.push(['mes signaux', n1 - n0, (await wr()).length - n1, (await wr()).slice(-1)]);
  await page.press('#chatin', 'Enter'); await page.waitForTimeout(1600);
  out.push(['envoyé : pas encore lu', await ev(() => [...document.querySelectorAll('#chatbox .bubble')].map(b => b.querySelector('small').textContent.trim()))]);
  // ---- liste : Vu, épingles
  await nav(page, 'messages', 900);
  const rows = () => ev(() => [...document.querySelectorAll('.sn-row')].map(r => r.querySelector('b span').textContent + (r.querySelector('.pin-ic') ? ' 📌' : '') + ' | ' + r.querySelector('.sn-st').className.replace('sn-st', '').trim() + ' ' + r.querySelector('.sn-st .t').textContent));
  out.push(['liste', await rows(), await ev(() => (document.querySelector('.sn-tip') || {}).textContent)]);
  // appui long (clic droit) sur DjeliSniper puis sur un autre
  const pinIt = async id => { await ev(i => { const r = document.querySelector(`.sn-row[href="#/messages/${i}"]`); r.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }, id); await page.waitForTimeout(250); const t = await ev(() => document.querySelector('#rm-ov [data-rm="pin"]').textContent); await page.click('#rm-ov [data-rm="pin"]'); await page.waitForTimeout(450); return t; };
  out.push(['menu', await pinIt('a05')]); await pinIt('a07');
  out.push(['épinglés', await rows(), await ev(() => window.__mock.db['private/a01'].pins), await ev(() => document.getElementById('toast').textContent), await overflow(page)]);
  await page.screenshot({ path: `shots_v15/v2-liste-${W}.png` });
  for (const u of ['a02', 'a03', 'a04']) await pinIt(u);
  const sixth = await pinIt('a06');
  out.push(['6e épingle refusée', await ev(() => document.getElementById('toast').textContent), await ev(() => S.pins.length)]);
  out.push(['retirer', await pinIt('a05'), await ev(() => S.pins)]);
  // vrai appui long au doigt
  if (W < 800) { const box = await (await page.$('.sn-row[href="#/messages/a08"]')).boundingBox(); const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 80, y: box.y + 20 }] }); await page.waitForTimeout(650);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300);
    out.push(['appui long au doigt', await ev(() => ({ menu: !!document.querySelector('#rm-ov [data-rm="pin"]'), open: !!document.getElementById('rm-ov'), hash: location.hash }))]); await ev(() => rmClose()); }
  // rechargement : les épingles reviennent du compte
  await ev(() => { S.pins = []; save(); }); await open(page, 'messages', 3200);
  out.push(['après rechargement', await ev(() => S.pins), (await rows()).slice(0, 5)]);
  // ordinateur : colonne
  // ---- groupe : Vu par…, écrit
  await nav(page, 'groupe/g1', 900);
  await ev(n => { window.__mock.set('groups/g1/meta/a02', { seen: n - 20000 }); }, now); await page.waitForTimeout(300);
  const g1 = await ev(() => [...document.querySelectorAll('#chatbox .bubble')].pop().querySelector('small').textContent.trim());
  await ev(n => { window.__mock.set('groups/g1/meta/a03', { seen: n - 20000, t: 'w', tAt: Date.now() }); window.__mock.set('groups/g1/meta/a04', { seen: n - 10000, t: 'w', tAt: Date.now() }); }, now); await page.waitForTimeout(300);
  out.push(['groupe', g1, await ev(() => [...document.querySelectorAll('#chatbox .bubble')].pop().querySelector('small').textContent.trim()), await ev(() => document.getElementById('typing').textContent), (await wr()).filter(x => /groups/.test(x)), await overflow(page)]);
  await page.screenshot({ path: `shots_v15/v3-groupe-${W}.png` });
  // ---- vocaux
  out.push(['durée max', await ev(() => { localStorage.removeItem('coopo_vrate'); const a = [voiceMax('audio/webm;codecs=opus'), voiceMax('audio/mp4')]; localStorage.setItem('coopo_vrate', '4000'); a.push(voiceMax('audio/mp4')); localStorage.setItem('coopo_vrate', '16000'); a.push(voiceMax('audio/mp4')); localStorage.removeItem('coopo_vrate'); return a; })]);
  out.forEach(o => console.log(JSON.stringify(o))); console.log('erreurs', JSON.stringify(log.errors).slice(0, 800), JSON.stringify(log.console.filter(x => !/preload|Service Worker/.test(x))).slice(0, 800));
  await browser.close();
})();

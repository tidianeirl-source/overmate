// v11 — zone d'écriture façon TikTok, emojis, gros emojis, bandeau « Appuie sur un sticker pour répondre », photos en plusieurs
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const path = require('path'); const MEDIA = path.join(__dirname, 'media');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
function mk() { const sd = mkSeed(); const now = Date.now();
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['chats/a01_a03/messages/m0'] = { from: 'a01', text: 'On joue ce soir ?', at: now - 12e5 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Grave, vers 21 h', at: now - 9e5 };
  sd.db['stickers/StkMine0001abc'] = { owner: 'a01', data: 'data:image/webp;base64,' + 'A'.repeat(300), n: 1, shape: 'ci', at: now - 2e6 };
  sd.db['groups/g1'] = { name: 'Team du soir', desc: '', game: 'Free Fire', image: '', private: true, owner: 'a03', mods: [], members: ['a03', 'a01'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
  sd.db['groups/g1/messages/q1'] = { from: 'a03', text: 'Qui est chaud ?', at: now - 6e5 };
  return sd; }
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    const tel = W < 800; console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel });
    const sd = mk(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    await nav(page, 'messages/a03', 900);
    // --- zone d'écriture
    let z = await page.evaluate(() => ({ cam: !!document.getElementById('cambtn'), inPill: ['micbtn', 'photobtn', 'cpbtn', 'chatin'].every(id => document.getElementById(id)?.closest('.cf-pill')), ph: document.getElementById('chatin').placeholder, multi: document.getElementById('photoin').multiple }));
    ok(z.cam === tel && z.inPill && z.ph === 'Message…' && z.multi, `appareil photo à gauche (${tel ? 'téléphone' : 'absent sur ordinateur'}), micro, galerie et stickers dans la barre`, z);
    ok(!(await vis(page, '#chatform .send-btn')) && await vis(page, '#micbtn') && await vis(page, '#photobtn'), 'champ vide : micro et galerie, pas de bouton d\'envoi', 0);
    await page.fill('#chatin', 'Salut'); await page.waitForTimeout(100);
    ok(await vis(page, '#chatform .send-btn') && !(await vis(page, '#micbtn')) && !(await vis(page, '#photobtn')) && await vis(page, '#cpbtn'), 'on écrit : le bouton d\'envoi remplace micro et galerie', 0);
    let o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'rien ne déborde', o);
    const fw = await page.evaluate(() => Math.round(document.getElementById('chatin').getBoundingClientRect().width)); ok(fw >= 120, `le champ garde de la place (${fw} px)`, fw);
    await page.press('#chatin', 'Enter'); await page.waitForTimeout(700);
    ok(await page.evaluate(() => Object.values(window.__mock.db).some(v => v && v.text === 'Salut' && v.from === 'a01')), 'Entrée envoie le message (bouton caché ou non)', 0);
    // --- emojis
    await page.click('#cpbtn'); await page.waitForTimeout(400); await page.click('[data-cpt="emo"]'); await page.waitForTimeout(300);
    ok(await vis(page, '[data-cp-bk]'), 'onglet Emojis : bouton effacer', 0);
    await page.click('[data-emo="😂"]'); await page.click('[data-emo="😂"]'); await page.click('[data-emo="❤️‍🔥"]'); await page.waitForTimeout(100);
    let val = await page.inputValue('#chatin'); ok(val === '😂😂❤️‍🔥', 'les emojis s\'ajoutent dans le champ', val);
    await page.click('[data-cp-bk]'); val = await page.inputValue('#chatin'); ok(val === '😂😂', 'effacer retire tout l\'emoji (même composé)', val);
    ok(await vis(page, '#chatform .send-btn'), 'le bouton d\'envoi apparaît', 0);
    await page.click('#chatform .send-btn'); await page.waitForTimeout(1600);
    const jb = await page.evaluate(() => { const b = [...document.querySelectorAll('#chatbox .bubble.me')].pop(); const j = b && b.querySelector('.jumbo'); return b && { j: !!j, fs: j && parseFloat(getComputedStyle(j).fontSize), bg: getComputedStyle(b).backgroundColor }; });
    ok(jb && jb.j && jb.fs >= 40 && /rgba\(0, 0, 0, 0\)|transparent/.test(jb.bg), 'deux emojis seuls : en grand, sans bulle', jb);
    ok(await page.evaluate(() => jumboN('😂') === 1 && jumboN('🇨🇮 🔥') === 2 && jumboN('ok 👍') === 0 && jumboN('😂😂😂😂') === 0 && jumboN('123') === 0 && jumboN('') === 0), 'gros emojis : seulement 1 à 3 emojis sans texte', 0);
    await page.click('[data-cpt="emo"]'); await page.waitForTimeout(200);
    const rec = await page.evaluate(() => ({ cap: /Récemment utilisés/.test(document.getElementById('cp-body').innerText), first: [...document.querySelectorAll('#cp-body .cp-emos')][0].innerText.replace(/\s+/g, '') }));
    ok(rec.cap && rec.first === '❤️‍🔥😂', 'emojis récents en haut (le dernier en premier)', rec);
    // fermer le panneau
    if (tel) { // tirer la poignée vers le bas
      const g = await page.$('.cp-grab'); const b = await g.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + 8); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + 180, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(450);
      ok(await page.evaluate(() => document.getElementById('cpanel').hidden), 'tirer la poignée vers le bas ferme le panneau', 0);
      await page.click('#cpbtn'); await page.waitForTimeout(300); await page.focus('#chatin'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => document.getElementById('cpanel').hidden), 'toucher le champ (clavier) ferme le panneau', 0);
    } else {
      await page.focus('#chatin'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => document.getElementById('cpanel').hidden), 'Échap ferme le panneau', 0);
    }
    // --- bandeau « Appuie sur un sticker pour répondre »
    await page.evaluate(() => window.__mock.set('chats/a01_a03/messages/m8', { from: 'a03', text: 'Tu es où ?', at: Date.now() })); await page.waitForTimeout(800);
    await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(150);
    let qr = await page.evaluate(() => { const q = document.getElementById('qr-stk'); return { on: !q.hidden && q.getBoundingClientRect().height > 0, txt: q.innerText.trim(), n: q.querySelectorAll('[data-stk-send]').length }; });
    ok(qr.on && /Appuie sur un sticker pour répondre/.test(qr.txt) && qr.n >= 1, 'l\'autre vient d\'écrire : le bandeau propose mes stickers', qr);
    await page.fill('#chatin', 'a'); await page.waitForTimeout(100);
    ok(!(await vis(page, '#qr-stk')), 'on écrit : le bandeau se cache', 0); await page.fill('#chatin', ''); await page.evaluate(() => document.activeElement && document.activeElement.blur());
    if (tel) await page.screenshot({ path: `shots-tk/t-${W}-bandeau.png` });
    await page.click('#qr-stk [data-stk-send]'); await page.waitForTimeout(1500);
    ok(await page.evaluate(() => Object.values(window.__mock.db).filter(v => v && v.sticker && v.sticker.id === 'StkMine0001abc' && v.from === 'a01').length === 1) && !(await vis(page, '#qr-stk')), 'un appui répond avec le sticker, le bandeau disparaît', 0);
    await page.evaluate(() => window.__mock.set('chats/a01_a03/messages/m9', { from: 'a03', text: 'Mdr', at: Date.now() })); await page.waitForTimeout(800);
    await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.waitForTimeout(100);
    ok(await vis(page, '#qr-stk'), 'nouveau message : le bandeau revient', 0);
    await page.click('[data-qr-x]'); await page.waitForTimeout(200); await nav(page, 'accueil', 300); await nav(page, 'messages/a03', 900);
    ok(!(await vis(page, '#qr-stk')), '× le masque, même en revenant', 0);
    await page.click('#cpbtn'); await page.waitForTimeout(300); ok(!(await vis(page, '#qr-stk')), 'panneau ouvert : pas de bandeau en plus', 0); await page.click('#cpbtn');
    // --- modifier un message : panneau fermé, boutons cachés
    await page.click('#cpbtn'); await page.waitForTimeout(200);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#chatbox .bubble[data-own]')].find(x => /Salut/.test(x.innerText)); b.querySelector('.msg-more').click(); }); await page.waitForTimeout(300);
    await page.click('[data-mm-edit]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.getElementById('cpanel').hidden) && !(await vis(page, '#cpbtn')) && !(await vis(page, '#micbtn')) && await vis(page, '#chatform .send-btn .save-ico'), 'modifier un message : panneau fermé, seul « Enregistrer » reste', 0);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // --- photos : plusieurs d'un coup
    const files = ['ph-a.jpg', 'ph-b.jpg', 'ph-c.jpg', 'ph-d.jpg'].map(f => path.join(MEDIA, f));
    await page.setInputFiles('#photoin', files); await page.waitForTimeout(800);
    let ps = await page.evaluate(() => { const d = document.querySelector('dialog[open].sheet'); return d && { n: d.querySelectorAll('.ps-ph').length, on: d.querySelectorAll('.ps-ph.on').length, nums: [...d.querySelectorAll('.ps-ph .ps-c')].map(x => x.textContent).join(','), btn: d.querySelector('#ps-send').textContent, cam: !!d.querySelector('[data-ps-cam]'), add: !!d.querySelector('[data-ps-add]'), lab: d.getAttribute('aria-labelledby') }; });
    ok(ps && ps.n === 4 && ps.on === 4 && ps.nums === '1,2,3,4' && ps.btn === 'Envoyer (4)' && ps.cam === tel && ps.add && ps.lab === 'ps-t', '4 photos choisies : feuille du bas, ronds numérotés, « Envoyer (4) »', ps);
    await page.click('[data-ps-i="1"]'); await page.waitForTimeout(150);
    ps = await page.evaluate(() => { const d = document.querySelector('dialog[open].sheet'); return { nums: [...d.querySelectorAll('.ps-ph .ps-c')].map(x => x.textContent).join(','), btn: d.querySelector('#ps-send').textContent, n: document.getElementById('ps-n').textContent }; });
    ok(ps.nums === '1,,2,3' && ps.btn === 'Envoyer (3)' && ps.n === '3 photos choisies', 'appui sur une photo : elle sort du choix, les numéros suivent', ps);
    await page.setInputFiles('#photoin', [path.join(MEDIA, 'photo.png')]); await page.waitForTimeout(500);
    ps = await page.evaluate(() => { const d = document.querySelector('dialog[open].sheet'); return { n: d.querySelectorAll('.ps-ph').length, btn: d.querySelector('#ps-send').textContent }; });
    ok(ps.n === 5 && ps.btn === 'Envoyer (4)', '« + » : une photo de plus s\'ajoute à la feuille', ps);
    o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'feuille photos : rien ne déborde', o);
    if (tel) await page.screenshot({ path: `shots-tk/t-${W}-photos.png` });
    const before = await page.evaluate(() => Object.values(window.__mock.db).filter(v => v && v.photo && v.from === 'a01').length);
    await page.click('#ps-send'); await page.waitForTimeout(7000);
    const sent = await page.evaluate(() => Object.values(window.__mock.db).filter(v => v && v.photo && v.text === '📷 Photo' && v.from === 'a01').map(v => v.at).sort());
    const ph = await page.evaluate(() => Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_a03/photos/')).length);
    const gaps = sent.slice(1).map((t, k) => t - sent[k]);
    ok(sent.length - before === 4 && ph === 4 && gaps.every(g => g >= 1100) && !(await page.evaluate(() => !!document.querySelector('dialog[open]'))), `4 photos parties, une par une (écarts ${gaps.join(', ')} ms)`, { sent, ph, gaps });
    // --- groupe : même zone d'écriture, photos et bandeau
    await nav(page, 'groupe/g1', 1200);
    z = await page.evaluate(() => ({ pill: !!document.querySelector('#chatform.tk .cf-pill'), ph: document.getElementById('chatin').placeholder, qr: !document.getElementById('qr-stk').hidden }));
    ok(z.pill && z.ph === 'Message au groupe…' && z.qr, 'groupe : même zone d\'écriture, bandeau de réponse (dernier message d\'un autre membre)', z);
    await page.setInputFiles('#photoin', files.slice(0, 2)); await page.waitForTimeout(600); await page.click('#ps-send'); await page.waitForTimeout(4000);
    ok(await page.evaluate(() => Object.keys(window.__mock.db).filter(k => k.startsWith('groups/g1/photos/')).length === 2), 'groupe : 2 photos envoyées', 0);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close();
  }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

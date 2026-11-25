// Stickers (v11, panneau du bas façon TikTok) : créer (photo, vidéo), envoyer d'un appui, récents, groupe, 13-17 ans, recevoir/ajouter, gérer/supprimer
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const path = require('path');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
const MEDIA = path.join(__dirname, 'media');
function mk() { const sd = mkSeed(); const now = Date.now();
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['requests/k01_a01'] = { from: 'k01', to: 'a01', participants: ['k01', 'a01'], status: 'accepted', at: now - 1e6 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut !', at: now - 9e5 };
  sd.db['groups/g1'] = { name: 'Team du soir', desc: '', game: 'Free Fire', image: '', private: true, owner: 'a03', mods: [], members: ['a03', 'a01'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
  sd.db['groups/g2'] = { name: 'Avec les petits', desc: '', game: 'Roblox', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'k01'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
  return sd; }
const panel = page => page.evaluate(() => { const pn = document.getElementById('cpanel'); return pn && { open: !pn.hidden, tabs: [...pn.querySelectorAll('[data-cpt]')].filter(t => !t.hidden).map(t => t.dataset.cpt + (t.getAttribute('aria-pressed') === 'true' ? '*' : '')), txt: pn.innerText.replace(/\s+/g, ' ').trim(), tiles: pn.querySelectorAll('.cp-grid .cp-tile').length, neu: !!pn.querySelector('[data-stk-new]') }; });
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800, motion: true });
    const sd = mk(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500); await page.evaluate(() => setLite(false));
    await nav(page, 'messages/a03', 900);
    ok(await page.evaluate(() => !!document.getElementById('cpbtn') && document.getElementById('cpanel').hidden), 'bouton stickers/emojis dans la barre, panneau fermé', 0);
    await page.click('#cpbtn'); await page.waitForTimeout(500);
    let pn = await panel(page);
    ok(pn.open && pn.tabs.join(',') === 'stk*,emo' && /Enregistré/.test(pn.txt) && pn.neu && /Appuie sur \+/.test(pn.txt) && pn.tiles === 0, 'panneau ouvert : onglets Stickers/Emojis, « Enregistré » avec la case +', pn);
    ok(await page.evaluate(() => document.getElementById('cpbtn').getAttribute('aria-expanded') === 'true' && document.getElementById('cpbtn').classList.contains('on')), 'le bouton devient « Revenir au clavier »', 0);
    const o0 = await overflow(page); ok(!o0.bad.length && o0.scrollW <= o0.w + 1, 'rien ne déborde, panneau ouvert', o0);
    // --- photo
    await page.click('[data-stk-new]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => /image\/jpeg/.test(document.getElementById('stk-file').accept) && /video\/\*/.test(document.getElementById('stk-file').accept)), 'la case + ouvre la galerie : photos et vidéos', 0);
    await page.setInputFiles('#stk-file', path.join(MEDIA, 'photo.png')); await page.waitForTimeout(700);
    ok(await page.evaluate(() => !!document.getElementById('stk-cv')), 'photo choisie : l\'éditeur s\'ouvre directement', 0);
    await page.fill('#stk-txt', 'GG'); await page.click('[data-shape="rd"]');
    const cv = await page.$('#stk-cv'); const bb = await cv.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.mouse.move(bb.x + bb.width / 2 + 30, bb.y + bb.height / 2 + 10, { steps: 4 }); await page.mouse.up();
    await page.click('#stk-make'); await page.waitForTimeout(1500);
    let st = await page.evaluate(() => Object.entries(window.__mock.db).filter(([k]) => k.startsWith('stickers/')).map(([k, v]) => ({ k, owner: v.owner, n: v.n, shape: v.shape, len: v.data.length, type: v.data.slice(0, 16) })));
    ok(st.length === 1 && st[0].owner === 'a01' && st[0].n === 1 && st[0].shape === 'rd' && st[0].len < 300000 && /image\/webp/.test(st[0].type), 'sticker photo créé : fixe, forme arrondie, WebP, sous 300 Ko', st);
    const lim = await page.evaluate(() => window.__mock.db['limits/a01']); ok(lim && lim.stkCount === 1 && lim.stkDay === Math.floor(Date.now() / 864e5), 'compteur du jour : 1', lim);
    pn = await panel(page); ok(pn.open && pn.tiles === 1 && !(await page.evaluate(() => !!document.querySelector('dialog[open]'))), 'retour au panneau : le sticker est dans « Enregistré »', pn);
    // --- vidéo
    await page.click('[data-stk-new]'); await page.waitForTimeout(200);
    await page.setInputFiles('#stk-file', path.join(MEDIA, 'clip.webm')); await page.waitForTimeout(1500);
    const ed = await page.evaluate(() => ({ cv: !!document.getElementById('stk-cv'), start: !!document.getElementById('stk-start'), lens: [...document.querySelectorAll('[data-len]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) }));
    ok(ed.cv && ed.start && ed.lens.join(',') === '1 s,2 s,3 s*', 'vidéo choisie : début de l\'extrait et durée (3 s par défaut)', ed);
    await page.click('[data-len="2"]'); await page.fill('#stk-txt', 'Let\'s go');
    await page.click('#stk-make'); await page.waitForTimeout(6000);
    st = await page.evaluate(() => Object.entries(window.__mock.db).filter(([k]) => k.startsWith('stickers/')).map(([k, v]) => ({ k, n: v.n, shape: v.shape, len: v.data.length })));
    const anim = st.find(x => x.n > 1);
    ok(st.length === 2 && anim && anim.n === 16 && anim.len < 300000, `sticker vidéo créé : animé (16 images pour 2 s), ${anim ? Math.round(anim.len / 1024) : '?'} Ko`, st);
    pn = await panel(page); ok(pn.open && pn.tiles === 2, 'panneau : mes 2 stickers', pn);
    // --- « Retour » dans l'éditeur ramène au panneau
    await page.click('[data-stk-new]'); await page.waitForTimeout(200); await page.setInputFiles('#stk-file', path.join(MEDIA, 'photo.png')); await page.waitForTimeout(600);
    await page.click('[data-stk-back]'); await page.waitForTimeout(400);
    pn = await panel(page); ok(pn.open && pn.tiles === 2 && !(await page.evaluate(() => !!document.querySelector('dialog[open]'))), '« Retour » : on revient au panneau, rien de créé', pn);
    // --- envoyer d'un appui : le panneau reste ouvert
    const animId = anim.k.split('/')[1];
    await page.click(`.cp-grid [data-stk-send="${animId}"]`); await page.waitForTimeout(900);
    const msg = await page.evaluate(() => Object.entries(window.__mock.db).filter(([k, v]) => k.startsWith('chats/a01_a03/messages/') && v.sticker).map(([k, v]) => v));
    ok(msg.length === 1 && msg[0].sticker.id === animId && msg[0].sticker.n === 16 && msg[0].text === '✨ Sticker', 'un appui envoie le sticker', msg);
    ok((await panel(page)).open, 'le panneau reste ouvert après l\'envoi', 0);
    await page.waitForTimeout(600);
    const bub = await page.evaluate(() => { const el = [...document.querySelectorAll('#chatbox .stk-msg')].pop(); const cs = el && getComputedStyle(el); return el && { ok: el.dataset.ok, anim: el.classList.contains('anim'), bg: cs.backgroundImage.slice(0, 22), an: cs.animationName }; });
    ok(bub && bub.ok === '1' && bub.anim && /url\("data:image\/webp/.test(bub.bg) && bub.an === 'stkPlay', 'il s\'affiche dans la conversation, sans bulle, et s\'anime', bub);
    // deux appuis rapides : les deux partent (à plus d'une seconde d'écart)
    const otherId = st.find(x => x.n === 1).k.split('/')[1];
    await page.click(`.cp-grid [data-stk-send="${otherId}"]`); await page.click(`.cp-grid [data-stk-send="${animId}"]`); await page.waitForTimeout(3200);
    const two = await page.evaluate(() => Object.values(window.__mock.db).filter(v => v && v.sticker && v.from === 'a01' && v.text === '✨ Sticker').map(v => v.at).sort());
    ok(two.length === 3 && two[2] - two[1] >= 1100, `deux appuis rapides : les deux partent, espacés de ${two.length === 3 ? two[2] - two[1] : '?'} ms`, two);
    // récents : au prochain affichage du panneau
    await page.click('[data-cpt="emo"]'); await page.click('[data-cpt="stk"]'); await page.waitForTimeout(500);
    pn = await panel(page); ok(/Récemment utilisés/.test(pn.txt), '« Récemment utilisés » apparaît', pn);
    // fermer : le bouton clavier ; Échap sur ordinateur
    await page.click('#cpbtn'); await page.waitForTimeout(300);
    ok(!(await panel(page)).open, 'le bouton clavier ferme le panneau', 0);
    // --- groupe
    await nav(page, 'groupe/g1', 900); await page.click('#cpbtn'); await page.waitForTimeout(600);
    pn = await panel(page); ok(pn.open && pn.tabs[0] === 'stk*', 'groupe entre adultes : onglet Stickers', pn);
    await page.click(`.cp-grid [data-stk-send="${animId}"]`); await page.waitForTimeout(1500);
    ok(await page.evaluate(() => Object.keys(window.__mock.db).some(k => k.startsWith('groups/g1/messages/') && window.__mock.db[k].sticker)), 'envoyé dans le groupe', 0);
    await nav(page, 'groupe/g2', 1400); await page.click('#cpbtn'); await page.waitForTimeout(500);
    pn = await panel(page); ok(pn.open && pn.tabs.length === 0 && /Emojis/.test(pn.txt) && !/Enregistré/.test(pn.txt), 'groupe avec un 13-17 ans : emojis seulement, pas de stickers', pn);
    await nav(page, 'messages/k01', 900); await page.click('#cpbtn'); await page.waitForTimeout(500);
    pn = await panel(page); ok(pn.open && pn.tabs.length === 0 && !/Enregistré/.test(pn.txt), 'conversation avec un 13-17 ans : emojis seulement', pn);
    // --- gérer → supprimer un sticker : il disparaît des conversations
    await nav(page, 'messages/a03', 900); await page.click('#cpbtn'); await page.waitForTimeout(600); await page.click('[data-cp-manage]'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => !document.querySelector('#cpanel [data-stk-new]') && document.querySelectorAll('#cpanel [data-stk-del]').length === 2), 'Gérer : une croix sur chacun de mes stickers', 0);
    await page.click(`[data-stk-del="${animId}"]`); await page.waitForTimeout(250); await page.click('#stk-del-ok'); await page.waitForTimeout(900);
    ok(await page.evaluate(id => !window.__mock.db['stickers/' + id], animId), 'Gérer → supprimer : le sticker est effacé', 0);
    await nav(page, 'accueil', 300); await nav(page, 'messages/a03', 900);
    ok(await page.evaluate(() => /Sticker supprimé/.test(document.getElementById('chatbox').innerText)), 'dans la conversation : « Sticker supprimé »', 0);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close();
  }
  // --- le mate reçoit, ajoute à ses stickers ; un 13-17 ans ne voit pas les stickers
  console.log('— réception (360)');
  { const { browser, page, log } = await launch({ width: 360, height: 740, mobile: true, touch: true });
    const sd = mk(); const now = Date.now(); const PNG = 'data:image/webp;base64,' + 'A'.repeat(200);
    sd.db['stickers/StkTest0001abc'] = { owner: 'a03', data: PNG, n: 1, shape: 'ci', at: now - 5e5 };
    sd.db['chats/a01_a03/messages/m2'] = { from: 'a03', text: '✨ Sticker', at: now - 4e5, sticker: { id: 'StkTest0001abc', n: 1 } };
    sd.db['chats/a01_k01/messages/z1'] = { from: 'k01', text: 'Salut', at: now - 4e5 };
    await seed(page, sd.db, sd.users); await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    await nav(page, 'messages/a03', 1000);
    await page.click('#chatbox .stk-msg'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => /Ajouter à mes stickers/.test(document.querySelector('dialog[open]').innerText)), 'sticker reçu : « Ajouter à mes stickers »', 0);
    await page.click('#stk-fav'); await page.waitForTimeout(300);
    await page.click('#cpbtn'); await page.waitForTimeout(700);
    ok(await page.evaluate(() => !!document.querySelector('#cpanel .cp-grid [data-stk-send="StkTest0001abc"]')), 'il apparaît dans « Enregistré »', 0);
    await page.click('[data-cp-manage]'); await page.waitForTimeout(300); await page.click('[data-stk-unfav="StkTest0001abc"]'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !document.querySelector('#cpanel [data-stk-send="StkTest0001abc"]') && !!window.__mock.db['stickers/StkTest0001abc']), 'Gérer → retirer : il quitte mes stickers (pas effacé pour son auteur)', 0);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close(); }
  console.log('— 13-17 ans');
  { const { browser, page, log } = await launch({ width: 360, height: 740, mobile: true, touch: true });
    const sd = mk(); const now = Date.now(); sd.db['groups/g2/messages/s1'] = { from: 'a01', text: '✨ Sticker', at: now - 3e5, sticker: { id: 'StkTest0001abc', n: 1 } };
    await seed(page, sd.db, sd.users); await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('k01@test.ci')); await page.waitForTimeout(1500);
    await nav(page, 'groupe/g2', 1200);
    const r = await page.evaluate(() => ({ cam: !!document.getElementById('cambtn'), gal: !!document.getElementById('photobtn'), txt: document.getElementById('chatbox').innerText }));
    await page.click('#cpbtn'); await page.waitForTimeout(500); const pn = await panel(page);
    ok(!r.cam && !r.gal && pn.open && pn.tabs.length === 0 && !/Enregistré/.test(pn.txt) && /Sticker réservé aux adultes/.test(r.txt), 'pas de photos ni de stickers (emojis seulement), et « Sticker réservé aux adultes » à la place', { r, pn });
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close(); }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

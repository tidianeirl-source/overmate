// Entrer dans une conversation en glissant et revenir avec le doigt (téléphone)
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const out = []; const ok = (name, cond, extra) => out.push((cond ? 'OK   ' : 'ÉCHEC') + ' ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : ''));
const SHOT = process.env.SHOT;
async function setup(o, skin = 'defaut') {
  const { browser, page, log, context } = await launch(o);
  const sd = mkSeed(); const now = Date.now();
  for (let i = 2; i <= 16; i++) { const id = 'a' + String(i).padStart(2, '0'); sd.db[`requests/a01_${id}`] = { from: 'a01', to: id, participants: ['a01', id], status: 'accepted', at: now - 1e6 }; sd.db[`chats/a01_${id}/messages/m1`] = { from: id, text: 'Salut, on joue ce soir ? ' + i, at: now - 9e5 + i * 1000 }; }
  for (let k = 0; k < 30; k++) sd.db[`chats/a01_a03/messages/n${k}`] = { from: k % 2 ? 'a01' : 'a03', text: 'Message numéro ' + k + ' pour remplir la conversation', at: now - 8e5 + k * 1000 };
  sd.db['groups/g1'] = { name: 'Squad du soir', owner: 'a01', members: ['a01', 'a02', 'a04'], admins: ['a01'], game: 'Free Fire', private: false, at: now - 1e6, last: now - 1e5 };
  await seed(page, sd.db, sd.users);
  await open(page, 'accueil', 900);
  await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
  await page.evaluate(s => { applySkin(s); route(); }, skin); await page.waitForTimeout(400);
  return { browser, page, log, context };
}
const st = page => page.evaluate(() => { const c = document.querySelector('.chat-page'), u = document.getElementById('nav-under'); return { hash: location.hash, chat: !!c, x: c ? Math.round(new DOMMatrixReadOnly(getComputedStyle(c).transform === 'none' ? 'matrix(1,0,0,1,0,0)' : getComputedStyle(c).transform).m41) : null, under: !!u, underVis: u ? getComputedStyle(u).visibility : null, underList: !!(u && u.querySelector('.dm-list-page,.g-home,.home,.dm-shell')), y: Math.round(scrollY), busy: navBusy() }; });
async function swipe(page, cdp, x0, x1, y, steps = 14, pause = 16, hold = false) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
  for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / steps, y }] }); await page.waitForTimeout(pause); }
  if (hold) return;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
(async () => {
  for (const skin of (process.env.SKINS || 'defaut,sombre').split(',')) {
    const { browser, page, log, context } = await setup({ width: 360, height: 740, mobile: true, touch: true, motion: true, dsf: SHOT ? 2 : 1 }, skin);
    const cdp = await context.newCDPSession(page);
    await nav(page, 'messages', 900);
    await page.evaluate(() => scrollTo(0, 150)); await page.waitForTimeout(300);
    const y0 = await page.evaluate(() => Math.round(scrollY));
    // toucher une conversation : elle arrive par la droite
    const row = await page.evaluate(() => { const r = [...document.querySelectorAll('a.sn-row')].find(a => { const b = a.getBoundingClientRect(); return b.top > 120 && b.bottom < 560; }); const b = r.getBoundingClientRect(); return { x: b.left + 120, y: b.top + b.height / 2, href: r.getAttribute('href') }; });
    await page.touchscreen.tap(row.x, row.y);
    await page.waitForTimeout(90);
    const mid = await st(page);
    if (SHOT) await page.screenshot({ path: `shots-aff/nav-${skin}-1-arrive.png` });
    await page.waitForTimeout(500);
    const inn = await st(page);
    ok(`${skin} · toucher une conversation : elle arrive par la droite, la liste reste dessous`, mid.chat && mid.x > 10 && mid.x < 360 && mid.under && mid.underVis === 'visible' && mid.underList && inn.x === 0 && inn.underVis === 'hidden' && inn.hash === row.href, { mid, inn, row });
    // grand glissement : retour à la liste, au même endroit
    await swipe(page, cdp, 40, 300, 420, 16, 20); await page.waitForTimeout(700);
    const ret = await st(page);
    ok(`${skin} · grand glissement : retour à la liste, au même défilement, plus rien dessous`, ret.hash === '#/messages' && !ret.chat && !ret.under && Math.abs(ret.y - y0) <= 2 && !ret.busy, { ret, y0 });
    // la conversation avec beaucoup de messages
    await page.evaluate(() => { location.hash = '#/messages/a03'; }); await page.waitForTimeout(800);
    // défiler la conversation vers le haut ou le bas : pas de retour
    const sb = await page.evaluate(() => { const b = document.getElementById('chatbox'); b.scrollTop = b.scrollHeight; return Math.round(b.scrollTop); });
    await swipe(page, cdp, 200, 200 + 6, 300, 10, 16, false);   // presque vertical : rien
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 260 }] });
    for (let k = 1; k <= 10; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200 + k, y: 260 + k * 22 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(700);
    const sc = await page.evaluate(() => Math.round(document.getElementById('chatbox').scrollTop)); const v1 = await st(page);
    ok(`${skin} · glisser vers le bas : la conversation défile, on reste`, sc < sb && v1.hash === '#/messages/a03' && v1.x === 0, { avant: sb, après: sc, v1 });
    // petit glissement lent vers la droite : la conversation suit le doigt puis reprend sa place
    await swipe(page, cdp, 80, 170, 400, 12, 30, true); await page.waitForTimeout(60);
    const during = await st(page);
    if (SHOT) await page.screenshot({ path: `shots-aff/nav-${skin}-2-doigt.png` });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(500);
    const back0 = await st(page);
    ok(`${skin} · petit glissement : la conversation suit le doigt (≈ 90 px), la liste se voit dessous, puis elle reprend sa place`, during.x >= 70 && during.x <= 95 && during.underVis === 'visible' && back0.x === 0 && back0.hash === '#/messages/a03' && back0.underVis === 'hidden', { during, back0 });
    // grand glissement depuis a03 : retour à la liste
    await swipe(page, cdp, 40, 300, 420, 16, 20); await page.waitForTimeout(700);
    const ret2 = await st(page);
    ok(`${skin} · grand glissement (2e fois) : retour à la liste`, ret2.hash === '#/messages' && !ret2.under, ret2);
    // geste rapide et court : retour aussi
    await page.evaluate(() => { location.hash = '#/messages/a05'; }); await page.waitForTimeout(700);
    await swipe(page, cdp, 60, 150, 420, 4, 8); await page.waitForTimeout(700);
    const fl = await st(page);
    ok(`${skin} · geste rapide (90 px) : retour aussi`, fl.hash === '#/messages' && !fl.under, fl);
    // le bouton ‹ : même sortie animée
    await page.evaluate(() => { location.hash = '#/messages/a04'; }); await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('.chat-page .chat-head .back').click()); await page.waitForTimeout(150);
    const bt = await st(page); await page.waitForTimeout(600); const bt2 = await st(page);
    ok(`${skin} · bouton ‹ : la conversation sort par la droite, puis la liste`, bt.chat && bt.x > 20 && bt.underVis === 'visible' && bt2.hash === '#/messages' && !bt2.under, { bt, bt2 });
    // la rattraper en plein vol : toucher pendant qu'elle arrive
    await page.evaluate(() => document.querySelector('a.sn-row[href="#/messages/a06"]').click()); await page.waitForTimeout(60);
    await swipe(page, cdp, 200, 230, 420, 3, 16, true); await page.waitForTimeout(40);
    const caught = await st(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(600);
    const after = await st(page);
    ok(`${skin} · rattrapée en plein vol : elle reste sous le doigt, puis se pose`, caught.x > 30 && after.hash === '#/messages/a06' && after.x === 0 || after.hash === '#/messages', { caught, after });
    // v20 — groupe : depuis la liste des messages (les groupes y sont maintenant), le bouton ‹ Messages fait la sortie animée
    await nav(page, 'messages', 800);
    const gm = await page.evaluate(() => { const r = document.querySelector('a.sn-row.grp[href="#/groupe/g1"]'); return r ? (r.click(), true) : false; }); await page.waitForTimeout(90);
    const gm1 = await st(page); await page.waitForTimeout(500);
    const gback = await page.evaluate(() => { const b = document.querySelector('.chat-page .chat-head .back'); return b && b.getAttribute('href'); });
    await page.evaluate(() => document.querySelector('.chat-page .chat-head .back').click()); await page.waitForTimeout(150);
    const gm2 = await st(page); await page.waitForTimeout(600); const gm3 = await st(page);
    ok(`${skin} · groupe depuis Messages : arrive par la droite (liste dessous), le bouton ‹ Messages la fait sortir vers la liste`, gm && gm1.chat && gm1.x > 10 && gm1.underList && gback === '#/messages' && gm2.chat && gm2.x > 20 && gm3.hash === '#/messages' && !gm3.under, { gm1, gback, gm2, gm3 });
    // groupe : depuis la page des groupes
    await nav(page, 'groupe', 800);
    const g = await page.evaluate(() => { const r = document.querySelector('a[href^="#/groupe/g1"]'); return r ? (r.click(), true) : false; }); await page.waitForTimeout(600);
    const g1 = await st(page);
    await swipe(page, cdp, 40, 300, 420, 16, 20); await page.waitForTimeout(700);
    const g2 = await st(page);
    ok(`${skin} · groupe : arrive par la droite, retour en glissant vers la page des groupes`, g && g1.hash === '#/groupe/g1' && g1.chat && g2.hash === '#/groupe' && !g2.under, { g1, g2 });
    // conversation ouverte directement (sans page d'avant) : retour vers la liste
    await page.evaluate(() => { NAVX.prev = ''; location.hash = '#/messages/a07'; }); await page.waitForTimeout(700);
    const dir = await st(page);
    await swipe(page, cdp, 40, 300, 420, 16, 20); await page.waitForTimeout(800);
    const dir2 = await st(page);
    ok(`${skin} · conversation ouverte directement : rien dessous au départ, le geste mène à la liste`, dir.chat && !dir.under && dir2.hash === '#/messages' && !dir2.under, { dir, dir2 });
    // depuis l'accueil (« Écrire » d'un mate) : la vraie page d'accueil revient, sur la même affiche
    await nav(page, 'accueil', 900);
    await page.evaluate(() => affGo(2)); await page.waitForTimeout(800);
    await page.evaluate(() => { location.hash = '#/messages/a03'; }); await page.waitForTimeout(700);
    const h1 = await st(page);
    await swipe(page, cdp, 40, 300, 420, 16, 20); await page.waitForTimeout(800);
    const h2 = await page.evaluate(() => ({ hash: location.hash, i: AFF.i, sl: Math.round(document.getElementById('aff-track').scrollLeft), step: affStep(document.getElementById('aff-track')), under: !!document.getElementById('nav-under') }));
    ok(`${skin} · depuis l'accueil : retour sur l'accueil, même affiche`, h1.underList && h2.hash === '#/accueil' && h2.i === 2 && Math.abs(h2.sl - 2 * h2.step) <= 2 && !h2.under, { h1, h2 });
    // pas de débordement, pas d'erreur
    const of = await overflow(page); if (of.bad.length || of.scrollW > of.w) ok(`${skin} · débordement`, false, of);
    ok(`${skin} · erreurs JS`, !log.errors.length, log.errors);
    await browser.close();
  }
  // moins d'animations : pas d'animation, mais le geste marche
  {
    const { browser, page, log, context } = await setup({ width: 360, height: 740, mobile: true, touch: true });
    const cdp = await context.newCDPSession(page);
    await nav(page, 'messages', 800);
    await page.evaluate(() => document.querySelector('a.sn-row[href="#/messages/a03"]').click()); await page.waitForTimeout(40);
    const r1 = await st(page);
    await swipe(page, cdp, 40, 300, 420, 16, 20); await page.waitForTimeout(500);
    const r2 = await st(page);
    ok('moins d\'animations : la conversation s\'affiche tout de suite, le geste ramène à la liste', r1.x === 0 && r1.under && r1.underVis === 'hidden' && r2.hash === '#/messages' && !r2.under, { r1, r2 });
    ok('erreurs JS (moins d\'animations)', !log.errors.length, log.errors);
    await browser.close();
  }
  // ordinateur : rien ne change
  {
    const { browser, page, log } = await setup({ width: 1280, height: 800, motion: true });
    await nav(page, 'messages', 800);
    await page.evaluate(() => { location.hash = '#/messages/a03'; }); await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({ under: !!document.getElementById('nav-under'), ta: getComputedStyle(document.querySelector('.chat-page')).touchAction, side: !!document.querySelector('.dm-side') && getComputedStyle(document.querySelector('.dm-side')).display !== 'none' }));
    ok('ordinateur : la liste reste à gauche, pas de calque dessous', !r.under && r.side, r);
    ok('erreurs JS (ordinateur)', !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n'));
})();

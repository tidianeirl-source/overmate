// Thème Océan (mare aux carpes) : le canevas tourne, les carpes suivent le doigt sur l'eau, tout s'arrête ailleurs
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x))); if (!c) fails++; };
const state = page => page.evaluate(() => { const c = document.getElementById('koi'), cs = getComputedStyle(c), top = document.getElementById('world-top');
  let ink = 0; try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 40) ink++; } catch (e) { ink = -1; }
  return { skin: S.skin, running: POND.running, kind: POND.kind, still: POND.kind === 'still', band: c.classList.contains('band'), level: POND.level, top: Math.round(c.getBoundingClientRect().top), h: Math.round(c.getBoundingClientRect().height), n: POND.fish.length, on: c.classList.contains('on'), display: cs.display, pos: cs.position, opacity: +cs.opacity, cw: c.width, chh: c.height, ink,
    pads: document.querySelectorAll('#w-art-top .pd-bob').length, topDisplay: getComputedStyle(top).display, water: !!document.querySelector('#w-art svg #pw'), par: document.documentElement.classList.contains('world-par'),
    fish: POND.fish.map(f => [f.x, f.y]) }; });
const meanDist = (fish, x, y) => fish.reduce((s, f) => s + Math.hypot(f[0] - x, f[1] - y), 0) / (fish.length || 1);
const moveOn = (page, sel, x, y, type = 'pointermove') => page.evaluate(([sel, x, y, type]) => { const el = sel ? document.querySelector(sel) : document.elementFromPoint(x, y); if (!el) return 'absent'; el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true })); return el.tagName + '.' + String(el.className).slice(0, 30); }, [sel, x, y, type]);

async function boot(W, H, motion = true) {
  const b = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800, motion });
  const sd = mkSeed(); const now = Date.now(); sd.db['purchases/a01'] = { pack: true };
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut !', at: now - 9e5 };
  await seed(b.page, sd.db, sd.users);
  await open(b.page, '', 600); await b.page.evaluate(() => window.__mock.signIn('a01@test.ci')); await b.page.waitForTimeout(1300);
  await b.page.evaluate(() => setLite(false)); await b.page.waitForTimeout(150);
  return b;
}
(async () => {
  console.log('— Téléphone 360 × 740, animations actives');
  { const { browser, page, log } = await boot(360, 740);
    let s = await state(page); ok(s.display === 'none' && !s.running && s.n === 0 && s.topDisplay === 'none', 'thème Coopô : pas de carpes, canevas caché', s);
    await page.evaluate(() => { applySkin('ocean'); route(); }); await page.waitForTimeout(900);
    s = await state(page);
    ok(s.skin === 'ocean' && s.running && s.kind === 'live' && s.n === 5, 'thème Océan : 5 carpes qui nagent', s);
    ok(s.display === 'block' && s.on && s.pos === 'fixed' && s.opacity > .9, 'canevas visible, fixe, plein écran', s);
    ok(s.cw === Math.round(360 * 1) && s.chh === 740, 'taille du canevas = écran', [s.cw, s.chh]);
    ok(s.ink > 20, 'des carpes sont bien dessinées', s.ink);
    ok(s.pads === 7 && s.water && s.topDisplay === 'block', 'eau + 7 nénuphars au-dessus', s);
    ok(s.fish.every(f => f[0] > -40 && f[0] < 400 && f[1] > -40 && f[1] < 780), 'elles sont déjà dans l\'écran', s.fish);
    // le doigt sur l'eau : elles viennent
    const cx = s.fish.reduce((a, f) => a + f[0], 0) / s.fish.length, cy = s.fish.reduce((a, f) => a + f[1], 0) / s.fish.length;
    const [tx, ty] = Math.hypot(cx - 60, cy - 110) > Math.hypot(cx - 300, cy - 95) ? [60, 110] : [300, 95]; const before = meanDist(s.fish, tx, ty);   // le point d'eau le plus loin d'elles (v17 : sous le bonjour, les affiches de l'accueil sont des cartes, pas de l'eau)
    const tgt = await moveOn(page, null, tx, ty, 'pointerdown');
    for (let i = 0; i < 16; i++) { await moveOn(page, null, tx, ty); await page.waitForTimeout(250); }
    s = await state(page); const after = meanDist(s.fish, tx, ty);
    ok(after < before * .75 && after < 130 && s.fish.every(f => Math.hypot(f[0] - tx, f[1] - ty) < 190), `doigt sur l'eau (${tgt}) : les carpes s'approchent (${before | 0} → ${after | 0} px)`, { before, after });
    // le doigt sur une carte : rien
    const at0 = await page.evaluate(() => POND.ptr.at);
    const card = await page.evaluate(() => { const el = document.querySelector('.home-grid .card, .card, .btn'); if (!el) return null; const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 20, clientY: r.top + 10, bubbles: true })); return el.tagName + '.' + String(el.className).slice(0, 30); });
    ok(card && (await page.evaluate(() => POND.ptr.at)) === at0, `doigt sur une carte (${card}) : les carpes ne bougent pas pour ça`, card);
    // on descend dans la page : pause
    await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(1000);
    s = await state(page); ok(!s.running && !s.on, 'page descendue : les carpes s\'arrêtent (batterie)', s);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
    s = await state(page); ok(s.running && s.on && s.n === 5, 'retour en haut : elles reprennent', s);
    // conversation plein écran : pause
    await nav(page, 'messages/a03', 900); s = await state(page); ok(!s.running, 'conversation ouverte : en pause', s);
    await nav(page, 'accueil', 600); s = await state(page); ok(s.running, 'retour à l\'accueil : elles reprennent', s);
    // onglet caché
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(800);
    s = await state(page); ok(!s.running, 'onglet caché : en pause', s);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await page.waitForTimeout(300);
    s = await state(page); ok(s.running, 'onglet de retour : elles reprennent', s);
    // mode léger : version allégée (3 carpes, dans la bande du haut de page)
    await page.evaluate(() => setLite(true)); await page.waitForTimeout(500);
    s = await state(page); const bandH = await page.evaluate(() => document.querySelector('#world > .w-cam').offsetHeight);
    ok(s.running && s.kind === 'eco' && s.n === 3 && s.band && s.pos === 'absolute' && s.on && s.ink > 10 && !s.par, 'mode léger : 3 carpes qui nagent, dans la bande du haut de page', s);
    ok(s.h === bandH && s.chh === Math.round(bandH * 1) && s.top === 0, `mode léger : le canevas fait la hauteur de la bande (${bandH} px)`, [s.h, s.chh, s.top, bandH]);
    ok(s.fish.every(f => f[1] < bandH * .75), 'mode léger : elles restent dans le haut de la bande', s.fish);
    { const tx = 140, ty = 90; const b0 = meanDist(s.fish, tx, ty); await moveOn(page, null, tx, ty, 'pointerdown'); for (let i = 0; i < 12; i++) { await moveOn(page, null, tx, ty); await page.waitForTimeout(250); }
      s = await state(page); const a0 = meanDist(s.fish, tx, ty); ok(a0 < 150 && a0 <= b0, `mode léger : elles viennent aussi vers le doigt (${b0 | 0} → ${a0 | 0} px)`, { b0, a0 }); }
    await page.evaluate(() => window.scrollTo(0, 60)); await page.waitForTimeout(300);
    { const before = await page.evaluate(() => POND.ptr.at); await moveOn(page, null, 150, 40); const p = await page.evaluate(() => [POND.ptr.at, POND.ptr.x, POND.ptr.y]);
      ok(p[0] !== before && p[1] === 150 && p[2] === 100, 'mode léger, page un peu descendue : le doigt est bien repéré dans la bande (40 + 60 = 100)', p); }
    s = await state(page); ok(s.top === -60, 'mode léger : le canevas défile avec la page', s.top);
    await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(1000);
    s = await state(page); ok(!s.running, 'mode léger, page descendue : en pause', s);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
    s = await state(page); ok(s.running && s.kind === 'eco' && s.n === 3, 'mode léger, retour en haut : elles reprennent', s);
    await page.evaluate(() => setLite(false)); await page.waitForTimeout(500);
    s = await state(page); ok(s.running && s.kind === 'live' && s.n === 5 && s.pos === 'fixed' && !s.band && s.chh === 740, 'animations rétablies : 5 carpes, plein écran', s);
    // autre thème : tout s'arrête
    await page.evaluate(() => { applySkin('soft'); route(); }); await page.waitForTimeout(500);
    s = await state(page); ok(s.skin === 'soft' && !s.running && s.kind === '' && s.n === 0 && s.display === 'none' && s.pads === 0 && s.topDisplay === 'none' && s.ink === 0, 'autre thème : canevas vidé et caché, nénuphars retirés', s);
    // aperçu depuis un autre thème, puis fin de l'aperçu
    await page.evaluate(() => previewSkin('ocean')); await page.waitForTimeout(1200);
    s = await state(page); ok(s.skin === 'ocean' && s.running, 'aperçu du thème : les carpes nagent', s);
    await page.evaluate(() => endPreview()); await page.waitForTimeout(1200);
    s = await state(page); ok(s.skin === 'soft' && !s.running && s.n === 0, 'fin de l\'aperçu : elles s\'arrêtent', s);
    const o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'pas de débordement', o);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close(); }

  console.log('— Ordinateur 1280 × 800');
  { const { browser, page, log } = await boot(1280, 800);
    await page.evaluate(() => { applySkin('ocean'); route(); }); await page.waitForTimeout(900);
    let s = await state(page); ok(s.running && s.n === 7 && s.cw === 1280 && s.chh === 800, '7 carpes, canevas 1280 × 800', s);
    await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(1000);
    s = await state(page); ok(s.running && s.on, 'page descendue : elles continuent (on voit l\'eau entre les cartes)', s);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 700, height: 800 }); await page.waitForTimeout(600);
    s = await state(page); ok(s.running && s.cw === 700, 'fenêtre rétrécie : le canevas suit', [s.cw, s.chh, s.n]);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close(); }

  console.log('— « Réduire les animations » demandé par l\'appareil');
  { const { browser, page, log } = await boot(360, 740, false);
    await page.evaluate(() => { applySkin('ocean'); route(); }); await page.waitForTimeout(700);
    let s = await state(page); ok(!s.running && s.still && s.n === 2 && s.pos === 'absolute' && s.band && s.ink > 20, 'image fixe : 2 carpes immobiles en haut de page, aucune boucle', s);
    const f1 = JSON.stringify(s.fish); await moveOn(page, null, 140, 90, 'pointerdown'); await page.waitForTimeout(600); s = await state(page); ok(JSON.stringify(s.fish) === f1 && !s.running, 'rien ne bouge, même si on touche l\'eau', 0);
    await nav(page, 'matchs', 500); s = await state(page); ok(s.still && s.ink > 20 && !s.running, 'autre page : l\'image reste', s);
    await page.evaluate(() => { applySkin('lofi'); route(); }); await page.waitForTimeout(400); s = await state(page); ok(s.kind === '' && s.display === 'none' && s.ink === 0, 'autre thème : image retirée', s);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close(); }

  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

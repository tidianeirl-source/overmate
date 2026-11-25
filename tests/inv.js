// Inventaire : boutons d'accès, contenu, équiper, et ancien lien « Mes objets »
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x))); if (!c) fails++; };
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
    const sd = mkSeed(); sd.db['purchases/a01'] = { themes: ['soft'], plates: ['rubis', 'aurore'] };
    await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    const vis = () => page.evaluate(() => [...document.querySelectorAll('.inv-btn, .skin-btn:not(.inv-btn)')].filter(b => { const r = b.getBoundingClientRect(), c = getComputedStyle(b); return r.width > 0 && c.display !== 'none' && c.visibility !== 'hidden'; }).map(b => b.classList.contains('inv-btn') ? 'inventaire' : 'boutique'));
    for (const pg of ['accueil', 'profil', 'boutique', 'inventaire']) { await nav(page, pg, 500); console.log('   boutons visibles sur', pg, ':', JSON.stringify(await vis())); if (pg !== 'accueil') await page.screenshot({ path: `shots/inv-${W}-${pg}.png` }); }
    await nav(page, 'inventaire', 600);
    const inv = await page.evaluate(() => ({ h2: (document.querySelector('.page-head h2') || {}).textContent, cards: [...document.querySelectorAll('.shop-card b')].map(b => b.textContent), tab: (document.querySelector('.tabbar [aria-current="page"], .navpill [aria-current="page"], .sr-nav [aria-current="page"]') || {}).textContent }));
    ok(inv.h2 === 'Inventaire', 'la page Inventaire s\'ouvre', inv);
    ok(inv.cards.includes('Soft') && inv.cards.includes('Sunset') && inv.cards.includes('Rubis') && !inv.cards.includes('Samouraï'), 'elle montre ce que je possède (Soft, Rubis, Sunset) et rien d\'autre', inv.cards);
    // équiper la plaque Sunset
    await page.evaluate(() => { const b = [...document.querySelectorAll('[data-use-plate="aurore"]')][0]; b && b.click(); }); await page.waitForTimeout(600);
    const plate = await page.evaluate(() => ({ p: plateOf(S.me), h: location.hash, txt: document.querySelector('.inv-now') && document.querySelector('.inv-now').innerText }));
    ok(plate.p === 'aurore' && plate.h === '#/inventaire' && /Sunset/.test(plate.txt), 'Équiper Sunset : appliqué, on reste dans l\'inventaire', plate);
    await page.evaluate(() => { const b = document.querySelector('[data-use-skin="soft"]'); b && b.click(); }); await page.waitForTimeout(1200);
    ok(await page.evaluate(() => S.skin === 'soft' && location.hash === '#/inventaire'), 'Utiliser le thème Soft : appliqué, on reste dans l\'inventaire', await page.evaluate(() => [S.skin, location.hash]));
    await nav(page, 'boutique/objets', 600); ok(await page.evaluate(() => location.hash === '#/inventaire'), 'l\'ancien lien « Mes objets » mène à l\'inventaire', 0);
    await nav(page, 'boutique', 500); const tabs = await page.evaluate(() => [...document.querySelectorAll('.shop .board-tabs .chip')].map(c => c.textContent));
    ok(tabs.includes('Inventaire') && !tabs.includes('Mes objets'), 'boutique : lien « Inventaire »', tabs);
    const o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'pas de débordement', o);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close();
  }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

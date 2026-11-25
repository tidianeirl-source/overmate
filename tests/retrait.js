// Menthe et Prunier retirés, Océan renommé Lotus à 3 000 F
const { launch, seed, open, nav, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x))); if (!c) fails++; };
(async () => {
  for (const old of ['menthe', 'prunier']) {
    const { browser, page, log } = await launch({ width: 360, height: 740, mobile: true, touch: true });
    const sd = mkSeed(); sd.db['profiles/a01'].skin = old; sd.db['purchases/a01'] = { pack: true };
    await seed(page, sd.db, sd.users);
    await page.evaluate(o => { const s = { auth: { uid: 'a01' }, skin: o, skinOk: o }; localStorage.setItem('matematch.v1', JSON.stringify(s)); }, old);
    await open(page, '', 300);
    const early = await page.evaluate(() => document.documentElement.dataset.skin || null);
    await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(3500);
    const r = await page.evaluate(() => ({ skin: S.skin, dlg: (document.querySelector('dialog[open]') || {}).innerText || '', db: JSON.parse(localStorage.getItem('__mockdb'))['profiles/a01'].skin }));
    ok(early !== old, `${old} : pas appliqué au tout premier affichage`, early);
    ok(r.skin === 'defaut', `${old} : le compte repasse au thème Coopô`, r.skin);
    ok(r.dlg.includes('Le thème ' + (old === 'menthe' ? 'Menthe' : 'Prunier') + ' a été retiré'), `${old} : le message dit quel thème est retiré`, r.dlg.slice(0, 120));
    ok(!log.errors.length, 'aucune erreur', log.errors); await browser.close();
  }
  const { browser, page, log } = await launch({ width: 1280, height: 800 });
  const sd = mkSeed(); await seed(page, sd.db, sd.users);
  await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a03@test.ci')); await page.waitForTimeout(1500);
  await nav(page, 'boutique', 800);
  const shop = await page.evaluate(() => [...document.querySelectorAll('.shop-card')].map(c => c.innerText.replace(/\s+/g, ' ').slice(0, 90)));
  console.log(shop.join('\n'));
  ok(!shop.some(t => /Menthe|Prunier/.test(t)), 'boutique : plus de Menthe ni de Prunier', 0);
  const lotus = shop.find(t => /^Lotus|Lotus/.test(t)) || '';
  ok(/Lotus/.test(lotus) && /3[\s ]?000/.test(lotus), 'boutique : Lotus à 3 000 F', lotus);
  ok(!shop.some(t => /Océan/.test(t)), 'boutique : plus le nom Océan', 0);
  await page.screenshot({ path: 'shots/boutique-lotus.png' });
  ok(!log.errors.length, 'aucune erreur', log.errors); await browser.close();
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

// Fumée : la page se charge avec les fichiers de js/, sans erreur, et l'appli démarre
const { launch, seed, open, nav, mkSeed } = require('./lib');
(async () => {
  const { browser, page, log } = await launch({ width: 360, height: 740, mobile: true, touch: true });
  const loaded = []; page.on('response', r => { if (/\/js\//.test(r.url())) loaded.push(r.url().split('/js/')[1] + ' ' + r.status()); });
  const sd = mkSeed(); await seed(page, sd.db, sd.users); await open(page, '', 800);
  const a = await page.evaluate(() => ({ route: typeof route, DB: typeof DB, hash: location.hash, app: document.getElementById('app').children.length, splash: document.documentElement.classList.contains('splash-on') }));
  await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
  await page.evaluate(() => { const d = document.getElementById('dlg'); if (d.open) d.close(); });
  for (const h of ['accueil', 'matchs', 'messages', 'groupe', 'profil', 'groupes']) await nav(page, h, 500);
  const b = await page.evaluate(() => ({ hash: location.hash, tabs: [...document.querySelectorAll('#tabbar a')].map(x => x.dataset.nav).join(), splash: document.documentElement.classList.contains('splash-on') }));
  console.log('fichiers chargés :', loaded.length, loaded.filter(x => !/ 200$/.test(x)));
  console.log('avant connexion :', JSON.stringify(a)); console.log('après :', JSON.stringify(b));
  console.log('erreurs :', log.errors.length ? log.errors : 'aucune'); console.log('console :', log.console.filter(x => !/preload|Service Worker/.test(x)).slice(0, 5));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

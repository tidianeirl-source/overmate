// Accueil et onglets quand le site est presque vide (un seul inscrit) : états vides
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const W = +(process.env.W || 360);
  const { browser, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800 });
  const sd = mkSeed(1, 0); await seed(page, sd.db, sd.users);
  await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1300);
  for (const pg of ['accueil', 'matchs', 'recherche', 'groupes', 'messages']) { await nav(page, pg, 450);
    await page.evaluate(() => { document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')); const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
    await page.screenshot({ path: `shots/empty-${W}-${pg}.png`, fullPage: pg === 'accueil' });
    const o = await overflow(page); console.log(pg, await page.evaluate(() => document.getElementById('app').innerText.replace(/\n+/g, ' | ').slice(0, 330)), (o.bad.length || o.scrollW > o.w + 1) ? '⚠ ' + JSON.stringify(o).slice(0, 200) : ''); }
  const e = log.errors, c = log.console.filter(x => !/Service Worker|preloaded using/.test(x)); if (e.length || c.length) console.log('⚠ erreurs', JSON.stringify({ e, c }).slice(0, 600));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

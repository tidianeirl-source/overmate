// Mode normal (animations actives, pas de mode léger) : rien ne reste invisible, pas d'erreur, captures réelles sans forcer l'affichage
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const W = +(process.env.W || 360), H = +(process.env.H || 740);
  const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800, motion: true });
  const sd = mkSeed(); const now = Date.now(); sd.db['purchases/a01'] = { pack: true };
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['requests/a09_a01'] = { from: 'a09', to: 'a01', participants: ['a09', 'a01'], status: 'pending', at: now - 5e5 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut ! On joue ce soir ?', at: now - 9e5 };
  await seed(page, sd.db, sd.users);
  await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1300);
  await page.evaluate(() => setLite(false)); await page.waitForTimeout(300);
  console.log('léger:', await page.evaluate(() => document.documentElement.classList.contains('lite')), 'mouvement réduit:', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  for (const sk of (process.env.THEMES || 'defaut,samurai,esth').split(',')) { await page.evaluate(s => { applySkin(s); route(); }, sk); await page.waitForTimeout(500);
    for (const pg of ['accueil', 'matchs', 'groupes', 'profil', 'messages/a03', 'parametres']) { await nav(page, pg, 900);
      await page.screenshot({ path: `shots/mo-${sk}-${W}-${pg.replace(/\W+/g, '_')}.png` });
      // on descend par écrans : chaque bloc .reveal doit devenir visible
      const h = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < h; y += Math.round(H * .7)) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(260); }
      await page.waitForTimeout(700);
      const hidden = await page.evaluate(() => [...document.querySelectorAll('#app *')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(e); return +cs.opacity < .95 && !e.closest('[aria-hidden="true"],.cscene,.bloom,.buy-soon') && e.children.length < 40 && cs.animationName === 'none'; }).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 2).join('.') + ':' + getComputedStyle(e).opacity).slice(0, 8));
      const o = await overflow(page); console.log(sk, pg, hidden.length ? '⚠ peu visibles: ' + JSON.stringify(hidden) : 'ok', (o.bad.length || o.scrollW > o.w + 1) ? '⚠ ' + JSON.stringify(o).slice(0, 200) : ''); } }
  const e = log.errors, c = log.console.filter(x => !/Service Worker|preloaded using/.test(x)); if (e.length || c.length) console.log('⚠ erreurs', JSON.stringify({ e, c }).slice(0, 800));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => { const { browser, page, log } = await launch({ width: 1440, height: 900 });
  const sd = mkSeed(), db = sd.db, now = Date.now(); db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: 1 };
  db['chats/a01_a02/messages/m1'] = { from: 'a02', text: 'On joue ce soir ?', at: now - 3600e3 };
  db['groups/g3'] = { name: 'Team Valorant', desc: '', game: '', image: '', private: false, owner: 'a01', mods: [], members: ['a01', 'a02'], invited: [], kicked: [], ageGroup: 'adult', at: now };
  db['admins/a01'] = { role: 'modérateur' };
  await seed(page, db, sd.users); await open(page, '', 600);
  console.log('visiteur', JSON.stringify(await page.evaluate(() => ({ rail: getComputedStyle(document.getElementById('siderail')).display, top: getComputedStyle(document.querySelector('.top')).display }))));
  await page.screenshot({ path: 'shots_pc/rail-visiteur.png' });
  await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  const skins = await page.evaluate(() => Object.keys(SKINS));
  for (const r of ['accueil', 'matchs', 'groupes', 'messages/a02', 'groupe/g3', 'profil', 'boutique']) { await nav(page, r, 800);
    const m = await page.evaluate(() => { const f = document.querySelector('.frame').getBoundingClientRect(), a = document.querySelector('#siderail [aria-current="page"]'); return { frame: [Math.round(f.left), Math.round(f.width)], actif: a ? (a.getAttribute('aria-label') || a.title) : null, items: document.querySelectorAll('#siderail .sr-i').length, grp: document.querySelectorAll('#siderail .dm-ico').length }; });
    console.log(r, JSON.stringify(m), JSON.stringify((await overflow(page)).bad)); await page.screenshot({ path: `shots_pc/rail-${r.replace('/', '-')}.png` }); }
  for (const sk of skins) { await page.evaluate(k => document.documentElement.dataset.skin = k, sk); await nav(page, 'accueil', 300); const o = await overflow(page); const f = await page.evaluate(() => Math.round(document.querySelector('.frame').getBoundingClientRect().left)); console.log('thème', sk, f, JSON.stringify(o.bad)); if (['samurai', 'sombre', 'ocean'].includes(sk)) { await nav(page, 'messages/a02', 600); await page.screenshot({ path: `shots_pc/rail-theme-${sk}.png` }); } }
  await page.click('#siderail .notif-btn'); await page.waitForTimeout(400); console.log('cloche', await page.evaluate(() => !!document.querySelector('dialog[open], .modal, .sheet, [role=dialog]')));
  console.log(JSON.stringify(log.errors).slice(0, 300)); await browser.close(); })();

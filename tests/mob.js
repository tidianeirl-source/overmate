const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => { for (const W of [360, 412]) {
  const { browser, page, log } = await launch({ width: W, height: 780, mobile: true, touch: true });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a04', 'a05'].forEach((u, i) => { db[`requests/${u}_a01`] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 };
    const pair = ['a01', u].sort().join('_'); db[`chats/${pair}/messages/m1`] = { from: u, text: 'On joue ce soir ?', at: now - (i + 1) * 3600e3 }; if (i % 2 === 0) db[`chats/${pair}/messages/m2`] = { from: 'a01', text: 'Oui vers 21 h.', at: now - (i + 1) * 3500e3 }; });
  db['groups/g3'] = { name: 'Team Valorant Abidjan', desc: '', game: 'Valorant', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a02', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 60e3 };
  await seed(page, db, sd.users); await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  for (const u of ['a02', 'a03', 'a04']) await nav(page, 'messages/' + u, 500);
  await page.evaluate(() => { S.unread.a05 = 2; S.unread.a03 = 1; });
  await nav(page, 'accueil', 300); await nav(page, 'messages', 800);
  console.log(W, 'liste', JSON.stringify(await page.evaluate(() => ({ rows: document.querySelectorAll('.sn-row').length, st: [...document.querySelectorAll('.sn-st .t')].map(e => e.textContent) }))), JSON.stringify((await overflow(page)).bad));
  await page.screenshot({ path: `shots_pc/mob-liste-${W}.png` });
  await page.click('[data-snf="unread"]'); const nU = await page.evaluate(() => document.querySelectorAll('.sn-row:not([hidden])').length);
  const nG = await page.evaluate(() => document.querySelectorAll('.sn-row.grp, [data-snf="group"]').length);   // les groupes ont leur propre onglet : 0 attendu dans Messages
  await page.click('[data-snf="all"]'); await page.click('#sn-find'); await page.fill('#sn-q', 'awa'); const nS = await page.evaluate(() => document.querySelectorAll('.sn-row:not([hidden])').length);
  console.log(W, 'filtres non lus/groupes/recherche', nU, nG, nS);
  await nav(page, 'messages/a02', 800); console.log(W, 'chat', JSON.stringify((await overflow(page)).bad)); await page.screenshot({ path: `shots_pc/mob-chat-${W}.png` });
  console.log(JSON.stringify(log.errors).slice(0, 300)); await browser.close(); } })();

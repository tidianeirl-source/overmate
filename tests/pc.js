const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  for (const W of (process.env.WS||"1440,1024,360").split(",").map(Number)) {
    const { browser, page, log } = await launch({ width: W, height: W > 1500 ? 1080 : W > 800 ? 900 : 740, mobile: W < 800, touch: W < 800 });
    const sd = mkSeed(), db = sd.db, now = Date.now();
    ['a02', 'a03', 'a04', 'a05'].forEach((u, i) => { db[`requests/${u}_a01`] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 };
      const pair = ['a01', u].sort().join('_'); db[`chats/${pair}/messages/m1`] = { from: u, text: ['On joue ce soir ?', 'GG pour hier', 'Tu es dispo samedi ?', 'Ok ça marche'][i], at: now - (i + 1) * 3600e3 }; db[`chats/${pair}/messages/m2`] = { from: 'a01', text: 'Oui vers 21 h, je finis mes devoirs et je me connecte direct.', at: now - (i + 1) * 3500e3 }; });
    db['groups/g3'] = { name: 'Team Valorant Abidjan', desc: '', game: 'Valorant', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a02', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6 };
    await seed(page, db, sd.users); await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
    for (const [r, n] of [['messages', 'liste'], ['messages/a02', 'chat'], ['groupe/g3', 'groupe']]) { await nav(page, r, 900);
      const o = await overflow(page); const side = await page.evaluate(() => { const s = document.getElementById('dm-side'), b = document.getElementById('chatbox'); return { side: s ? Math.round(s.getBoundingClientRect().width) : 0, box: b ? [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)] : null, scroll: document.documentElement.scrollHeight - innerHeight }; });
      console.log(W, n, JSON.stringify(side), JSON.stringify(o.bad)); await page.screenshot({ path: `shots_pc/${n}-${W}.png` }); }
    console.log('erreurs', JSON.stringify(log.errors).slice(0, 300)); await browser.close();
  }
})();

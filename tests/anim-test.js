// Plus d'animation quand on change de conversation (ordinateur surtout) ; seuls les nouveaux messages « sautent »
const { launch, seed, open, nav, mkSeed } = require('./lib');
const out = []; const ok = (name, cond, extra) => out.push((cond ? 'OK   ' : 'ÉCHEC') + ' ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : ''));
(async () => {
  for (const [W, H, skin] of [[1280, 800, 'defaut'], [1280, 800, 'samurai'], [1280, 800, 'sombre']]) {
    const { browser, page, log } = await launch({ width: W, height: H, motion: true });
    const sd = mkSeed(); const now = Date.now(); sd.db['purchases/a01'] = { pack: true };
    for (const id of ['a03', 'a04', 'a05']) { sd.db[`requests/a01_${id}`] = { from: 'a01', to: id, participants: ['a01', id], status: 'accepted', at: now - 1e6 }; for (let k = 0; k < 6; k++) sd.db[`chats/a01_${id}/messages/m${k}`] = { from: k % 2 ? 'a01' : id, text: `Message ${k} avec ${id}`, at: now - 9e5 + k * 1e4 }; }
    sd.db['groups/g1'] = { name: 'Squad du soir', owner: 'a01', members: ['a01', 'a02', 'a04'], admins: ['a01'], game: 'Free Fire', private: false, at: now - 1e6, last: now - 1e5 };
    await seed(page, sd.db, sd.users); await open(page, 'accueil', 900);
    await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    await page.evaluate(s => { applySkin(s); route(); }, skin); await page.waitForTimeout(500);
    const anims = () => page.evaluate(() => { const runs = document.getAnimations().filter(a => a.playState === 'running'); return { pageIn: !!document.querySelector('#app > .page-in'), blur: runs.filter(a => /page|pond/i.test(a.animationName || '')).map(a => a.animationName), bubbles: runs.filter(a => a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('bubble')).length }; });
    await nav(page, 'messages', 900);
    await page.evaluate(() => document.querySelector('a[href="#/messages/a03"]').click()); await page.waitForTimeout(60);
    const a1 = await anims();
    ok(`${skin} · liste → conversation : pas d'animation de page, les bulles ne sautent pas`, !a1.pageIn && !a1.blur.length && !a1.bubbles, a1);
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('.dm-side a[href="#/messages/a04"], a[href="#/messages/a04"]').click()); await page.waitForTimeout(60);
    const a2 = await anims();
    ok(`${skin} · d'une conversation à l'autre : rien ne bouge`, !a2.pageIn && !a2.blur.length && !a2.bubbles, a2);
    await page.waitForTimeout(500);
    // un nouveau message arrive : lui seul saute
    await page.evaluate(() => window.__mock.set('chats/a01_a04/messages/zz1', { from: 'a04', text: 'Nouveau message !', at: Date.now() }));
    await page.waitForTimeout(120);
    const nm = await page.evaluate(() => ({ pop: [...document.querySelectorAll('#chatbox .bubble.pop-in')].map(b => b.textContent.slice(0, 20)), runs: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('bubble')).length, last: (document.querySelector('#chatbox .bubble:last-of-type') || {}).textContent }));
    ok(`${skin} · un message arrive : seule sa bulle saute`, nm.pop.length === 1 && /Nouveau message/.test(nm.pop[0]) && nm.runs <= 1, nm);
    // la page se redessine (nouvelles données) : rien ne bouge
    await page.waitForTimeout(500);
    await page.evaluate(() => { route(); }); await page.waitForTimeout(60);
    const a3 = await anims();
    ok(`${skin} · la même page se redessine : rien ne bouge`, !a3.pageIn && !a3.blur.length && !a3.bubbles, a3);
    // groupes : de l'onglet Groupes à un groupe, puis vers Messages
    await page.evaluate(() => { location.hash = '#/groupe'; }); await page.waitForTimeout(60); const a4 = await anims(); await page.waitForTimeout(500);
    await page.evaluate(() => { location.hash = '#/groupe/g1'; }); await page.waitForTimeout(60); const a5 = await anims(); await page.waitForTimeout(500);
    ok(`${skin} · Messages → Groupes → un groupe : rien ne bouge`, !a4.pageIn && !a4.blur.length && !a5.pageIn && !a5.blur.length && !a5.bubbles, { a4, a5 });
    // ailleurs, l'animation de page reste
    await page.evaluate(() => { location.hash = '#/matchs'; }); await page.waitForTimeout(60);
    const a6 = await anims();
    ok(`${skin} · vers Matchs : l'animation de page reste comme avant`, a6.pageIn, a6);
    ok(`${skin} · erreurs JS`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n'));
})();

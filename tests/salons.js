// v28 — Salons dans un groupe (#général, #ranked…), façon Discord.
// Le créateur du groupe crée, renomme et supprime des salons (8 au plus). Un message porte le salon où il a été écrit ; les anciens messages sont dans #général.
// Supprimer un salon n'efface aucun message : ils reviennent dans #général, et la case du salon n'est pas redonnée à un autre.
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const OUT = process.env.OUT || 'shots-salons'; const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined && !c ? ' → ' + JSON.stringify(x).slice(0, 500) : ''));
const mk = () => { const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a03', 'a05'].forEach(u => { db['requests/' + u + '_a01'] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['groups/g4'] = { name: 'Valorant du dimanche', desc: '', game: 'Valorant', image: '', private: false, owner: 'a01', mods: [], members: ['a01', 'a05', 'a09'], invited: [], kicked: [], ageGroup: 'adult', at: now - 8e6, lastAt: now - 3600e3 };
  db['groups/g3'] = { name: 'Mes potes du campus', desc: '', game: '', image: '', private: true, owner: 'a03', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 3600e3 };
  db['groups/g4/messages/old1'] = { from: 'a05', text: 'Ancien message, avant les salons', at: now - 7200e3 };
  db['groups/g3/messages/x1'] = { from: 'a03', text: 'Salut', at: now - 7200e3 };
  return sd; };
(async () => {
  for (const [W, H, dev] of [[360, 740, 'tel'], [1280, 800, 'pc']]) {
    const tel = W < 800; const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel }); const ev = (f, a) => page.evaluate(f, a);
    const sd = mk(); await seed(page, sd.db, sd.users); await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await ev(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    const chips = () => ev(() => [...document.querySelectorAll('#g-chans .chip')].map(c => c.textContent.trim() + (c.getAttribute('aria-pressed') === 'true' ? '*' : '')));
    const bubbles = () => ev(() => [...document.querySelectorAll('#chatbox .bubble > span:first-child')].map(b => b.textContent));
    const send = async t => { await page.fill('#chatin', t); await page.keyboard.press('Enter'); await page.waitForTimeout(1500); };
    const chan = async n => { await ev(x => [...document.querySelectorAll('#g-chans [data-chan]')].find(c => c.textContent.trim() === '#' + x).click(), n); await page.waitForTimeout(350); };
    const save = async () => { await page.click('#g-chan-ok'); await page.waitForTimeout(700); };
    // ---- un groupe dont je ne suis pas le créateur, sans salon : rien ne change
    await nav(page, 'groupe/g3', 1200);
    ok(`${dev} : groupe sans salon dont je suis simple membre → pas de rangée de salons`, (await chips()).length === 0 && (await bubbles()).join() === 'Salut');
    // ---- mon groupe : créer un salon
    await nav(page, 'groupe/g4', 1200);
    ok(`${dev} : mon groupe, sans salon → un bouton « + Créer des salons »`, (await chips()).join() === '+ Créer des salons', await chips());
    await page.click('#g-chan-edit'); await page.waitForTimeout(350);
    await page.fill('#g-chan-new', 'Ranked Été !'); await save();
    let st = await ev(() => ({ ch: window.__mock.db['groups/g4'].channels, toast: document.getElementById('toast').textContent, open: document.getElementById('dlg').open }));
    ok(`${dev} : nouveau salon « Ranked Été ! » → enregistré en « ranked-ete » (lettres, chiffres, tirets)`, JSON.stringify(st.ch) === '{"c1":"ranked-ete"}' && !st.open, st);
    ok(`${dev} : la rangée montre #général (ouvert), #ranked-ete et « Gérer »`, (await chips()).join() === '#général*,#ranked-ete,Gérer', await chips());
    ok(`${dev} : l'ancien message est dans #général`, (await bubbles()).join() === 'Ancien message, avant les salons');
    await send('Salut dans général');
    await chan('ranked-ete');
    ok(`${dev} : #ranked-ete est vide au début, et le champ dit « Message dans #ranked-ete… »`, (await bubbles()).length === 0 && /#ranked-ete/.test(await ev(() => document.getElementById('chatin').placeholder)), await bubbles());
    await send('Go ranked ce soir');
    st = await ev(() => Object.values(window.__mock.db).filter(v => v && v.text === 'Go ranked ce soir').map(v => ({ ch: v.ch, keys: Object.keys(v).sort().join() })));
    ok(`${dev} : le message écrit dans le salon porte ch = c1 (et rien d'autre de nouveau)`, st.length === 1 && st[0].ch === 'c1' && st[0].keys === 'at,ch,from,text', st);
    ok(`${dev} : il s'affiche dans #ranked-ete…`, (await bubbles()).join() === 'Go ranked ce soir');
    await page.screenshot({ path: `${OUT}/${dev}-1-salon.png` });
    await chan('général');
    ok(`${dev} : … et pas dans #général, qui garde ses deux messages`, (await bubbles()).join('|') === 'Ancien message, avant les salons|Salut dans général', await bubbles());
    st = await ev(() => Object.values(window.__mock.db).filter(v => v && v.text === 'Salut dans général').map(v => 'ch' in v));
    ok(`${dev} : un message de #général n'a pas de champ ch (comme avant)`, st.length === 1 && st[0] === false, st);
    // ---- deuxième salon, noms en double refusés, renommer
    await page.click('#g-chan-edit'); await page.waitForTimeout(350); await page.fill('#g-chan-new', 'ranked ete'); await page.click('#g-chan-ok'); await page.waitForTimeout(400);
    ok(`${dev} : deux salons du même nom → refusé, avec un message`, await ev(() => document.getElementById('dlg').open && /existe déjà/.test(document.getElementById('toast').textContent)));
    await page.fill('#g-chan-new', 'général'); await page.click('#g-chan-ok'); await page.waitForTimeout(400);
    ok(`${dev} : « général » est réservé`, await ev(() => document.getElementById('dlg').open && /existe déjà/.test(document.getElementById('toast').textContent)));
    await page.fill('#g-chan-new', 'tournois'); await page.fill('[data-chan-name="c1"]', 'ranked'); await save();
    ok(`${dev} : renommer #ranked-ete en #ranked et créer #tournois`, JSON.stringify(await ev(() => window.__mock.db['groups/g4'].channels)) === '{"c1":"ranked","c2":"tournois"}' && (await chips()).join() === '#général*,#ranked,#tournois,Gérer', await chips());
    await chan('ranked'); ok(`${dev} : après le renommage, le message est toujours dans son salon`, (await bubbles()).join() === 'Go ranked ce soir');
    const ov = await overflow(page); ok(`${dev} : rien ne déborde`, ov.scrollW <= ov.w && !ov.bad.length, ov);
    // ---- un autre membre voit les salons, sans « Gérer »
    { const o = await launch({ width: W, height: H, mobile: tel, touch: tel }); const db2 = await ev(() => window.__mock.db); await seed(o.page, db2, sd.users); await open(o.page, '', 600); await o.page.evaluate(() => window.__mock.signIn('a05@test.ci')); await o.page.waitForTimeout(2600);
      await o.page.evaluate(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); }); await nav(o.page, 'groupe/g4', 1200);
      const c2 = await o.page.evaluate(() => [...document.querySelectorAll('#g-chans .chip')].map(c => c.textContent.trim()));
      ok(`${dev} : un simple membre voit les salons, sans le bouton « Gérer »`, c2.join() === '#général,#ranked,#tournois', c2);
      await o.page.evaluate(() => [...document.querySelectorAll('#g-chans [data-chan]')].find(c => c.textContent.trim() === '#ranked').click()); await o.page.waitForTimeout(400);
      ok(`${dev} : il lit le message du salon`, (await o.page.evaluate(() => [...document.querySelectorAll('#chatbox .bubble > span:first-child')].map(b => b.textContent))).join() === 'Go ranked ce soir');
      ok(`${dev} : aucune erreur chez lui`, !o.log.errors.length, o.log.errors); await o.browser.close(); }
    // ---- supprimer un salon : ses messages reviennent dans #général, rien n'est effacé, sa case n'est pas réutilisée
    const nb = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('groups/g4/messages/')).length);
    await page.click('#g-chan-edit'); await page.waitForTimeout(350); await page.click('[data-chan-del="c1"]'); await page.waitForTimeout(150);
    ok(`${dev} : « Supprimer » un salon demande une confirmation`, await ev(() => /Confirmer/.test(document.querySelector('[data-chan-del="c1"]').textContent)));
    await page.click('[data-chan-del="c1"]'); await save();
    st = await ev(() => ({ ch: window.__mock.db['groups/g4'].channels, n: Object.keys(window.__mock.db).filter(k => k.startsWith('groups/g4/messages/')).length }));
    ok(`${dev} : salon supprimé → sa case reste, vide ; aucun message effacé`, JSON.stringify(st.ch) === '{"c1":"","c2":"tournois"}' && st.n === nb && nb === 3, st);
    ok(`${dev} : la rangée n'a plus que #général et #tournois, et on est revenu dans #général`, (await chips()).join() === '#général*,#tournois,Gérer', await chips());
    ok(`${dev} : le message de l'ancien salon est revenu dans #général`, (await bubbles()).join('|') === 'Ancien message, avant les salons|Salut dans général|Go ranked ce soir', await bubbles());
    await page.click('#g-chan-edit'); await page.waitForTimeout(350); await page.fill('#g-chan-new', 'clips'); await save();
    ok(`${dev} : un nouveau salon prend une case neuve (c3), pas celle du salon supprimé`, JSON.stringify(await ev(() => window.__mock.db['groups/g4'].channels)) === '{"c1":"","c2":"tournois","c3":"clips"}');
    await chan('clips'); ok(`${dev} : le nouveau salon est vide (l'ancien message n'y réapparaît pas)`, (await bubbles()).length === 0);
    ok(`${dev} : aucune erreur`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n')); const bad = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(bad ? `${bad} échec(s)` : 'Tout est bon.');
})();

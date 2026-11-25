// Modifier et supprimer ses messages : conversation privée et groupe, téléphone et ordinateur
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x))); if (!c) fails++; };
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
    const sd = mkSeed(); const now = Date.now();
    sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
    sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut ! On joue ce soir ?', at: now - 9e5 };
    sd.db['chats/a01_a03/messages/m2'] = { from: 'a01', text: 'Grave, 21h sur Free Fire', at: now - 8e5 };
    sd.db['groups/g1'] = { name: 'Team du soir', desc: '', game: 'Free Fire', image: '', private: true, owner: 'a03', mods: [], members: ['a03', 'a01', 'a04'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
    sd.db['groups/g1/messages/x1'] = { from: 'a03', text: 'Bienvenue', at: now - 4e5 };
    sd.db['groups/g1/messages/x2'] = { from: 'a01', text: 'Merci la team', at: now - 3e5 };
    await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    // --- conversation privée
    await nav(page, 'messages/a03', 900);
    const b = await page.evaluate(() => ({ own: document.querySelectorAll('.bubble[data-own]').length, more: document.querySelectorAll('.msg-more').length, other: document.querySelectorAll('.bubble:not([data-own]) .msg-more').length }));
    ok(b.own === 1 && b.more === 2 && b.other === 1, 'privé : le bouton ⋯ sur chaque message', b);
    await page.click('.bubble:not([data-own]) .msg-more'); await page.waitForTimeout(300);
    const menu0 = await page.evaluate(() => [...document.querySelectorAll('#mm-ov .mm-it')].map(x => x.textContent));
    ok(menu0.join('|') === 'Répondre|Copier', 'menu sur le message de l\'autre : Répondre, Copier', menu0);
    await page.evaluate(() => mmClose());
    await page.click('.bubble[data-own] .msg-more'); await page.waitForTimeout(300);
    const menu = await page.evaluate(() => [...document.querySelectorAll('#mm-ov .mm-it')].map(x => x.textContent));
    ok(menu.join('|') === 'Répondre|Copier|Modifier|Supprimer', 'menu sur mon message : Répondre, Copier, Modifier, Supprimer', menu);
    await page.click('#mm-ov [data-mm-edit]'); await page.waitForTimeout(200);
    const ed = await page.evaluate(() => ({ v: document.getElementById('chatin').value, bar: !!document.getElementById('edit-bar'), btn: document.querySelector('#chatform button[type=submit]').textContent }));
    ok(ed.v === 'Grave, 21h sur Free Fire' && ed.bar && ed.btn === 'Enregistrer', 'Modifier : le texte revient dans la zone d\'écriture, avec le bandeau', ed);
    await page.fill('#chatin', 'Grave, 22h sur Free Fire'); await page.click('#chatform button[type=submit]'); await page.waitForTimeout(700);
    const dbm = await page.evaluate(() => window.__mock.db['chats/a01_a03/messages/m2']);
    ok(dbm.text === 'Grave, 22h sur Free Fire' && JSON.stringify(dbm.hist) === '["Grave, 21h sur Free Fire"]' && dbm.edited > 0, 'enregistré : nouveau texte, ancienne version gardée, date de modification', dbm);
    const shown = await page.evaluate(() => ({ t: document.querySelector('.bubble[data-own] span').textContent, meta: document.querySelector('.bubble[data-own] small').textContent, bar: !!document.getElementById('edit-bar'), n: Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_a03/messages/')).length }));
    ok(shown.t === 'Grave, 22h sur Free Fire' && /modifié/.test(shown.meta) && !shown.bar && shown.n === 2, 'affiché « modifié », pas de nouveau message envoyé', shown);
    // annuler une modification
    await page.click('.bubble[data-own] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-mm-edit]'); await page.waitForTimeout(150);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => !document.getElementById('edit-bar') && document.getElementById('chatin').value === '' && !EDIT), 'Échap annule la modification', 0);
    // supprimer
    await page.click('.bubble[data-own] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-mm-del]'); await page.waitForTimeout(250);
    const conf = await page.evaluate(() => document.querySelector('dialog[open] h3').textContent); ok(conf === 'Supprimer ce message ?', 'suppression : on demande confirmation', conf);
    await page.click('#mm-del-ok'); await page.waitForTimeout(700);
    const del = await page.evaluate(() => ({ db: window.__mock.db['chats/a01_a03/messages/m2'], txt: [...document.querySelectorAll('.bubble')].map(x => x.innerText.replace(/\s+/g, ' ')), own: document.querySelectorAll('.bubble[data-own]').length, prev: lastMsg('a03').text }));
    ok(del.db.del === true && del.txt.some(t => /^Message supprimé/.test(t)) && del.own === 0, 'supprimé : « Message supprimé » à sa place, plus de menu', del);
    ok(del.prev === 'Message supprimé', 'l\'aperçu de la conversation dit « Message supprimé »', del.prev);
    // signalement : la modération voit l'ancienne version
    const rep = await page.evaluate(async () => { await DB.saveReport({ id: 'a03', reason: 'test', details: '', at: Date.now() }); const r = Object.entries(window.__mock.db).find(([k]) => k.startsWith('reports/')); return r && r[1].messages.map(m => m.text); });
    ok(rep && rep.some(t => /\[supprimé\] \[modifié, avant : « Grave, 21h sur Free Fire »\] Grave, 22h/.test(t)), 'signalement : le message supprimé et sa version d\'avant sont joints', rep);
    // menu par appui long (téléphone) / clic droit (ordinateur)
    await page.evaluate(() => { window.__mock.set('chats/a01_a03/messages/m3', { from: 'a01', text: 'Encore un', at: Date.now() }); }); await page.waitForTimeout(500);
    if (W < 800) { const el = await page.$('.bubble[data-own]'); const bx = await el.boundingBox(); await page.mouse.move(bx.x + 20, bx.y + 12); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); }
    else await page.click('.bubble[data-own]', { button: 'right' });
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => !!document.querySelector('#mm-ov [data-mm-edit]')), W < 800 ? 'appui long sur mon message : le menu s\'ouvre' : 'clic droit sur mon message : le menu s\'ouvre', 0);
    await page.evaluate(() => mmClose());
    const o1 = await overflow(page); ok(!o1.bad.length && o1.scrollW <= o1.w + 1, 'privé : pas de débordement', o1);
    // --- groupe
    await nav(page, 'groupe/g1', 1000);
    const g = await page.evaluate(() => ({ more: document.querySelectorAll('.msg-more').length, mine: document.querySelectorAll('.bubble.me .msg-more').length }));
    await page.click('.bubble:not(.me) .msg-more'); await page.waitForTimeout(250);
    g.menu = await page.evaluate(() => [...document.querySelectorAll('#mm-ov .mm-it')].map(x => x.textContent).join('|')); await page.evaluate(() => mmClose());
    ok(g.more >= 2 && g.mine === 1 && g.menu === 'Répondre|Copier', 'groupe : ⋯ sur chaque message ; sur ceux des autres, pas de « Supprimer » (je ne suis pas modérateur)', g);
    await page.click('.bubble[data-own] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-mm-edit]'); await page.waitForTimeout(150);
    await page.fill('#chatin', 'Merci la team 🔥'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    const gx = await page.evaluate(() => window.__mock.db['groups/g1/messages/x2']);
    ok(gx.text === 'Merci la team 🔥' && gx.hist && gx.hist[0] === 'Merci la team' && gx.edited, 'groupe : modification enregistrée', gx);
    await page.click('.bubble[data-own] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-mm-del]'); await page.waitForTimeout(250); await page.click('#mm-del-ok'); await page.waitForTimeout(700);
    const gd = await page.evaluate(() => ({ db: window.__mock.db['groups/g1/messages/x2'], txt: document.querySelector('#chatbox').innerText }));
    ok(gd.db && gd.db.del === true && /Message supprimé/.test(gd.txt), 'groupe : suppression → « Message supprimé » (le message reste pour la modération)', gd.db);
    const o2 = await overflow(page); ok(!o2.bad.length && o2.scrollW <= o2.w + 1, 'groupe : pas de débordement', o2);
    await page.screenshot({ path: `shots/edit-${W}-groupe.png` });
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close();
  }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

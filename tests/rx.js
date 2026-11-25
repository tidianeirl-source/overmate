// v14 — réactions avec des emojis (menu de l'appui long, bulles, qui a réagi, « + », clavier, groupes, place gardée)
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 500))); if (!c) fails++; };
function mk() { const sd = mkSeed(); const now = Date.now();
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  for (let i = 0; i < 30; i++) sd.db['chats/a01_a03/messages/z' + String(i).padStart(2, '0') + 'aaaaaaa'] = { from: i % 2 ? 'a01' : 'a03', text: 'Message numéro ' + i + ' pour remplir la conversation', at: now - 3e6 + i * 1000 };
  sd.db['chats/a01_a03/messages/m1aaaaaaaa'] = { from: 'a03', text: 'Tu joues ce soir ?', at: now - 9e5 };
  sd.db['chats/a01_a03/messages/m2aaaaaaaa'] = { from: 'a01', text: 'Oui vers 21 h', at: now - 8e5 };
  sd.db['chats/a01_a03/messages/m3aaaaaaaa'] = { from: 'a03', text: 'Ancien message', at: now - 7e5, del: true };
  sd.db['groups/g1'] = { name: 'Team du soir', desc: '', game: 'Free Fire', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a03', 'a04'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
  sd.db['groups/g1/messages/q1aaaaaaaa'] = { from: 'a03', text: 'Qui est chaud ?', at: now - 6e5, re: { a04: '🔥' } };
  return sd; }
const hold = async (page, sel, ms = 650) => { const el = await page.$(sel); const b = await el.boundingBox(); await page.mouse.move(b.x + Math.min(30, b.width / 2), b.y + Math.min(14, b.height / 2)); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(250); };
const rxBar = page => page.evaluate(() => { const o = document.getElementById('mm-ov'); if (!o) return null; const b = o.querySelector('.mm-rxbar'); if (!b) return { none: true };
  const r = b.getBoundingClientRect(), m = o.querySelector('.mm-menu').getBoundingClientRect(), l = o.querySelector('.mm-lift'), lr = l && l.getBoundingClientRect();
  const hit = (a, c) => !(a.bottom <= c.top || a.top >= c.bottom || a.right <= c.left || a.left >= c.right);
  return { n: b.querySelectorAll('.mm-rx').length, list: [...b.querySelectorAll('.mm-rx')].map(x => x.textContent || '+'), pressed: [...b.querySelectorAll('.mm-rx[aria-pressed="true"]')].map(x => x.textContent),
    inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, overMenu: hit(r, m), overLift: lr ? hit(r, lr) : false, w: Math.round(r.width) }; });
const pills = (page, mid) => page.evaluate(m => [...document.querySelectorAll(`#chatbox .bubble[data-mid="${m}"] .rx`)].map(x => (x.classList.contains('on') ? '*' : '') + x.textContent.trim()), mid);
const doc = (page, p) => page.evaluate(p => window.__mock.db[p], p);
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    const tel = W < 800; console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel });
    const sd = mk(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    await nav(page, 'messages/a03', 1000);
    // --- la rangée de réactions dans le menu
    await hold(page, '.bubble[data-mid="m1aaaaaaaa"]');
    let bar = await rxBar(page);
    ok(bar && bar.n === 7 && bar.list.slice(0, 6).join('') === '❤️😂😮😢😡👍' && bar.inView && !bar.overMenu && !bar.overLift, 'appui long : 6 emojis et « + », visibles, sans cacher le menu ni le message', bar);
    if (tel) await page.screenshot({ path: `shots/rx-${W}-menu.png` });
    await page.click('#mm-ov [data-mm-rx="❤️"]'); await page.waitForTimeout(500);
    let d = await doc(page, 'chats/a01_a03/messages/m1aaaaaaaa'), w = await page.evaluate(() => window.__mock.writes.filter(x => x.type === 'update').pop());
    ok(!(await page.$('#mm-ov')) && d.re && d.re.a01 === '❤️' && Object.keys(w.data).join() === 're.a01' && d.text === 'Tu joues ce soir ?', 'toucher ❤️ : le menu se ferme, seule ma réaction est écrite (re.a01)', { d, w });
    ok((await pills(page, 'm1aaaaaaaa')).join('|') === '*❤️', 'la réaction s\'affiche sous le message, marquée comme la mienne', await pills(page, 'm1aaaaaaaa'));
    if (tel) await page.screenshot({ path: `shots/rx-${W}-bulle.png` });
    await hold(page, '.bubble[data-mid="m1aaaaaaaa"]'); bar = await rxBar(page);
    ok(bar && bar.pressed.join('') === '❤️', 'le menu montre ma réaction actuelle', bar);
    await page.click('#mm-ov [data-mm-rx="❤️"]'); await page.waitForTimeout(500);
    d = await doc(page, 'chats/a01_a03/messages/m1aaaaaaaa');
    ok(!(d.re && d.re.a01) && (await pills(page, 'm1aaaaaaaa')).length === 0, 'toucher la même réaction la retire', d);
    // --- changer de réaction, puis le mate réagit aussi
    await hold(page, '.bubble[data-mid="m1aaaaaaaa"]'); await page.click('#mm-ov [data-mm-rx="😂"]'); await page.waitForTimeout(400);
    await page.evaluate(() => { const p = 'chats/a01_a03/messages/m1aaaaaaaa'; const x = window.__mock.db[p]; window.__mock.set(p, { ...x, re: { ...(x.re || {}), a03: '❤️' } }); }); await page.waitForTimeout(500);
    ok((await pills(page, 'm1aaaaaaaa')).sort().join('|') === '*😂|❤️', 'la réaction du mate arrive en direct, à côté de la mienne', await pills(page, 'm1aaaaaaaa'));
    await page.evaluate(() => { const p = 'chats/a01_a03/messages/m1aaaaaaaa'; const x = window.__mock.db[p]; window.__mock.set(p, { ...x, re: { a01: '😂', a03: '😂' } }); }); await page.waitForTimeout(500);
    ok((await pills(page, 'm1aaaaaaaa')).join('|') === '*😂2', 'même emoji : un seul rond avec le nombre (2)', await pills(page, 'm1aaaaaaaa'));
    // --- qui a réagi, et retirer la sienne
    await page.click('#chatbox .bubble[data-mid="m1aaaaaaaa"] .rx'); await page.waitForTimeout(400);
    const lst = await page.evaluate(() => { const d = document.getElementById('dlg'); return d && d.open && { h: d.querySelector('h3').textContent, rows: [...d.querySelectorAll('.rx-list li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()) }; });
    ok(lst && lst.h === 'Réactions' && lst.rows[0].startsWith('😂 Toi') && /Retirer/.test(lst.rows[0]) && /DjeliSniper/.test(lst.rows[1]) && !/Retirer/.test(lst.rows[1]), 'un appui sur la réaction montre qui a réagi (moi en premier, avec « Retirer »)', lst);
    if (tel) await page.screenshot({ path: `shots/rx-${W}-qui.png` });
    await page.click('#dlg [data-rx-off]'); await page.waitForTimeout(500);
    d = await doc(page, 'chats/a01_a03/messages/m1aaaaaaaa');
    ok(d.re && !d.re.a01 && d.re.a03 === '😂' && (await pills(page, 'm1aaaaaaaa')).join('|') === '😂', '« Retirer » enlève seulement ma réaction', d);
    // --- « + » : tous les emojis
    await hold(page, '.bubble[data-mid="m2aaaaaaaa"]'); await page.click('#mm-ov [data-mm-rxmore]'); await page.waitForTimeout(400);
    const pick = await page.evaluate(() => { const d = document.getElementById('dlg'); return d && d.open && d.querySelectorAll('.rx-pick .rx-pk').length; });
    ok(pick > 100, '« + » ouvre tous les emojis', pick);
    await page.click('#dlg .rx-pk[data-pk="🔥"]'); await page.waitForTimeout(500);
    d = await doc(page, 'chats/a01_a03/messages/m2aaaaaaaa');
    ok(d.re && d.re.a01 === '🔥' && (await pills(page, 'm2aaaaaaaa')).join('') === '*🔥', 'réagir avec un autre emoji (🔥), aussi sur son propre message', d);
    await hold(page, '.bubble[data-mid="m2aaaaaaaa"]'); bar = await rxBar(page);
    ok(bar && bar.list[6] === '🔥' && bar.pressed.join('') === '🔥', 'le « + » montre alors ma réaction 🔥', bar);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // --- message supprimé : pas de menu, donc pas de réaction ; écriture bloquée côté base aussi (règles v12)
    ok(!(await page.$('.bubble[data-mid="m3aaaaaaaa"][data-msg]')), 'un message supprimé ne propose pas de réaction', 0);
    // --- clavier : Tab va des réactions au menu, les flèches se déplacent, Échap ferme
    await page.focus('.bubble[data-mid="m1aaaaaaaa"] .msg-more'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    let k = await page.evaluate(() => document.activeElement.className);
    await page.keyboard.press('Shift+Tab'); const k1 = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    await page.keyboard.press('ArrowLeft'); const k2 = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    await page.keyboard.press('ArrowDown'); const k3 = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press('ArrowLeft'); const k4 = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    d = await doc(page, 'chats/a01_a03/messages/m1aaaaaaaa');
    ok(/mm-it/.test(k) && k1 === 'Autres emojis' && k2 === 'Réagir avec 👍' && k3 === 'Répondre' && k4 === 'Réagir avec ❤️' && d.re.a01 === '❤️', 'clavier : Maj+Tab vers les réactions, flèches, Entrée réagit', { k, k1, k2, k3, k4, re: d.re });
    // --- la place est gardée : réagir à un vieux message ne fait pas descendre la conversation
    const y0 = await page.evaluate(() => { const b = document.getElementById('chatbox'); b.scrollTop = 200; return b.scrollTop; });
    await page.evaluate(() => DB.react('c', 'a03', 'z04aaaaaaa', '👍')); await page.waitForTimeout(600);
    const y1 = await page.evaluate(() => document.getElementById('chatbox').scrollTop);
    ok(y0 > 0 && Math.abs(y1 - y0) < 2, 'réagir à un vieux message : on reste au même endroit', { y0, y1 });
    await page.fill('#chatin', 'Nouveau message'); await page.press('#chatin', 'Enter'); await page.waitForTimeout(1200);
    const bottom = await page.evaluate(() => { const b = document.getElementById('chatbox'); return b.scrollHeight - b.scrollTop - b.clientHeight; });
    ok(bottom < 4, 'un nouveau message fait toujours descendre en bas', bottom);
    // --- groupe
    await nav(page, 'groupe/g1', 1200);
    let gp = await page.evaluate(() => [...document.querySelectorAll('#chatbox .bubble[data-mid="q1aaaaaaaa"] .rx')].map(x => x.textContent.trim()));
    ok(gp.join('') === '🔥', 'groupe : les réactions des autres membres s\'affichent', gp);
    await hold(page, '.bubble[data-mid="q1aaaaaaaa"]'); await page.click('#mm-ov [data-mm-rx="👍"]'); await page.waitForTimeout(600);
    d = await doc(page, 'groups/g1/messages/q1aaaaaaaa');
    gp = await page.evaluate(() => [...document.querySelectorAll('#chatbox .bubble[data-mid="q1aaaaaaaa"] .rx')].map(x => (x.classList.contains('on') ? '*' : '') + x.textContent.trim()));
    ok(d.re && d.re.a01 === '👍' && d.re.a04 === '🔥' && gp.sort().join('|') === '*👍|🔥', 'groupe : ma réaction s\'ajoute sans toucher celle des autres', { re: d.re, gp });
    await page.click('#chatbox .bubble[data-mid="q1aaaaaaaa"] .rx'); await page.waitForTimeout(400);
    const gl = await page.evaluate(() => [...document.querySelectorAll('#dlg .rx-list li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
    ok(gl.length === 2 && gl[0].startsWith('👍 Toi') && /🔥/.test(gl[1]) && /MamadouFC/.test(gl[1]), 'groupe : la liste montre le nom de chaque membre', gl);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    if (tel) await page.screenshot({ path: `shots/rx-${W}-groupe.png` });
    // --- un refus de la base : la réaction revient en arrière, avec un message
    await page.evaluate(() => { window.__mock.denyNext = op => op.type === 'update'; });
    await hold(page, '.bubble[data-mid="q1aaaaaaaa"]'); await page.click('#mm-ov [data-mm-rx="😮"]'); await page.waitForTimeout(700);
    await page.evaluate(() => { window.__mock.denyNext = null; });
    gp = await page.evaluate(() => [...document.querySelectorAll('#chatbox .bubble[data-mid="q1aaaaaaaa"] .rx')].map(x => (x.classList.contains('on') ? '*' : '') + x.textContent.trim()));
    const tt = await page.evaluate(() => document.getElementById('toast').textContent);
    ok(gp.sort().join('|') === '*👍|🔥' && /réaction/.test(tt), 'refusée par la base : on revient à l\'état d\'avant et on le dit', { gp, tt });
    ok(!(await overflow(page)).length, 'rien ne dépasse de l\'écran', await overflow(page));
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors);
    await browser.close();
  }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

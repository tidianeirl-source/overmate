// v13 — appui long façon TikTok (menu : Répondre, Copier, Modifier, Supprimer) et réponses citées
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const path = require('path');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
function mk() { const sd = mkSeed(); const now = Date.now();
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['chats/a01_a03/messages/m1aaaaaaaa'] = { from: 'a03', text: 'Tu joues ce soir ?', at: now - 9e5 };
  sd.db['chats/a01_a03/messages/m2aaaaaaaa'] = { from: 'a01', text: 'Oui vers 21 h', at: now - 8e5 };
  sd.db['chats/a01_a03/photos/phaaaaaaaa'] = { from: 'a03', data: JPG, w: 4, h: 3, at: now - 7e5 };
  sd.db['chats/a01_a03/messages/m3aaaaaaaa'] = { from: 'a03', text: '📷 Photo', photo: { id: 'phaaaaaaaa', w: 4, h: 3 }, at: now - 7e5 };
  sd.db['stickers/StkMine0001abc'] = { owner: 'a01', data: 'data:image/webp;base64,' + 'A'.repeat(300), n: 1, shape: 'ci', at: now - 2e6 };
  sd.db['groups/g1'] = { name: 'Team du soir', desc: '', game: 'Free Fire', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
  sd.db['groups/g1/messages/q1aaaaaaaa'] = { from: 'a03', text: 'Qui est chaud ?', at: now - 6e5 };
  sd.db['groups/g1/messages/q2aaaaaaaa'] = { from: 'a03', text: 'Message à effacer', at: now - 5e5 };
  return sd; }
const hold = async (page, sel, ms = 650) => { const el = await page.$(sel); const b = await el.boundingBox(); await page.mouse.move(b.x + Math.min(30, b.width / 2), b.y + Math.min(14, b.height / 2)); await page.mouse.down(); await page.waitForTimeout(250);
  const pressing = await page.evaluate(s => document.querySelector(s).classList.contains('pressing'), sel); await page.waitForTimeout(ms - 250); await page.mouse.up(); await page.waitForTimeout(250); return pressing; };
const menuItems = page => page.evaluate(() => [...document.querySelectorAll('#mm-ov .mm-it')].map(x => x.textContent));
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    const tel = W < 800; console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel });
    const sd = mk(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
    await nav(page, 'messages/a03', 1000);
    // --- appui long sur le message de l'autre
    const pressing = await hold(page, '.bubble[data-mid="m1aaaaaaaa"]');
    const ov = await page.evaluate(() => { const o = document.getElementById('mm-ov'); if (!o) return null; const m = o.querySelector('.mm-menu').getBoundingClientRect(), l = o.querySelector('.mm-lift'), lr = l && l.getBoundingClientRect(), orig = document.querySelector('.bubble[data-mid="m1aaaaaaaa"]').getBoundingClientRect();
      return { dim: !!o.querySelector('.mm-dim'), lift: !!l, same: lr && Math.abs(lr.left - orig.left) < 2 && Math.abs(lr.width - orig.width) < 2, inView: m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight, below: lr && m.top >= lr.bottom, focus: document.activeElement && document.activeElement.classList.contains('mm-it') }; });
    ok(pressing && ov && ov.dim && ov.lift && ov.same && ov.inView && ov.focus, 'appui long : le message s\'enfonce, l\'écran s\'assombrit, le message reste en avant, le menu s\'ouvre à côté', { pressing, ov });
    ok((await menuItems(page)).join('|') === 'Répondre|Copier', 'message de l\'autre : Répondre, Copier', await menuItems(page));
    if (tel) await page.screenshot({ path: `shots/reply-${W}-menu.png` });
    await page.click('#mm-ov [data-mm-reply]'); await page.waitForTimeout(250);
    let bar = await page.evaluate(() => { const b = document.getElementById('reply-bar'); return b && { t: b.innerText.replace(/\s+/g, ' ').trim(), focus: document.activeElement.id, ov: !!document.getElementById('mm-ov') }; });
    ok(bar && /^Réponse à DjeliSniper Tu joues ce soir \?/.test(bar.t) && bar.focus === 'chatin' && !bar.ov, 'Répondre : bandeau « Réponse à DjeliSniper » et le champ prêt', bar);
    await page.fill('#chatin', 'Grave, je suis chaud'); await page.press('#chatin', 'Enter'); await page.waitForTimeout(900);
    let sent = await page.evaluate(() => Object.values(window.__mock.db).find(v => v && v.text === 'Grave, je suis chaud'));
    const noBar = await page.evaluate(() => !document.getElementById('reply-bar'));
    ok(sent && sent.reply && sent.reply.id === 'm1aaaaaaaa' && sent.reply.from === 'a03' && Object.keys(sent.reply).length === 2 && noBar, 'envoyé : le message cite { id, from } et le bandeau disparaît', { sent, noBar });
    let q = await page.evaluate(() => { const b = [...document.querySelectorAll('#chatbox .bubble')].find(x => /Grave, je suis chaud/.test(x.innerText)); const r = b && b.querySelector('.msg-reply'); return r && r.innerText.replace(/\s+/g, ' ').trim(); });
    ok(q === 'DjeliSniper Tu joues ce soir ?', 'la bulle montre la citation (auteur et message)', q);
    if (tel) await page.screenshot({ path: `shots/reply-${W}-citation.png` });
    await page.evaluate(() => [...document.querySelectorAll('#chatbox .msg-reply')].pop().click()); await page.waitForTimeout(250);
    ok(await page.evaluate(() => document.querySelector('.bubble[data-mid="m1aaaaaaaa"]').classList.contains('flash')), 'un appui sur la citation montre le message d\'origine', 0);
    // --- répondre à mon message (bouton ⋯), annuler avec Échap, puis répondre avec un sticker
    await page.click('.bubble[data-mid="m2aaaaaaaa"] .msg-more'); await page.waitForTimeout(250);
    ok((await menuItems(page)).join('|') === 'Répondre|Copier|Modifier|Supprimer', 'mon message : Répondre, Copier, Modifier, Supprimer', await menuItems(page));
    await page.click('#mm-ov [data-mm-reply]'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => /^Réponse à Toi/.test(document.getElementById('reply-bar').innerText)), 'répondre à soi-même : « Réponse à Toi »', 0);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => !document.getElementById('reply-bar') && !REPLY), 'Échap annule la réponse', 0);
    await page.click('.bubble[data-mid="m2aaaaaaaa"] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-mm-reply]'); await page.waitForTimeout(150);
    await page.click('#cpbtn'); await page.waitForTimeout(600); await page.click('#cpanel .cp-grid [data-stk-send="StkMine0001abc"]'); await page.waitForTimeout(1500);
    sent = await page.evaluate(() => Object.values(window.__mock.db).find(v => v && v.sticker && v.reply));
    ok(sent && sent.reply.id === 'm2aaaaaaaa' && sent.reply.from === 'a01', 'répondre avec un sticker : le sticker cite le message', sent);
    await page.click('#cpbtn'); await page.waitForTimeout(200);
    // --- le message d'origine est supprimé : la citation dit « Message supprimé »
    await page.click('.bubble[data-mid="m2aaaaaaaa"] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-mm-del]'); await page.waitForTimeout(250); await page.click('#mm-del-ok'); await page.waitForTimeout(800);
    q = await page.evaluate(() => [...document.querySelectorAll('#chatbox .msg-reply')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    ok(q.includes('Toi Message supprimé'), 'message d\'origine supprimé : la citation dit « Message supprimé »', q);
    // --- appui long sur une photo : le menu, pas la photo en grand
    await hold(page, '.bubble[data-mid="m3aaaaaaaa"] .photo-msg');
    const ph = await page.evaluate(() => ({ menu: !!document.getElementById('mm-ov'), view: !!document.getElementById('photo-view'), items: [...document.querySelectorAll('#mm-ov .mm-it')].map(x => x.textContent).join('|') }));
    ok(ph.menu && !ph.view && ph.items === 'Répondre', 'appui long sur une photo : le menu s\'ouvre (pas la photo en grand), on peut y répondre', ph);
    await page.mouse.click(5, H / 2); await page.waitForTimeout(250);
    ok(await page.evaluate(() => !document.getElementById('mm-ov')), 'toucher à côté ferme le menu', 0);
    await page.click('.bubble[data-mid="m3aaaaaaaa"] .photo-msg'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !!document.getElementById('photo-view')), 'un appui simple ouvre toujours la photo en grand', 0); await page.keyboard.press('Escape');
    // --- clavier (ordinateur) : ⋯, flèches, Échap, le focus revient
    if (!tel) { await page.focus('.bubble[data-mid="m1aaaaaaaa"] .msg-more'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      const k1 = await page.evaluate(() => document.activeElement.textContent); await page.keyboard.press('ArrowDown'); const k2 = await page.evaluate(() => document.activeElement.textContent);
      await page.keyboard.press('Escape'); await page.waitForTimeout(150); const k3 = await page.evaluate(() => ({ menu: !!document.getElementById('mm-ov'), back: document.activeElement.classList.contains('msg-more') }));
      ok(k1 === 'Répondre' && k2 === 'Copier' && !k3.menu && k3.back, 'au clavier : Entrée ouvre, les flèches circulent, Échap ferme et rend le focus', { k1, k2, k3 }); }
    let o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'rien ne déborde', o);
    // --- groupe : répondre, et « Supprimer pour tous » (je suis le créateur)
    await nav(page, 'groupe/g1', 1200);
    await hold(page, '.bubble[data-mid="q1aaaaaaaa"]');
    ok((await menuItems(page)).join('|') === 'Répondre|Copier|Supprimer pour tous', 'groupe (créateur) : Répondre, Copier, Supprimer pour tous', await menuItems(page));
    await page.click('#mm-ov [data-mm-reply]'); await page.waitForTimeout(150); await page.fill('#chatin', 'Moi !'); await page.press('#chatin', 'Enter'); await page.waitForTimeout(1200);
    sent = await page.evaluate(() => Object.entries(window.__mock.db).find(([k, v]) => k.startsWith('groups/g1/messages/') && v.text === 'Moi !'));
    ok(sent && sent[1].reply && sent[1].reply.id === 'q1aaaaaaaa' && sent[1].reply.from === 'a03', 'groupe : la réponse part avec la citation', sent && sent[1]);
    q = await page.evaluate(() => [...document.querySelectorAll('#chatbox .msg-reply')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    ok(q.some(t => /Qui est chaud \?/.test(t)), 'groupe : la citation s\'affiche', q);
    await page.click('.bubble[data-mid="q2aaaaaaaa"] .msg-more'); await page.waitForTimeout(250); await page.click('#mm-ov [data-gdel]'); await page.waitForTimeout(250);
    ok(await page.evaluate(() => /pour tout le monde/.test(document.querySelector('dialog[open] h3').textContent)), 'Supprimer pour tous : on demande confirmation', 0);
    await page.click('#gdel-ok'); await page.waitForTimeout(800);
    ok(await page.evaluate(() => !('groups/g1/messages/q2aaaaaaaa' in window.__mock.db) && !document.querySelector('.bubble[data-mid="q2aaaaaaaa"]')), 'effacé pour tout le monde', 0);
    o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'groupe : rien ne déborde', o);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close();
  }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

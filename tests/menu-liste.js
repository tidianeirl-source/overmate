// v25 — Menu d'une conversation ou d'un groupe dans la liste des messages (appui long au doigt, clic droit sur ordinateur).
// Message privé : Épingler, Marquer comme lu, Mettre en sourdine, Voir le profil, Bloquer, Signaler, Supprimer (pas d'« Archiver »).
// Groupe : Épingler, Marquer comme lu, Couper les notifications, Signaler, Quitter le groupe (ou Supprimer le groupe pour son créateur).
// « Supprimer » une conversation ne touche à aucun message dans la base : ils sont seulement cachés de mon côté.
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const OUT = process.env.OUT || 'shots-menu-liste'; const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined && !c ? ' → ' + JSON.stringify(x).slice(0, 500) : ''));
const mk = () => { const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a05', 'a07', 'a08'].forEach(u => { db['requests/' + u + '_a01'] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['notifications/a01/items/n1'] = { type: 'message', from: 'a02', text: 'AwaBuild : On joue ce soir ?', at: now - 60e3, read: false };
  for (let i = 0; i < 4; i++) db['chats/a01_a03/messages/m' + i] = { from: i % 2 ? 'a01' : 'a03', text: 'Ancien message ' + i, at: now - 3600e3 + i * 60e3 };
  db['groups/g3'] = { name: 'Mes potes du campus', desc: '', game: '', image: '', private: true, owner: 'a03', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 1000 };
  db['groups/g4'] = { name: 'Valorant du dimanche', desc: '', game: 'Valorant', image: '', private: false, owner: 'a01', mods: [], members: ['a01', 'a05', 'a09'], invited: [], kicked: [], ageGroup: 'adult', at: now - 8e6, lastAt: now - 5 * 3600e3 };
  db['groups/g3/messages/x1'] = { from: 'a03', text: 'Salut la team', at: now - 60e3 };
  return sd; };
(async () => {
  for (const [W, H, dev] of [[360, 740, 'tel'], [1280, 800, 'pc']]) {
    const tel = W < 800;
    const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel });
    const ev = (f, a) => page.evaluate(f, a);
    const sd = mk(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await ev(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    // sur ordinateur, la liste des mates est dans la colonne d'une conversation ouverte, et les groupes sont des ronds dans la colonne de gauche
    const dmSel = id => tel ? `.sn-row[href="#/messages/${id}"]` : `#dm-side .dm-row[href="#/messages/${id}"]`;
    const gSel = id => tel ? `.sn-row.grp[href="#/groupe/${id}"]` : `#sr-groups .dm-ico[href="#/groupe/${id}"]`;
    const home = async () => { await nav(page, tel ? 'messages' : 'messages/a08', 900); };
    const menu = async sel => { await ev(s => document.querySelector(s).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })), sel); await page.waitForTimeout(250);
      return ev(() => { const m = document.querySelector('#rm-ov .mm-menu'); if (!m) return null; const r = m.getBoundingClientRect(), h = document.querySelector('.rm-hole').getBoundingClientRect();
        return { items: [...m.querySelectorAll('.mm-it')].map(b => b.textContent.trim()), danger: [...m.querySelectorAll('.mm-it.danger')].map(b => b.textContent.trim()), inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, hole: [Math.round(h.width), Math.round(h.height)], over: !(r.bottom <= h.top || r.top >= h.bottom || r.right <= h.left || r.left >= h.right) }; }); };
    const pick = async label => { await ev(l => [...document.querySelectorAll('#rm-ov .mm-it')].find(b => b.textContent.trim() === l).click(), label); await page.waitForTimeout(450); };
    const closed = () => ev(() => !document.getElementById('rm-ov'));
    const toastTxt = () => ev(() => document.getElementById('toast').textContent);
    const tabBadge = () => ev(() => { const a = document.querySelector('#tabbar a[href="#/messages"], .sr-i[data-nav="messages"]'); const b = a && a.querySelector('.tb-badge'); return b ? b.textContent : ''; });
    await home();

    // ---- message privé : le menu
    let m = await menu(dmSel('a03'));
    ok(`${dev} : menu d'un message privé, dans l'ordre de la vidéo`, !!m && JSON.stringify(m.items) === JSON.stringify(['Épingler', 'Mettre en sourdine', 'Voir le profil', 'Bloquer', 'Signaler', 'Supprimer']), m);
    ok(`${dev} : pas d'« Archiver », « Supprimer » en rouge, menu dans l'écran et à côté de la ligne (pas dessus)`, !!m && !m.items.some(t => /archiv/i.test(t)) && m.danger.join() === 'Supprimer' && m.inView && !m.over && m.hole[0] > 20, m);
    await page.screenshot({ path: `${OUT}/${dev}-1-menu-prive.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(150); ok(`${dev} : Échap ferme le menu`, await closed());
    m = await menu(dmSel('a03')); await page.mouse.click(W - 6, H - 6); await page.waitForTimeout(200);
    ok(`${dev} : un appui à côté ferme le menu sans ouvrir de conversation`, await closed() && (await ev(() => location.hash)) === (tel ? '#/messages' : '#/messages/a08'));
    m = await menu(dmSel('a02'));
    ok(`${dev} : conversation non lue → « Marquer comme lu » en plus`, !!m && m.items[1] === 'Marquer comme lu' && m.items.length === 7, m);

    // ---- sourdine
    const b0 = await tabBadge();
    await pick('Mettre en sourdine');
    let st = await ev(s => ({ ic: !!document.querySelector(s + ' .mute-ic'), row: !!document.querySelector(s), unread: S.unread.a02, mute: rowPrefs().mute }), dmSel('a02'));
    ok(`${dev} : sourdine → petite cloche barrée sur la ligne, message toujours non lu, mais plus compté sur l'onglet Messages`, st.ic && st.unread === 1 && st.mute.includes('c:a02') && /sourdine/.test(await toastTxt()) && (await tabBadge()) !== b0, { st, b0, b1: await tabBadge() });
    m = await menu(dmSel('a02')); ok(`${dev} : le menu propose alors « Réactiver le son »`, !!m && m.items.includes('Réactiver le son') && !m.items.includes('Mettre en sourdine'), m);
    await pick('Réactiver le son');
    ok(`${dev} : son réactivé → l'onglet compte à nouveau le message`, (await tabBadge()) === b0 && !(await ev(s => !!document.querySelector(s + ' .mute-ic'), dmSel('a02'))), { b0, b1: await tabBadge() });

    // ---- marquer comme lu
    await menu(dmSel('a02')); await pick('Marquer comme lu');
    st = await ev(() => ({ unread: S.unread.a02 || 0, read: window.__mock.db['notifications/a01/items/n1'].read }));
    ok(`${dev} : marquer comme lu → plus de pastille, notification lue sur le compte`, st.unread === 0 && st.read === true && (await tabBadge()) !== b0, st);

    // ---- épingler (comme avant, par le nouveau menu)
    await menu(dmSel('a05')); await pick('Épingler');
    st = await ev(s => ({ pins: S.pins, db: window.__mock.db['private/a01'].pins, ic: !!document.querySelector(s + ' .pin-ic') }), dmSel('a05'));
    ok(`${dev} : épingler un mate → épingle enregistrée sur le compte, icône sur la ligne`, st.pins.join() === 'a05' && (st.db || []).join() === 'a05' && st.ic, st);
    m = await menu(dmSel('a05')); ok(`${dev} : le menu propose alors « Retirer l'épingle »`, !!m && m.items[0] === 'Retirer l\'épingle', m); await page.keyboard.press('Escape');

    // ---- supprimer une conversation : cachée de mon côté, rien n'est effacé dans la base
    await nav(page, 'messages/a03', 1100);
    const before = await ev(() => ({ bubbles: document.querySelectorAll('#chatbox .bubble').length, db: Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_a03/messages/')).length }));
    await home(); await menu(dmSel('a03')); await pick('Supprimer');
    const dl = await ev(() => { const d = document.getElementById('dlg'); return d.open ? d.textContent : ''; });
    ok(`${dev} : « Supprimer » demande confirmation et dit que le mate garde les messages`, /Supprimer la conversation avec DjeliSniper/.test(dl) && /les garde/.test(dl) && /restez mates/.test(dl), dl);
    await page.screenshot({ path: `${OUT}/${dev}-2-supprimer.png` });
    await page.click('#dlg [data-close]'); await page.waitForTimeout(250);
    ok(`${dev} : Annuler ne supprime rien`, (await ev(() => (S.chats.a03 || []).length)) === before.bubbles && before.bubbles === 4, before);
    await menu(dmSel('a03')); await pick('Supprimer'); await page.click('#cc-ok'); await page.waitForTimeout(500);
    st = await ev(s => ({ row: !!document.querySelector(s), local: (S.chats.a03 || []).length, db: Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_a03/messages/')).length, mate: isMate('a03'), hash: location.hash }), dmSel('a03'));
    ok(`${dev} : conversation supprimée → vide de mon côté, le mate reste dans la liste, les 4 messages sont toujours dans la base`, st.row && st.local === 0 && st.db === before.db && st.db === 4 && st.mate, st);
    await nav(page, 'messages/a03', 1100);
    ok(`${dev} : en rouvrant la conversation, les anciens messages ne reviennent pas`, (await ev(() => document.querySelectorAll('#chatbox .bubble').length)) === 0);
    await page.fill('#chatin', 'Nouveau départ'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
    st = await ev(() => ({ bubbles: [...document.querySelectorAll('#chatbox .bubble')].length, db: Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_a03/messages/')).length }));
    ok(`${dev} : un nouveau message s'affiche normalement (5 dans la base, 1 à l'écran)`, st.bubbles === 1 && st.db === 5, st);
    await open(page, tel ? 'messages' : 'messages/a08', 3200);
    await nav(page, 'messages/a03', 1100);
    ok(`${dev} : après rechargement de Coopô, toujours 1 seul message à l'écran`, (await ev(() => document.querySelectorAll('#chatbox .bubble').length)) === 1);
    await home();

    // ---- signaler, puis bloquer
    await menu(dmSel('a07')); await pick('Signaler');
    ok(`${dev} : « Signaler » ouvre le signalement du joueur`, /Signaler Gbaka_225/.test(await ev(() => document.getElementById('dlg').textContent)));
    await page.click('#rsend'); await page.waitForTimeout(600);
    st = await ev(s => ({ rep: Object.entries(window.__mock.db).filter(([k]) => k.startsWith('reports/')).map(([, v]) => v.target), row: !!document.querySelector(s), hash: location.hash }), dmSel('a07'));
    ok(`${dev} : signalement envoyé, le joueur disparaît de ma liste, je reste sur Messages`, st.rep.join() === 'a07' && !st.row && /^#\/messages/.test(st.hash), st);
    await menu(dmSel('a05')); await pick('Bloquer');
    ok(`${dev} : « Bloquer » demande confirmation`, /Bloquer YaoRush \?/.test(await ev(() => document.getElementById('dlg').textContent)));
    await page.click('#bok'); await page.waitForTimeout(600);
    st = await ev(s => ({ blocked: S.blocked, db: !!window.__mock.db['blocks/a01/list/a05'], row: !!document.querySelector(s), hash: location.hash }), dmSel('a05'));
    ok(`${dev} : joueur bloqué (enregistré sur le compte), retiré de la liste, je reste sur Messages`, st.blocked.includes('a05') && st.db && !st.row && /^#\/messages/.test(st.hash), st);

    // ---- groupe : le menu
    m = await menu(gSel('g3'));
    ok(`${dev} : menu d'un groupe dont je suis membre (non lu)`, !!m && JSON.stringify(m.items) === JSON.stringify(['Épingler', 'Marquer comme lu', 'Couper les notifications', 'Signaler', 'Quitter le groupe']) && m.inView && !m.over && !m.items.some(t => /archiv/i.test(t)), m);
    await page.screenshot({ path: `${OUT}/${dev}-3-menu-groupe.png` });
    await pick('Couper les notifications');
    st = await ev(() => ({ mute: rowPrefs().mute, unread: gUnread(gById('g3')), loud: gLoud(gById('g3')) }));
    ok(`${dev} : notifications du groupe coupées → toujours « non lu », mais plus de pastille`, st.mute.includes('g:g3') && st.unread && !st.loud && !(await ev(s => { const a = document.querySelector(s); return a.classList.contains('dm-ico') ? !!a.querySelector('.dm-dot') : false; }, gSel('g3'))), st);
    m = await menu(gSel('g3')); await pick('Réactiver les notifications');
    await menu(gSel('g3')); await pick('Marquer comme lu');
    ok(`${dev} : groupe marqué comme lu`, !(await ev(() => gUnread(gById('g3')))));
    m = await menu(gSel('g4'));
    ok(`${dev} : menu d'un groupe que j'ai créé : pas de « Signaler », « Supprimer le groupe » à la place de « Quitter »`, !!m && JSON.stringify(m.items) === JSON.stringify(['Épingler', 'Marquer comme lu', 'Couper les notifications', 'Supprimer le groupe']), m);
    await pick('Épingler');
    st = await ev(() => ({ gp: rowPrefs().gpins, first: (document.querySelector('.sn-list .sn-row') || { getAttribute: () => '' }).getAttribute('href'), ic: !!document.querySelector('.sn-row.grp[href="#/groupe/g4"] .pin-ic') }));
    ok(`${dev} : groupe épinglé${tel ? ' → il passe en haut de la liste, avec son icône' : ''}`, st.gp.join() === 'g4' && (!tel || (st.first === '#/groupe/g4' && st.ic)), st);
    if (tel) await page.screenshot({ path: `${OUT}/${dev}-4-liste.png` });

    // ---- signaler un groupe : contre son créateur, sans joindre ma conversation privée avec lui
    await menu(gSel('g3')); await pick('Signaler');
    ok(`${dev} : « Signaler » un groupe ouvre le signalement du groupe`, /Signaler le groupe Mes potes du campus/.test(await ev(() => document.getElementById('dlg').textContent)));
    await page.fill('#rtxt', 'Insultes dans le groupe'); await page.click('#rsend'); await page.waitForTimeout(600);
    st = await ev(() => { const r = Object.entries(window.__mock.db).filter(([k]) => k.startsWith('reports/')).map(([, v]) => v).find(v => v.target === 'a03'); return { r, chat: Object.keys(window.__mock.db).filter(k => k.startsWith('reportedChats/')), hidden: S.hidden.includes('a03'), keys: r ? Object.keys(r).sort() : [] }; });
    ok(`${dev} : signalement du groupe → adressé à la modération contre son créateur, le nom du groupe dans les détails, aucun message privé joint, le créateur reste visible`, !!st.r && /^\[Groupe « Mes potes du campus » · g3\] Insultes/.test(st.r.details) && st.r.by === 'a01' && !st.r.messages && !st.chat.some(k => /a03/.test(k)) && !st.hidden && st.keys.join() === 'at,by,details,reason,status,target', st);

    // ---- quitter un groupe, supprimer le sien
    await menu(gSel('g3')); await pick('Quitter le groupe');
    ok(`${dev} : « Quitter le groupe » demande confirmation`, /Quitter le groupe Mes potes du campus \?/.test(await ev(() => document.getElementById('dlg').textContent)));
    await page.click('#dlg [data-close]'); await page.waitForTimeout(250);
    ok(`${dev} : Annuler → toujours membre`, await ev(() => window.__mock.db['groups/g3'].members.includes('a01')));
    await menu(gSel('g3')); await pick('Quitter le groupe'); await page.click('#go-ok'); await page.waitForTimeout(900);
    st = await ev(s => ({ members: window.__mock.db['groups/g3'].members, row: !!document.querySelector(s), msgs: Object.keys(window.__mock.db).filter(k => k.startsWith('groups/g3/messages/')).length }), gSel('g3'));
    ok(`${dev} : groupe quitté → je n'en suis plus membre, il sort de ma liste, le groupe et ses messages restent pour les autres`, !st.members.includes('a01') && st.members.includes('a03') && !st.row && st.msgs === 1, st);
    await menu(gSel('g4')); await pick('Supprimer le groupe');
    ok(`${dev} : « Supprimer le groupe » prévient que tout sera effacé pour tous`, /effacés pour tous les membres/.test(await ev(() => document.getElementById('dlg').textContent)));
    await page.click('#dlg [data-close]'); await page.waitForTimeout(250);
    ok(`${dev} : Annuler → le groupe est toujours là`, await ev(() => !!window.__mock.db['groups/g4']));

    // ---- vrai appui long au doigt (téléphone)
    if (tel) { const box = await (await page.$(dmSel('a08'))).boundingBox(); const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 80, y: box.y + 20 }] }); await page.waitForTimeout(650);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300);
      st = await ev(() => ({ menu: !!document.querySelector('#rm-ov .mm-menu'), hash: location.hash }));
      ok(`${dev} : appui long au doigt → le menu s'ouvre, la conversation ne s'ouvre pas`, st.menu && st.hash === '#/messages', st);
      await page.keyboard.press('Escape'); await page.waitForTimeout(150); ok(`${dev} : Échap ferme aussi le menu ouvert au doigt`, await closed()); const gb = await (await page.$(gSel('g4'))).boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gb.x + 80, y: gb.y + 20 }] }); await page.waitForTimeout(650);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300);
      st = await ev(() => ({ items: [...document.querySelectorAll('#rm-ov .mm-it')].map(b => b.textContent.trim()), hash: location.hash }));
      ok(`${dev} : appui long au doigt sur un groupe → son menu`, st.items.includes('Supprimer le groupe') && st.hash === '#/messages', st);
      await page.waitForTimeout(700); ok(`${dev} : le menu reste ouvert après l'appui long`, !(await closed())); await page.keyboard.press('Escape');
      // un appui court ouvre toujours la conversation
      await page.tap(dmSel('a08')); await page.waitForTimeout(700);
      ok(`${dev} : un appui court ouvre toujours la conversation`, (await ev(() => location.hash)) === '#/messages/a08'); await home(); }
    else {
      // ordinateur : la page des groupes (colonne « Mes groupes ») a le même menu
      await nav(page, 'groupe', 900); m = await menu('#g-side .dm-row.g-row[href="#/groupe/g4"]');
      ok(`${dev} : clic droit sur un groupe dans la colonne « Mes groupes »`, !!m && m.items.includes('Supprimer le groupe') && m.inView, m); await page.keyboard.press('Escape'); }
    // ---- les réglages sont gardés sur l'appareil après rechargement
    await ev(() => { toggleMute('c', 'a08'); }); await open(page, tel ? 'messages' : 'messages/a08', 3200);
    st = await ev(() => ({ mute: rowPrefs().mute, gp: rowPrefs().gpins, cleared: Object.keys(rowPrefs().cleared) }));
    ok(`${dev} : après rechargement, sourdine, épingle de groupe et conversation supprimée sont gardées`, st.mute.includes('c:a08') && st.gp.join() === 'g4' && st.cleared.join() === 'a03', st);
    const ov = await overflow(page); ok(`${dev} : rien ne déborde`, ov.scrollW <= ov.w && !ov.bad.length, ov);
    ok(`${dev} : aucune erreur`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n')); const bad = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(bad ? `${bad} échec(s)` : 'Tout est bon.');
})();

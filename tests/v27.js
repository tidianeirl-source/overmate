// v27 (version 61) — pages plus serrées, statut « Joue à… », rôles colorés, onglet Communautés.
// 1. Téléphone : la liste des messages va d'un bord à l'autre ; l'heure d'un message texte est sur sa ligne ; les autres messages gardent l'heure dessous.
// 2. Ordinateur : la messagerie colle aux bords (pas de carte flottante), le champ pour écrire reste visible en bas.
// 3. Statut « Joue à… » : il suit « Je suis dispo ». Rôles : le créateur et les modos d'un groupe ont leur couleur.
// 4. Communauté › Communautés : les groupes publics en cartes, catégories, recherche, tri, aperçu et « Rejoindre ».
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const OUT = process.env.OUT || 'shots-v27'; const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined && !c ? ' → ' + JSON.stringify(x).slice(0, 500) : ''));
const G = [['Les lions de Free Fire', 'Free Fire', 'Ranked tous les soirs.', 12], ['eFootball CI', 'eFootball', 'Tournois chaque week-end.', 9], ['COD Mobile 225', 'Call of Duty Mobile', 'Multi et Battle Royale.', 20], ['Chill & discute', '', 'On parle de tout.', 15], ['Free Fire débutants', 'Free Fire', '', 5], ['Privé caché', 'Free Fire', 'ne doit pas apparaître', 30]];
const mk = () => { const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a05', 'a07'].forEach(u => { db['requests/' + u + '_a01'] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['profiles/a02'].dispo = null; db['profiles/a03'].dispo = { game: 'Free Fire', note: '', since: now - 600e3, until: now + 2 * 3600e3 }; db['profiles/a07'].dispo = { game: 'Roblox', note: '', since: now - 9e6, until: now - 3600e3 };   // a07 : dispo terminée
  db['groups/g3'] = { name: 'MODO', desc: '', game: '', image: '', private: true, owner: 'a03', mods: ['a05'], members: ['a01', 'a03', 'a05', 'a07'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 1000 };
  [['a03', 'Salut la team'], ['a05', 'On joue ce soir ?'], ['a07', 'Oui !'], ['a01', 'Ok']].forEach(([f, t], i) => { db['groups/g3/messages/x' + i] = { from: f, text: t, at: now - (10 - i) * 600e3 }; });
  [['a03', 'Salut, tu joues ce soir ?'], ['a01', 'Oui vers 21 h'], ['a03', '😂'], ['a03', 'Je me connecte dans 10 minutes, le temps de finir de manger et de recharger la manette']].forEach(([f, t], i) => { db['chats/a01_a03/messages/x' + i] = { from: f, text: t, at: now - (10 - i) * 600e3 }; });
  db['chats/a01_a03/messages/xc'] = { from: 'a03', text: '📞 Appel vocal', call: { k: 'audio', s: 'ok', d: 60 }, at: now - 100e3 };
  G.forEach(([name, game, desc, n], i) => { const mem = Array.from({ length: n }, (_, k) => 'a' + String(10 + k).padStart(2, '0')); db['groups/c' + i] = { name, desc, game, image: '', private: i === 5, owner: mem[0], mods: [], members: mem, invited: [], kicked: i === 3 ? [] : [], ageGroup: 'adult', at: now - (i + 1) * 864e5, lastAt: now - (6 - i) * 3600e3 }; });
  return sd; };
(async () => {
  for (const [W, H, dev] of [[360, 740, 'tel'], [1280, 800, 'pc']]) {
    const tel = W < 800; const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel }); const ev = (f, a) => page.evaluate(f, a);
    const sd = mk(); await seed(page, sd.db, sd.users); await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await ev(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    // ---- 1 et 2 : messagerie
    if (tel) { await nav(page, 'messages', 900);
      const l = await ev(() => { const r = document.querySelector('.sn-row').getBoundingClientRect(), a = document.querySelector('.sn-row .sn-av > *').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, h: Math.round(r.height), av: Math.round(a.width) }; });
      ok(`${dev} : la liste des messages va d'un bord à l'autre de l'écran`, l.left === 0 && l.right === l.w, l);
      ok(`${dev} : lignes moins hautes (62 px au lieu de 78), photo de 46 px`, l.h <= 64 && l.h >= 56 && l.av === 46, l); }
    await nav(page, 'messages/a03', 1200);
    const b = await ev(() => [...document.querySelectorAll('#chatbox .bubble')].map(x => { const t = x.querySelector(':scope > span, :scope > .msg-del'), s = x.querySelector(':scope > small'); const tr = t ? t.getBoundingClientRect() : null, sr = s.getBoundingClientRect(); return { txt: x.classList.contains('b-txt'), same: tr ? sr.top < tr.bottom - 2 : false, below: tr ? sr.top >= tr.bottom - 2 : true, h: Math.round(x.getBoundingClientRect().height), lines: tr ? Math.round(tr.height / 20) : 0 }; }));
    ok(`${dev} : message texte court → l'heure est sur la même ligne (bulle d'environ 36 px)`, b[0].txt && b[0].same && b[0].h <= 40 && b[1].same, b.slice(0, 2));
    ok(`${dev} : gros emoji et appel → l'heure reste dessous`, !b[2].txt && !b[4].txt, [b[2], b[4]]);
    ok(`${dev} : long message → le texte passe à la ligne, l'heure reste dans la bulle`, b[3].txt && b[3].h > 44, b[3]);
    const lay = await ev(() => { const f = document.querySelector('.chat-form').getBoundingClientRect(), box = document.getElementById('chatbox').getBoundingClientRect(), last = [...document.querySelectorAll('#chatbox .bubble')].pop().getBoundingClientRect(), side = document.getElementById('dm-side'); return { formBottom: Math.round(f.bottom), vh: innerHeight, gap: Math.round(box.bottom - last.bottom), sideLeft: side && side.offsetParent ? Math.round(side.getBoundingClientRect().left) : null, sideTop: side && side.offsetParent ? Math.round(side.getBoundingClientRect().top) : null, radius: side ? getComputedStyle(side).borderTopLeftRadius : '' }; });
    ok(`${dev} : le champ pour écrire est en bas de l'écran, entièrement visible, et le dernier message est juste au-dessus`, lay.formBottom <= lay.vh && lay.formBottom >= lay.vh - 2 && lay.gap <= 20, lay);
    if (!tel) ok(`${dev} : la liste des conversations colle à la colonne de gauche et au haut de la fenêtre, sans coins arrondis`, lay.sideLeft === 76 && lay.sideTop === 0 && lay.radius === '0px', lay);
    await page.screenshot({ path: `${OUT}/${dev}-1-conversation.png` });
    // ---- 3 : statut et rôles
    const st = await ev(() => ({ head: (document.querySelector('.chat-head .play-st') || {}).textContent || '', online: !!document.querySelector('.chat-head .chat-who .online') }));
    ok(`${dev} : en-tête de la conversation → « Joue à Free Fire » (le mate est dispo pour Free Fire)`, st.head.trim() === 'Joue à Free Fire', st);
    await nav(page, 'messages/a07', 1000);
    ok(`${dev} : dispo terminée → pas de statut, « En ligne » ou « Hors ligne » comme avant`, await ev(() => !document.querySelector('.chat-head .play-st') && /En ligne|Hors ligne/.test(document.querySelector('.chat-head .chat-who').textContent)));
    await nav(page, tel ? 'messages' : 'messages/a07', 900);
    const rows = await ev(t => [...document.querySelectorAll(t ? '.sn-row:not(.grp):not(.sn-more)' : '#dm-side .dm-row')].map(r => ({ n: r.querySelector('b span').textContent, mk: !!r.querySelector('.play-mk'), line: (r.querySelector(t ? '.sn-st .t' : '.muted') || {}).textContent })), tel);
    const r3 = rows.find(r => r.n === 'DjeliSniper'), r5 = rows.find(r => r.n === 'YaoRush');
    ok(`${dev} : dans la liste, le mate dispo a sa petite manette ; un mate sans message et dispo affiche « Joue à… »`, !!r3 && r3.mk && !!r5 && !r5.mk, rows);
    await nav(page, 'groupe/g3', 1200);
    const ro = await ev(() => { const f = [...document.querySelectorAll('.g-from')].map(x => ({ t: x.textContent.trim(), c: getComputedStyle(x).color, cls: x.className })); const base = getComputedStyle(document.querySelector('.g-from:not(.r-admin):not(.r-mod)')).color; return { f, base }; });
    const ad = ro.f.find(x => /r-admin/.test(x.cls)), mo = ro.f.find(x => /r-mod/.test(x.cls));
    ok(`${dev} : dans le groupe, le créateur et le modo ont chacun leur couleur, différente des autres membres`, !!ad && !!mo && ad.c !== mo.c && ad.c !== ro.base && mo.c !== ro.base && /Admin/i.test(ad.t) && /Modo/i.test(mo.t), ro);
    await ev(() => groupInfo('g3')); await page.waitForTimeout(400);
    const mem = await ev(() => [...document.querySelectorAll('.g-members .nrow')].map(r => ({ t: r.querySelector('b').textContent.trim(), cls: r.querySelector('b').className, play: (r.querySelector('.play-st') || {}).textContent || '' })));
    ok(`${dev} : liste des membres → couleurs des rôles et statut « Joue à… »`, mem.some(m => m.cls === 'r-admin' && /Joue à Free Fire/.test(m.play)) && mem.some(m => m.cls === 'r-mod') && mem.some(m => !m.cls), mem);
    await page.screenshot({ path: `${OUT}/${dev}-2-membres.png` }); await ev(() => document.getElementById('dlg').close());
    // ---- 4 : communautés
    await nav(page, 'groupes', 1200);
    let c = await ev(() => ({ tab: (document.querySelector('.board-tabs [aria-selected="true"]') || {}).textContent, cards: [...document.querySelectorAll('.cm-card h3')].map(x => x.textContent), cats: [...document.querySelectorAll('[data-cm-cat]')].map(x => x.textContent.trim()), mine: [...document.querySelectorAll('.cm-mine-it b')].map(x => x.textContent), hero: (document.querySelector('.cm-title') || {}).textContent }));
    ok(`${dev} : l'onglet Communauté s'ouvre sur « Communautés », avec le grand titre`, /Communautés/.test(c.tab) && /Trouve ta communauté/.test(c.hero), c);
    ok(`${dev} : les groupes publics en cartes, triés par nombre de membres ; le groupe privé n'y est pas`, c.cards.join('|') === 'COD Mobile 225|Chill & discute|Les lions de Free Fire|eFootball CI|Free Fire débutants', c.cards);
    ok(`${dev} : catégories = les jeux des groupes (Free Fire en premier), plus « Autres » ; mes groupes dans « Tes communautés »`, c.cats[0] === 'Toutes' && c.cats[1] === 'Free Fire' && c.cats.includes('Autres') && c.mine.join() === 'MODO', c);
    await page.screenshot({ path: `${OUT}/${dev}-3-communautes.png` });
    await ev(() => [...document.querySelectorAll('[data-cm-cat]')].find(x => x.textContent.trim() === 'Free Fire').click()); await page.waitForTimeout(200);
    ok(`${dev} : catégorie Free Fire → 2 communautés`, (await ev(() => [...document.querySelectorAll('.cm-card h3')].map(x => x.textContent))).join('|') === 'Les lions de Free Fire|Free Fire débutants');
    await ev(() => [...document.querySelectorAll('[data-cm-cat]')].find(x => x.textContent.trim() === 'Autres').click()); await page.waitForTimeout(200);
    ok(`${dev} : « Autres » → la communauté sans jeu`, (await ev(() => [...document.querySelectorAll('.cm-card h3')].map(x => x.textContent))).join('|') === 'Chill & discute');
    await ev(() => document.querySelector('[data-cm-cat=""]').click()); await page.fill('#cm-q', 'efoot'); await page.waitForTimeout(200);
    ok(`${dev} : recherche « efoot » → eFootball CI`, (await ev(() => [...document.querySelectorAll('.cm-card h3')].map(x => x.textContent))).join('|') === 'eFootball CI');
    await page.fill('#cm-q', 'zzzz'); await page.waitForTimeout(200);
    ok(`${dev} : recherche sans résultat → un message clair`, /Aucune communauté ne correspond/.test(await ev(() => document.getElementById('cm-grid').textContent)));
    await page.fill('#cm-q', ''); await page.waitForTimeout(200); await ev(() => document.querySelector('[data-cm-sort="active"]').click()); await page.waitForTimeout(200);
    ok(`${dev} : tri « Plus actives » → la plus récente d'abord`, (await ev(() => document.querySelector('.cm-card h3').textContent)) === 'Free Fire débutants');
    const ov = await overflow(page); ok(`${dev} : rien ne déborde`, ov.scrollW <= ov.w && !ov.bad.length, ov);
    await ev(() => [...document.querySelectorAll('.cm-card')].find(x => /eFootball CI/.test(x.textContent)).click()); await page.waitForTimeout(400);
    const pv = await ev(() => { const d = document.getElementById('dlg'); return { open: d.open, txt: d.textContent, join: !!d.querySelector('#cm-join') }; });
    ok(`${dev} : toucher une carte → aperçu avec la description, des membres et « Rejoindre »`, pv.open && /eFootball CI/.test(pv.txt) && /Tournois chaque week-end/.test(pv.txt) && pv.join, pv);
    await page.screenshot({ path: `${OUT}/${dev}-4-apercu.png` });
    await page.click('#cm-join'); await page.waitForTimeout(1200);
    const j = await ev(() => ({ hash: location.hash, members: window.__mock.db['groups/c1'].members.includes('a01'), keys: Object.keys(window.__mock.db['groups/c1']).sort().join() }));
    ok(`${dev} : « Rejoindre » → je deviens membre et le groupe s'ouvre (le groupe garde exactement les mêmes champs)`, j.hash === '#/groupe/c1' && j.members && j.keys === 'ageGroup,at,desc,game,image,invited,kicked,lastAt,members,mods,name,owner,private', j);
    await nav(page, 'groupes/annonces', 900); ok(`${dev} : les annonces sont toujours là`, await ev(() => /Annonces/.test((document.querySelector('.board-tabs [aria-selected="true"]') || {}).textContent) && !!document.querySelector('.annonce')));
    await nav(page, 'groupes/tournois', 700); const t1 = await ev(() => !!document.querySelector('.tournoi')); await nav(page, 'groupes/sessions', 700);
    ok(`${dev} : les tournois et les sessions aussi`, t1 && await ev(() => !!document.querySelector('.squad')));
    ok(`${dev} : aucune erreur`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n')); const bad = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(bad ? `${bad} échec(s)` : 'Tout est bon.');
})();

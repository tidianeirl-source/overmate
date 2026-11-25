// v20 — Sur téléphone : les groupes dans Messages (une seule liste, comme sur Snapchat), le Profil à la place de Groupes
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const out = []; const ok = (name, cond, extra) => out.push((cond ? 'OK   ' : 'ÉCHEC') + ' ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 700) : ''));
function mkDb() {
  const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a04', 'a05', 'a09'].forEach(u => { db[`requests/${u}_a01`] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['requests/k01_a01'] = { from: 'k01', to: 'a01', participants: ['k01', 'a01'], status: 'accepted', at: now - 9e6 };
  db['private/a01'].pins = ['a05'];   // un mate épinglé : il reste tout en haut, même au-dessus des groupes
  db['notifications/a01/items/n1'] = { type: 'message', from: 'a02', text: 'AwaBuild : On joue ce soir ?', at: now - 60e3, read: false };
  db['groups/g1'] = { name: 'Les lions de Free Fire', desc: 'Ranked tous les soirs.', game: 'Free Fire', image: '', private: false, owner: 'a04', mods: [], members: ['a04', 'a05'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6 };
  db['groups/g2'] = { name: 'Team privée eFootball', desc: '', game: 'eFootball', image: '', private: true, owner: 'a02', mods: [], members: ['a02', 'a08'], invited: ['a01'], kicked: [], ageGroup: 'adult', at: now - 4e6 };
  db['groups/g3'] = { name: 'Mes potes du campus', desc: '', game: '', image: '', private: true, owner: 'a03', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 1000 };
  db['groups/g4'] = { name: 'Valorant du dimanche', desc: '', game: 'Valorant', image: '', private: false, owner: 'a01', mods: [], members: ['a01', 'a05', 'a09'], invited: [], kicked: [], ageGroup: 'adult', at: now - 8e6, lastAt: now - 5 * 3600e3 };
  db['groups/g3/messages/x1'] = { from: 'a03', text: 'Salut la team', at: now - 60e3 };
  return sd;
}
async function setup(o, skin = 'defaut', user = 'a01') {
  const { browser, page, log, context } = await launch(o);
  const sd = mkDb();
  await seed(page, sd.db, sd.users);
  await open(page, 'accueil', 700);
  await page.evaluate(u => window.__mock.signIn(u + '@test.ci'), user); await page.waitForTimeout(2600);
  await page.evaluate(s => { const d = document.getElementById('dlg'); if (d.open) d.close(); applySkin(s); route(); }, skin); await page.waitForTimeout(400);
  return { browser, page, log, context };
}
const ev = (page, f, a) => page.evaluate(f, a);
const listState = page => ev(page, () => { const vis = e => !!e && !e.hidden && e.getClientRects().length > 0;
  return { rows: [...document.querySelectorAll('#sn-list .sn-row')].filter(vis).map(a => a.getAttribute('href')), inv: vis(document.getElementById('sn-inv')) ? [...document.querySelectorAll('#sn-inv [data-gjoin]')].map(b => b.dataset.gjoin) : [],
    none: vis(document.getElementById('sn-none')) ? document.getElementById('sn-none').textContent : '', chip: (document.querySelector('[data-snf][aria-pressed="true"]') || {}).dataset?.snf,
    badge: (document.querySelector('#tabbar [data-nav="messages"] .tb-badge') || {}).textContent || '', hash: location.hash }; });
(async () => {
  for (const skin of (process.env.SKINS || 'defaut,sombre').split(',')) {
    const { browser, page, log } = await setup({ width: 360, height: 740, mobile: true, touch: true }, skin);
    // la barre du bas
    const tb = await ev(page, () => [...document.querySelectorAll('#tabbar a')].map(a => a.dataset.nav + (a.querySelector('.tb-ico > .av') ? '(photo)' : '')));
    ok(`${skin} · barre du bas : Matchs, Commu, Accueil, Messages, Profil (avec ta photo), plus de Groupes`, tb.join() === 'matchs,groupes,accueil,messages,profil(photo)', tb);
    await nav(page, 'messages', 1000);
    // la pastille de l'onglet Messages compte les messages, les groupes avec du nouveau et les invitations
    const bd = await ev(page, () => { const um = Object.values(S.unread || {}).reduce((a, b) => a + (+b || 0), 0), gk = GROUPS.filter(gUnread).length + gInvites().length; const b = document.querySelector('#tabbar [data-nav="messages"] .tb-badge'); return { um, gk, txt: b && b.textContent, label: b && b.getAttribute('aria-label'), side: (document.querySelector('.sr-nav [data-nav="messages"] .tb-badge') || {}).textContent || '' }; });
    ok(`${skin} · pastille Messages = 1 message + 2 groupes avec du nouveau + 1 invitation`, bd.um === 1 && bd.gk === 3 && bd.txt === '4' && /4 nouveautés/.test(bd.label) && bd.side === '1', bd);
    // la liste : un mate épinglé, puis le plus récent en haut, mates et groupes mêlés
    let s = await listState(page);
    ok(`${skin} · une seule liste : le mate épinglé, puis groupe / mate / groupe du plus récent au plus ancien, « Trouver un groupe » en bas`, s.rows.slice(0, 4).join() === '#/messages/a05,#/groupe/g3,#/messages/a02,#/groupe/g4' && s.rows[s.rows.length - 1] === '#/groupe' && s.rows.length === 9, s);
    ok(`${skin} · l'invitation au groupe privé est juste au-dessus de la liste`, s.inv.join() === 'g2', s.inv);
    const chips = await ev(page, () => [...document.querySelectorAll('[data-snf]')].map(c => c.dataset.snf + (c.querySelector('.cnt') ? ':' + c.querySelector('.cnt').textContent : '')));
    ok(`${skin} · filtres : Tous, Non lus (3), Groupes, En ligne, Flammes`, chips.join() === 'all,unread:3,group,online,flame', chips);
    const fab = await ev(page, () => { const f = document.querySelector('.dm-list-page .sn-fab'); const r = f.getBoundingClientRect(), t = document.getElementById('tabbar').getBoundingClientRect(); return { lbl: f.getAttribute('aria-label'), right: Math.round(innerWidth - r.right), above: Math.round(t.top - r.bottom) }; });
    ok(`${skin} · le bouton + (Créer un groupe) flotte au-dessus de la barre`, fab.lbl === 'Créer un groupe' && fab.right >= 10 && fab.right <= 24 && fab.above > 0, fab);
    // filtres
    await page.click('[data-snf="group"]'); await page.waitForTimeout(150); s = await listState(page);
    ok(`${skin} · filtre Groupes : mes groupes, l'invitation et « Trouver un groupe »`, s.rows.join() === '#/groupe/g3,#/groupe/g4,#/groupe' && s.inv.join() === 'g2' && !s.none, s);
    await page.click('[data-snf="online"]'); await page.waitForTimeout(150); s = await listState(page);
    ok(`${skin} · filtre En ligne : aucun groupe, pas d'invitation, pas de « Trouver »`, s.rows.length >= 1 && s.rows.every(h => h.startsWith('#/messages/')) && !s.inv.length, s);
    await page.click('[data-snf="unread"]'); await page.waitForTimeout(150); s = await listState(page);
    ok(`${skin} · filtre Non lus : le mate et les 2 groupes avec du nouveau, l'invitation`, s.rows.join() === '#/groupe/g3,#/messages/a02,#/groupe/g4' && s.inv.join() === 'g2', s);
    await page.click('[data-snf="all"]'); await page.click('#sn-find'); await page.fill('#sn-q', 'potes'); await page.waitForTimeout(150); s = await listState(page);
    ok(`${skin} · recherche « potes » : le groupe seul`, s.rows.join() === '#/groupe/g3' && !s.inv.length, s);
    await page.click('#sn-find'); await page.waitForTimeout(100);
    // le filtre reste quand la page se redessine (nouvelles données) et quand on revient d'un groupe
    await page.click('[data-snf="group"]'); await ev(page, () => route()); await page.waitForTimeout(250); s = await listState(page);
    ok(`${skin} · le filtre Groupes reste quand la liste se redessine`, s.chip === 'group' && s.rows.join() === '#/groupe/g3,#/groupe/g4,#/groupe', s);
    await ev(page, () => document.querySelector('a.sn-row[href="#/groupe/g3"]').click()); await page.waitForTimeout(800);
    const gch = await ev(page, () => { const b = document.querySelector('.chat-page .chat-head .back'); return { hash: location.hash, back: b && b.getAttribute('href'), txt: b && b.textContent.trim(), msgs: document.querySelectorAll('#chatbox .bubble').length }; });
    ok(`${skin} · un groupe s'ouvre depuis Messages ; son bouton ‹ ramène à Messages`, gch.hash === '#/groupe/g3' && gch.back === '#/messages' && gch.txt === 'Messages' && gch.msgs === 1, gch);
    await ev(page, () => history.back()); await page.waitForTimeout(800); s = await listState(page);
    ok(`${skin} · retour : toujours le filtre Groupes, le groupe lu n'a plus de pastille`, s.hash === '#/messages' && s.chip === 'group' && s.badge === '3', s);
    const g3u = await ev(page, () => document.querySelector('a.sn-row[href="#/groupe/g3"]').classList.contains('unread'));
    ok(`${skin} · le groupe lu n'est plus en gras`, !g3u);
    await nav(page, 'accueil', 600); await nav(page, 'messages', 800); s = await listState(page);
    ok(`${skin} · en revenant d'une autre page : tous les messages`, s.chip === 'all' && s.rows.length === 9, s);
    // la page des groupes (Trouver un groupe) : l'onglet Messages allumé, un retour vers Messages
    await ev(page, () => document.getElementById('sn-more').click()); await page.waitForTimeout(800);
    const gp = await ev(page, () => { const b = document.querySelector('.g-back .back'); return { hash: location.hash, tab: [...document.querySelectorAll('#tabbar [aria-current]')].map(a => a.dataset.nav).join(), back: b && b.getClientRects().length > 0 && b.getAttribute('href'), pub: document.querySelectorAll('.g-card').length }; });
    ok(`${skin} · « Trouver un groupe » : la page des groupes, onglet Messages allumé, retour vers Messages`, gp.hash === '#/groupe' && gp.tab === 'messages' && gp.back === '#/messages' && gp.pub === 1, gp);
    for (const [pg, w] of [['groupe', 'page des groupes'], ['messages', 'Messages']]) { await nav(page, pg, 700); const of = await overflow(page); ok(`${skin} · pas de débordement (${w})`, !of.bad.length && of.scrollW <= of.w, of); }
    // refuser l'invitation depuis Messages
    await page.click('#sn-inv [data-gdecline="g2"]'); await page.waitForTimeout(900); s = await listState(page);
    const g2 = await ev(page, () => (window.__mock.db['groups/g2'] || {}).invited || []);
    ok(`${skin} · refuser l'invitation : elle disparaît, la pastille baisse`, !s.inv.length && !g2.includes('a01') && s.badge === '2', { s, g2 });
    // une nouvelle invitation arrive pendant qu'on regarde Messages
    await ev(page, () => { const t = Date.now(); window.__mock.set('groups/g7', { name: 'Les nouveaux du soir', desc: '', game: '', image: '', private: true, owner: 'a09', mods: [], members: ['a09'], invited: ['a01'], kicked: [], ageGroup: 'adult', at: t });
      window.__mock.set('notifications/a01/items/ng7', { type: 'group', from: 'a09', gid: 'g7', text: 'Mini1 t\'invite dans le groupe « Les nouveaux du soir »', at: t, read: false }); });
    await page.waitForTimeout(1600); s = await listState(page);
    ok(`${skin} · nouvelle invitation en direct : elle apparaît dans Messages, la pastille monte`, s.inv.join() === 'g7' && s.badge === '3', s);
    // la rejoindre : on entre dans le groupe ; il est ensuite dans la liste
    await page.click('#sn-inv [data-gjoin="g7"]'); await page.waitForTimeout(1000);
    const j = await ev(page, () => ({ hash: location.hash, members: window.__mock.db['groups/g7'].members }));
    await nav(page, 'messages', 800); s = await listState(page);
    ok(`${skin} · rejoindre depuis Messages : on entre dans le groupe, puis il est dans la liste`, j.hash === '#/groupe/g7' && j.members.includes('a01') && s.rows.includes('#/groupe/g7') && !s.inv.length, { j, s });
    // un message arrive dans un groupe : en revenant sur la liste, il remonte en haut avec sa pastille
    await ev(page, () => { const g = window.__mock.db['groups/g4']; window.__mock.set('groups/g4', { ...g, lastAt: Date.now() + 2000 }); DB._lastMine = 0; });
    await nav(page, 'accueil', 500); await nav(page, 'messages', 1200); s = await listState(page);
    const g4u = await ev(page, () => { const r = document.querySelector('a.sn-row[href="#/groupe/g4"]'); return r && r.classList.contains('unread'); });
    ok(`${skin} · nouveau message dans un groupe : il remonte (après le mate épinglé), en gras`, s.rows[1] === '#/groupe/g4' && g4u, { rows: s.rows.slice(0, 4), g4u });
    // le + ouvre la création d'un groupe
    await page.click('.dm-list-page .sn-fab'); await page.waitForTimeout(500);
    const cr = await ev(page, () => ({ open: document.getElementById('dlg').open, step: (document.querySelector('#dlg .g-step') || {}).textContent || '' }));
    ok(`${skin} · le + ouvre « Créer un groupe » (étape 1)`, cr.open && /Étape 1 sur 2/.test(cr.step), cr);
    await ev(page, () => document.getElementById('dlg').close());
    // quitter un groupe sur téléphone : retour à Messages, le groupe n'y est plus
    await nav(page, 'groupe/g3', 900); await page.click('#ginfo'); await page.waitForTimeout(500);
    await page.click('#g-leave'); await page.waitForTimeout(150); await page.click('#g-leave'); await page.waitForTimeout(1200); s = await listState(page);
    ok(`${skin} · quitter un groupe : retour à Messages, il n'y est plus`, s.hash === '#/messages' && !s.rows.includes('#/groupe/g3'), s);
    // l'onglet Profil
    await page.click('#tabbar [data-nav="profil"]'); await page.waitForTimeout(800);
    const pf = await ev(page, () => ({ hash: location.hash, cur: [...document.querySelectorAll('#tabbar [aria-current]')].map(a => a.dataset.nav).join() }));
    ok(`${skin} · l'onglet Profil ouvre ton profil et s'allume`, pf.hash === '#/profil' && pf.cur === 'profil', pf);
    ok(`${skin} · erreurs JS`, !log.errors.length, log.errors);
    await browser.close();
  }
  // petits téléphones : la liste et l'en-tête tiennent
  for (const W of [320, 375]) {
    const { browser, page, log } = await setup({ width: W, height: 700, mobile: true, touch: true });
    await nav(page, 'messages', 1000);
    const of = await overflow(page); const h = await ev(page, () => { const t = document.querySelector('.sn-top h2'); return { full: t.scrollWidth <= t.clientWidth + 1, h: Math.round(t.getBoundingClientRect().height) }; });
    ok(`${W} px · Messages : pas de débordement, titre sur une ligne`, !of.bad.length && of.scrollW <= of.w && h.full && h.h < 40, { of, h });
    ok(`${W} px · erreurs JS`, !log.errors.length, log.errors);
    await browser.close();
  }
  // un joueur sans mate ni groupe : des choses à faire, et le +
  {
    const { browser, page, log } = await setup({ width: 360, height: 740, mobile: true, touch: true }, 'defaut', 'a30');
    await nav(page, 'messages', 1000);
    const e = await ev(page, () => ({ empty: !!document.querySelector('.dm-list-page .empty'), btns: [...document.querySelectorAll('.dm-list-page .empty .btn')].map(b => b.textContent.trim()), fab: !!document.querySelector('.dm-list-page .sn-fab'), inv: !!document.getElementById('sn-inv') }));
    ok('aucun mate ni groupe : « Voir mes matchs », « Trouver un groupe » et le +', e.empty && e.btns.join() === 'Voir mes matchs,Trouver un groupe' && e.fab && !e.inv, e);
    ok('erreurs JS (sans mate)', !log.errors.length, log.errors);
    await browser.close();
  }
  // ordinateur : rien ne change
  {
    const { browser, page, log } = await setup({ width: 1280, height: 800 });
    await nav(page, 'messages', 1000);
    const d = await ev(page, () => { const vis = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).length;
      return { grpRows: vis('.sn-row.grp'), fab: vis('.sn-fab'), chips: vis('[data-snf]'), rail: vis('#sr-groups .dm-ico'), tab: getComputedStyle(document.getElementById('tabbar')).display, nav: [...document.querySelectorAll('.sr-nav a')].map(a => a.dataset.nav).join(), empty: (document.querySelector('.dm-empty p') || {}).textContent }; });
    ok('ordinateur : Messages inchangé (pas de groupes dans la liste, groupes dans la colonne) ; v23 — plus d\'onglet Groupes, le texte parle des ronds et du « + »', !d.grpRows && !d.fab && !d.chips && d.rail >= 3 && d.tab === 'none' && d.nav === 'accueil,matchs,groupes,messages,profil' && /ronds tout à gauche/.test(d.empty) && /« \+ »/.test(d.empty), d);
    await nav(page, 'groupe/g3', 900);
    const g = await ev(page, () => ({ back: getComputedStyle(document.querySelector('.chat-head .back')).display, side: !!document.querySelector('#g-side .dm-row.on') }));
    await nav(page, 'groupe', 900);
    const gb = await ev(page, () => getComputedStyle(document.querySelector('.g-back')).display);
    ok('ordinateur : groupe ouvert à droite, pas de bouton retour, pas de retour vers Messages sur la page des groupes', g.back === 'none' && g.side && gb === 'none', { g, gb });
    ok('erreurs JS (ordinateur)', !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n'));
  const ko = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(ko ? ko + ' échec(s)' : 'tout est bon');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

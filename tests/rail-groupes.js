// v23 — Colonne de gauche (ordinateur) sans l'onglet Groupes : les ronds des groupes et le « + » suffisent.
// Le « + » crée un groupe ; avec des invitations, il porte une pastille et mène à la page des groupes (invitations en haut).
const { launch, seed, open, nav, mkSeed } = require('./lib');
const OUT = process.env.OUT || 'shots-railg', SKIN = process.env.SKIN || ''; const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined ? ' → ' + JSON.stringify(x).slice(0, 420) : ''));
function seedGroups() {
  const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a04', 'a05', 'a09'].forEach(u => { db[`requests/${u}_a01`] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['groups/g1'] = { name: 'Les lions de Free Fire', desc: 'Ranked tous les soirs.', game: 'Free Fire', image: '', private: false, owner: 'a04', mods: [], members: ['a04', 'a05'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6 };
  db['groups/g2'] = { name: 'Team privée eFootball', desc: '', game: 'eFootball', image: '', private: true, owner: 'a02', mods: [], members: ['a02', 'a08'], invited: ['a01'], kicked: [], ageGroup: 'adult', at: now - 4e6 };
  db['groups/g3'] = { name: 'Mes potes du campus', desc: '', game: '', image: '', private: true, owner: 'a03', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 1000 };
  db['groups/g4'] = { name: 'Valorant du dimanche', desc: '', game: 'Valorant', image: '', private: false, owner: 'a01', mods: [], members: ['a01', 'a05', 'a09'], invited: [], kicked: [], ageGroup: 'adult', at: now - 8e6, lastAt: now - 5 * 3600e3 };
  db['groups/g3/messages/x1'] = { from: 'a03', text: 'Salut la team', at: now - 60e3 };
  return sd;
}
const rail = page => page.evaluate(() => { const pl = document.querySelector('#sr-groups .dm-ico.plus');
  return { nav: [...document.querySelectorAll('.sr-nav a')].map(a => a.dataset.nav), groupes: [...document.querySelectorAll('#sr-groups .dm-ico:not(.plus)')].map(a => a.getAttribute('href')),
    plus: pl ? { href: pl.getAttribute('href'), titre: pl.title, aria: pl.getAttribute('aria-label'), pastille: (pl.querySelector('.dm-dot') || {}).textContent || '', on: pl.classList.contains('on'), cur: pl.getAttribute('aria-current') } : null,
    msgBadge: (document.querySelector('.sr-nav [data-nav="messages"] .tb-badge') || {}).textContent || '', hash: location.hash, railVisible: getComputedStyle(document.getElementById('siderail')).display }; });
(async () => {
  // ---------- ordinateur ----------
  if (process.env.PART !== 'petits') {
    const { browser, page, log } = await launch({ width: 1440, height: 900 });
    const sd = seedGroups(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await page.evaluate(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    if (SKIN) { await page.evaluate(s => { S.owned = { pack: true }; applySkin(s, false, { preview: true }); const b = document.getElementById('pv-bar'); if (b) b.hidden = true; route(); }, SKIN); await page.waitForTimeout(400); }
    await nav(page, 'messages', 1400);
    let r = await rail(page);
    ok('ordinateur : plus d\'onglet Groupes dans la colonne', r.railVisible === 'flex' && !r.nav.includes('groupe') && r.nav.join() === 'accueil,matchs,groupes,messages,profil', r);
    ok('ordinateur : mes groupes en ronds (le plus récent en haut), puis le « + »', r.groupes.join() === '#/groupe/g3,#/groupe/g4' && !!r.plus, r);
    ok('« + » avec une invitation : pastille 1, il mène à la page des groupes', r.plus && r.plus.pastille === '1' && r.plus.href === '#/groupe' && /1 invitation/.test(r.plus.aria), r);
    await page.screenshot({ path: `${OUT}/${SKIN || 'defaut'}-1-messages.png` });
    await page.click('#sr-groups .dm-ico.plus'); await page.waitForTimeout(1200);
    r = await rail(page);
    const inv = await page.evaluate(() => ({ titre: [...document.querySelectorAll('#app h3')].map(h => h.textContent).filter(t => /Invitations/.test(t)), rows: [...document.querySelectorAll('#app .g-inv b')].map(b => b.textContent), dlg: document.getElementById('dlg').open }));
    ok('clic sur « + » : la page des groupes, l\'invitation en haut (Rejoindre, Refuser), pas de fenêtre ouverte', r.hash === '#/groupe' && inv.titre.length === 1 && inv.rows.join() === 'Team privée eFootball' && !inv.dlg, { r, inv });
    ok('sur la page des groupes, le « + » est marqué comme la page ouverte', r.plus && r.plus.on && r.plus.cur === 'page', r.plus);
    await page.screenshot({ path: `${OUT}/${SKIN || 'defaut'}-2-page-groupes.png` });
    await page.click('[data-gdecline="g2"]'); await page.waitForTimeout(1200);
    r = await rail(page);
    ok('invitation refusée : la pastille disparaît, le « + » crée un groupe', r.plus && !r.plus.pastille && r.plus.href === '#/groupe/nouveau' && r.plus.aria === 'Créer un groupe', r.plus);
    // une invitation qui arrive pendant qu'on est ailleurs : la pastille apparaît sans changer de page
    await nav(page, 'accueil', 900);
    await page.evaluate(() => { const g = GROUPS.find(x => x.id === 'g1'); g.invited = [...(g.invited || []), DB.uid()]; renderNotifBadge(); });
    r = await rail(page);
    ok('une invitation arrive : pastille 1 sur le « + », sans recharger la page', r.plus && r.plus.pastille === '1' && r.plus.href === '#/groupe' && r.hash === '#/accueil', r.plus);
    await page.evaluate(() => { const g = GROUPS.find(x => x.id === 'g1'); g.invited = g.invited.filter(u => u !== DB.uid()); renderNotifBadge(); });
    r = await rail(page);
    ok('…et elle part quand l\'invitation n\'est plus là', r.plus && !r.plus.pastille && r.plus.href === '#/groupe/nouveau', r.plus);
    // le « + » sans invitation : la création d'un groupe s'ouvre
    await page.click('#sr-groups .dm-ico.plus'); await page.waitForTimeout(1200);
    let d = await page.evaluate(() => ({ open: document.getElementById('dlg').open, txt: (document.querySelector('#dlg h3') || {}).textContent || '', hash: location.hash }));
    r = await rail(page);
    ok('clic sur « + » sans invitation : la création d\'un groupe s\'ouvre, le « + » est marqué', d.open && /groupe/i.test(d.txt) && d.hash === '#/groupe' && r.plus.on, { d, plus: r.plus });
    await page.screenshot({ path: `${OUT}/${SKIN || 'defaut'}-3-creer.png` });
    await page.evaluate(() => document.getElementById('dlg').close()); await page.waitForTimeout(300);
    // ouvrir un groupe depuis son rond
    await page.click('#sr-groups a[href="#/groupe/g3"]'); await page.waitForTimeout(1500);
    r = await rail(page);
    const g3 = await page.evaluate(() => ({ on: document.querySelector('#sr-groups a[href="#/groupe/g3"]').classList.contains('on'), nom: (document.querySelector('.chat-head b, .chat-who b') || {}).textContent || '' }));
    ok('clic sur un rond : le groupe s\'ouvre, son rond est marqué, le « + » ne l\'est plus', r.hash === '#/groupe/g3' && g3.on && !r.plus.on && /campus/.test(g3.nom), { r: r.plus, g3 });
    await page.screenshot({ path: `${OUT}/${SKIN || 'defaut'}-4-groupe.png` });
    ok('ordinateur : aucune erreur', !log.errors.length, log.errors);
    await browser.close();
  }
  // ---------- petite tablette (999 px) et téléphone : rien ne change ----------
  for (const [W, H, dev] of [[999, 760, 'tablette'], [390, 844, 'téléphone']]) {
    const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
    const sd = seedGroups(); await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await page.evaluate(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    await nav(page, 'accueil', 1000);
    const t = await page.evaluate(() => ({ rail: getComputedStyle(document.getElementById('siderail')).display, menu: [...document.querySelectorAll('.top .navpill a')].filter(a => a.offsetParent).map(a => a.dataset.nav), tabs: [...document.querySelectorAll('#tabbar a')].filter(a => a.offsetParent).map(a => a.dataset.nav),
      badgeG: (document.querySelector('.top .navpill [data-nav="groupe"] .tb-badge') || {}).textContent || '', badgeM: (document.querySelector('#tabbar [data-nav="messages"] .tb-badge') || {}).textContent || '' }));
    if (W >= 800) ok(`${dev} : pas de colonne ; le menu du haut garde Groupes, avec sa pastille`, t.rail === 'none' && t.menu.includes('groupe') && t.badgeG === '3', t);
    else ok(`${dev} : pas de colonne ; barre du bas inchangée, Messages compte les groupes et l'invitation`, t.rail === 'none' && t.tabs.join() === 'matchs,groupes,accueil,messages,profil' && t.badgeM === '3', t);
    ok(`${dev} : aucune erreur`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n')); const ko = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(ko ? ko + ' échec(s)' : 'tout est bon');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

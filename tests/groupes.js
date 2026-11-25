// Onglet Groupes séparé des messages + création d'un groupe en 2 étapes avec les mates
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const W = +(process.env.W || 1280), H = +(process.env.H || 800), SHOT = process.env.SHOT || '', SKIN = process.env.SKIN || '';
(async () => {
  const mobile = W < 1000;
  const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  ['a02', 'a03', 'a04', 'a05', 'a09'].forEach(u => { db[`requests/${u}_a01`] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  db['requests/k01_a01'] = { from: 'k01', to: 'a01', participants: ['k01', 'a01'], status: 'accepted', at: now - 9e6 };
  db['chats/a01_a02/messages/m1'] = { from: 'a02', text: 'On joue ce soir ?', at: now - 3600e3 };
  db['groups/g1'] = { name: 'Les lions de Free Fire', desc: 'Ranked tous les soirs.', game: 'Free Fire', image: '', private: false, owner: 'a04', mods: [], members: ['a04', 'a05'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6 };
  db['groups/g2'] = { name: 'Team privée eFootball', desc: '', game: 'eFootball', image: '', private: true, owner: 'a02', mods: [], members: ['a02', 'a08'], invited: ['a01'], kicked: [], ageGroup: 'adult', at: now - 4e6 };
  db['groups/g3'] = { name: 'Mes potes du campus', desc: '', game: '', image: '', private: true, owner: 'a03', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 1000 };
  db['groups/g3/messages/x1'] = { from: 'a03', text: 'Salut la team', at: now - 60e3 };
  await seed(page, db, sd.users);
  let bad = 0; const out = [];
  const check = (cond, msg) => { if (!cond) { bad++; out.push('   ✗ ' + msg); } else out.push('   ✓ ' + msg); };
  const step = async (name, fn, wait = 450) => { try { if (fn) await fn(); await page.waitForTimeout(wait); const o = await overflow(page); const errs = log.errors.splice(0);
      const ko = o.scrollW > o.w + 1 || o.bad.length || errs.length; if (ko) bad++; out.push((ko ? '⚠ ' : 'ok ') + name + (ko ? ' ' + JSON.stringify({ ...o, errs }).slice(0, 400) : ''));
      if (SHOT) await page.screenshot({ path: `${SHOT}/${W}-${String(out.length).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }); }
    catch (e) { bad++; out.push('⚠ ' + name + ' EXCEPTION ' + String(e.message).slice(0, 300)); } };
  const ev = (f, a) => page.evaluate(f, a);
  const GB = mobile ? '[data-nav="groupe"] .tb-badge' : '#sr-groups .dm-ico.plus .dm-dot';   // v23 — ordinateur : plus d'onglet Groupes dans la colonne, les invitations sont sur le « + »
  await open(page, '', 600);
  await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
  await ev(() => { const d = document.getElementById('dlg'); if (d.open) d.close(); });
  if (SKIN) { await ev(s => { applySkin(s); route(); }, SKIN); await page.waitForTimeout(300); }
  await step('onglet Groupes dans la navigation', async () => {
    const r = await ev(gb => ({ tabs: [...document.querySelectorAll(innerWidth >= 1000 ? '.sr-nav a' : '#tabbar a')].map(a => a.dataset.nav), badge: (document.querySelector(gb) || {}).textContent || '' }), GB);
    out.push('   onglets : ' + r.tabs.join(', ') + ' · pastille ' + (mobile ? 'Groupes' : 'du +') + ' : ' + r.badge);
    if (mobile) { check(r.tabs.includes('groupe') && r.tabs.indexOf('groupe') === r.tabs.indexOf('messages') + 1, 'un onglet « Groupes » juste après Messages');
      check(r.badge === '2', 'pastille : 1 invitation + 1 groupe avec du nouveau'); }
    else { check(!r.tabs.includes('groupe') && r.tabs.includes('messages'), 'v23 — pas d\'onglet « Groupes » dans la colonne : les ronds des groupes et le « + » suffisent');
      check(r.badge === '1', 'pastille du « + » : 1 invitation'); } });
  await step(mobile ? 'Messages : les mates et les groupes (téléphone)' : 'Messages : seulement les mates (ordinateur)', async () => { await nav(page, 'messages', 700);
    const r = await ev(() => { const vis = sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).length;   // v20 — sur ordinateur, la liste du téléphone est dans la page mais cachée
      return { grp: vis('#dm-side .g-row, .sn-row.grp'), chip: vis('[data-snf="group"]'), fab: vis('.sn-fab'), cur: (document.querySelector('[aria-current="page"][data-nav]') || {}).dataset?.nav }; });
    if (mobile) check(r.grp >= 1 && r.chip && r.fab, 'groupes dans la liste, filtre Groupes, bouton +'); else check(!r.grp && !r.chip && !r.fab, 'aucun groupe, ni filtre Groupes, ni bouton +'); check(r.cur === 'messages', 'onglet Messages allumé'); });
  await step('page Groupes', async () => { await nav(page, 'groupe', 800);
    const r = await ev(() => ({ cur: (document.querySelector('[aria-current="page"][data-nav]') || {}).dataset?.nav, side: [...document.querySelectorAll('#g-side .dm-row')].map(a => a.textContent.trim().slice(0, 30)), inv: document.querySelectorAll('.g-inv').length, pub: document.querySelectorAll('.g-card').length, mine: document.querySelectorAll('.g-mine-sec .sn-row').length, create: document.querySelectorAll('[data-g-new]').length, dmSide: !!document.getElementById('dm-side') }));
    out.push('   ' + JSON.stringify(r));
    check(r.cur === 'groupe', 'onglet Groupes allumé'); check(!r.dmSide, 'pas la colonne des messages privés'); check(r.inv === 1, 'invitation visible'); check(r.pub === 1, 'groupe public visible'); check(r.create >= 1, 'bouton « Créer un groupe »');
    if (!mobile) check(r.side.length >= 3 && /Créer un groupe/.test(r.side[0]), 'colonne de gauche : Créer, Trouver, mes groupes'); else check(r.mine === 1, 'mes groupes dans la page'); }, 300);
  await step('ancienne adresse #/groupes/groupes', async () => { await nav(page, 'groupes/groupes', 800); const h = await ev(() => location.hash); check(h === '#/groupe', 'redirigée vers #/groupe (' + h + ')'); });
  await step('création : étape 1', async () => { await ev(() => document.querySelector('[data-g-new]').click()); await page.waitForTimeout(400);
    const r = await ev(() => ({ step: (document.querySelector('#dlg .g-step') || {}).textContent, ok: (document.getElementById('g-ok') || {}).textContent }));
    check(/Étape 1 sur 2/.test(r.step || ''), 'étape 1 sur 2 affichée'); check(/ajouter des mates/i.test(r.ok || ''), 'bouton « Suivant : ajouter des mates »'); });
  await step('création : nom trop court', async () => { await page.fill('#g-n', 'ab'); await page.click('#g-ok'); await page.waitForTimeout(200); const e = await ev(() => document.getElementById('g-e').textContent); check(/3 caractères/.test(e), 'message clair : ' + e); }, 200);
  await step('création : étape 2 (les mates)', async () => { await page.fill('#g-n', 'Squad du samedi'); await ev(() => { document.querySelector('[name=g-p][value="1"]').checked = true; }); await page.click('#g-ok'); await page.waitForTimeout(400);
    const r = await ev(() => ({ step: (document.querySelector('#dlg .g-step') || {}).textContent, mates: [...document.querySelectorAll('#dlg .g-pick input')].map(i => i.value), ok: document.getElementById('g-ok').textContent }));
    out.push('   mates proposés : ' + r.mates.join(','));
    check(/Étape 2 sur 2/.test(r.step || ''), 'étape 2 sur 2 affichée'); check(r.mates.length === 6, 'tous mes mates sont proposés (6)'); check(r.ok === 'Créer le groupe', 'bouton « Créer le groupe »'); });
  await step('création : cocher 2 mates', async () => { await ev(() => { const ins = document.querySelectorAll('#dlg .g-pick input'); [ins[0], ins[2]].forEach(i => { i.checked = true; i.dispatchEvent(new Event('change')); }); });
    const t = await ev(() => document.getElementById('g-ok').textContent); check(t === 'Créer le groupe et ajouter 2 mates', 'bouton : ' + t); }, 200);
  await step('création : retour puis suivant garde tout', async () => { await page.click('#g-back'); await page.waitForTimeout(250); const n = await ev(() => document.getElementById('g-n').value); check(n === 'Squad du samedi', 'le nom est gardé');
    await page.click('#g-ok'); await page.waitForTimeout(300); const k = await ev(() => document.querySelectorAll('#dlg .g-pick input:checked').length); check(k === 2, 'les 2 mates restent cochés'); }, 200);
  await step('création : groupe créé', async () => { const w0 = await ev(() => window.__mock.writes.length); await page.click('#g-ok'); await page.waitForTimeout(1500);
    const r = await ev(w0 => { const id = location.hash.split('/')[2], gd = window.__mock.db['groups/' + id] || {}; return { hash: location.hash, name: gd.name, priv: gd.private, invited: gd.invited, ups: window.__mock.writes.slice(w0).filter(w => w.path === 'groups/' + id && w.type === 'update').map(w => (w.data.invited && w.data.invited.a || []).length), notifs: window.__mock.writes.slice(w0).filter(w => /^notifications\//.test(w.path)).length, toast: document.getElementById('toast').textContent }; }, w0);
    out.push('   ' + JSON.stringify(r));
    check(/^#\/groupe\/g/.test(r.hash), 'ouvre le nouveau groupe'); check(r.name === 'Squad du samedi' && r.priv === true, 'nom et « privé » enregistrés'); check((r.invited || []).length === 2, '2 mates invités');
    check(r.ups.length === 2 && r.ups.every(n => n === 1), 'une invitation par écriture (règles v7)'); check(r.notifs === 2, '2 notifications envoyées'); check(/2 mates invités/.test(r.toast), 'message : ' + r.toast); }, 600);
  await step('nouveau groupe : bouton Ajouter des mates', async () => { const r = await ev(() => ({ head: !!document.getElementById('g-add'), empty: (document.querySelector('.chat-empty') || {}).textContent || '', side: !!document.getElementById('g-side'), dm: !!document.getElementById('dm-side'), cur: (document.querySelector('[aria-current="page"][data-nav]') || {}).dataset?.nav }));
    out.push('   ' + JSON.stringify(r));
    check(r.head, 'bouton « Ajouter des mates » en haut du groupe'); check(/Ajouter des mates/.test(r.empty) && /2 invitations en attente/.test(r.empty), 'groupe vide : bouton + « 2 invitations en attente »'); check(!r.dm, 'pas la colonne des messages privés'); check(r.cur === 'groupe', 'onglet Groupes allumé'); }, 300);
  await step('ajouter des mates depuis le groupe', async () => { await page.click('#g-add'); await page.waitForTimeout(350);
    const r = await ev(() => ({ title: document.querySelector('#dlg h3').textContent, dis: document.querySelectorAll('#dlg .g-pick input:disabled').length, free: document.querySelectorAll('#dlg .g-pick input:not(:disabled)').length, send: (document.getElementById('g-send') || {}).disabled }));
    out.push('   ' + JSON.stringify(r));
    check(r.title === 'Ajouter des mates', 'titre clair'); check(r.dis === 2, 'les 2 déjà invités sont grisés'); check(r.send === true, 'bouton Ajouter inactif tant que rien n\'est coché');
    await ev(() => { const i = document.querySelector('#dlg .g-pick input:not(:disabled)'); i.checked = true; i.dispatchEvent(new Event('change')); });
    await page.click('#g-send'); await page.waitForTimeout(900);
    const inv = await ev(() => { const id = location.hash.split('/')[2]; return window.__mock.db['groups/' + id].invited.length; }); check(inv === 3, '3 invitations au total'); }, 400);
  await step('groupe existant (discussion)', async () => { await nav(page, 'groupe/g3', 900); const r = await ev(() => ({ msgs: document.querySelectorAll('#chatbox .bubble').length, add: !!document.getElementById('g-add'), on: (document.querySelector('#g-side .dm-row.on') || {}).textContent || '' }));
    check(r.msgs === 1, 'messages du groupe'); check(r.add, 'bouton Ajouter des mates'); if (!mobile) check(/Mes potes/.test(r.on), 'le groupe est allumé à gauche'); }, 300);
  await step('rejoindre une invitation', async () => { await nav(page, 'groupe', 800); await ev(() => document.querySelector('[data-gjoin="g2"]').click()); await page.waitForTimeout(900);
    const r = await ev(gb => ({ hash: location.hash, members: window.__mock.db['groups/g2'].members, badge: (document.querySelector(gb) || {}).textContent || '' }), GB);
    check(r.hash === '#/groupe/g2' && r.members.includes('a01'), 'groupe rejoint'); check(!r.badge, 'plus de pastille'); }, 300);
  await step('le + de la colonne ouvre la création', async () => { if (mobile) { await nav(page, 'groupe', 600); await ev(() => document.querySelector('.sn-fab').click()); } else { await nav(page, 'groupe', 600); await page.click('#g-side .g-act-new'); }
    await page.waitForTimeout(500); const r = await ev(() => ({ open: document.getElementById('dlg').open, step: (document.querySelector('#dlg .g-step') || {}).textContent || '', hash: location.hash }));
    check(r.open && /Étape 1/.test(r.step), 'création ouverte'); check(r.hash === '#/groupe', 'adresse remise à #/groupe'); await ev(() => document.getElementById('dlg').close()); }, 300);
  await step('nouvelle invitation en direct : pastille', async () => { await nav(page, 'accueil', 700);
    const b0 = await ev(gb => (document.querySelector(gb) || {}).textContent || '', GB);
    await ev(() => { const t = Date.now(); window.__mock.set('groups/g7', { name: 'Les nouveaux du soir', desc: '', game: '', image: '', private: true, owner: 'a09', mods: [], members: ['a09'], invited: ['a01'], kicked: [], ageGroup: 'adult', at: t });
      window.__mock.set('notifications/a01/items/ng7', { type: 'group', from: 'a09', gid: 'g7', text: 'Mini1 t\'invite dans le groupe « Les nouveaux du soir »', at: t, read: false }); });
    await page.waitForTimeout(1500);
    const r = await ev(gb => ({ badge: (document.querySelector(gb) || {}).textContent || '', bell: (document.querySelector('.notif-btn .badge') || {}).textContent || '' }), GB);
    out.push('   avant : « ' + b0 + ' » · après : ' + JSON.stringify(r));
    check(!b0 && r.badge === '1', (mobile ? 'la pastille Groupes' : 'la pastille du « + »') + ' passe à 1 sans recharger la page'); }, 300);
  console.log(out.join('\n')); console.log(bad ? bad + ' problème(s)' : 'tout est bon'); if (log.console.length) console.log('console :', [...new Set(log.console)].filter(x => !/preload|Service Worker/.test(x)).slice(0, 8).join(' | ').slice(0, 1200));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

// Âges réunis (v7) : un adulte et un 13-17 ans se voient ; c'est le jeune qui demande ; pas de vidéo ni de photo entre eux.
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const W = +(process.env.W || 360), H = +(process.env.H || 740), SHOT = process.env.SHOT || '';
(async () => {
  const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  // a01 (adulte) et k01 (13-17 ans) : mates, demande envoyée par le jeune
  db['requests/k01_a01'] = { from: 'k01', to: 'a01', participants: ['k01', 'a01'], status: 'accepted', at: now - 9e6 };
  // k03 (13-17 ans) a envoyé une demande à a01, en attente
  db['requests/k03_a01'] = { from: 'k03', to: 'a01', participants: ['k03', 'a01'], status: 'pending', at: now - 5e5 };
  // k02 (13-17 ans) et a03 (adulte) : mates
  db['requests/k02_a03'] = { from: 'k02', to: 'a03', participants: ['k02', 'a03'], status: 'accepted', at: now - 9e6 };
  db['chats/a01_k01/messages/m1'] = { from: 'k01', text: 'Salut, on joue ?', at: now - 3600e3 };
  db['gametags/k05'] = { tags: { [db['profiles/k05'].games[0]]: 'Mini5_ig' }, at: now };   // pseudo rangé à part (k05 n'est mate de personne)
  db['groups/g4'] = { name: 'Groupe Roblox', desc: '', game: 'Roblox', image: '', private: false, owner: 'k01', mods: [], members: ['k01'], invited: [], kicked: [], ageGroup: 'minor', at: now };
  db['groups/g5'] = { name: 'Adultes et jeunes', desc: '', game: '', image: '', private: false, owner: 'a03', mods: [], members: ['a03', 'k02'], invited: [], kicked: [], ageGroup: 'adult', at: now };
  db['groups/g5/messages/p1'] = { from: 'a03', text: '📷 Photo', at: now - 600e3, photo: { id: 'PHOTOID12345', w: 4, h: 3 } };
  db['groups/g5/photos/PHOTOID12345'] = { from: 'a03', data: 'data:image/jpeg;base64,AAAA', w: 4, h: 3, at: now - 600e3 };
  db['groups/g6'] = { name: 'Groupe privé de a01', desc: '', game: '', image: '', private: true, owner: 'a01', mods: [], members: ['a01'], invited: [], kicked: [], ageGroup: 'adult', at: now };
  [['a02', 'a01']].forEach(([x, y]) => { db[`requests/${x}_${y}`] = { from: x, to: y, participants: [x, y], status: 'accepted', at: now - 8e6 }; });
  await seed(page, db, sd.users);
  let bad = 0; const out = [];
  const check = (cond, msg) => { if (!cond) { bad++; out.push('   ✗ ' + msg); } else out.push('   ✓ ' + msg); };
  const step = async (name, fn, wait = 450) => { try { if (fn) await fn(); await page.waitForTimeout(wait); const o = await overflow(page); const errs = log.errors.splice(0);
      const ko = o.scrollW > o.w + 1 || o.bad.length || errs.length; if (ko) bad++; out.push((ko ? '⚠ ' : 'ok ') + name + (ko ? ' ' + JSON.stringify({ ...o, errs }).slice(0, 400) : ''));
      if (SHOT) await page.screenshot({ path: `${SHOT}/${String(out.length).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }); }
    catch (e) { bad++; out.push('⚠ ' + name + ' EXCEPTION ' + String(e.message).slice(0, 300)); } };
  const ev = (f, a) => page.evaluate(f, a);
  const toastTxt = () => ev(() => document.getElementById('toast').textContent);
  const closeDlg = () => ev(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });

  /* ======== Côté adulte (a01) ======== */
  await open(page, '', 600);
  await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600); await closeDlg();
  await step('adulte : les 13-17 ans sont visibles', async () => { const r = await ev(() => ({ n: visible().length, minors: visible().filter(p => p.ageGroup === 'minor').length }));
    check(r.minors >= 7, `les 13-17 ans apparaissent (${r.minors} sur ${r.n})`); });
  await step('adulte : matchs', () => nav(page, 'matchs'), 600);
  await step('adulte : profil d\'un 13-17 ans (pas mate)', async () => { await nav(page, 'joueur/k05', 600);
    const r = await ev(() => ({ btn: !!document.getElementById('mate'), hint: (document.querySelector('.pp-minor') || {}).textContent || '', tag: document.getElementById('pp-games').textContent }));
    check(!r.btn, 'pas de bouton « Envoyer une demande de mate »'); check(/moins de 18 ans/.test(r.hint), 'phrase « c\'est lui qui peut t\'envoyer une demande »');
    check(!/Mini5_ig/.test(r.tag), 'son pseudo en jeu reste caché'); });
  await step('adulte : demande forcée refusée par le site', async () => { const before = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('requests/a01_k')).length);
    await ev(() => sendRequest(PLAYERS.find(p => p.id === 'k05'))); await page.waitForTimeout(300);
    const after = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('requests/a01_k')).length); check(after === before, 'aucune demande adulte → 13-17 ans écrite'); check(/moins de 18 ans/.test(await toastTxt()), 'message clair : ' + await toastTxt()); });
  await step('adulte : carte « Dispo » d\'un 13-17 ans', async () => { await nav(page, 'accueil', 700); const r = await ev(() => ({ duoMinor: [...document.querySelectorAll('[data-dispo-mate]')].map(b => b.dataset.dispoMate).filter(id => /^k/.test(id)), cards: [...document.querySelectorAll('.dz-who')].map(a => a.getAttribute('href')).filter(h => /k\d/.test(h)).length }));
    check(r.cards >= 1, `un 13-17 ans dispo est visible (${r.cards})`); check(!r.duoMinor.length, 'pas de bouton « Duo ? » vers un 13-17 ans'); });
  await step('adulte : demande reçue d\'un 13-17 ans → accepter', async () => { await nav(page, 'joueur/k03', 600); const has = await ev(() => !!document.getElementById('accept')); check(has, 'bouton Accepter présent');
    if (has) { await page.click('#accept'); await page.waitForTimeout(500); } const st = await ev(() => (window.__mock.db['requests/k03_a01'] || {}).status); check(st === 'accepted', 'demande acceptée (' + st + ')');
    const nt = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('notifications/k03/items/')).length); check(nt >= 1, 'le jeune est prévenu'); }, 700);
  await step('adulte : conversation avec un 13-17 ans', async () => { await nav(page, 'messages/k01', 800);
    const r = await ev(() => ({ audio: !!document.querySelector('[data-call="audio"]'), video: !!document.querySelector('[data-call="video"]'), photo: !!document.getElementById('photobtn'), mic: !!document.getElementById('micbtn') }));
    out.push('   boutons : ' + JSON.stringify(r)); check(!r.video, 'pas de bouton appel vidéo'); check(!r.photo, 'pas de bouton photo'); });
  await step('adulte : numéro de téléphone bloqué vers un 13-17 ans', async () => { const n0 = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_k01/messages/')).length);
    await page.fill('#chatin', 'Appelle-moi au 07 07 12 34 56'); await page.click('#chatform button[type=submit]'); await page.waitForTimeout(500);
    const n1 = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_k01/messages/')).length); check(n1 === n0, 'le message avec numéro n\'est pas parti'); check(/13-17 ans/.test(await toastTxt()), 'message : ' + await toastTxt());
    await page.fill('#chatin', 'Ok pour ce soir, on se retrouve en jeu'); await page.click('#chatform button[type=submit]'); await page.waitForTimeout(600);
    const n2 = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('chats/a01_k01/messages/')).length); check(n2 === n0 + 1, 'un message normal part'); }, 600);
  await step('adulte : appel vidéo forcé refusé', async () => { await ev(() => startCall('k01', 'video')); await page.waitForTimeout(400); const c = await ev(() => ({ call: !!window.__mock.db['calls/a01_k01'], ov: !!document.getElementById('call-ov'), t: document.getElementById('toast').textContent }));
    check(!c.call && !c.ov, 'aucun appel vidéo lancé'); check(/vocaux/.test(c.t), 'message : ' + c.t); });
  await step('adulte : profil d\'un mate 13-17 ans', async () => { await nav(page, 'joueur/k01', 700); const r = await ev(() => ({ msg: !!document.querySelector('a[href="#/messages/k01"]'), tag: document.getElementById('pp-games').textContent }));
    check(r.msg, 'bouton « Envoyer un message » (mates)'); out.push('   jeux : ' + r.tag.slice(0, 120)); });
  await step('adulte : annonce d\'un 13-17 ans', async () => { await nav(page, 'groupes/annonces', 700); const has = await ev(() => !!document.querySelector('[data-an-join="an3"]')); check(has, 'l\'annonce du jeune est visible');
    if (has) { await page.click('[data-an-join="an3"]'); await page.waitForTimeout(700); }
    const r = await ev(() => ({ rep: (window.__mock.db['boards/minor/annonces/an3'] || {}).replies, req: !!window.__mock.db['requests/a01_k02'], t: document.getElementById('toast').textContent }));
    check((r.rep || []).includes('a01'), 'noté partant'); check(!r.req, 'aucune demande de mate envoyée au jeune'); out.push('   message : ' + r.t); }, 500);
  await step('adulte : tournois', async () => { await nav(page, 'groupes/tournois', 700); const r = await ev(() => ({ cards: document.querySelectorAll('.tournoi').length, res: [...document.querySelectorAll('.tournoi')].some(c => /Réservé aux 13-17 ans/.test(c.textContent)), join: !!document.querySelector('[data-to-join="t2"]') }));
    check(r.cards >= 2, `les deux tournois sont visibles (${r.cards})`); check(r.res && !r.join, 'le tournoi 13-17 ans est marqué « Réservé », pas d\'inscription'); });
  await step('adulte : groupe public d\'un 13-17 ans', async () => { await nav(page, 'groupes/groupes', 700); const seen = await ev(() => [...document.querySelectorAll('[data-gjoin]')].some(b => b.dataset.gjoin === 'g4')); check(seen, 'groupe g4 visible');
    await nav(page, 'groupe/g4', 600); await page.click('#gjoin'); await page.waitForTimeout(900); const m = await ev(() => window.__mock.db['groups/g4'].members); check(m.includes('a01'), 'groupe rejoint'); }, 900);
  await step('adulte : dans un groupe avec un 13-17 ans', async () => { await nav(page, 'groupe/g4', 900); const ph = await ev(() => !!document.getElementById('photobtn')); check(!ph, 'pas de bouton photo');
    const n0 = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('groups/g4/messages/')).length);
    await page.fill('#chatin', 'mon numéro +225 07 07 12 34 56'); await page.click('#chatform button[type=submit]'); await page.waitForTimeout(600);
    const n1 = await ev(() => Object.keys(window.__mock.db).filter(k => k.startsWith('groups/g4/messages/')).length); check(n1 === n0, 'numéro bloqué dans le groupe'); }, 500);
  await step('adulte : inviter des mates (une invitation à la fois)', async () => { await nav(page, 'groupe/g6', 800); await page.click('#ginfo'); await page.waitForTimeout(300); await page.click('#g-invite'); await page.waitForTimeout(300);
    const ids = await ev(() => [...document.querySelectorAll('#dlg input[type=checkbox]')].map(i => i.value)); out.push('   mates proposés : ' + ids.join(','));
    await ev(() => document.querySelectorAll('#dlg input[type=checkbox]').forEach(i => { if (!i.disabled) { i.checked = true; i.dispatchEvent(new Event('change')); } })); const w0 = await ev(() => window.__mock.writes.length);   // comme un vrai clic : le bouton « Ajouter » s'allume
    await page.click('#g-send'); await page.waitForTimeout(1200);
    const r = await ev(w0 => ({ inv: window.__mock.db['groups/g6'].invited, ups: window.__mock.writes.slice(w0).filter(w => w.path === 'groups/g6' && w.type === 'update').map(w => (w.data.invited && w.data.invited.a || []).length) }), w0);
    check(r.inv.length === ids.length, `tous invités (${r.inv.join(',')})`); check(r.ups.every(n => n === 1), 'une seule personne par écriture : ' + r.ups.join(',')); await closeDlg(); }, 500);
  await step('adulte : FAQ', () => nav(page, 'aide'), 500);
  await ev(() => signOut()); await page.waitForTimeout(900);

  /* ======== Côté 13-17 ans (k01 : ses pseudos en jeu sont encore sur son profil public) ======== */
  out.push('--- 13-17 ans (k01)');
  const pub0 = await ev(() => window.__mock.db['profiles/k01'].tags); out.push('   pseudos publics avant : ' + JSON.stringify(pub0));
  await ev(() => window.__mock.signIn('k01@test.ci')); await page.waitForTimeout(2800); await closeDlg();
  await step('13-17 : pseudos en jeu rangés à part', async () => { await page.waitForTimeout(400); const r = await ev(() => ({ pub: window.__mock.db['profiles/k01'].tags, gt: window.__mock.db['gametags/k01'], pv: window.__mock.db['private/k01'].tags, me: S.me.tags }));
    out.push('   ' + JSON.stringify(r)); check(r.pub && !Object.keys(r.pub).length, 'profil public sans pseudo en jeu'); check(r.gt && JSON.stringify(r.gt.tags) === JSON.stringify(pub0), 'pseudo copié dans gametags'); check(JSON.stringify(r.pv) === JSON.stringify(pub0), 'copie privée gardée'); check(JSON.stringify(r.me) === JSON.stringify(pub0), 'le jeune voit toujours son pseudo'); }, 300);
  await step('13-17 : les adultes sont visibles', async () => { const r = await ev(() => visible().filter(p => p.ageGroup === 'adult').length); check(r >= 30, `adultes visibles (${r})`); });
  await step('13-17 : profil d\'un adulte → demande possible', async () => { await nav(page, 'joueur/a05', 600); const b = await ev(() => !!document.getElementById('mate')); check(b, 'bouton « Envoyer une demande de mate »');
    if (b) { await page.click('#mate'); await page.waitForTimeout(700); } const r = await ev(() => window.__mock.db['requests/k01_a05']); check(r && r.status === 'pending', 'demande 13-17 ans → adulte enregistrée'); }, 500);
  await step('13-17 : conversation avec son mate adulte', async () => { await nav(page, 'messages/a01', 800); const r = await ev(() => ({ audio: !!document.querySelector('[data-call="audio"]'), video: !!document.querySelector('[data-call="video"]'), photo: !!document.getElementById('photobtn'), msgs: document.querySelectorAll('#chatbox .bubble').length }));
    out.push('   ' + JSON.stringify(r)); check(!r.video, 'pas de bouton appel vidéo'); check(!r.photo, 'pas de bouton photo'); check(r.msgs >= 2, 'les messages s\'affichent'); });
  await step('13-17 : profil d\'un autre 13-17 ans (pseudo rangé à part)', async () => { await nav(page, 'joueur/k05', 900); const t = await ev(() => document.getElementById('pp-games').textContent); check(/Mini5_ig/.test(t), 'pseudo en jeu visible entre 13-17 ans : ' + t.slice(0, 80)); }, 300);
  await step('13-17 : tournoi ouvert à tous', async () => { await nav(page, 'groupes/tournois', 700); const j = await ev(() => !!document.querySelector('[data-to-join="t1"]')); check(j, 'peut s\'inscrire au tournoi « Tout le monde »');
    if (j) { await page.click('[data-to-join="t1"]'); await page.waitForTimeout(400); if (await ev(() => !!document.getElementById('to-ig'))) { await page.fill('#to-ig', 'MiniFF'); await page.click('#to-ok'); } await page.waitForTimeout(900); }
    const e = await ev(() => (window.__mock.db['boards/adult/tournois/t1'].entries || {}).k01); check(e && e.ig === '', 'inscrit sans pseudo en jeu dans le tournoi : ' + JSON.stringify(e)); }, 400);
  await ev(() => signOut()); await page.waitForTimeout(900);

  /* ======== 13-17 ans (k02) dans un groupe où un adulte a mis une photo ======== */
  out.push('--- 13-17 ans (k02)');
  await ev(() => window.__mock.signIn('k02@test.ci')); await page.waitForTimeout(2800); await closeDlg();
  await step('13-17 : photo d\'un groupe', async () => { await nav(page, 'groupe/g5', 1200); const r = await ev(() => ({ txt: (document.querySelector('.photo-msg') || {}).textContent || '', img: !!document.querySelector('.photo-msg img') })); check(!r.img && /réservée aux adultes/.test(r.txt), 'photo remplacée par « Photo réservée aux adultes »'); }, 300);
  await step('13-17 : profil de son mate adulte', async () => { await nav(page, 'joueur/a03', 600); const r = await ev(() => !!document.querySelector('a[href="#/messages/a03"]')); check(r, 'mates : bouton message'); });
  await ev(() => signOut()); await page.waitForTimeout(900);

  /* ======== Admin (a02) : liste des inscrits avec le pseudo rangé à part ======== */
  out.push('--- modérateur (a02)');
  await ev(() => window.__mock.signIn('a02@test.ci')); await page.waitForTimeout(2800); await closeDlg();
  await step('admin : inscrits du tournoi', async () => { await nav(page, 'groupes/tournois', 700); await page.click('[data-to-list="t1"]'); await page.waitForTimeout(800); const t = await ev(() => document.querySelector('#dlg .to-list').textContent); out.push('   ' + t.slice(0, 200)); check(/MiniFF/.test(t), 'le pseudo du jeune vient de gametags'); await closeDlg(); }, 300);
  await step('admin : créer un tournoi (choix « Pour »)', async () => { await page.click('#newto'); await page.waitForTimeout(300); const o = await ev(() => [...document.querySelectorAll('#ta option')].map(x => x.textContent).join(' / ')); check(o === 'Tout le monde / 13-17 ans seulement', o); await closeDlg(); });

  console.log(out.join('\n')); console.log(bad ? bad + ' problème(s)' : 'tout est bon'); if (log.console.length) console.log('console :', [...new Set(log.console)].slice(0, 8).join(' | ').slice(0, 1200));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

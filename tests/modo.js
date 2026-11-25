// Modération (suspendre, masquer, bannir depuis le profil ; page Modération : recherche, messages reçus, suspendus et bannis),
// « Retirer des mates » en vrai bouton, Aide : « Signaler un bug » et « Nous écrire »
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const W = +(process.env.W || 360), H = +(process.env.H || 740), SHOT = process.env.SHOT || '', SKIN = process.env.SKIN || '';
(async () => {
  const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  db['requests/a03_a02'] = { from: 'a03', to: 'a02', participants: ['a03', 'a02'], status: 'accepted', at: now - 9e6 };   // a02 (modérateur) et a03 sont mates
  db['profiles/a05'].moderator = true; db['admins/a05'] = { at: now };                                                   // a05 est aussi modérateur
  db['profiles/a10'].banned = true; db['profiles/a10'].hidden = true;                                                     // a10 est banni
  db['profiles/a09'].suspendedUntil = now + 2 * 864e5;                                                                    // a09 est suspendu 2 jours
  db['profiles/a11'].suspendedUntil = now + 3 * 864e5;                                                                    // a11 aussi (test de connexion)
  db['profiles/a01'].suspendedUntil = 0;                                                                                  // a01 a été suspendu puis levé
  db['contact/c1'] = { topic: 'bug', message: 'Le micro ne marche pas\nquand j\'appuie dessus.', email: 'joueur@test.ci', uid: 'a04', at: now - 3600e3, status: 'open', tech: { app: 'coopo-v35', ecran: '360×740', theme: 'defaut', appareil: 'Mozilla/5.0 (Linux; Android 14) Chrome/131' } };
  db['contact/c2'] = { topic: 'general', message: 'Bonjour, comment changer mon pseudo ?', email: '', uid: '', at: now - 7200e3 };
  db['contact/c3'] = { topic: 'question', message: 'Déjà réglé.', email: 'x@test.ci', uid: 'a06', at: now - 9e6, status: 'done' };
  await seed(page, db, sd.users);
  let bad = 0; const out = [];
  const check = (cond, msg) => { if (!cond) { bad++; out.push('   ✗ ' + msg); } else out.push('   ✓ ' + msg); };
  const ev = (f, a) => page.evaluate(f, a);
  const step = async (name, fn, wait = 400) => { try { if (fn) await fn(); await page.waitForTimeout(wait); const o = await overflow(page); const errs = log.errors.splice(0);
      const ko = o.scrollW > o.w + 1 || o.bad.length || errs.length; if (ko) bad++; out.push((ko ? '⚠ ' : 'ok ') + name + (ko ? ' ' + JSON.stringify({ ...o, errs }).slice(0, 400) : ''));
      if (SHOT) await page.screenshot({ path: `${SHOT}/${W}-${String(out.length).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true }); }
    catch (e) { bad++; out.push('⚠ ' + name + ' EXCEPTION ' + String(e.message).slice(0, 300)); } };
  const signIn = async (u) => { await ev(u => window.__mock.signIn(u + '@test.ci'), u); await page.waitForTimeout(2600); await ev(() => { const d = document.getElementById('dlg'); if (d.open) d.close(); }); if (SKIN) { await ev(s => { applySkin(s, false, { preview: true }); route(); }, SKIN); await page.waitForTimeout(300); } };
  const confirm = async () => { await page.waitForTimeout(250); await page.click('#mok'); await page.waitForTimeout(600); };
  const dbv = (path) => ev(p => window.__mock.db[p], path);
  await open(page, '', 600);
  await signIn('a02');

  await step('modérateur : profil d\'un mate', async () => { await nav(page, 'joueur/a03', 800);
    const r = await ev(() => { const side = document.querySelector('.pp-side'); const btns = [...side.querySelectorAll(':scope > .btn, :scope > a.btn')].map(b => b.textContent.trim());
      return { btns, un: !!document.querySelector('#unmate.btn'), linkUn: !!document.querySelector('.safety #unmate'), mod: !!document.querySelector('.mod-box') }; });
    out.push('   boutons : ' + r.btns.join(' | '));
    check(r.un && r.btns.indexOf('Retirer des mates') === r.btns.indexOf('Envoyer un message') + 1, '« Retirer des mates » est un bouton, juste sous « Envoyer un message »');
    check(!r.linkUn, 'plus de petit lien en double'); check(r.mod, 'panneau de modération (le mate n\'est pas modérateur)'); });

  await step('modérateur : panneau sur un joueur', async () => { await nav(page, 'joueur/a06', 800);
    const r = await ev(() => { const m = document.querySelector('.mod-box'); return m && { state: m.querySelector('.mod-state').textContent, susp: [...m.querySelectorAll('[data-mod="susp"]')].map(b => b.dataset.days), hide: !!m.querySelector('[data-mod="hide"]'), ban: !!m.querySelector('[data-mod="ban"]') }; });
    out.push('   ' + JSON.stringify(r));
    check(r && /actif/.test(r.state) && r.susp.join() === '1,7,30' && r.hide && r.ban, 'état « Compte actif », Suspendre 1/7/30 jours, Masquer, Bannir'); });

  await step('suspendre 7 jours', async () => { await page.click('[data-mod="susp"][data-days="7"]'); await page.waitForTimeout(250);
    const t = await ev(() => document.querySelector('#dlg h3').textContent); check(/Suspendre .* 7 jours/.test(t), 'demande de confirmation : ' + t); await confirm();
    const p = await dbv('profiles/a06'); const d = (p.suspendedUntil - Date.now()) / 864e5;
    check(d > 6.9 && d < 7.01, 'suspendedUntil = dans 7 jours (' + d.toFixed(2) + ')');
    const r = await ev(() => ({ state: document.querySelector('.mod-state').textContent, lift: !!document.querySelector('[data-mod="unsusp"]') }));
    check(/Suspendu jusqu'au/.test(r.state) && r.lift, 'le profil dit « Suspendu jusqu\'au … » et propose de lever'); }, 300);

  await step('page Modération', async () => { await nav(page, 'moderation', 1500);
    const r = await ev(() => ({ head: document.querySelector('.page-head p').textContent, sanc: [...document.querySelectorAll('[data-sanc]')].map(b => b.dataset.sanc + ':' + b.dataset.id), open: [...document.querySelectorAll('.adm-msg:not(.done)')].map(x => x.querySelector('.adm-topic').textContent), done: document.querySelectorAll('.adm-done .adm-msg').length,
      mail: (document.querySelector('.adm-mail') || {}).textContent || '', tech: (document.querySelector('.adm-tech') || {}).textContent || '', text: (document.querySelector('.adm-text') || {}).textContent || '' }));
    out.push('   ' + r.head); out.push('   ' + JSON.stringify({ sanc: r.sanc, open: r.open, done: r.done }));
    check(r.sanc.includes('unsusp:a06') && r.sanc.includes('unsusp:a09') && r.sanc.includes('unban:a10'), 'suspendus et bannis : a06, a09 (suspendus), a10 (banni)');
    check(r.open.join() === 'Bug,Message', 'messages à lire : le bug puis l\'ancien message'); check(r.done === 1, 'message déjà traité rangé à part');
    check(/joueur@test\.ci/.test(r.mail), 'e-mail pour répondre'); check(/coopo-v35/.test(r.tech) && /Android/.test(r.tech), 'appareil et version joints au bug'); check(/micro/.test(r.text), 'texte du message'); }, 300);

  await step('marquer un message traité', async () => { await page.click('.adm-msg:not(.done) [data-cdone]'); await page.waitForTimeout(600);
    const c = await dbv('contact/c1'); check(c.status === 'done', 'statut « traité » enregistré');
    const n = await ev(() => document.querySelectorAll('.adm-msg:not(.done)').length); check(n === 1, 'il reste 1 message à lire'); }, 300);

  await step('chercher un joueur', async () => { await page.fill('#adm-q', 'djel'); await page.waitForTimeout(200);
    const r = await ev(() => [...document.querySelectorAll('.adm-hit')].map(a => a.getAttribute('href') + ' ' + a.textContent.trim().slice(0, 40)));
    out.push('   ' + r.join(' | ')); check(r.length === 1 && /#\/joueur\/a03/.test(r[0]), 'DjeliSniper trouvé, lien vers son profil'); }, 300);

  await step('lever une suspension depuis la liste', async () => { await page.click('[data-sanc="unsusp"][data-id="a06"]'); await page.waitForTimeout(700);
    const p = await dbv('profiles/a06'); check(p.suspendedUntil === 0, 'suspension levée (0)');
    const r = await ev(() => [...document.querySelectorAll('[data-sanc]')].map(b => b.dataset.id)); check(!r.includes('a06'), 'a06 n\'est plus dans la liste'); }, 300);

  await step('pas de panneau sur un autre modérateur', async () => { await nav(page, 'joueur/a05', 800);
    const r = await ev(() => ({ mod: !!document.querySelector('.mod-box'), tag: !!document.querySelector('.pp-meta .mod-tag') })); check(!r.mod && r.tag, 'profil d\'un modérateur : badge, mais aucun bouton de sanction'); });

  await step('bannir puis lever le ban', async () => { await nav(page, 'joueur/a07', 800); await page.click('[data-mod="ban"]'); await confirm();
    let p = await dbv('profiles/a07'); check(p.banned === true && p.hidden === true, 'banni et masqué en base');
    const r = await ev(() => ({ state: document.querySelector('.mod-state').textContent, lift: !!document.querySelector('[data-mod="unban"]') })); check(/Banni/.test(r.state) && r.lift, 'le modérateur voit toujours le profil, avec « Lever le ban »');
    await page.click('[data-mod="unban"]'); await page.waitForTimeout(600); p = await dbv('profiles/a07'); check(p.banned === false && p.hidden === false, 'ban levé'); }, 300);

  await step('masquer puis rétablir', async () => { await nav(page, 'joueur/a08', 800); await page.click('[data-mod="hide"]'); await page.waitForTimeout(600);
    let p = await dbv('profiles/a08'); check(p.hidden === true, 'profil masqué');
    await ev(() => { ADM.at = 0; }); await nav(page, 'moderation', 1500);
    const r = await ev(() => [...document.querySelectorAll('[data-sanc]')].map(b => b.dataset.sanc + ':' + b.dataset.id + ':' + b.textContent.trim())); out.push('   ' + r.join(' | '));
    check(r.some(x => x.startsWith('hide:a08:Rétablir')), 'le profil masqué est dans la liste, avec « Rétablir le profil »');
    await page.click('[data-sanc="hide"][data-id="a08"]'); await page.waitForTimeout(700); p = await dbv('profiles/a08'); check(p.hidden === false, 'profil rétabli depuis la liste'); }, 300);

  await step('retirer un mate (bouton)', async () => { await nav(page, 'joueur/a03', 800); await page.click('#unmate'); await page.waitForTimeout(250);
    const t = await ev(() => document.querySelector('#dlg h3').textContent); check(/Retirer .* de tes mates/.test(t), 'confirmation : ' + t);
    await page.click('#uok'); await page.waitForTimeout(700); const q = await dbv('requests/a03_a02'); check(!q || q.status !== 'accepted', 'mate retiré');
    const r = await ev(() => !!document.getElementById('unmate')); check(!r, 'le bouton disparaît'); }, 300);

  // ---- joueur normal ----
  await ev(() => signOut()); await page.waitForTimeout(900); await signIn('a01');
  await step('joueur : pas de panneau de modération', async () => { await nav(page, 'joueur/a06', 800); const r = await ev(() => !!document.querySelector('.mod-box')); check(!r, 'aucun bouton de sanction pour un joueur'); });
  await step('joueur : un compte suspendu n\'apparaît plus', async () => { await nav(page, 'joueur/a09', 700);
    const r = await ev(() => ({ t: document.querySelector('.empty h3') ? document.querySelector('.empty h3').textContent : '', inMatches: visible().some(p => p.id === 'a09') }));
    check(/pas disponible/.test(r.t) && !r.inMatches, 'profil indisponible et absent des matchs'); });
  await step('profil enregistré sans toucher la suspension', async () => { const w0 = await ev(() => window.__mock.writes.length); await ev(() => DB.saveProfile(S.me)); await page.waitForTimeout(500);
    const r = await ev(w0 => window.__mock.writes.slice(w0).filter(w => w.path === 'profiles/a01').map(w => Object.keys(w.data || {})), w0);
    check(r.length >= 1 && r.every(k => !k.includes('suspendedUntil') && !k.includes('banned')), 'aucune écriture de suspendedUntil par le joueur'); });
  await step('Aide : signaler un bug', async () => { await nav(page, 'aide', 700);
    const r = await ev(() => [...document.querySelectorAll('.help-acts a')].map(a => a.getAttribute('href') + ' ' + a.textContent.trim())); out.push('   ' + r.join(' | '));
    check(r.length === 2 && /#\/contact\/bug Signaler un bug/.test(r[0]) && /#\/contact Nous écrire/.test(r[1]), 'boutons « Signaler un bug » et « Nous écrire »');
    await page.click('.help-acts a[href="#/contact/bug"]'); await page.waitForTimeout(700);
    const f = await ev(() => ({ h: location.hash, t: document.querySelector('.page-head h2').textContent, sel: document.getElementById('ct-topic').value, hint: !document.getElementById('ct-bughint').hidden }));
    check(f.h === '#/contact/bug' && f.t === 'Signaler un bug' && f.sel === 'bug' && f.hint, 'formulaire prêt pour un bug (sujet, explication)');
    await page.fill('#ct-msg', 'Le bouton du micro ne réagit pas sur mon téléphone.'); await page.click('#ct-send'); await page.waitForTimeout(900);
    const c = await ev(() => Object.entries(window.__mock.db).filter(([k, v]) => k.startsWith('contact/') && v.uid === 'a01').map(([k, v]) => v));
    out.push('   envoyé : ' + JSON.stringify(c[0]).slice(0, 300));
    check(c.length === 1 && c[0].topic === 'bug' && c[0].status === 'open' && c[0].tech && c[0].tech.ecran && c[0].tech.appareil, 'message « bug » enregistré avec l\'appareil');
    const done = await ev(() => document.querySelector('#ct-form h3').textContent); check(/Merci pour ton signalement/.test(done), 'remerciement'); }, 300);
  await step('Nous écrire : changer de sujet', async () => { await nav(page, 'contact', 700);
    let f = await ev(() => ({ t: document.querySelector('.page-head h2').textContent, sel: document.getElementById('ct-topic').value, hint: !document.getElementById('ct-bughint').hidden }));
    check(f.t === 'Nous écrire' && f.sel === 'question' && !f.hint, 'par défaut : une question, sans l\'explication des bugs');
    await page.selectOption('#ct-topic', 'bug'); f = await ev(() => ({ t: document.querySelector('.page-head h2').textContent, hint: !document.getElementById('ct-bughint').hidden }));
    check(f.t === 'Signaler un bug' && f.hint, 'choisir « Un bug » change le titre et montre l\'explication'); });

  // ---- compte suspendu qui se connecte ----
  await ev(() => signOut()); await page.waitForTimeout(900);
  await step('compte suspendu : connexion refusée', async () => { await ev(() => window.__mock.signIn('a11@test.ci')); await page.waitForTimeout(3000);
    const r = await ev(() => ({ auth: !!S.auth, toast: document.getElementById('toast').textContent })); out.push('   message : « ' + r.toast + ' »');
    check(!r.auth && /suspendu .*jusqu'au/.test(r.toast), 'déconnecté avec la date de fin de suspension'); }, 300);

  console.log(out.join('\n')); console.log(bad ? bad + ' problème(s)' : 'tout est bon'); if (log.console.length) console.log('console :', [...new Set(log.console)].filter(x => !/preload|Service Worker/.test(x)).slice(0, 8).join(' | ').slice(0, 1200));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

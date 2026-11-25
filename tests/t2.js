// Parcours à deux joueurs : demande de mate, acceptation, messages, contacts, signalement, blocage, dispo, annonces, groupes, tournois, réglages, thèmes, suppression
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const { browser, page, log } = await launch({ width: 360, height: 740, mobile: true, touch: true });
  const { db, users } = mkSeed();
  await seed(page, db, users);
  const out = []; const note = (k, v) => out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v)));
  const errs = name => { const e = log.errors.splice(0), c = log.console.splice(0).filter(x => !/Service Worker/.test(x)); if (e.length || c.length) note('⚠ erreurs ' + name, { e, c }); };
  const toast = () => page.evaluate(() => document.getElementById('toast').textContent);
  const loginAs = async mail => { await page.evaluate(() => signOut()); await page.waitForTimeout(300); await page.evaluate(m => window.__mock.signIn(m), mail); await page.waitForTimeout(900); };
  const mdb = (f, ...a) => page.evaluate(([f, a]) => (new Function('d', 'a', 'return (' + f + ')(d,...a)'))(window.__mock.db, a), [f, a]);

  await open(page, '', 700);
  // --- A = a01 (KoffiNight), connexion par e-mail depuis la page de connexion
  await nav(page, 'connexion');
  await page.fill('#a-mail', 'a01@test.ci'); await page.fill('#a-pw', 'mauvais'); await page.click('.auth-submit'); await page.waitForTimeout(300);
  note('mauvais mot de passe', await page.$$eval('.ferr', els => els.map(e => e.textContent).filter(Boolean)));
  await page.fill('#a-pw', 'azerty12'); await page.click('.auth-submit'); await page.waitForTimeout(1200);
  note('A connecté', await page.evaluate(() => [location.hash, S.me && S.me.name, PLAYERS.length, document.querySelector('#app [aria-busy]') ? 'SQUELETTE' : 'ok']));
  errs('login A');
  // demande de mate à a03
  await nav(page, 'joueur/a03'); await page.click('#mate'); await page.waitForTimeout(500);
  note('demande envoyée', [await toast(), await mdb(`d=>!!d['requests/a01_a03']&&d['requests/a01_a03'].status`), await mdb(`d=>Object.keys(d).filter(k=>k.startsWith('notifications/a03/')).length`), await mdb(`d=>d['limits/a01']`)]);
  note('contacts cachés avant acceptation', await page.evaluate(() => (document.querySelector('.pp-side .hint:last-of-type') || {}).textContent || document.querySelector('.pp-side').innerText.slice(0, 200)));
  // dispo
  await nav(page, 'accueil'); await page.click('#dispo-go'); await page.waitForTimeout(200); await page.fill('#dp-note', 'Ranked ce soir'); await page.click('#dp-go'); await page.waitForTimeout(400);
  note('dispo', [await toast(), await mdb(`d=>d['profiles/a01'].dispo&&d['profiles/a01'].dispo.game`)]);
  // annonce
  await nav(page, 'groupes/annonces'); await page.click('#newan'); await page.waitForTimeout(200); await page.fill('#an-t', 'Besoin de 2 joueurs <b>sérieux</b>'); await page.click('#an-ok'); await page.waitForTimeout(500);
  note('annonce', [await toast(), await mdb(`d=>Object.keys(d).filter(k=>k.startsWith('boards/adult/annonces/')).length`), await page.evaluate(() => document.querySelector('.annonce .an-text').innerHTML)]);
  // rejoindre l'annonce d'un autre
  await page.click('[data-an-join]'); await page.waitForTimeout(700);
  note('partant', [await toast(), await mdb(`d=>d['boards/adult/annonces/an1'].replies`), await mdb(`d=>!!d['requests/a01_a07']`)]);
  // groupe : créer, rejoindre
  await nav(page, 'groupes/sessions'); await page.click('#newsq'); await page.waitForTimeout(200); await page.fill('#sq-t', 'Mon squad test'); await page.click('#sq-ok'); await page.waitForTimeout(400);
  note('groupe créé', [await toast(), await mdb(`d=>Object.keys(d).filter(k=>k.startsWith('squads/')).length`)]);
  const jb = await page.$('[data-join]'); if (jb) { await jb.click(); await page.waitForTimeout(400); note('groupe rejoint', [await toast(), await mdb(`d=>d['squads/q2'].members`), await mdb(`d=>d['squads/q1'].members`)]); }
  // tournoi : a01 est déjà inscrit -> se désinscrire puis se réinscrire
  await nav(page, 'groupes/tournois'); const lv = await page.$('[data-to-leave]'); if (lv) { await lv.click(); await page.waitForTimeout(400); note('tournoi quitté', [await toast(), await mdb(`d=>d['boards/adult/tournois/t1'].players`)]); }
  const jn = await page.$('[data-to-join]'); if (jn) { await jn.click(); await page.waitForTimeout(400); if (await page.$('#to-ig')) { await page.fill('#to-ig', 'Koffi_FF'); await page.click('#to-ok'); await page.waitForTimeout(600); } note('tournoi rejoint', [await toast(), await mdb(`d=>d['boards/adult/tournois/t1'].players`), await mdb(`d=>d['boards/adult/tournois/t1'].entries`)]); }
  errs('actions A');

  // --- B = a03 : voit la demande, accepte, écrit
  await loginAs('a03@test.ci');
  note('B connecté', await page.evaluate(() => [location.hash, S.me && S.me.name, S.requests.length, unreadCount(), document.querySelector('.notif-btn .badge') ? document.querySelector('.notif-btn .badge').textContent : 'pas de pastille']));
  await page.locator('.notif-btn:visible').first().click(); await page.waitForTimeout(300);
  note('centre de notifs', await page.evaluate(() => document.getElementById('dlg').innerText.slice(0, 220).replace(/\n+/g, ' | ')));
  await page.click('[data-acc]'); await page.waitForTimeout(600);
  note('acceptée', [await toast(), await mdb(`d=>d['requests/a01_a03'].status`)]);
  await nav(page, 'messages/a01', 500);
  await page.fill('#chatin', 'Salut <script>alert(1)</script> on joue ?'); await page.click('#chatform button[type="submit"]'); await page.waitForTimeout(500);
  note('message B', [await page.evaluate(() => document.querySelector('.bubble span').innerHTML), await mdb(`d=>Object.keys(d).filter(k=>k.startsWith('chats/a01_a03/messages/')).length`)]);
  await page.waitForTimeout(250); await page.fill('#chatin', 'mon num +225 07 59 00 00 00'); await page.click('#chatform button[type="submit"]'); await page.waitForTimeout(500);
  note('plus de contacts externes dans la conversation', await page.evaluate(() => !document.getElementById('chat-contacts')));
  await nav(page, 'joueur/a01', 600);
  note('profil A vu par B (mate)', await page.evaluate(() => document.querySelector('.pp-side').innerText.replace(/\n+/g, ' | ').slice(0, 300)));
  // rejouerait : 2 clics = +1 seulement
  const r0 = await mdb(`d=>d['profiles/a01'].rejoue`); await page.click('[data-rate="1"]'); await page.waitForTimeout(400); await page.click('[data-rate="1"]'); await page.waitForTimeout(400);
  await page.click('[data-rate="-1"]'); await page.waitForTimeout(400); await page.click('[data-rate="1"]'); await page.waitForTimeout(400);
  note('rejoue', [r0, await mdb(`d=>d['profiles/a01'].rejoue`), await mdb(`d=>d['ratings/a03_a01']`)]);
  errs('actions B');

  // --- A revient : pastille messages, lecture, avertissement numéro
  await loginAs('a01@test.ci');
  note('A de retour', await page.evaluate(() => [S.requests.filter(r => r.status === 'accepted').length, JSON.stringify(S.unread), (document.querySelector('#tabbar .tb-badge') || {}).textContent || 'pas de pastille', unreadCount()]));
  await nav(page, 'messages', 400); note('liste messages', await page.evaluate(() => document.querySelector('.chat-list') ? document.querySelector('.chat-list').innerText.replace(/\n+/g, ' | ') : document.getElementById('app').innerText.slice(0, 100)));
  await nav(page, 'messages/a03', 600);
  note('chat A', await page.evaluate(() => [...document.querySelectorAll('.bubble')].map(b => b.innerText.replace(/\n+/g, ' / ')).join(' || ')));
  note('après lecture', await page.evaluate(() => [JSON.stringify(S.unread), unreadCount()]));
  // signalement + blocage de a05
  await nav(page, 'joueur/a05', 400); await page.click('#report'); await page.waitForTimeout(200); await page.fill('#rtxt', 'spam'); await page.click('#rsend'); await page.waitForTimeout(500);
  note('signalement', [await toast(), await page.evaluate(() => location.hash), await mdb(`d=>Object.values(d).filter(x=>x&&x.target==='a05'&&x.reason).length`)]);
  await nav(page, 'joueur/a06', 400); await page.click('#block'); await page.waitForTimeout(200); await page.click('#bok'); await page.waitForTimeout(400);
  note('blocage', [await toast(), await mdb(`d=>!!d['blocks/a01/list/a06']`), await page.evaluate(() => visible().some(p => p.id === 'a06'))]);
  // paramètres : confidentialité, mode léger, déblocage
  await nav(page, 'parametres', 400);
  await page.click('#pv-tags'); await page.waitForTimeout(400);
  note('pseudos masqués', [await mdb(`d=>d['profiles/a01'].tags`), await mdb(`d=>d['private/a01'].tags`), await mdb(`d=>d['profiles/a01'].privacy`)]);
  await page.click('#pv-online'); await page.waitForTimeout(400); note('statut masqué', await mdb(`d=>[d['profiles/a01'].online,d['profiles/a01'].lastSeen]`));
  await page.click('#pv-tags'); await page.click('#pv-online'); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('details.fold').forEach(d => d.open = true)); await page.click('[data-unblock]'); await page.waitForTimeout(300); note('débloqué', [await toast(), await mdb(`d=>!!d['blocks/a01/list/a06']`)]);
  // thèmes : sombre (gratuit), samouraï (payant -> modale), aperçu
  await nav(page, 'boutique/objets', 500); await page.click('[data-use-skin="sombre"]'); await page.waitForTimeout(900); note('thème sombre', [await toast(), await page.evaluate(() => document.documentElement.dataset.skin), await mdb(`d=>d['profiles/a01'].skin`)]);
  await page.click('[data-use-skin="defaut"]'); await page.waitForTimeout(700);
  errs('réglages A');
  // modification du profil : renommer, retirer un rang
  await nav(page, 'profil/modifier', 500); await page.fill('#f-name', 'Koffi_New'); await page.click('#pf button[type=submit]'); await page.waitForTimeout(900);
  note('renommé', [await toast(), await page.evaluate(() => location.hash), await mdb(`d=>[d['profiles/a01'].name,!!d['usernames/koffi_new'],!!d['usernames/koffinight']]`)]);
  await nav(page, 'profil/modifier', 500); await page.fill('#f-name', 'AwaBuild'); await page.click('#pf button[type=submit]'); await page.waitForTimeout(700);
  note('pseudo pris', await page.textContent('#ferr'));
  // suppression du compte
  await nav(page, 'parametres', 400); await page.evaluate(() => document.querySelectorAll('details.fold').forEach(d => d.open = true)); await page.click('#del'); await page.waitForTimeout(200); await page.click('#dok'); await page.waitForTimeout(1200);
  note('suppression', [await toast(), await page.evaluate(() => location.hash), await mdb(`d=>Object.keys(d).filter(k=>k.includes('a01')&&!k.startsWith('chats/')).join(', ')`)]);
  errs('fin');
  note('requêtes bloquées', log.blocked);
  console.log(out.join('\n'));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

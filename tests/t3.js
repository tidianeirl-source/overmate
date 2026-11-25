// Scénarios particuliers : Google, mineur, modération, paiement (testpay), parrainage, mode démo, 18 ans, compte banni
const { launch, seed, open, nav, overflow, mkSeed, ORIGIN } = require('./lib');
const only = process.env.ONLY || '';
const out = []; const note = (k, v) => out.push(k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v)));
const mdbOf = page => (f, ...a) => page.evaluate(([f, a]) => (new Function('d', 'a', 'return (' + f + ')(d,...a)'))(window.__mock.db, a), [f, a]);
const toastOf = page => () => page.evaluate(() => document.getElementById('toast').textContent);
async function scenario(name, opts, fn) {
  if (only && !name.includes(only)) return;
  const L = await launch({ width: 360, height: 740, mobile: true, touch: true, ...opts });
  const sd = mkSeed(); if (opts.tweak) opts.tweak(sd);
  await seed(L.page, sd.db, sd.users);
  out.push('── ' + name);
  try { await fn(L.page, L.log, mdbOf(L.page), toastOf(L.page)); } catch (e) { note('⚠ ÉCHEC', String(e).slice(0, 400)); }
  const e = L.log.errors, c = L.log.console.filter(x => !/Service Worker/.test(x)); if (e.length || c.length) note('⚠ erreurs', { e, c: c.map(x => x.slice(0, 260)) });
  if (L.log.blocked.length) note('requêtes bloquées', L.log.blocked);
  await L.browser.close();
}
(async () => {
  await scenario('google', {}, async (page, log, mdb, toast) => {
    await open(page, '', 700); await nav(page, 'inscription');
    note('bouton Google', await page.evaluate(() => !!document.querySelector('[data-mock-g]')));
    await page.evaluate(() => window.__gcb({ credential: JSON.stringify({ email: 'kone.awa@exemple.test', name: 'Koné Awa' }) })); await page.waitForTimeout(900);
    note('après Google', await page.evaluate(() => [location.hash, (document.querySelector('#ob-name') || {}).value, !!document.querySelector('#dob-d')]));
    await page.click('#ob button[type=submit]'); await page.waitForTimeout(300); note('erreurs étape 1', await page.textContent('#ob-err'));
    await page.selectOption('#dob-d', '1'); await page.selectOption('#dob-m', '1'); await page.selectOption('#dob-y', String(new Date().getFullYear() - 12)); await page.click('[data-ob-game="Roblox"]');
    await page.click('#ob button[type=submit]'); await page.waitForTimeout(300); note('12 ans refusé', await page.textContent('#ob-err'));
    await page.selectOption('#dob-y', String(new Date().getFullYear() - 16)); await page.click('#ob button[type=submit]'); await page.waitForTimeout(400);
    await page.click('[data-ob-hour="aprem"]'); await page.click('[data-ob-style="casual"]'); await page.click('#ob button[type=submit]'); await page.waitForTimeout(1300);
    note('mineur créé', await page.evaluate(() => [location.hash, S.me.name, ageGroup(S.me), PLAYERS.length, PLAYERS.every(p => p.ageGroup === 'minor')]));
    await page.evaluate(() => document.getElementById('dlg').close());
    await nav(page, 'profil/modifier', 500); await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
    note('profil mineur', await page.evaluate(() => [!!document.getElementById('f-wa'), !!document.getElementById('f-av'), !document.querySelector('.contacts-fold')]));
    await nav(page, 'groupes/annonces', 400); note('annonces mineur', await page.evaluate(() => [...document.querySelectorAll('.annonce .an-text')].map(x => x.textContent)));
    await nav(page, 'groupes/tournois', 400); note('tournois mineur', await page.evaluate(() => [...document.querySelectorAll('.tournoi h3')].map(x => x.textContent)));
    await nav(page, 'joueur/a01', 400); note('adulte invisible', await page.evaluate(() => document.getElementById('app').innerText.slice(0, 60)));
    // demande + acceptation simulée, puis numéro bloqué dans le chat
    await nav(page, 'joueur/k01', 400); await page.click('#mate'); await page.waitForTimeout(500);
    await page.evaluate(() => { const d = window.__mock.db, k = Object.keys(d).find(x => x.startsWith('requests/') && x.endsWith('_k01')); d[k].status = 'accepted'; window.__mock.set(k, d[k]); S.requests.forEach(r => r.status = 'accepted'); save(); }); await nav(page, 'messages/k01', 500);
    await page.fill('#chatin', 'appelle moi au 07 59 27 65 22'); await page.click('#chatform button'); await page.waitForTimeout(300);
    note('numéro bloqué (mineur)', [await toast(), await page.evaluate(() => document.querySelectorAll('.bubble').length)]);
  });

  await scenario('admin', {}, async (page, log, mdb, toast) => {
    await page.evaluate(() => { const d = JSON.parse(localStorage.__mockdb); d['reports/r1'] = { target: 'a05', by: 'a09', reason: 'Arnaque', details: 'demande de <b>code</b>', at: Date.now() - 5000, status: 'open', messages: [{ mine: false, text: 'envoie ton code', at: 1 }] }; d['reportedChats/a05_a09'] = { by: 'a09', target: 'a05', at: 1 }; d['chats/a05_a09/messages/x1'] = { from: 'a05', text: 'envoie ton code', at: 1 }; localStorage.__mockdb = JSON.stringify(d); });
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a02@test.ci')); await page.waitForTimeout(1200);
    note('admin', await page.evaluate(() => [isAdmin(), [...document.querySelectorAll('.navpill a')].map(a => a.textContent).join(','), S.reports.length]));
    await nav(page, 'moderation', 500); note('page modération', await page.evaluate(() => document.getElementById('app').innerText.replace(/\n+/g, ' | ').slice(0, 330)));
    const o = await overflow(page); if (o.bad.length || o.scrollW > o.w + 1) note('⚠ débordement modération', o);
    await page.click('.rep-msgs summary'); await page.click('[data-chat-by]'); await page.waitForTimeout(400); note('conversation', await page.evaluate(() => document.querySelector('.rep-full').innerText));
    await page.click('[data-hide]'); await page.waitForTimeout(400); note('masqué', await mdb(`d=>d['profiles/a05'].hidden`));
    await page.click('[data-ban]'); await page.waitForTimeout(200); await page.click('#bk'); await page.waitForTimeout(500); note('banni', await mdb(`d=>[d['profiles/a05'].banned,d['profiles/a05'].hidden,d['reports/r1'].status]`));
    await nav(page, 'groupes/tournois', 500); note('tournois vus par admin', await page.evaluate(() => [...document.querySelectorAll('.tournoi h3')].map(x => x.textContent)));
    await page.click('#newto'); await page.waitForTimeout(200); await page.fill('#tt', 'Tournoi test'); await page.click('#tok'); await page.waitForTimeout(500);
    note('tournoi créé', [await toast(), await mdb(`d=>Object.keys(d).filter(k=>k.startsWith('boards/adult/tournois/')).length`)]);
    await page.click('[data-to-list]'); await page.waitForTimeout(200); note('inscrits', await page.evaluate(() => document.getElementById('dlg').innerText.replace(/\n+/g, ' | ').slice(0, 160)));
    await page.evaluate(() => document.getElementById('dlg').close()); await nav(page, 'parametres', 400); note('thèmes admin', await page.evaluate(() => PAID_SKINS.every(canUseSkin)));
  });

  await scenario('banni', { tweak: sd => { sd.db['profiles/a10'].banned = true; sd.db['profiles/a10'].hidden = true; } }, async (page, log, mdb, toast) => {
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a10@test.ci')); await page.waitForTimeout(1400);
    note('compte banni', [await toast(), await page.evaluate(() => [location.hash, !!S.auth])]);
  });

  await scenario('18 ans', { tweak: sd => { const y = new Date().getFullYear() - 18; sd.db['private/k03'].dob = y + '-01-02'; } }, async (page, log, mdb, toast) => {
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('k03@test.ci')); await page.waitForTimeout(1400);
    note('passage adulte', [await mdb(`d=>d['profiles/k03'].ageGroup`), await page.evaluate(() => [location.hash, PLAYERS.length, PLAYERS.every(p => p.ageGroup === 'adult'), DB._err])]);
  });

  await scenario('paiement', {}, async (page, log, mdb, toast) => {
    await page.goto(ORIGIN + '/index.html?testpay=1'); await page.waitForTimeout(600); await page.evaluate(() => window.__mock.signIn('a11@test.ci')); await page.waitForTimeout(1200);
    note('boutique', await page.evaluate(() => [!!DB.fns, PAID_SKINS.map(canUseSkin).join('')]));
    await nav(page, 'boutique/themes', 500); await page.click('[data-shop-buy="theme:lofi"]'); await page.waitForTimeout(400);
    note('modale', await page.evaluate(() => document.getElementById('dlg').innerText.replace(/\n+/g, ' | ').slice(0, 300)));
  });
  await scenario('paiement payé', { pay: (u) => /checkPayment/.test(u.pathname) ? { json: { status: 'paid', item: 'theme:lofi' } } : { json: { url: ORIGIN + '/#/paiement/OMTEST1' } } }, async (page, log, mdb, toast) => {
    await page.goto(ORIGIN + '/index.html?testpay=1'); await page.waitForTimeout(600); await page.evaluate(() => window.__mock.signIn('a11@test.ci')); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__mock.set('purchases/a11', { themes: ['lofi'] }); }); await nav(page, 'paiement/OMTEST1', 1500);
    note('payé', await page.evaluate(() => [document.getElementById('app').innerText.replace(/\n+/g, ' | ').slice(0, 120), document.documentElement.dataset.skin, canUseSkin('lofi'), canUseSkin('ocean')]));
    await page.reload(); await page.waitForTimeout(1500); note('après rechargement', await page.evaluate(() => [document.documentElement.dataset.skin, S.skin]));
    // triche locale : le thème forcé sans achat est retiré au chargement
    await page.evaluate(() => { S.owned = { pack: true }; S.skin = 'ocean'; S.skinWanted = 'ocean'; S.skinOk = 'ocean'; save(); }); await page.reload(); await page.waitForTimeout(1600);
    note('triche locale après chargement', await page.evaluate(() => [document.documentElement.dataset.skin, JSON.stringify(S.owned)]));
  });

  await scenario('parrainage', {}, async (page, log, mdb, toast) => {
    await page.goto(ORIGIN + '/index.html?ref=KoffiNight'); await page.waitForTimeout(700);
    note('arrivée invité', await page.evaluate(() => [location.hash, location.search, localStorage.coopo_ref, (document.querySelector('.invite-banner') || {}).innerText]));
    await page.fill('#a-name', 'Filleul1'); await page.fill('#a-mail', 'f1@test.ci'); await page.fill('#a-pw', 'motdepasse1'); await page.selectOption('#dob-d', '10'); await page.selectOption('#dob-m', '5'); await page.selectOption('#dob-y', '2001');
    await page.click('.auth-submit'); await page.waitForTimeout(900); await page.click('[data-ob-game="Free Fire"]'); await page.click('#ob button[type=submit]'); await page.waitForTimeout(400);
    await page.click('[data-ob-hour="soir"]'); await page.click('[data-ob-style="comp"]'); await page.click('#ob button[type=submit]'); await page.waitForTimeout(1300);
    note('e-mail non vérifié', [await toast(), await mdb(`d=>[!!d['rewards/a01'],Object.keys(d).filter(k=>k.startsWith('referrals/')).length]`), await page.evaluate(() => [localStorage.coopo_ref, canUseSkin('soft')])]);
    await page.evaluate(() => window.__mock.verify('f1@test.ci')); await page.reload(); await page.waitForTimeout(1800);
    note('e-mail vérifié', [await toast(), await mdb(`d=>[d['rewards/a01'],Object.keys(d).filter(k=>k.startsWith('referrals/')).length]`), await page.evaluate(() => [localStorage.coopo_ref || null, canUseSkin('soft'), canUseSkin('ocean')])]);
  });

  await scenario('hors ligne puis retour', { failFirst: 2 }, async (page, log, mdb, toast) => {
    await page.evaluate(() => { localStorage.setItem('coopo_known', '1'); });
    await open(page, '', 900);
    note('Firebase injoignable', await page.evaluate(() => [AUTH_LIVE, DB.live, NET_FAIL, location.hash, document.getElementById('app').innerText.replace(/\n+/g, ' | ').slice(0, 150)]));
    await nav(page, 'cgu', 300); note('page lisible hors ligne', await page.evaluate(() => document.querySelector('#app h2').textContent));
    await nav(page, 'connexion', 300); await page.click('#net-retry'); await page.waitForTimeout(600);
    note('2e essai raté', [log.fbTries, await page.evaluate(() => [NET_FAIL, !!document.getElementById('net-retry')])]);
    await page.waitForTimeout(9000);
    note('retour du réseau', [log.fbTries, await page.evaluate(() => [NET_FAIL, DB.live, location.hash, !!document.getElementById('af'), (document.querySelector('.gbtn') || {}).innerText])]);
    await page.fill('#a-mail', 'a04@test.ci'); await page.fill('#a-pw', 'azerty12'); await page.click('.auth-submit'); await page.waitForTimeout(1300);
    note('connexion après retour', await page.evaluate(() => [location.hash, S.me && S.me.name, PLAYERS.length]));
  });
  await scenario('action avant que la base soit prête', { fbDelay: 1500 }, async (page, log, mdb, toast) => {
    await open(page, '', 2500); await page.evaluate(() => window.__mock.signIn('a04@test.ci')); await page.waitForTimeout(1200);
    // rechargement : la page s'affiche depuis le cache ; on clique tout de suite, avant que Firebase soit prêt
    await nav(page, 'joueur/a15', 300); await page.reload({ waitUntil: 'domcontentloaded' });
    const early = await page.evaluate(() => { const b = document.getElementById('mate'); const st = [typeof firebase, DB.live, !!b]; if (b) b.click(); return st; });
    await page.waitForTimeout(400); const mid = await page.evaluate(() => [typeof firebase, !!JSON.parse(localStorage.__mockdb)['requests/a04_a15'], (S.requests.find(r => r.to === 'a15') || {}).status, document.getElementById('toast').textContent]); await page.waitForTimeout(3000);
    note('avant que Firebase soit prêt (rien en base)', mid);
    note('demande envoyée très tôt', [early, await mdb(`d=>d['requests/a04_a15']&&d['requests/a04_a15'].status`), await page.evaluate(() => (S.requests.find(r => r.to === 'a15') || {}).status)]);
  });
  console.log(out.join('\n'));
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

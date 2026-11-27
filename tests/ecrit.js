// v26 — « écrit… » ne s'affiche plus à tort quand on entre dans une conversation.
// Le bug : la base garde le dernier « écrit… » d'un mate (il a envoyé son message ou quitté sans rien effacer). En entrant, l'appareil répond d'abord
// avec sa mémoire (ancienne heure), puis le serveur avec l'heure plus récente : ce changement passait pour un nouveau signal.
const { launch, seed, open, nav, mkSeed } = require('./lib');
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined && !c ? ' → ' + JSON.stringify(x).slice(0, 400) : ''));
(async () => {
  for (const kind of ['c', 'g']) {
    const { browser, page, log } = await launch({ width: 360, height: 740, mobile: true, touch: true });
    const ev = (f, a) => page.evaluate(f, a);
    const sd = mkSeed(), db = sd.db, now = Date.now();
    db['requests/a03_a01'] = { from: 'a03', to: 'a01', participants: ['a03', 'a01'], status: 'accepted', at: now - 9e6 };
    db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut', at: now - 19 * 3600e3 };
    db['groups/g3'] = { name: 'MODO', desc: '', game: '', image: '', private: true, owner: 'a03', mods: [], members: ['a01', 'a03'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6, lastAt: now - 19 * 3600e3 };
    db['groups/g3/messages/x1'] = { from: 'a03', text: 'Chyenne', at: now - 19 * 3600e3 };
    const metaPath = kind === 'c' ? 'chats/a01_a03/meta/a03' : 'groups/g3/meta/a03', hash = kind === 'c' ? 'messages/a03' : 'groupe/g3', nom = kind === 'c' ? 'conversation privée' : 'groupe';
    db[metaPath] = { t: 'w', tAt: now - 19 * 3600e3, seen: now - 19 * 3600e3 };   // le mate a écrit il y a 19 h, et son « écrit… » est resté dans la base
    await seed(page, db, sd.users);
    await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await ev(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    // comme un vrai téléphone : d'abord la mémoire de l'appareil (une heure encore plus ancienne), puis le serveur
    await ev(() => { const real = DB.metaCol.bind(DB); DB.metaCol = (k, i) => { const col = real(k, i); return { doc: x => col.doc(x), onSnapshot: (cb, er) => col.onSnapshot(snap => {
      if (!window.__cacheDone) { window.__cacheDone = true; const docs = []; snap.forEach(d => docs.push(d));
        cb({ metadata: { fromCache: true }, forEach: f => docs.forEach(d => f({ id: d.id, data: () => ({ ...d.data(), tAt: (d.data().tAt || 0) - 3600e3 }) })) }); }
      cb(Object.assign(Object.create(snap), { metadata: { fromCache: false }, forEach: f => snap.forEach(f) })); }, er) }; }; });
    const typ = () => ev(() => { const el = document.getElementById('typing'); return el ? { hidden: el.hidden, txt: el.textContent } : null; });
    await nav(page, hash, 1200);
    let t = await typ(); ok(`${nom} : en entrant, pas de « écrit… » alors que le mate n'écrit pas`, !!t && t.hidden && !t.txt, t);
    await page.waitForTimeout(1500); t = await typ(); ok(`${nom} : toujours rien 1,5 s plus tard`, !!t && t.hidden, t);
    // le mate se met vraiment à écrire : ça s'affiche
    await ev(p => window.__mock.set(p, { t: 'w', tAt: Date.now(), seen: 0 }), metaPath); await page.waitForTimeout(500);
    t = await typ(); ok(`${nom} : quand le mate écrit vraiment, « écrit… » s'affiche`, !!t && !t.hidden && /DjeliSniper écrit/.test(t.txt), t);
    await ev(p => window.__mock.set(p, { t: '', tAt: Date.now(), seen: 0 }), metaPath); await page.waitForTimeout(500);
    t = await typ(); ok(`${nom} : il arrête, la bulle s'efface`, !!t && t.hidden, t);
    // de mon côté : j'écris puis j'efface → mon « écrit… » est retiré de la base ; pareil si je quitte la conversation
    const mine = kind === 'c' ? 'chats/a01_a03/meta/a01' : 'groups/g3/meta/a01';
    await page.fill('#chatin', 'Sal'); await page.waitForTimeout(400);
    ok(`${nom} : j'écris → signal « écrit… » envoyé`, (await ev(p => (window.__mock.db[p] || {}).t, mine)) === 'w');
    await page.fill('#chatin', ''); await page.waitForTimeout(400);
    ok(`${nom} : j'efface mon texte → signal retiré`, (await ev(p => (window.__mock.db[p] || {}).t, mine)) === '');
    await page.fill('#chatin', 'Re'); await page.waitForTimeout(400); await nav(page, 'messages', 900);
    ok(`${nom} : je quitte la conversation sans envoyer → signal retiré`, (await ev(p => (window.__mock.db[p] || {}).t, mine)) === '');
    ok(`${nom} : aucune erreur`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n')); const bad = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(bad ? `${bad} échec(s)` : 'Tout est bon.');
})();

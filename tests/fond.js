// v12 — fond des conversations : le motif de chaque thème (vrai site), lisibilité, temps de calcul, groupe
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
let fails = 0; const ok = (c, m, x) => { console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };
const THEMES = { defaut: 'doodles', sombre: 'galaxie', samurai: 'vagues', soft: 'fleurs', lofi: 'nuages', esth: 'retro', ocean: 'lotus' };
(async () => {
  for (const [W, H] of [[360, 740], [1280, 800]]) {
    const tel = W < 800; console.log(`— ${W} × ${H}`);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: tel, touch: tel, dsf: +(process.env.DSF || 1) });
    const sd = mkSeed(); const now = Date.now(); sd.db['purchases/a01'] = { pack: true, skins: ['ocean'] };
    sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
    [['a03', 'Yo ! Tu es chaud pour une ranked ce soir ?', 60], ['a01', 'Grave, après 21 h', 55], ['a03', '😂😂', 50], ['a03', 'Ok je t\'envoie l\'invite sur Free Fire', 48], ['a01', 'Ça marche 🔥', 40], ['a03', 'Tu as vu la nouvelle saison ?', 30], ['a01', 'Oui la map est trop belle', 20]]
      .forEach(([f, t, m], k) => { sd.db['chats/a01_a03/messages/m' + k] = { from: f, text: t, at: now - m * 60e3 }; });
    sd.db['groups/g1'] = { name: 'Team du soir', desc: '', game: 'Free Fire', image: '', private: true, owner: 'a03', mods: [], members: ['a03', 'a01'], invited: [], kicked: [], ageGroup: 'adult', at: now - 5e6, lastAt: now - 1e5 };
    sd.db['groups/g1/messages/q1'] = { from: 'a03', text: 'Qui est chaud ?', at: now - 6e5 };
    await seed(page, sd.db, sd.users); await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1300);
    for (const th of Object.keys(THEMES)) {
      await page.evaluate(t => { applySkin(t); route(); }, th); await page.waitForTimeout(250); await nav(page, 'messages/a03', 800);
      const r = await page.evaluate(() => { const box = document.getElementById('chatbox'), cs = getComputedStyle(box), root = getComputedStyle(document.documentElement);
        const rgb = v => (v.match(/[\d.]+/g) || []).slice(0, 3).map(Number), L = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        const ratio = (a, b) => { const x = L(a), y = L(b); return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2); };
        const bg = rgb(cs.backgroundColor), pat = decodeURIComponent((root.getPropertyValue('--chat-pat').match(/svg\+xml,(.*)"\)/) || [])[1] || ''), fg = rgb((pat.match(/stroke="(rgb\([^)]+\))"/) || [])[1] || '');
        const meta = [...box.querySelectorAll('.bubble small')].find(s => getComputedStyle(s.parentElement).backgroundColor === 'rgba(0, 0, 0, 0)');   // sous les gros emojis : posé sur le motif
        const mc = meta ? rgb(getComputedStyle(meta).color) : null;
        const t0 = performance.now(); _cmKey = ''; chatMotif(); const ms = Math.round((performance.now() - t0) * 10) / 10;
        return { skin: document.documentElement.dataset.skin, img: cs.backgroundImage.slice(0, 30), bg: cs.backgroundColor, patern: ratio(fg, bg), meta: mc ? ratio(mc, bg) : null, ms, taille: pat.length }; });
      ok(r.skin === th && /^url\("data:image\/svg\+xml/.test(r.img) && r.patern >= 1.08 && r.patern <= 1.6 && (r.meta === null || r.meta >= 4.5) && r.ms < 60,
        `${th} (${THEMES[th]}) : motif posé, discret (contraste ${r.patern}), heure lisible (${r.meta}), calcul ${r.ms} ms, ${Math.round(r.taille / 1024)} Ko`, r);
      if (process.env.SHOT) await page.screenshot({ path: `shots-fond/${W}-${th}.png` });
    }
    // le motif ne bouge pas quand on fait défiler
    await page.evaluate(() => { applySkin('ocean'); route(); }); await nav(page, 'messages/a03', 600);
    const att = await page.evaluate(() => getComputedStyle(document.getElementById('chatbox')).backgroundAttachment); ok(att === 'scroll', 'le motif reste en place pendant le défilement', att);
    await nav(page, 'groupe/g1', 900);
    ok(await page.evaluate(() => /^url\("data:image\/svg\+xml/.test(getComputedStyle(document.getElementById('chatbox')).backgroundImage)), 'groupe : même motif', 0);
    const o = await overflow(page); ok(!o.bad.length && o.scrollW <= o.w + 1, 'rien ne déborde', o);
    ok(!log.errors.length, 'aucune erreur JavaScript', log.errors); await browser.close();
  }
  console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT EST BON'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

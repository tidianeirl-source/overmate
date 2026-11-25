// Contrastes et débordements sur tous les thèmes
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const SHOT = process.env.SHOT || '';
(async () => {
  const W = +(process.env.W || 360), H = +(process.env.H || 740);
  const { browser, page, log } = await launch({ width: W, height: H, mobile: true, touch: true });
  const sd = mkSeed(); sd.db['purchases/a01'] = { pack: true }; sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: Date.now() - 1e6 };
  sd.db['requests/a09_a01'] = { from: 'a09', to: 'a01', participants: ['a09', 'a01'], status: 'pending', at: Date.now() - 5e5 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut ! On joue ce soir ?', at: Date.now() - 9e5 }; sd.db['chats/a01_a03/messages/m2'] = { from: 'a01', text: 'Grave, 21h sur Free Fire', at: Date.now() - 8e5 };
  await seed(page, sd.db, sd.users);
  await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1200);
  const themes = (process.env.THEMES || 'defaut,sombre,samurai,soft,lofi,esth,awale,ocean,menthe,prunier').split(',');
  const pages = (process.env.PAGES || 'accueil,matchs,recherche,joueur/a03,groupes,messages,messages/a03,profil,parametres').split(',');
  const scan = () => page.evaluate(() => {
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
    // Teintes maximales du fond décoratif de chaque thème (.frame) : on vérifie le texte posé sur la page contre la couleur de fond ET contre la teinte la plus forte
    const TINTS = { defaut: [[106, 75, 255, .16], [190, 235, 60, .15]], sombre: [[120, 86, 255, .28], [212, 255, 63, .07]], soft: [[233, 119, 158, .22], [255, 190, 120, .18]], menthe: [[47, 174, 135, .22], [190, 240, 120, .20]],
      lofi: [[255, 255, 255, .95], [31, 134, 194, .2]], prunier: [[200, 16, 46, .13]], samurai: [[196, 30, 58, .04]], awale: [[226, 162, 59, .24], [247, 233, 212, .03]], ocean: [[47, 127, 216, .22]],
      esth: [[201, 184, 255, .42], [255, 194, 223, .4], [191, 240, 224, .4]] };   // motifs à traits fins (vagues, points, branche) : teinte moyenne, négligeable
    const tints = TINTS[document.documentElement.dataset.skin] || [];
    // renvoie la liste des fonds possibles derrière l'élément (un seul en général ; plusieurs si le fond est décoré)
    const bgOf = el => { let stack = [], e = el, variants = null, darken = false;
      while (e && e.nodeType === 1) { const cs = getComputedStyle(e), bi = cs.backgroundImage;
        if (bi && bi !== 'none') {
          if (e.classList.contains('frame')) { const base = parse(cs.backgroundColor); variants = [base].concat(tints.map(t => over(t, base))); break; }
          const m = bi.match(/^linear-gradient\((rgba?\([^)]+\)), (rgba?\([^)]+\))\)/);
          if (m && m[1] === m[2]) { const c = parse(m[1]); stack.push(c); if (c[3] >= 1) break; e = e.parentElement; continue; }   // couche unie (bordure dégradée du thème Esthétique)
          if (/^linear-gradient\(rgba\(0, 0, 0, 0\) 45%, rgba\(0, 0, 0, 0\.13\)\)$/.test(bi)) darken = true;   // bouton principal : léger assombrissement vers le bas
          else return null; }
        const c = parse(cs.backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } e = e.parentElement; }
      if (!variants) { if (!stack.length || stack[stack.length - 1][3] < 1) stack.push([255, 255, 255, 1]); variants = [stack.pop()]; }
      const outs = variants.map(v => { let col = v; for (let k = stack.length - 1; k >= 0; k--) col = over(stack[k], col); return col; });
      if (darken) outs.push(...outs.map(c => over([0, 0, 0, .13], c)));
      return outs; };
    const bad = {}, seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const t = walker.currentNode, s = t.nodeValue.trim(); if (!s || s.length < 2) continue; const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < .1) continue; if (el.closest('#fx,#wipe,.orbs,[aria-hidden="true"],.showcase,.hero2,.mh,svg,#toast,dialog:not([open])')) continue;
      let op = 1, p = el; while (p && p.nodeType === 1) { op *= +getComputedStyle(p).opacity; p = p.parentElement; } if (op < .1) continue;
      const fg0 = parse(cs.color), bgs = bgOf(el); if (!fg0 || !bgs) continue; let ratio = 99, bg = bgs[0], fg = null;
      for (const b of bgs) { const f = over([fg0[0], fg0[1], fg0[2], fg0[3] * op], b); const L1 = lum(f), L2 = lum(b), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); if (r < ratio) { ratio = r; bg = b; fg = f; } } const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 600; const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
      if (ratio < need - .05) { const k = (el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.') + ' <' + (el.parentElement ? el.parentElement.tagName.toLowerCase() + '.' + String(el.parentElement.className).split(' ')[0] : '') + '>'); if (!bad[k]) bad[k] = { n: 0, ratio: +ratio.toFixed(2), need, fg: fg.slice(0, 3).map(Math.round).join(','), bg: bg.slice(0, 3).map(Math.round).join(','), size, txt: s.slice(0, 28) }; bad[k].n++; } }
    return bad; });
  for (const th of themes) {
    await page.evaluate(t => { applySkin(t); route(); }, th); await page.waitForTimeout(250);
    const got = await page.evaluate(() => document.documentElement.dataset.skin); const agg = {}; const ov = [];
    for (const pg of pages) { await nav(page, pg, 300); const b = await scan(); for (const k in b) { if (!agg[k]) agg[k] = { ...b[k], pages: [] }; agg[k].pages.push(pg.split('/')[0]); } const o = await overflow(page); if (o.scrollW > o.w + 1 || o.bad.length) ov.push([pg, o.scrollW, o.bad.slice(0, 3)]);
      if (SHOT && ['accueil', 'matchs', 'joueur/a03', 'parametres'].includes(pg)) await page.screenshot({ path: `${SHOT}/th-${th}-${pg.replace(/\W+/g, '_')}.png` }); }
    const rows = Object.entries(agg).sort((a, b) => a[1].ratio - b[1].ratio);
    console.log(`── ${th}${got !== th ? ' (⚠ appliqué: ' + got + ')' : ''} : ${rows.length} contrastes faibles, ${ov.length} débordements`);
    rows.slice(0, +(process.env.TOP || 8)).forEach(([k, v]) => console.log(`   ${v.ratio} (min ${v.need}) ${k}  txt="${v.txt}" fg ${v.fg} / bg ${v.bg} ${v.size}px [${[...new Set(v.pages)].join(',')}]`));
    ov.forEach(o => console.log('   débordement', JSON.stringify(o)));
  }
  const e = log.errors, c = log.console.filter(x => !/Service Worker/.test(x)); if (e.length || c.length) console.log('⚠ erreurs', JSON.stringify({ e, c }).slice(0, 800));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

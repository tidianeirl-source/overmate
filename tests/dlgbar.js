// Barre d'actions des fenêtres : elle doit toucher le bas de la fenêtre, à l'arrêt comme pendant le défilement.
const { launch, seed, open, nav, mkSeed } = require('./lib');
const SIZES = (process.env.SIZES || '320x568,360x740,375x812,1280x800').split(',');
const SHOT = process.env.SHOT || '';
(async () => {
  let bad = 0;
  for (const size of SIZES) {
    const [W, H] = size.split('x').map(Number);
    const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
    const sd = mkSeed(); sd.db['purchases/a01'] = { pack: true }; await seed(page, sd.db, sd.users);
    await open(page, '', 600); await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1300);
    await nav(page, 'accueil', 400);
    const cases = {
      'thèmes': () => document.querySelector('.skin-btn').click(),
      'dispo': () => dispoModal(),
      'notifications': () => document.querySelector('.notif-btn').click(),
      'long (60 lignes)': () => modal('<h3>Essai</h3>' + '<p class="muted">Une ligne de texte pour remplir la fenêtre.</p>'.repeat(60) + '<div class="dlg-actions"><button class="btn btn-ghost" data-close>Annuler</button><button class="btn btn-ac" data-close>Valider</button></div>'),
      'court': () => modal('<h3>Essai</h3><p class="muted">Deux lignes.</p><div class="dlg-actions"><button class="btn" data-close>Fermer</button></div>'),
      'sans barre': () => modal('<h3>Essai</h3>' + '<p class="muted">Une ligne de texte pour remplir la fenêtre.</p>'.repeat(60)),
      'sans barre, court': () => modal('<h3>Essai</h3><p class="muted">Deux lignes.</p>'),
    };
    for (const [name, fn] of Object.entries(cases)) {
      await page.evaluate(() => { const d = document.getElementById('dlg'); if (d.open) d.close(); });
      await page.evaluate(`(${fn.toString()})()`); await page.waitForTimeout(450);
      const m = await page.evaluate(async () => {
        const d = document.getElementById('dlg'); if (!d.open) return null;
        const bar = d.querySelector(':scope > .dlg-actions:last-child');
        const read = () => { const R = d.getBoundingClientRect(), cs = getComputedStyle(d); const inner = R.bottom - parseFloat(cs.borderBottomWidth);
          const last = d.lastElementChild.getBoundingClientRect();
          const o = { dlgBas: Math.round(inner), pad: cs.paddingBottom };
          if (bar) { const b = bar.getBoundingClientRect(); o.barBas = Math.round(b.bottom); o.ecart = Math.round(inner - b.bottom); o.barG = Math.round(b.left - R.left); o.barD = Math.round(R.right - b.right);
            const btn = bar.querySelector('button,a').getBoundingClientRect(); o.boutonVisible = btn.bottom <= inner + .5 && btn.top >= R.top; o.sousBouton = Math.round(inner - btn.bottom); }
          else o.finContenu = Math.round(inner - last.bottom);
          return o; };
        const scroll = d.scrollHeight > d.clientHeight + 1; d.scrollTop = 0; await new Promise(r => setTimeout(r, 60)); const haut = read();
        d.scrollTop = (d.scrollHeight - d.clientHeight) / 2; await new Promise(r => setTimeout(r, 60)); const milieu = read();
        d.scrollTop = d.scrollHeight; await new Promise(r => setTimeout(r, 60)); const bas = read();
        d.scrollTop = 0;
        return { defile: scroll, h: Math.round(d.getBoundingClientRect().height), haut, milieu, bas };
      });
      if (!m) { console.log(size, name, ': fenêtre non ouverte'); continue; }
      const st = [m.haut, m.milieu, m.bas];
      const ko = st.some(s => ('ecart' in s) ? (Math.abs(s.ecart) > 1 || Math.abs(s.barG) > 1 || Math.abs(s.barD) > 1 || !s.boutonVisible || s.sousBouton < 12) : false) || (!('ecart' in m.bas) && m.bas.finContenu < 16);
      if (ko) bad++;
      console.log((ko ? '⚠ ' : 'ok ') + size + ' ' + name + (m.defile ? ' (défile)' : '') + ' ' + JSON.stringify(st.map(s => 'ecart' in s ? { ecart: s.ecart, cotes: [s.barG, s.barD], sousBouton: s.sousBouton, visible: s.boutonVisible } : { finContenu: s.finContenu })));
      if (SHOT) await page.screenshot({ path: `${SHOT}/dlg-${size}-${name.replace(/[^a-z0-9]+/gi, '_')}.png` });
    }
    if (log.errors.length) { console.log('erreurs', log.errors.slice(0, 3)); bad++; }
    await browser.close();
  }
  console.log(bad ? `${bad} problème(s)` : 'tout est bon');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

// Vérifie les thèmes Coopô et Sombre en couleurs unies : toutes les pages, téléphone et ordinateur, contrastes, débordements, erreurs
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const W = Number(process.env.W || 360), H = W > 800 ? 800 : 740, TAG = process.env.TAG || ('uc' + W);
const PAGES = (process.env.PAGES || 'accueil,matchs,recherche,messages,messages/a03,groupes,profil,boutique,inventaire,parametres,aide,joueur/a03,joueur/a02').split(',');
const FALSE_POS = /span\.av |span\.badge |tb-badge|eFootball|demande de mate|message non lu/;
(async () => {
  const { browser, page, log } = await launch(W > 800 ? { width: W, height: H, dsf: 1 } : { width: W, height: H, mobile: true, touch: true, dsf: 1 });
  const sd = mkSeed(); const now = Date.now();
  sd.db['purchases/a01'] = { pack: true };
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['requests/a09_a01'] = { from: 'a09', to: 'a01', participants: ['a09', 'a01'], status: 'pending', at: now - 5e5 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut ! On joue ce soir ?', at: now - 9e5 };
  sd.db['chats/a01_a03/messages/m2'] = { from: 'a01', text: 'Grave, 21h sur Free Fire', at: now - 8e5 };
  await seed(page, sd.db, sd.users);
  // hors connexion : page d'arrivée et connexion
  await open(page, 'bienvenue', 900);
  const audit = () => page.evaluate(() => {
    const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => /^color\(srgb/.test(c) ? x * 255 : x).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const alpha = c => { const p = c.match(/[\d.]+/g); return p.length > 3 ? Number(p[3]) : 1; };
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none' && /gradient/.test(cs.backgroundImage)) return null; const b = cs.backgroundColor; if (alpha(b) > .5) return b; } return getComputedStyle(document.documentElement).backgroundColor; };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      let hidden = false; for (let e = el; e; e = e.parentElement) { if (+getComputedStyle(e).opacity < .05) { hidden = true; break; } } if (hidden) continue;
      const bg = bgOf(el); if (!bg) continue;
      const a = lum(cs.color), b = lum(bg); const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && +cs.fontWeight >= 700);
      if (ratio < (big ? 3 : 4.5)) out.push(ratio.toFixed(2) + ' ' + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' « ' + el.textContent.trim().slice(0, 30) + ' »');
    }
    return out;
  });
  const report = [];
  for (const sk of ['defaut', 'sombre']) {
    await page.evaluate(s => { applySkin(s); route(); }, sk); await page.waitForTimeout(500);
    for (const pg of ['bienvenue', 'connexion', 'inscription']) {
      await nav(page, pg, 600); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
      await page.screenshot({ path: `shots/${TAG}-${sk}-out-${pg}.png` });
      const bad = (await audit()).filter(x => !FALSE_POS.test(x)); if (bad.length) report.push(`${sk} ${pg} (hors connexion) : ` + bad.join(' | '));
    }
  }
  await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
  for (const sk of ['defaut', 'sombre']) {
    await page.evaluate(s => { applySkin(s); route(); }, sk); await page.waitForTimeout(500);
    for (const pg of PAGES) {
      await nav(page, pg, 650);
      await page.evaluate(() => { document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')); const t = document.getElementById('toast'); if (t) t.style.display = 'none'; scrollTo(0, 0); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `shots/${TAG}-${sk}-${pg.replace(/\W+/g, '_')}.png` });
      const bad = (await audit()).filter(x => !FALSE_POS.test(x)); if (bad.length) report.push(`${sk} ${pg} : ` + bad.join(' | '));
      const of = await overflow(page); if (of && of.length) report.push(`${sk} ${pg} déborde : ` + JSON.stringify(of).slice(0, 200));
      // en bas de la page aussi (bas de page, liens)
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(250);
      const bad2 = (await audit()).filter(x => !FALSE_POS.test(x)); if (bad2.length) report.push(`${sk} ${pg} (bas) : ` + bad2.join(' | '));
    }
  }
  console.log(report.length ? report.join('\n') : 'contrastes et débordements : rien à signaler');
  console.log('erreurs JS :', log.errors.length ? log.errors.join(' | ') : 'aucune');
  await browser.close();
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });

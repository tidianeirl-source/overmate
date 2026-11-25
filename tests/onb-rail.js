// v23 — Création du profil (« Bienvenue sur Coopô ») : pas de colonne de gauche sur ordinateur, la page prend toute la largeur.
// Après la création du profil, la colonne revient. Téléphone inchangé. Un joueur qui a déjà son profil garde sa colonne dès l'ouverture.
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const OUT = process.env.OUT || 'shots-onb'; const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined ? ' → ' + JSON.stringify(x).slice(0, 400) : ''));
const etat = page => page.evaluate(() => { const ob = document.querySelector('.ob-form') || document.querySelector('#app .wrap'); const r = ob ? ob.getBoundingClientRect() : null;
  return { hash: location.hash, noProfile: document.body.classList.contains('no-profile'), rail: getComputedStyle(document.getElementById('siderail')).display,
    top: getComputedStyle(document.querySelector('.top')).display, tabbar: getComputedStyle(document.getElementById('tabbar')).display, menu: (() => { const n = document.querySelector('.top .navpill'); return n ? getComputedStyle(n).display !== 'none' && n.children.length > 0 : false; })(),
    ml: getComputedStyle(document.querySelector('.frame')).marginLeft, centre: r ? Math.round(r.left + r.width / 2) : null, larg: document.documentElement.clientWidth, h2: (document.querySelector('#app h2') || {}).textContent || '' }; });
(async () => {
  for (const [W, H, dev] of [[1440, 900, 'pc'], [1000, 760, 'pc1000'], [999, 760, 'pc999'], [390, 844, 'tel']]) {
    const pc = W >= 1000;
    const { browser, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800 });
    const sd = mkSeed(); sd.users['n01@test.ci'] = { uid: 'n01', email: 'n01@test.ci', pw: 'azerty12', provider: 'password', emailVerified: true, displayName: 'Nouveau' };
    await seed(page, sd.db, sd.users);
    await open(page, 'inscription', 900);
    await page.evaluate(() => window.__mock.signIn('n01@test.ci')); await page.waitForTimeout(2600);
    await page.evaluate(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); }); await page.waitForTimeout(300);
    let e = await etat(page);
    ok(`${dev} : la création du profil s'affiche (« Bienvenue sur Coopô »)`, e.hash === '#/profil' && e.noProfile && /Bienvenue sur Coop/.test(e.h2), e);
    ok(`${dev} : pas de colonne de gauche, pas de barre d'onglets`, e.rail === 'none' && e.tabbar === 'none', e);
    if (pc) {
      ok(`${dev} : la page prend toute la largeur (pas de marge pour la colonne), le formulaire est centré`, e.ml === '0px' && Math.abs(e.centre - e.larg / 2) <= 2 && e.top === 'none', e);
    } else ok(`${dev} : en-tête du haut comme avant`, e.top !== 'none', e);
    const ov = await overflow(page); ok(`${dev} : rien ne déborde`, ov.scrollW <= ov.w && !ov.bad.length, ov);
    await page.screenshot({ path: `${OUT}/${dev}-1-etape1.png` });
    // une page publique pendant la création du profil (Aide, par le bas de page) : pas de colonne non plus, puis retour
    await nav(page, 'aide', 700); e = await etat(page);
    ok(`${dev} : page Aide pendant la création du profil, sans colonne`, e.hash === '#/aide' && e.rail === 'none' && (!pc || e.ml === '0px'), e);
    await nav(page, 'profil', 700);
    // étape 1 puis étape 2, comme un vrai joueur
    await page.selectOption('#dob-d', '10'); await page.selectOption('#dob-m', '5'); await page.selectOption('#dob-y', '2000');
    await page.click('[data-ob-game="Free Fire"]'); await page.click('#ob button[type=submit]'); await page.waitForTimeout(900);
    e = await etat(page);
    ok(`${dev} : étape 2 (« Dernière question »), toujours sans colonne`, /Derni/.test(e.h2) && e.rail === 'none' && (!pc || e.ml === '0px'), e);
    await page.screenshot({ path: `${OUT}/${dev}-2-etape2.png` });
    await page.click('[data-ob-hour]'); await page.click('[data-ob-style="both"]'); await page.click('#ob button[type=submit]'); await page.waitForTimeout(2600);
    await page.evaluate(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); }); await page.waitForTimeout(400);
    e = await etat(page);
    ok(`${dev} : profil créé → la navigation revient (${pc ? 'colonne de gauche' : W > 860 ? 'menu du haut, comme avant' : 'barre du bas'})`, !e.noProfile && (pc ? e.rail === 'flex' && e.ml === '76px' : W > 860 ? e.menu && e.rail === 'none' : e.tabbar !== 'none' && e.rail === 'none'), e);
    await page.screenshot({ path: `${OUT}/${dev}-3-apres.png` });
    ok(`${dev} : aucune erreur`, !log.errors.length, log.errors);
    await browser.close();
  }
  // un joueur qui a déjà son profil : la colonne est là dès l'ouverture, sans clignoter
  {
    const { browser, page, log } = await launch({ width: 1440, height: 900 });
    const sd = mkSeed(); await seed(page, sd.db, sd.users);
    await open(page, '', 600);
    await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
    await page.evaluate(() => { const d = document.getElementById('dlg'); if (d && d.open) d.close(); });
    let e = await etat(page); ok('joueur avec profil (1re connexion) : colonne présente', e.rail === 'flex' && e.ml === '76px' && !e.noProfile, e);
    // il rouvre Coopô : on note chaque état de la page pendant l'ouverture
    await page.addInitScript(() => { window.__seen = []; const t0 = performance.now(); const tick = () => { if (document.body) window.__seen.push([Math.round(performance.now() - t0), document.body.classList.contains('no-profile'), document.body.classList.contains('logged-out')]); if (performance.now() - t0 < 4000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await page.reload(); await page.waitForTimeout(3500);
    const seen = await page.evaluate(() => window.__seen); e = await etat(page);
    const np = seen.filter(x => x[1]).length;
    ok('joueur avec profil qui rouvre Coopô : jamais d\'état « profil à créer », donc la colonne ne clignote pas', np === 0 && e.rail === 'flex' && e.ml === '76px', { np, images: seen.length, e });
    ok('joueur avec profil : aucune erreur', !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n')); const ko = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(ko ? ko + ' échec(s)' : 'tout est bon');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

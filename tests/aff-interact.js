// Vérifie le fonctionnement des affiches de l'accueil et de la nouvelle barre d'onglets (téléphone puis ordinateur)
const { launch, seed, open, nav, mkSeed, overflow } = require('./lib');
const out = []; const ok = (name, cond, extra) => out.push((cond ? 'OK   ' : 'ÉCHEC') + ' ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : ''));
async function setup(o) {
  const { browser, page, log, context } = await launch(o);
  const sd = mkSeed(); const now = Date.now();
  sd.db['requests/a01_a03'] = { from: 'a01', to: 'a03', participants: ['a01', 'a03'], status: 'accepted', at: now - 1e6 };
  sd.db['chats/a01_a03/messages/m1'] = { from: 'a03', text: 'Salut ! On joue ce soir ?', at: now - 9e5 };
  await seed(page, sd.db, sd.users);
  await open(page, 'accueil', 900);
  await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(1500);
  await page.evaluate(() => { applySkin('defaut'); route(); }); await page.waitForTimeout(500);
  return { browser, page, log, context };
}
(async () => {
  // ---------- téléphone ----------
  {
    const { browser, page, log, context } = await setup({ width: 360, height: 740, mobile: true, touch: true, motion: true });
    await nav(page, 'accueil', 800);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabbar a')].map(a => a.dataset.nav + (a.classList.contains('tb-home') ? '*' : '') + (a.getAttribute('aria-current') ? '!' : '')));
    ok('barre du bas : 5 onglets, Accueil au milieu et allumé, Profil à la place de Groupes', tabs.join(',') === 'matchs,groupes,accueil*!,messages,profil', tabs);
    const me = await page.evaluate(() => { const a = document.querySelector('#tabbar [data-nav="profil"]'); return { meBtn: document.querySelectorAll('.me-btn').length, av: !!a.querySelector('.tb-ico > .av'), cls: a.className, label: a.querySelector(':scope > span').textContent.trim(), hid: a.querySelector('.tb-ico > .av').getAttribute('aria-hidden') === 'true' || a.querySelector('.tb-ico > .av').getAttribute('alt') === '', w: Math.round(a.querySelector('.av').getBoundingClientRect().width) }; });
    ok('onglet Profil avec ta photo (ignorée par les lecteurs d\'écran), plus de photo en haut à droite', !me.meBtn && me.av && me.cls === 'tb-me' && me.label === 'Profil' && me.hid && me.w === 26, me);
    const home = await page.evaluate(() => { const i = document.querySelector('.tb-home .tb-ico').getBoundingClientRect(), o = document.querySelector('#tabbar a:not(.tb-home) .tb-ico').getBoundingClientRect(); return { home: Math.round(i.width), other: Math.round(o.width), raised: Math.round(o.top - i.top) }; });
    ok('Accueil plus grand et surélevé', home.home > home.other && home.raised > 15, home);
    // la carte : grande, bord à bord
    const card = await page.evaluate(() => { const a = document.querySelector('#aff-track .aff').getBoundingClientRect(), t = document.getElementById('aff-track').getBoundingClientRect(), tb = document.getElementById('tabbar').getBoundingClientRect(); return { w: Math.round(a.width), h: Math.round(a.height), left: Math.round(a.left), bottom: Math.round(a.bottom), track: [Math.round(t.left), Math.round(t.right)], tabTop: Math.round(tb.top) }; });
    ok('affiche en grand, la suivante dépasse à droite, au-dessus de la barre', card.w >= 300 && card.h >= 420 && card.track[0] === 0 && card.track[1] === 360 && card.bottom < card.tabTop, card);
    // glisser du doigt vers la gauche
    const cdp = await context.newCDPSession(page);
    const y = card.bottom - 300;
    const swipe = async (dx, steps = 12, pause = 16) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] }); for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 + dx * k / steps, y }] }); await page.waitForTimeout(pause); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    await swipe(-240); await page.waitForTimeout(1200);
    let st = await page.evaluate(() => { const t = document.getElementById('aff-track'); return { i: AFF.i, sl: Math.round(t.scrollLeft), step: affStep(t), y: scrollY }; });
    ok('glisser à gauche : affiche suivante, bien calée', st.i === 1 && Math.abs(st.sl - st.step) <= 2 && st.y === 0, st);
    // nouvelles données pendant un glissement : la page attend
    const tr0 = await page.evaluateHandle(() => document.getElementById('aff-track'));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] });
    for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - k * 20, y }] }); await page.waitForTimeout(30); }
    const during = await page.evaluate(t => { refreshAfterData(); return { same: document.getElementById('aff-track') === t, busy: affBusy() }; }, tr0);
    for (let k = 7; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - k * 20, y }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(2200);
    const after = await page.evaluate(t => { const tr = document.getElementById('aff-track'); return { replaced: tr !== t, i: AFF.i, sl: Math.round(tr.scrollLeft), step: affStep(tr) }; }, tr0);
    ok('redessin retardé pendant le glissement', during.same && during.busy, during);
    ok('redessin fait après, on reste sur la même affiche', after.replaced && after.i === 2 && Math.abs(after.sl - 2 * after.step) <= 2, after);
    // un point : aller à une affiche
    await page.evaluate(() => document.querySelector('#aff-track .aff.on .af-dots [data-aff-to="4"]').click()); await page.waitForTimeout(900);
    st = await page.evaluate(() => ({ i: AFF.i, id: document.querySelector('#aff-track .aff.on').dataset.aff }));
    ok('point cliqué : affiche 5', st.i === 4, st);
    // l'affiche « noir et blanc » : changer de thème sans quitter l'affiche
    const lookI = await page.evaluate(() => [...document.querySelectorAll('#aff-track .aff')].findIndex(a => a.dataset.aff === 'look'));
    await page.evaluate(i => affGo(i), lookI); await page.waitForTimeout(900);
    const cta1 = await page.evaluate(() => document.querySelector('[data-aff="look"] .af-cta').textContent);
    await page.evaluate(() => document.querySelector('[data-aff="look"] .af-cta').click()); await page.waitForTimeout(1500);
    const lk = await page.evaluate(() => ({ skin: S.skin, i: AFF.i, on: document.querySelector('#aff-track .aff.on').dataset.aff, cta: document.querySelector('[data-aff="look"] .af-cta').textContent, sl: Math.round(document.getElementById('aff-track').scrollLeft), step: affStep(document.getElementById('aff-track')) }));
    ok('« Essayer le sombre » : thème Sombre, même affiche, bouton « Passer en clair »', cta1 === 'Essayer le sombre' && lk.skin === 'sombre' && lk.on === 'look' && lk.cta === 'Passer en clair' && Math.abs(lk.sl - lk.i * lk.step) <= 2, { cta1, ...lk });
    await page.evaluate(() => document.querySelector('[data-aff="look"] .af-cta').click()); await page.waitForTimeout(1500);
    ok('« Passer en clair » : retour au thème Coopô', await page.evaluate(() => S.skin) === 'defaut');
    // « Je suis dispo » ouvre la fenêtre de dispo
    await page.evaluate(() => affGo(0)); await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('[data-aff="dispo"] .af-cta').click()); await page.waitForTimeout(500);
    const dlg = await page.evaluate(() => { const d = document.getElementById('dlg'); return { open: d.open, h: (d.querySelector('h3') || {}).textContent }; });
    ok('« Je suis dispo » ouvre la fenêtre', dlg.open, dlg);
    await page.evaluate(() => { const d = document.getElementById('dlg'); if (d.open) d.close(); });
    // clavier : flèche droite depuis le bouton d'une affiche
    await page.evaluate(() => document.querySelector('#aff-track .aff.on .af-cta').focus({ preventScroll: true }));
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900);
    const kb = await page.evaluate(() => ({ i: AFF.i, focusIn: document.activeElement.closest('.aff') === document.querySelectorAll('#aff-track .aff')[1] }));
    ok('flèche droite : affiche suivante et focus sur son bouton', kb.i === 1 && kb.focusIn, kb);
    // en revenant sur l'accueil depuis un autre onglet : la première affiche
    await nav(page, 'matchs', 600); await nav(page, 'accueil', 800);
    ok('retour sur l\'accueil : première affiche', await page.evaluate(() => AFF.i === 0 && document.getElementById('aff-track').scrollLeft === 0));
    // l'onglet Profil ouvre le profil et s'allume
    await page.evaluate(() => document.querySelector('#tabbar [data-nav="profil"]').click()); await page.waitForTimeout(800);
    const pr = await page.evaluate(() => ({ hash: location.hash, tab: [...document.querySelectorAll('#tabbar [aria-current]')].map(a => a.dataset.nav), ring: getComputedStyle(document.querySelector('#tabbar [data-nav="profil"] .av')).boxShadow }));
    ok('onglet Profil → profil, onglet allumé', pr.hash === '#/profil' && pr.tab.join() === 'profil' && /2px/.test(pr.ring), pr);
    // Messages : le titre sur une ligne, sans photo
    await nav(page, 'messages', 800);
    const ms = await page.evaluate(() => { const h = document.querySelector('.sn-top h2'), bs = [...document.querySelectorAll('.sn-top .sn-round')].filter(b => getComputedStyle(b).display !== 'none'); return { me: document.querySelectorAll('.me-btn').length, h2h: h && Math.round(h.getBoundingClientRect().height), h2full: h && h.scrollWidth <= h.clientWidth + 1, right: Math.round(innerWidth - bs[bs.length - 1].getBoundingClientRect().right) }; });
    ok('Messages : le titre entier sur une ligne, les boutons dans l\'écran', !ms.me && ms.h2full && ms.h2h < 40 && ms.right >= 8, ms);
    // pages des onglets et pages secondaires : la première ligne de la page n'est plus décalée par la photo
    for (const pg of ['matchs', 'groupes', 'groupe', 'recherche', 'aide', 'joueur/a03']) {
      await nav(page, pg, 600);
      const t = await page.evaluate(() => { const first = document.querySelector('#app .page-head, #app .back, #app h2'); const rf = first.getBoundingClientRect(); return { me: document.querySelectorAll('.me-btn').length, firstTop: Math.round(rf.top), right: Math.round(rf.right) }; });
      ok(pg + ' : plus de photo en haut, la page commence en haut', !t.me && t.firstTop < 140 && t.right <= 360, t);
    }
    // profil : la barre garde inventaire et boutique à gauche
    await nav(page, 'profil', 600);
    const pf = await page.evaluate(() => { const top = document.querySelector('.top'), inv = top.querySelector('.inv-btn'); return { bar: Math.round(top.getBoundingClientRect().height), invLeft: Math.round(inv.getBoundingClientRect().left) }; });
    ok('profil : inventaire à gauche', pf.invLeft < 40, pf);
    for (const pg of ['accueil', 'profil', 'messages', 'matchs', 'groupe', 'groupes', 'inventaire']) { await nav(page, pg, 600); const of = await overflow(page); if (of.bad.length || of.scrollW > of.w) ok('débordement ' + pg, false, of); }
    ok('erreurs JS (téléphone)', !log.errors.length, log.errors);
    await browser.close();
  }
  // ---------- Messages sur petits et moyens téléphones ----------
  for (const W of [320, 360, 375, 393]) {
    const { browser, page, log } = await setup({ width: W, height: 740, mobile: true, touch: true });
    await nav(page, 'messages', 800);
    const ms = await page.evaluate(() => { const h = document.querySelector('.sn-top h2'), bs = [...document.querySelectorAll('.sn-top .sn-round')].filter(b => getComputedStyle(b).display !== 'none'); return { h2h: Math.round(h.getBoundingClientRect().height), full: h.scrollWidth <= h.clientWidth + 1, n: bs.length, right: Math.round(innerWidth - bs[bs.length - 1].getBoundingClientRect().right) }; });
    ok(`Messages ${W} px : titre sur une ligne, boutons dans l'écran`, ms.h2h < 40 && ms.full && ms.right >= 8, ms);
    await browser.close();
  }
  // ---------- ordinateur ----------
  {
    const { browser, page, log } = await setup({ width: 1280, height: 800, motion: true });
    await nav(page, 'accueil', 800);
    const d = await page.evaluate(() => ({ prev: getComputedStyle(document.querySelector('.aff-prev')).opacity, prevDis: document.querySelector('.aff-prev').disabled, next: getComputedStyle(document.querySelector('.aff-next')).display, me: document.querySelectorAll('.me-btn').length ? 'là' : 'none', tab: getComputedStyle(document.getElementById('tabbar')).display, rail: [...document.querySelectorAll('.sr-nav a')].map(a => a.dataset.nav).join(',') }));
    ok('ordinateur : flèches, pas de photo en haut, barre du bas cachée, colonne sans l\'onglet Groupes (v23)', d.prevDis && d.next !== 'none' && d.me === 'none' && d.tab === 'none' && d.rail === 'accueil,matchs,groupes,messages,profil', d);
    await page.click('.aff-next'); await page.waitForTimeout(900);
    ok('flèche suivante : affiche 2', await page.evaluate(() => AFF.i) === 1);
    await page.click('.aff-prev'); await page.waitForTimeout(900);
    ok('flèche précédente : affiche 1', await page.evaluate(() => AFF.i) === 0);
    const of = await overflow(page); ok('pas de débordement (ordinateur)', !of.bad.length && of.scrollW <= of.w, of);
    ok('erreurs JS (ordinateur)', !log.errors.length, log.errors);
    await browser.close();
  }
  // ---------- 900 px : en-tête avec menu ----------
  {
    const { browser, page, log } = await setup({ width: 900, height: 800 });
    await nav(page, 'accueil', 800);
    const d = await page.evaluate(() => ({ me: document.querySelectorAll('.me-btn').length ? 'là' : 'none', nav: [...document.querySelectorAll('.top .navpill a')].map(a => a.dataset.nav).join(',') }));
    ok('900 px : menu du haut avec Profil, pas de photo', d.me === 'none' && /profil/.test(d.nav), d);
    await browser.close();
  }
  console.log(out.join('\n'));
})();

// v21 — « la page se charge deux fois » : quand de nouvelles données arrivent juste après l'arrivée sur une page,
// la page se redessine sans rien rejouer (fondu, cartes, cercles) ; et si rien n'a changé, elle ne se redessine pas du tout.
const { launch, seed, open, nav, mkSeed } = require('./lib');
const out = []; const ok = (name, cond, extra) => out.push((cond ? 'OK   ' : 'ÉCHEC') + ' ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra).slice(0, 900) : ''));
const SKINS = (process.env.SKINS || 'soft,defaut').split(',');
async function setup(skin) {
  const { browser, page, log } = await launch({ width: 393, height: 852, mobile: true, touch: true, motion: true });
  const sd = mkSeed(), now = Date.now();
  ['a02', 'a03', 'a04'].forEach(u => { sd.db[`requests/${u}_a01`] = { from: u, to: 'a01', participants: [u, 'a01'], status: 'accepted', at: now - 9e6 }; });
  sd.db['purchases/a01'] = { pack: true };
  await seed(page, sd.db, sd.users);
  await open(page, '', 600);
  await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
  // le conteneur de test a 2 cœurs : le site passerait en « mode léger » (animations coupées) ; on le coupe pour voir les vraies animations
  await page.evaluate(s => { const d = document.getElementById('dlg'); if (d.open) d.close(); S.owned = { pack: true }; setLite(false); applySkin(s); route(); }, skin); await page.waitForTimeout(500);
  return { browser, page, log };
}
// enregistre, image par image, ce qu'on voit pendant 1,8 s après avoir touché « Matchs »
const film = page => page.evaluate(() => new Promise(res => {
  const t0 = performance.now(), fr = []; let redrawAt = null;
  const mo = new MutationObserver(() => { if (fr.length && !app.querySelector('[data-mark]') && redrawAt == null) redrawAt = Math.round(performance.now() - t0); });
  addEventListener('hashchange', () => { const f = app.firstElementChild; if (f) f.dataset.mark = '1'; mo.observe(app, { childList: true });
    const step = () => { const t = Math.round(performance.now() - t0), f = app.firstElementChild, card = app.querySelector('.mcard'), ring = app.querySelector('.mcard .ring[data-count] span');
      fr.push({ t, mark: !!app.querySelector('[data-mark]'), page: f ? +(+getComputedStyle(f).opacity).toFixed(2) : null, card: card ? +(+getComputedStyle(card).opacity).toFixed(2) : null, ring: ring ? parseInt(ring.firstChild.nodeValue) : null, target: ring ? +ring.parentElement.dataset.count : null });
      if (t < 1800) requestAnimationFrame(step); else { mo.disconnect(); res({ fr, redrawAt }); } };
    requestAnimationFrame(step); }, { once: true });
  location.hash = '#/matchs';
}));
(async () => {
  for (const skin of SKINS) {
    const { browser, page, log } = await setup(skin);
    // 1. rien n'a changé : la page ne se redessine pas
    await nav(page, 'groupes', 900);
    await page.evaluate(() => { DB._lastPlayers = 0; window.__mock.netDelay = 380; });   // comme sur le vrai réseau (vidéo d'Aki : environ 0,4 s)
    let r = await film(page);
    ok(`${skin} · données identiques : la page ne se redessine pas`, r.redrawAt == null && r.fr[r.fr.length - 1].mark, { redrawAt: r.redrawAt });
    // 2. un mate vient de se connecter : la page se redessine, sans rien rejouer
    await nav(page, 'groupes', 900);
    await page.evaluate(() => { DB._lastPlayers = 0; window.__mock.netDelay = 380; const p = window.__mock.db['profiles/a03']; window.__mock.db['profiles/a03'] = { ...p, online: true, lastSeen: Date.now() }; });
    r = await film(page); await page.evaluate(() => { window.__mock.netDelay = 25; });
    const fr = r.fr, i = fr.findIndex(f => !f.mark), before = fr.slice(0, i), after = fr.slice(i);
    const dip = (k) => { let worst = 0; for (let j = 1; j < fr.length; j++) { const a = fr[j - 1][k], b = fr[j][k]; if (a != null && b != null && b < a) worst = Math.max(worst, a - b); } return +worst.toFixed(2); };
    const ringDrop = (() => { let w = 0; for (let j = 1; j < fr.length; j++) { const a = fr[j - 1], b = fr[j]; if (a.ring != null && b.ring != null && a.target === b.target && b.ring < a.ring) w = Math.max(w, a.ring - b.ring); } return w; })();
    const online = await page.evaluate(() => !!app.querySelector('.mcard') && PLAYERS.find(p => p.id === 'a03').online === true);
    ok(`${skin} · un mate se connecte : la page se redessine une fois (${r.redrawAt} ms après), avec la nouvelle donnée`, r.redrawAt != null && i > 0 && online, { redrawAt: r.redrawAt, frames: fr.length });
    ok(`${skin} · pas de nouveau fondu : la page ne redevient jamais plus transparente`, dip('page') <= 0.02, { dip: dip('page'), autour: fr.slice(Math.max(0, i - 3), i + 4) });
    ok(`${skin} · les cartes ne recommencent pas leur entrée`, dip('card') <= 0.02, { dip: dip('card'), autour: fr.slice(Math.max(0, i - 3), i + 4).map(f => [f.t, f.card]) });
    ok(`${skin} · le cercle de compatibilité ne repart pas de 0`, ringDrop <= 1, { ringDrop, autour: fr.slice(Math.max(0, i - 3), i + 4).map(f => [f.t, f.ring, f.target]) });
    const end = fr[fr.length - 1];
    ok(`${skin} · à la fin tout est en place (page et cartes visibles, cercle au bon chiffre)`, end.page === 1 && end.card === 1 && end.ring === end.target, end);
    // 3. la page redessinée longtemps après (nouvelle donnée) : tout est déjà à sa place, rien ne bouge
    await page.waitForTimeout(600);
    await page.evaluate(() => { app.firstElementChild.dataset.mark = '1'; });
    const late = await page.evaluate(() => new Promise(res => { route(); const f = app.firstElementChild, c = app.querySelector('.mcard'), ring = app.querySelector('.mcard .ring[data-count] span');
      requestAnimationFrame(() => res({ redrawn: !app.querySelector('[data-mark]'), page: +getComputedStyle(f).opacity, card: c ? +getComputedStyle(c).opacity : null, ring: ring ? parseInt(ring.firstChild.nodeValue) : null, target: ring ? +ring.parentElement.dataset.count : null, running: app.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a.effect.getComputedTiming().iterations !== Infinity).length })); }));
    ok(`${skin} · redessinée plus tard : tout est déjà en place dès la première image`, late.redrawn && late.page === 1 && late.card === 1 && late.ring === late.target && late.running === 0, late);
    // 4. en changeant vraiment de page, les entrées se jouent toujours
    await nav(page, 'groupes', 900);
    const fresh = await page.evaluate(() => new Promise(res => { location.hash = '#/matchs'; requestAnimationFrame(() => requestAnimationFrame(() => { const c = app.querySelector('.mcard'), ring = app.querySelector('.mcard .ring[data-count] span'); res({ card: c ? +getComputedStyle(c).opacity : null, ring: ring ? parseInt(ring.firstChild.nodeValue) : null, anims: app.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length }); })); }));
    ok(`${skin} · en arrivant sur une page : les cartes montent et le cercle se remplit, comme avant`, fresh.card !== null && fresh.card < 1 && fresh.ring !== null && fresh.ring < 20 && fresh.anims > 0, fresh);
    ok(`${skin} · erreurs JS`, !log.errors.length, log.errors);
    await browser.close();
  }
  console.log(out.join('\n'));
  const ko = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(ko ? ko + ' échec(s)' : 'tout est bon');
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

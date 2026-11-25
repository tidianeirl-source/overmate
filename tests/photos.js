const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const fs = require('fs'), path = require('path');
(async () => {
  // une vraie grande image de test (2400 x 1600) fabriquée par le navigateur
  for (const W of [360, 1440]) {
    const { browser, page, log } = await launch({ width: W, height: 800, mobile: W < 800, touch: W < 800 });
    const sd = mkSeed(), db = sd.db, now = Date.now();
    db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: 1 };
    db['groups/g3'] = { name: 'Team', desc: '', game: '', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a02'], invited: [], kicked: [], ageGroup: 'adult', at: now };
    await seed(page, db, sd.users); await open(page, '', 600);
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const x = c.getContext('2d'); for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i * 37 % 360},70%,${30 + i % 40}%)`; x.fillRect(Math.random() * 2400, Math.random() * 1600, 300, 200); } return c.toDataURL('image/png').split(',')[1]; });
    const file = path.join(__dirname, 'shots_pc', 'essai.png'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(png, 'base64'));
    await page.evaluate(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
    const ev = f => page.evaluate(f); const out = [];
    await nav(page, 'messages/a02', 800);
    out.push(['bouton', await ev(() => !!document.getElementById('photobtn')), JSON.stringify((await overflow(page)).bad)]);
    await page.setInputFiles('#photoin', file); await page.waitForTimeout(600); await page.click('#ps-send'); await page.waitForTimeout(2500);
    out.push(['privé', JSON.stringify(await ev(() => { const d = window.__mock.db, ph = Object.keys(d).filter(k => k.startsWith('chats/a01_a02/photos/')), m = Object.values(d).filter(x => x && x.photo)[0]; const p0 = ph[0] && d[ph[0]]; return { photos: ph.length, taille: p0 && p0.data.length, debut: p0 && p0.data.slice(0, 23), dim: p0 && [p0.w, p0.h], msg: m && m.photo, texte: m && m.text, img: !!document.querySelector('.photo-msg img') }; })), JSON.stringify((await overflow(page)).bad)]);
    await page.screenshot({ path: `shots_pc/photo-${W}.png` });
    await ev(() => { for (const k in PHOTOS) delete PHOTOS[k]; }); await nav(page, 'accueil', 200); await nav(page, 'messages/a02', 1200);
    out.push(['rechargée', await ev(() => !!document.querySelector('.photo-msg img'))]);
    await page.click('.photo-msg'); await page.waitForTimeout(300); out.push(['en grand', await ev(() => !!document.querySelector('#photo-view img'))]); await page.screenshot({ path: `shots_pc/photo-grand-${W}.png` }); await page.keyboard.press('Escape');
    await page.waitForTimeout(1100); await nav(page, 'groupe/g3', 800); await page.setInputFiles('#photoin', file); await page.waitForTimeout(600); await page.click('#ps-send'); await page.waitForTimeout(2500);
    out.push(['groupe', JSON.stringify(await ev(() => { const d = window.__mock.db; return { photos: Object.keys(d).filter(k => k.startsWith('groups/g3/photos/')).length, img: !!document.querySelector('.photo-msg img') }; }))]);
    // v10 — mon message : ⋯ → Supprimer → « Message supprimé » (la photo reste pour la modération) ; pas d'effacement définitif sur mes messages
    out.push(['effacement définitif sur le mien', await ev(() => (document.querySelector('.bubble.me .msg-more').click(), document.querySelectorAll('#mm-ov [data-gdel]').length + (mmClose(), 0)))]);
    await page.click('.bubble.me .msg-more'); await page.waitForTimeout(300); await page.click('[data-mm-del]'); await page.waitForTimeout(300); await page.click('#mm-del-ok'); await page.waitForTimeout(700);
    out.push(['supprimée par moi', JSON.stringify(await ev(() => { const d = window.__mock.db, m = Object.entries(d).filter(([k, x]) => k.startsWith('groups/g3/messages/') && x.photo)[0]; return { del: m && m[1].del, photos: Object.keys(d).filter(k => k.startsWith('groups/g3/photos/')).length, bulle: (document.querySelector('.bubble.me.del') || {}).textContent || '' }; }))]);
    // la modération du groupe (je suis le créateur) efface pour de bon la photo d'un autre membre
    await ev(() => { window.__mock.set('groups/g3/photos/phx', { data: 'data:image/jpeg;base64,AAAA', w: 4, h: 3, from: 'a02', at: Date.now() }); window.__mock.set('groups/g3/messages/mx', { from: 'a02', text: '📷 Photo', photo: { id: 'phx', w: 4, h: 3 }, at: Date.now() }); }); await page.waitForTimeout(700);
    out.push(['effacement définitif sur celui des autres', await ev(() => (document.querySelector('.bubble:not(.me) .msg-more').click(), document.querySelectorAll('#mm-ov [data-gdel]').length))]);
    await page.click('#mm-ov [data-gdel]'); await page.waitForTimeout(300); await page.click('#gdel-ok'); await page.waitForTimeout(700);
    out.push(['effacée par la modération', JSON.stringify(await ev(() => { const d = window.__mock.db; return { message: 'groups/g3/messages/mx' in d, photo: 'groups/g3/photos/phx' in d }; }))]);
    // un joueur de 15 ans n'a pas le bouton
    out.push(['mineur', await ev(() => { const y = new Date().getFullYear() - 15; S.me.dob = y + '-01-01'; return canPhoto(); })]);
    out.forEach(o => console.log(W, ...o)); console.log(JSON.stringify(log.errors).slice(0, 300)); await browser.close();
  }
})();

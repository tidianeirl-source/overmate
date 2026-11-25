// Ondes des vocaux : vrai enregistrement (micro factice de Chromium), ondes envoyées avec le message,
// anciens vocaux (sans ondes), lecture qui colore les barres, groupe, et anciennes règles (le vocal part sans les ondes)
const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
const W = +(process.env.W || 360), H = +(process.env.H || 740), SHOT = process.env.SHOT || '', SKIN = process.env.SKIN || '';
(async () => {
  const { browser, context, page, log } = await launch({ width: W, height: H, mobile: W < 800, touch: W < 800,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  await context.grantPermissions(['microphone'], { origin: 'https://coopo.test' });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: now - 9e6 };
  db['chats/a01_a02/messages/m1'] = { from: 'a02', text: 'On joue ce soir ?', at: now - 3600e3 };
  db['groups/g3'] = { name: 'Mes potes', desc: '', game: '', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a02'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6 };
  await seed(page, db, sd.users);
  let bad = 0; const out = [];
  const check = (cond, msg) => { if (!cond) { bad++; out.push('   ✗ ' + msg); } else out.push('   ✓ ' + msg); };
  const ev = (f, a) => page.evaluate(f, a);
  const step = async (name, fn, wait = 400) => { try { if (fn) await fn(); await page.waitForTimeout(wait); const o = await overflow(page); const errs = log.errors.splice(0);
      const ko = o.scrollW > o.w + 1 || o.bad.length || errs.length; if (ko) bad++; out.push((ko ? '⚠ ' : 'ok ') + name + (ko ? ' ' + JSON.stringify({ ...o, errs }).slice(0, 400) : ''));
      if (SHOT) await page.screenshot({ path: `${SHOT}/${W}-${String(out.length).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }); }
    catch (e) { bad++; out.push('⚠ ' + name + ' EXCEPTION ' + String(e.message).slice(0, 300)); } };
  const record = async (ms) => { await page.click('#micbtn'); await page.waitForTimeout(ms); await page.click('[data-rec="1"]'); await page.waitForTimeout(1600); };
  const msgs = (prefix) => ev(p => Object.entries(window.__mock.db).filter(([k, x]) => k.startsWith(p) && x.voice).map(([k, x]) => ({ k, voice: x.voice })), prefix);
  await open(page, '', 600);
  await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2600);
  await ev(() => { const d = document.getElementById('dlg'); if (d.open) d.close(); });
  if (SKIN) { await ev(s => { applySkin(s, false, { preview: true }); route(); }, SKIN); await page.waitForTimeout(300); }
  await nav(page, 'messages/a02', 800);

  let mine = null;
  await step('enregistrer un vocal', async () => { await record(2600);
    const m = await msgs('chats/a01_a02/messages/'); mine = m[0] && m[0].voice;
    out.push('   ondes envoyées : ' + JSON.stringify(mine));
    check(m.length === 1, 'un message vocal en base');
    check(mine && /^[0-9a-v]{36}$/.test(mine.w || ''), 'les ondes partent avec le message (36 caractères)');
    check(mine && new Set(mine.w || '').size > 1, 'des barres de hauteurs différentes');
    const b = await ev(id => { const x = document.querySelector(`.voice-play[data-voice="${id}"]`); return x && { wr: x.dataset.wr, bars: x.querySelectorAll('.vw:not(.vw-on) i').length, on: x.querySelectorAll('.vw-on i').length, h: [...x.querySelectorAll('.vw:not(.vw-on) i')].slice(0, 6).map(i => i.style.height), wave: Math.round(x.querySelector('.v-wave').getBoundingClientRect().width), clip: getComputedStyle(x.querySelector('.vw-on')).clipPath }; }, mine && mine.id);
    out.push('   bulle : ' + JSON.stringify(b));
    check(b && b.wr === '1' && b.bars === 36 && b.on === 36, 'la bulle montre les vraies ondes (36 barres)'); check(b && b.clip !== 'none' && /100%/.test(b.clip), 'avant lecture, aucune barre pleine (' + (b && b.clip) + ')'); }, 300);

  await step('lecture : les barres se colorent', async () => {
    await page.click(`.voice-play[data-voice="${mine.id}"]`); await page.waitForTimeout(1300); if (SHOT) await page.screenshot({ path: `${SHOT}/${W}-lecture-milieu.png` });
    const r = await ev(id => { const x = document.querySelector(`.voice-play[data-voice="${id}"]`); return { on: x.classList.contains('on'), p: x.querySelector('.v-wave').style.getPropertyValue('--vp'), clip: getComputedStyle(x.querySelector('.vw-on')).clipPath }; }, mine.id);
    out.push('   ' + JSON.stringify(r));
    check(r.on, 'bouton en pause (lecture en cours)'); check(parseFloat(r.p) > 5, 'les barres pleines avancent (' + r.p + ')');
    await page.waitForTimeout(2600);
    const e = await ev(id => { const x = document.querySelector(`.voice-play[data-voice="${id}"]`); return { on: x.classList.contains('on'), p: x.querySelector('.v-wave').style.getPropertyValue('--vp') }; }, mine.id);
    check(!e.on && parseFloat(e.p) === 0, 'à la fin, retour au début (' + e.p + ')'); }, 200);

  await step('ancien vocal sans ondes', async () => {
    await ev(() => { const k = Object.keys(window.__mock.db).find(k => k.startsWith('chats/a01_a02/voices/')); const data = window.__mock.db[k].data;
      window.__mock.set('chats/a01_a02/voices/ANCIENVOCAL12345678', { from: 'a02', data, dur: 2, at: Date.now() - 60e3 });
      window.__mock.set('chats/a01_a02/messages/old1', { from: 'a02', text: '🎤 Message vocal', at: Date.now() - 60e3, voice: { id: 'ANCIENVOCAL12345678', dur: 2 } }); });
    await page.waitForTimeout(800);
    const a = await ev(() => { const x = document.querySelector('.voice-play[data-voice="ANCIENVOCAL12345678"]'); return x && { wr: x.dataset.wr || '', bars: x.querySelectorAll('.vw:not(.vw-on) i').length, h: [...x.querySelectorAll('.vw:not(.vw-on) i')].map(i => i.style.height).join(',') }; });
    check(a && !a.wr && a.bars === 36, 'barres d\'attente avant la première écoute');
    await page.click('.voice-play[data-voice="ANCIENVOCAL12345678"]'); await page.waitForTimeout(1500);
    const b = await ev(() => { const x = document.querySelector('.voice-play[data-voice="ANCIENVOCAL12345678"]'); let kept = null; try { kept = JSON.parse(localStorage.getItem('coopo_vw') || '{}').ANCIENVOCAL12345678 || null; } catch (e) {}
      return { wr: x.dataset.wr || '', h: [...x.querySelectorAll('.vw:not(.vw-on) i')].map(i => i.style.height).join(','), kept }; });
    out.push('   gardées sur l\'appareil : ' + b.kept);
    check(b.wr === '1' && b.h !== a.h, 'les vraies ondes remplacent les barres d\'attente après l\'écoute');
    check(/^[0-9a-v]{36}$/.test(b.kept || ''), 'ondes gardées sur l\'appareil');
    await page.waitForTimeout(2500);
    await nav(page, 'accueil', 300); await nav(page, 'messages/a02', 900);
    const c = await ev(() => (document.querySelector('.voice-play[data-voice="ANCIENVOCAL12345678"]') || {}).dataset?.wr || '');
    check(c === '1', 'toujours là en revenant dans la conversation'); }, 300);

  await step('groupe : vocal avec ondes', async () => { await nav(page, 'groupe/g3', 900); await record(1800);
    const m = await msgs('groups/g3/messages/');
    check(m.length === 1 && /^[0-9a-v]{36}$/.test(m[0].voice.w || ''), 'les ondes partent aussi dans un groupe');
    const b = await ev(() => { const x = document.querySelector('#chatbox .voice-play'); return x && x.dataset.wr; }); check(b === '1', 'bulle du groupe avec les vraies ondes'); }, 300);

  await step('anciennes règles : le vocal part quand même', async () => { await page.waitForTimeout(1200); await nav(page, 'messages/a02', 800);
    await ev(() => { window.__mock.denyNext = op => /\/messages\//.test(op.path) && op.data && op.data.voice && 'w' in op.data.voice; });
    const n0 = (await msgs('chats/a01_a02/messages/')).length;
    await record(1500); await page.waitForTimeout(600);
    await ev(() => { window.__mock.denyNext = null; });
    const m = await msgs('chats/a01_a02/messages/');
    const t = await ev(() => document.getElementById('toast').textContent);
    out.push('   message : « ' + t + ' »');
    check(m.length === n0 + 1, 'le vocal est parti'); check(m.filter(x => !x.k.endsWith('old1') && x.voice.w === undefined).length === 1, 'il est parti sans les ondes, refusées par les anciennes règles'); }, 300);

  console.log(out.join('\n')); console.log(bad ? bad + ' problème(s)' : 'tout est bon'); if (log.console.length) console.log('console :', [...new Set(log.console)].filter(x => !/preload|Service Worker/.test(x)).slice(0, 8).join(' | ').slice(0, 1200));
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });

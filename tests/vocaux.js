const { launch, seed, open, nav, overflow, mkSeed } = require('./lib');
(async () => {
  const W = +(process.env.W || 360);
  const { browser, page, log } = await launch({ width: W, height: 740, mobile: W < 800, touch: W < 800 });
  await page.addInitScript(() => {
    navigator.mediaDevices = navigator.mediaDevices || {};
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() { window.__micStopped = true; } }] });
    window.MediaRecorder = class { constructor(s, o) { this.state = 'inactive'; this.mimeType = (o && o.mimeType) || 'audio/webm'; }
      static isTypeSupported(t) { return /webm/.test(t); }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable({ data: new Blob([new Uint8Array(3000)]) }); setTimeout(() => this.onstop(), 10); } };
  });
  const sd = mkSeed(), db = sd.db, now = Date.now();
  db['requests/a02_a01'] = { from: 'a02', to: 'a01', participants: ['a02', 'a01'], status: 'accepted', at: now - 9e6 };
  db['chats/a01_a02/messages/m1'] = { from: 'a02', text: 'On joue ce soir ?', at: now - 3600e3 };
  db['groups/g3'] = { name: 'Mes potes', desc: '', game: '', image: '', private: true, owner: 'a01', mods: [], members: ['a01', 'a02'], invited: [], kicked: [], ageGroup: 'adult', at: now - 3e6 };
  await seed(page, db, sd.users);
  const ev = (f, a) => page.evaluate(f, a); const out = [];
  await open(page, '', 600); await ev(() => window.__mock.signIn('a01@test.ci')); await page.waitForTimeout(2800);
  await nav(page, 'messages/a02', 700);
  out.push(['micro visible', await ev(() => !!document.getElementById('micbtn')), await overflow(page)]);
  await page.click('#micbtn'); await page.waitForTimeout(1300);
  await page.screenshot({ path: `shots_voc/1-enregistrement-${W}.png` });
  out.push(['barre', await ev(() => document.querySelector('.rec-bar b').textContent), await overflow(page)]);
  await page.click('[data-rec="1"]'); await page.waitForTimeout(900);
  out.push(['privé', await ev(() => { const d = window.__mock.db, v = Object.keys(d).filter(k => k.startsWith('chats/a01_a02/voices/')), m = Object.entries(d).filter(([k, x]) => k.startsWith('chats/a01_a02/messages/') && x.voice); return { voices: v.length, len: v[0] && d[v[0]].data.slice(0, 30), dur: v[0] && d[v[0]].dur, msg: m[0] && m[0][1], lie: m[0] && v[0] && v[0].endsWith(m[0][1].voice.id), btn: document.querySelectorAll('.voice-play').length, mic: window.__micStopped, rec: document.querySelector('.chat-form').className, local: JSON.stringify(S.chats.a02 || S.chats[Object.keys(S.chats)[0]]).includes('data:audio') }; }), await overflow(page)]);
  await page.screenshot({ path: `shots_voc/2-bulle-${W}.png` });
  // annuler
  await page.click('#micbtn'); await page.waitForTimeout(900); await page.click('[data-rec="0"]'); await page.waitForTimeout(300);
  out.push(['annulé', await ev(() => Object.keys(window.__mock.db).filter(k => k.includes('/voices/')).length)]);
  // rechargement : le son se retélécharge
  out.push(['relecture', await ev(async () => { const id = document.querySelector('.voice-play').dataset.voice; delete VOICES[id]; const d = await DB.loadVoice('c', document.querySelector('.voice-play').dataset.vo, id); return d && d.slice(0, 22); })]);
  // groupe
  await page.waitForTimeout(1100); await nav(page, 'groupe/g3', 900);
  await page.click('#micbtn'); await page.waitForTimeout(1200); await page.click('[data-rec="1"]'); await page.waitForTimeout(900);
  out.push(['groupe', await ev(() => { const d = window.__mock.db; return { voices: Object.keys(d).filter(k => k.startsWith('groups/g3/voices/')).length, msgs: Object.entries(d).filter(([k, x]) => k.startsWith('groups/g3/messages/') && x.voice).length, btn: document.querySelectorAll('.voice-play').length }; }), await overflow(page)]);
  await page.screenshot({ path: `shots_voc/3-groupe-${W}.png` });
  // v10 — mon vocal : ⋯ → Supprimer → « Message supprimé » (le son reste pour la modération) ; pas d'effacement définitif sur mes messages
  out.push(['effacement définitif sur le mien', await ev(() => (document.querySelector('.bubble.me .msg-more').click(), document.querySelectorAll('#mm-ov [data-gdel]').length + (mmClose(), 0)))]);
  await page.click('.bubble.me .msg-more'); await page.waitForTimeout(300); await page.click('[data-mm-del]'); await page.waitForTimeout(300); await page.click('#mm-del-ok'); await page.waitForTimeout(700);
  out.push(['supprimé par moi', await ev(() => { const d = window.__mock.db, m = Object.entries(d).filter(([k, x]) => k.startsWith('groups/g3/messages/') && x.voice)[0]; return { del: m && m[1].del, voices: Object.keys(d).filter(k => k.startsWith('groups/g3/voices/')).length, bulle: (document.querySelector('.bubble.me.del') || {}).textContent || '', lecteur: document.querySelectorAll('.voice-play').length }; })]);
  // la modération du groupe (je suis le créateur) efface pour de bon le vocal d'un autre membre, avec son son
  await ev(() => { window.__mock.set('groups/g3/voices/vx', { data: 'data:audio/webm;base64,AAAA', dur: 2, from: 'a02', at: Date.now() }); window.__mock.set('groups/g3/messages/mx', { from: 'a02', text: '🎤 Message vocal', voice: { id: 'vx', dur: 2 }, at: Date.now() }); }); await page.waitForTimeout(700);
  out.push(['effacement définitif sur celui des autres', await ev(() => (document.querySelector('.bubble:not(.me) .msg-more').click(), document.querySelectorAll('#mm-ov [data-gdel]').length))]);
  await page.click('#mm-ov [data-gdel]'); await page.waitForTimeout(300); await page.click('#gdel-ok'); await page.waitForTimeout(700);
  out.push(['effacé par la modération', await ev(() => { const d = window.__mock.db; return { message: 'groups/g3/messages/mx' in d, son: 'groups/g3/voices/vx' in d }; })]);
  out.forEach(o => console.log(JSON.stringify(o))); console.log('erreurs', JSON.stringify(log.errors).slice(0, 600), JSON.stringify(log.console).slice(0, 500));
  await browser.close();
})();

const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const REPO = process.env.REPO || path.resolve(__dirname, '..');
const MOCK = fs.readFileSync(path.join(__dirname, 'fbmock.js'), 'utf8');
const GSI = fs.readFileSync(path.join(__dirname, 'gsimock.js'), 'utf8');
const ORIGIN = 'https://coopo.test';
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };

async function launch(opts = {}) {
  const browser = await chromium.launch({ args: opts.args || [] });
  const context = await browser.newContext({ viewport: { width: opts.width || 360, height: opts.height || 740 }, serviceWorkers: 'block', deviceScaleFactor: +(opts.dsf || process.env.DSF || 1), hasTouch: !!opts.touch, isMobile: !!opts.mobile, locale: 'fr-FR', reducedMotion: opts.motion ? 'no-preference' : 'reduce', ...(opts.video ? { recordVideo: { dir: opts.video, size: { width: opts.width || 360, height: opts.height || 740 } } } : {}) });
  const log = { errors: [], console: [], blocked: [], pay: [] };
  await context.route('**/*', async route => {
    const url = route.request().url(), u = new URL(url);
    if (u.origin === ORIGIN) {
      let p = u.pathname === '/' ? '/index.html' : u.pathname;
      if (p === '/blank.html') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>blank</title>' });
      const f = path.join(REPO, p);
      if (fs.existsSync(f)) return route.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
      return route.fulfill({ status: 404, body: 'not found' });
    }
    if (u.hostname === 'www.gstatic.com' && /firebase-app-compat/.test(url)) { log.fbTries = (log.fbTries || 0) + 1; if (opts.noFirebase || (opts.failFirst && log.fbTries <= opts.failFirst)) return route.abort(); if (opts.fbDelay) await new Promise(r => setTimeout(r, opts.fbDelay)); return route.fulfill({ contentType: 'application/javascript', headers: { 'cache-control': 'no-store' }, body: MOCK }); }
    if (u.hostname === 'accounts.google.com') { log.gsi = (log.gsi || 0) + 1; return opts.noFirebase ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: GSI }); }
    if (u.hostname === 'www.gstatic.com') return opts.noFirebase ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: '/* mock */' });
    if (u.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '/* fonts */' });
    if (u.hostname === 'images.unsplash.com') { log.unsplash = (log.unsplash || []).concat(url); return process.env.PHOTO_FILE ? route.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(process.env.PHOTO_FILE) }) : process.env.PHOTO === '1' ? route.fulfill({ contentType: 'image/png', body: PNG1 }) : route.abort(); }   // photo du thème Prunier : absente en test (le dessin de secours s'affiche)
    if (u.hostname === 'coopo-paiement.vercel.app') { log.pay.push({ url, body: route.request().postData(), auth: route.request().headers()['authorization'] }); const h = opts.pay || (() => ({ status: 200, json: { url: ORIGIN + '/#/paiement/OMTEST1' } })); const r = h(u, route.request()); return route.fulfill({ status: r.status || 200, contentType: 'application/json', body: JSON.stringify(r.json || {}) }); }
    log.blocked.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', e => log.errors.push(String(e.message || e) + (process.env.STACK ? ' @ ' + String(e.stack || '').split('\n').slice(1, 4).join(' <- ') : '')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.console.push(m.type() + ': ' + m.text().slice(0, 300)); });
  return { browser, context, page, log };
}
async function seed(page, db, users) {
  await page.goto(ORIGIN + '/blank.html');
  await page.evaluate(([db, users]) => { localStorage.clear(); localStorage.setItem('__mockdb', JSON.stringify(db)); localStorage.setItem('__mockusers', JSON.stringify(users || {})); }, [db, users]);
}
async function open(page, hash = '', wait = 500) { await page.goto(ORIGIN + '/index.html' + (hash ? '#/' + hash : '')); await page.waitForTimeout(wait); }
async function nav(page, hash, wait = 350) { await page.evaluate(h => { location.hash = '#/' + h; }, hash); await page.waitForTimeout(wait); }
const overflow = page => page.evaluate(() => { const w = document.documentElement.clientWidth; const bad = []; document.querySelectorAll('body *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) { const cs = getComputedStyle(el); if (cs.position === 'fixed' && (el.id === 'fx' || el.id === 'wipe' || el.closest('#fx,#wipe,.orbs'))) return; let p = el, clipped = false; while (p && p !== document.body) { const o = getComputedStyle(p); if (p !== el && (o.overflowX === 'hidden' || o.overflowX === 'auto' || o.overflowX === 'scroll' || o.overflowX === 'clip')) { clipped = true; break; } p = p.parentElement; } if (!clipped) bad.push((el.tagName + '.' + String(el.className).slice(0, 40) + ' ' + Math.round(r.left) + '→' + Math.round(r.right)).replace(/\s+/g, ' ')); } }); return { scrollW: document.documentElement.scrollWidth, w, bad: bad.slice(0, 6) }; });

/* ----- données de test ----- */
function mkSeed(nAdult = 40, nMinor = 8) {
  const db = {}, users = {}; const now = Date.now();
  const GAMES = ['Free Fire', 'eFootball', 'Call of Duty Mobile', 'EA FC Mobile', 'PUBG Mobile', 'Fortnite', 'Roblox', 'Minecraft', 'Valorant', 'Mobile Legends'];
  const RK = { 'Free Fire': ['Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Héroïque', 'Grand Maître'], 'Valorant': ['Fer', 'Bronze', 'Argent', 'Or', 'Platine', 'Diamant', 'Ascendant', 'Immortel', 'Radiant'] };
  const HOURS = ['matin', 'aprem', 'soir', 'nuit'], DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], C = ['CI', 'SN', 'CM', 'ML', 'BF', 'FR', ''], LG = [['fr'], ['fr', 'en'], ['fr', 'dyu'], []];
  const mk = (uid, name, i, minor) => {
    const games = [GAMES[i % 10], GAMES[(i * 3 + 1) % 10], GAMES[(i * 7 + 2) % 10]].filter((g, k, a) => a.indexOf(g) === k);
    const ranks = {}; games.forEach((g, k) => { ranks[g] = RK[g] ? RK[g][(i + k) % RK[g].length] : String(1 + (i + k) % 5); });
    db['profiles/' + uid] = { name, nameLower: name.toLowerCase(), avatar: { hue: (i * 47) % 360 }, games, ranks, roles: {}, tags: i % 2 ? { [games[0]]: name + '_ig' } : {}, hours: [HOURS[i % 4], HOURS[(i + 2) % 4]], days: [DAYS[i % 7], DAYS[(i + 3) % 7]],
      style: ['comp', 'casual', 'both'][i % 3], goal: 'both', voice: 'parfois', platforms: i % 4 === 0 ? ['pc', 'ps'] : ['mobile'], country: C[i % 7], langs: LG[i % 4], ageGroup: minor ? 'minor' : 'adult', hidden: false, banned: false, rejoue: i % 5,
      online: i % 3 === 0, lastSeen: i % 3 === 0 ? now - 30000 : now - 3600e3 * i, privacy: { discord: true, tags: true, online: true }, discordPublic: true, updatedAt: now,
      ...(i % 6 === 1 ? { dispo: { game: games[0], note: i % 12 === 1 ? 'Ranked, vocal ok' : '', since: now - 600e3, until: now + 2 * 3600e3 } } : {}) };
    db['private/' + uid] = { dob: minor ? '2010-03-0' + (1 + i % 9) : '199' + (i % 10) + '-06-1' + (i % 10), updatedAt: now };
    db['usernames/' + name.toLowerCase()] = { uid };
    db['contacts/' + uid] = { discord: name.toLowerCase() + '.dc', whatsapp: minor ? '' : (i % 2 ? '+2250700000' + String(100 + i) : ''), snapchat: i % 3 ? name.toLowerCase() : '', instagram: '', tiktok: i % 4 ? name.toLowerCase() + '.tt' : '', x: '', youtube: '', twitch: '', updatedAt: now };
    users[uid + '@test.ci'] = { uid, email: uid + '@test.ci', pw: 'azerty12', provider: 'password', emailVerified: true, displayName: name };
  };
  const NAMES = ['KoffiNight', 'AwaBuild', 'DjeliSniper', 'MamadouFC', 'YaoRush', 'FatouCraft', 'Gbaka_225', 'NdeyeGG', 'TchopKing', 'AmaraPlays', 'Ziggy_Abj', 'KouameV', 'LenaBlitz', 'IbouGamer', 'Sira.Zone', 'Bintou-X', 'OusmaneLeLongPseudo20', 'Aya', 'Moussa_Ranked', 'Kader225'];
  for (let i = 0; i < nAdult; i++) mk('a' + String(i + 1).padStart(2, '0'), i < NAMES.length ? NAMES[i] : 'Joueur' + (i + 1), i, false);
  for (let i = 0; i < nMinor; i++) mk('k' + String(i + 1).padStart(2, '0'), 'Mini' + (i + 1), i + 3, true);
  db['squads/q1'] = { owner: 'a01', game: 'Free Fire', title: 'Squad ranked ce soir', hour: 'soir', day: 'ven', slots: 4, members: ['a01', 'a08'], voice: true, desc: 'On monte en Héroïque, vocal obligatoire.', ageGroup: 'adult', at: now - 3600e3 };
  db['squads/q2'] = { owner: 'a04', game: 'eFootball', title: 'Clubs Pro avec un très long titre pour voir si la carte tient sur un petit écran', hour: 'soir', day: 'dim', slots: 2, members: ['a04', 'a05'], voice: false, desc: '', ageGroup: 'adult', at: now - 7200e3 };
  db['squads/q3'] = { owner: 'k01', game: 'Roblox', title: 'Roblox entre potes', hour: 'aprem', day: 'mer', slots: 4, members: ['k01'], voice: false, desc: 'Blox Fruits', ageGroup: 'minor', at: now - 5000e3 };
  db['boards/adult/annonces/an1'] = { by: 'a07', byName: 'Gbaka_225', game: 'Free Fire', need: 2, rank: 'Héroïque', when: 'soir', text: 'Ranked ce soir, vocal obligatoire. On vise Grand Maître.', at: now - 40 * 60e3, until: now + 6 * 3600e3, replies: [] };
  db['boards/adult/annonces/an2'] = { by: 'a04', byName: 'MamadouFC', game: 'eFootball', need: 1, rank: 'Division 3', when: 'now', text: 'Coop 2v2 tout de suite.', at: now - 10 * 60e3, until: now + 2 * 3600e3, replies: ['a01'] };
  db['boards/minor/annonces/an3'] = { by: 'k02', byName: 'Mini2', game: 'Roblox', need: 2, rank: '', when: 'now', text: 'Blox Fruits ?', at: now - 20 * 60e3, until: now + 2 * 3600e3, replies: [] };
  db['boards/adult/tournois/t1'] = { title: 'Coupe Coopô Free Fire', game: 'Free Fire', date: now + 5 * 864e5, format: 'Escouades de 4 · élimination directe', max: 16, prize: 'Un thème au choix', desc: 'Inscris-toi seul, on complète les escouades.', players: ['a07', 'a01'], entries: {}, status: 'open', at: now };
  db['boards/minor/tournois/t2'] = { title: 'Défi Brawl Stars 15-17', game: 'Brawl Stars', date: now + 3 * 864e5, format: 'Solo', max: 12, prize: '', desc: '', players: ['k01'], entries: {}, status: 'open', at: now };
  db['admins/a02'] = { at: now };
  return { db, users };
}
module.exports = { launch, seed, open, nav, overflow, mkSeed, ORIGIN, REPO };

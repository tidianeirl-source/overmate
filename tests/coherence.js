// v22 — le code est dans js/ : index.html et sw.js doivent parler des mêmes fichiers, dans le même ordre, avec la même version
const fs = require('fs'), path = require('path');
const REPO = process.env.REPO || path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
const out = []; const ok = (n, c, x) => out.push((c ? 'OK   ' : 'ÉCHEC') + ' ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : ''));
const tags = [...html.matchAll(/<script src="js\/([a-z-]+)\.js\?v=(\d+)"><\/script>/g)].map(m => ({ n: m[1], v: +m[2] }));
const V = +(sw.match(/const V = (\d+);/) || [])[1];
const JS = JSON.parse((sw.match(/const JS = (\[[^\]]*\]);/) || [, '[]'])[1].replace(/'/g, '"'));
const files = fs.readdirSync(path.join(REPO, 'js')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
ok('index.html charge les fichiers de js/', tags.length >= 10, tags.length);
ok('une seule version partout (index.html et sw.js)', tags.every(t => t.v === V) && V > 0, { V, html: [...new Set(tags.map(t => t.v))] });
ok('sw.js garde les mêmes fichiers, dans le même ordre', JSON.stringify(tags.map(t => t.n)) === JSON.stringify(JS), { html: tags.map(t => t.n), sw: JS });
ok('chaque fichier existe, et aucun fichier de js/ n\'est oublié', tags.every(t => files.includes(t.n)) && files.every(f => tags.some(t => t.n === f)), { manquants: tags.filter(t => !files.includes(t.n)).map(t => t.n), oublies: files.filter(f => !tags.some(t => t.n === f)) });
ok('le nom du cache suit la version', /const CACHE = 'coopo-v' \+ V;/.test(sw));
ok('plus de gros script dans index.html', !/<script>\s*\/\* =+\s*\n\s*1\. CONFIGURATION/.test(html));
console.log(out.join('\n'));
const ko = out.filter(l => l.startsWith('ÉCHEC')).length; console.log(ko ? ko + ' échec(s)' : 'tout est bon');

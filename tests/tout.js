// Lance toutes les vérifications du site, l'une après l'autre, dans un navigateur sans fenêtre (Playwright).
// Chaque journal est rangé dans tests/journaux/<nom>-<test>.log.
//
// Utilisation (depuis le dossier du projet) :
//   node tests/tout.js avant            toutes les vérifications, journaux nommés « avant »
//   node tests/tout.js apres            pareil après une modification
//   node tests/comparer.js avant apres  ce qui a changé entre les deux
//   node tests/tout.js essai smoke pc   seulement les vérifications nommées
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');

const TAG = process.argv[2] || 'essai';
const SEULEMENT = process.argv.slice(3);
// [nom du journal, fichier, variables d'environnement en plus]
const LISTE = [
  ...['gcall', 'v15', 't3', 'fond', 'tk', 'reply', 't2', 'motion', 'stk', 'ondes', 'pushsw', 'push', 'rail', 'ages', 'ring', 'empty', 'pc', 'dlgbar', 'mob', 'vocaux',
    'retrait', 'inv', 'photos', 'modo', 'ocean', 'views', 'rx', 't4', 'appels', 'edit', 'groupes'].map(n => [n, n]),
  ['uni360', 'uni-check2', { TAG: 'uc360' }],
  ['uni1280', 'uni-check2', { W: '1280', TAG: 'uc1280' }],
  ['affi', 'aff-interact'], ['nav', 'nav-test'], ['anim', 'anim-test'], ['msgg', 'msg-groupes'], ['redraw', 'redraw-test'],
  ['coherence', 'coherence'], ['smoke', 'smoke'], ['onbrail', 'onb-rail'], ['railg', 'rail-groupes'], ['menuliste', 'menu-liste'], ['ecrit', 'ecrit'],
];
// Une ligne qui signale un problème (même règle que tests/comparer.js)
const MAUVAISE = /✗|^⚠|ÉCHEC|TEST FAIL|problème\(s\)|Error|EXCEPTION|échec\(s\)/;

const DIR = path.join(__dirname, 'journaux');
fs.mkdirSync(DIR, { recursive: true });
let total = 0;
for (const [nom, fichier, env] of LISTE) {
  if (SEULEMENT.length && !SEULEMENT.includes(nom) && !SEULEMENT.includes(fichier)) continue;
  const debut = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, fichier + '.js')], {
    cwd: __dirname, env: { ...process.env, ...(env || {}) }, encoding: 'utf8', timeout: 400e3, maxBuffer: 64 * 1024 * 1024,
  });
  const texte = (r.stdout || '') + (r.stderr || '') + (r.error ? '\nEXCEPTION ' + r.error.message : '');
  fs.writeFileSync(path.join(DIR, `${TAG}-${nom}.log`), texte);
  const mauvaises = texte.split('\n').filter(l => MAUVAISE.test(l)).length;
  total += mauvaises;
  const etat = r.status === 0 && !r.error ? 'fini' : `code ${r.status}${r.error ? ' (' + r.error.code + ')' : ''}`;
  console.log(`${nom.padEnd(10)} ${etat.padEnd(12)} ${String(mauvaises).padStart(3)} ligne(s) à regarder   ${Math.round((Date.now() - debut) / 1000)} s`);
}
console.log(`\nJournaux : tests/journaux/${TAG}-*.log — ${total} ligne(s) à regarder en tout.`);
console.log('Ce chiffre seul ne dit pas si quelque chose est cassé : compare avec la version d\'avant (node tests/comparer.js).');

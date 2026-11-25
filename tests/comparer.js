// Compare deux séries de journaux (ex. « avant » et « apres ») : pour chaque vérification,
// les lignes qui signalent un problème sont-elles les mêmes ? Les nombres sont remplacés par # pour ne pas
// compter comme différence un temps ou une mesure qui bouge un peu.
// Utilisation : node tests/comparer.js avant apres
const fs = require('fs'), path = require('path');
const [A, B] = process.argv.slice(2);
if (!A || !B) { console.log('Utilisation : node tests/comparer.js avant apres'); process.exit(1); }
const DIR = path.join(__dirname, 'journaux');
const MAUVAISE = /✗|^⚠|ÉCHEC|TEST FAIL|problème\(s\)|Error|EXCEPTION|échec\(s\)/;
const lignes = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(l => MAUVAISE.test(l)).map(l => l.replace(/\d+/g, '#').slice(0, 220)) : null;
const noms = new Set();
for (const f of fs.existsSync(DIR) ? fs.readdirSync(DIR) : []) for (const t of [A, B]) if (f.startsWith(t + '-') && f.endsWith('.log')) noms.add(f.slice(t.length + 1, -4));
let differents = 0;
for (const n of [...noms].sort()) {
  const a = lignes(path.join(DIR, `${A}-${n}.log`)), b = lignes(path.join(DIR, `${B}-${n}.log`));
  if (!a || !b) { console.log(`${n.padEnd(10)} absent dans ${!a ? A : B}`); continue; }
  const sa = new Set(a), sb = new Set(b), pareil = sa.size === sb.size && [...sa].every(l => sb.has(l));
  console.log(`${n.padEnd(10)} ${A}:${String(a.length).padStart(3)}  ${B}:${String(b.length).padStart(3)}  ${pareil ? 'même' : 'DIFFÉRENT'}`);
  if (!pareil) {
    differents++;
    [...sa].filter(l => !sb.has(l)).slice(0, 8).forEach(l => console.log('    - ' + l));
    [...sb].filter(l => !sa.has(l)).slice(0, 8).forEach(l => console.log('    + ' + l));
  }
}
console.log(differents ? `\n${differents} vérification(s) DIFFÉRENTE(S) : lis les lignes + (nouvelles) et - (disparues).` : '\nAucune différence.');

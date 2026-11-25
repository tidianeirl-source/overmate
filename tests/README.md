# Vérifications du site

Chaque fichier ouvre le site dans un navigateur sans fenêtre (Playwright), joue un parcours (s'inscrire, écrire à un mate, créer un groupe, appeler, acheter un thème…) et écrit ce qu'il voit : ✓ quand c'est bon, ✗ ou ⚠ quand quelque chose ne va pas.

Le site est servi depuis ce dossier de projet, avec un **faux Firebase** (`fbmock.js`) et un faux bouton Google (`gsimock.js`) : rien ne part sur Internet, **aucune vérification ne touche la vraie base**. Les joueurs de test sont inventés (`mkSeed` dans `lib.js`).

## Installer (une seule fois)

```
npm install playwright
npx playwright install chromium
```

## Utiliser

Depuis le dossier du projet :

```
node tests/tout.js avant            toutes les vérifications, sur main, avant de changer quoi que ce soit
node tests/tout.js apres            les mêmes, après le changement
node tests/comparer.js avant apres  pour chaque vérification : « même » ou « DIFFÉRENT », avec les lignes qui ont changé
node tests/tout.js essai smoke pc   seulement les vérifications nommées
```

Compte environ 15 minutes pour tout. Les journaux sont dans `tests/journaux/`, les captures dans les dossiers `tests/shots…` ; ni les uns ni les autres ne partent sur GitHub.

## Lire le résultat

- Ce qui compte, c'est la **comparaison avec la version d'avant**. Quelques lignes ⚠ existent déjà sur `main` (par exemple des avertissements du navigateur sur Firebase) : elles ne sont pas un problème tant qu'elles restent les mêmes.
- `nav-test` prend une mesure à 90 ms, en plein glissement de page : elle varie d'une fois à l'autre, même sans rien changer.
- `coherence` vérifie que `index.html` et `sw.js` parlent des mêmes fichiers `js/`, dans le même ordre, avec le même numéro de version.

## Les fichiers

- `lib.js` : lance le navigateur, sert le site, prépare les joueurs de test (`launch`, `seed`, `open`, `nav`, `mkSeed`).
- `fbmock.js`, `gsimock.js` : faux Firebase et faux Google. Dans la page, `window.__mock` permet de se connecter (`__mock.signIn`) ou de lire la fausse base.
- `tout.js`, `comparer.js` : lancer et comparer.
- Les autres fichiers : une vérification chacun. Le commentaire en haut de chaque fichier dit ce qu'elle vérifie.

# Coopô

Le site pour trouver des mates de jeu : des joueurs compatibles, des messages et des groupes, des appels vocaux et vidéo, des annonces et des tournois.
En ligne : https://tidianeirl-source.github.io/overmate/ (GitHub Pages). Les comptes et les données sont dans Firebase (projet `overmate-1db74`).

## Les fichiers

| Fichier | Ce qu'il y a dedans |
| --- | --- |
| `index.html` | La page : le HTML, tout le CSS (thèmes compris) et trois petits scripts qui doivent tourner avant le premier affichage (thème, logo, écran d'ouverture). |
| `js/base.js` | Configuration, données de démo, moteur de compatibilité, état local (`S`, `save`), composants d'affichage (`avatar`, `toast`, fenêtres). |
| `js/navigation.js` | Menus, barre du bas, `route()` qui affiche chaque page, glissement des conversations, animations après affichage. |
| `js/pages.js` | Accueil (affiches), profil, matchs, recherche, page d'un joueur, réglages. |
| `js/themes.js` | Illustrations, effets animés, décor derrière l'appli, thème Lotus (carpes koï). |
| `js/boutique.js` | Boutique, paiement, inventaire, retour de paiement. |
| `js/appareil.js` | Notifications du téléphone et « push », parrainage, appli installable, enregistrement du service worker. |
| `js/apparence.js` | Polices des thèmes, changement de thème (`applySkin`), fond des conversations. |
| `js/connexion.js` | Connexion Google et e-mail (Firebase Authentication), écran d'ouverture, inscription. |
| `js/mates.js` | Langues, rangs des jeux, demandes de mate, mates épinglés, notifications. |
| `js/messages.js` | Messages privés, « Vu » et « écrit… », historique des appels. |
| `js/appels.js` | Appels vocaux et vidéo, sonnerie, haut-parleur. |
| `js/medias.js` | Photos, stickers, messages vocaux, modifier ou supprimer un message, réactions. |
| `js/sessions-flammes.js` | Sessions d'un soir, flammes des mates. |
| `js/groupes.js` | Groupes : création, invitations, discussion. |
| `js/communaute.js` | Annonces « Je cherche », tournois, partage de profil. |
| `js/pages-infos.js` | Aide, CGU, confidentialité, cookies, remboursement, « Nous écrire », modération, premiers pas. |
| `js/firebase.js` | `DB` : toutes les lectures et écritures de la base de données Firestore. |
| `js/demarrage.js` | Démarrage : premier affichage (`route()`) et connexion. |
| `sw.js` | Service worker : le site s'ouvre vite, marche hors connexion et se met à jour tout seul ; notifications d'appel. |
| `manifest.webmanifest`, `icons/` | L'appli installable (nom, icônes). |
| `atelier/plaques/` | Outils (Python) qui dessinent les plaques nominatives animées. |

## Comment le code se charge

Les fichiers de `js/` sont des scripts classiques, pas des modules : `index.html` les charge l'un après l'autre, dans l'ordre du tableau, et tout ce que l'un déclare (fonctions, constantes) est utilisable par les autres. Au chargement, un fichier ne doit rien appeler qui soit déclaré dans un fichier plus bas : les appels entre fichiers se font plus tard, quand le site tourne (le démarrage est à la fin, dans `js/demarrage.js`).

## À chaque mise en ligne

Changer le numéro de version au même endroit dans les deux fichiers :

- `sw.js` : `const V = 62;`
- `index.html` : le `?v=62` de chaque balise `<script src="js/…">`

Ainsi, la page et son code vont toujours ensemble : jamais une page neuve avec un vieux fichier gardé en cache.

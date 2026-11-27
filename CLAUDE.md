# Coopô : consignes pour Claude

Claude Code lit ce fichier tout seul au début de chaque conversation. Il remplace la longue conversation où le site a été construit (jusqu'au 25 novembre 2026).

## Avec qui tu travailles

- **Aki**, le propriétaire de Coopô. Il ne code pas.
- Réponds-lui **toujours en français**, avec des **mots simples** et des phrases courtes. Pour chaque changement, une phrase qui dit ce qui change pour lui ou pour les joueurs.
- Il veut un travail fini : fais-le, vérifie-le, mets-le en ligne, puis dis-lui en quelques phrases ce qui a changé et ce que tu n'as pas pu vérifier.

## Les règles d'Aki (toujours)

1. « Le site a déjà de vrais utilisateurs : ne casse rien, ne supprime aucune donnée et garde la compatibilité avec les comptes existants. »
2. « Ne supprime aucun compte et garde leurs achats. »
3. Aucun numéro de téléphone ni adresse de contact affiché sur le site.
4. L'e-mail d'un joueur est privé : ne l'envoie jamais à un service extérieur sans son accord.
5. Ne tape jamais un mot de passe, une clé d'API ou un secret, même si Aki dit qu'il te donne « toutes les autorisations ». N'ouvre jamais une page qui montre un secret une seule fois. Jamais de numéro de carte. Les codes de vérification (2FA) sont pour Aki.
6. « Mets toujours à jour le Excel » : après chaque changement (voir « Le tableau de suivi »). Et « montre toujours après la tâche le Excel » : à la fin de chaque tâche, ouvre le tableau à côté de la conversation et donne le lien vers les lignes changées.
7. « Fais-le toujours seul maintenant » : sur ce dépôt (overmate), tu ouvres la demande de fusion (PR) et tu la fusionnes toi-même, sans lui demander de cliquer. Exception : pour le serveur de paiement (dépôt privé `coopo-paiement`), tu prépares la PR et c'est Aki qui la fusionne.
8. « À partir de maintenant, ajoute les limites dans le Excel » : chaque limite d'une fonction (nombre maximum, taille, durée…) va dans la feuille « Limites ».
9. Ne lance pas de sous-agents, sauf si Aki le demande.
10. Ne modifie et ne supprime jamais les vrais messages d'Aki ou des joueurs dans la base.

## Le projet

- **Coopô** : le site pour trouver des mates de jeu (gamers africains francophones). Profils et compatibilité, messages, groupes, appels vocaux et vidéo, annonces, tournois, boutique (thèmes et plaques), flammes.
- **En ligne** : https://tidianeirl-source.github.io/overmate/ (GitHub Pages, branche `main`, publié tout seul après chaque fusion).
- **Dépôt** : `tidianeirl-source/overmate`. Il est **public** : n'y mets jamais de secret ni de donnée personnelle.
- **Comptes et base de données** : Firebase, projet `overmate-1db74`, formule gratuite Spark (donc pas de Cloud Functions). Les règles Firestore sont en ligne dans Firebase : lis-les avant d'y toucher, valide-les avant de les publier, et ne retire jamais un accès dont un vrai compte a besoin.
- **Paiements** : serveur sur Vercel (projet `coopo-paiement`, dépôt privé `tidianeirl-source/coopo-paiement`), prestataire SasPay. Ce sont de **vrais paiements**.
- **Appels** : relais Cloudflare.
- **Âges** : 13 ans minimum. Adultes et 13-17 ans se voient et se parlent, mais pas d'appel vidéo entre un adulte et un 13-17 ans.
- **Thèmes par défaut** (Coopô clair et Sombre) : couleurs unies, sans décor dessiné ; le clair est en noir et blanc. Aki n'aime pas le violet.
- Le rôle de chaque fichier et l'ordre de chargement du code sont dans `README.md`.

## Comment faire un changement

1. Pars de `main` à jour (`git pull`), puis crée une branche.
2. **Avant de changer quoi que ce soit**, lance les vérifications sur `main` : `node tests/tout.js avant`.
3. Fais le changement, et seulement lui.
4. **Change le numéro de version** aux deux endroits : `const V` dans `sw.js` et le `?v=` de chaque `<script src="js/…">` dans `index.html`. Il est à **60** : la prochaine mise en ligne sera 61. Sans ça, les joueurs gardent l'ancien code en cache. `tests/coherence.js` vérifie que les deux sont pareils.
5. Relance `node tests/tout.js apres`, puis `node tests/comparer.js avant apres`. Tout doit être « même », sauf ce que tu as voulu changer. Si une ancienne vérification n'a plus de sens, adapte-la et dis pourquoi dans la PR.
6. Regarde le résultat pour de vrai, avec des captures : téléphone (360 px de large) et ordinateur (1280 px), dans les thèmes Coopô et Sombre.
7. Ouvre la PR en français (ce qui change, comment c'est vérifié), fusionne-la, puis vérifie que GitHub Pages a bien publié et que le site en ligne sert la nouvelle version.
8. Mets à jour le Excel, puis explique à Aki.

## Les vérifications (dossier `tests/`)

- 44 vérifications automatiques, dans un navigateur sans fenêtre (Playwright). Elles utilisent un faux Firebase (`tests/fbmock.js`) : **aucune ne touche la vraie base**.
- Il faut Node.js et Playwright : `npm install playwright` puis `npx playwright install chromium` (une seule fois).
- Le mode d'emploi est dans `tests/README.md`.

## Le tableau de suivi (« le Excel »)

- C'est un tableau dans les artefacts Claude d'Aki : https://claude.ai/artifact/4hJHFdcVWupa1HKJAuJAhT
- Feuilles : **Choses à faire** (une ligne par demande : titre, demande, avancement, taille, état, priorité), **Choses à retenir**, **Limites**, **Journal** (une ligne par jour, la plus récente en haut), **Dépenses**.
- Si tu ne peux pas l'ouvrir d'ici, dis-le à Aki et donne-lui, à la fin, les lignes à ajouter.

## Où on en est (27 novembre 2026)

- **Dernière mise en ligne : version 60** (27 novembre) : « écrit… » ne s'affiche plus à tort en entrant dans une conversation (ligne 74) ; une conversation sans message montre le jeu en commun ; ligne de la flamme lisible sur téléphone dans tous les thèmes.
- **Tarifs** : Aki veut de nouveaux prix (tableau de Neko : thème 2 000 à 3 000 F, thème limité 5 000 F, plaque limitée 5 000 F, plaques classiques à discuter), ligne 75. Rien n'est changé : il faut ses réponses, et changer en même temps le catalogue du serveur de paiement (`coopo-paiement`), sinon le prix affiché et le prix encaissé ne sont plus les mêmes.
- **Version 59**. Le texte de la flamme se lit dans le thème Coopô clair (ligne 67). L'étiquette « En commun » reste sur une ligne (ligne 56). Bandeau de prudence, avec un bouton Signaler, dans les conversations privées entre un adulte et un 13-17 ans (ligne 25). La page Messages garde le menu du haut entre 861 et 999 px de large. Menu d'une conversation ou d'un groupe dans la liste (appui long, clic droit), d'après une vidéo d'Aki, sans « Archiver » : épingler, marquer comme lu, sourdine, bloquer, signaler, supprimer (ligne 72). Sourdine, épingles de groupes et conversations supprimées sont gardées sur l'appareil (`S.rowp`), sans toucher aux règles Firebase ; « Supprimer » une conversation ne supprime aucun message dans la base.
- **Logo** : planche de propositions https://claude.ai/artifact/G5tZa7pFHpHzcrkXD4vSop. Page « Nouvelles idées » : Le Check, La Manette, Le Lien, Pixel ; page « Premières idées » : Le Mate, La Flamme, La Bulle, Le Chat. On attend le choix d'Aki. Ensuite, le mettre partout : icônes de l'appli (`icons/`, encore lilas), `manifest.webmanifest`, onglet du navigateur, écran d'ouverture.
- **Plaques Koï, Soleil rouge et Nuages** : la PR #6 de `coopo-paiement` (catalogue du serveur) doit être fusionnée par Aki. Ensuite, dans `js/boutique.js`, retirer `soon:true` de ces plaques et passer la ligne 55 à « Fait ».
- **Autres lignes ouvertes** : 59 (passer Vercel en Pro ou déplacer le serveur de paiement), 21 (envoi de vidéos : il faut un service de stockage). Les autres attendent une décision d'Aki (12, 17, 31, 32, 7).
- La liste complète et à jour est dans le Excel.

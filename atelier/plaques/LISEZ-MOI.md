# L'atelier des plaques nominatives

Une **plaque nominative**, c'est le bandeau décoré qui s'affiche derrière toute la ligne d'un joueur
(sa photo, son pseudo, son statut) : une couleur de fond, un dessin à droite, et une animation quand on passe dessus.

Ce dossier ne sert pas au site lui-même : il sert à **fabriquer les dessins**, qui sont ensuite rangés dans `index.html`.

| Fichier | À quoi il sert |
| --- | --- |
| `dessins.py` | Les dessins, plaque par plaque. Chaque plaque est décrite forme par forme (un cercle ici, une flamme là…). |
| `outils.py` | Les petits outils de dessin réutilisés partout (étoile, éclat, dégradé, courbe…). |
| `gen.py` | Transforme les dessins en feuille de style (`plaques.css`) et fabrique `galerie.html`, une page pour tout voir d'un coup. |
| `contexte.css` | Les règles écrites à la main : où la plaque s'affiche (messages, groupes, profil, boutique). |
| `poser.py` | Remet la feuille de style dans `index.html`. |

## Changer une plaque

1. Modifier son dessin dans `dessins.py` (les couleurs du fond sont `pa` à gauche et `pb` à droite).
2. Lancer `python3 atelier/plaques/gen.py`, puis ouvrir `atelier/plaques/galerie.html` dans le navigateur pour vérifier.
3. Lancer `python3 atelier/plaques/poser.py` : la page `index.html` est mise à jour.

## Ajouter une plaque

1. Dans `dessins.py`, écrire une nouvelle fonction précédée de `@plaque` (copier une plaque existante est le plus simple).
2. Dans `index.html`, l'ajouter à la liste `PLATES` avec le même nom : `monid:{label:'Mon nom',cat:'…'}`.
3. Pour la **vendre**, il faut aussi l'ajouter au catalogue du serveur de paiement (`lib/catalogue.js`) : c'est lui qui décide des prix et des achats.
   Tant que ce n'est pas fait, on met `soon:true` : la plaque apparaît dans la boutique sous « Bientôt », avec un aperçu, mais personne ne peut l'acheter.

## Une plaque faite avec une image ou un GIF

C'est possible sans rien dessiner ici : dans `PLATES`, on écrit
`monid:{label:'Mon nom',cat:'…',img:'plaques/monimage.webp',gif:'plaques/monanimation.gif'}`
(`img` = l'image fixe, `gif` = facultatif, joué au survol), et on range les fichiers dans un dossier `plaques/` du dépôt.

Deux règles :

- **N'utiliser que des images dont on a les droits** : faites par toi, commandées à un artiste, ou sous une licence qui autorise la vente.
  Une image trouvée sur Internet appartient à son auteur ; la vendre dans la boutique peut faire retirer le site.
- **Des fichiers légers** (moins de 300 Ko, environ 480 × 120 points) : beaucoup de joueurs sont sur téléphone avec un forfait limité.

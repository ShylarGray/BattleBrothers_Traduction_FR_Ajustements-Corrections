# La Couronne du Dragon

Action-RPG à défilement horizontal jouable **directement dans un navigateur**, dans
l'esprit de *Dragon's Crown* : six classes, coopération jusqu'à **4 joueurs en local**,
butin aléatoire à expertiser, progression de personnage, boutiques et donjons à
embranchements.

Aucune dépendance, aucun outil de build, aucune ressource externe : tout est du
JavaScript, du CSS et du dessin `canvas` procédural.

## Lancer le jeu

Ouvrir `index.html` dans un navigateur récent suffit. Pour éviter toute restriction
locale, un petit serveur statique est plus confortable :

```bash
cd dragons-crown
python3 -m http.server 8000
# puis http://localhost:8000
```

La progression est sauvegardée automatiquement dans le `localStorage` du navigateur
(export / import d'un code de sauvegarde disponible dans les Options).

## Commandes

| Joueur | Déplacement | Attaque | Saut | Magie | Objet | Pause |
|--------|-------------|---------|------|-------|-------|-------|
| 1 | `Z/W A S D` (`W A S D`) | `J` | `K` | `L` | `U` | `Entrée` |
| 2 | Flèches | `Pav. 1` | `Pav. 2` | `Pav. 3` | `Pav. 0` | `Pav. Entrée` |
| 3 | `T F G H` | `V` | `B` | `N` | `C` | `\` |
| 4 | `Pav. 8 4 5 6` | `Pav. 7` | `Pav. 9` | `Pav. *` | `Pav. /` | `Pav. -` |

Les **manettes** (Gamepad API) sont détectées automatiquement et attribuées aux
emplacements dans l'ordre de branchement ; elles restent prioritaires sur le clavier
pour le joueur concerné. Pour un vrai coop à 4, une ou deux manettes évitent les
limites de rollover du clavier.

Techniques communes à toutes les classes :

- **Combo** : appuis répétés sur Attaque (2 à 4 coups selon la classe).
- **Attaque lourde** : `Bas` + Attaque — lente, projette ou soulève.
- **Attaque aérienne** : Attaque pendant un saut.
- **Technique spéciale** : Magie (coût en PM modéré).
- **Super technique** : `Bas` + Magie (coût élevé, invincibilité au démarrage, recharge).
- **Roulade** : double-tape Gauche ou Droite (fenêtre d'invincibilité).
- **Interagir / relever un allié** : `Haut` à proximité.
- `Q` / `E` changent l'objet actif de la besace, `Échap` met en pause.

## Contenu

### Six classes
Chevalier (garde et ripostes), Amazone (rage, mobilité aérienne), Nain (projections,
zone), Elfe (arc, gestion des flèches), Sorcier (feu, gravité), Ensorceleuse (glace,
invocations, festins). Chacune possède son moveset, son passif et son propre arbre de
compétences en plus des huit compétences communes.

### Coopération 4 joueurs
Emplacements configurables individuellement : *Humain*, *Compagnon IA* ou *vide*.
L'expérience est partagée, l'or et la besace sont communs, et un héros à terre doit
être relevé par un allié (`Haut` à côté de lui) ou dépense l'un de ses relèvements.
Les monstres gagnent des PV avec la taille du groupe, jamais de dégâts.

### Butin
Génération procédurale à partir de bases d'objets, de six raretés (Commun → Mythique)
et d'un système de préfixes/suffixes portant des effets (brûlure, gel, foudre, vol de
vie, régénération). **Le butin ramassé en donjon n'est pas identifié** : il faut le
faire expertiser à la Forge avant de pouvoir l'équiper. Coffres, tonneaux, trésors et
tables de drop dédiées aux boss et aux élites complètent l'ensemble.

### Progression
60 niveaux, courbe d'XP cumulée, points de compétence à chaque niveau, réattribution
possible à la Guilde. Les statistiques finales combinent la base de classe, la
croissance par niveau, l'équipement, les compétences et les bénédictions du Temple.

### Boutiques
- **Forge** — achat, vente, expertise ; stock renouvelable.
- **Apothicaire** — consommables et composition de la besace emportée.
- **Temple** — bénédictions permanentes cumulables, purification des objets maudits.
- **Guilde** — arbres de compétences, réinitialisation.
- **Coffre** — équipement des héros et rangement du butin.

### Donjons
Six donjons thématisés (Bois des Murmures, Ruines du Temple Ancien, Catacombes Sans
Fin, Baie Engloutie, Forge de Lave, Citadelle du Dragon), chacun avec **deux voies**
(A plus directe, B plus dangereuse et plus riche), quatre salles puis un boss :
Reine Harpie, Gorgone, Roi Liche, Kraken, Cyclope de magma, Dragon Ancien. Chaque boss
a trois phases et un jeu d'attaques télégraphées. Quatre difficultés se débloquent en
progressant, avec un butin, un or et une expérience croissants.

## Organisation du code

```
index.html            chargement des scripts (aucun module, ouvrable en local)
css/style.css         interface DOM (menus, boutiques)
js/utils.js           maths, RNG seedé, collisions AABB 3 axes
js/input.js           4 manettes virtuelles (clavier + Gamepad API)
js/audio.js           synthèse WebAudio des bruitages et des musiques
js/save.js            profil persistant (localStorage, export/import)
js/data/classes.js    classes, mouvements, arbres de compétences, table d'XP
js/data/items.js      bases d'équipement, raretés, affixes, consommables
js/data/enemies.js    bestiaire et boss
js/data/stages.js     donjons, salles, thèmes, difficultés
js/hero.js            statistiques effectives, équipement, compétences
js/loot.js            génération d'objets et tables de butin
js/fx.js              particules, nombres flottants, secousses
js/entities.js        acteurs, joueurs, ennemis, IA, projectiles
js/render.js          décors en parallaxe et personnages procéduraux
js/world.js           salles, vagues, résolution des coups, interactions
js/hud.js             ATH en jeu
js/ui.js              écrans DOM (ville, boutiques, guilde, carte, résultats)
js/main.js            boucle à pas fixe (60 Hz) et machine à états
```

Le monde est en 2,5D : `x` pour le défilement, `z` pour la profondeur du sol
(0 – 150), `y` pour la hauteur. La simulation tourne à pas fixe de 1/60 s avec un
accumulateur, le rendu à la fréquence de l'écran.

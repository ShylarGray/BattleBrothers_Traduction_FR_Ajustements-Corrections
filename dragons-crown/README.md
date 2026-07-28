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

**Sur écran tactile**, les commandes apparaissent d'elles-mêmes pendant les
combats et se masquent dans les menus. Le pouce gauche se pose **n'importe où
sur la moitié gauche** — un manche virtuel naît sous le doigt, sans pastille à
viser. À droite : **⚔ Attaque**, **⤴ Saut**, **✦ Magie**, plus les raccourcis
**★ Super**, **⚔▾ Lourde**, **🧪 Objet** et **↑ Agir** (coffres, alliés à terre),
et un bouton pause au centre. Les boutons sont translucides au repos pour ne pas
masquer un ennemi qui arrive, et le multi-touch permet de se déplacer en frappant.
Jouez en mode paysage — le jeu invite à tourner l'appareil en portrait. Le tout se
désactive dans *Options → Commandes tactiles*.

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

## Choix de game feel

Ces règles sont le résultat d'un audit dédié ; elles expliquent pourquoi certaines
constantes sont ce qu'elles sont.

**Réactivité.** Les entrées sont lues une fois par image, avant toute logique, et
mémorisées 8 images : une touche pressée pendant une récupération d'attaque, un
hitstop ou un état de contrôle volé s'exécute dès que le personnage redevient
disponible, au lieu d'être perdue. À terre, une pression sur Attaque ou Saut
déclenche un relevé immédiat plutôt que d'attendre le décompte. L'immobilisation
après un coup reçu est plafonnée à 20 images, quelle que soit la difficulté.

**Persistance.** Franchir une porte est un point de contrôle : butin, or et besace
sont versés au profil et écrits sur disque, et l'XP suit automatiquement. Fermer
l'onglet en plein donjon ne coûte donc jamais plus que la salle en cours. Une
défaite ne fait perdre que les trouvailles ordinaires de cette dernière salle —
les pièces épiques et au-delà sont toujours rapportées. Une retraite volontaire
conserve tout le butin et 80 % de l'or.

**Difficulté.** La défense des monstres ne dépend que du niveau, jamais du
multiplicateur de difficulté : les paliers annoncés (×1 / ×2,4 / ×5,5 / ×12) sont
donc exactement ce que le joueur subit, sans explosion cachée. En solo, tomber
une seconde fois n'interrompt plus l'expédition dans l'image même : un sursis
d'une seconde et demie permet encore à une fiole de résurrection emportée de
s'employer d'elle-même.

**Endurance.** Une cible est déséquilibrée quand elle a encaissé une fraction de
ses PV max depuis sa dernière rupture (22 % pour les joueurs, 15 à 40 % selon le
monstre). Exprimée en fraction, la valeur reste juste à tous les niveaux et à
toutes les difficultés : un coup léger n'interrompt plus systématiquement, les
gros ennemis peuvent riposter, et le joueur n'est plus enchaîné par la piétaille.
L'équilibre ne se rétablit qu'après deux secondes sans encaisser.

**Patterns.** Une attaque tout juste jouée devient quatre fois moins probable, ce
qui fait émerger des enchaînements variés et mémorisables. Le délai entre deux
attaques couvre l'animation *puis* une fenêtre de neutre fixe : bien esquiver
ouvre toujours la même occasion de punir. Les coups qui projettent ou soulèvent
sont annoncés par une barre de préparation, sur les boss comme sur les monstres
ordinaires. Chaque boss garde enfin une attaque en réserve, révélée en phase 2.

**Objets.** ATQ et MAG comptent pour tout le monde — les classes magiques frappent
surtout avec MAG, les autres surtout avec ATQ, mais aucune ligne de statistique
affichée sur un objet n'est morte. Les affixes à effet (brûlure, gel, foudre, vol
de vie, régénération) sont tous branchés en combat. Le coût d'expertise dépend du
niveau du donjon et non de la valeur de l'objet : le tarif ne trahit plus la
rareté avant paiement, et identifier redevient un pari.

## Distribuer le jeu en un seul fichier

```bash
node tools/build-single-file.js            # produit couronne-du-dragon.html
```

Le script lit l'ordre de chargement directement dans `index.html` — un fichier
ajouté au jeu ne peut donc pas être oublié — et fusionne la feuille de style et
les scripts dans une page unique, sans aucune référence externe. Le résultat
s'ouvre par double-clic, se pose sur n'importe quel hébergeur statique, ou
s'intègre dans une iframe.

Deux contraintes de ce contexte sont traitées dans le code lui-même :

- **Encodage.** La page fusionnée déclare `<meta charset="utf-8">` en tout
  premier octet. Sans cette ligne, un serveur qui n'annonce pas de charset fait
  lire l'UTF-8 comme du Latin-1 et « héros » s'affiche « hÃ©ros ».
- **Dialogues.** Une iframe cloisonnée sans `allow-modals` ignore purement
  `confirm()` et `prompt()` : le premier renvoie `false`, le second `null`. Les
  actions qui en dépendaient (recruter, renvoyer, réinitialiser, effacer,
  battre en retraite, exporter) devenaient donc muettes. L'interface utilise à
  la place ses propres boîtes de dialogue, rendues dans la page.
- **Stockage.** Si `localStorage` est refusé, le profil bascule sur un stockage
  en mémoire et l'écran-titre le signale : la session reste jouable, et l'export
  de sauvegarde permet de conserver la progression.

## Organisation du code

```
index.html            chargement des scripts (aucun module, ouvrable en local)
css/style.css         interface DOM (menus, boutiques)
js/utils.js           maths, RNG seedé, collisions AABB 3 axes
js/input.js           4 manettes virtuelles (clavier + Gamepad API + tactile)
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
js/touch.js           manche virtuel et boutons tactiles
js/hud.js             ATH en jeu
js/ui.js              écrans DOM (ville, boutiques, guilde, carte, résultats)
js/main.js            boucle à pas fixe (60 Hz) et machine à états
```

Le monde est en 2,5D : `x` pour le défilement, `z` pour la profondeur du sol
(0 – 150), `y` pour la hauteur. La simulation tourne à pas fixe de 1/60 s avec un
accumulateur, le rendu à la fréquence de l'écran.

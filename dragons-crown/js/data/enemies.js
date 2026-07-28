/* =========================================================================
 * Données : bestiaire (ennemis ordinaires, élites, boss)
 * ====================================================================== */
'use strict';

DC.Enemies = (function () {

  var atk = DC.Classes.atk;

  /* Champs d'une définition :
   *  hp/atk/def   : valeurs de base au niveau 1 (mises à l'échelle en jeu)
   *  spd          : vitesse de déplacement (px/img à 60 img/s)
   *  ai           : 'melee' | 'ranged' | 'charger' | 'flyer' | 'caster' | 'summoner' | 'boss'
   *  body         : forme dessinée par le moteur de rendu
   *  size         : {w, d, h} boîte de collision
   *  attacks      : liste de descripteurs ; l'IA choisit selon la portée
   */
  var E = {};

  function def(o) {
    return Object.assign({
      hp: 40, atk: 8, def: 2, spd: 0.9, xp: 12, gold: 8, dropRate: 0.13,
      ai: 'melee', body: 'goblin', poise: 10, size: { w: 26, d: 20, h: 52 },
      palette: {}, elite: false, boss: false, flying: false
    }, o);
  }

  /* --------------------------- Piétaille ------------------------------- */
  E.goblin = def({
    id: 'goblin', name: 'Gobelin', hp: 42, atk: 8, def: 1, spd: 1.05, xp: 12, gold: 7,
    body: 'goblin', palette: { skin: '#6fa34a', cloth: '#7a4a2a', metal: '#b0b6bd' },
    attacks: [atk({ name: 'Coup de dague', dmg: 1, startup: 12, active: 4, recover: 22, reach: 34, knock: 3 })]
  });
  E.goblin_archer = def({
    id: 'goblin_archer', name: 'Gobelin archer', hp: 34, atk: 7, def: 1, spd: 0.95, xp: 15, gold: 9,
    ai: 'ranged', body: 'goblin', palette: { skin: '#7fae5a', cloth: '#4a5a2a', metal: '#9aa' },
    attacks: [atk({ name: 'Flèche', kind: 'shot', dmg: 0.9, startup: 26, active: 2, recover: 30, speed: 6.5, knock: 2 })]
  });
  E.wolf = def({
    id: 'wolf', name: 'Loup famélique', hp: 46, atk: 9, def: 1, spd: 1.7, xp: 14, gold: 5, ai: 'charger',
    body: 'wolf', size: { w: 34, d: 22, h: 34 }, palette: { fur: '#6a6a72', eye: '#e8c84a' },
    attacks: [atk({ name: 'Morsure bondie', dmg: 1.1, startup: 14, active: 8, recover: 26, reach: 40, knock: 6, move: 9 })]
  });
  E.bat = def({
    id: 'bat', name: 'Chauve-souris', hp: 24, atk: 6, def: 0, spd: 1.5, xp: 9, gold: 3, ai: 'flyer', flying: true,
    body: 'bat', size: { w: 22, d: 18, h: 22 }, palette: { fur: '#4a3a5a', wing: '#2a1f3a' },
    attacks: [atk({ name: 'Plongeon', dmg: 0.8, startup: 10, active: 10, recover: 24, reach: 30, knock: 3, move: 7 })]
  });
  E.orc = def({
    id: 'orc', name: 'Orc', hp: 96, atk: 14, def: 5, spd: 0.85, xp: 30, gold: 18, poise: 26,
    body: 'orc', size: { w: 34, d: 24, h: 66 }, palette: { skin: '#4f7a3a', cloth: '#5a3a2a', metal: '#8a929a' },
    attacks: [
      atk({ name: 'Fauche de hache', dmg: 1.2, startup: 20, active: 6, recover: 30, reach: 48, knock: 8, hitstop: 6 }),
      atk({ name: 'Charge d\'épaule', dmg: 1.4, startup: 26, active: 10, recover: 34, reach: 44, knock: 14, move: 11 })
    ]
  });
  E.orc_shaman = def({
    id: 'orc_shaman', name: 'Chaman orc', hp: 78, atk: 10, def: 3, spd: 0.8, xp: 38, gold: 26, ai: 'caster',
    body: 'orc', palette: { skin: '#5a7a4a', cloth: '#6a2a5a', metal: '#c8a24a' },
    attacks: [
      atk({ name: 'Trait vénéneux', kind: 'shot', dmg: 1.0, startup: 32, active: 2, recover: 34, speed: 5.5, element: 'poison' }),
      atk({ name: 'Soin de horde', kind: 'heal', dmg: 0, startup: 40, active: 4, recover: 40, radius: 120 })
    ]
  });
  E.skeleton = def({
    id: 'skeleton', name: 'Squelette', hp: 62, atk: 11, def: 4, spd: 0.95, xp: 22, gold: 12,
    body: 'skeleton', palette: { bone: '#e0dcc8', cloth: '#4a4a5a', metal: '#9aa' },
    attacks: [atk({ name: 'Estoc rouillé', dmg: 1.05, startup: 16, active: 5, recover: 24, reach: 42, knock: 4 })]
  });
  E.skeleton_archer = def({
    id: 'skeleton_archer', name: 'Archer squelette', hp: 50, atk: 10, def: 3, spd: 0.85, xp: 26, gold: 15, ai: 'ranged',
    body: 'skeleton', palette: { bone: '#d8d4c0', cloth: '#3a4a5a', metal: '#9aa' },
    attacks: [atk({ name: 'Flèche d\'os', kind: 'shot', dmg: 1.0, startup: 28, active: 2, recover: 32, speed: 7.5 })]
  });
  E.zombie = def({
    id: 'zombie', name: 'Mort-vivant', hp: 110, atk: 12, def: 3, spd: 0.45, xp: 24, gold: 10, poise: 40,
    body: 'zombie', palette: { skin: '#6a7a5a', cloth: '#3a3a3a' },
    attacks: [atk({ name: 'Griffes putrides', dmg: 1.1, startup: 24, active: 8, recover: 30, reach: 36, element: 'poison' })]
  });
  E.lizardman = def({
    id: 'lizardman', name: 'Homme-lézard', hp: 120, atk: 17, def: 7, spd: 1.1, xp: 44, gold: 24, poise: 30,
    body: 'lizard', size: { w: 32, d: 24, h: 64 }, palette: { skin: '#3a8a7a', cloth: '#7a5a2a', metal: '#c0c8d0' },
    attacks: [
      atk({ name: 'Coup de trident', dmg: 1.2, startup: 18, active: 6, recover: 26, reach: 56, knock: 7 }),
      atk({ name: 'Balayage de queue', dmg: 1.0, startup: 20, active: 8, recover: 28, reach: 44, width: 30, knock: 12, launch: 4 })
    ]
  });
  E.harpy = def({
    id: 'harpy', name: 'Harpie', hp: 84, atk: 14, def: 3, spd: 1.4, xp: 40, gold: 22, ai: 'flyer', flying: true,
    body: 'harpy', size: { w: 30, d: 22, h: 56 }, palette: { skin: '#e8c0a0', feather: '#c85a7a', hair: '#3a2a2a' },
    attacks: [
      atk({ name: 'Serres', dmg: 1.15, startup: 14, active: 8, recover: 24, reach: 38, move: 8 }),
      atk({ name: 'Plumes tranchantes', kind: 'shot', dmg: 0.8, startup: 24, active: 2, recover: 28, speed: 7, count: 3, spread: 0.2 })
    ]
  });
  E.gargoyle = def({
    id: 'gargoyle', name: 'Gargouille', hp: 150, atk: 19, def: 14, spd: 0.9, xp: 60, gold: 34, poise: 60,
    body: 'gargoyle', size: { w: 34, d: 26, h: 62 }, palette: { stone: '#7a8290', eye: '#e8562a' },
    attacks: [
      atk({ name: 'Griffe de pierre', dmg: 1.3, startup: 22, active: 6, recover: 28, reach: 46, knock: 8 }),
      atk({ name: 'Plongeon ailé', dmg: 1.5, startup: 28, active: 14, recover: 32, reach: 46, move: 12, knock: 12 })
    ]
  });
  E.cultist = def({
    id: 'cultist', name: 'Cultiste', hp: 92, atk: 13, def: 5, spd: 1.0, xp: 46, gold: 30, ai: 'caster',
    body: 'cultist', palette: { cloth: '#5a1f3a', skin: '#d8b898', accent: '#e8c84a' },
    attacks: [
      atk({ name: 'Trait d\'ombre', kind: 'shot', dmg: 1.2, startup: 30, active: 2, recover: 32, speed: 6, element: 'dark' }),
      atk({ name: 'Malédiction', kind: 'curse', dmg: 0.6, startup: 40, active: 6, recover: 40, reach: 120, width: 60, element: 'dark' })
    ]
  });
  E.salamander = def({
    id: 'salamander', name: 'Salamandre', hp: 170, atk: 22, def: 10, spd: 1.05, xp: 78, gold: 44, poise: 45,
    body: 'lizard', size: { w: 36, d: 26, h: 60 }, palette: { skin: '#c8452a', cloth: '#3a2a2a', metal: '#e8a24a' },
    attacks: [
      atk({ name: 'Morsure ardente', dmg: 1.3, startup: 18, active: 6, recover: 26, reach: 48, element: 'fire' }),
      atk({ name: 'Souffle de braise', kind: 'shot', dmg: 1.0, startup: 30, active: 3, recover: 34, speed: 5, count: 3, spread: 0.16, element: 'fire' })
    ]
  });
  E.golem = def({
    id: 'golem', name: 'Golem de pierre', hp: 320, atk: 26, def: 22, spd: 0.55, xp: 130, gold: 70, poise: 140, elite: true,
    body: 'golem', size: { w: 46, d: 34, h: 82 }, palette: { stone: '#8a8276', rune: '#4ad0e8' },
    attacks: [
      atk({ name: 'Poing d\'écrasement', dmg: 1.6, startup: 34, active: 8, recover: 40, reach: 54, width: 30, knock: 16, launch: 5, hitstop: 9 }),
      atk({ name: 'Onde sismique', kind: 'quake', dmg: 1.2, startup: 44, active: 10, recover: 44, reach: 140, width: 100, knock: 12, launch: 6 })
    ]
  });
  E.wraith = def({
    id: 'wraith', name: 'Spectre', hp: 130, atk: 20, def: 8, spd: 1.25, xp: 84, gold: 40, ai: 'flyer', flying: true,
    body: 'wraith', size: { w: 30, d: 22, h: 64 }, palette: { cloth: '#3a2f5a', glow: '#8ad0ff' },
    attacks: [
      atk({ name: 'Griffe glaciale', dmg: 1.25, startup: 16, active: 8, recover: 24, reach: 42, element: 'ice', move: 6 }),
      atk({ name: 'Vol de vie', kind: 'shot', dmg: 1.0, startup: 30, active: 2, recover: 30, speed: 5.5, element: 'dark' })
    ]
  });
  E.knight_dark = def({
    id: 'knight_dark', name: 'Chevalier noir', hp: 260, atk: 30, def: 24, spd: 1.0, xp: 160, gold: 90, poise: 90, elite: true,
    body: 'darkknight', size: { w: 36, d: 26, h: 70 }, palette: { metal: '#3a3a4a', accent: '#c8452a', cape: '#5a1f2a' },
    attacks: [
      atk({ name: 'Taille lourde', dmg: 1.4, startup: 22, active: 6, recover: 28, reach: 56, knock: 10, hitstop: 7 }),
      atk({ name: 'Triple estoc', dmg: 0.8, startup: 20, active: 18, recover: 34, reach: 60, hits: 3, knock: 5 }),
      atk({ name: 'Onde sombre', kind: 'wave', dmg: 1.3, startup: 32, active: 8, recover: 36, reach: 110, width: 34, element: 'dark' })
    ]
  });

  /* ------------------------------- Boss -------------------------------- */
  E.harpy_queen = def({
    id: 'harpy_queen', name: 'Reine Harpie', boss: true, ai: 'boss', flying: true,
    hp: 1400, atk: 26, def: 10, spd: 1.2, xp: 900, gold: 600, poise: 400,
    body: 'harpy', size: { w: 54, d: 40, h: 96 }, scale: 1.7,
    palette: { skin: '#f0d0b0', feather: '#d84a7a', hair: '#2a1f2a', accent: '#e8c84a' },
    attacks: [
      atk({ name: 'Serres royales', dmg: 1.3, startup: 20, active: 10, recover: 30, reach: 60, width: 30, knock: 10, move: 10 }),
      atk({ name: 'Tempête de plumes', kind: 'shot', dmg: 0.9, startup: 34, active: 4, recover: 34, speed: 7.5, count: 5, spread: 0.28 }),
      atk({ name: 'Cri strident', kind: 'quake', dmg: 1.1, startup: 40, active: 12, recover: 40, reach: 170, width: 130, knock: 14, launch: 5 }),
      atk({ name: 'Fonte du faucon', phase: 2, dmg: 1.8, startup: 30, active: 20, recover: 40, reach: 70, width: 34, knock: 16, move: 20, hitstop: 10 })
    ]
  });
  E.gorgon = def({
    id: 'gorgon', name: 'Gorgone', boss: true, ai: 'boss',
    hp: 2400, atk: 34, def: 16, spd: 0.95, xp: 1600, gold: 1000, poise: 600,
    body: 'gorgon', size: { w: 60, d: 46, h: 104 }, scale: 1.8,
    palette: { skin: '#7ac0a0', hair: '#2a6a4a', accent: '#e8c84a', scale: '#3a8a6a' },
    attacks: [
      atk({ name: 'Balayage de queue', dmg: 1.3, startup: 24, active: 10, recover: 32, reach: 90, width: 40, knock: 16, launch: 4 }),
      atk({ name: 'Regard pétrifiant', phase: 2, kind: 'gaze', dmg: 0.8, startup: 46, active: 20, recover: 40, reach: 220, width: 40, petrify: 150 }),
      atk({ name: 'Morsure de vipères', dmg: 1.2, startup: 20, active: 8, recover: 28, reach: 66, element: 'poison', hits: 2 }),
      atk({ name: 'Pluie d\'écailles', kind: 'shot', dmg: 1.0, startup: 32, active: 4, recover: 34, speed: 8, count: 4, spread: 0.3 })
    ]
  });
  E.lich = def({
    id: 'lich', name: 'Roi Liche', boss: true, ai: 'boss',
    hp: 3200, atk: 38, def: 18, spd: 0.9, xp: 2600, gold: 1500, poise: 700,
    body: 'lich', size: { w: 54, d: 40, h: 108 }, scale: 1.8,
    palette: { bone: '#e8e4d0', cloth: '#2a2a5a', glow: '#7affc8', accent: '#c8a24a' },
    attacks: [
      atk({ name: 'Faux d\'os', dmg: 1.3, startup: 24, active: 8, recover: 30, reach: 84, width: 34, knock: 12 }),
      atk({ name: 'Nova nécrotique', kind: 'quake', dmg: 1.4, startup: 44, active: 14, recover: 44, reach: 190, width: 150, element: 'dark', knock: 14 }),
      atk({ name: 'Appel des morts', phase: 2, kind: 'summonEnemy', summon: 'skeleton', count: 3, startup: 50, active: 6, recover: 50 }),
      atk({ name: 'Rayon funeste', kind: 'shot', dmg: 1.5, startup: 36, active: 3, recover: 36, speed: 9, element: 'dark', pierce: true })
    ]
  });
  E.kraken = def({
    id: 'kraken', name: 'Kraken', boss: true, ai: 'boss',
    hp: 4200, atk: 44, def: 22, spd: 0.7, xp: 3800, gold: 2200, poise: 900,
    body: 'kraken', size: { w: 78, d: 60, h: 120 }, scale: 2.0,
    palette: { skin: '#8a4a9a', sucker: '#e8c8d8', eye: '#e8e04a' },
    attacks: [
      atk({ name: 'Fouet de tentacule', dmg: 1.3, startup: 26, active: 12, recover: 32, reach: 130, width: 34, knock: 16 }),
      atk({ name: 'Étreinte', phase: 2, kind: 'grab', dmg: 2.0, startup: 34, active: 10, recover: 46, reach: 90, width: 40, knock: 20, hitstop: 12 }),
      atk({ name: 'Jet d\'encre', kind: 'shot', dmg: 1.1, startup: 34, active: 4, recover: 36, speed: 6, count: 5, spread: 0.35, element: 'dark' }),
      atk({ name: 'Écrasement abyssal', kind: 'quake', dmg: 1.6, startup: 48, active: 16, recover: 48, reach: 210, width: 170, knock: 18, launch: 8 })
    ]
  });
  E.cyclops = def({
    id: 'cyclops', name: 'Cyclope de magma', boss: true, ai: 'boss',
    hp: 5400, atk: 52, def: 26, spd: 0.8, xp: 5200, gold: 3000, poise: 1100,
    body: 'cyclops', size: { w: 74, d: 56, h: 130 }, scale: 2.1,
    palette: { skin: '#c05a3a', eye: '#ffd24a', cloth: '#4a2a1a', magma: '#ff7a2a' },
    attacks: [
      atk({ name: 'Massue de basalte', dmg: 1.5, startup: 30, active: 10, recover: 40, reach: 110, width: 44, knock: 18, launch: 6, hitstop: 10 }),
      atk({ name: 'Rocher enflammé', kind: 'shot', dmg: 1.4, startup: 40, active: 4, recover: 40, speed: 7, element: 'fire', radius: 60 }),
      atk({ name: 'Piétinement', kind: 'quake', dmg: 1.5, startup: 40, active: 14, recover: 44, reach: 200, width: 160, knock: 16, launch: 8 }),
      atk({ name: 'Rage volcanique', phase: 2, kind: 'rage', dmg: 1.0, startup: 60, active: 90, recover: 50, reach: 120, width: 60, hits: 8, element: 'fire' })
    ]
  });
  E.dragon = def({
    id: 'dragon', name: 'Dragon Ancien', boss: true, ai: 'boss', flying: false,
    hp: 8800, atk: 64, def: 32, spd: 0.9, xp: 9000, gold: 6000, poise: 1600,
    body: 'dragon', size: { w: 110, d: 70, h: 150 }, scale: 2.3,
    palette: { skin: '#7a2a3a', belly: '#e8c88a', wing: '#4a1a2a', eye: '#ffd24a', fire: '#ff8a2a' },
    attacks: [
      atk({ name: 'Griffe titanesque', dmg: 1.5, startup: 26, active: 10, recover: 34, reach: 130, width: 50, knock: 18, hitstop: 10 }),
      atk({ name: 'Souffle ardent', kind: 'breath', dmg: 0.9, startup: 46, active: 60, recover: 44, reach: 300, width: 46, element: 'fire', hits: 12 }),
      atk({ name: 'Balayage caudal', dmg: 1.4, startup: 24, active: 14, recover: 32, reach: 170, width: 60, knock: 22, launch: 7 }),
      atk({ name: 'Battement d\'ailes', kind: 'quake', dmg: 1.2, startup: 40, active: 16, recover: 40, reach: 260, width: 200, knock: 24, launch: 9, element: 'wind' }),
      atk({ name: 'Pluie de météores', phase: 2, kind: 'rain', dmg: 1.2, startup: 60, active: 90, recover: 50, reach: 320, width: 240, hits: 14, element: 'fire' })
    ]
  });

  function get(id) { return E[id]; }
  function all() { return Object.keys(E).map(function (k) { return E[k]; }); }

  /** Mise à l'échelle d'un ennemi selon le niveau de donjon et la difficulté. */
  function scaled(id, level, diffMult, playerCount) {
    var d = E[id];
    if (!d) return null;
    var lv = Math.max(1, level);
    var hpScale = (1 + (lv - 1) * 0.34) * diffMult;
    var atkScale = (1 + (lv - 1) * 0.20) * Math.sqrt(diffMult);
    // En coopération, les monstres encaissent davantage sans frapper plus fort.
    var coop = 1 + Math.max(0, (playerCount || 1) - 1) * (d.boss ? 0.55 : 0.35);
    return {
      def: d,
      maxHp: Math.round(d.hp * hpScale * coop),
      atk: Math.round(d.atk * atkScale),
      defStat: Math.round(d.def * (1 + (lv - 1) * 0.16)),
      xp: Math.round(d.xp * (1 + (lv - 1) * 0.28)),
      gold: Math.round(d.gold * (1 + (lv - 1) * 0.22))
    };
  }

  return { get: get, all: all, scaled: scaled, table: E };
})();

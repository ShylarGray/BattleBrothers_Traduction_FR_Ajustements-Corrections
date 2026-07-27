/* =========================================================================
 * Données : donjons, salles, thèmes visuels et difficultés
 * ====================================================================== */
'use strict';

DC.Stages = (function () {

  /* Un donjon est une suite de salles.
   * type : 'fight' (vagues), 'gauntlet' (couloir sous pression), 'treasure'
   *        (coffres + peu d'ennemis), 'boss'.
   * pool : identifiants d'ennemis pouvant apparaître.
   */
  var LIST = [
    {
      id: 'whisperwood', name: 'Bois des Murmures', level: 1, order: 1,
      blurb: 'Une forêt ancienne infestée de gobelins. Le terrain de chasse des harpies.',
      theme: {
        sky: ['#1a2f2a', '#2f4a38', '#4a6a48'], ground: '#3a4a30', ground2: '#2f3d28',
        fog: '#6a8a6a', accent: '#8fbf6a', props: 'trees'
      },
      music: 'forest',
      rooms: [
        { type: 'fight', width: 1500, waves: 2, pool: ['goblin', 'goblin', 'goblin_archer', 'wolf'], per: 4 },
        { type: 'fight', width: 1700, waves: 2, pool: ['goblin', 'wolf', 'bat', 'goblin_archer'], per: 5 },
        { type: 'treasure', width: 1200, waves: 1, pool: ['goblin', 'bat'], per: 3, chests: 2 },
        { type: 'gauntlet', width: 2000, waves: 3, pool: ['goblin', 'goblin_archer', 'wolf', 'harpy'], per: 5 },
        { type: 'boss', width: 1100, boss: 'harpy_queen' }
      ],
      altRooms: [
        { type: 'fight', width: 1600, waves: 2, pool: ['wolf', 'bat', 'harpy'], per: 5 },
        { type: 'treasure', width: 1300, waves: 1, pool: ['goblin_archer'], per: 3, chests: 3 },
        { type: 'gauntlet', width: 2200, waves: 3, pool: ['harpy', 'goblin', 'wolf'], per: 6 },
        { type: 'boss', width: 1100, boss: 'harpy_queen' }
      ]
    },
    {
      id: 'temple', name: 'Ruines du Temple Ancien', level: 6, order: 2,
      blurb: 'Des colonnes brisées, des pièges anciens et le regard de pierre de la Gorgone.',
      theme: {
        sky: ['#2a2418', '#4a3a24', '#7a6a48'], ground: '#6a5c42', ground2: '#54492f',
        fog: '#b0a078', accent: '#d8c48a', props: 'pillars'
      },
      music: 'temple',
      rooms: [
        { type: 'fight', width: 1600, waves: 2, pool: ['skeleton', 'skeleton_archer', 'goblin'], per: 5 },
        { type: 'gauntlet', width: 2000, waves: 3, pool: ['skeleton', 'lizardman', 'skeleton_archer'], per: 6 },
        { type: 'treasure', width: 1300, waves: 1, pool: ['gargoyle'], per: 2, chests: 3 },
        { type: 'fight', width: 1800, waves: 3, pool: ['lizardman', 'gargoyle', 'skeleton_archer'], per: 6 },
        { type: 'boss', width: 1200, boss: 'gorgon' }
      ],
      altRooms: [
        { type: 'fight', width: 1700, waves: 3, pool: ['gargoyle', 'lizardman'], per: 5 },
        { type: 'treasure', width: 1400, waves: 2, pool: ['skeleton', 'gargoyle'], per: 4, chests: 4, elite: true },
        { type: 'gauntlet', width: 2300, waves: 3, pool: ['lizardman', 'gargoyle', 'skeleton_archer'], per: 7 },
        { type: 'boss', width: 1200, boss: 'gorgon' }
      ]
    },
    {
      id: 'catacombs', name: 'Catacombes Sans Fin', level: 12, order: 3,
      blurb: 'Un ossuaire tentaculaire où le Roi Liche rappelle inlassablement ses légions.',
      theme: {
        sky: ['#14121c', '#241f30', '#3a3048'], ground: '#2f2a38', ground2: '#221e2c',
        fog: '#6a5a8a', accent: '#7affc8', props: 'bones'
      },
      music: 'crypt',
      rooms: [
        { type: 'fight', width: 1700, waves: 3, pool: ['skeleton', 'zombie', 'bat'], per: 6 },
        { type: 'gauntlet', width: 2200, waves: 3, pool: ['skeleton', 'skeleton_archer', 'wraith'], per: 7 },
        { type: 'treasure', width: 1400, waves: 2, pool: ['zombie', 'wraith'], per: 4, chests: 3 },
        { type: 'fight', width: 1900, waves: 3, pool: ['wraith', 'cultist', 'skeleton'], per: 7 },
        { type: 'boss', width: 1300, boss: 'lich' }
      ],
      altRooms: [
        { type: 'gauntlet', width: 2400, waves: 4, pool: ['zombie', 'wraith', 'cultist'], per: 8 },
        { type: 'treasure', width: 1500, waves: 2, pool: ['wraith'], per: 3, chests: 4, elite: true },
        { type: 'fight', width: 2000, waves: 3, pool: ['knight_dark', 'skeleton', 'wraith'], per: 6 },
        { type: 'boss', width: 1300, boss: 'lich' }
      ]
    },
    {
      id: 'cove', name: 'Baie Engloutie', level: 19, order: 4,
      blurb: 'Une crique noyée jonchée d\'épaves. Quelque chose remue sous la surface.',
      theme: {
        sky: ['#0f1a2a', '#1a3050', '#2f5a7a'], ground: '#3a5060', ground2: '#2a3c4a',
        fog: '#6aa0c0', accent: '#4ad0e8', props: 'wrecks'
      },
      music: 'sea',
      rooms: [
        { type: 'fight', width: 1800, waves: 3, pool: ['lizardman', 'skeleton', 'harpy'], per: 6 },
        { type: 'gauntlet', width: 2300, waves: 4, pool: ['lizardman', 'wraith', 'skeleton_archer'], per: 8 },
        { type: 'treasure', width: 1500, waves: 2, pool: ['golem'], per: 2, chests: 4 },
        { type: 'fight', width: 2000, waves: 3, pool: ['lizardman', 'cultist', 'gargoyle'], per: 7 },
        { type: 'boss', width: 1400, boss: 'kraken' }
      ],
      altRooms: [
        { type: 'gauntlet', width: 2500, waves: 4, pool: ['lizardman', 'harpy', 'wraith'], per: 9 },
        { type: 'fight', width: 2100, waves: 3, pool: ['golem', 'lizardman'], per: 5, elite: true },
        { type: 'treasure', width: 1600, waves: 2, pool: ['cultist'], per: 4, chests: 5, elite: true },
        { type: 'boss', width: 1400, boss: 'kraken' }
      ]
    },
    {
      id: 'forge', name: 'Forge de Lave', level: 27, order: 5,
      blurb: 'Les entrailles brûlantes de la montagne, où le Cyclope martèle des armes maudites.',
      theme: {
        sky: ['#2a0f0f', '#5a1f14', '#8a3a1a'], ground: '#4a2a20', ground2: '#382018',
        fog: '#e8703a', accent: '#ff9a3a', props: 'lava'
      },
      music: 'forge',
      rooms: [
        { type: 'fight', width: 1900, waves: 3, pool: ['salamander', 'orc', 'gargoyle'], per: 7 },
        { type: 'gauntlet', width: 2400, waves: 4, pool: ['salamander', 'orc', 'orc_shaman'], per: 9 },
        { type: 'treasure', width: 1600, waves: 2, pool: ['golem', 'salamander'], per: 3, chests: 4, elite: true },
        { type: 'fight', width: 2100, waves: 4, pool: ['knight_dark', 'salamander', 'golem'], per: 7 },
        { type: 'boss', width: 1500, boss: 'cyclops' }
      ],
      altRooms: [
        { type: 'gauntlet', width: 2600, waves: 5, pool: ['salamander', 'knight_dark', 'orc'], per: 10 },
        { type: 'fight', width: 2200, waves: 3, pool: ['golem', 'golem', 'salamander'], per: 5, elite: true },
        { type: 'treasure', width: 1700, waves: 2, pool: ['knight_dark'], per: 3, chests: 5, elite: true },
        { type: 'boss', width: 1500, boss: 'cyclops' }
      ]
    },
    {
      id: 'citadel', name: 'Citadelle du Dragon', level: 36, order: 6,
      blurb: 'La couronne est là-haut, au sommet, gardée par le plus vieux des dragons.',
      theme: {
        sky: ['#120a1a', '#2a1030', '#4a2050'], ground: '#3a2a4a', ground2: '#2a1e38',
        fog: '#a06ad0', accent: '#ffd24a', props: 'castle'
      },
      music: 'castle',
      rooms: [
        { type: 'fight', width: 2000, waves: 3, pool: ['knight_dark', 'cultist', 'gargoyle'], per: 7 },
        { type: 'gauntlet', width: 2600, waves: 4, pool: ['knight_dark', 'wraith', 'salamander'], per: 9 },
        { type: 'treasure', width: 1700, waves: 2, pool: ['golem', 'knight_dark'], per: 3, chests: 5, elite: true },
        { type: 'fight', width: 2200, waves: 4, pool: ['knight_dark', 'golem', 'cultist', 'wraith'], per: 8 },
        { type: 'boss', width: 1700, boss: 'dragon' }
      ],
      altRooms: [
        { type: 'gauntlet', width: 2800, waves: 5, pool: ['knight_dark', 'golem', 'wraith', 'cultist'], per: 11 },
        { type: 'fight', width: 2300, waves: 4, pool: ['golem', 'knight_dark'], per: 6, elite: true },
        { type: 'treasure', width: 1800, waves: 3, pool: ['knight_dark', 'wraith'], per: 4, chests: 6, elite: true },
        { type: 'boss', width: 1700, boss: 'dragon' }
      ]
    }
  ];

  /* --------------------------- Difficultés ----------------------------- */
  var DIFFICULTIES = [
    { id: 'normal', name: 'Normal', mult: 1.0, lootBonus: 0, goldBonus: 0, xpBonus: 0, unlockAt: 0, color: '#6fd66f' },
    { id: 'hard', name: 'Difficile', mult: 2.4, lootBonus: 2, goldBonus: 0.5, xpBonus: 0.6, unlockAt: 1, color: '#ffb24a' },
    { id: 'infernal', name: 'Infernal', mult: 5.5, lootBonus: 4, goldBonus: 1.3, xpBonus: 1.6, unlockAt: 2, color: '#ff5a5a' },
    { id: 'nightmare', name: 'Cauchemar', mult: 12.0, lootBonus: 7, goldBonus: 2.5, xpBonus: 3.0, unlockAt: 3, color: '#c07dff' }
  ];

  function byId(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }
  function difficulty(id) { for (var i = 0; i < DIFFICULTIES.length; i++) if (DIFFICULTIES[i].id === id) return DIFFICULTIES[i]; return DIFFICULTIES[0]; }

  /** Le donjon suivant se débloque en battant le précédent. */
  function unlockedStages(progress) {
    var cleared = progress.cleared || {};
    var out = [];
    for (var i = 0; i < LIST.length; i++) {
      if (i === 0) { out.push(LIST[i]); continue; }
      if (cleared[LIST[i - 1].id]) out.push(LIST[i]);
      else break;
    }
    return out;
  }

  return { LIST: LIST, byId: byId, DIFFICULTIES: DIFFICULTIES, difficulty: difficulty, unlockedStages: unlockedStages };
})();

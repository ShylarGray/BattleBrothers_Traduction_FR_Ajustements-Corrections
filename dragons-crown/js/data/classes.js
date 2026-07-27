/* =========================================================================
 * Données : classes jouables, mouvements, arbres de compétences
 * ====================================================================== */
'use strict';

DC.Classes = (function () {

  /* Descripteur d'attaque
   * startup / active / recover : durées en images (60 img/s)
   * dmg      : multiplicateur appliqué à l'ATK effective
   * reach    : portée en avant (px monde) ; width : demi-profondeur (axe z)
   * knock    : recul horizontal ; launch : vitesse verticale infligée
   * hitstop  : gel d'image à l'impact
   * move     : impulsion horizontale de l'attaquant au démarrage
   */
  function atk(o) {
    return Object.assign({
      name: 'Attaque', kind: 'melee', startup: 6, active: 4, recover: 10,
      dmg: 1, reach: 46, width: 22, height: 60, yoff: 0,
      knock: 2, launch: 0, hitstop: 4, move: 0, mp: 0, hits: 1,
      element: 'phys', pierce: false, sfx: 'swing'
    }, o);
  }

  var COMMON_SKILLS = [
    { id: 'vitality', name: 'Vitalité', max: 5, cost: 1, desc: '+12 % PV max par rang.', icon: '❤' },
    { id: 'strength', name: 'Force brute', max: 5, cost: 1, desc: '+8 % dégâts physiques par rang.', icon: '⚔' },
    { id: 'concentration', name: 'Concentration', max: 5, cost: 1, desc: '+15 PM max et +25 % régénération de PM par rang.', icon: '✦' },
    { id: 'evasion', name: 'Esquive', max: 3, cost: 2, desc: 'Roulade plus longue et invincibilité prolongée.', icon: '➤' },
    { id: 'fortune', name: 'Fortune', max: 5, cost: 1, desc: '+10 % d\'or et +6 % de chance de butin rare par rang.', icon: '◈' },
    { id: 'satchel', name: 'Besace', max: 3, cost: 1, desc: '+2 emplacements d\'objets consommables par rang.', icon: '▤' },
    { id: 'secondwind', name: 'Second souffle', max: 3, cost: 2, desc: '+1 relèvement automatique par donjon.', icon: '✚' },
    { id: 'ironwill', name: 'Volonté de fer', max: 5, cost: 1, desc: '+6 % de défense et résistance aux projections.', icon: '⛨' }
  ];

  var C = {};

  /* ------------------------------ CHEVALIER ---------------------------- */
  C.knight = {
    id: 'knight', name: 'Chevalier', role: 'Combattant polyvalent',
    blurb: 'Épée et bouclier. Encaisse, protège les alliés et enchaîne les ripostes.',
    diff: 1,
    palette: { skin: '#e8b98a', hair: '#c9a227', cloth: '#2f4f8f', metal: '#c9d3e0', accent: '#e0b84c', cape: '#8f2230' },
    base: { hp: 200, mp: 60, atk: 15, def: 14, mag: 6, spd: 1.0, crit: 0.05, luck: 5 },
    growth: { hp: 15, mp: 3, atk: 2.0, def: 2.0, mag: 0.6 },
    weapon: 'sword',
    combo: [
      atk({ name: 'Taille', dmg: 1.0, startup: 5, active: 4, recover: 8, reach: 48, knock: 2, move: 3 }),
      atk({ name: 'Revers', dmg: 1.1, startup: 5, active: 4, recover: 9, reach: 50, knock: 3, move: 4 }),
      atk({ name: 'Estoc', dmg: 1.35, startup: 7, active: 5, recover: 14, reach: 62, knock: 6, move: 8, hitstop: 6 })
    ],
    heavy: atk({ name: 'Coup de bouclier', dmg: 1.6, startup: 11, active: 6, recover: 20, reach: 44, width: 26, knock: 12, launch: 2, hitstop: 8, move: 6, stun: 60 }),
    air: atk({ name: 'Fendant plongeant', dmg: 1.5, startup: 6, active: 12, recover: 12, reach: 46, width: 24, knock: 5, hitstop: 6 }),
    special: atk({ name: 'Tourbillon d\'acier', dmg: 0.75, kind: 'spin', startup: 8, active: 30, recover: 16, reach: 60, width: 34, knock: 4, mp: 25, hits: 5, hitstop: 3 }),
    super: atk({ name: 'Jugement du Lion', dmg: 3.2, kind: 'slam', startup: 16, active: 14, recover: 26, reach: 92, width: 46, knock: 14, launch: 6, mp: 55, hitstop: 12, element: 'holy' }),
    passive: 'Garde : bloque automatiquement 60 % des projectiles arrivant de face.',
    skills: [
      { id: 'k_guard', name: 'Garde parfaite', max: 3, cost: 1, desc: 'Blocage des projectiles porté à 80 % et renvoi possible.' },
      { id: 'k_bash', name: 'Charge du bouclier', max: 3, cost: 1, desc: 'Le coup de bouclier étourdit plus longtemps et projette au sol.' },
      { id: 'k_whirl', name: 'Tourbillon prolongé', max: 3, cost: 1, desc: '+2 impacts et +20 % de portée sur le Tourbillon d\'acier.' },
      { id: 'k_rally', name: 'Bannière de ralliement', max: 3, cost: 2, desc: 'Les alliés proches gagnent +8 % de dégâts par rang.' }
    ]
  };

  /* ------------------------------- AMAZONE ----------------------------- */
  C.amazon = {
    id: 'amazon', name: 'Amazone', role: 'Bourrine mobile',
    blurb: 'Hache à deux mains. Dégâts colossaux, mobilité aérienne, défense fragile.',
    diff: 2,
    palette: { skin: '#c98a5a', hair: '#3b2a20', cloth: '#7a3a2a', metal: '#b98a3a', accent: '#e8d29a', cape: '#4a7a3a' },
    base: { hp: 175, mp: 55, atk: 19, def: 9, mag: 6, spd: 1.15, crit: 0.09, luck: 6 },
    growth: { hp: 12, mp: 3, atk: 2.7, def: 1.2, mag: 0.6 },
    weapon: 'axe',
    combo: [
      atk({ name: 'Fauche', dmg: 1.1, startup: 6, active: 4, recover: 8, reach: 52, move: 4 }),
      atk({ name: 'Contre-fauche', dmg: 1.2, startup: 6, active: 4, recover: 9, reach: 54, move: 5 }),
      atk({ name: 'Moulinet', dmg: 1.3, startup: 7, active: 6, recover: 10, reach: 56, width: 28, knock: 4, move: 5 }),
      atk({ name: 'Décapitation', dmg: 1.8, startup: 10, active: 6, recover: 18, reach: 60, knock: 10, launch: 5, hitstop: 9, move: 7 })
    ],
    heavy: atk({ name: 'Écrasement', dmg: 2.0, startup: 14, active: 6, recover: 22, reach: 50, width: 30, knock: 6, launch: 8, hitstop: 10 }),
    air: atk({ name: 'Météore', dmg: 1.7, startup: 5, active: 14, recover: 14, reach: 48, width: 26, knock: 6, hitstop: 7 }),
    special: atk({ name: 'Danse mortelle', dmg: 0.6, kind: 'rush', startup: 8, active: 34, recover: 18, reach: 58, width: 26, knock: 3, mp: 22, hits: 7, hitstop: 3 }),
    super: atk({ name: 'Fureur de la horde', dmg: 0.9, kind: 'rage', startup: 12, active: 60, recover: 22, reach: 70, width: 40, knock: 6, mp: 50, hits: 12, hitstop: 4 }),
    passive: 'Rage : jusqu\'à +40 % de dégâts à mesure que ses PV baissent.',
    skills: [
      { id: 'a_rage', name: 'Sang bouillant', max: 3, cost: 1, desc: 'Le bonus de Rage monte jusqu\'à +70 %.' },
      { id: 'a_leap', name: 'Bond de chasse', max: 3, cost: 1, desc: 'Double saut et attaque aérienne renforcée.' },
      { id: 'a_dance', name: 'Danse sans fin', max: 3, cost: 1, desc: '+3 impacts sur la Danse mortelle.' },
      { id: 'a_execute', name: 'Coup de grâce', max: 3, cost: 2, desc: '+25 % de dégâts par rang sur les ennemis sous 30 % de PV.' }
    ]
  };

  /* --------------------------------- NAIN ------------------------------ */
  C.dwarf = {
    id: 'dwarf', name: 'Nain', role: 'Lutteur inarrêtable',
    blurb: 'Poings d\'acier et projections. Lent mais increvable, roi des mêlées.',
    diff: 2,
    palette: { skin: '#d9a170', hair: '#a8451f', cloth: '#5a4a2a', metal: '#9aa3ad', accent: '#d8b45a', cape: '#3a3a4a' },
    base: { hp: 245, mp: 45, atk: 17, def: 17, mag: 4, spd: 0.85, crit: 0.06, luck: 7 },
    growth: { hp: 20, mp: 2, atk: 2.2, def: 2.6, mag: 0.3 },
    weapon: 'fists',
    combo: [
      atk({ name: 'Direct', dmg: 1.0, startup: 5, active: 3, recover: 7, reach: 38, move: 3 }),
      atk({ name: 'Crochet', dmg: 1.1, startup: 5, active: 3, recover: 8, reach: 40, move: 3 }),
      atk({ name: 'Marteau', dmg: 1.7, startup: 9, active: 5, recover: 16, reach: 44, knock: 12, hitstop: 9, move: 4 })
    ],
    heavy: atk({ name: 'Prise et projection', dmg: 2.2, kind: 'grab', startup: 8, active: 6, recover: 24, reach: 40, width: 24, knock: 20, launch: 9, hitstop: 12 }),
    air: atk({ name: 'Presse du nain', dmg: 1.9, startup: 6, active: 16, recover: 18, reach: 42, width: 30, knock: 4, launch: 4, hitstop: 8 }),
    special: atk({ name: 'Tremblement', dmg: 1.3, kind: 'quake', startup: 14, active: 10, recover: 20, reach: 110, width: 90, knock: 8, launch: 6, mp: 24, hitstop: 8 }),
    super: atk({ name: 'Colère de la montagne', dmg: 1.0, kind: 'quake', startup: 18, active: 40, recover: 26, reach: 170, width: 120, knock: 10, launch: 7, mp: 52, hits: 6, hitstop: 6 }),
    passive: 'Roc : insensible aux projections légères et -20 % de dégâts subis de dos.',
    skills: [
      { id: 'd_throw', name: 'Projection écrasante', max: 3, cost: 1, desc: 'La projection touche aussi les ennemis alentour.' },
      { id: 'd_armor', name: 'Peau de granit', max: 3, cost: 1, desc: '-8 % de dégâts subis par rang.' },
      { id: 'd_quake', name: 'Faille profonde', max: 3, cost: 1, desc: '+30 % de rayon sur le Tremblement.' },
      { id: 'd_greed', name: 'Flair du trésor', max: 3, cost: 2, desc: 'Révèle les coffres cachés et +15 % d\'or par rang.' }
    ]
  };

  /* --------------------------------- ELFE ------------------------------ */
  C.elf = {
    id: 'elf', name: 'Elfe', role: 'Archère',
    blurb: 'Arc long et flèches enchantées. Domine à distance, fragile au corps à corps.',
    diff: 3,
    palette: { skin: '#f0cfa8', hair: '#e8e0b0', cloth: '#2f6a4a', metal: '#cfd8c0', accent: '#c8a24a', cape: '#1f4a32' },
    base: { hp: 155, mp: 70, atk: 13, def: 8, mag: 10, spd: 1.25, crit: 0.12, luck: 9 },
    growth: { hp: 10, mp: 4, atk: 1.7, def: 1.1, mag: 1.2 },
    weapon: 'bow', arrows: 30,
    combo: [
      atk({ name: 'Dague', dmg: 0.85, startup: 4, active: 3, recover: 6, reach: 36, move: 3 }),
      atk({ name: 'Entaille', dmg: 0.9, startup: 4, active: 3, recover: 6, reach: 38, move: 3 }),
      atk({ name: 'Coup de pied tournant', dmg: 1.25, startup: 6, active: 5, recover: 12, reach: 44, knock: 10, hitstop: 6, move: 5 })
    ],
    heavy: atk({ name: 'Tir tendu', kind: 'shot', dmg: 1.6, startup: 10, active: 2, recover: 16, reach: 0, knock: 4, ammo: 1, speed: 13, hitstop: 4 }),
    air: atk({ name: 'Tir plongeant', kind: 'shot', dmg: 1.3, startup: 6, active: 2, recover: 12, ammo: 1, speed: 12, angle: 0.35 }),
    special: atk({ name: 'Volée triple', kind: 'shot', dmg: 1.1, startup: 8, active: 3, recover: 18, ammo: 3, count: 3, spread: 0.13, speed: 14, mp: 12 }),
    super: atk({ name: 'Pluie de flèches', kind: 'rain', dmg: 0.85, startup: 18, active: 60, recover: 22, reach: 200, width: 110, mp: 48, hits: 14, ammo: 8, element: 'wind' }),
    passive: 'Carquois : récupère des flèches sur les ennemis abattus (les tirs plantés se ramassent).',
    skills: [
      { id: 'e_quiver', name: 'Carquois sans fin', max: 3, cost: 1, desc: '+10 flèches max et récupération accrue par rang.' },
      { id: 'e_pierce', name: 'Flèche perforante', max: 3, cost: 1, desc: 'Les flèches traversent 1 ennemi de plus par rang.' },
      { id: 'e_elem', name: 'Pointes élémentaires', max: 3, cost: 2, desc: 'Les flèches infligent brûlure ou gel.' },
      { id: 'e_dodge', name: 'Pas de l\'ombre', max: 3, cost: 1, desc: 'La roulade est plus rapide et traverse les ennemis.' }
    ]
  };

  /* ------------------------------- SORCIER ----------------------------- */
  C.wizard = {
    id: 'wizard', name: 'Sorcier', role: 'Mage de destruction',
    blurb: 'Feu, foudre et gravité. Faible au corps à corps, dévastateur à distance.',
    diff: 3,
    palette: { skin: '#e6c49a', hair: '#e8e8e8', cloth: '#4a2f7a', metal: '#c0b0e0', accent: '#e8c84a', cape: '#2a1a4a' },
    base: { hp: 145, mp: 110, atk: 9, def: 7, mag: 20, spd: 0.95, crit: 0.05, luck: 8 },
    growth: { hp: 9, mp: 7, atk: 1.0, def: 1.0, mag: 2.8 },
    weapon: 'staff',
    combo: [
      atk({ name: 'Coup de bâton', dmg: 0.7, startup: 6, active: 4, recover: 10, reach: 46, move: 2 }),
      atk({ name: 'Revers de bâton', dmg: 0.8, startup: 6, active: 4, recover: 12, reach: 48, knock: 6, move: 3 })
    ],
    heavy: atk({ name: 'Onde arcanique', kind: 'wave', dmg: 1.2, startup: 12, active: 6, recover: 20, reach: 80, width: 34, knock: 8, element: 'arcane' }),
    air: atk({ name: 'Chute magique', dmg: 1.1, startup: 8, active: 12, recover: 16, reach: 44, element: 'arcane' }),
    special: atk({ name: 'Boule de feu', kind: 'shot', dmg: 1.8, startup: 12, active: 3, recover: 18, speed: 8, mp: 18, element: 'fire', radius: 40, hitstop: 6 }),
    super: atk({ name: 'Champ de gravité', kind: 'gravity', dmg: 0.8, startup: 20, active: 90, recover: 24, reach: 130, width: 130, mp: 55, hits: 12, element: 'arcane' }),
    passive: 'Canalisation : régénération de PM deux fois plus rapide, et les sorts perforent les armures.',
    skills: [
      { id: 'w_fire', name: 'Embrasement', max: 3, cost: 1, desc: 'La boule de feu explose plus large et enflamme.' },
      { id: 'w_bolt', name: 'Chaîne d\'éclairs', max: 3, cost: 2, desc: 'Ajoute un éclair qui rebondit sur 2 cibles par rang.' },
      { id: 'w_grav', name: 'Singularité', max: 3, cost: 2, desc: 'Le champ de gravité aspire plus fort et dure plus longtemps.' },
      { id: 'w_mana', name: 'Puits de mana', max: 5, cost: 1, desc: '+20 PM max et +15 % de régénération par rang.' }
    ]
  };

  /* ----------------------------- ENSORCELEUSE -------------------------- */
  C.sorceress = {
    id: 'sorceress', name: 'Ensorceleuse', role: 'Soutien & invocations',
    blurb: 'Glace, nécromancie et festins. Contrôle le champ de bataille et soutient l\'équipe.',
    diff: 3,
    palette: { skin: '#f2d3b0', hair: '#6a2f7a', cloth: '#1f3a6a', metal: '#b0c8e8', accent: '#7ad0e8', cape: '#2a1f4a' },
    base: { hp: 160, mp: 100, atk: 10, def: 8, mag: 17, spd: 1.0, crit: 0.05, luck: 10 },
    growth: { hp: 11, mp: 6, atk: 1.2, def: 1.2, mag: 2.4 },
    weapon: 'staff',
    combo: [
      atk({ name: 'Coup de sceptre', dmg: 0.75, startup: 6, active: 4, recover: 10, reach: 44, move: 2 }),
      atk({ name: 'Balayage givré', dmg: 0.9, startup: 6, active: 5, recover: 12, reach: 48, knock: 5, element: 'ice', move: 3 })
    ],
    heavy: atk({ name: 'Nova de givre', kind: 'quake', dmg: 1.3, startup: 14, active: 8, recover: 22, reach: 90, width: 80, knock: 6, element: 'ice', freeze: 90 }),
    air: atk({ name: 'Éclat plongeant', dmg: 1.1, startup: 8, active: 12, recover: 16, reach: 42, element: 'ice' }),
    special: atk({ name: 'Lance de glace', kind: 'shot', dmg: 1.5, startup: 10, active: 3, recover: 16, speed: 11, mp: 16, element: 'ice', pierce: true, freeze: 70 }),
    super: atk({ name: 'Légion d\'os', kind: 'summon', dmg: 0, startup: 24, active: 10, recover: 24, mp: 50, summon: 3, duration: 1200 }),
    passive: 'Festin : crée régulièrement de la nourriture qui soigne toute l\'équipe.',
    skills: [
      { id: 's_bones', name: 'Nécromancie', max: 3, cost: 2, desc: '+1 squelette invoqué et invocations plus résistantes.' },
      { id: 's_ice', name: 'Cœur de glace', max: 3, cost: 1, desc: 'Le gel dure plus longtemps et fragilise (+20 % de dégâts subis).' },
      { id: 's_feast', name: 'Grand festin', max: 3, cost: 1, desc: 'Nourriture plus fréquente et plus nourrissante.' },
      { id: 's_ward', name: 'Égide azurée', max: 3, cost: 2, desc: 'Bouclier magique périodique sur toute l\'équipe.' }
    ]
  };

  var ORDER = ['knight', 'amazon', 'dwarf', 'elf', 'wizard', 'sorceress'];

  /** Table d'expérience cumulée. Niveau max : 60. */
  var XP_TABLE = (function () {
    var t = [0], cum = 0;
    for (var lv = 1; lv <= 99; lv++) {
      cum += Math.floor(60 * Math.pow(lv, 1.55) + 40 * lv);
      t.push(cum);
    }
    return t;
  })();
  var MAX_LEVEL = 60;

  function levelFromXp(xp) {
    var lv = 1;
    while (lv < MAX_LEVEL && xp >= XP_TABLE[lv]) lv++;
    return lv;
  }
  function xpForLevel(lv) { return XP_TABLE[Math.min(lv, XP_TABLE.length - 1)]; }

  function get(id) { return C[id]; }
  function all() { return ORDER.map(function (id) { return C[id]; }); }
  function skillsFor(id) { return C[id].skills.concat(COMMON_SKILLS); }

  return {
    get: get, all: all, ORDER: ORDER, COMMON_SKILLS: COMMON_SKILLS,
    skillsFor: skillsFor, levelFromXp: levelFromXp, xpForLevel: xpForLevel,
    MAX_LEVEL: MAX_LEVEL, atk: atk
  };
})();

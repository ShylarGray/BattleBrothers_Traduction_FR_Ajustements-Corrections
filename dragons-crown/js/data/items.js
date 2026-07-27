/* =========================================================================
 * Données : équipements, consommables, raretés et affixes
 * ====================================================================== */
'use strict';

DC.Items = (function () {

  /* ------------------------------ Raretés ------------------------------ */
  var RARITY = [
    { id: 'common', name: 'Commun', color: '#cfd4dc', weight: 100, affixes: 0, mult: 1.00, valMult: 1.0 },
    { id: 'uncommon', name: 'Peu commun', color: '#6fd66f', weight: 46, affixes: 1, mult: 1.15, valMult: 2.2 },
    { id: 'rare', name: 'Rare', color: '#5aa9ff', weight: 18, affixes: 2, mult: 1.35, valMult: 5.0 },
    { id: 'epic', name: 'Épique', color: '#c07dff', weight: 6, affixes: 3, mult: 1.60, valMult: 12.0 },
    { id: 'legendary', name: 'Légendaire', color: '#ffa337', weight: 1.4, affixes: 4, mult: 2.00, valMult: 30.0 },
    { id: 'mythic', name: 'Mythique', color: '#ff5a7a', weight: 0.18, affixes: 5, mult: 2.60, valMult: 80.0 }
  ];
  function rarity(id) { for (var i = 0; i < RARITY.length; i++) if (RARITY[i].id === id) return RARITY[i]; return RARITY[0]; }
  function rarityIndex(id) { for (var i = 0; i < RARITY.length; i++) if (RARITY[i].id === id) return i; return 0; }

  /* --------------------------- Bases d'armes --------------------------- */
  // wtype doit correspondre au champ `weapon` de la classe.
  var WEAPONS = [
    // Épées (Chevalier)
    { base: 'Glaive', wtype: 'sword', tier: 1, stats: { atk: 8, crit: 0.01 } },
    { base: 'Épée longue', wtype: 'sword', tier: 3, stats: { atk: 16, crit: 0.01 } },
    { base: 'Épée bâtarde', wtype: 'sword', tier: 6, stats: { atk: 28, def: 2 } },
    { base: 'Flamberge', wtype: 'sword', tier: 10, stats: { atk: 44, crit: 0.03 } },
    { base: 'Lame runique', wtype: 'sword', tier: 15, stats: { atk: 62, mag: 10 } },
    { base: 'Tueuse de dragons', wtype: 'sword', tier: 22, stats: { atk: 92, crit: 0.05, def: 6 } },
    // Haches (Amazone)
    { base: 'Hachette', wtype: 'axe', tier: 1, stats: { atk: 10 } },
    { base: 'Hache de guerre', wtype: 'axe', tier: 3, stats: { atk: 19 } },
    { base: 'Hache à deux mains', wtype: 'axe', tier: 6, stats: { atk: 33, spd: -0.03 } },
    { base: 'Bardiche', wtype: 'axe', tier: 10, stats: { atk: 50, crit: 0.04 } },
    { base: 'Hache de la horde', wtype: 'axe', tier: 15, stats: { atk: 71, crit: 0.05 } },
    { base: 'Fendoir du titan', wtype: 'axe', tier: 22, stats: { atk: 104, crit: 0.06 } },
    // Gantelets (Nain)
    { base: 'Poings cloutés', wtype: 'fists', tier: 1, stats: { atk: 9, def: 1 } },
    { base: 'Gantelets de fer', wtype: 'fists', tier: 3, stats: { atk: 17, def: 3 } },
    { base: 'Poings-marteaux', wtype: 'fists', tier: 6, stats: { atk: 30, def: 5 } },
    { base: 'Griffes de mithril', wtype: 'fists', tier: 10, stats: { atk: 46, def: 8, crit: 0.03 } },
    { base: 'Enclumes jumelles', wtype: 'fists', tier: 15, stats: { atk: 66, def: 12 } },
    { base: 'Poings du séisme', wtype: 'fists', tier: 22, stats: { atk: 96, def: 18 } },
    // Arcs (Elfe)
    { base: 'Arc court', wtype: 'bow', tier: 1, stats: { atk: 7, spd: 0.03 } },
    { base: 'Arc de chasse', wtype: 'bow', tier: 3, stats: { atk: 14, crit: 0.03 } },
    { base: 'Arc long elfique', wtype: 'bow', tier: 6, stats: { atk: 25, crit: 0.04 } },
    { base: 'Arc composite', wtype: 'bow', tier: 10, stats: { atk: 39, crit: 0.05, spd: 0.03 } },
    { base: 'Arc des cimes', wtype: 'bow', tier: 15, stats: { atk: 56, crit: 0.07 } },
    { base: 'Arc du zéphyr', wtype: 'bow', tier: 22, stats: { atk: 82, crit: 0.09, spd: 0.05 } },
    // Bâtons (Sorcier / Ensorceleuse)
    { base: 'Bâton noueux', wtype: 'staff', tier: 1, stats: { atk: 4, mag: 8, mp: 5 } },
    { base: 'Sceptre d\'apprenti', wtype: 'staff', tier: 3, stats: { atk: 6, mag: 15, mp: 10 } },
    { base: 'Bâton de cristal', wtype: 'staff', tier: 6, stats: { atk: 9, mag: 26, mp: 18 } },
    { base: 'Sceptre d\'ambre', wtype: 'staff', tier: 10, stats: { atk: 12, mag: 40, mp: 28 } },
    { base: 'Bâton du conclave', wtype: 'staff', tier: 15, stats: { atk: 16, mag: 57, mp: 40 } },
    { base: 'Sceptre de l\'éclipse', wtype: 'staff', tier: 22, stats: { atk: 22, mag: 84, mp: 60 } }
  ];

  /* -------------------------- Bases d'armures -------------------------- */
  var ARMORS = [
    { base: 'Tunique de cuir', wtype: 'light', tier: 1, stats: { def: 6, hp: 10, spd: 0.02 } },
    { base: 'Cuirasse cloutée', wtype: 'light', tier: 4, stats: { def: 13, hp: 22 } },
    { base: 'Cotte de mailles', wtype: 'heavy', tier: 7, stats: { def: 24, hp: 34, spd: -0.02 } },
    { base: 'Harnois de plates', wtype: 'heavy', tier: 12, stats: { def: 38, hp: 55, spd: -0.04 } },
    { base: 'Robe enchantée', wtype: 'robe', tier: 5, stats: { def: 10, mag: 14, mp: 22 } },
    { base: 'Manteau du conclave', wtype: 'robe', tier: 11, stats: { def: 18, mag: 27, mp: 40 } },
    { base: 'Écailles de wyverne', wtype: 'heavy', tier: 17, stats: { def: 54, hp: 78 } },
    { base: 'Plates de mithril', wtype: 'heavy', tier: 23, stats: { def: 76, hp: 110, spd: -0.02 } },
    { base: 'Voile astral', wtype: 'robe', tier: 20, stats: { def: 30, mag: 46, mp: 70 } }
  ];

  /* ------------------------- Bases d'accessoires ----------------------- */
  var ACCESSORIES = [
    { base: 'Anneau de cuivre', wtype: 'ring', tier: 1, stats: { atk: 3, mag: 3 } },
    { base: 'Amulette d\'os', wtype: 'amulet', tier: 3, stats: { hp: 25, def: 3 } },
    { base: 'Bracelet de vitesse', wtype: 'ring', tier: 5, stats: { spd: 0.07, crit: 0.02 } },
    { base: 'Talisman de mana', wtype: 'amulet', tier: 7, stats: { mp: 35, mag: 9 } },
    { base: 'Anneau du vétéran', wtype: 'ring', tier: 10, stats: { atk: 14, def: 8 } },
    { base: 'Œil du dragon', wtype: 'amulet', tier: 14, stats: { crit: 0.08, atk: 18 } },
    { base: 'Cœur de golem', wtype: 'amulet', tier: 18, stats: { hp: 120, def: 22, spd: -0.03 } },
    { base: 'Sceau du roi-sorcier', wtype: 'ring', tier: 24, stats: { mag: 55, mp: 60, crit: 0.05 } }
  ];

  /* ------------------------------ Affixes ------------------------------ */
  // scale : valeur par palier de tier ; flat : valeur fixe minimale.
  var PREFIXES = [
    { id: 'sharp', name: 'Affûté', stat: 'atk', flat: 4, scale: 1.1, weight: 20 },
    { id: 'brutal', name: 'Brutal', stat: 'atk', flat: 8, scale: 1.8, weight: 10 },
    { id: 'arcane', name: 'Arcanique', stat: 'mag', flat: 5, scale: 1.3, weight: 16 },
    { id: 'blazing', name: 'Ardent', stat: 'atk', flat: 5, scale: 1.2, weight: 12, proc: 'burn' },
    { id: 'frozen', name: 'Glacial', stat: 'mag', flat: 4, scale: 1.0, weight: 12, proc: 'freeze' },
    { id: 'thunder', name: 'Foudroyant', stat: 'atk', flat: 6, scale: 1.4, weight: 8, proc: 'shock' },
    { id: 'vampiric', name: 'Vampirique', stat: 'atk', flat: 3, scale: 0.8, weight: 5, proc: 'lifesteal' },
    { id: 'heavy', name: 'Pesant', stat: 'atk', flat: 10, scale: 2.0, weight: 7, penalty: { spd: -0.05 } },
    { id: 'swift', name: 'Vif', stat: 'spd', flat: 0.05, scale: 0.004, weight: 10, isFloat: true },
    { id: 'keen', name: 'Acéré', stat: 'crit', flat: 0.03, scale: 0.003, weight: 10, isFloat: true }
  ];
  var SUFFIXES = [
    { id: 'bear', name: 'de l\'Ours', stat: 'hp', flat: 25, scale: 6, weight: 20 },
    { id: 'turtle', name: 'de la Tortue', stat: 'def', flat: 5, scale: 1.3, weight: 18 },
    { id: 'owl', name: 'du Hibou', stat: 'mp', flat: 20, scale: 4.5, weight: 16 },
    { id: 'fox', name: 'du Renard', stat: 'luck', flat: 4, scale: 0.9, weight: 12 },
    { id: 'hawk', name: 'du Faucon', stat: 'crit', flat: 0.03, scale: 0.0035, weight: 12, isFloat: true },
    { id: 'stag', name: 'du Cerf', stat: 'spd', flat: 0.04, scale: 0.0035, weight: 12, isFloat: true },
    { id: 'titan', name: 'du Titan', stat: 'atk', flat: 6, scale: 1.5, weight: 8 },
    { id: 'sage', name: 'du Sage', stat: 'mag', flat: 7, scale: 1.6, weight: 8 },
    { id: 'phoenix', name: 'du Phénix', stat: 'hp', flat: 45, scale: 10, weight: 5, proc: 'regen' },
    { id: 'dragon', name: 'du Dragon', stat: 'atk', flat: 12, scale: 2.4, weight: 3, penalty: { def: -4 } }
  ];

  /* --------------------------- Consommables ---------------------------- */
  var CONSUMABLES = [
    { id: 'potion_s', name: 'Potion mineure', icon: '🧪', color: '#e8556a', value: 60, effect: { hp: 90 }, desc: 'Rend 90 PV.' },
    { id: 'potion_m', name: 'Potion', icon: '🧪', color: '#e8556a', value: 160, effect: { hpPct: 0.5 }, desc: 'Rend 50 % des PV max.' },
    { id: 'potion_l', name: 'Élixir', icon: '🧪', color: '#ff2f5a', value: 420, effect: { hpPct: 1.0, cure: true }, desc: 'Rend tous les PV et purge les altérations.' },
    { id: 'ether_s', name: 'Éther', icon: '🔮', color: '#5aa9ff', value: 120, effect: { mp: 60 }, desc: 'Rend 60 PM.' },
    { id: 'ether_l', name: 'Grand éther', icon: '🔮', color: '#3a7fff', value: 320, effect: { mpPct: 1.0 }, desc: 'Rend tous les PM.' },
    { id: 'bread', name: 'Miche de pain', icon: '🍞', color: '#d8a24a', value: 30, effect: { hp: 45 }, desc: 'Rend 45 PV. Se partage.' },
    { id: 'roast', name: 'Cuissot rôti', icon: '🍖', color: '#c86a3a', value: 90, effect: { hp: 140 }, desc: 'Rend 140 PV à celui qui le ramasse.' },
    { id: 'bomb', name: 'Bombe naine', icon: '💣', color: '#8a8a8a', value: 140, effect: { bomb: 260 }, desc: 'Explose : 260 dégâts de zone.' },
    { id: 'revive', name: 'Fiole de résurrection', icon: '✚', color: '#ffd24a', value: 900, effect: { revive: true }, desc: 'Relève instantanément un allié à terre.' },
    { id: 'antidote', name: 'Antidote', icon: '🌿', color: '#6fd66f', value: 50, effect: { cure: true }, desc: 'Soigne poison, brûlure et gel.' },
    { id: 'atkbuff', name: 'Poudre de rage', icon: '🔥', color: '#ff7a3a', value: 260, effect: { buff: 'atk', pct: 0.35, dur: 1800 }, desc: '+35 % d\'attaque pendant 30 s.' },
    { id: 'defbuff', name: 'Onguent de pierre', icon: '🛡', color: '#9ab0c8', value: 240, effect: { buff: 'def', pct: 0.45, dur: 1800 }, desc: '+45 % de défense pendant 30 s.' }
  ];
  function consumable(id) { for (var i = 0; i < CONSUMABLES.length; i++) if (CONSUMABLES[i].id === id) return CONSUMABLES[i]; return null; }

  /* ----------------------------- Trésors ------------------------------- */
  var TREASURES = [
    { id: 't_coin', name: 'Vieille pièce', icon: '◉', value: 120 },
    { id: 't_gem', name: 'Gemme brute', icon: '◈', value: 380 },
    { id: 't_idol', name: 'Idole d\'ivoire', icon: '⛊', value: 900 },
    { id: 't_crown', name: 'Couronne ternie', icon: '♔', value: 2200 },
    { id: 't_relic', name: 'Relique du dragon', icon: '✵', value: 6000 }
  ];

  var SLOTS = { weapon: 'Arme', armor: 'Armure', accessory: 'Accessoire' };

  function basesFor(slot) {
    if (slot === 'weapon') return WEAPONS;
    if (slot === 'armor') return ARMORS;
    return ACCESSORIES;
  }

  /** Statistiques totales d'un objet (base + affixes déjà calculés à la génération). */
  function itemStats(item) { return item.stats || {}; }

  /** Nom affiché — un objet non identifié reste mystérieux. */
  function itemName(item) {
    if (!item) return '—';
    if (item.kind === 'consumable') { var c = consumable(item.id); return c ? c.name : item.id; }
    if (item.kind === 'treasure') return item.name;
    if (!item.appraised) return 'Objet non identifié';
    return item.name;
  }

  function itemColor(item) {
    if (!item) return '#888';
    if (item.kind === 'consumable') { var c = consumable(item.id); return c ? c.color : '#ccc'; }
    if (item.kind === 'treasure') return '#ffd24a';
    if (!item.appraised) return '#9aa0a8';
    return rarity(item.rarity).color;
  }

  /** Prix de vente / d'achat. Un objet non identifié se vend une misère. */
  function sellValue(item) {
    if (!item) return 0;
    if (item.kind === 'consumable') { var c = consumable(item.id); return Math.floor((c ? c.value : 10) * 0.4) * (item.qty || 1); }
    if (item.kind === 'treasure') return item.value;
    if (!item.appraised) return Math.floor(item.value * 0.12);
    return Math.floor(item.value * 0.35);
  }
  function buyValue(item) {
    if (item.kind === 'consumable') { var c = consumable(item.id); return c ? c.value : 10; }
    return Math.floor(item.value * 1.25);
  }
  /** Coût d'expertise : proportionnel à la valeur estimée, avec un plancher. */
  function appraiseCost(item) { return Math.max(40, Math.floor(item.value * 0.18)); }

  return {
    RARITY: RARITY, rarity: rarity, rarityIndex: rarityIndex,
    WEAPONS: WEAPONS, ARMORS: ARMORS, ACCESSORIES: ACCESSORIES,
    PREFIXES: PREFIXES, SUFFIXES: SUFFIXES,
    CONSUMABLES: CONSUMABLES, consumable: consumable, TREASURES: TREASURES,
    SLOTS: SLOTS, basesFor: basesFor, itemStats: itemStats,
    itemName: itemName, itemColor: itemColor,
    sellValue: sellValue, buyValue: buyValue, appraiseCost: appraiseCost
  };
})();

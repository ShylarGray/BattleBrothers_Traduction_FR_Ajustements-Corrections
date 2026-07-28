/* =========================================================================
 * Personnages : création, statistiques effectives, équipement, compétences
 * ====================================================================== */
'use strict';

DC.Hero = (function () {

  var U = DC.U, Cl = DC.Classes;

  // Bénédictions du Temple : bonus permanents appliqués à tous les héros.
  var blessings = {};
  function setBlessings(b) { blessings = b || {}; }

  var NAMES = {
    knight: ['Aldric', 'Roland', 'Gareth', 'Perceval', 'Baudouin'],
    amazon: ['Kaela', 'Thyra', 'Selene', 'Brienne', 'Astrid'],
    dwarf: ['Borin', 'Dvalin', 'Grimnir', 'Thrain', 'Balgur'],
    elf: ['Lirielle', 'Nienna', 'Sylwen', 'Aeliana', 'Faelwen'],
    wizard: ['Aldebrand', 'Morvyn', 'Cassien', 'Elrond', 'Vaelin'],
    sorceress: ['Ysolde', 'Morgane', 'Circé', 'Nyx', 'Lilith']
  };

  function create(classId, name) {
    var cls = Cl.get(classId);
    return {
      uid: U.uid('hero'),
      classId: classId,
      name: name || U.rnd.pick(NAMES[classId] || ['Aventurier']),
      level: 1,
      xp: 0,
      skillPoints: 1,
      skills: {},
      equip: { weapon: null, armor: null, accessory: null },
      created: Date.now(),
      stats: { runs: 0, kills: 0, deaths: 0, bosses: 0, goldEarned: 0 }
    };
  }

  /** Somme des bonus d'équipement. */
  function gearStats(hero) {
    var out = { hp: 0, mp: 0, atk: 0, def: 0, mag: 0, spd: 0, crit: 0, luck: 0 };
    ['weapon', 'armor', 'accessory'].forEach(function (slot) {
      var it = hero.equip[slot];
      if (!it || !it.stats) return;
      Object.keys(it.stats).forEach(function (k) {
        if (out[k] !== undefined) out[k] += it.stats[k];
      });
    });
    return out;
  }

  /** Effets passifs des procs d'équipement (brûlure, gel, vol de vie…). */
  function gearProcs(hero) {
    var procs = {};
    ['weapon', 'armor', 'accessory'].forEach(function (slot) {
      var it = hero.equip[slot];
      if (!it || !it.procs) return;
      it.procs.forEach(function (p) { procs[p] = (procs[p] || 0) + 1; });
    });
    return procs;
  }

  /** Statistiques finales : base + croissance + équipement + compétences. */
  function effectiveStats(hero) {
    var cls = Cl.get(hero.classId);
    var lv = hero.level - 1;
    var g = gearStats(hero);
    var sk = hero.skills || {};

    var hp = cls.base.hp + cls.growth.hp * lv + g.hp;
    var mp = cls.base.mp + cls.growth.mp * lv + g.mp;
    var atk = cls.base.atk + cls.growth.atk * lv + g.atk;
    var def = cls.base.def + cls.growth.def * lv + g.def;
    var mag = cls.base.mag + cls.growth.mag * lv + g.mag;
    var spd = cls.base.spd + g.spd;
    var crit = cls.base.crit + g.crit;
    var luck = cls.base.luck + g.luck + (sk.fortune || 0) * 3;

    hp *= 1 + (sk.vitality || 0) * 0.12 + (blessings.hp || 0) * 0.05;
    atk *= 1 + (sk.strength || 0) * 0.08 + (blessings.atk || 0) * 0.04;
    luck += (blessings.luck || 0) * 3;
    def *= 1 + (sk.ironwill || 0) * 0.06;
    mp += (sk.concentration || 0) * 15 + (sk.w_mana || 0) * 20;
    mag *= 1 + (sk.strength || 0) * 0.04;

    // Les classes magiques frappent surtout avec MAG, les autres surtout avec ATK,
    // mais aucune des deux statistiques n'est jamais morte sur une fiche.
    var magical = (cls.id === 'wizard' || cls.id === 'sorceress');
    var power = magical ? (mag * 0.78 + atk * 0.25) : (atk + mag * 0.20);

    return {
      hp: Math.round(hp), mp: Math.round(mp),
      atk: Math.round(power * 10) / 10, def: Math.round(def * 10) / 10,
      mag: Math.round(mag * 10) / 10, spd: Math.round(spd * 100) / 100,
      crit: Math.round(crit * 1000) / 1000, luck: Math.round(luck),
      magical: magical, procs: gearProcs(hero)
    };
  }

  /** Un héros ne peut porter que le type d'arme de sa classe. */
  function canEquip(hero, item) {
    if (!item || item.kind !== 'equip') return false;
    if (!item.appraised) return false;
    if (item.slot === 'weapon') return item.wtype === Cl.get(hero.classId).weapon;
    return true;
  }

  function equip(hero, item, bag) {
    if (!canEquip(hero, item)) return null;
    var old = hero.equip[item.slot];
    hero.equip[item.slot] = item;
    if (bag) {
      var i = bag.indexOf(item);
      if (i >= 0) bag.splice(i, 1);
      if (old) bag.push(old);
    }
    return old;
  }

  function unequip(hero, slot, bag) {
    var old = hero.equip[slot];
    if (!old) return null;
    hero.equip[slot] = null;
    if (bag) bag.push(old);
    return old;
  }

  /** Score de puissance approximatif, pour trier / comparer. */
  function power(hero) {
    var s = effectiveStats(hero);
    return Math.round(s.hp * 0.4 + s.atk * 12 + s.def * 8 + s.mag * 8 + s.mp * 0.6 + hero.level * 20);
  }

  function skillRank(hero, id) { return (hero.skills && hero.skills[id]) || 0; }

  function skillCostNext(hero, skillDef) {
    var r = skillRank(hero, skillDef.id);
    return skillDef.cost * (1 + Math.floor(r / 2));
  }

  function learn(hero, skillDef) {
    var r = skillRank(hero, skillDef.id);
    if (r >= skillDef.max) return { ok: false, msg: 'Rang maximal atteint.' };
    var cost = skillCostNext(hero, skillDef);
    if (hero.skillPoints < cost) return { ok: false, msg: 'Points de compétence insuffisants (' + cost + ' requis).' };
    hero.skillPoints -= cost;
    hero.skills[skillDef.id] = r + 1;
    return { ok: true, msg: skillDef.name + ' rang ' + (r + 1) + ' appris !' };
  }

  /** Réinitialise l'arbre de compétences et rend les points dépensés. */
  function respec(hero) {
    var spent = 0;
    var defs = Cl.skillsFor(hero.classId);
    defs.forEach(function (d) {
      var r = skillRank(hero, d.id);
      for (var i = 0; i < r; i++) spent += d.cost * (1 + Math.floor(i / 2));
    });
    hero.skills = {};
    hero.skillPoints += spent;
    return spent;
  }

  function xpProgress(hero) {
    var cur = Cl.xpForLevel(hero.level - 1);
    var next = Cl.xpForLevel(hero.level);
    if (hero.level >= Cl.MAX_LEVEL) return { pct: 1, cur: 0, need: 0 };
    return { pct: U.clamp((hero.xp - cur) / Math.max(1, next - cur), 0, 1), cur: hero.xp - cur, need: next - cur };
  }

  return {
    create: create, effectiveStats: effectiveStats, gearStats: gearStats,
    canEquip: canEquip, equip: equip, unequip: unequip, power: power,
    skillRank: skillRank, skillCostNext: skillCostNext, learn: learn, respec: respec,
    xpProgress: xpProgress, NAMES: NAMES,
    setBlessings: setBlessings, get blessings() { return blessings; }
  };
})();

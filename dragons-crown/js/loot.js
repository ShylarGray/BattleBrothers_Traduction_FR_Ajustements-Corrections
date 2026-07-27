/* =========================================================================
 * Génération de butin : objets aléatoires, affixes, tables de drop
 * ====================================================================== */
'use strict';

DC.Loot = (function () {

  var I = DC.Items, U = DC.U;

  /** Sélectionne une base d'objet adaptée au niveau (préférence pour le palier le plus proche). */
  function pickBase(slot, level, rng, wtypeFilter) {
    var pool = I.basesFor(slot).filter(function (b) {
      if (wtypeFilter && b.wtype !== wtypeFilter) return false;
      return b.tier <= level + 4;
    });
    if (!pool.length) {
      pool = I.basesFor(slot).filter(function (b) { return !wtypeFilter || b.wtype === wtypeFilter; });
      if (!pool.length) pool = I.basesFor(slot);
      return pool[0];
    }
    // Pondération : les paliers proches du niveau du joueur sortent bien plus souvent.
    var scored = pool.map(function (b) {
      var gap = Math.abs(level - b.tier);
      return { b: b, weight: 1 / (1 + gap * gap * 0.35) };
    });
    return rng.weighted(scored).b;
  }

  function pickRarity(rng, luck, floorIdx) {
    var mf = 1 + (luck || 0) * 0.02;
    var pool = I.RARITY.map(function (r, idx) {
      var w = r.weight;
      if (idx > 0) w *= Math.pow(mf, idx);       // la chance favorise les hauts paliers
      if (floorIdx && idx < floorIdx) w = 0;     // rareté minimale imposée (coffres, boss)
      return { r: r, weight: w };
    });
    var any = pool.some(function (p) { return p.weight > 0; });
    if (!any) return I.RARITY[floorIdx || 0];
    return rng.weighted(pool).r;
  }

  function addStat(stats, key, val) {
    stats[key] = (stats[key] || 0) + val;
  }

  function roundStat(key, v) {
    if (key === 'crit' || key === 'spd') return Math.round(v * 1000) / 1000;
    return Math.round(v);
  }

  /**
   * Crée un objet d'équipement complet.
   * opts : { slot, level, rng, luck, rarityFloor, wtype, appraised }
   */
  function makeItem(opts) {
    opts = opts || {};
    var rng = opts.rng || U.rnd;
    var level = Math.max(1, opts.level || 1);
    var slot = opts.slot || rng.pick(['weapon', 'weapon', 'armor', 'accessory']);
    var base = pickBase(slot, level, rng, opts.wtype);
    var rar = opts.rarity ? I.rarity(opts.rarity) : pickRarity(rng, opts.luck || 0, opts.rarityFloor || 0);

    // Mise à l'échelle : un objet de bas palier trouvé tard reste un peu utile.
    var lvScale = 1 + Math.max(0, level - base.tier) * 0.035;
    var variance = rng.range(0.92, 1.12);
    var stats = {};
    Object.keys(base.stats).forEach(function (k) {
      var v = base.stats[k] * rar.mult * lvScale * variance;
      addStat(stats, k, v);
    });

    // Affixes
    var affixes = [];
    var nAff = rar.affixes;
    var usedPrefix = {}, usedSuffix = {};
    for (var a = 0; a < nAff; a++) {
      var isPrefix = (a % 2 === 0);
      var table = isPrefix ? I.PREFIXES : I.SUFFIXES;
      var avail = table.filter(function (t) { return !(isPrefix ? usedPrefix : usedSuffix)[t.id]; });
      if (!avail.length) continue;
      var af = rng.weighted(avail);
      (isPrefix ? usedPrefix : usedSuffix)[af.id] = true;
      var amount = (af.flat + af.scale * level) * rng.range(0.85, 1.15);
      addStat(stats, af.stat, amount);
      if (af.penalty) Object.keys(af.penalty).forEach(function (k) { addStat(stats, k, af.penalty[k]); });
      affixes.push({ id: af.id, name: af.name, prefix: isPrefix, stat: af.stat, amount: amount, proc: af.proc || null });
    }

    Object.keys(stats).forEach(function (k) { stats[k] = roundStat(k, stats[k]); });

    // Nom : préfixe + base + suffixe
    var pre = affixes.filter(function (x) { return x.prefix; })[0];
    var suf = affixes.filter(function (x) { return !x.prefix; })[0];
    var name = (pre ? pre.name + ' ' : '') + base.base + (suf ? ' ' + suf.name : '');
    if (affixes.length > 2) {
      var extra = affixes.slice(2).length;
      name += ' ' + DC.U.romanize(extra + 1);
    }

    // Valeur marchande
    var power = 0;
    Object.keys(stats).forEach(function (k) {
      var w = { atk: 3, def: 3, mag: 3, hp: 0.5, mp: 0.7, crit: 600, spd: 700, luck: 4 }[k] || 1;
      power += Math.max(0, stats[k]) * w;
    });
    var value = Math.max(20, Math.floor(power * 2.2 * rar.valMult * 0.35));

    return {
      uid: U.uid('it'),
      kind: 'equip',
      slot: slot,
      wtype: base.wtype,
      base: base.base,
      name: name,
      tier: base.tier,
      level: level,
      rarity: rar.id,
      stats: stats,
      affixes: affixes,
      procs: affixes.filter(function (x) { return x.proc; }).map(function (x) { return x.proc; }),
      value: value,
      appraised: opts.appraised !== undefined ? opts.appraised : false,
      cursed: rng.chance(0.04) && rar.affixes >= 2
    };
  }

  function makeConsumable(id, qty) {
    return { uid: U.uid('cn'), kind: 'consumable', id: id, qty: qty || 1 };
  }

  function makeTreasure(rng, level) {
    var pool = I.TREASURES.filter(function (t, i) { return i <= Math.floor(level / 6) + 1; });
    var t = rng.pick(pool);
    return { uid: U.uid('tr'), kind: 'treasure', id: t.id, name: t.name, icon: t.icon, value: Math.floor(t.value * rng.range(0.8, 1.3)) };
  }

  /**
   * Table de butin d'un ennemi vaincu.
   * enemy : définition ; ctx : { level, rng, luck, bonus }
   * Retourne une liste de « drops » monde : {type:'gold'|'item'|'food', ...}
   */
  function rollEnemyDrops(enemy, ctx) {
    var rng = ctx.rng, out = [];
    var lvl = ctx.level;
    var goldBase = (enemy.gold || 8) * (1 + lvl * 0.22);
    var gold = Math.floor(goldBase * rng.range(0.7, 1.4) * (1 + (ctx.goldBonus || 0)));
    if (gold > 0) out.push({ type: 'gold', amount: gold });

    var dropChance = (enemy.dropRate !== undefined ? enemy.dropRate : 0.14) + (ctx.luck || 0) * 0.004;
    if (enemy.boss) dropChance = 1;
    if (rng.chance(dropChance)) {
      out.push({
        type: 'item',
        item: makeItem({
          level: lvl, rng: rng, luck: ctx.luck,
          rarityFloor: enemy.boss ? 2 : (enemy.elite ? 1 : 0)
        })
      });
    }
    if (enemy.boss) {
      // Un boss lâche systématiquement plusieurs pièces et un trésor.
      var extra = 2 + Math.floor(lvl / 12);
      for (var i = 0; i < extra; i++) {
        out.push({ type: 'item', item: makeItem({ level: lvl, rng: rng, luck: ctx.luck, rarityFloor: 1 }) });
      }
      out.push({ type: 'item', item: makeTreasure(rng, lvl) });
    }
    if (rng.chance(0.10)) out.push({ type: 'item', item: makeConsumable(rng.pick(['potion_s', 'bread', 'ether_s', 'antidote'])) });
    else if (rng.chance(0.05)) out.push({ type: 'item', item: makeTreasure(rng, lvl) });
    return out;
  }

  /** Contenu d'un coffre : plus généreux, rareté minimale garantie. */
  function rollChest(ctx) {
    var rng = ctx.rng, out = [], i;
    var n = 1 + (rng.chance(0.4) ? 1 : 0) + (ctx.big ? 1 : 0);
    for (i = 0; i < n; i++) {
      out.push({ type: 'item', item: makeItem({ level: ctx.level, rng: rng, luck: ctx.luck, rarityFloor: ctx.big ? 2 : 1 }) });
    }
    out.push({ type: 'gold', amount: Math.floor((80 + ctx.level * 40) * rng.range(0.8, 1.5) * (ctx.big ? 2.2 : 1)) });
    if (rng.chance(0.5)) out.push({ type: 'item', item: makeTreasure(rng, ctx.level) });
    if (rng.chance(0.45)) out.push({ type: 'item', item: makeConsumable(rng.pick(['potion_m', 'ether_s', 'bomb', 'roast'])) });
    return out;
  }

  /** Stock quotidien d'une boutique (déterministe selon la graine du jour). */
  function shopStock(seed, level, count, slotFilter) {
    var rng = U.makeRng(seed);
    var list = [];
    for (var i = 0; i < count; i++) {
      list.push(makeItem({
        level: Math.max(1, level + rng.int(-2, 3)),
        rng: rng, luck: 4,
        slot: slotFilter || null,
        rarityFloor: rng.chance(0.25) ? 2 : (rng.chance(0.5) ? 1 : 0),
        appraised: true
      }));
    }
    return list;
  }

  return {
    makeItem: makeItem, makeConsumable: makeConsumable, makeTreasure: makeTreasure,
    rollEnemyDrops: rollEnemyDrops, rollChest: rollChest, shopStock: shopStock,
    pickRarity: pickRarity
  };
})();

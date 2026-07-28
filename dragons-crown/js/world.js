/* =========================================================================
 * Monde : salles, vagues, résolution des coups, butin au sol, interactions
 * ====================================================================== */
'use strict';

DC.World = (function () {

  var U = DC.U, Ent = DC.Ent;
  var VIEW_W = 960, VIEW_H = 540;

  function World(game) {
    this.game = game;
    this.settings = game.profile.settings;
    this.audio = DC.Audio;
    this.fx = new DC.Fx.Fx(this);
    this.players = [];
    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.props = [];          // coffres, tonneaux, portes
    this.fields = [];         // zones persistantes (gravité, pluie de flèches)
    this.toasts = [];
    this.camX = 0;
    this.bounds = { min: 0, max: VIEW_W };
    this.combatActive = false;
    this.run = null;
    this.roomIdx = 0;
    this.room = null;
    this.waveIdx = 0;
    this.waveTriggers = [];
    this.exitOpen = false;
    this.time = 0;
    this.state = 'playing';   // 'playing' | 'cleared' | 'failed' | 'transition'
    this.transT = 0;
    this.rng = U.makeRng(Date.now() & 0xffffffff);
    this.hitCombo = { count: 0, t: 0 };
  }

  /* ==================== Mise en place d'une expédition ================== */
  World.prototype.startRun = function (run) {
    this.run = run;
    this.rng = U.makeRng(run.seed);
    this.roomIdx = 0;
    this.players = [];
    var self = this;
    run.party.forEach(function (entry, i) {
      if (!entry) return;
      var p = new Ent.Player(self, entry.hero, self.players.length);
      p.ai = entry.mode === 'ai';
      p.controller = entry.controller !== undefined ? entry.controller : i;
      self.players.push(p);
    });
    this.loadRoom(0);
    this.audio.playMusic(DC.Stages.byId(run.stageId).music);
  };

  World.prototype.stage = function () { return DC.Stages.byId(this.run.stageId); };
  World.prototype.rooms = function () {
    var st = this.stage();
    return (this.run.route === 'b' && st.altRooms) ? st.altRooms : st.rooms;
  };

  World.prototype.loadRoom = function (idx) {
    var rooms = this.rooms();
    this.roomIdx = idx;
    this.room = rooms[idx];
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.drops.length = 0;
    this.props.length = 0;
    this.fields.length = 0;
    this.fx.clear();
    this.waveIdx = 0;
    this.exitOpen = false;
    this.combatActive = false;
    this.state = 'playing';
    this.roomWidth = this.room.width;
    this.camX = 0;
    this.bounds = { min: 0, max: this.roomWidth };

    // Positionne les joueurs à l'entrée.
    var self = this;
    this.players.forEach(function (p, i) {
      p.x = 80 + i * 36; p.z = 60 + i * 14; p.y = 0;
      p.vx = p.vy = p.vz = 0;
      p.facing = 1;
      p.state = 'idle';
      p.act = null;
      if (p.isDowned) p.revive(0.35);
      p.invuln = 60;
      // Répit entre deux salles : un peu de PM et le carquois regarni.
      p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.35);
      if (p.maxArrows) p.arrows = Math.max(p.arrows, Math.round(p.maxArrows * 0.6));
      p.superCd = 0;
    });

    // Déclencheurs de vagues répartis sur la largeur de la salle.
    this.waveTriggers = [];
    if (this.room.type === 'boss') {
      this.waveTriggers.push({ x: this.roomWidth - VIEW_W * 0.6, done: false, boss: true });
    } else {
      var n = this.room.waves || 1;
      for (var w = 0; w < n; w++) {
        var t = (w + 1) / (n + 1);
        this.waveTriggers.push({ x: 200 + (this.roomWidth - VIEW_W - 260) * t, done: false });
      }
    }

    // Décor : coffres, tonneaux et sortie
    var chests = this.room.chests || 0;
    for (var c = 0; c < chests; c++) {
      this.props.push({
        type: 'chest', x: 260 + this.rng.range(0, Math.max(200, this.roomWidth - 620)),
        z: this.rng.range(20, 130), opened: false, big: this.rng.chance(0.3), anim: 0
      });
    }
    var barrels = 2 + this.rng.int(0, 4);
    for (var b = 0; b < barrels; b++) {
      this.props.push({
        type: 'barrel', x: 200 + this.rng.range(0, Math.max(200, this.roomWidth - 500)),
        z: this.rng.range(10, 140), hp: 1, anim: 0
      });
    }
    this.props.push({ type: 'exit', x: this.roomWidth - 70, z: 75, anim: 0 });

    var isLast = idx >= rooms.length - 1;
    this.toast(isLast ? 'Salle finale — préparez-vous' : 'Salle ' + (idx + 1) + ' / ' + rooms.length);
    if (this.room.type === 'boss') this.audio.playMusic('boss');
  };

  /* ========================== Vagues d'ennemis ========================== */
  World.prototype.spawnWave = function (trigger) {
    var room = this.room;
    var lvl = this.run.level;
    var diff = DC.Stages.difficulty(this.run.difficulty);
    var count = this.players.length;

    if (trigger.boss) {
      var boss = new Ent.Enemy(this, room.boss, lvl + 2, {
        diffMult: diff.mult, players: count,
        x: this.camX + VIEW_W - 180, z: 78, facing: -1
      });
      this.enemies.push(boss);
      this.bossRef = boss;
      this.fx.superFlash(boss.name, 'BOSS');
      this.audio.play('roar', 0.8);
      this.audio.playMusic('boss');
    } else {
      var pool = room.pool;
      var per = Math.max(2, Math.round((room.per || 4) * (0.7 + count * 0.22)));
      for (var i = 0; i < per; i++) {
        var id = this.rng.pick(pool);
        var fromRight = this.rng.chance(0.72);
        var e = new Ent.Enemy(this, id, lvl, {
          diffMult: diff.mult, players: count,
          elite: room.elite && this.rng.chance(0.35),
          x: fromRight ? this.camX + VIEW_W + 40 + i * 34 : this.camX - 40 - i * 34,
          z: this.rng.range(10, 140),
          facing: fromRight ? -1 : 1
        });
        this.enemies.push(e);
      }
    }
    // Verrouillage de la caméra pendant l'affrontement.
    this.combatActive = true;
    this.bounds = { min: this.camX + 10, max: this.camX + VIEW_W - 10 };
  };

  World.prototype.aliveEnemies = function () {
    var n = 0;
    for (var i = 0; i < this.enemies.length; i++) if (!this.enemies[i].dead && !this.enemies[i].isMinion) n++;
    return n;
  };

  /* ====================== Résolution des impacts ======================== */
  World.prototype.actorsHostileTo = function (team) {
    if (team === 'player') return this.enemies.filter(function (e) { return !e.isMinion; });
    return this.players.concat(this.enemies.filter(function (e) { return e.isMinion; }));
  };

  World.prototype.nearestHostile = function (actor, range) {
    var list = this.actorsHostileTo(actor.team), best = null, bd = range * range;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.dead || t.isDowned) continue;
      var d = U.dist2(actor.x, actor.z, t.x, t.z);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };

  var ELEM_LABEL = { fire: 'burn', ice: 'freeze', poison: 'poison', dark: 'curse', holy: null, wind: null, arcane: null, phys: null };

  World.prototype.resolveHit = function (attacker, target, desc, opts) {
    if (!target || target.dead) return;
    opts = opts || {};
    var isPlayerAttack = attacker && attacker.team === 'player';
    var power = attacker ? (attacker.effAtk ? attacker.effAtk() : attacker.atk) : 10;
    var dmg = power * (desc.dmg || 1);

    // Atténuation par la défense : courbe douce, jamais d'immunité totale.
    var def = target.effDef ? target.effDef() : (target.defStat || 0);
    if (isPlayerAttack && attacker.stats && attacker.stats.magical) def *= 0.55; // les sorts percent les armures
    var mitigation = def / (def + 70 + this.run.level * 4);
    dmg *= (1 - U.clamp(mitigation, 0, 0.82));

    // Coup critique
    var critChance = (attacker && attacker.stats ? attacker.stats.crit : 0.03);
    var crit = Math.random() < critChance;
    if (crit) dmg *= 1.9;

    // Variance et bonus de fragilité (gel)
    dmg *= U.rnd.range(0.94, 1.06);
    if (target.status.freeze) dmg *= 1.2 + (attacker && attacker.hero ? (attacker.hero.skills.s_ice || 0) * 0.07 : 0);
    if (target.status.curse) dmg *= 1.15;
    if (isPlayerAttack && attacker.hero && attacker.hero.skills.a_execute && target.hp / target.maxHp < 0.3) {
      dmg *= 1 + attacker.hero.skills.a_execute * 0.25;
    }
    dmg = Math.max(1, Math.round(dmg));

    var dealt = target.takeDamage(dmg, { crit: crit, element: desc.element });
    target.react(desc, attacker, dealt);
    target.lastHitBy = attacker;

    // Retour sensoriel
    var stop = (desc.hitstop || 3) + (crit ? 4 : 0);
    if (attacker) attacker.hitstop = Math.max(attacker.hitstop, Math.floor(stop * 0.7));
    target.hitstop = Math.max(target.hitstop, stop);
    this.fx.blood(target.x, target.z, target.centerY(), target.def && target.def.body === 'skeleton' ? '#e0dcc8' : '#c0303a', crit ? 14 : 8);
    this.fx.addShake(crit ? 6 : 2.5);
    this.audio.play(crit ? 'crit' : 'hit', 0.55);

    // Altérations liées à l'élément et aux affixes
    var elemStatus = ELEM_LABEL[desc.element || 'phys'];
    if (elemStatus) target.applyStatus(elemStatus, 180, 1);
    if (desc.freeze) target.applyStatus('freeze', desc.freeze, 1);
    if (desc.petrify) target.applyStatus('petrify', desc.petrify, 1);
    if (desc.stun) target.applyStatus('stun', desc.stun, 1);

    if (isPlayerAttack && attacker.stats && attacker.stats.procs) {
      var pr = attacker.stats.procs;
      if (pr.burn && Math.random() < 0.25) target.applyStatus('burn', 180, pr.burn);
      if (pr.freeze && Math.random() < 0.20) target.applyStatus('freeze', 60 * pr.freeze, 1);
      if (pr.shock && Math.random() < 0.18) { target.applyStatus('stun', 45, 1); this.fx.spark(target.x, target.z, target.centerY(), '#ffe84a', 10); }
      if (pr.lifesteal) attacker.heal(Math.max(1, Math.round(dealt * 0.06 * pr.lifesteal)));
      if (pr.regen && !attacker.status.regen && Math.random() < 0.10) attacker.applyStatus('regen', 150, pr.regen);
    }
    if (isPlayerAttack && attacker.hero && attacker.hero.skills.e_elem && Math.random() < 0.3) {
      target.applyStatus(Math.random() < 0.5 ? 'burn' : 'freeze', 120, 1);
    }

    // Compteur de combo d'équipe
    if (isPlayerAttack) {
      this.hitCombo.count++;
      this.hitCombo.t = 110;
      if (this.hitCombo.count > (this.run.bestCombo || 0)) this.run.bestCombo = this.hitCombo.count;
    }
  };

  /* ======================= Techniques particulières ==================== */
  World.prototype.grabThrow = function (player, target, desc) {
    player.state = 'attack';
    player.act = { d: desc, t: 0, hits: {}, touched: 99, total: desc.startup + desc.active + desc.recover, opts: {} };
    var dir = player.facing;
    var self = this;
    target.vx = dir * 11; target.vy = 8; target.state = 'down'; target.stateT = 0; target.downT = undefined;
    this.resolveHit(player, target, desc, {});
    this.fx.dust(target.x, target.z, 10);
    // Projection écrasante : les ennemis proches subissent la collision.
    if (player.hero.skills.d_throw) {
      this.enemies.forEach(function (e) {
        if (e === target || e.dead) return;
        if (U.dist(e.x, e.z, target.x, target.z) < 70) self.resolveHit(player, e, Object.assign({}, desc, { dmg: desc.dmg * 0.5 }), {});
      });
    }
  };

  World.prototype.summonAllies = function (player, desc) {
    var n = desc.summon || 2;
    for (var i = 0; i < n; i++) {
      var m = new Ent.Minion(this, 'skeleton', this.run.level, player);
      m.x = player.x + (i - n / 2) * 30;
      this.enemies.push(m);
      this.fx.ring(m.x, m.z, 0, '#7affc8', 60);
    }
    this.toast(player.name + ' lève une légion d\'os !');
  };

  World.prototype.summonEnemies = function (boss, desc) {
    var n = desc.count || 2, diff = DC.Stages.difficulty(this.run.difficulty);
    for (var i = 0; i < n; i++) {
      var e = new Ent.Enemy(this, desc.summon, this.run.level, {
        diffMult: diff.mult, players: this.players.length,
        x: boss.x + U.rnd.range(-140, 140), z: U.rnd.range(20, 130)
      });
      this.enemies.push(e);
      this.fx.ring(e.x, e.z, 0, '#a06ad0', 60);
    }
  };

  World.prototype.healAround = function (caster, desc) {
    var r = desc.radius || 120, self = this;
    this.enemies.forEach(function (e) {
      if (e.dead || e.isMinion) return;
      if (U.dist(e.x, e.z, caster.x, caster.z) < r) {
        e.heal(Math.round(e.maxHp * 0.15));
        self.fx.ring(e.x, e.z, 0, '#6fd66f', 40);
      }
    });
  };

  World.prototype.spawnGravityField = function (caster, desc) {
    this.fields.push({
      type: 'gravity', x: caster.x + caster.facing * 90, z: caster.z, y: 0,
      r: desc.reach || 120, life: desc.active, maxLife: desc.active,
      owner: caster, team: caster.team, d: desc, tick: 0
    });
  };

  World.prototype.spawnArrowRain = function (caster, desc) {
    this.fields.push({
      type: 'rain', x: caster.x + caster.facing * 130, z: caster.z,
      r: desc.reach || 180, w: desc.width || 100, life: desc.active, maxLife: desc.active,
      owner: caster, team: caster.team, d: desc, tick: 0
    });
  };

  World.prototype.updateFields = function () {
    var self = this;
    for (var i = this.fields.length - 1; i >= 0; i--) {
      var f = this.fields[i];
      f.life--; f.tick++;
      var targets = this.actorsHostileTo(f.team);
      if (f.type === 'gravity') {
        targets.forEach(function (t) {
          if (t.dead) return;
          var d = U.dist(t.x, t.z, f.x, f.z);
          if (d > f.r) return;
          t.vx += U.sign(f.x - t.x) * 0.32;
          t.vz += U.sign(f.z - t.z) * 0.22;
          if (f.tick % 18 === 0) self.resolveHit(f.owner, t, f.d, {});
        });
        if (f.tick % 3 === 0) this.fx.part({
          x: f.x + U.rnd.range(-f.r, f.r), z: f.z, y: U.rnd.range(0, 70),
          vx: 0, vy: 0, vz: 0, life: 16, maxLife: 16, color: '#c88aff', size: 3, grav: 0
        });
      } else if (f.type === 'rain') {
        if (f.tick % 6 === 0) {
          var px = f.x + U.rnd.range(-f.r * 0.5, f.r * 0.5);
          var pz = f.z + U.rnd.range(-f.w * 0.5, f.w * 0.5);
          this.projectiles.push(new Ent.Projectile(this, {
            x: px, z: U.clamp(pz, 0, 150), y: 220, vx: 0, vy: -9, team: f.team,
            owner: f.owner, dmg: f.d, element: f.d.element, sprite: 'arrow', life: 40, gravity: 0.1
          }));
        }
      }
      if (f.life <= 0) this.fields.splice(i, 1);
    }
  };

  /* ============================ Butin au sol =========================== */
  World.prototype.dropItem = function (x, z, y, drop) {
    this.drops.push({
      x: x, z: U.clamp(z, 4, 146), y: y || 30,
      vx: U.rnd.range(-1.6, 1.6), vy: U.rnd.range(1.5, 3.5), vz: U.rnd.range(-0.6, 0.6),
      drop: drop, life: 3600, anim: U.rnd.range(0, 6), picked: false, delay: 20
    });
  };

  World.prototype.onEnemyDeath = function (enemy) {
    var killer = enemy.lastHitBy && enemy.lastHitBy.team === 'player' ? enemy.lastHitBy : this.players[0];
    var luckTotal = 0;
    this.players.forEach(function (p) { luckTotal += (p.stats ? p.stats.luck : 0); });
    var diff = DC.Stages.difficulty(this.run.difficulty);
    var ctx = {
      level: this.run.level, rng: this.rng,
      luck: luckTotal / Math.max(1, this.players.length) + diff.lootBonus,
      goldBonus: diff.goldBonus + (killer && killer.hero ? (killer.hero.skills.fortune || 0) * 0.1 + (killer.hero.skills.d_greed || 0) * 0.15 : 0)
    };
    var drops = DC.Loot.rollEnemyDrops(enemy.def, ctx);
    var self = this;
    drops.forEach(function (d) { self.dropItem(enemy.x + U.rnd.range(-18, 18), enemy.z, enemy.centerY() * 0.6, d); });

    // Expérience partagée entre les membres debout, bonus au tueur.
    var xp = Math.round(enemy.xpValue * (1 + diff.xpBonus));
    var alive = this.players.filter(function (p) { return !p.isDowned; });
    var share = Math.max(1, Math.round(xp / Math.max(1, alive.length)));
    this.players.forEach(function (p) { p.gainXp(p.isDowned ? Math.round(share * 0.5) : share); });
    if (killer && killer.kills !== undefined) { killer.kills++; killer.hero.stats.kills++; }
    this.run.kills++;

    // Récupération de flèches pour l'elfe
    this.players.forEach(function (p) {
      if (p.cls.weapon === 'bow') p.arrows = Math.min(p.maxArrows, p.arrows + 1 + (p.hero.skills.e_quiver || 0));
    });

    if (enemy.boss) {
      this.toast(enemy.name + ' est vaincu !');
      this.fx.superFlash('VICTOIRE', enemy.name + ' terrassé');
    }
  };

  World.prototype.updateDrops = function () {
    var self = this;
    for (var i = this.drops.length - 1; i >= 0; i--) {
      var d = this.drops[i];
      d.anim += 0.08;
      if (d.delay > 0) d.delay--;
      d.x += d.vx; d.z += d.vz; d.y += d.vy;
      d.vy -= 0.4;
      if (d.y <= 0) { d.y = 0; d.vy = Math.abs(d.vy) > 1.2 ? -d.vy * 0.4 : 0; d.vx *= 0.7; d.vz *= 0.7; }
      d.life--;
      if (d.life <= 0) { this.drops.splice(i, 1); continue; }
      if (d.delay > 0) continue;

      for (var p = 0; p < this.players.length; p++) {
        var pl = this.players[p];
        if (pl.isDowned || pl.dead) continue;
        if (U.dist(pl.x, pl.z, d.x, d.z) < 34 && Math.abs(pl.y - d.y) < 60) {
          this.pickup(pl, d.drop);
          this.drops.splice(i, 1);
          break;
        }
      }
    }
  };

  World.prototype.pickup = function (player, drop) {
    if (drop.type === 'gold') {
      this.run.gold += drop.amount;
      player.stageGold += drop.amount;
      this.audio.play('coin', 0.4);
      this.fx.text(player.x, player.z, player.centerY() + 16, '+' + drop.amount + ' or', '#ffd24a', 12);
      return;
    }
    var it = drop.item;
    if (it.kind === 'consumable') {
      var pouch = this.run.pouch;
      var existing = pouch.filter(function (x) { return x.id === it.id; })[0];
      var cap = 6 + (player.hero.skills.satchel || 0) * 2;
      if (existing) existing.qty += it.qty || 1;
      else if (pouch.length < cap) pouch.push({ kind: 'consumable', id: it.id, qty: it.qty || 1 });
      else { this.run.bag.push(it); }
      this.audio.play('item', 0.5);
      this.fx.text(player.x, player.z, player.centerY() + 16, DC.Items.itemName(it), '#8ade5a', 11);
      return;
    }
    this.run.bag.push(it);
    this.audio.play('item', 0.55);
    var col = DC.Items.itemColor(it);
    this.fx.text(player.x, player.z, player.centerY() + 16, DC.Items.itemName(it), col, 11);
    if (it.kind === 'equip' && DC.Items.rarityIndex(it.rarity) >= 3) this.fx.ring(player.x, player.z, 0, col, 70);
  };

  World.prototype.consume = function (player, stack) {
    var c = DC.Items.consumable(stack.id);
    if (!c) return false;
    var e = c.effect, self = this;
    if (e.hp) player.heal(e.hp);
    if (e.hpPct) player.heal(Math.round(player.maxHp * e.hpPct));
    if (e.mp) player.mp = Math.min(player.maxMp, player.mp + e.mp);
    if (e.mpPct) player.mp = player.maxMp;
    if (e.cure) player.status = {};
    if (e.buff) player.buffs[e.buff] = { pct: e.pct, t: e.dur };
    if (e.revive) {
      var down = this.players.filter(function (p) { return p.isDowned; })[0];
      if (!down) { this.toast('Personne à relever'); return false; }
      down.revive(0.7);
    }
    if (e.bomb) {
      var d = { dmg: 1, knock: 10, launch: 3, hitstop: 8, element: 'fire' };
      this.fx.explosion(player.x + player.facing * 40, player.z, 20, 70, 'fire');
      this.audio.play('boom', 0.7);
      this.enemies.forEach(function (en) {
        if (en.dead || en.isMinion) return;
        if (U.dist(en.x, en.z, player.x + player.facing * 40, player.z) < 90) {
          en.takeDamage(e.bomb, { element: 'fire' });
          en.react(d, player, e.bomb);
        }
      });
    }
    this.audio.play('item', 0.6);
    this.fx.ring(player.x, player.z, 0, c.color, 50);
    return true;
  };

  /* ========================== Interactions ============================= */
  World.prototype.interact = function (player) {
    for (var i = 0; i < this.props.length; i++) {
      var pr = this.props[i];
      if (U.dist(player.x, player.z, pr.x, pr.z) > 46) continue;
      if (pr.type === 'chest' && !pr.opened) {
        pr.opened = true; pr.anim = 1;
        var luckTotal = 0, self = this;
        this.players.forEach(function (p) { luckTotal += p.stats.luck; });
        var diff = DC.Stages.difficulty(this.run.difficulty);
        var loot = DC.Loot.rollChest({
          level: this.run.level, rng: this.rng, big: pr.big,
          luck: luckTotal / this.players.length + diff.lootBonus
        });
        loot.forEach(function (d) { self.dropItem(pr.x + U.rnd.range(-16, 16), pr.z, 34, d); });
        this.audio.play('chest', 0.7);
        this.fx.ring(pr.x, pr.z, 0, '#ffd24a', 80);
        return true;
      }
      if (pr.type === 'exit' && this.exitOpen) { this.advanceRoom(); return true; }
    }
    return false;
  };

  /**
   * Point de contrôle : ce qui a franchi une porte est acquis. Butin, or et
   * besace sont versés au profil et écrits sur disque, si bien que fermer
   * l'onglet en plein donjon ne coûte plus que la salle en cours.
   * L'XP, les niveaux et les points de compétence suivent automatiquement :
   * run.party[i].hero référence l'objet héros du profil.
   */
  World.prototype.bankProgress = function () {
    var p = this.game.profile, r = this.run;
    r.bankedBag = r.bankedBag || [];
    r.bag.splice(0).forEach(function (it) { p.storage.push(it); r.bankedBag.push(it); });
    r.banked = (r.banked || 0) + r.gold;
    p.gold += r.gold;
    r.gold = 0;
    // La besace doit refléter la consommation réelle : sinon une sauvegarde en
    // cours d'expédition rendrait les potions déjà bues.
    p.pouch = r.pouch
      .map(function (s) { return { kind: 'consumable', id: s.id, qty: s.qty }; })
      .filter(function (s) { return s.qty > 0; });
    this.game.saveProfile();
  };

  World.prototype.advanceRoom = function () {
    // La sortie peut être franchie et actionnée dans la même image : sans ce
    // garde-fou, la fin d'expédition serait comptabilisée deux fois.
    if (this.state !== 'playing') return;
    var rooms = this.rooms();
    this.audio.play('door', 0.6);
    this.bankProgress();
    if (this.roomIdx + 1 >= rooms.length) { this.finishRun(true); return; }
    this.state = 'transition';
    this.transT = 0;
    this.nextRoom = this.roomIdx + 1;
  };

  World.prototype.finishRun = function (victory, reason) {
    if (this.state === 'cleared' || this.state === 'failed') return;
    this.state = victory ? 'cleared' : 'failed';
    this.transT = 0;
    this.audio.stopMusic();
    this.game.onRunEnd(victory, reason);
  };

  /* ============================ Boucle ================================= */
  World.prototype.update = function () {
    this.time++;
    var i;

    if (this.state === 'transition') {
      this.transT++;
      if (this.transT === 30) this.loadRoom(this.nextRoom);
      if (this.transT > 60) this.state = 'playing';
      this.fx.update();
      return;
    }
    if (this.state === 'cleared' || this.state === 'failed') { this.fx.update(); return; }

    // Toasts
    for (i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].life--;
      if (this.toasts[i].life <= 0) this.toasts.splice(i, 1);
    }
    if (this.hitCombo.t > 0) { this.hitCombo.t--; if (this.hitCombo.t === 0) this.hitCombo.count = 0; }

    // Acteurs
    for (i = 0; i < this.players.length; i++) this.players[i].update();
    for (i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      e.update();
      if (e.dead && e.deathT > 60) this.enemies.splice(i, 1);
    }
    // Séparation : évite que tout le monde se superpose au même point.
    this.separate();

    for (i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update();
      if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
    }
    this.updateFields();
    this.updateDrops();
    this.updateProps();
    this.fx.update();
    this.updateCamera();
    this.checkWaves();
    this.checkDefeat();
  };

  World.prototype.separate = function () {
    var all = this.players.concat(this.enemies);
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      if (a.dead || a.isDowned) continue;
      for (var j = i + 1; j < all.length; j++) {
        var b = all[j];
        if (b.dead || b.isDowned) continue;
        if (Math.abs(a.y - b.y) > 40) continue;
        var dx = b.x - a.x, dz = (b.z - a.z) * 1.8;
        var minD = (a.size.w * a.scale + b.size.w * b.scale) * 0.42;
        var d = Math.hypot(dx, dz);
        if (d < minD && d > 0.001) {
          var push = (minD - d) / minD * 0.5;
          var nx = dx / d, nz = dz / d;
          var aw = a.boss ? 0.1 : 1, bw = b.boss ? 0.1 : 1;
          a.x -= nx * push * aw; a.z -= nz * push * 0.45 * aw;
          b.x += nx * push * bw; b.z += nz * push * 0.45 * bw;
        }
      }
    }
  };

  World.prototype.updateProps = function () {
    for (var i = this.props.length - 1; i >= 0; i--) {
      var pr = this.props[i];
      pr.anim += 0.05;
      if (pr.type === 'barrel') {
        // Un tonneau se brise si un joueur frappe à proximité.
        for (var p = 0; p < this.players.length; p++) {
          var pl = this.players[p];
          if (pl.state !== 'attack' || !pl.act || pl.act.t < pl.act.d.startup) continue;
          if (U.dist(pl.x, pl.z, pr.x, pr.z) < 50 && Math.abs(pl.y) < 40) {
            this.breakBarrel(pr);
            this.props.splice(i, 1);
            break;
          }
        }
      }
    }
  };

  World.prototype.breakBarrel = function (pr) {
    this.audio.play('boom', 0.3);
    this.fx.dust(pr.x, pr.z, 10);
    this.fx.spark(pr.x, pr.z, 20, '#a8804a', 10);
    if (this.rng.chance(0.55)) {
      var roll = this.rng();
      if (roll < 0.5) this.dropItem(pr.x, pr.z, 20, { type: 'gold', amount: Math.floor((20 + this.run.level * 8) * this.rng.range(0.7, 1.5)) });
      else if (roll < 0.85) this.dropItem(pr.x, pr.z, 20, { type: 'item', item: DC.Loot.makeConsumable(this.rng.pick(['bread', 'potion_s', 'ether_s'])) });
      else this.dropItem(pr.x, pr.z, 20, { type: 'item', item: DC.Loot.makeItem({ level: this.run.level, rng: this.rng, luck: 4 }) });
    }
  };

  World.prototype.updateCamera = function () {
    var alive = this.players.filter(function (p) { return !p.isDowned; });
    var list = alive.length ? alive : this.players;
    var sum = 0;
    list.forEach(function (p) { sum += p.x; });
    var avg = sum / Math.max(1, list.length);
    var target = U.clamp(avg - VIEW_W * 0.42, 0, Math.max(0, this.roomWidth - VIEW_W));
    // Pendant un affrontement la caméra reste figée : l'arène est fermée.
    if (this.combatActive) return;
    this.camX = U.lerp(this.camX, target, 0.09);
    this.bounds = { min: this.camX + 8, max: this.roomWidth - 8 };
  };

  World.prototype.checkWaves = function () {
    var i;
    if (this.combatActive) {
      if (this.aliveEnemies() === 0) {
        this.combatActive = false;
        var remaining = this.waveTriggers.filter(function (t) { return !t.done; }).length;
        if (remaining === 0) {
          this.exitOpen = true;
          if (this.room.type === 'boss') {
            this.toast('Donjon terminé ! Rejoignez la sortie →');
          } else {
            this.toast('Salle libérée ! Sortie ouverte →');
            this.audio.playMusic(this.stage().music);
          }
        } else {
          this.toast('Vague repoussée — avancez →');
        }
      }
      return;
    }
    var lead = 0;
    this.players.forEach(function (p) { if (p.x > lead) lead = p.x; });
    for (i = 0; i < this.waveTriggers.length; i++) {
      var t = this.waveTriggers[i];
      if (t.done) continue;
      if (lead >= t.x) {
        t.done = true;
        this.spawnWave(t);
        break;
      }
    }
    // Sortie franchie automatiquement en marchant au bout de la salle.
    if (this.exitOpen) {
      for (i = 0; i < this.players.length; i++) {
        if (this.players[i].x > this.roomWidth - 46 && !this.players[i].isDowned) { this.advanceRoom(); break; }
      }
    }
  };

  World.prototype.checkDefeat = function () {
    var anyUp = this.players.some(function (p) { return !p.isDowned; });
    if (anyUp) return;
    var canRevive = this.players.some(function (p) { return p.lives > 0; });
    if (canRevive) return;
    // Sursis avant la coupure : le joueur voit ce qui vient de le tuer et peut
    // encore boire une fiole de résurrection. Sans cela, la défaite en solo
    // tombe dans la même image que la seconde chute et se lit comme un plantage.
    var waited = this.players.every(function (p) { return p.downedT > 90; });
    if (waited) this.finishRun(false, 'defeat');
  };

  World.prototype.toast = function (msg) {
    this.toasts.push({ text: msg, life: 150, maxLife: 150 });
    if (this.toasts.length > 4) this.toasts.shift();
  };

  World.VIEW_W = VIEW_W;
  World.VIEW_H = VIEW_H;
  return World;
})();

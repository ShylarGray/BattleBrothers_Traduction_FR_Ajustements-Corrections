/* =========================================================================
 * Entités : acteurs, joueurs, ennemis, compagnons, projectiles
 * Le monde est en 2,5D : x = axe de défilement, z = profondeur du sol,
 * y = hauteur au-dessus du sol (0 = au sol).
 * ====================================================================== */
'use strict';

DC.Ent = (function () {

  var U = DC.U;
  var GRAVITY = 0.55;
  var FLOOR_MIN = 0, FLOOR_MAX = 150;
  // Facteur de gabarit global : agrandit silhouettes, boîtes de collision et
  // portées d'un même coefficient, pour garder le jeu lisible à 960×540.
  var SCALE = 1.3;

  /* ====================================================================
   *  ACTEUR — base commune joueurs / ennemis
   * ================================================================= */
  function Actor(world, cfg) {
    cfg = cfg || {};
    this.world = world;
    this.id = U.uid('a');
    this.team = cfg.team || 'enemy';
    this.x = cfg.x || 0; this.z = cfg.z || 75; this.y = 0;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.facing = cfg.facing || 1;
    this.scale = cfg.scale || 1;
    var sz = cfg.size || { w: 28, d: 20, h: 56 };
    this.size = { w: sz.w * SCALE, d: sz.d * SCALE, h: sz.h * SCALE };
    this.maxHp = cfg.maxHp || 100;
    this.hp = this.maxHp;
    this.atk = cfg.atk || 10;
    this.defStat = cfg.defStat || 0;
    this.speed = cfg.speed || 1;
    // Endurance : une cible est déséquilibrée quand elle a encaissé
    // `poiseFrac` de ses PV max depuis sa dernière rupture. Exprimé en
    // fraction, le nombre de coups nécessaires reste constant à tout niveau
    // et à toute difficulté, sans aucune valeur à recalibrer.
    this.poiseFrac = cfg.poiseFrac || 0.25;
    this.poiseDmg = 0;
    this.poiseCalm = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.act = null;            // attaque en cours
    this.hitstop = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.dead = false;
    this.deathT = 0;
    this.flash = 0;
    this.anim = 0;
    this.status = {};           // burn, poison, freeze, shock, petrify, curse
    this.buffs = {};
    this.shadowScale = 1;
    this.flying = cfg.flying || false;
    this.hoverY = cfg.hoverY || 0;
    this.attackCd = 0;
    this.aiT = U.rnd.int(0, 40);
    this.name = cfg.name || '';
    this.lastHitBy = null;
    this.hitSet = {};
  }

  Actor.prototype.box = function () {
    var s = this.scale;
    return { x: this.x, z: this.z, y: this.y, w: this.size.w * s, d: this.size.d * s, h: this.size.h * s };
  };
  Actor.prototype.centerY = function () { return this.y + this.size.h * this.scale * 0.5; };
  Actor.prototype.isBusy = function () {
    return this.state === 'attack' || this.state === 'hurt' || this.state === 'down' ||
      this.state === 'getup' || this.state === 'cast' || this.state === 'dodge';
  };
  Actor.prototype.canAct = function () {
    return !this.dead && !this.isBusy() && !this.status.freeze && !this.status.petrify;
  };

  /* ------------------------------ Attaques ----------------------------- */
  Actor.prototype.startAttack = function (desc, opts) {
    this.act = {
      d: desc, t: 0, hits: {}, touched: 0,
      total: desc.startup + desc.active + desc.recover,
      opts: opts || {}
    };
    this.state = 'attack'; this.stateT = 0;
    if (desc.move) this.vx += this.facing * desc.move * 0.35;
    if (desc.kind === 'summon' || desc.kind === 'summonEnemy') this.state = 'cast';
  };

  Actor.prototype.attackHitbox = function () {
    var d = this.act.d, s = this.scale * SCALE;
    var reach = (d.reach || 40) * s;
    if (d.kind === 'quake' || d.kind === 'rage') {
      return { x: this.x, z: this.z, y: this.y, w: reach * 2, d: (d.width || 40) * 2 * s, h: (d.height || 70) * s };
    }
    return {
      x: this.x + this.facing * (reach * 0.5 + 6),
      z: this.z,
      y: this.y + (d.yoff || 0),
      w: reach, d: (d.width || 22) * 2 * s, h: (d.height || 60) * s
    };
  };

  /** Fait progresser l'attaque en cours ; renvoie true si l'action est terminée. */
  Actor.prototype.updateAttack = function () {
    var a = this.act; if (!a) return true;
    var d = a.d;
    a.t++;
    var activeStart = d.startup, activeEnd = d.startup + d.active;

    // Génération de projectiles / effets au premier frame actif
    if (a.t === activeStart + 1) {
      if (d.kind === 'shot') this.fireProjectiles(d);
      else if (d.kind === 'summon') this.world.summonAllies(this, d);
      else if (d.kind === 'summonEnemy') this.world.summonEnemies(this, d);
      else if (d.kind === 'heal') this.world.healAround(this, d);
      else if (d.kind === 'gravity') this.world.spawnGravityField(this, d);
      else if (d.kind === 'rain') this.world.spawnArrowRain(this, d);
      else if (d.kind === 'quake') this.world.fx.shock(this.x, this.z, (d.reach || 100) * this.scale, this.team);
      this.world.audio.play(d.kind === 'shot' ? 'shoot' : 'swing', 0.5);
    }

    // Fenêtre active : résolution des impacts
    if (a.t > activeStart && a.t <= activeEnd && d.kind !== 'shot' && d.kind !== 'summon' &&
      d.kind !== 'summonEnemy' && d.kind !== 'heal' && d.kind !== 'rain') {
      // `hits` compte les impacts sur UNE MÊME cible pendant la fenêtre active ;
      // `cleave` limite le nombre d'ennemis distincts fauchés par l'attaque.
      // Séparer les deux permet à un coup d'épée de traverser plusieurs ennemis
      // alignés sans rien changer aux dégâts subis par une cible isolée.
      var perTarget = d.hits || 1;
      // Les formes larges (onde, tourbillon, souffle) fauchent tout ce qu'elles
      // couvrent ; une prise reste mono-cible par nature.
      var wide = (d.kind === 'quake' || d.kind === 'rage' ||
        d.kind === 'spin' || d.kind === 'breath');
      var cleave = d.cleave || (d.kind === 'grab' ? 1 : (wide ? 99 : 3));
      var interval = Math.max(4, Math.floor(d.active / perTarget));
      var hb = this.attackHitbox();
      var targets = this.world.actorsHostileTo(this.team);
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (t.dead || t.invuln > 0) continue;
        var rec = a.hits[t.id];
        if (!rec && a.touched >= cleave) continue;      // quota d'ennemis atteint
        if (rec && rec.n >= perTarget) continue;        // cette cible a eu son compte
        if (rec && a.t - rec.last < interval) continue; // cadence entre deux impacts
        if (!U.boxOverlap(hb, t.box())) continue;
        if (!rec) { rec = a.hits[t.id] = { n: 0, last: -99 }; a.touched = (a.touched || 0) + 1; }
        rec.n++; rec.last = a.t;
        this.world.resolveHit(this, t, d, a.opts);
      }
    }

    if (a.t >= a.total) { this.act = null; return true; }
    return false;
  };

  Actor.prototype.fireProjectiles = function (d) {
    var n = d.count || 1, spread = d.spread || 0;
    for (var i = 0; i < n; i++) {
      var off = n > 1 ? (i - (n - 1) / 2) * spread : 0;
      var sp = (d.speed || 8) * (this.scale > 1.4 ? 1.2 : 1);
      var p = new Projectile(this.world, {
        x: this.x + this.facing * 20 * this.scale,
        z: this.z,
        y: this.y + this.size.h * this.scale * 0.55,
        vx: this.facing * sp,
        vy: -off * sp * 0.6 + (d.angle ? -d.angle * sp : 0),
        team: this.team,
        owner: this,
        dmg: d,
        element: d.element || 'phys',
        pierce: d.pierce ? 2 : (this.pierceBonus || 0),
        radius: d.radius || 0,
        sprite: d.element === 'fire' ? 'fire' : (d.element === 'ice' ? 'ice' :
          (d.element === 'dark' ? 'dark' : (d.element === 'arcane' ? 'arcane' : 'arrow')))
      });
      this.world.projectiles.push(p);
    }
  };

  /* ---------------------------- Physique ------------------------------- */
  Actor.prototype.physics = function () {
    this.x += this.vx; this.z += this.vz; this.y += this.vy;

    // Un volant à terre cesse de planer et tombe : sans cela son altitude ne
    // repasse jamais par zéro, la condition de relèvement n'est jamais
    // satisfaite, et il reste couché définitivement.
    if (this.flying && !this.dead && this.state !== 'down') {
      // Vol stationnaire : oscillation autour de la hauteur cible
      var target = this.hoverY;
      this.vy += (target - this.y) * 0.012;
      this.vy *= 0.90;
    } else {
      this.vy -= GRAVITY;
      if (this.y <= 0) {
        this.y = 0;
        if (this.vy < -6 && this.state === 'down') this.vy = -this.vy * 0.32; // rebond
        else this.vy = 0;
        if (this.state === 'jump') { this.state = 'idle'; this.stateT = 0; }
        if (this.state === 'down' && this.downT === undefined) this.downT = 0;
      }
    }

    var fric = (this.y > 0 && !this.flying) ? 0.985 : 0.80;
    if (this.state === 'down') fric = 0.92;
    this.vx *= fric; this.vz *= fric;
    if (Math.abs(this.vx) < 0.02) this.vx = 0;
    if (Math.abs(this.vz) < 0.02) this.vz = 0;

    this.z = U.clamp(this.z, FLOOR_MIN, FLOOR_MAX);
    if (this.world.bounds) this.x = U.clamp(this.x, this.world.bounds.min + 16, this.world.bounds.max - 16);
  };

  /* --------------------------- Altérations ----------------------------- */
  Actor.prototype.applyStatus = function (kind, dur, power) {
    if (this.dead) return;
    // Un boss ne peut pas être bloqué par du contrôle : sinon le combat se
    // résume à l'enchaîner sans réponse. Il subit les dégâts, pas l'immobilisation.
    if (this.bossImmune && (kind === 'freeze' || kind === 'petrify' || kind === 'stun')) return;
    this.status[kind] = { t: dur, power: power || 1, tick: 0 };
    if (kind === 'freeze' || kind === 'petrify') { this.act = null; this.state = 'idle'; }
  };

  Actor.prototype.updateStatus = function () {
    var self = this;
    Object.keys(this.status).forEach(function (k) {
      var s = self.status[k];
      s.t--;
      s.tick++;
      if (k === 'burn' && s.tick % 24 === 0) self.takeDamage(Math.max(2, Math.round(self.maxHp * 0.012 * s.power)), { silent: true, element: 'fire' });
      if (k === 'poison' && s.tick % 36 === 0) self.takeDamage(Math.max(2, Math.round(self.maxHp * 0.010 * s.power)), { silent: true, element: 'poison' });
      if (k === 'regen' && s.tick % 30 === 0) self.heal(Math.round(self.maxHp * 0.012 * (s.power || 1)));
      if (s.t <= 0) delete self.status[k];
    });
    Object.keys(this.buffs).forEach(function (k) {
      self.buffs[k].t--;
      if (self.buffs[k].t <= 0) delete self.buffs[k];
    });
  };

  /* ------------------------------ Dégâts ------------------------------- */
  Actor.prototype.takeDamage = function (amount, opts) {
    opts = opts || {};
    if (this.dead) return 0;
    amount = Math.max(1, Math.round(amount));
    this.hp -= amount;
    this.flash = 6;
    if (!opts.silent) this.world.fx.damageNumber(this.x, this.z, this.centerY(), amount, opts.crit, opts.element);
    if (this.hp <= 0) { this.hp = 0; this.die(opts); }
    return amount;
  };

  Actor.prototype.heal = function (amount) {
    if (this.dead) return;
    var before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (this.hp > before) this.world.fx.healNumber(this.x, this.z, this.centerY(), this.hp - before);
  };

  Actor.prototype.die = function () {
    this.dead = true; this.deathT = 0; this.state = 'dead'; this.act = null;
    this.vy = Math.max(this.vy, 3); this.vx = -this.facing * 2;
  };

  /* --------------------- Réaction aux coups reçus ---------------------- */
  Actor.prototype.react = function (d, from, dmg) {
    var heavy = (d.knock || 0) >= 10 || (d.launch || 0) > 0;
    // Les coups qui projettent entament davantage l'équilibre que les autres.
    this.poiseDmg += dmg * (1 + (d.knock || 0) * 0.05);
    this.poiseCalm = 0;
    var broken = this.poiseDmg >= this.maxHp * this.poiseFrac;
    if (broken) this.poiseDmg = 0;

    var dir = from ? U.sign(this.x - from.x) || from.facing : 1;
    var kb = (d.knock || 0) * (this.knockResist ? (1 - this.knockResist) : 1);
    this.vx += dir * kb * 0.35;
    if (d.launch && (broken || heavy)) {
      this.vy = d.launch;
      this.state = 'down'; this.stateT = 0; this.downT = undefined;
      this.act = null;
    } else if (broken || heavy) {
      // L'endurance (poise) décide seule de l'interruption : un coup léger ne
      // stoppe plus systématiquement sa cible. Les gros ennemis peuvent donc
      // riposter, et le joueur n'est plus enchaîné par la piétaille.
      if (this.state !== 'down') {
        this.state = 'hurt'; this.stateT = 0;
        // Plafonné : sinon la durée d'immobilisation explose avec la difficulté.
        this.hurtT = Math.max(this.hurtT, 8 + Math.min(12, Math.floor(dmg * 0.05)));
        this.act = null;
      }
    }
    if (this.state === 'hurt' || this.state === 'down') this.facing = -dir || this.facing;
  };

  /* ----------------------------- Mise à jour --------------------------- */
  Actor.prototype.baseUpdate = function () {
    this.anim++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.attackCd > 0) this.attackCd--;
    // L'équilibre ne se rétablit qu'après 2 s sans encaisser : l'endurance
    // mesure une pression soutenue, pas un cumul infini sur tout le combat.
    if (!this.dead && this.poiseDmg > 0) {
      if (++this.poiseCalm > 120) {
        this.poiseDmg = Math.max(0, this.poiseDmg - this.maxHp * this.poiseFrac / 180);
      }
    }
    this.updateStatus();

    if (this.dead) {
      this.deathT++;
      this.physics();
      return;
    }

    if (this.status.freeze || this.status.petrify) { this.physics(); this.stateT++; return; }

    switch (this.state) {
      case 'attack':
      case 'cast':
        if (this.updateAttack()) { this.state = this.y > 0 ? 'jump' : 'idle'; this.stateT = 0; }
        break;
      case 'hurt':
        this.hurtT--;
        if (this.hurtT <= 0) { this.state = 'idle'; this.stateT = 0; }
        break;
      case 'down':
        if (this.y <= 0) {
          this.downT = (this.downT || 0) + 1;
          if (this.downT > (this.getupTime || 44)) {
            this.state = 'getup'; this.stateT = 0; this.downT = undefined; this.invuln = 20;
          }
        } else if (this.stateT > 180) {
          // Reste en l'air trop longtemps (plateforme, projection étrange) :
          // on relève quand même plutôt que de laisser un acteur figé.
          this.state = 'getup'; this.stateT = 0; this.downT = undefined; this.invuln = 20;
        }
        break;
      case 'getup':
        if (this.stateT > 16) { this.state = 'idle'; this.stateT = 0; }
        break;
      case 'dodge':
        if (this.stateT > (this.dodgeTime || 22)) { this.state = 'idle'; this.stateT = 0; }
        break;
    }
    this.stateT++;
    this.physics();
  };

  /* ====================================================================
   *  PROJECTILE
   * ================================================================= */
  function Projectile(world, cfg) {
    this.world = world;
    this.x = cfg.x; this.z = cfg.z; this.y = cfg.y;
    this.vx = cfg.vx || 0; this.vz = cfg.vz || 0; this.vy = cfg.vy || 0;
    this.team = cfg.team;
    this.owner = cfg.owner;
    this.d = cfg.dmg;
    this.element = cfg.element || 'phys';
    this.pierce = cfg.pierce || 0;
    this.radius = cfg.radius || 0;
    this.sprite = cfg.sprite || 'arrow';
    this.life = cfg.life || 150;
    this.dead = false;
    this.hitIds = {};
    this.gravity = cfg.gravity || 0;
    this.anim = 0;
  }
  Projectile.prototype.update = function () {
    this.anim++;
    this.x += this.vx; this.z += this.vz; this.y += this.vy;
    if (this.gravity) this.vy -= this.gravity;
    this.life--;
    if (this.life <= 0 || this.y < -10) { this.explode(); return; }
    if (this.world.bounds && (this.x < this.world.bounds.min - 40 || this.x > this.world.bounds.max + 40)) { this.dead = true; return; }

    var box = { x: this.x, z: this.z, y: this.y - 8, w: 20, d: 22, h: 18 };
    var targets = this.world.actorsHostileTo(this.team);
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.dead || t.invuln > 0 || this.hitIds[t.id]) continue;
      if (!U.boxOverlap(box, t.box())) continue;
      // Garde du chevalier : bloque les projectiles arrivant de face.
      if (t.blockChance && U.sign(this.vx) === -t.facing && Math.random() < t.blockChance) {
        this.world.fx.spark(this.x, this.z, this.y, '#ffe08a', 8);
        this.world.audio.play('block', 0.5);
        this.dead = true; return;
      }
      this.hitIds[t.id] = true;
      this.world.resolveHit(this.owner, t, this.d, { projectile: true, dirX: U.sign(this.vx) });
      if (this.radius > 0) { this.explode(); return; }
      if (this.pierce > 0) this.pierce--;
      else { this.dead = true; this.world.fx.spark(this.x, this.z, this.y, '#ffd', 6); return; }
    }
  };
  Projectile.prototype.explode = function () {
    this.dead = true;
    if (this.radius > 0) {
      this.world.fx.explosion(this.x, this.z, this.y, this.radius, this.element);
      this.world.audio.play('boom', 0.6);
      var box = { x: this.x, z: this.z, y: this.y - this.radius, w: this.radius * 2, d: this.radius * 2, h: this.radius * 2 };
      var targets = this.world.actorsHostileTo(this.team);
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        if (t.dead || this.hitIds[t.id]) continue;
        if (U.boxOverlap(box, t.box())) {
          this.hitIds[t.id] = true;
          this.world.resolveHit(this.owner, t, this.d, { aoe: true });
        }
      }
    }
  };

  /* ====================================================================
   *  JOUEUR
   * ================================================================= */
  function Player(world, hero, slot) {
    var cls = DC.Classes.get(hero.classId);
    var st = DC.Hero.effectiveStats(hero);
    Actor.call(this, world, {
      team: 'player', maxHp: st.hp, atk: st.atk, defStat: st.def,
      speed: st.spd, poiseFrac: 0.22, x: 100 + slot * 34, z: 70 + slot * 12,
      size: { w: 26, d: 20, h: 58 }, name: hero.name
    });
    this.hero = hero;
    this.cls = cls;
    this.slot = slot;
    this.stats = st;
    this.maxMp = st.mp;
    this.mp = st.mp;
    this.hp = this.maxHp;
    this.comboIdx = 0;
    this.comboWindow = 0;
    this.dashTap = { dir: 0, t: 0 };
    this.arrows = cls.weapon === 'bow' ? (cls.arrows + (hero.skills.e_quiver || 0) * 10) : 0;
    this.maxArrows = this.arrows;
    this.lives = 1 + (hero.skills.secondwind || 0) + (DC.Hero.blessings.life || 0);
    this.downedT = 0;
    this.isDowned = false;
    this.mpRegen = 0.055 * (1 + (hero.skills.concentration || 0) * 0.25) *
      (cls.id === 'wizard' ? 2 : 1) * (1 + (hero.skills.w_mana || 0) * 0.15);
    this.blockChance = cls.id === 'knight' ? 0.6 + (hero.skills.k_guard || 0) * 0.07 : 0;
    this.knockResist = cls.id === 'dwarf' ? 0.5 + (hero.skills.d_armor || 0) * 0.1 : 0.1;
    this.pierceBonus = cls.id === 'elf' ? (hero.skills.e_pierce || 0) : 0;
    this.dodgeTime = 20 + (hero.skills.evasion || 0) * 4;
    this.airJumps = (cls.id === 'amazon' && hero.skills.a_leap) ? 1 : 0;
    this.airJumpsLeft = this.airJumpsLeft || 0;
    this.superCd = 0;
    this.feastT = 0;
    this.wardT = 0;
    this.controller = slot;      // index de manette
    this.ai = false;
    this.combo = { count: 0, t: 0 };
    this.stageGold = 0;
    this.stageXp = 0;
    this.kills = 0;
    this.itemFlash = 0;
  }
  Player.prototype = Object.create(Actor.prototype);
  Player.prototype.constructor = Player;

  Player.prototype.mpCost = function (c) { return Math.max(1, Math.round(c * (1 - Math.min(0.4, (this.hero.skills.concentration || 0) * 0.04)))); };

  Player.prototype.effAtk = function () {
    var a = this.atk;
    if (this.cls.id === 'amazon') {
      var maxBonus = 0.4 + (this.hero.skills.a_rage || 0) * 0.1;
      a *= 1 + maxBonus * (1 - this.hp / this.maxHp);
    }
    if (this.buffs.atk) a *= (1 + this.buffs.atk.pct);
    if (this.rally) a *= (1 + this.rally);
    return a;
  };
  Player.prototype.effDef = function () {
    var d = this.defStat;
    if (this.buffs.def) d *= (1 + this.buffs.def.pct);
    if (this.cls.id === 'dwarf') d *= 1 + (this.hero.skills.d_armor || 0) * 0.08;
    return d;
  };

  Player.prototype.getInput = function () {
    if (this.ai) return this.aiInput();
    return DC.Input.pad(this.controller);
  };

  var BUFFERED = ['attack', 'special', 'jump'];

  Player.prototype.update = function () {
    // La manette est lue UNE fois par image, avant tout retour anticipé : une
    // touche pressée pendant un hitstop, une récupération d'attaque ou un état
    // de contrôle volé est mémorisée 8 images au lieu d'être perdue.
    // (Lecture unique obligatoire : getInput() fait avancer l'horloge de l'IA.)
    var pad = this._pad = this.getInput();
    var b = this.buf || (this.buf = { attack: 0, special: 0, jump: 0 });
    var frozen = this.hitstop > 0;
    for (var k = 0; k < BUFFERED.length; k++) {
      var key = BUFFERED[k];
      if (pad.pressed[key]) b[key] = 8;
      else if (b[key] > 0 && !frozen) b[key]--;
    }

    if (this.hitstop > 0) { this.hitstop--; return; }

    // État « à terre » : le joueur doit être relevé par un allié ou dépenser une vie.
    if (this.isDowned) {
      this.downedT++;
      this.anim++;
      this.physics();
      var helper = false;
      var allies = this.world.players;
      for (var i = 0; i < allies.length; i++) {
        var a = allies[i];
        if (a === this || a.isDowned || a.dead) continue;
        if (U.dist(a.x, a.z, this.x, this.z) < 46) { helper = true; break; }
      }
      // Un allié doit rester à portée : la jauge redescend s'il s'éloigne.
      this.reviveProgress = U.clamp((this.reviveProgress || 0) + (helper ? 1 : -1.5), 0, 80);
      if (this.reviveProgress > 70) { this.revive(0.5); return; }
      // Personne pour aider : le héros dépense une vie et se relève seul.
      var allDown = allies.every(function (a) { return a.isDowned; });
      var wait = allDown ? 120 : 420;
      if (this.downedT > wait && this.lives > 0) { this.lives--; this.revive(0.35); return; }
      // Dernier recours : une fiole de résurrection emportée se boit toute seule
      // plutôt que de rester inutilisée dans la besace au moment de la défaite.
      if (this.lives === 0 && this.downedT > 45) {
        var pouch = this.world.run.pouch;
        for (var f = 0; f < pouch.length; f++) {
          if (pouch[f].id !== 'revive' || pouch[f].qty <= 0) continue;
          pouch[f].qty--;
          if (pouch[f].qty <= 0) pouch.splice(f, 1);
          this.world.toast(this.name + ' brise une fiole de résurrection !');
          this.revive(0.7);
          return;
        }
      }
      return;
    }

    this.baseUpdate();
    if (this.dead) return;

    // Régénération de PM et compteurs de classe
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen);
    if (this.superCd > 0) this.superCd--;
    if (this.comboWindow > 0) this.comboWindow--; else this.comboIdx = 0;
    if (this.combo.t > 0) { this.combo.t--; if (this.combo.t === 0) this.combo.count = 0; }
    if (this.itemFlash > 0) this.itemFlash--;

    // Passif Ensorceleuse : festin périodique
    if (this.cls.id === 'sorceress') {
      this.feastT++;
      var every = 900 - (this.hero.skills.s_feast || 0) * 180;
      if (this.feastT > every) {
        this.feastT = 0;
        this.world.dropItem(this.x + U.rnd.range(-30, 30), this.z, 40, { type: 'item', item: DC.Loot.makeConsumable((this.hero.skills.s_feast || 0) >= 2 ? 'roast' : 'bread') });
        this.world.toast(this.name + ' prépare un festin !');
      }
      if (this.hero.skills.s_ward) {
        this.wardT++;
        if (this.wardT > 720) {
          this.wardT = 0;
          this.world.players.forEach(function (p) { if (!p.dead && !p.isDowned) p.buffs.def = { pct: 0.3, t: 360 }; });
          this.world.fx.ring(this.x, this.z, this.y, '#7ad0e8', 90);
        }
      }
    }
    // Aura de ralliement du chevalier
    if (this.cls.id === 'knight' && this.hero.skills.k_rally) {
      var bonus = this.hero.skills.k_rally * 0.08, self = this;
      this.world.players.forEach(function (p) {
        if (p !== self && !p.dead && U.dist(p.x, p.z, self.x, self.z) < 160) p.rally = bonus;
        else if (p !== self) p.rally = 0;
      });
    }

    if (this.status.freeze || this.status.petrify) return;

    var pad = this._pad;

    // Relevé actif : à terre, une pression sort du sol sans attendre la fin du
    // décompte passif. Rend au joueur la plus longue perte de contrôle du jeu.
    if (this.state === 'down' && this.y <= 0 && (this.downT || 0) > 12 &&
      (pad.pressed.attack || pad.pressed.jump || b.attack > 0 || b.jump > 0)) {
      b.attack = 0; b.jump = 0;
      this.state = 'getup'; this.stateT = 0; this.downT = undefined; this.invuln = 20;
    }
    if (!this.canAct()) return;

    /* -------------------- Déplacement -------------------- */
    var mx = pad.axisX, mz = pad.axisZ;
    var sp = this.speed * 2.6;
    if (this.y > 0) sp *= 0.85;
    var len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    if (mx || mz) {
      this.vx = U.approach(this.vx, mx * sp, 0.6);
      this.vz = U.approach(this.vz, mz * sp * 0.62, 0.5);
      if (mx) this.facing = U.sign(mx);
      if (this.y === 0) this.state = 'walk';
    } else if (this.y === 0 && this.state === 'walk') {
      this.state = 'idle';
    }

    /* ------------------- Double tape = roulade ------------------ */
    if (this.dashTap.t > 0) this.dashTap.t--;
    var tapDir = pad.pressed.left ? -1 : (pad.pressed.right ? 1 : 0);
    if (tapDir) {
      if (this.dashTap.dir === tapDir && this.dashTap.t > 0 && this.y === 0) {
        this.doDodge(tapDir); this.dashTap.t = 0;
      } else { this.dashTap.dir = tapDir; this.dashTap.t = 16; }
    }

    /* ------------------------ Saut ----------------------- */
    if (b.jump > 0) {
      if (this.y === 0) {
        b.jump = 0;
        this.vy = 9.4; this.state = 'jump'; this.stateT = 0;
        this.airJumpsLeft = this.airJumps;
        this.world.audio.play('jump', 0.35);
      } else if (this.airJumpsLeft > 0 && pad.pressed.jump) {
        // Le double saut ne se déclenche que sur un appui franc : sinon le
        // tampon consommerait les deux sauts d'un coup.
        b.jump = 0;
        this.airJumpsLeft--; this.vy = 8.4;
        this.world.fx.ring(this.x, this.z, this.y, '#ffffff', 30);
      }
    }

    /* --------------------- Attaques ---------------------- */
    if (b.attack > 0) {
      b.attack = 0;
      if (this.y > 0) this.startAttack(this.cls.air);
      else if (pad.held.down) this.doHeavy();
      else this.doCombo();
    }
    if (b.special > 0) {
      b.special = 0;
      if (pad.held.down) this.doSuper();
      else this.doSpecial();
    }
    if (pad.pressed.item) this.useItem();
    if (pad.pressed.up) this.world.interact(this);
  };

  Player.prototype.doCombo = function () {
    var chain = this.cls.combo;
    var desc = chain[Math.min(this.comboIdx, chain.length - 1)];
    this.startAttack(desc);
    this.comboIdx = (this.comboIdx + 1) % chain.length;
    this.comboWindow = desc.startup + desc.active + desc.recover + 22;
  };

  Player.prototype.doHeavy = function () {
    var d = this.cls.heavy;
    if (d.ammo) {
      if (this.arrows < d.ammo) { this.world.toast('Plus de flèches !'); return; }
      this.arrows -= d.ammo;
    }
    if (d.kind === 'grab') {
      // Prise du nain : agrippe la cible la plus proche devant lui.
      var t = this.world.nearestHostile(this, 60 * SCALE);
      if (t && !t.boss) { this.world.grabThrow(this, t, d); return; }
    }
    this.startAttack(d);
  };

  Player.prototype.doSpecial = function () {
    var d = this.cls.special;
    var cost = this.mpCost(d.mp || 0);
    if (d.ammo) {
      if (this.arrows < d.ammo) { this.world.toast('Plus de flèches !'); return; }
    }
    if (this.mp < cost) { this.world.toast('PM insuffisants'); this.world.audio.play('deny', 0.4); return; }
    if (d.ammo) this.arrows -= d.ammo;
    this.mp -= cost;
    var mod = Object.assign({}, d);
    if (this.cls.id === 'knight' && this.hero.skills.k_whirl) {
      mod.hits = d.hits + this.hero.skills.k_whirl * 2;
      mod.reach = d.reach * (1 + this.hero.skills.k_whirl * 0.2);
    }
    if (this.cls.id === 'amazon' && this.hero.skills.a_dance) mod.hits = d.hits + this.hero.skills.a_dance * 3;
    if (this.cls.id === 'wizard' && this.hero.skills.w_fire) { mod.radius = d.radius * (1 + this.hero.skills.w_fire * 0.3); }
    this.startAttack(mod);
    this.world.fx.cast(this.x, this.z, this.y + 30, d.element || 'arcane');
  };

  Player.prototype.doSuper = function () {
    var d = this.cls.super;
    var cost = this.mpCost(d.mp || 0);
    if (this.superCd > 0) { this.world.toast('Technique en récupération'); return; }
    if (d.ammo && this.arrows < d.ammo) { this.world.toast('Plus de flèches !'); return; }
    if (this.mp < cost) { this.world.toast('PM insuffisants'); this.world.audio.play('deny', 0.4); return; }
    if (d.ammo) this.arrows -= d.ammo;
    this.mp -= cost;
    this.superCd = 240;
    this.invuln = Math.max(this.invuln, d.startup + 6);
    var mod = Object.assign({}, d);
    if (this.cls.id === 'sorceress') mod.summon = d.summon + (this.hero.skills.s_bones || 0);
    if (this.cls.id === 'dwarf' && this.hero.skills.d_quake) mod.reach = d.reach * (1 + this.hero.skills.d_quake * 0.3);
    if (this.cls.id === 'wizard' && this.hero.skills.w_grav) mod.active = d.active + this.hero.skills.w_grav * 30;
    this.startAttack(mod);
    this.world.fx.superFlash(this.cls.super.name, this.name);
    this.world.audio.play('super', 0.7);
  };

  Player.prototype.doDodge = function (dir) {
    this.state = 'dodge'; this.stateT = 0;
    this.vx = dir * 9.5;
    this.invuln = 12 + (this.hero.skills.evasion || 0) * 4;
    this.facing = dir;
    this.world.audio.play('dash', 0.3);
    this.world.fx.dust(this.x, this.z, 6);
  };

  Player.prototype.useItem = function () {
    var inv = this.world.run.pouch;
    if (!inv.length) { this.world.toast('Besace vide'); return; }
    var slotItem = inv[this.world.run.pouchIdx % inv.length];
    if (!slotItem) return;
    var ok = this.world.consume(this, slotItem);
    if (ok) {
      slotItem.qty--;
      if (slotItem.qty <= 0) inv.splice(inv.indexOf(slotItem), 1);
      this.itemFlash = 20;
    }
  };

  Player.prototype.die = function () {
    // Un joueur n'est pas tué : il tombe à terre et peut être relevé.
    this.isDowned = true;
    this.downedT = 0;
    this.reviveProgress = 0;
    this.hp = 0;
    this.state = 'down';
    this.vy = 5; this.vx = -this.facing * 3;
    this.world.toast(this.name + ' est à terre !');
    this.world.audio.play('down', 0.6);
  };

  Player.prototype.revive = function (pct) {
    this.isDowned = false;
    this.dead = false;
    this.hp = Math.max(1, Math.round(this.maxHp * (pct || 0.4)));
    this.state = 'getup'; this.stateT = 0;
    this.invuln = 90;
    this.reviveProgress = 0;
    this.world.fx.ring(this.x, this.z, this.y, '#ffd24a', 70);
    this.world.toast(this.name + ' se relève !');
  };

  Player.prototype.gainXp = function (amount) {
    this.stageXp += amount;
    this.hero.xp += amount;
    var newLv = DC.Classes.levelFromXp(this.hero.xp);
    if (newLv > this.hero.level) {
      var gained = newLv - this.hero.level;
      this.hero.level = newLv;
      this.hero.skillPoints += gained;
      var st = DC.Hero.effectiveStats(this.hero);
      var ratio = this.hp / this.maxHp;
      this.stats = st;
      this.maxHp = st.hp; this.maxMp = st.mp;
      this.atk = st.atk; this.defStat = st.def; this.speed = st.spd;
      this.hp = Math.max(this.hp, Math.round(this.maxHp * Math.max(ratio, 0.5)));
      this.world.fx.levelUp(this);
      this.world.toast(this.name + ' passe niveau ' + newLv + ' !');
      this.world.audio.play('levelup', 0.7);
    }
  };

  /* ------------------------ IA des compagnons -------------------------- */
  var AI_PAD_TEMPLATE = function () {
    var p = { axisX: 0, axisZ: 0, held: {}, pressed: {}, released: {} };
    DC.Input.BUTTONS.forEach(function (b) { p.held[b] = false; p.pressed[b] = false; p.released[b] = false; });
    return p;
  };

  Player.prototype.aiInput = function () {
    var p = this._aiPad || (this._aiPad = AI_PAD_TEMPLATE());
    DC.Input.BUTTONS.forEach(function (b) { p.pressed[b] = false; p.held[b] = false; });
    p.axisX = 0; p.axisZ = 0;
    this.aiT++;

    // Priorité : relever un allié à terre.
    var downed = this.world.players.filter(function (o) { return o.isDowned; })[0];
    var target = null, tx, tz, prefRange;
    if (downed && U.dist(this.x, this.z, downed.x, downed.z) < 700) {
      tx = downed.x; tz = downed.z; prefRange = 24;
    } else {
      target = this.world.nearestHostile(this, 2000);
      if (!target) {
        // Suit le joueur humain le plus avancé.
        var lead = this.world.players.filter(function (o) { return !o.ai && !o.isDowned; })[0] || this.world.players[0];
        if (lead && lead !== this) { tx = lead.x - this.facing * 40; tz = lead.z; prefRange = 40; }
        else return p;
      } else {
        var ranged = (this.cls.weapon === 'bow' || this.cls.weapon === 'staff');
        prefRange = ranged ? 190 : 34;
        tx = target.x - U.sign(target.x - this.x) * prefRange;
        tz = target.z;
      }
    }

    var dx = tx - this.x, dz = tz - this.z;
    if (Math.abs(dx) > 12) p.axisX = U.clamp(dx / 60, -1, 1);
    if (Math.abs(dz) > 8) p.axisZ = U.clamp(dz / 40, -1, 1);
    if (target) this.facing = U.sign(target.x - this.x) || this.facing;

    if (target && !target.dead) {
      var d = U.dist(this.x, this.z, target.x, target.z);
      var dzAbs = Math.abs(target.z - this.z);
      var inMelee = d < 60 && dzAbs < 26;
      var lined = dzAbs < 22;
      // Consommable de secours
      if (this.hp < this.maxHp * 0.3 && this.aiT % 120 === 0) p.pressed.item = true;
      // Super quand la jauge le permet
      if (this.mp > this.maxMp * 0.85 && this.superCd === 0 && lined && d < 260 && this.aiT % 30 === 0) {
        p.held.down = true; p.pressed.special = true;
      } else if (this.mp > this.maxMp * 0.5 && lined && this.aiT % 45 === 0 &&
        (this.cls.weapon === 'bow' || this.cls.weapon === 'staff' ? d < 340 : d < 90)) {
        p.pressed.special = true;
      } else if (inMelee && this.aiT % 12 === 0) {
        p.pressed.attack = true;
        if (this.aiT % 60 === 0) p.held.down = true; // attaque lourde de temps en temps
      } else if (lined && (this.cls.weapon === 'bow') && d < 400 && this.aiT % 26 === 0) {
        p.held.down = true; p.pressed.attack = true;
      }
      // Esquive si l'ennemi charge
      if (target.act && target.act.t < target.act.d.startup && d < 70 && this.aiT % 90 === 0) {
        p.pressed.left = U.sign(this.x - target.x) < 0;
        p.pressed.right = !p.pressed.left;
      }
    }
    return p;
  };

  /* ====================================================================
   *  ENNEMI
   * ================================================================= */
  function Enemy(world, defId, level, opts) {
    opts = opts || {};
    var s = DC.Enemies.scaled(defId, level, opts.diffMult || 1, opts.players || 1);
    var d = s.def;
    Actor.call(this, world, {
      team: 'enemy', maxHp: s.maxHp, atk: s.atk, defStat: s.defStat,
      speed: d.spd, poiseFrac: U.clamp(d.poise / d.hp, 0.15, 0.40), size: d.size, flying: d.flying,
      x: opts.x || 0, z: opts.z || 75, name: d.name,
      scale: (d.scale || 1) * (opts.elite ? 1.18 : 1),
      facing: opts.facing || -1
    });
    this.def = d;
    this.xpValue = s.xp;
    this.goldValue = s.gold;
    this.boss = !!d.boss;
    this.elite = !!opts.elite || !!d.elite;
    if (opts.elite) {
      this.maxHp = Math.round(this.maxHp * 2.2); this.hp = this.maxHp;
      this.atk = Math.round(this.atk * 1.35);
      this.xpValue = Math.round(this.xpValue * 2.5);
      this.goldValue = Math.round(this.goldValue * 2.5);
      this.poiseFrac = Math.min(0.5, this.poiseFrac * 1.4);
    }
    if (this.boss) { this.bossImmune = true; this.superArmor = true; this.knockResist = 0.9; this.getupTime = 24; }
    this.hoverY = d.flying ? (this.boss ? 60 : 34 + U.rnd.range(-8, 14)) : 0;
    if (d.flying) this.y = this.hoverY;
    this.phase = 1;
    this.aggro = null;
    this.strafe = U.rnd.chance(0.5) ? 1 : -1;
    this.wander = U.rnd.range(0, 6.28);
    this.summonCd = 0;
    this.thinkT = U.rnd.int(0, 50);
  }
  Enemy.prototype = Object.create(Actor.prototype);
  Enemy.prototype.constructor = Enemy;

  Enemy.prototype.effAtk = function () { return this.atk * (this.enraged ? 1.35 : 1); };
  Enemy.prototype.effDef = function () { return this.defStat; };

  Enemy.prototype.pickTarget = function () {
    var best = null, bestD = 1e9;
    var ps = this.world.actorsHostileTo(this.team);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p.dead || p.isDowned) continue;
      var d = U.dist(this.x, this.z, p.x, p.z);
      if (this.aggro === p) d *= 0.7;   // hystérésis : garde sa cible
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  };

  Enemy.prototype.update = function () {
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.baseUpdate();
    if (this.dead) return;
    if (this.status.freeze || this.status.petrify) return;
    if (!this.canAct()) return;
    if (!this.world.combatActive) { this.idleDrift(); return; }

    var t = this.pickTarget();
    this.aggro = t;
    if (!t) { this.idleDrift(); return; }

    // Phases de boss : plus agressif à basse vie.
    if (this.boss) {
      var pct = this.hp / this.maxHp;
      var np = pct > 0.66 ? 1 : (pct > 0.33 ? 2 : 3);
      if (np !== this.phase) {
        this.phase = np;
        this.enraged = np === 3;
        this.invuln = 30;
        this.world.fx.ring(this.x, this.z, this.y + 30, '#ff5a5a', 140);
        this.world.toast(this.name + ' entre en fureur !');
        this.world.audio.play('roar', 0.7);
      }
    }

    var dx = t.x - this.x, dz = t.z - this.z;
    var dist = Math.hypot(dx, dz);
    var dirX = U.sign(dx) || 1;
    if (this.state !== 'attack') this.facing = dirX;

    var ai = this.def.ai;
    var sp = this.speed * (this.enraged ? 1.25 : 1) * 1.5;
    var prefer = 30, keepZ = true;

    if (ai === 'ranged' || ai === 'caster') prefer = 200 + Math.sin(this.wander + this.anim * 0.01) * 40;
    else if (ai === 'charger') prefer = 26;
    else if (ai === 'boss') prefer = this.size.w * this.scale * 0.6 + 26;
    else prefer = this.size.w * this.scale * 0.5 + 22;

    // Déplacement : converger en profondeur, puis ajuster la distance horizontale.
    var wantX = 0, wantZ = 0;
    if (Math.abs(dz) > 6) wantZ = U.clamp(dz / 30, -1, 1);
    var gap = Math.abs(dx) - prefer;
    if (gap > 4) wantX = dirX;
    else if (gap < -14 && (ai === 'ranged' || ai === 'caster')) wantX = -dirX;
    else if (Math.abs(dz) < 10) {
      // À bonne distance : petit pas de côté pour éviter les empilements.
      wantZ += this.strafe * 0.35;
      if (this.anim % 90 === 0) this.strafe *= -1;
    }

    this.vx = U.approach(this.vx, wantX * sp, 0.35);
    this.vz = U.approach(this.vz, wantZ * sp * 0.6, 0.35);
    if (this.flying) this.hoverY = U.clamp(t.y + 26 + Math.sin(this.anim * 0.03) * 14, 12, 90);

    if (this.state === 'idle' && (Math.abs(this.vx) > 0.2 || Math.abs(this.vz) > 0.2)) this.state = 'walk';
    else if (this.state === 'walk' && Math.abs(this.vx) < 0.15 && Math.abs(this.vz) < 0.15) this.state = 'idle';

    /* --------------------- Choix d'attaque --------------------- */
    if (this.attackCd > 0) return;
    var atks = this.def.attacks || [];
    if (!atks.length) return;
    var lined = Math.abs(dz) < (this.boss ? 46 : 26) * this.scale;

    var candidates = [];
    for (var i = 0; i < atks.length; i++) {
      var a = atks[i];
      // Certaines attaques ne se débloquent qu'à partir d'une phase donnée :
      // le boss révèle un nouveau coup en cours de combat, à apprendre.
      if ((a.phase || 1) > this.phase) continue;
      var range = a.kind === 'shot' ? 460 : ((a.reach || 40) * this.scale * SCALE + 12);
      if (a.kind === 'quake' || a.kind === 'rain' || a.kind === 'breath') range = (a.reach || 120) * this.scale * SCALE;
      if (a.kind === 'summonEnemy') { if (this.summonCd > 0) continue; range = 900; }
      if (a.kind === 'heal') {
        var hurt = this.world.enemies.filter(function (e) { return !e.dead && e.hp < e.maxHp * 0.7; }).length;
        if (hurt < 2) continue; range = 900;
      }
      if (dist > range) continue;
      if (!lined && a.kind !== 'quake' && a.kind !== 'rain' && a.kind !== 'summonEnemy' && a.kind !== 'heal') continue;
      // Anti-répétition : une attaque tout juste jouée devient improbable, ce
      // qui fait émerger des enchaînements variés et donc lisibles.
      var w = (a === this.lastAtk) ? 0.25 : 1;
      if (this.boss) w *= (a.kind === 'quake' || a.kind === 'rain' || a.kind === 'breath') ? (this.phase >= 2 ? 1.4 : 0.6) : 1;
      candidates.push({ a: a, weight: w });
    }
    if (!candidates.length) return;

    var chosen = U.rnd.weighted(candidates).a;
    this.lastAtk = chosen;
    if (chosen.kind === 'summonEnemy') this.summonCd = 420;
    this.startAttack(chosen);
    // Le délai couvre l'animation PUIS une fenêtre de neutre déterministe :
    // esquiver correctement ouvre toujours la même occasion de punir.
    this.attackCd = this.act.total + Math.round((this.boss ? 30 : 34) / (this.enraged ? 1.5 : 1));
    // Les coups qui projettent ou soulèvent sont annoncés, boss ou non.
    if (this.boss || (chosen.knock || 0) >= 10 || chosen.launch) this.world.fx.telegraph(this, chosen);
  };

  Enemy.prototype.idleDrift = function () {
    this.wander += 0.02;
    this.vx = U.approach(this.vx, Math.cos(this.wander) * 0.25, 0.05);
    this.vz = U.approach(this.vz, Math.sin(this.wander * 0.7) * 0.2, 0.05);
  };

  Enemy.prototype.die = function () {
    Actor.prototype.die.call(this);
    this.world.onEnemyDeath(this);
  };

  /* ====================================================================
   *  INVOCATION ALLIÉE (squelettes de l'Ensorceleuse)
   * ================================================================= */
  function Minion(world, defId, level, owner) {
    Enemy.call(this, world, defId, level, { x: owner.x + U.rnd.range(-40, 40), z: owner.z, diffMult: 1, players: 1 });
    this.team = 'player';
    this.owner = owner;
    this.life = 1200 + (owner.hero.skills.s_bones || 0) * 300;
    this.maxHp = Math.round(this.maxHp * (1 + (owner.hero.skills.s_bones || 0) * 0.6));
    this.hp = this.maxHp;
    this.atk = Math.round(owner.atk * 0.45);
    this.xpValue = 0; this.goldValue = 0;
    this.isMinion = true;
    this.name = 'Serviteur';
  }
  Minion.prototype = Object.create(Enemy.prototype);
  Minion.prototype.constructor = Minion;
  Minion.prototype.update = function () {
    this.life--;
    if (this.life <= 0 && !this.dead) { this.dead = true; this.world.fx.spark(this.x, this.z, this.y + 20, '#7affc8', 12); }
    Enemy.prototype.update.call(this);
  };
  Minion.prototype.die = function () { Actor.prototype.die.call(this); };

  return {
    Actor: Actor, Player: Player, Enemy: Enemy, Projectile: Projectile, Minion: Minion,
    GRAVITY: GRAVITY, FLOOR_MIN: FLOOR_MIN, FLOOR_MAX: FLOOR_MAX, SCALE: SCALE
  };
})();

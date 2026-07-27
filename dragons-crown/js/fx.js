/* =========================================================================
 * Effets visuels : particules, nombres flottants, secousses, annonces
 * ====================================================================== */
'use strict';

DC.Fx = (function () {

  var U = DC.U;

  function Fx(world) {
    this.world = world;
    this.parts = [];
    this.numbers = [];
    this.rings = [];
    this.shake = 0;
    this.shakeDecay = 0.88;
    this.flashAlpha = 0;
    this.flashColor = '#fff';
    this.banner = null;
    this.telegraphs = [];
  }

  Fx.prototype.clear = function () {
    this.parts.length = 0; this.numbers.length = 0; this.rings.length = 0;
    this.telegraphs.length = 0; this.banner = null; this.shake = 0; this.flashAlpha = 0;
  };

  Fx.prototype.addShake = function (amount) {
    if (!this.world.settings || this.world.settings.screenShake !== false) {
      this.shake = Math.min(24, this.shake + amount);
    }
  };

  Fx.prototype.part = function (o) {
    if (this.parts.length > 900) this.parts.shift();
    this.parts.push(Object.assign({
      x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, life: 30, maxLife: 30,
      color: '#fff', size: 3, grav: 0.18, shape: 'dot', spin: 0, rot: 0, fade: true
    }, o));
  };

  Fx.prototype.spark = function (x, z, y, color, n) {
    for (var i = 0; i < (n || 8); i++) {
      var a = U.rnd.range(0, U.TAU), s = U.rnd.range(1, 4.5);
      this.part({
        x: x, z: z, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.9 + 1.2, vz: U.rnd.range(-0.6, 0.6),
        life: U.rnd.int(12, 26), maxLife: 26, color: color || '#ffe08a', size: U.rnd.range(2, 4)
      });
    }
  };

  Fx.prototype.blood = function (x, z, y, color, n) {
    for (var i = 0; i < (n || 10); i++) {
      var a = U.rnd.range(-0.6, Math.PI + 0.6), s = U.rnd.range(1.4, 5);
      this.part({
        x: x, z: z, y: y, vx: Math.cos(a) * s, vy: Math.abs(Math.sin(a)) * s + 1, vz: U.rnd.range(-1, 1),
        life: U.rnd.int(16, 34), maxLife: 34, color: color || '#c0303a', size: U.rnd.range(2, 5), grav: 0.28
      });
    }
  };

  Fx.prototype.dust = function (x, z, n) {
    for (var i = 0; i < (n || 6); i++) {
      this.part({
        x: x + U.rnd.range(-10, 10), z: z, y: 2, vx: U.rnd.range(-1.5, 1.5), vy: U.rnd.range(0.4, 1.6), vz: 0,
        life: U.rnd.int(14, 24), maxLife: 24, color: '#b0a894', size: U.rnd.range(3, 6), grav: 0.06
      });
    }
  };

  Fx.prototype.explosion = function (x, z, y, radius, element) {
    var col = element === 'ice' ? '#8ad8ff' : element === 'dark' ? '#a06ad0' :
      element === 'arcane' ? '#c88aff' : '#ff9a3a';
    this.ring(x, z, y, col, radius * 1.6);
    for (var i = 0; i < 26; i++) {
      var a = U.rnd.range(0, U.TAU), s = U.rnd.range(1, 6);
      this.part({
        x: x, z: z, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 + 1.5, vz: U.rnd.range(-1.4, 1.4),
        life: U.rnd.int(16, 34), maxLife: 34, color: i % 3 === 0 ? '#ffe08a' : col, size: U.rnd.range(3, 8), grav: 0.12
      });
    }
    this.addShake(radius * 0.12);
  };

  Fx.prototype.shock = function (x, z, radius, team) {
    this.ring(x, z, 0, team === 'player' ? '#ffd24a' : '#ff7a5a', radius * 1.4);
    for (var i = 0; i < 18; i++) {
      var a = U.rnd.range(0, U.TAU);
      this.part({
        x: x, z: z, y: 0, vx: Math.cos(a) * U.rnd.range(2, 6), vy: U.rnd.range(1.5, 4.5), vz: Math.sin(a) * U.rnd.range(0.6, 1.6),
        life: U.rnd.int(18, 32), maxLife: 32, color: '#c8b48a', size: U.rnd.range(3, 7), grav: 0.22
      });
    }
    this.addShake(6);
  };

  Fx.prototype.ring = function (x, z, y, color, radius) {
    this.rings.push({ x: x, z: z, y: y, r: 6, max: radius || 60, color: color || '#fff', life: 22, maxLife: 22 });
  };

  Fx.prototype.cast = function (x, z, y, element) {
    var col = element === 'fire' ? '#ff8a3a' : element === 'ice' ? '#8ad8ff' :
      element === 'dark' ? '#a06ad0' : '#c8a8ff';
    for (var i = 0; i < 14; i++) {
      var a = U.rnd.range(0, U.TAU), r = U.rnd.range(14, 34);
      this.part({
        x: x + Math.cos(a) * r, z: z, y: y + Math.sin(a) * r * 0.5,
        vx: -Math.cos(a) * 1.4, vy: -Math.sin(a) * 0.8 + 0.6, vz: 0,
        life: 22, maxLife: 22, color: col, size: U.rnd.range(2, 5), grav: -0.02
      });
    }
  };

  Fx.prototype.levelUp = function (actor) {
    this.ring(actor.x, actor.z, 0, '#ffd24a', 90);
    for (var i = 0; i < 26; i++) {
      this.part({
        x: actor.x + U.rnd.range(-16, 16), z: actor.z, y: U.rnd.range(0, 10),
        vx: U.rnd.range(-0.8, 0.8), vy: U.rnd.range(2.5, 5.5), vz: 0,
        life: U.rnd.int(30, 55), maxLife: 55, color: i % 2 ? '#ffd24a' : '#fff4c0', size: U.rnd.range(2, 5), grav: -0.04
      });
    }
    this.numbers.push({
      x: actor.x, z: actor.z, y: actor.centerY() + 30, vy: 0.7,
      text: 'NIVEAU SUPÉRIEUR', color: '#ffd24a', life: 90, maxLife: 90, size: 15, bold: true
    });
  };

  Fx.prototype.damageNumber = function (x, z, y, amount, crit, element) {
    if (this.world.settings && this.world.settings.showDamage === false) return;
    if (this.numbers.length > 60) this.numbers.shift();
    var col = crit ? '#ffd24a' : element === 'fire' ? '#ff8a5a' : element === 'ice' ? '#8ad8ff' :
      element === 'poison' ? '#8ade5a' : element === 'dark' ? '#c08aff' : '#ffffff';
    this.numbers.push({
      x: x + U.rnd.range(-8, 8), z: z, y: y, vy: U.rnd.range(1.5, 2.4), vx: U.rnd.range(-0.5, 0.5),
      text: (crit ? '' : '') + amount, color: col, life: 46, maxLife: 46,
      size: crit ? 20 : 14, bold: !!crit, crit: !!crit
    });
  };

  Fx.prototype.healNumber = function (x, z, y, amount) {
    this.numbers.push({
      x: x, z: z, y: y, vy: 1.4, vx: 0, text: '+' + amount, color: '#6fd66f',
      life: 46, maxLife: 46, size: 14, bold: false
    });
  };

  Fx.prototype.text = function (x, z, y, text, color, size) {
    this.numbers.push({ x: x, z: z, y: y, vy: 1.0, vx: 0, text: text, color: color || '#fff', life: 60, maxLife: 60, size: size || 13 });
  };

  Fx.prototype.superFlash = function (moveName, who) {
    this.banner = { text: moveName, sub: who, life: 70, maxLife: 70 };
    this.flashAlpha = 0.45; this.flashColor = '#ffffff';
    this.addShake(8);
  };

  Fx.prototype.telegraph = function (actor, desc) {
    this.telegraphs.push({ actor: actor, life: desc.startup, maxLife: desc.startup, name: desc.name });
  };

  Fx.prototype.update = function () {
    var i;
    for (i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.x += p.vx; p.z += p.vz; p.y += p.vy;
      p.vy -= p.grav;
      p.rot += p.spin;
      if (p.y < 0) { p.y = 0; p.vy = -p.vy * 0.3; p.vx *= 0.6; if (Math.abs(p.vy) < 0.4) p.vy = 0; }
      p.life--;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (i = this.numbers.length - 1; i >= 0; i--) {
      var n = this.numbers[i];
      n.y += n.vy; n.x += (n.vx || 0); n.vy *= 0.94;
      n.life--;
      if (n.life <= 0) this.numbers.splice(i, 1);
    }
    for (i = this.rings.length - 1; i >= 0; i--) {
      var r = this.rings[i];
      r.r += (r.max - r.r) * 0.22;
      r.life--;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (i = this.telegraphs.length - 1; i >= 0; i--) {
      this.telegraphs[i].life--;
      if (this.telegraphs[i].life <= 0) this.telegraphs.splice(i, 1);
    }
    if (this.banner) { this.banner.life--; if (this.banner.life <= 0) this.banner = null; }
    this.shake *= this.shakeDecay;
    if (this.shake < 0.2) this.shake = 0;
    this.flashAlpha *= 0.86;
    if (this.flashAlpha < 0.01) this.flashAlpha = 0;
  };

  return { Fx: Fx };
})();

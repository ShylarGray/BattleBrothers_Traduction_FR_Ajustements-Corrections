/* =========================================================================
 * Rendu : décors en parallaxe, personnages et effets dessinés à la volée
 * (aucune image externe — tout est vectoriel/procédural)
 * ====================================================================== */
'use strict';

DC.Render = (function () {

  var U = DC.U;
  var VIEW_W = 960, VIEW_H = 540;
  var HORIZON = 300;      // ligne du sol pour z = 0

  function sy(z, y) { return HORIZON + z - y; }
  function depthScale(z) { return 0.86 + (z / 150) * 0.26; }

  /* ===================== Décors thématiques ============================ */
  function drawSky(ctx, theme, camX) {
    var g = ctx.createLinearGradient(0, 0, 0, HORIZON + 60);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(0.55, theme.sky[1]);
    g.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, HORIZON + 60);
  }

  // Silhouettes de fond, position déterministe (pas de scintillement).
  function hashRand(i, s) {
    var x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawParallax(ctx, theme, camX) {
    var kind = theme.props;
    var i, px, h, w, r;

    // Couche lointaine : montagnes / voûtes
    ctx.fillStyle = U.rgba(theme.fog, 0.30);
    for (i = 0; i < 26; i++) {
      var bx = (i * 220 - camX * 0.15) % (26 * 220);
      if (bx < -260) bx += 26 * 220;
      h = 90 + hashRand(i, 1) * 130;
      ctx.beginPath();
      ctx.moveTo(bx - 140, HORIZON + 10);
      ctx.lineTo(bx, HORIZON + 10 - h);
      ctx.lineTo(bx + 140, HORIZON + 10);
      ctx.closePath(); ctx.fill();
    }

    // Couche moyenne : éléments thématiques
    ctx.fillStyle = U.rgba(theme.fog, 0.55);
    for (i = 0; i < 34; i++) {
      px = (i * 150 - camX * 0.38) % (34 * 150);
      if (px < -180) px += 34 * 150;
      r = hashRand(i, 7);
      if (kind === 'trees') {
        h = 120 + r * 90;
        ctx.fillRect(px - 7, HORIZON + 6 - h * 0.45, 14, h * 0.45);
        ctx.beginPath();
        ctx.moveTo(px - 52, HORIZON + 6 - h * 0.35);
        ctx.lineTo(px, HORIZON + 6 - h);
        ctx.lineTo(px + 52, HORIZON + 6 - h * 0.35);
        ctx.closePath(); ctx.fill();
      } else if (kind === 'pillars' || kind === 'castle') {
        h = 150 + r * 110;
        ctx.fillRect(px - 16, HORIZON + 8 - h, 32, h);
        ctx.fillRect(px - 24, HORIZON + 8 - h - 12, 48, 14);
        if (kind === 'castle') ctx.fillRect(px - 28, HORIZON + 8 - h - 30, 56, 18);
      } else if (kind === 'bones') {
        // Arches de côtes émergeant du sol
        h = 90 + r * 90;
        ctx.lineWidth = 7;
        ctx.strokeStyle = ctx.fillStyle;
        for (var rib = 0; rib < 4; rib++) {
          var rw = (34 + rib * 12);
          ctx.beginPath();
          ctx.arc(px, HORIZON + 8, rw, Math.PI * 1.08, Math.PI * 1.92);
          ctx.stroke();
        }
        ctx.fillRect(px - 6, HORIZON + 8 - h, 12, h);
        ctx.beginPath(); ctx.arc(px, HORIZON + 4 - h, 17, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(px - 9, HORIZON + 2 - h, 6, 6);
        ctx.fillRect(px + 3, HORIZON + 2 - h, 6, 6);
        ctx.fillStyle = U.rgba(theme.fog, 0.55);
      } else if (kind === 'wrecks') {
        h = 100 + r * 80;
        ctx.save(); ctx.translate(px, HORIZON + 8); ctx.rotate((r - 0.5) * 0.5);
        ctx.fillRect(-40, -h, 80, h * 0.5);
        ctx.fillRect(-5, -h - 50, 10, 60);
        ctx.restore();
      } else if (kind === 'lava') {
        h = 90 + r * 120;
        ctx.beginPath();
        ctx.moveTo(px - 70, HORIZON + 8);
        ctx.lineTo(px - 20, HORIZON + 8 - h);
        ctx.lineTo(px + 26, HORIZON + 8 - h * 0.7);
        ctx.lineTo(px + 76, HORIZON + 8);
        ctx.closePath(); ctx.fill();
      }
    }

    // Brume au sol
    var fg = ctx.createLinearGradient(0, HORIZON - 40, 0, HORIZON + 30);
    fg.addColorStop(0, U.rgba(theme.fog, 0));
    fg.addColorStop(1, U.rgba(theme.fog, 0.28));
    ctx.fillStyle = fg;
    ctx.fillRect(0, HORIZON - 40, VIEW_W, 70);
  }

  function drawGround(ctx, theme, camX, world) {
    var g = ctx.createLinearGradient(0, HORIZON, 0, HORIZON + 150);
    g.addColorStop(0, theme.ground2);
    g.addColorStop(1, theme.ground);
    ctx.fillStyle = g;
    ctx.fillRect(0, HORIZON, VIEW_W, 240);

    // Dalles / stries pour donner du relief
    ctx.strokeStyle = U.rgba(theme.ground2, 0.5);
    ctx.lineWidth = 2;
    for (var i = 0; i < 40; i++) {
      var x = (i * 90 - (camX % 90) - 90);
      ctx.beginPath();
      ctx.moveTo(x, HORIZON);
      ctx.lineTo(x - 30, HORIZON + 150);
      ctx.stroke();
    }
    ctx.strokeStyle = U.rgba('#000000', 0.15);
    for (var k = 0; k <= 5; k++) {
      var yy = HORIZON + k * 30;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(VIEW_W, yy); ctx.stroke();
    }

    // Bandes noires : limite de la zone jouable
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, HORIZON + 152, VIEW_W, 240);

    // Lave animée pour la forge
    if (theme.props === 'lava') {
      ctx.fillStyle = U.rgba('#ff5a1a', 0.20);
      for (var l = 0; l < 6; l++) {
        var lx = ((l * 260 - camX * 0.8) % 1560);
        if (lx < -260) lx += 1560;
        var pulse = 0.5 + 0.5 * Math.sin(world.time * 0.04 + l);
        ctx.globalAlpha = 0.12 + pulse * 0.14;
        ctx.fillRect(lx, HORIZON + 118, 210, 34);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ======================= Primitives de dessin ======================== */
  function limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, U.TAU); ctx.fill();
  }
  function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

  function drawShadow(ctx, x, z, scale, w) {
    var s = depthScale(z);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(x, sy(z, 0), (w || 16) * scale * s, (w || 16) * 0.32 * scale * s, 0, 0, U.TAU);
    ctx.fill();
  }

  /* ===================== Corps : humanoïde générique ================== */
  /* Paramètres d'animation communs, calculés depuis l'état de l'acteur. */
  function poseOf(a) {
    var t = a.anim * 0.16;
    var p = { lean: 0, armR: -0.4, armL: 0.4, legR: 0, legL: 0, bob: 0, weapon: 0, headTilt: 0 };
    var moving = Math.abs(a.vx) > 0.3 || Math.abs(a.vz) > 0.3;
    if (a.state === 'walk' || (moving && a.state === 'idle')) {
      p.legR = Math.sin(t) * 0.7; p.legL = -Math.sin(t) * 0.7;
      p.armR = -0.4 + Math.sin(t) * 0.5; p.armL = 0.4 - Math.sin(t) * 0.5;
      p.bob = Math.abs(Math.sin(t)) * 2;
    } else if (a.state === 'idle') {
      p.bob = Math.sin(a.anim * 0.05) * 1.4;
      p.armR = -0.35 + Math.sin(a.anim * 0.05) * 0.08;
      p.armL = 0.35 - Math.sin(a.anim * 0.05) * 0.08;
    } else if (a.state === 'jump') {
      p.legR = -0.6; p.legL = 0.35; p.armR = -1.2; p.armL = 1.0;
    } else if (a.state === 'attack' || a.state === 'cast') {
      var d = a.act ? a.act.d : null;
      var prog = a.act ? a.act.t / Math.max(1, a.act.total) : 0;
      var phase = a.act ? (a.act.t < d.startup ? 0 : (a.act.t < d.startup + d.active ? 1 : 2)) : 0;
      if (d && (d.kind === 'shot')) {
        p.armR = phase === 0 ? -0.2 : -0.1; p.armL = phase === 0 ? -0.9 : -1.4;
        p.weapon = phase === 0 ? -0.2 : 0.1; p.lean = 0.05;
      } else if (d && (d.kind === 'quake' || d.kind === 'summon' || d.kind === 'summonEnemy' || d.kind === 'gravity')) {
        p.armR = phase === 0 ? -2.2 : 0.6; p.armL = phase === 0 ? -2.4 : 0.5;
        p.weapon = phase === 0 ? -1.8 : 0.9; p.lean = phase === 0 ? -0.12 : 0.16;
      } else if (d && d.kind === 'spin') {
        p.armR = -1.6; p.armL = 1.6; p.weapon = a.anim * 0.7; p.lean = 0;
      } else {
        p.armR = phase === 0 ? -2.0 : (phase === 1 ? 0.9 : 0.4);
        p.weapon = phase === 0 ? -1.5 : (phase === 1 ? 1.1 : 0.6);
        p.lean = phase === 1 ? 0.18 : -0.06;
        p.legR = 0.35; p.legL = -0.25;
      }
      p.prog = prog; p.phase = phase;
    } else if (a.state === 'hurt') {
      p.lean = -0.3; p.armR = 0.8; p.armL = -0.8; p.headTilt = -0.3;
    } else if (a.state === 'down' || a.dead) {
      p.down = true;
    } else if (a.state === 'dodge') {
      p.roll = true;
    } else if (a.state === 'getup') {
      p.lean = -0.2; p.legR = 0.5; p.legL = -0.4;
    }
    return p;
  }

  function drawHumanoid(ctx, a, opt) {
    opt = opt || {};
    var pal = opt.palette || {};
    var s = a.scale * depthScale(a.z) * (opt.sizeMul || 1);
    var x = a.x, base = sy(a.z, a.y);
    var f = a.facing;
    var p = poseOf(a);
    var H = (a.size.h || 56) * s;
    var bodyW = (a.size.w || 26) * s * 0.55;

    ctx.save();
    ctx.translate(x, base);
    ctx.scale(f, 1);
    if (p.down || a.dead) {
      ctx.rotate(-1.2);
      ctx.translate(0, -8 * s);
    } else if (p.roll) {
      ctx.rotate(a.stateT * 0.4);
      ctx.translate(0, -H * 0.4);
    } else {
      ctx.rotate(p.lean * 0.5);
    }

    var hipY = -H * 0.46 - p.bob * s;
    var shoulderY = -H * 0.82 - p.bob * s;
    var headY = -H * 0.95 - p.bob * s;

    var skin = pal.skin || '#e0b48a';
    var cloth = pal.cloth || '#5a4a3a';
    var metal = pal.metal || '#a8b0ba';
    var accent = pal.accent || '#d8b45a';
    var hair = pal.hair || '#3a2a20';

    /* Jambes */
    var legLen = H * 0.46;
    limb(ctx, 0, hipY, Math.sin(p.legR) * legLen * 0.55, hipY + legLen * Math.cos(p.legR), bodyW * 0.62, U.shade(cloth, -0.25));
    limb(ctx, 0, hipY, Math.sin(p.legL) * legLen * 0.55, hipY + legLen * Math.cos(p.legL), bodyW * 0.62, cloth);

    /* Cape */
    if (pal.cape) {
      ctx.fillStyle = pal.cape;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.4, shoulderY);
      ctx.quadraticCurveTo(-bodyW * 2.2 - Math.abs(a.vx) * 3, hipY + 8 * s, -bodyW * 0.6, hipY + legLen * 0.6);
      ctx.lineTo(bodyW * 0.3, hipY);
      ctx.closePath(); ctx.fill();
    }

    /* Bras arrière */
    var armLen = H * 0.38;
    limb(ctx, -bodyW * 0.2, shoulderY, -bodyW * 0.2 + Math.sin(p.armL) * armLen, shoulderY + Math.cos(p.armL) * armLen * 0.85, bodyW * 0.5, U.shade(skin, -0.3));

    /* Torse */
    ctx.fillStyle = opt.torso || cloth;
    ctx.beginPath();
    ctx.moveTo(-bodyW, hipY + 2 * s);
    ctx.lineTo(-bodyW * 1.15, shoulderY);
    ctx.lineTo(bodyW * 1.15, shoulderY);
    ctx.lineTo(bodyW, hipY + 2 * s);
    ctx.closePath(); ctx.fill();
    if (opt.plate) {
      ctx.fillStyle = metal;
      ctx.fillRect(-bodyW * 0.9, shoulderY + 2 * s, bodyW * 1.8, (hipY - shoulderY) * 0.62);
      ctx.fillStyle = accent;
      ctx.fillRect(-bodyW * 0.25, shoulderY + 4 * s, bodyW * 0.5, (hipY - shoulderY) * 0.5);
    }

    /* Tête */
    var headR = H * 0.115;
    ellipse(ctx, headR * 0.15, headY, headR, headR * 1.1, skin);
    if (opt.helm) {
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.arc(headR * 0.15, headY - headR * 0.15, headR * 1.05, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(headR * 0.15 - headR, headY - headR * 0.2, headR * 2, headR * 0.42);
      ctx.fillStyle = accent;
      ctx.fillRect(headR * 0.15 - headR * 0.12, headY - headR * 1.5, headR * 0.24, headR * 0.6);
    } else if (opt.hood) {
      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.arc(headR * 0.1, headY - headR * 0.1, headR * 1.25, Math.PI * 0.85, Math.PI * 2.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.ellipse(headR * 0.35, headY + headR * 0.1, headR * 0.72, headR * 0.6, 0, 0, U.TAU); ctx.fill();
      if (opt.glowEyes) {
        ctx.fillStyle = opt.glowEyes;
        ctx.fillRect(headR * 0.2, headY, headR * 0.28, headR * 0.2);
        ctx.fillRect(headR * 0.68, headY, headR * 0.28, headR * 0.2);
      }
    } else {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(headR * 0.1, headY - headR * 0.22, headR * 1.02, Math.PI * 0.9, Math.PI * 2.15);
      ctx.fill();
      if (opt.longHair) {
        ctx.beginPath();
        ctx.moveTo(-headR * 0.9, headY - headR * 0.3);
        ctx.quadraticCurveTo(-headR * 1.9, headY + headR * 1.8, -headR * 0.4, headY + headR * 2.4);
        ctx.lineTo(headR * 0.3, headY + headR * 0.4);
        ctx.closePath(); ctx.fill();
      }
    }
    if (opt.horns) {
      ctx.fillStyle = opt.hornColor || '#e8e0c8';
      ctx.beginPath(); ctx.moveTo(headR * 0.5, headY - headR * 0.7);
      ctx.lineTo(headR * 1.5, headY - headR * 1.9); ctx.lineTo(headR * 0.9, headY - headR * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-headR * 0.5, headY - headR * 0.7);
      ctx.lineTo(-headR * 1.3, headY - headR * 1.8); ctx.lineTo(-headR * 0.8, headY - headR * 0.5);
      ctx.closePath(); ctx.fill();
    }
    // Œil (repère de direction)
    if (!opt.hood) {
      ctx.fillStyle = opt.eyeColor || '#20181a';
      ctx.fillRect(headR * 0.45, headY - headR * 0.12, headR * 0.3, headR * 0.24);
    }

    /* Bras avant + arme */
    var ax = bodyW * 0.35, ay = shoulderY;
    var hx = ax + Math.sin(p.armR) * armLen, hy = ay + Math.cos(p.armR) * armLen * 0.85;
    limb(ctx, ax, ay, hx, hy, bodyW * 0.52, skin);
    drawWeapon(ctx, opt.weapon, hx, hy, p, s, pal, a);

    ctx.restore();
  }

  function drawWeapon(ctx, type, hx, hy, p, s, pal, a) {
    if (!type || type === 'none') return;
    var metal = pal.metal || '#c8d0d8', wood = '#6a4a2a', accent = pal.accent || '#d8b45a';
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(p.weapon || 0);
    switch (type) {
      case 'sword':
        rect(ctx, -2 * s, -4 * s, 5 * s, 8 * s, accent);
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.moveTo(0, -4 * s); ctx.lineTo(6 * s, -34 * s); ctx.lineTo(10 * s, -4 * s);
        ctx.closePath(); ctx.fill();
        rect(ctx, -6 * s, -6 * s, 18 * s, 3 * s, accent);
        break;
      case 'axe':
        rect(ctx, 0, -2 * s, 4 * s, 34 * s, wood);
        rect(ctx, 0, -30 * s, 4 * s, 30 * s, wood);
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.moveTo(2 * s, -30 * s);
        ctx.quadraticCurveTo(22 * s, -26 * s, 18 * s, -8 * s);
        ctx.lineTo(2 * s, -12 * s);
        ctx.closePath(); ctx.fill();
        break;
      case 'staff':
        rect(ctx, 0, -40 * s, 3.4 * s, 62 * s, wood);
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(1.7 * s, -42 * s, 6 * s, 0, U.TAU); ctx.fill();
        ctx.fillStyle = U.rgba(accent, 0.35);
        ctx.beginPath(); ctx.arc(1.7 * s, -42 * s, 10 * s + Math.sin(a.anim * 0.1) * 2 * s, 0, U.TAU); ctx.fill();
        break;
      case 'bow':
        ctx.strokeStyle = wood; ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.arc(4 * s, -8 * s, 20 * s, -1.3, 1.3); ctx.stroke();
        ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(4 * s + Math.cos(-1.3) * 20 * s, -8 * s + Math.sin(-1.3) * 20 * s);
        ctx.lineTo(p.phase === 0 ? -4 * s : 2 * s, -8 * s);
        ctx.lineTo(4 * s + Math.cos(1.3) * 20 * s, -8 * s + Math.sin(1.3) * 20 * s);
        ctx.stroke();
        break;
      case 'fists':
        ctx.fillStyle = metal;
        ctx.beginPath(); ctx.arc(3 * s, 2 * s, 6.5 * s, 0, U.TAU); ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(0, -1 * s, 7 * s, 2 * s);
        break;
      case 'club':
        rect(ctx, 0, -10 * s, 5 * s, 40 * s, wood);
        ctx.fillStyle = '#6a6a72';
        ctx.beginPath(); ctx.ellipse(2.5 * s, -30 * s, 13 * s, 18 * s, 0, 0, U.TAU); ctx.fill();
        break;
      case 'scythe':
        rect(ctx, 0, -46 * s, 3.4 * s, 66 * s, '#3a3040');
        ctx.strokeStyle = '#dfe8f0'; ctx.lineWidth = 4 * s;
        ctx.beginPath(); ctx.arc(2 * s, -46 * s, 26 * s, Math.PI * 0.05, Math.PI * 0.85); ctx.stroke();
        break;
      case 'trident':
        rect(ctx, 0, -30 * s, 3.4 * s, 52 * s, wood);
        ctx.fillStyle = metal;
        [-6, 0, 6].forEach(function (o) { ctx.fillRect(o * s, -44 * s, 2.4 * s, 16 * s); });
        ctx.fillRect(-7 * s, -30 * s, 17 * s, 3 * s);
        break;
    }
    ctx.restore();
  }

  /* ==================== Corps spécifiques (bestiaire) ================== */
  function drawWolf(ctx, a) {
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    if (a.dead) ctx.rotate(1.2);
    var t = a.anim * 0.3;
    var bodyY = -22 * s + Math.abs(Math.sin(t)) * 2 * s;
    // Pattes
    [-10, -4, 8, 14].forEach(function (ox, i) {
      var ph = Math.sin(t + i * 1.6) * 5 * s;
      limb(ctx, ox * s, bodyY + 6 * s, ox * s + ph, 0, 3.4 * s, U.shade(pal.fur, -0.3));
    });
    ellipse(ctx, 0, bodyY, 20 * s, 10 * s, pal.fur);
    // Queue
    limb(ctx, -18 * s, bodyY - 2 * s, -30 * s, bodyY - 10 * s - Math.sin(t) * 4 * s, 4 * s, U.shade(pal.fur, -0.2));
    // Tête
    ellipse(ctx, 18 * s, bodyY - 8 * s, 9 * s, 7 * s, pal.fur);
    ctx.fillStyle = U.shade(pal.fur, -0.4);
    ctx.beginPath(); ctx.moveTo(24 * s, bodyY - 9 * s); ctx.lineTo(34 * s, bodyY - 5 * s); ctx.lineTo(24 * s, bodyY - 2 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.eye; ctx.fillRect(21 * s, bodyY - 11 * s, 3 * s, 2.5 * s);
    // Oreilles
    ctx.fillStyle = U.shade(pal.fur, -0.25);
    ctx.beginPath(); ctx.moveTo(14 * s, bodyY - 14 * s); ctx.lineTo(17 * s, bodyY - 22 * s); ctx.lineTo(21 * s, bodyY - 13 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBat(ctx, a) {
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    var flap = Math.sin(a.anim * 0.5) * 0.8;
    var by = -12 * s;
    ctx.fillStyle = pal.wing;
    [-1, 1].forEach(function (side) {
      ctx.save(); ctx.translate(0, by); ctx.rotate(side * (0.4 + flap));
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * 20 * s, -10 * s, side * 26 * s, 4 * s);
      ctx.quadraticCurveTo(side * 14 * s, 2 * s, 0, 8 * s);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    ellipse(ctx, 0, by, 7 * s, 8 * s, pal.fur);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(2 * s, by - 2 * s, 2.4 * s, 2 * s);
    ctx.fillStyle = pal.fur;
    ctx.beginPath(); ctx.moveTo(-4 * s, by - 7 * s); ctx.lineTo(-2 * s, by - 14 * s); ctx.lineTo(1 * s, by - 6 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4 * s, by - 7 * s); ctx.lineTo(6 * s, by - 14 * s); ctx.lineTo(8 * s, by - 6 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawDragon(ctx, a) {
    var s = a.scale * depthScale(a.z) * 0.9, base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette;
    var t = a.anim * 0.06;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    if (a.dead) ctx.rotate(0.9);
    var bodyY = -52 * s + Math.sin(t) * 3 * s;

    // Ailes
    ctx.fillStyle = pal.wing;
    [-1, 1].forEach(function (side, i) {
      ctx.save(); ctx.translate(-10 * s, bodyY - 16 * s); ctx.rotate(-0.4 + Math.sin(t * 2 + i) * 0.25);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-60 * s, -70 * s, -108 * s, -18 * s);
      ctx.quadraticCurveTo(-70 * s, -12 * s, -60 * s, 22 * s);
      ctx.quadraticCurveTo(-30 * s, 4 * s, 0, 12 * s);
      ctx.closePath(); ctx.globalAlpha = i ? 1 : 0.75; ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    });
    // Queue
    ctx.strokeStyle = pal.skin; ctx.lineWidth = 14 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24 * s, bodyY + 6 * s);
    ctx.quadraticCurveTo(-90 * s, bodyY + 20 * s + Math.sin(t * 1.6) * 12 * s, -130 * s, bodyY - 10 * s);
    ctx.stroke();
    // Pattes
    [-18, 22].forEach(function (ox) {
      limb(ctx, ox * s, bodyY + 18 * s, (ox + 6) * s, 0, 12 * s, U.shade(pal.skin, -0.25));
    });
    // Corps
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.ellipse(0, bodyY, 48 * s, 34 * s, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = pal.belly;
    ctx.beginPath(); ctx.ellipse(8 * s, bodyY + 16 * s, 24 * s, 12 * s, 0, 0, U.TAU); ctx.fill();
    // Crête dorsale
    ctx.fillStyle = U.shade(pal.skin, -0.3);
    for (var sp = 0; sp < 5; sp++) {
      var spx = (-30 + sp * 15) * s, spy = bodyY - 30 * s + Math.abs(sp - 2) * 3 * s;
      ctx.beginPath();
      ctx.moveTo(spx - 6 * s, spy + 6 * s); ctx.lineTo(spx, spy - 12 * s); ctx.lineTo(spx + 6 * s, spy + 6 * s);
      ctx.closePath(); ctx.fill();
    }
    // Cou + tête
    ctx.strokeStyle = pal.skin; ctx.lineWidth = 20 * s;
    ctx.beginPath();
    ctx.moveTo(28 * s, bodyY - 10 * s);
    ctx.quadraticCurveTo(62 * s, bodyY - 52 * s, 86 * s, bodyY - 44 * s);
    ctx.stroke();
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.ellipse(94 * s, bodyY - 44 * s, 24 * s, 15 * s, -0.15, 0, U.TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(104 * s, bodyY - 50 * s); ctx.lineTo(126 * s, bodyY - 40 * s); ctx.lineTo(104 * s, bodyY - 34 * s);
    ctx.closePath(); ctx.fill();
    // Cornes et œil
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath(); ctx.moveTo(84 * s, bodyY - 54 * s); ctx.lineTo(72 * s, bodyY - 82 * s); ctx.lineTo(92 * s, bodyY - 56 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.eye;
    ctx.beginPath(); ctx.ellipse(100 * s, bodyY - 48 * s, 4.5 * s, 3 * s, 0, 0, U.TAU); ctx.fill();
    // Souffle en préparation
    if (a.act && a.act.d.kind === 'breath' && a.act.t < a.act.d.startup) {
      ctx.fillStyle = U.rgba(pal.fire, 0.5 + 0.4 * Math.sin(a.anim * 0.4));
      ctx.beginPath(); ctx.arc(124 * s, bodyY - 40 * s, 12 * s * (a.act.t / a.act.d.startup + 0.2), 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawKraken(ctx, a) {
    var s = a.scale * depthScale(a.z) * 0.9, base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette, t = a.anim * 0.05;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    // Tentacules
    ctx.strokeStyle = pal.skin; ctx.lineCap = 'round';
    for (var i = 0; i < 6; i++) {
      var side = i % 2 ? 1 : -1;
      var off = (Math.floor(i / 2) + 1) * 26;
      ctx.lineWidth = (10 - Math.floor(i / 2) * 2) * s;
      ctx.beginPath();
      ctx.moveTo(0, -30 * s);
      ctx.quadraticCurveTo(side * off * s, (-70 + Math.sin(t + i) * 20) * s, side * (off + 60) * s, -6 * s);
      ctx.stroke();
    }
    // Tête bulbeuse
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.ellipse(0, -76 * s, 42 * s, 52 * s, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = U.shade(pal.skin, -0.25);
    ctx.beginPath(); ctx.ellipse(0, -40 * s, 40 * s, 24 * s, 0, 0, U.TAU); ctx.fill();
    // Yeux
    [-16, 16].forEach(function (ox) {
      ellipse(ctx, ox * s, -74 * s, 11 * s, 9 * s, pal.eye);
      ellipse(ctx, (ox + 3) * s, -74 * s, 4 * s, 6 * s, '#101018');
    });
    ctx.restore();
  }

  function drawCyclops(ctx, a) {
    drawHumanoid(ctx, a, {
      palette: { skin: a.def.palette.skin, cloth: a.def.palette.cloth, metal: '#6a6a72', accent: a.def.palette.magma, hair: '#2a1a14' },
      weapon: 'club', sizeMul: 1.0
    });
    // Œil unique + veines de magma
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y), f = a.facing;
    var H = a.size.h * s;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    ellipse(ctx, H * 0.02, -H * 0.95, H * 0.05, H * 0.05, '#fff');
    ellipse(ctx, H * 0.03, -H * 0.95, H * 0.026, H * 0.03, a.def.palette.eye);
    ctx.strokeStyle = U.rgba(a.def.palette.magma, 0.6 + 0.3 * Math.sin(a.anim * 0.1));
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(-H * 0.1, -H * 0.75); ctx.lineTo(-H * 0.03, -H * 0.6); ctx.lineTo(-H * 0.12, -H * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawGorgon(ctx, a) {
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette, t = a.anim * 0.05;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    // Corps de serpent
    ctx.strokeStyle = pal.scale; ctx.lineWidth = 26 * s; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -20 * s);
    ctx.quadraticCurveTo(-50 * s, -6 * s + Math.sin(t) * 8 * s, -96 * s, -18 * s);
    ctx.stroke();
    ctx.fillStyle = U.shade(pal.scale, 0.2);
    for (var i = 0; i < 5; i++) ellipse(ctx, -(i * 20) * s, (-16 + Math.sin(t + i) * 3) * s, 8 * s, 5 * s, U.shade(pal.scale, 0.25));
    // Torse humanoïde
    var hipY = -34 * s, shY = -74 * s, headY = -88 * s;
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.moveTo(-13 * s, hipY); ctx.lineTo(-16 * s, shY); ctx.lineTo(16 * s, shY); ctx.lineTo(13 * s, hipY);
    ctx.closePath(); ctx.fill();
    // Bras
    limb(ctx, -12 * s, shY, -26 * s, shY + 26 * s, 7 * s, U.shade(pal.skin, -0.15));
    limb(ctx, 12 * s, shY, 30 * s, shY + 20 * s, 7 * s, pal.skin);
    // Tête + chevelure de serpents
    ellipse(ctx, 2 * s, headY, 11 * s, 12 * s, pal.skin);
    ctx.strokeStyle = pal.hair; ctx.lineWidth = 3.6 * s;
    for (var k = 0; k < 9; k++) {
      var ang = -Math.PI * 0.9 + k * 0.28;
      var wob = Math.sin(t * 3 + k) * 0.3;
      ctx.beginPath();
      ctx.moveTo(2 * s, headY - 4 * s);
      ctx.quadraticCurveTo(Math.cos(ang + wob) * 22 * s, headY - 20 * s + Math.sin(ang) * 10 * s,
        Math.cos(ang + wob) * 30 * s, headY - 26 * s + Math.sin(ang + wob) * 14 * s);
      ctx.stroke();
    }
    ctx.fillStyle = a.act && a.act.d.kind === 'gaze' ? '#ffe84a' : '#20181a';
    ctx.fillRect(5 * s, headY - 2 * s, 4 * s, 3 * s);
    if (a.act && a.act.d.kind === 'gaze' && a.act.t > a.act.d.startup) {
      ctx.fillStyle = U.rgba('#ffe84a', 0.22);
      ctx.beginPath(); ctx.moveTo(9 * s, headY - 2 * s);
      ctx.lineTo(300 * s, headY - 40 * s); ctx.lineTo(300 * s, headY + 40 * s);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawGolem(ctx, a) {
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette, p = poseOf(a);
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    if (a.dead) ctx.rotate(-1.0);
    var H = a.size.h * s;
    ctx.fillStyle = pal.stone;
    ctx.fillRect(-14 * s, -H * 0.45, 11 * s, H * 0.45);
    ctx.fillRect(4 * s, -H * 0.45, 11 * s, H * 0.45);
    ctx.fillRect(-22 * s, -H * 0.88, 44 * s, H * 0.46);
    ctx.fillStyle = U.shade(pal.stone, -0.2);
    ctx.fillRect(-30 * s, -H * 0.86, 12 * s, H * 0.4);
    ctx.fillRect(18 * s, -H * 0.86, 12 * s, H * 0.4);
    ctx.fillStyle = pal.stone;
    ctx.fillRect(-12 * s, -H * 1.02, 24 * s, H * 0.16);
    ctx.fillStyle = pal.rune;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(a.anim * 0.08);
    ctx.fillRect(-4 * s, -H * 0.99, 4 * s, 4 * s);
    ctx.fillRect(4 * s, -H * 0.99, 4 * s, 4 * s);
    ctx.fillRect(-16 * s, -H * 0.7, 32 * s, 3 * s);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawLich(ctx, a) {
    drawHumanoid(ctx, a, {
      palette: { skin: a.def.palette.bone, cloth: a.def.palette.cloth, metal: '#9aa', accent: a.def.palette.accent, hair: '#20203a', cape: a.def.palette.cloth },
      weapon: 'scythe', hood: true, glowEyes: a.def.palette.glow
    });
    // Aura nécrotique
    var s = a.scale * depthScale(a.z);
    ctx.fillStyle = U.rgba(a.def.palette.glow, 0.10 + 0.06 * Math.sin(a.anim * 0.07));
    ctx.beginPath();
    ctx.ellipse(a.x, sy(a.z, a.y) - a.size.h * s * 0.5, a.size.w * s * 1.6, a.size.h * s * 0.75, 0, 0, U.TAU);
    ctx.fill();
  }

  /* ================== Aiguillage : dessin d'un acteur ================== */
  function drawActor(ctx, a) {
    if (a.dead && a.deathT > 40) {
      ctx.globalAlpha = Math.max(0, 1 - (a.deathT - 40) / 20);
    }
    drawShadow(ctx, a.x, a.z, a.scale, (a.size.w || 26) * 0.6);

    var isPlayer = a.team === 'player' && a.cls;
    // Contour sombre : détache du décor. Coûteux en canvas, on le réserve donc
    // aux silhouettes qui comptent (joueurs, élites, boss).
    ctx.save();
    if (isPlayer || a.boss || a.elite) {
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 5;
    }
    if (a.flash > 0) { ctx.save(); ctx.filter = 'brightness(1.85) contrast(1.1)'; }
    // Le gel ne change pas la teinte du monstre (sinon on ne le reconnaît plus),
    // il le désature et l'éclaircit.
    if (a.status.freeze) { ctx.save(); ctx.filter = 'saturate(0.3) brightness(1.45)'; }
    if (a.status.petrify) { ctx.save(); ctx.filter = 'grayscale(1) brightness(0.8)'; }

    if (isPlayer) {
      var pal = a.cls.palette;
      drawHumanoid(ctx, a, {
        palette: pal,
        weapon: a.cls.weapon,
        helm: a.cls.id === 'knight',
        hood: a.cls.id === 'wizard',
        longHair: a.cls.id === 'elf' || a.cls.id === 'sorceress' || a.cls.id === 'amazon',
        plate: a.cls.id === 'knight' || a.cls.id === 'dwarf',
        glowEyes: a.cls.id === 'wizard' ? '#c8a8ff' : null
      });
    } else if (a.def) {
      var b = a.def.body, pal2 = a.def.palette;
      switch (b) {
        case 'wolf': drawWolf(ctx, a); break;
        case 'bat': drawBat(ctx, a); break;
        case 'dragon': drawDragon(ctx, a); break;
        case 'kraken': drawKraken(ctx, a); break;
        case 'cyclops': drawCyclops(ctx, a); break;
        case 'gorgon': drawGorgon(ctx, a); break;
        case 'golem': drawGolem(ctx, a); break;
        case 'lich': drawLich(ctx, a); break;
        case 'goblin':
          drawHumanoid(ctx, a, { palette: { skin: pal2.skin, cloth: pal2.cloth, metal: pal2.metal, hair: '#2a3a1a' }, weapon: a.def.ai === 'ranged' ? 'bow' : 'sword', eyeColor: '#ffdd44' });
          break;
        case 'orc':
          drawHumanoid(ctx, a, { palette: { skin: pal2.skin, cloth: pal2.cloth, metal: pal2.metal, hair: '#20180f', accent: pal2.metal }, weapon: a.def.ai === 'caster' ? 'staff' : 'axe', horns: true, hornColor: '#e8e0c8' });
          break;
        case 'skeleton':
          drawHumanoid(ctx, a, { palette: { skin: pal2.bone, cloth: pal2.cloth, metal: pal2.metal, hair: pal2.bone }, weapon: a.def.ai === 'ranged' ? 'bow' : 'sword', eyeColor: '#ff4a4a' });
          break;
        case 'zombie':
          drawHumanoid(ctx, a, { palette: { skin: pal2.skin, cloth: pal2.cloth, metal: '#7a7a7a', hair: '#3a3020' }, weapon: 'none', eyeColor: '#ffe' });
          break;
        case 'lizard':
          drawHumanoid(ctx, a, { palette: { skin: pal2.skin, cloth: pal2.cloth, metal: pal2.metal, hair: pal2.skin }, weapon: 'trident', horns: true, hornColor: U.shade(pal2.skin, -0.35), eyeColor: '#ffd24a' });
          break;
        case 'harpy':
          drawHarpy(ctx, a); break;
        case 'gargoyle':
          drawHumanoid(ctx, a, { palette: { skin: pal2.stone, cloth: U.shade(pal2.stone, -0.2), metal: pal2.stone, hair: pal2.stone }, weapon: 'none', horns: true, hornColor: U.shade(pal2.stone, -0.35), eyeColor: pal2.eye });
          drawWings(ctx, a, U.shade(pal2.stone, -0.25), 0.9);
          break;
        case 'cultist':
          drawHumanoid(ctx, a, { palette: { skin: pal2.skin, cloth: pal2.cloth, metal: '#8a8a8a', accent: pal2.accent, hair: '#20182a', cape: pal2.cloth }, weapon: 'staff', hood: true, glowEyes: '#ff5a7a' });
          break;
        case 'wraith':
          drawWraith(ctx, a); break;
        case 'darkknight':
          drawHumanoid(ctx, a, { palette: { skin: '#3a3a44', cloth: pal2.metal, metal: pal2.metal, accent: pal2.accent, hair: '#101018', cape: pal2.cape }, weapon: 'sword', helm: true, plate: true, glowEyes: '#ff3a3a' });
          break;
        default:
          drawHumanoid(ctx, a, { palette: pal2, weapon: 'sword' });
      }
    }
    if (a.flash > 0 || a.status.freeze || a.status.petrify) ctx.restore();
    ctx.restore();
    ctx.globalAlpha = 1;
    // Voile de givre par-dessus la silhouette gelée.
    if (a.status.freeze) {
      var fs = a.scale * depthScale(a.z);
      ctx.fillStyle = 'rgba(140,215,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(a.x, sy(a.z, a.y) - a.size.h * fs * 0.5,
        Math.min(70, a.size.w * fs * 0.7), Math.min(110, a.size.h * fs * 0.55), 0, 0, U.TAU);
      ctx.fill();
    }

    // Altérations : petites icônes flottantes
    drawStatusIcons(ctx, a);
  }

  function drawWings(ctx, a, color, mul) {
    var s = a.scale * depthScale(a.z) * (mul || 1), base = sy(a.z, a.y), f = a.facing;
    var flap = Math.sin(a.anim * 0.18) * 0.35;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    ctx.fillStyle = color;
    [-1, 1].forEach(function (side, i) {
      ctx.save();
      ctx.translate(-4 * s, -a.size.h * s * 0.72);
      ctx.rotate(side * (0.5 + flap) - 0.4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-26 * s, -26 * s, -44 * s, -4 * s);
      ctx.quadraticCurveTo(-26 * s, -2 * s, -20 * s, 16 * s);
      ctx.closePath();
      ctx.globalAlpha = i ? 0.95 : 0.7;
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawHarpy(ctx, a) {
    var pal = a.def.palette;
    drawWings(ctx, a, pal.feather, 1.2);
    drawHumanoid(ctx, a, {
      palette: { skin: pal.skin, cloth: pal.feather, metal: '#c8a24a', accent: pal.accent || '#e8c84a', hair: pal.hair },
      weapon: 'none', longHair: true, eyeColor: '#e8d24a'
    });
    // Serres
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y);
    ctx.strokeStyle = '#e8c84a'; ctx.lineWidth = 2 * s;
    [-8, 8].forEach(function (ox) {
      ctx.beginPath(); ctx.moveTo(a.x + ox * s, base - 4 * s); ctx.lineTo(a.x + ox * s + 5 * s * a.facing, base); ctx.stroke();
    });
  }

  function drawWraith(ctx, a) {
    var s = a.scale * depthScale(a.z), base = sy(a.z, a.y), f = a.facing;
    var pal = a.def.palette, t = a.anim * 0.06;
    ctx.save(); ctx.translate(a.x, base); ctx.scale(f, 1);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pal.cloth;
    ctx.beginPath();
    ctx.moveTo(-16 * s, -a.size.h * s * 0.85);
    ctx.quadraticCurveTo(-24 * s, -10 * s, -8 * s + Math.sin(t) * 5 * s, 2 * s);
    ctx.quadraticCurveTo(0, -6 * s, 10 * s + Math.sin(t + 1) * 5 * s, 2 * s);
    ctx.quadraticCurveTo(24 * s, -12 * s, 16 * s, -a.size.h * s * 0.85);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.ellipse(0, -a.size.h * s * 0.84, 12 * s, 13 * s, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = pal.glow;
    ctx.fillRect(2 * s, -a.size.h * s * 0.86, 4 * s, 3 * s);
    ctx.fillRect(-8 * s, -a.size.h * s * 0.86, 4 * s, 3 * s);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  var STATUS_ICON = { burn: '🔥', poison: '☠', freeze: '❄', stun: '★', curse: '✖', petrify: '⬢', regen: '✚' };
  function drawStatusIcons(ctx, a) {
    var keys = Object.keys(a.status);
    if (!keys.length) return;
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    var y = sy(a.z, a.y) - a.size.h * a.scale * depthScale(a.z) - 14;
    keys.slice(0, 4).forEach(function (k, i) {
      ctx.fillText(STATUS_ICON[k] || '?', a.x + (i - (keys.length - 1) / 2) * 13, y);
    });
  }

  /* ======================= Projectiles & décors ======================== */
  function drawProjectile(ctx, p) {
    var x = p.x, y = sy(p.z, p.y);
    ctx.save();
    switch (p.sprite) {
      case 'fire':
        ctx.fillStyle = U.rgba('#ff9a3a', 0.85);
        ctx.beginPath(); ctx.arc(x, y, 9 + Math.sin(p.anim * 0.4) * 2, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, U.TAU); ctx.fill();
        break;
      case 'ice':
        ctx.fillStyle = '#8ad8ff';
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.anim * 0.2);
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, -5); ctx.lineTo(12, 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      case 'dark':
        ctx.fillStyle = U.rgba('#a06ad0', 0.8);
        ctx.beginPath(); ctx.arc(x, y, 8, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#2a1038';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, U.TAU); ctx.fill();
        break;
      case 'arcane':
        ctx.fillStyle = U.rgba('#c88aff', 0.85);
        ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(p.anim * 0.5) * 2, 0, U.TAU); ctx.fill();
        break;
      default:
        ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 2.4;
        var ang = Math.atan2(-p.vy, p.vx);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(9, 0); ctx.stroke();
        ctx.fillStyle = '#c8d0d8';
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(3, -3); ctx.lineTo(3, 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#c85a5a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-6, -3); ctx.moveTo(-11, 0); ctx.lineTo(-6, 3); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
  }

  function drawProp(ctx, pr, world) {
    var x = pr.x, y = sy(pr.z, 0);
    if (pr.type === 'chest') {
      drawShadow(ctx, x, pr.z, 1, 16);
      var open = pr.opened;
      ctx.fillStyle = pr.big ? '#8a5a2a' : '#6a4a2a';
      ctx.fillRect(x - 18, y - 20, 36, 20);
      ctx.fillStyle = pr.big ? '#d8b45a' : '#b09040';
      ctx.fillRect(x - 18, y - 12, 36, 4);
      ctx.save(); ctx.translate(x - 18, y - 20);
      if (open) ctx.rotate(-1.1);
      ctx.fillStyle = pr.big ? '#a06a30' : '#7a5530';
      ctx.fillRect(0, -12, 36, 13);
      ctx.fillStyle = pr.big ? '#e8c86a' : '#b09040';
      ctx.fillRect(0, -12, 36, 3);
      ctx.restore();
      if (!open) {
        ctx.fillStyle = '#ffd24a';
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(pr.anim * 2);
        ctx.fillRect(x - 3, y - 14, 6, 6);
        ctx.globalAlpha = 1;
        drawPrompt(ctx, x, y - 40, '↑', world);
      }
    } else if (pr.type === 'barrel') {
      drawShadow(ctx, x, pr.z, 1, 12);
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(x - 12, y - 26, 24, 26);
      ctx.fillStyle = '#5a3f24';
      ctx.fillRect(x - 12, y - 20, 24, 3);
      ctx.fillRect(x - 12, y - 9, 24, 3);
      ctx.fillStyle = '#8a6540';
      ctx.beginPath(); ctx.ellipse(x, y - 26, 12, 4, 0, 0, U.TAU); ctx.fill();
    } else if (pr.type === 'exit') {
      var open2 = world.exitOpen;
      ctx.fillStyle = open2 ? U.rgba('#ffd24a', 0.16 + 0.1 * Math.sin(pr.anim * 3)) : 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 26, y - 130, 52, 130);
      ctx.strokeStyle = open2 ? '#ffd24a' : '#4a4a5a';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 26, y - 130, 52, 130);
      if (open2) {
        ctx.fillStyle = '#ffd24a';
        ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('→', x, y - 60 + Math.sin(pr.anim * 3) * 4);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('SORTIE', x, y - 20);
      }
    }
  }

  function drawPrompt(ctx, x, y, text, world) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.arc(x, y, 11, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }

  function drawDrop(ctx, d) {
    var x = d.x, y = sy(d.z, d.y);
    var bob = Math.sin(d.anim) * 2;
    drawShadow(ctx, d.x, d.z, 0.5, 10);
    if (d.drop.type === 'gold') {
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.ellipse(x, y + bob, 7, 8, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#c8a020';
      ctx.beginPath(); ctx.ellipse(x, y + bob, 3.4, 4.6, 0, 0, U.TAU); ctx.fill();
      return;
    }
    var it = d.drop.item;
    var col = DC.Items.itemColor(it);
    // Halo pour les objets précieux
    if (it.kind === 'equip' && DC.Items.rarityIndex(it.rarity) >= 2) {
      ctx.fillStyle = U.rgba(col, 0.18 + 0.12 * Math.sin(d.anim * 2));
      ctx.beginPath(); ctx.arc(x, y + bob - 4, 18, 0, U.TAU); ctx.fill();
    }
    ctx.save(); ctx.translate(x, y + bob - 6);
    if (it.kind === 'consumable') {
      var c = DC.Items.consumable(it.id);
      ctx.fillStyle = c ? c.color : '#ccc';
      ctx.fillRect(-5, -6, 10, 12);
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-2.5, -10, 5, 5);
    } else if (it.kind === 'treasure') {
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 0); ctx.lineTo(0, 9); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = col;
      if (it.slot === 'weapon') { ctx.fillRect(-2, -11, 4, 20); ctx.fillRect(-6, 3, 12, 3); }
      else if (it.slot === 'armor') { ctx.fillRect(-7, -8, 14, 16); ctx.fillStyle = U.shade(col, -0.3); ctx.fillRect(-7, -8, 14, 4); }
      else { ctx.beginPath(); ctx.arc(0, 0, 7, 0, U.TAU); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); }
    }
    ctx.restore();
  }

  /* ============================ Effets ================================= */
  function drawFx(ctx, fx) {
    var i;
    for (i = 0; i < fx.rings.length; i++) {
      var r = fx.rings[i];
      var a = r.life / r.maxLife;
      ctx.strokeStyle = U.rgba(r.color, a * 0.8);
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.ellipse(r.x, sy(r.z, r.y), r.r, r.r * 0.34, 0, 0, U.TAU);
      ctx.stroke();
    }
    for (i = 0; i < fx.parts.length; i++) {
      var p = fx.parts[i];
      var al = p.fade ? p.life / p.maxLife : 1;
      ctx.fillStyle = U.rgba(p.color, U.clamp(al, 0, 1));
      var px = p.x, py = sy(p.z, p.y);
      ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
    }
  }

  function drawNumbers(ctx, fx) {
    ctx.textAlign = 'center';
    for (var i = 0; i < fx.numbers.length; i++) {
      var n = fx.numbers[i];
      var a = U.clamp(n.life / n.maxLife * 1.6, 0, 1);
      ctx.font = (n.bold ? 'bold ' : '') + n.size + 'px "Trebuchet MS", sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = U.rgba('#000000', a * 0.85);
      ctx.strokeText(n.text, n.x, sy(n.z, n.y));
      ctx.fillStyle = U.rgba(n.color, a);
      ctx.fillText(n.text, n.x, sy(n.z, n.y));
    }
  }

  function drawFields(ctx, world) {
    world.fields.forEach(function (f) {
      var y = sy(f.z, 0);
      if (f.type === 'gravity') {
        var pulse = 0.5 + 0.5 * Math.sin(f.tick * 0.15);
        ctx.fillStyle = U.rgba('#8a4ad0', 0.14 + pulse * 0.1);
        ctx.beginPath(); ctx.ellipse(f.x, y, f.r, f.r * 0.36, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = U.rgba('#c88aff', 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(f.x, y, f.r * (0.4 + pulse * 0.5), f.r * 0.36 * (0.4 + pulse * 0.5), 0, 0, U.TAU); ctx.stroke();
      } else if (f.type === 'rain') {
        ctx.fillStyle = U.rgba('#9ad8a0', 0.10);
        ctx.beginPath(); ctx.ellipse(f.x, y, f.r * 0.5, f.w * 0.5 * 0.36, 0, 0, U.TAU); ctx.fill();
      }
    });
  }

  /* ============================ Scène ================================== */
  function drawScene(ctx, world) {
    var theme = world.stage().theme;
    ctx.save();
    var shake = world.fx.shake;
    var ox = shake ? (Math.random() - 0.5) * shake : 0;
    var oy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(ox, oy);

    drawSky(ctx, theme, world.camX);
    drawParallax(ctx, theme, world.camX);
    drawGround(ctx, theme, world.camX, world);

    ctx.save();
    ctx.translate(-world.camX, 0);

    drawFields(ctx, world);

    // Tri par profondeur : ce qui est devant se dessine en dernier.
    var renderables = [];
    world.props.forEach(function (p) { renderables.push({ z: p.z - (p.type === 'exit' ? 200 : 0), kind: 'prop', o: p }); });
    world.drops.forEach(function (d) { renderables.push({ z: d.z - 1, kind: 'drop', o: d }); });
    world.enemies.forEach(function (e) { renderables.push({ z: e.z, kind: 'actor', o: e }); });
    world.players.forEach(function (p) { renderables.push({ z: p.z + 0.5, kind: 'actor', o: p }); });
    world.projectiles.forEach(function (p) { renderables.push({ z: p.z + 0.2, kind: 'proj', o: p }); });
    renderables.sort(function (a, b) { return a.z - b.z; });

    renderables.forEach(function (r) {
      if (r.kind === 'prop') drawProp(ctx, r.o, world);
      else if (r.kind === 'drop') drawDrop(ctx, r.o);
      else if (r.kind === 'proj') drawProjectile(ctx, r.o);
      else drawActor(ctx, r.o);
    });

    drawFx(ctx, world.fx);
    drawOverheadBars(ctx, world);
    drawNumbers(ctx, world.fx);

    // Flèches indiquant les ennemis hors écran
    drawOffscreenMarkers(ctx, world);

    ctx.restore();

    // Éclair plein écran
    if (world.fx.flashAlpha > 0.01) {
      ctx.fillStyle = U.rgba(world.fx.flashColor, world.fx.flashAlpha);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Vignette
    var vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.4, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  function drawOverheadBars(ctx, world) {
    // Barres de vie des ennemis d'élite et marqueurs de joueurs
    world.enemies.forEach(function (e) {
      if (e.dead || e.boss) return;
      if (!e.elite && e.hp === e.maxHp) return;
      var s = e.scale * depthScale(e.z);
      var w = Math.max(28, e.size.w * s * 1.3);
      var y = sy(e.z, e.y) - e.size.h * s - (e.elite ? 20 : 12);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w / 2, y, w, 4);
      ctx.fillStyle = e.elite ? '#ffb24a' : '#d84a4a';
      ctx.fillRect(e.x - w / 2, y, w * (e.hp / e.maxHp), 4);
      if (e.elite) {
        ctx.fillStyle = '#ffb24a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('ÉLITE ' + e.name.toUpperCase(), e.x, y - 3);
      }
    });
    world.players.forEach(function (p, i) {
      var col = PLAYER_COLORS[p.slot % 4];
      var s = depthScale(p.z);
      var y = sy(p.z, p.y) - p.size.h * s - 16;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(p.x, y + 8); ctx.lineTo(p.x - 6, y); ctx.lineTo(p.x + 6, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('J' + (p.slot + 1), p.x, y - 2);
      if (p.isDowned) {
        ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText('À TERRE ! ↑', p.x, sy(p.z, 0) - 26);
        var pct = U.clamp((p.reviveProgress || 0) / 70, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - 22, sy(p.z, 0) - 20, 44, 5);
        ctx.fillStyle = '#6fd66f'; ctx.fillRect(p.x - 22, sy(p.z, 0) - 20, 44 * pct, 5);
      }
    });
    // Télégraphes de boss
    world.fx.telegraphs.forEach(function (t) {
      if (t.actor.dead) return;
      var pct = 1 - t.life / t.maxLife;
      var s = t.actor.scale * depthScale(t.actor.z);
      var y = sy(t.actor.z, t.actor.y) - t.actor.size.h * s - 34;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(t.actor.x - 50, y, 100, 7);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(t.actor.x - 50, y, 100 * pct, 7);
      ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t.name, t.actor.x, y - 3);
    });
  }

  function drawOffscreenMarkers(ctx, world) {
    world.enemies.forEach(function (e) {
      if (e.dead) return;
      var sxp = e.x - world.camX;
      if (sxp > -20 && sxp < VIEW_W + 20) return;
      var edge = sxp < 0 ? 16 : VIEW_W - 16;
      ctx.fillStyle = U.rgba('#ff5a5a', 0.75);
      ctx.beginPath();
      var yy = sy(e.z, 0) - 30;
      if (sxp < 0) { ctx.moveTo(world.camX + edge - 8, yy); ctx.lineTo(world.camX + edge + 4, yy - 7); ctx.lineTo(world.camX + edge + 4, yy + 7); }
      else { ctx.moveTo(world.camX + edge + 8, yy); ctx.lineTo(world.camX + edge - 4, yy - 7); ctx.lineTo(world.camX + edge - 4, yy + 7); }
      ctx.closePath(); ctx.fill();
    });
  }

  var PLAYER_COLORS = ['#4aa3ff', '#ff5a5a', '#6fd66f', '#ffd24a'];

  return {
    drawScene: drawScene, drawActor: drawActor, drawHumanoid: drawHumanoid,
    sy: sy, HORIZON: HORIZON, VIEW_W: VIEW_W, VIEW_H: VIEW_H,
    PLAYER_COLORS: PLAYER_COLORS, depthScale: depthScale
  };
})();

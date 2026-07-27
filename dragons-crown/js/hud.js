/* =========================================================================
 * ATH en jeu : panneaux des 4 joueurs, boss, progression, messages
 * ====================================================================== */
'use strict';

DC.Hud = (function () {

  var U = DC.U, R = DC.Render;
  var VIEW_W = R.VIEW_W, VIEW_H = R.VIEW_H;
  var COLORS = R.PLAYER_COLORS;

  function bar(ctx, x, y, w, h, pct, color, bg) {
    ctx.fillStyle = bg || 'rgba(0,0,0,0.65)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * U.clamp(pct, 0, 1)), h - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /** Tronque un texte pour tenir dans la largeur donnée. */
  function clip(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    var s = text;
    while (s.length > 2 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function portrait(ctx, x, y, size, cls, col) {
    ctx.fillStyle = 'rgba(10,12,18,0.9)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    var pal = cls.palette;
    // Buste stylisé
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 2, y + 2, size - 4, size - 4); ctx.clip();
    ctx.fillStyle = U.rgba(pal.cloth, 0.9);
    ctx.fillRect(x + 2, y + size * 0.62, size - 4, size * 0.4);
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.ellipse(x + size / 2, y + size * 0.5, size * 0.22, size * 0.26, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = pal.hair;
    ctx.beginPath(); ctx.arc(x + size / 2, y + size * 0.44, size * 0.24, Math.PI * 0.92, Math.PI * 2.1); ctx.fill();
    ctx.fillStyle = '#20181a';
    ctx.fillRect(x + size * 0.55, y + size * 0.48, size * 0.07, size * 0.05);
    ctx.restore();
  }

  function playerPanel(ctx, p, idx, total) {
    var col = COLORS[p.slot % 4];
    var w = 226, h = 62;
    var pad = 8;
    var x, y;
    // Deux en haut à gauche/droite, deux en dessous — lisible jusqu'à 4 joueurs.
    if (idx === 0) { x = pad; y = pad; }
    else if (idx === 1) { x = VIEW_W - w - pad; y = pad; }
    else if (idx === 2) { x = pad; y = pad + h + 6; }
    else { x = VIEW_W - w - pad; y = pad + h + 6; }

    ctx.fillStyle = 'rgba(8,10,16,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = U.rgba(col, 0.7); ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    portrait(ctx, x + 4, y + 4, 54, p.cls, col);

    var bx = x + 64, bw = w - 72;
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = col;
    var tag = 'J' + (p.slot + 1) + (p.ai ? ' IA' : '');
    ctx.fillText(tag, bx, y + 14);
    var tagW = ctx.measureText(tag).width + 7;
    ctx.fillStyle = '#e8e8f0';
    ctx.font = '11px "Trebuchet MS", sans-serif';
    ctx.fillText(clip(ctx, p.name, bw - tagW - 42) + ' · Nv ' + p.hero.level, bx + tagW, y + 14);

    bar(ctx, bx, y + 18, bw, 10, p.hp / p.maxHp, p.isDowned ? '#5a2a2a' : '#d8404a');
    ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif';
    ctx.fillText(Math.ceil(p.hp) + ' / ' + p.maxHp, bx + 4, y + 27);

    bar(ctx, bx, y + 30, bw * 0.62, 7, p.mp / p.maxMp, '#4a7ad8');
    // Jauge de super prête
    var superReady = p.mp >= p.mpCost(p.cls.super.mp) && p.superCd === 0;
    ctx.fillStyle = superReady ? '#ffd24a' : 'rgba(255,255,255,0.25)';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(superReady ? '★ SUPER' : '☆', bx + bw * 0.66, y + 37);

    // Vies / flèches / objet équipé
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#e8c84a';
    var info = '♥×' + p.lives;
    if (p.cls.weapon === 'bow') info += '   ➹ ' + p.arrows;
    ctx.fillText(info, bx, y + 50);

    // Objet actif de la besace
    var pouch = p.world.run.pouch;
    if (pouch.length) {
      var stack = pouch[p.world.run.pouchIdx % pouch.length];
      var c = DC.Items.consumable(stack.id);
      if (c) {
        ctx.fillStyle = p.itemFlash > 0 ? '#fff' : c.color;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(clip(ctx, c.name, 96) + ' ×' + stack.qty, x + w - 8, y + 50);
        ctx.textAlign = 'left';
      }
    }

    // Altérations
    var st = Object.keys(p.status);
    if (st.length) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ff9a5a';
      ctx.textAlign = 'right';
      ctx.fillText(st.join(' '), x + w - 8, y + 14);
      ctx.textAlign = 'left';
    }
  }

  function bossBar(ctx, boss) {
    var w = 520, x = (VIEW_W - w) / 2, y = VIEW_H - 66;
    ctx.fillStyle = 'rgba(6,6,10,0.8)';
    ctx.fillRect(x - 4, y - 20, w + 8, 34);
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name.toUpperCase() + '   —   Phase ' + boss.phase, VIEW_W / 2, y - 6);
    bar(ctx, x, y, w, 14, boss.hp / boss.maxHp, boss.phase >= 3 ? '#ff3a3a' : '#d8404a');
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif';
    ctx.fillText(U.fmtNum(boss.hp) + ' / ' + U.fmtNum(boss.maxHp), VIEW_W / 2, y + 11);
  }

  function roomProgress(ctx, world) {
    var rooms = world.rooms();
    var w = 210, x = VIEW_W / 2 - w / 2, y = 10;
    ctx.fillStyle = 'rgba(8,10,16,0.7)';
    ctx.fillRect(x, y, w, 34);
    ctx.strokeStyle = 'rgba(255,210,74,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 33);
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.stage().name + (world.run.route === 'b' ? ' — voie B' : ''), VIEW_W / 2, y + 13);
    // Pastilles de salles
    var n = rooms.length;
    for (var i = 0; i < n; i++) {
      var cx = x + 16 + i * ((w - 32) / Math.max(1, n - 1));
      var isBoss = rooms[i].type === 'boss';
      ctx.beginPath();
      ctx.arc(cx, y + 24, isBoss ? 6 : 4.5, 0, U.TAU);
      ctx.fillStyle = i < world.roomIdx ? '#6fd66f' : (i === world.roomIdx ? '#ffd24a' : 'rgba(255,255,255,0.25)');
      ctx.fill();
      if (isBoss) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  }

  function combo(ctx, world) {
    if (world.hitCombo.count < 3) return;
    var a = U.clamp(world.hitCombo.t / 40, 0, 1);
    var scale = 1 + Math.min(0.5, world.hitCombo.count / 60);
    ctx.save();
    ctx.translate(VIEW_W - 92, 212);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.strokeStyle = U.rgba('#000000', a * 0.8); ctx.lineWidth = 4;
    ctx.strokeText(world.hitCombo.count, 0, 0);
    ctx.fillStyle = U.rgba(world.hitCombo.count > 30 ? '#ff5a7a' : '#ffd24a', a);
    ctx.fillText(world.hitCombo.count, 0, 0);
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = U.rgba('#e8e8f0', a);
    ctx.fillText('COUPS', 0, 16);
    ctx.restore();
  }

  function toasts(ctx, world) {
    ctx.textAlign = 'center';
    world.toasts.forEach(function (t, i) {
      var a = U.clamp(t.life / 40, 0, 1);
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.strokeStyle = U.rgba('#000000', a * 0.8); ctx.lineWidth = 3;
      var y = VIEW_H - 110 - i * 22;
      ctx.strokeText(t.text, VIEW_W / 2, y);
      ctx.fillStyle = U.rgba('#ffe8b0', a);
      ctx.fillText(t.text, VIEW_W / 2, y);
    });
  }

  function banner(ctx, world) {
    var b = world.fx.banner;
    if (!b) return;
    var a = U.clamp(b.life / 25, 0, 1);
    var t = 1 - b.life / b.maxLife;
    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H * 0.34);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-VIEW_W / 2, -34, VIEW_W, 62);
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px "Trebuchet MS", sans-serif';
    ctx.strokeStyle = '#20140a'; ctx.lineWidth = 5;
    ctx.strokeText(b.text, 0, 0);
    var g = ctx.createLinearGradient(0, -30, 0, 8);
    g.addColorStop(0, '#fff4c0'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, '#d88a1a');
    ctx.fillStyle = g;
    ctx.fillText(b.text, 0, 0);
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText(b.sub || '', 0, 20);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function transition(ctx, world) {
    if (world.state !== 'transition') return;
    var t = world.transT;
    var a = t < 30 ? t / 30 : (60 - t) / 30;
    ctx.fillStyle = U.rgba('#000000', U.clamp(a, 0, 1));
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function runStats(ctx, world) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffd24a';
    ctx.fillText('◉ ' + U.fmtNum(world.run.gold), VIEW_W - 12, VIEW_H - 14);
    ctx.font = '11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(232,232,240,0.8)';
    ctx.fillText(world.run.bag.length + ' objet(s) ramassé(s)', VIEW_W - 12, VIEW_H - 30);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,232,240,0.55)';
    ctx.font = '10px "Trebuchet MS", sans-serif';
    ctx.fillText('Échap : pause   ·   ↑ : interagir   ·   Q/E : objet suivant', 12, VIEW_H - 14);
  }

  function draw(ctx, world) {
    world.players.forEach(function (p, i) { playerPanel(ctx, p, i, world.players.length); });
    roomProgress(ctx, world);
    if (world.bossRef && !world.bossRef.dead && world.combatActive) bossBar(ctx, world.bossRef);
    combo(ctx, world);
    toasts(ctx, world);
    runStats(ctx, world);
    banner(ctx, world);
    transition(ctx, world);
  }

  return { draw: draw, bar: bar, portrait: portrait };
})();

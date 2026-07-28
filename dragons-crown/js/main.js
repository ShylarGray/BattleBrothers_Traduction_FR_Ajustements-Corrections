/* =========================================================================
 * Boucle principale : états du jeu, expéditions, mise à l'échelle du canevas
 * ====================================================================== */
'use strict';

DC.Game = (function () {

  var U = DC.U, R = DC.Render;
  var VIEW_W = R.VIEW_W, VIEW_H = R.VIEW_H;
  var STEP = 1000 / 60;

  function Game() {
    this.profile = DC.Save.load() || DC.Save.fresh();
    this.state = 'menu';         // 'menu' | 'playing' | 'paused'
    this.world = null;
    this.canvas = null;
    this.ctx = null;
    this.acc = 0;
    this.last = 0;
    this.frames = 0;
    this.fps = 60;
    this.fpsT = 0;
    this.shopCache = null;
    this.shopCacheDay = -1;
    this.titleT = 0;
  }

  Game.prototype.init = function () {
    var self = this;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;

    DC.Input.init();
    DC.UI.init(this);
    // Le calque tactile vit dans #app : il suit la mise à l'échelle du canevas.
    var s = this.profile.settings;
    if (s.touch === undefined) s.touch = DC.Touch.supported();
    DC.Touch.init(document.getElementById('app'), { enabled: s.touch, slot: 0 });
    DC.Hero.setBlessings(this.profile.blessings || {});
    DC.Audio.setVolumes(this.profile.settings);

    // Le contexte audio ne démarre qu'après une interaction utilisateur.
    var unlock = function () {
      DC.Audio.unlock();
      if (self.state === 'menu') DC.Audio.playMusic('town');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // Le changement d'orientation ne produit pas toujours un « resize », et les
    // dimensions ne sont pas fiables immédiatement après : on remesure plusieurs
    // fois, ce qui coûte trois appels et évite un cadrage figé sur l'ancien format.
    var remeasure = function () {
      self.resize();
      [60, 200, 500].forEach(function (d) { setTimeout(function () { self.resize(); }, d); });
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () { self.resize(); });
    }
    // Un panneau redimensionné par la page hôte n'émet aucun évènement fenêtre.
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); })
        .observe(document.getElementById('stage-wrap'));
    }
    this.resize();

    DC.Input.onKeyDown(function (code) { self.onKey(code); });

    DC.UI.show('title');
    this.last = performance.now();
    requestAnimationFrame(function (t) { self.loop(t); });
  };

  Game.prototype.resize = function () {
    var wrap = document.getElementById('app');
    // visualViewport donne la zone réellement visible sur mobile, barres
    // d'outils déduites ; innerWidth/innerHeight la surestiment souvent.
    var vv = window.visualViewport;
    var sw = (vv && vv.width) || window.innerWidth;
    var sh = (vv && vv.height) || window.innerHeight;
    var scale = Math.min(sw / VIEW_W, sh / VIEW_H);
    wrap.style.width = VIEW_W + 'px';
    wrap.style.height = VIEW_H + 'px';
    wrap.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';

    // Les menus sont dans le cadre du jeu, donc réduits avec lui. En dessous
    // d'une certaine échelle ils deviennent illisibles et intouchables : on les
    // contre-agrandit pour garder une taille utile, sans jamais les grossir
    // au-delà du rendu prévu sur grand écran.
    var boost = U.clamp(0.62 / Math.max(scale, 0.01), 1, 1.9);
    wrap.style.setProperty('--ui-boost', boost.toFixed(3));
  };

  Game.prototype.onKey = function (code) {
    if (code === 'Escape') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (this.state === 'playing' && this.world) {
      var run = this.world.run;
      if (code === 'KeyE') { run.pouchIdx = (run.pouchIdx + 1) % Math.max(1, run.pouch.length); DC.Audio.play('menu', 0.3); }
      if (code === 'KeyQ') { run.pouchIdx = (run.pouchIdx - 1 + Math.max(1, run.pouch.length)) % Math.max(1, run.pouch.length); DC.Audio.play('menu', 0.3); }
    }
  };

  Game.prototype.saveProfile = function () {
    this.profile.blessings = this.profile.blessings || {};
    DC.Hero.setBlessings(this.profile.blessings);
    DC.Save.save(this.profile);
  };

  /* ========================== Expéditions ============================== */
  Game.prototype.startRun = function (stageId, route, diffId) {
    var p = this.profile;
    var st = DC.Stages.byId(stageId);
    var party = [];
    for (var i = 0; i < 4; i++) {
      var uid = p.party[i];
      if (!uid || p.controls[i] === 'none') { party.push(null); continue; }
      var hero = p.heroes.filter(function (h) { return h.uid === uid; })[0];
      if (!hero) { party.push(null); continue; }
      party.push({ hero: hero, mode: p.controls[i], controller: i });
    }
    if (!party.some(Boolean)) { DC.UI.toast('Aucun héros dans le groupe.'); DC.UI.show('roster'); return; }

    var diff = DC.Stages.difficulty(diffId);
    var run = {
      stageId: stageId, route: route, difficulty: diffId,
      level: st.level + (diff.unlockAt * 4),
      seed: (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0,
      party: party,
      gold: 0, bag: [], kills: 0, bestCombo: 0,
      pouch: p.pouch.map(function (s) { return { kind: 'consumable', id: s.id, qty: s.qty }; }),
      pouchIdx: 0,
      startXp: {},
      startLevel: {},
      time: 0
    };
    party.forEach(function (e) {
      if (!e) return;
      run.startXp[e.hero.uid] = e.hero.xp;
      run.startLevel[e.hero.uid] = e.hero.level;
      e.hero.stats.runs++;
    });

    this.world = new DC.World(this);
    this.world.startRun(run);
    this.state = 'playing';
    DC.UI.hide();
  };

  Game.prototype.onRunEnd = function (victory, reason) {
    var self = this;
    var p = this.profile, run = this.world.run;

    // Seul le butin de la salle en cours est en jeu : tout ce qui a franchi une
    // porte a déjà été versé au profil par World.bankProgress().
    // Une défaite ne coûte que les trouvailles ordinaires — la pièce rare qui
    // rendait l'expédition mémorable est toujours conservée, sinon la perte
    // est une loterie que le joueur ne peut pas raconter.
    var bag = run.bag.slice();
    if (!victory && reason !== 'retreat') {
      bag = bag.filter(function (it) {
        return it.kind !== 'equip' || DC.Items.rarityIndex(it.rarity) >= 3;
      });
    }
    bag.forEach(function (it) { p.storage.push(it); });
    var lost = victory ? 1 : (reason === 'retreat' ? 0.8 : 0.7);
    var goldGain = Math.floor(run.gold * lost) + (run.banked || 0);
    p.gold += Math.floor(run.gold * lost);
    p.stats.goldEarned += goldGain;
    p.stats.kills += run.kills;
    p.stats.runs++;
    if (run.bestCombo > p.stats.bestCombo) p.stats.bestCombo = run.bestCombo;

    // Consommation réelle de la besace
    p.pouch = run.pouch.map(function (s) { return { kind: 'consumable', id: s.id, qty: s.qty }; })
      .filter(function (s) { return s.qty > 0; });

    if (victory) {
      p.stats.wins++;
      p.progress.cleared[run.stageId] = true;
      var diffIdx = DC.Stages.DIFFICULTIES.map(function (d) { return d.id; }).indexOf(run.difficulty);
      // Terminer le dernier donjon débloque la difficulté suivante.
      var lastStage = DC.Stages.LIST[DC.Stages.LIST.length - 1];
      if (run.stageId === lastStage.id && p.progress.unlockedDiff < diffIdx + 2) {
        p.progress.unlockedDiff = Math.min(DC.Stages.DIFFICULTIES.length, diffIdx + 2);
        DC.UI.toast('Nouvelle difficulté débloquée !');
      }
      var key = run.stageId + '_' + run.difficulty;
      if (!p.progress.bestClear[key] || run.time < p.progress.bestClear[key]) p.progress.bestClear[key] = run.time;
      run.party.forEach(function (e) { if (e) e.hero.stats.bosses++; });
    }

    var heroes = run.party.filter(Boolean).map(function (e) {
      return {
        name: e.hero.name,
        xp: e.hero.xp - (run.startXp[e.hero.uid] || 0),
        levels: e.hero.level - (run.startLevel[e.hero.uid] || e.hero.level)
      };
    });

    this.saveProfile();
    this.shopCache = null;

    // Petite pause avant l'écran de résultats, pour laisser respirer l'action.
    setTimeout(function () {
      self.state = 'menu';
      self.world = null;
      DC.Audio.playMusic('town');
      DC.UI.show('results', {
        result: {
          victory: victory, gold: goldGain, kills: run.kills, reason: reason,
          bestCombo: run.bestCombo, time: run.time,
          bag: (run.bankedBag || []).concat(bag), heroes: heroes
        }
      });
    }, 1400);
  };

  Game.prototype.abandonRun = function () {
    if (!this.world) return;
    this.state = 'playing';
    DC.UI.hide();
    this.world.finishRun(false, 'retreat');
  };

  Game.prototype.pause = function () {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    DC.UI.show('pause');
  };
  Game.prototype.resume = function () {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    DC.UI.hide();
  };

  /* ============================= Boucle ================================ */
  Game.prototype.loop = function (now) {
    var self = this;
    var dt = Math.min(100, now - this.last);
    this.last = now;
    this.acc += dt;
    this.fpsT += dt;
    this.frames++;
    if (this.fpsT > 500) { this.fps = Math.round(this.frames / (this.fpsT / 1000)); this.frames = 0; this.fpsT = 0; }

    var steps = 0;
    while (this.acc >= STEP && steps < 5) {
      this.acc -= STEP;
      steps++;
      DC.Input.update();
      this.tick();
    }
    this.draw();
    requestAnimationFrame(function (t) { self.loop(t); });
  };

  Game.prototype.tick = function () {
    if (this.state === 'playing' && this.world) {
      this.world.run.time++;
      this.world.update();
      // Bouton Start d'une manette : met en pause.
      if (DC.Input.anyPressed('start')) this.pause();
    } else if (this.state === 'menu') {
      this.titleT++;
      // Permet de rejoindre une manette depuis les menus.
      if (this.titleT % 60 === 0) DC.Input.scanPads();
    }
  };

  Game.prototype.draw = function () {
    var ctx = this.ctx;
    DC.Touch.setVisible(this.state === 'playing' && !!this.world);
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.world && (this.state === 'playing' || this.state === 'paused')) {
      R.drawScene(ctx, this.world);
      DC.Hud.draw(ctx, this.world);
      if (this.state === 'paused') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    } else {
      this.drawMenuBackdrop(ctx);
    }
    ctx.restore();
  };

  // Décor animé derrière les menus : silhouettes et braises.
  Game.prototype.drawMenuBackdrop = function (ctx) {
    var t = this.titleT;
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0c0a16');
    g.addColorStop(0.5, '#241a30');
    g.addColorStop(1, '#4a2a30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Lune
    ctx.fillStyle = 'rgba(255,226,170,0.16)';
    ctx.beginPath(); ctx.arc(760, 120, 70, 0, U.TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,190,0.85)';
    ctx.beginPath(); ctx.arc(760, 120, 44, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#241a30';
    ctx.beginPath(); ctx.arc(736, 108, 42, 0, U.TAU); ctx.fill();

    // Silhouettes de tours
    ctx.fillStyle = 'rgba(10,8,16,0.85)';
    for (var i = 0; i < 12; i++) {
      var x = i * 92 + Math.sin(i * 2.3) * 20;
      var h = 130 + Math.abs(Math.sin(i * 1.7)) * 190;
      ctx.fillRect(x, VIEW_H - h, 64, h);
      ctx.beginPath();
      ctx.moveTo(x - 8, VIEW_H - h);
      ctx.lineTo(x + 32, VIEW_H - h - 44);
      ctx.lineTo(x + 72, VIEW_H - h);
      ctx.closePath(); ctx.fill();
    }

    // Braises montantes
    for (var e = 0; e < 60; e++) {
      var ex = (e * 137 + t * (0.4 + (e % 5) * 0.15)) % VIEW_W;
      var ey = VIEW_H - ((t * (0.6 + (e % 7) * 0.2) + e * 90) % (VIEW_H + 80));
      var a = 0.15 + 0.35 * Math.abs(Math.sin(e + t * 0.02));
      ctx.fillStyle = 'rgba(255,170,80,' + a.toFixed(2) + ')';
      ctx.fillRect(ex, ey, 2.5, 2.5);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  };

  return Game;
})();

/* ------------------------------ Démarrage ------------------------------ */
window.addEventListener('DOMContentLoaded', function () {
  var g = new DC.Game();
  window.dcGame = g;   // pratique pour inspecter l'état en console
  g.init();
});

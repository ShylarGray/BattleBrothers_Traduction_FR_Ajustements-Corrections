/* =========================================================================
 * Commandes tactiles : manche virtuel + boutons pour jouer au doigt.
 *
 * Le module n'écrit jamais dans la logique de jeu : il alimente la même
 * manette virtuelle que le clavier et les manettes (DC.Input), si bien que le
 * moteur ignore complètement d'où vient l'entrée.
 *
 * Les coordonnées sont exprimées dans l'espace du jeu (960 × 540) : le conteneur
 * est mis à l'échelle avec le canevas, donc la disposition suit l'écran.
 * ====================================================================== */
'use strict';

DC.Touch = (function () {

  var VIEW_W = 960, VIEW_H = 540;
  var STICK = { x: 132, y: 392, base: 62, knob: 30, dead: 0.16 };

  /* Chaque bouton pousse un ou plusieurs boutons de la manette virtuelle.
   * « Lourde » et « Super » réutilisent le modificateur Bas du clavier, ce qui
   * évite de dupliquer la moindre règle de jeu. */
  var BUTTONS = [
    { id: 'attack', label: '⚔', name: 'Attaque', keys: ['attack'], x: 852, y: 428, r: 46, tone: 'main' },
    { id: 'jump', label: '⤴', name: 'Saut', keys: ['jump'], x: 762, y: 372, r: 34, tone: 'alt' },
    { id: 'special', label: '✦', name: 'Magie', keys: ['special'], x: 744, y: 466, r: 34, tone: 'magic' },
    { id: 'heavy', label: '⚔▾', name: 'Lourde', keys: ['attack', 'down'], x: 906, y: 340, r: 27, tone: 'small' },
    { id: 'super', label: '★', name: 'Super', keys: ['special', 'down'], x: 836, y: 316, r: 27, tone: 'super' },
    { id: 'item', label: '🧪', name: 'Objet', keys: ['item'], x: 660, y: 396, r: 27, tone: 'small' },
    { id: 'up', label: '↑', name: 'Agir', keys: ['up'], x: 660, y: 470, r: 27, tone: 'small' },
    { id: 'start', label: '❚❚', name: 'Pause', keys: ['start'], x: 480, y: 508, r: 21, tone: 'tiny' }
  ];

  var host = null, layer = null, knobEl = null, baseEl = null;
  var visible = false, enabled = true;
  var stick = { id: null, dx: 0, dy: 0 };
  var down = {};      // bouton tactile physiquement enfoncé
  var latch = {};     // images restantes : garantit qu'une tape brève est vue
  var pointerBtn = {};// pointerId -> id de bouton
  var slot = 0;

  function supported() {
    return (typeof window !== 'undefined') &&
      (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0);
  }

  /* --------------------------- Construction --------------------------- */
  function build() {
    layer = document.createElement('div');
    layer.id = 'touch-layer';
    layer.setAttribute('aria-hidden', 'true');

    var zone = document.createElement('div');
    zone.className = 'touch-stickzone';
    layer.appendChild(zone);

    baseEl = document.createElement('div');
    baseEl.className = 'touch-base';
    baseEl.style.left = (STICK.x - STICK.base) + 'px';
    baseEl.style.top = (STICK.y - STICK.base) + 'px';
    baseEl.style.width = baseEl.style.height = (STICK.base * 2) + 'px';
    layer.appendChild(baseEl);

    knobEl = document.createElement('div');
    knobEl.className = 'touch-knob';
    knobEl.style.width = knobEl.style.height = (STICK.knob * 2) + 'px';
    layer.appendChild(knobEl);
    placeKnob(0, 0);

    BUTTONS.forEach(function (b) {
      var el = document.createElement('div');
      el.className = 'touch-btn tone-' + b.tone;
      el.dataset.touchId = b.id;
      el.style.left = (b.x - b.r) + 'px';
      el.style.top = (b.y - b.r) + 'px';
      el.style.width = el.style.height = (b.r * 2) + 'px';
      el.innerHTML = '<span class="tb-glyph">' + b.label + '</span>' +
        '<span class="tb-name">' + b.name + '</span>';
      b.el = el;
      layer.appendChild(el);
    });

    host.appendChild(layer);
  }

  function placeKnob(dx, dy) {
    knobEl.style.left = (STICK.x + dx - STICK.knob) + 'px';
    knobEl.style.top = (STICK.y + dy - STICK.knob) + 'px';
  }

  /** Échelle courante du conteneur : les évènements arrivent en pixels écran. */
  function scale() {
    var r = host.getBoundingClientRect();
    return r.width ? r.width / VIEW_W : 1;
  }
  function toGame(e) {
    var r = host.getBoundingClientRect();
    var s = scale() || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }

  function buttonAt(pt) {
    for (var i = 0; i < BUTTONS.length; i++) {
      var b = BUTTONS[i];
      var dx = pt.x - b.x, dy = pt.y - b.y;
      // Zone tactile un peu plus large que le disque dessiné : viser au doigt
      // n'est jamais précis, et un coup manqué se ressent immédiatement.
      if (dx * dx + dy * dy <= (b.r + 12) * (b.r + 12)) return b;
    }
    return null;
  }

  function press(b, on) {
    down[b.id] = on;
    if (on) latch[b.id] = 3;
    if (b.el) b.el.classList.toggle('on', on);
  }

  /* ------------------------------ Pointeurs --------------------------- */
  function onDown(e) {
    if (!visible) return;
    var pt = toGame(e);
    var b = buttonAt(pt);
    if (b) {
      e.preventDefault();
      pointerBtn[e.pointerId] = b.id;
      press(b, true);
      return;
    }
    // Toute la moitié gauche sert de manche : on ne demande pas au joueur de
    // viser une pastille pour se déplacer.
    if (pt.x < VIEW_W * 0.5 && stick.id === null) {
      e.preventDefault();
      stick.id = e.pointerId;
      moveStick(pt);
      baseEl.classList.add('on');
    }
  }

  function onMove(e) {
    if (!visible) return;
    if (e.pointerId === stick.id) { e.preventDefault(); moveStick(toGame(e)); return; }
    // Glisser d'un bouton vers un autre reste naturel sur un écran tactile.
    var id = pointerBtn[e.pointerId];
    if (id === undefined) return;
    var b = buttonAt(toGame(e));
    if (b && b.id === id) return;
    releasePointer(e.pointerId);
    if (b) { pointerBtn[e.pointerId] = b.id; press(b, true); }
  }

  function onUp(e) {
    if (e.pointerId === stick.id) {
      stick.id = null; stick.dx = 0; stick.dy = 0;
      placeKnob(0, 0);
      baseEl.classList.remove('on');
      return;
    }
    releasePointer(e.pointerId);
  }

  function releasePointer(pid) {
    var id = pointerBtn[pid];
    if (id === undefined) return;
    delete pointerBtn[pid];
    for (var i = 0; i < BUTTONS.length; i++) if (BUTTONS[i].id === id) press(BUTTONS[i], false);
  }

  function moveStick(pt) {
    var dx = pt.x - STICK.x, dy = pt.y - STICK.y;
    var len = Math.hypot(dx, dy);
    var max = STICK.base - 6;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    stick.dx = dx / max; stick.dy = dy / max;
    placeKnob(dx, dy);
  }

  /* --------------------- Lecture par le moteur d'entrée ---------------- */
  /** Renvoie l'état à fusionner dans la manette du joueur, ou null. */
  function read(s) {
    if (!visible || !enabled || s !== slot) return null;
    var held = {};
    BUTTONS.forEach(function (b) {
      if (!down[b.id] && !(latch[b.id] > 0)) return;
      b.keys.forEach(function (k) { held[k] = true; });
    });
    var ax = Math.abs(stick.dx) > STICK.dead ? stick.dx : 0;
    var az = Math.abs(stick.dy) > STICK.dead ? stick.dy : 0;
    // Les directions discrètes servent au jeu (visée, modificateurs) : on les
    // dérive du manche pour que tout fonctionne comme au clavier.
    if (ax < -0.4) held.left = true;
    if (ax > 0.4) held.right = true;
    if (az < -0.4) held.up = true;
    if (az > 0.4) held.down = true;
    return { axisX: ax, axisZ: az, held: held };
  }

  /** Décrémente les verrous : une tape très brève reste vue au moins 3 images. */
  function tick() {
    for (var k in latch) if (latch[k] > 0) latch[k]--;
  }

  /* ------------------------------ Réglages ---------------------------- */
  function setVisible(on) {
    on = !!on && enabled;
    if (on === visible) return;
    visible = on;
    if (layer) layer.classList.toggle('shown', visible);
    if (!visible) {
      stick.id = null; stick.dx = 0; stick.dy = 0;
      if (knobEl) placeKnob(0, 0);
      if (baseEl) baseEl.classList.remove('on');
      BUTTONS.forEach(function (b) { press(b, false); });
      pointerBtn = {};
    }
  }

  function setEnabled(on) {
    enabled = !!on;
    if (!enabled) setVisible(false);
  }

  function init(appEl, opts) {
    host = appEl;
    opts = opts || {};
    enabled = opts.enabled !== undefined ? opts.enabled : supported();
    slot = opts.slot || 0;
    build();
    // Les évènements pointeur couvrent doigt, stylet et souris d'un seul tenant.
    layer.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    // Un appui long sur un bouton ne doit pas ouvrir le menu contextuel.
    layer.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  return {
    init: init, read: read, tick: tick,
    setVisible: setVisible, setEnabled: setEnabled,
    supported: supported,
    get enabled() { return enabled; },
    get visible() { return visible; },
    BUTTONS: BUTTONS
  };
})();

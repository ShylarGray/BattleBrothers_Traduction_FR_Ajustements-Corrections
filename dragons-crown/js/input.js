/* =========================================================================
 * Entrées : 4 manettes virtuelles (clavier partagé + manettes Gamepad API)
 * ====================================================================== */
'use strict';

DC.Input = (function () {

  var BUTTONS = ['left', 'right', 'up', 'down', 'attack', 'jump', 'special', 'item', 'start'];

  // Dispositions clavier par défaut, une par joueur (3 joueurs au clavier max).
  var KEYMAPS = [
    { // Joueur 1
      left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
      attack: 'KeyJ', jump: 'KeyK', special: 'KeyL', item: 'KeyU', start: 'Enter'
    },
    { // Joueur 2
      left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
      attack: 'Numpad1', jump: 'Numpad2', special: 'Numpad3', item: 'Numpad0', start: 'NumpadEnter'
    },
    { // Joueur 3
      left: 'KeyF', right: 'KeyH', up: 'KeyT', down: 'KeyG',
      attack: 'KeyV', jump: 'KeyB', special: 'KeyN', item: 'KeyC', start: 'Backslash'
    },
    { // Joueur 4 — manette conseillée, repli clavier pavé numérique haut
      left: 'Numpad4', right: 'Numpad6', up: 'Numpad8', down: 'Numpad5',
      attack: 'Numpad7', jump: 'Numpad9', special: 'NumpadMultiply', item: 'NumpadDivide', start: 'NumpadSubtract'
    }
  ];

  // Correspondance boutons manette (disposition XInput standard).
  var PAD_BUTTONS = {
    attack: [0, 2],     // A / X
    jump: [1, 3],       // B / Y
    special: [5, 7],    // RB / RT
    item: [4, 6],       // LB / LT
    start: [9],         // Start
    up: [12], down: [13], left: [14], right: [15]
  };

  var keyDown = {};       // code -> bool
  var rawGamepads = [];   // index navigator -> assigné au joueur ?
  var padAssign = [null, null, null, null]; // slot joueur -> index gamepad
  var listeners = [];
  var anyKeyFlag = null;  // dernier code pressé (pour les menus)
  var pads = [];

  function makePad(index) {
    var p = { index: index, held: {}, last: {}, pressed: {}, released: {}, axisX: 0, axisZ: 0, connected: false };
    BUTTONS.forEach(function (b) { p.held[b] = false; p.last[b] = false; p.pressed[b] = false; p.released[b] = false; });
    return p;
  }
  for (var i = 0; i < 4; i++) pads.push(makePad(i));

  function onKey(e, down) {
    // Empêche le défilement de la page sur les touches de jeu.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
    keyDown[e.code] = down;
    if (down) {
      anyKeyFlag = e.code;
      listeners.forEach(function (fn) { fn(e.code, e); });
    }
  }

  function init() {
    window.addEventListener('keydown', function (e) { onKey(e, true); });
    window.addEventListener('keyup', function (e) { onKey(e, false); });
    window.addEventListener('blur', function () { keyDown = {}; });
    window.addEventListener('gamepadconnected', function (e) { assignPad(e.gamepad.index); });
    window.addEventListener('gamepaddisconnected', function (e) {
      var s = padAssign.indexOf(e.gamepad.index);
      if (s >= 0) padAssign[s] = null;
    });
    // Manettes déjà branchées au chargement.
    scanPads();
  }

  function scanPads() {
    var gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < gps.length; i++) if (gps[i]) assignPad(gps[i].index);
  }

  function assignPad(idx) {
    if (padAssign.indexOf(idx) >= 0) return;
    for (var s = 0; s < 4; s++) {
      if (padAssign[s] === null) { padAssign[s] = idx; return; }
    }
  }

  /** Nombre de manettes physiques détectées. */
  function padCount() {
    var n = 0;
    for (var s = 0; s < 4; s++) if (padAssign[s] !== null) n++;
    return n;
  }

  function readGamepad(slot, state) {
    var idx = padAssign[slot];
    if (idx === null) return false;
    var gps = navigator.getGamepads ? navigator.getGamepads() : [];
    var gp = gps[idx];
    if (!gp) return false;
    var ax = gp.axes[0] || 0, az = gp.axes[1] || 0;
    if (Math.abs(ax) < 0.28) ax = 0;
    if (Math.abs(az) < 0.28) az = 0;
    state.axisX = ax; state.axisZ = az;
    BUTTONS.forEach(function (b) {
      var list = PAD_BUTTONS[b] || [], hit = false;
      for (var k = 0; k < list.length; k++) {
        var btn = gp.buttons[list[k]];
        if (btn && (btn.pressed || btn.value > 0.5)) { hit = true; break; }
      }
      if (b === 'left' && ax < -0.4) hit = true;
      if (b === 'right' && ax > 0.4) hit = true;
      if (b === 'up' && az < -0.4) hit = true;
      if (b === 'down' && az > 0.4) hit = true;
      state.held[b] = state.held[b] || hit;
    });
    return true;
  }

  /** Appelé une fois par image, avant la logique de jeu. */
  function update() {
    for (var s = 0; s < 4; s++) {
      var p = pads[s], map = KEYMAPS[s];
      var kbAx = 0, kbAz = 0;
      BUTTONS.forEach(function (b) {
        p.last[b] = p.held[b];
        p.held[b] = !!keyDown[map[b]];
      });
      p.axisX = 0; p.axisZ = 0;
      var hasPad = readGamepad(s, p);
      p.connected = hasPad || true; // le clavier reste toujours disponible
      p.hasGamepad = hasPad;
      // Axes analogiques : le clavier remplit si la manette est au neutre.
      if (p.axisX === 0) { kbAx = (p.held.right ? 1 : 0) - (p.held.left ? 1 : 0); p.axisX = kbAx; }
      if (p.axisZ === 0) { kbAz = (p.held.down ? 1 : 0) - (p.held.up ? 1 : 0); p.axisZ = kbAz; }
      BUTTONS.forEach(function (b) {
        p.pressed[b] = p.held[b] && !p.last[b];
        p.released[b] = !p.held[b] && p.last[b];
      });
    }
    anyKeyFlag = null;
  }

  function pad(slot) { return pads[slot]; }
  function anyPressed(btn) {
    for (var s = 0; s < 4; s++) if (pads[s].pressed[btn]) return true;
    return false;
  }
  function whoPressed(btn) {
    for (var s = 0; s < 4; s++) if (pads[s].pressed[btn]) return s;
    return -1;
  }
  function onKeyDown(fn) { listeners.push(fn); }
  function keymapLabel(slot) {
    var m = KEYMAPS[slot];
    function nice(code) {
      return code.replace('Key', '').replace('Arrow', '↑↓←→'.charAt(0) && code.replace('Arrow', ''))
        .replace('Numpad', 'Pav.').replace('Enter', 'Entrée').replace('Backslash', '\\')
        .replace('Multiply', '*').replace('Divide', '/').replace('Subtract', '-');
    }
    return {
      move: nice(m.up) + nice(m.left) + nice(m.down) + nice(m.right),
      attack: nice(m.attack), jump: nice(m.jump), special: nice(m.special), item: nice(m.item)
    };
  }

  return {
    init: init, update: update, pad: pad, pads: pads,
    anyPressed: anyPressed, whoPressed: whoPressed, onKeyDown: onKeyDown,
    padCount: padCount, scanPads: scanPads, keymapLabel: keymapLabel,
    BUTTONS: BUTTONS, KEYMAPS: KEYMAPS
  };
})();

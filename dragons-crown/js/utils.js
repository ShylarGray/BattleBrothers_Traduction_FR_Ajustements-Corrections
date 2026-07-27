/* =========================================================================
 * Couronne du Dragon — utilitaires communs
 * Namespace global : DC
 * ====================================================================== */
'use strict';

var DC = window.DC || {};
window.DC = DC;

DC.U = (function () {

  /* --------------------------- Maths ---------------------------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
  function approach(v, target, step) {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return target;
  }
  function dist2(ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return dx * dx + dz * dz;
  }
  function dist(ax, az, bx, bz) { return Math.sqrt(dist2(ax, az, bx, bz)); }

  /* ------------------------ Aléatoire seedé ---------------------------- */
  // Mulberry32 : déterministe, rapide, suffisant pour du loot.
  function makeRng(seed) {
    var s = (seed >>> 0) || 1;
    function rng() {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    rng.int = function (min, max) { return min + Math.floor(rng() * (max - min + 1)); };
    rng.pick = function (arr) { return arr[Math.floor(rng() * arr.length)]; };
    rng.chance = function (p) { return rng() < p; };
    rng.range = function (min, max) { return min + rng() * (max - min); };
    // Tirage pondéré : liste d'objets possédant un champ `weight`.
    rng.weighted = function (arr, weightKey) {
      var k = weightKey || 'weight', total = 0, i;
      for (i = 0; i < arr.length; i++) total += (arr[i][k] || 0);
      if (total <= 0) return arr[0];
      var r = rng() * total;
      for (i = 0; i < arr.length; i++) {
        r -= (arr[i][k] || 0);
        if (r <= 0) return arr[i];
      }
      return arr[arr.length - 1];
    };
    rng.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    };
    return rng;
  }

  // Générateur global (non déterministe) pour tout ce qui est cosmétique.
  var rnd = makeRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);

  /* ---------------------------- Divers -------------------------------- */
  var _uid = 0;
  function uid(prefix) { _uid++; return (prefix || 'id') + '_' + _uid; }

  function fmtNum(n) {
    n = Math.floor(n);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function romanize(n) {
    var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], out = '';
    for (var i = 0; i < map.length; i++) {
      while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
    }
    return out || '';
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  /* --------------------------- Couleurs -------------------------------- */
  function rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function shade(hex, amount) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = clamp(Math.round(((n >> 16) & 255) * (1 + amount)), 0, 255);
    var g = clamp(Math.round(((n >> 8) & 255) * (1 + amount)), 0, 255);
    var b = clamp(Math.round((n & 255) * (1 + amount)), 0, 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ------------------- Collision boîtes 3 axes (x, z, y) --------------- */
  // Une boîte = {x, z, y, w, d, h} : w = largeur (axe x), d = profondeur (axe z),
  // h = hauteur (axe y). x/z/y = centre en x, centre en z, bas en y.
  function boxOverlap(a, b) {
    return Math.abs(a.x - b.x) * 2 < (a.w + b.w) &&
      Math.abs(a.z - b.z) * 2 < (a.d + b.d) &&
      (a.y < b.y + b.h) && (b.y < a.y + a.h);
  }

  return {
    clamp: clamp, lerp: lerp, sign: sign, approach: approach,
    dist: dist, dist2: dist2,
    makeRng: makeRng, rnd: rnd,
    uid: uid, fmtNum: fmtNum, romanize: romanize, deepClone: deepClone,
    rgba: rgba, shade: shade, boxOverlap: boxOverlap,
    TAU: Math.PI * 2
  };
})();

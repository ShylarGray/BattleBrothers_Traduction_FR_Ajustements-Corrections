/* =========================================================================
 * Audio : synthèse procédurale (aucun fichier externe)
 * ====================================================================== */
'use strict';

DC.Audio = (function () {

  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var started = false;
  var settings = { sfx: 0.7, music: 0.4 };
  var musicTimer = null, musicStep = 0, currentTrack = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = settings.sfx; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = settings.music; musicGain.connect(master);
    return ctx;
  }

  function unlock() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    started = true;
  }

  function setVolumes(s) {
    settings.sfx = s.sfx; settings.music = s.music;
    if (sfxGain) sfxGain.gain.value = s.sfx;
    if (musicGain) musicGain.gain.value = s.music;
  }

  function tone(opt) {
    if (!ensure() || !started) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opt.type || 'square';
    osc.frequency.setValueAtTime(opt.f0, t0);
    if (opt.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.f1), t0 + opt.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, opt.vol || 0.2), t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opt.dur);
    osc.connect(gain); gain.connect(opt.bus || sfxGain);
    osc.start(t0); osc.stop(t0 + opt.dur + 0.02);
  }

  function noise(opt) {
    if (!ensure() || !started) return;
    var t0 = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * (opt.dur || 0.15));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var filt = ctx.createBiquadFilter();
    filt.type = opt.filter || 'bandpass';
    filt.frequency.setValueAtTime(opt.freq || 1200, t0);
    if (opt.freq1) filt.frequency.exponentialRampToValueAtTime(Math.max(30, opt.freq1), t0 + opt.dur);
    var g = ctx.createGain(); g.gain.value = opt.vol || 0.2;
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opt.dur || 0.15));
    src.connect(filt); filt.connect(g); g.connect(sfxGain);
    src.start(t0);
  }

  var SFX = {
    swing: function (v) { noise({ dur: 0.1, freq: 2600, freq1: 700, vol: 0.13 * v, filter: 'bandpass' }); },
    hit: function (v) { noise({ dur: 0.12, freq: 900, freq1: 180, vol: 0.28 * v, filter: 'lowpass' }); tone({ type: 'square', f0: 180, f1: 70, dur: 0.09, vol: 0.12 * v }); },
    crit: function (v) { noise({ dur: 0.18, freq: 1600, freq1: 200, vol: 0.32 * v }); tone({ type: 'sawtooth', f0: 420, f1: 90, dur: 0.16, vol: 0.16 * v }); },
    block: function (v) { tone({ type: 'square', f0: 1400, f1: 900, dur: 0.09, vol: 0.14 * v }); },
    shoot: function (v) { tone({ type: 'triangle', f0: 900, f1: 240, dur: 0.11, vol: 0.13 * v }); },
    boom: function (v) { noise({ dur: 0.42, freq: 500, freq1: 60, vol: 0.4 * v, filter: 'lowpass' }); },
    jump: function (v) { tone({ type: 'square', f0: 300, f1: 720, dur: 0.11, vol: 0.1 * v }); },
    dash: function (v) { noise({ dur: 0.14, freq: 1800, freq1: 500, vol: 0.12 * v }); },
    coin: function (v) { tone({ type: 'square', f0: 1180, dur: 0.06, vol: 0.1 * v }); setTimeout(function () { tone({ type: 'square', f0: 1560, dur: 0.09, vol: 0.09 * v }); }, 55); },
    item: function (v) { tone({ type: 'triangle', f0: 660, f1: 1320, dur: 0.16, vol: 0.13 * v }); },
    levelup: function (v) { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone({ type: 'square', f0: f, dur: 0.16, vol: 0.13 * v }); }, i * 85); }); },
    super: function (v) { tone({ type: 'sawtooth', f0: 120, f1: 900, dur: 0.4, vol: 0.2 * v }); noise({ dur: 0.4, freq: 400, freq1: 3000, vol: 0.16 * v }); },
    down: function (v) { tone({ type: 'sawtooth', f0: 400, f1: 60, dur: 0.5, vol: 0.2 * v }); },
    roar: function (v) { tone({ type: 'sawtooth', f0: 90, f1: 40, dur: 0.7, vol: 0.28 * v }); noise({ dur: 0.7, freq: 300, freq1: 80, vol: 0.24 * v, filter: 'lowpass' }); },
    deny: function (v) { tone({ type: 'square', f0: 220, f1: 130, dur: 0.14, vol: 0.12 * v }); },
    menu: function (v) { tone({ type: 'square', f0: 780, dur: 0.045, vol: 0.08 * v }); },
    confirm: function (v) { tone({ type: 'square', f0: 620, f1: 980, dur: 0.1, vol: 0.11 * v }); },
    door: function (v) { noise({ dur: 0.5, freq: 260, freq1: 80, vol: 0.2 * v, filter: 'lowpass' }); },
    chest: function (v) { [392, 523, 659, 880].forEach(function (f, i) { setTimeout(function () { tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.11 * v }); }, i * 70); }); }
  };

  function play(name, vol) {
    if (!started) return;
    var fn = SFX[name];
    if (fn) { try { fn(vol === undefined ? 1 : vol); } catch (e) { /* audio non critique */ } }
  }

  /* ---------------------------- Musique -------------------------------- */
  // Boucles de basse + arpège, une ambiance par thème.
  var TRACKS = {
    town: { root: 220, scale: [0, 4, 7, 11, 12, 7, 4, 2], bpm: 96, wave: 'triangle' },
    forest: { root: 196, scale: [0, 3, 7, 10, 12, 10, 7, 3], bpm: 112, wave: 'square' },
    temple: { root: 174, scale: [0, 2, 5, 7, 10, 7, 5, 2], bpm: 104, wave: 'triangle' },
    crypt: { root: 146, scale: [0, 1, 5, 8, 12, 8, 5, 1], bpm: 100, wave: 'sawtooth' },
    sea: { root: 164, scale: [0, 3, 5, 10, 12, 10, 5, 3], bpm: 108, wave: 'triangle' },
    forge: { root: 130, scale: [0, 3, 6, 7, 12, 7, 6, 3], bpm: 128, wave: 'square' },
    castle: { root: 110, scale: [0, 4, 7, 11, 14, 11, 7, 4], bpm: 120, wave: 'sawtooth' },
    boss: { root: 98, scale: [0, 1, 4, 6, 7, 6, 4, 1], bpm: 148, wave: 'sawtooth' }
  };

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    currentTrack = null;
  }

  function playMusic(name) {
    if (!ensure() || !started) { currentTrack = name; return; }
    if (currentTrack === name && musicTimer) return;
    stopMusic();
    var tr = TRACKS[name] || TRACKS.town;
    currentTrack = name;
    musicStep = 0;
    var interval = 60000 / tr.bpm / 2;
    musicTimer = setInterval(function () {
      if (!ctx || ctx.state !== 'running') return;
      var s = musicStep++;
      var deg = tr.scale[s % tr.scale.length];
      var freq = tr.root * Math.pow(2, deg / 12);
      // Ligne mélodique
      tone({ type: tr.wave, f0: freq * 2, dur: 0.12, vol: 0.055, bus: musicGain });
      // Basse toutes les 4 croches
      if (s % 4 === 0) tone({ type: 'triangle', f0: tr.root / 2, dur: 0.3, vol: 0.09, bus: musicGain });
      // Percussion légère
      if (s % 8 === 4) noise({ dur: 0.08, freq: 5000, vol: 0.03 });
    }, interval);
  }

  return {
    unlock: unlock, play: play, playMusic: playMusic, stopMusic: stopMusic,
    setVolumes: setVolumes, get started() { return started; }
  };
})();

/* =========================================================================
 * Sauvegarde : profil persistant (localStorage)
 * ====================================================================== */
'use strict';

DC.Save = (function () {

  var KEY = 'dragons_crown_fr_save_v1';

  function fresh() {
    return {
      version: 1,
      gold: 300,
      heroes: [],
      party: [null, null, null, null],   // uid de héros par emplacement (null = vide)
      controls: ['human', 'none', 'none', 'none'], // 'human' | 'ai' | 'none'
      storage: [],                        // coffre de la ville
      pouch: [],                          // consommables emportés en donjon
      progress: { cleared: {}, bestClear: {}, difficulty: 'normal', routes: {}, unlockedDiff: 1 },
      shopDay: 1,
      stats: { runs: 0, wins: 0, kills: 0, goldEarned: 0, bestCombo: 0, playtime: 0 },
      settings: { sfx: 0.7, music: 0.4, showDamage: true, screenShake: true, hardLoot: false }
    };
  }

  /**
   * Répare les collisions d'identifiants héritées des sauvegardes créées avant
   * que l'uid ne porte un marqueur de session. Sans cela, deux héros peuvent
   * partager un uid : les emplacements de groupe résolvent alors vers le même
   * objet et le second héros devient injouable.
   */
  function repairIds(data) {
    var byUid = {};
    (data.heroes || []).forEach(function (h) {
      if (!h.uid) h.uid = DC.U.uid('hero');
      (byUid[h.uid] = byUid[h.uid] || []).push(h);
    });
    Object.keys(byUid).forEach(function (old) {
      var group = byUid[old];
      if (group.length < 2) return;
      // Les emplacements de groupe citant cet uid sont redistribués dans l'ordre.
      var slots = [];
      for (var i = 0; i < 4; i++) if (data.party && data.party[i] === old) slots.push(i);
      group.forEach(function (h, n) {
        if (n > 0) h.uid = DC.U.uid('hero');
        if (slots[n] !== undefined) data.party[slots[n]] = h.uid;
      });
      for (var k = group.length; k < slots.length; k++) data.party[slots[k]] = null;
    });

    // Même traitement pour les objets : un uid dupliqué ferait équiper ou jeter
    // le mauvais objet depuis le coffre.
    var seen = {}, all = (data.storage || []).slice();
    (data.heroes || []).forEach(function (h) {
      if (!h.equip) return;
      ['weapon', 'armor', 'accessory'].forEach(function (s) { if (h.equip[s]) all.push(h.equip[s]); });
    });
    all.forEach(function (it) {
      if (!it.uid || seen[it.uid]) it.uid = DC.U.uid(it.kind === 'treasure' ? 'tr' : 'it');
      seen[it.uid] = true;
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.version !== 1) return null;
      // Robustesse : complète les champs manquants après une mise à jour.
      var base = fresh();
      Object.keys(base).forEach(function (k) {
        if (data[k] === undefined) data[k] = base[k];
      });
      Object.keys(base.progress).forEach(function (k) {
        if (data.progress[k] === undefined) data.progress[k] = base.progress[k];
      });
      Object.keys(base.settings).forEach(function (k) {
        if (data.settings[k] === undefined) data.settings[k] = base.settings[k];
      });
      repairIds(data);
      return data;
    } catch (e) {
      console.warn('Sauvegarde illisible :', e);
      return null;
    }
  }

  function save(profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.warn('Échec de sauvegarde :', e);
      return false;
    }
  }

  function wipe() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignoré */ }
  }

  function exportString(profile) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
  }
  function importString(str) {
    try {
      var data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
      if (!data || !data.heroes) return null;
      return data;
    } catch (e) { return null; }
  }

  return { fresh: fresh, load: load, save: save, wipe: wipe, exportString: exportString, importString: importString, KEY: KEY };
})();

/* =========================================================================
 * Interface : écrans DOM (titre, roster, ville, boutiques, guilde, résultats)
 * ====================================================================== */
'use strict';

DC.UI = (function () {

  var U = DC.U, I = DC.Items, H = DC.Hero, Cl = DC.Classes;
  var root = null, game = null, current = null, params = {};
  var scroll = {};

  /* --------------------------- Utilitaires ---------------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function gold(n) { return '<span class="gold">◉ ' + U.fmtNum(n) + '</span>'; }
  function btn(act, label, arg, cls, disabled) {
    return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' +
      (arg !== undefined && arg !== null ? ' data-arg="' + esc(arg) + '"' : '') +
      (disabled ? ' disabled' : '') + '>' + label + '</button>';
  }

  var STAT_LABEL = {
    hp: 'PV', mp: 'PM', atk: 'ATQ', def: 'DEF', mag: 'MAG',
    spd: 'VIT', crit: 'CRIT', luck: 'CHA'
  };
  function statText(k, v) {
    if (k === 'crit') return (v > 0 ? '+' : '') + Math.round(v * 100) + ' %';
    if (k === 'spd') return (v > 0 ? '+' : '') + Math.round(v * 100) + ' %';
    return (v > 0 ? '+' : '') + Math.round(v);
  }

  function itemStatsHtml(item) {
    if (!item.stats) return '';
    return Object.keys(item.stats).map(function (k) {
      var v = item.stats[k];
      return '<span class="stat ' + (v < 0 ? 'neg' : 'pos') + '">' + (STAT_LABEL[k] || k) + ' ' + statText(k, v) + '</span>';
    }).join(' ');
  }

  function itemCard(item, opts) {
    opts = opts || {};
    if (!item) return '<div class="item empty">— vide —</div>';
    var col = I.itemColor(item);
    var name = I.itemName(item);
    var sub = '';
    if (item.kind === 'equip') {
      sub = item.appraised
        ? (I.rarity(item.rarity).name + ' · ' + I.SLOTS[item.slot] + ' · palier ' + item.tier)
        : 'Nature inconnue — expertise requise';
    } else if (item.kind === 'consumable') {
      var c = I.consumable(item.id);
      sub = (c ? c.desc : '') + (item.qty > 1 ? ' (×' + item.qty + ')' : '');
    } else if (item.kind === 'treasure') {
      sub = 'Trésor — se revend à la Forge';
    }
    var procs = (item.procs && item.procs.length && item.appraised)
      ? '<div class="procs">' + item.procs.map(function (p) {
        return '<span class="proc">' + ({ burn: 'Brûlure', freeze: 'Gel', shock: 'Foudre', lifesteal: 'Vol de vie', regen: 'Régénération' }[p] || p) + '</span>';
      }).join('') + '</div>' : '';
    return '<div class="item ' + (opts.selected ? 'sel' : '') + '" style="--rc:' + col + '"' +
      (opts.attrs || '') + '>' +
      '<div class="iname">' + esc(name) + (item.cursed && item.appraised ? ' <span class="curse">maudit</span>' : '') + '</div>' +
      '<div class="isub">' + esc(sub) + '</div>' +
      (item.appraised && item.kind === 'equip' ? '<div class="istats">' + itemStatsHtml(item) + '</div>' : '') +
      procs +
      (opts.footer || '') +
      '</div>';
  }

  function heroSummary(hero) {
    var cls = Cl.get(hero.classId);
    var st = H.effectiveStats(hero);
    var xp = H.xpProgress(hero);
    return '<div class="hero-card">' +
      '<div class="hc-head"><span class="hc-name">' + esc(hero.name) + '</span>' +
      '<span class="hc-cls">' + cls.name + ' · Nv ' + hero.level + '</span></div>' +
      '<div class="xpbar"><i style="width:' + (xp.pct * 100).toFixed(1) + '%"></i></div>' +
      '<div class="hc-stats">' +
      '<span>PV ' + st.hp + '</span><span>PM ' + st.mp + '</span>' +
      '<span>ATQ ' + st.atk + '</span><span>DEF ' + st.def + '</span>' +
      '<span>MAG ' + st.mag + '</span><span>CRIT ' + Math.round(st.crit * 100) + '%</span>' +
      '</div>' +
      (hero.skillPoints > 0 ? '<div class="hc-sp">' + hero.skillPoints + ' point(s) de compétence à dépenser</div>' : '') +
      '</div>';
  }

  /* =============================== TITRE =============================== */
  function screenTitle() {
    var hasSave = !!DC.Save.load();
    return '<div class="screen title-screen">' +
      '<div class="logo"><span class="l1">La Couronne</span><span class="l2">du Dragon</span>' +
      '<div class="tag">Action-RPG à défilement — coopération jusqu\'à 4 joueurs</div></div>' +
      '<div class="menu">' +
      btn('roster', hasSave ? 'Continuer l\'aventure' : 'Nouvelle aventure', null, 'big primary') +
      btn('controls', 'Commandes') +
      btn('options', 'Options') +
      (hasSave ? btn('wipeAsk', 'Effacer la sauvegarde', null, 'danger') : '') +
      '</div>' +
      '<div class="foot">Conseil : chaque joueur peut utiliser le clavier ou une manette. ' +
      'Le butin non identifié doit être expertisé à la Forge.</div>' +
      '</div>';
  }

  function screenControls() {
    var rows = [0, 1, 2, 3].map(function (i) {
      var m = DC.Input.KEYMAPS[i];
      function k(c) { return '<kbd>' + c.replace('Key', '').replace('Numpad', 'Pav.').replace('Arrow', '') + '</kbd>'; }
      return '<tr><td>Joueur ' + (i + 1) + '</td>' +
        '<td>' + k(m.up) + k(m.left) + k(m.down) + k(m.right) + '</td>' +
        '<td>' + k(m.attack) + '</td><td>' + k(m.jump) + '</td>' +
        '<td>' + k(m.special) + '</td><td>' + k(m.item) + '</td></tr>';
    }).join('');
    return '<div class="screen panel-screen"><h1>Commandes</h1>' +
      '<table class="ctrl"><tr><th>Joueur</th><th>Déplacement</th><th>Attaque</th><th>Saut</th><th>Magie</th><th>Objet</th></tr>' + rows + '</table>' +
      '<ul class="hints">' +
      '<li><b>Combo</b> : appuyez plusieurs fois sur Attaque.</li>' +
      '<li><b>Attaque lourde</b> : Bas + Attaque.</li>' +
      '<li><b>Attaque aérienne</b> : Attaque en l\'air.</li>' +
      '<li><b>Super technique</b> : Bas + Magie (coûte beaucoup de PM, temps de recharge).</li>' +
      '<li><b>Roulade</b> : double-tapez Gauche ou Droite (invincibilité brève).</li>' +
      '<li><b>Interagir / relever un allié</b> : Haut près de la cible.</li>' +
      '<li><b>Manettes</b> : branchez-les puis appuyez sur un bouton ; elles sont assignées dans l\'ordre.</li>' +
      '<li><b>Q / E</b> : changer d\'objet actif dans la besace ; <b>Échap</b> : pause.</li>' +
      '</ul>' +
      btn('back', 'Retour') + '</div>';
  }

  function screenOptions() {
    var s = game.profile.settings;
    return '<div class="screen panel-screen"><h1>Options</h1>' +
      '<div class="opt"><label>Volume des effets</label><input type="range" min="0" max="1" step="0.05" value="' + s.sfx + '" data-act="setSfx"><span>' + Math.round(s.sfx * 100) + ' %</span></div>' +
      '<div class="opt"><label>Volume de la musique</label><input type="range" min="0" max="1" step="0.05" value="' + s.music + '" data-act="setMusic"><span>' + Math.round(s.music * 100) + ' %</span></div>' +
      '<div class="opt"><label>Nombres de dégâts</label>' + btn('toggle', s.showDamage ? 'Activés' : 'Désactivés', 'showDamage') + '</div>' +
      '<div class="opt"><label>Secousses d\'écran</label>' + btn('toggle', s.screenShake ? 'Activées' : 'Désactivées', 'screenShake') + '</div>' +
      '<div class="opt"><label>Sauvegarde</label>' + btn('exportSave', 'Exporter') + btn('importSave', 'Importer') + '</div>' +
      btn('back', 'Retour') + '</div>';
  }

  /* ============================== ROSTER =============================== */
  function screenRoster() {
    var p = game.profile;
    var heroes = p.heroes.map(function (h) {
      return '<div class="roster-item" data-act="pickHero" data-arg="' + h.uid + '">' +
        heroSummary(h) +
        '<div class="ri-actions">' + btn('deleteHero', 'Renvoyer', h.uid, 'small danger') + '</div>' +
        '</div>';
    }).join('');

    var slots = [0, 1, 2, 3].map(function (i) {
      var uid = p.party[i];
      var hero = uid ? p.heroes.filter(function (h) { return h.uid === uid; })[0] : null;
      var mode = p.controls[i];
      var padInfo = DC.Input.pad(i).hasGamepad ? ' 🎮' : '';
      return '<div class="slot ' + (hero ? 'filled' : '') + '" style="--pc:' + DC.Render.PLAYER_COLORS[i] + '">' +
        '<div class="slot-head">Joueur ' + (i + 1) + padInfo + '</div>' +
        (hero ? heroSummary(hero) : '<div class="slot-empty">Emplacement libre</div>') +
        '<div class="slot-ctl">' +
        btn('cycleCtl', mode === 'human' ? 'Humain' : (mode === 'ai' ? 'Compagnon IA' : 'Vide'), i, 'small ' + (mode === 'none' ? '' : 'primary')) +
        (hero ? btn('clearSlot', 'Retirer', i, 'small') : '') +
        '</div></div>';
    }).join('');

    var canGo = p.party.some(function (u, i) { return u && p.controls[i] !== 'none'; });
    return '<div class="screen roster-screen">' +
      '<h1>Compagnie d\'aventuriers</h1>' +
      '<div class="cols">' +
      '<div class="col"><h2>Vos héros ' + (p.heroes.length ? '' : '<small>(aucun)</small>') + '</h2>' +
      '<div class="scrolly" id="rosterList">' + (heroes || '<div class="muted">Créez un premier héros pour commencer.</div>') + '</div>' +
      btn('newHeroAsk', '＋ Recruter un héros', null, 'primary') + '</div>' +
      '<div class="col"><h2>Groupe (glissez un héros en cliquant dessus)</h2>' +
      '<div class="slots">' + slots + '</div>' +
      '<p class="muted small">Cliquez un héros à gauche pour l\'affecter au premier emplacement libre. ' +
      'Un emplacement « Compagnon IA » se joue tout seul.</p>' +
      '</div></div>' +
      '<div class="row-actions">' + btn('back', 'Retour') + btn('town', 'Aller en ville →', null, 'big primary', !canGo) + '</div>' +
      '</div>';
  }

  function screenNewHero() {
    var cards = Cl.all().map(function (c) {
      return '<div class="class-card" data-act="createHero" data-arg="' + c.id + '" style="--cc:' + c.palette.accent + '">' +
        '<div class="cc-name">' + c.name + '</div>' +
        '<div class="cc-role">' + c.role + ' · difficulté ' + '★'.repeat(c.diff) + '</div>' +
        '<div class="cc-blurb">' + c.blurb + '</div>' +
        '<div class="cc-stats"><span>PV ' + c.base.hp + '</span><span>PM ' + c.base.mp + '</span>' +
        '<span>ATQ ' + c.base.atk + '</span><span>DEF ' + c.base.def + '</span><span>MAG ' + c.base.mag + '</span></div>' +
        '<div class="cc-moves"><b>' + c.special.name + '</b> · <b>' + c.super.name + '</b></div>' +
        '<div class="cc-pass">' + c.passive + '</div>' +
        '</div>';
    }).join('');
    return '<div class="screen panel-screen wide"><h1>Recruter un héros</h1>' +
      '<div class="class-grid">' + cards + '</div>' + btn('roster', 'Retour') + '</div>';
  }

  /* =============================== VILLE =============================== */
  function screenTown() {
    var p = game.profile;
    var partyHtml = p.party.map(function (uid, i) {
      if (!uid || p.controls[i] === 'none') return '';
      var h = p.heroes.filter(function (x) { return x.uid === uid; })[0];
      if (!h) return '';
      return '<div class="mini" style="--pc:' + DC.Render.PLAYER_COLORS[i] + '">' +
        '<b>J' + (i + 1) + '</b> ' + esc(h.name) + ' <small>' + Cl.get(h.classId).name + ' Nv' + h.level + '</small>' +
        (h.skillPoints ? ' <span class="badge">' + h.skillPoints + ' PC</span>' : '') + '</div>';
    }).join('');

    var unappraised = p.storage.filter(function (it) { return it.kind === 'equip' && !it.appraised; }).length;

    return '<div class="screen town-screen">' +
      '<div class="town-head"><h1>Ville de Hautfort</h1>' +
      '<div class="purse">' + gold(p.gold) + ' · Jour ' + p.shopDay + '</div></div>' +
      '<div class="party-strip">' + partyHtml + '</div>' +
      '<div class="town-grid">' +
      '<div class="place" data-act="shopForge"><div class="ico">⚒</div><h3>Forge</h3>' +
      '<p>Achat et vente d\'équipement, <b>expertise</b> des trouvailles.</p>' +
      (unappraised ? '<span class="badge">' + unappraised + ' à expertiser</span>' : '') + '</div>' +
      '<div class="place" data-act="shopPotion"><div class="ico">🧪</div><h3>Apothicaire</h3>' +
      '<p>Potions, éthers, bombes — et préparation de la besace.</p></div>' +
      '<div class="place" data-act="temple"><div class="ico">✚</div><h3>Temple</h3>' +
      '<p>Bénédictions permanentes, purge des malédictions, relèvements.</p></div>' +
      '<div class="place" data-act="guild"><div class="ico">📜</div><h3>Guilde</h3>' +
      '<p>Arbres de compétences, réattribution des points.</p></div>' +
      '<div class="place" data-act="storage"><div class="ico">🎒</div><h3>Coffre & Équipement</h3>' +
      '<p>Équipez vos héros, rangez le butin.</p></div>' +
      '<div class="place go" data-act="stageSelect"><div class="ico">🗺</div><h3>Partir à l\'aventure</h3>' +
      '<p>Choisissez un donjon, une voie et une difficulté.</p></div>' +
      '</div>' +
      '<div class="row-actions">' + btn('roster', 'Compagnie') + btn('saveNow', 'Sauvegarder') + btn('title', 'Menu principal') + '</div>' +
      '</div>';
  }

  /* ============================== FORGE ================================ */
  function shopLevel() {
    var p = game.profile;
    var lv = 1;
    p.party.forEach(function (uid) {
      var h = p.heroes.filter(function (x) { return x.uid === uid; })[0];
      if (h && h.level > lv) lv = h.level;
    });
    return lv;
  }

  function screenForge() {
    var p = game.profile;
    var tab = params.tab || 'buy';
    var body = '';

    if (tab === 'buy') {
      if (!game.shopCache || game.shopCacheDay !== p.shopDay) {
        game.shopCache = DC.Loot.shopStock(p.shopDay * 7919 + 13, shopLevel(), 8);
        game.shopCacheDay = p.shopDay;
      }
      body = '<div class="grid-items">' + game.shopCache.map(function (it, i) {
        var price = I.buyValue(it);
        return itemCard(it, {
          footer: '<div class="ifoot">' + gold(price) +
            btn('buyItem', 'Acheter', i, 'small primary', p.gold < price) + '</div>'
        });
      }).join('') + '</div>';
    } else if (tab === 'sell') {
      var sellable = p.storage.filter(function (it) { return it.kind !== 'consumable'; });
      body = sellable.length ? '<div class="grid-items">' + sellable.map(function (it) {
        return itemCard(it, {
          footer: '<div class="ifoot">' + gold(I.sellValue(it)) + btn('sellItem', 'Vendre', it.uid, 'small') + '</div>'
        });
      }).join('') + '</div>' + btn('sellJunk', 'Vendre tous les objets communs identifiés', null, 'danger')
        : '<div class="muted">Le coffre est vide.</div>';
    } else {
      var raw = p.storage.filter(function (it) { return it.kind === 'equip' && !it.appraised; });
      var total = raw.reduce(function (s, it) { return s + I.appraiseCost(it); }, 0);
      body = raw.length ? '<div class="grid-items">' + raw.map(function (it) {
        var c = I.appraiseCost(it);
        return itemCard(it, {
          footer: '<div class="ifoot">' + gold(c) + btn('appraise', 'Expertiser', it.uid, 'small primary', p.gold < c) + '</div>'
        });
      }).join('') + '</div>' +
        btn('appraiseAll', 'Tout expertiser (' + U.fmtNum(total) + ' or)', null, 'primary', p.gold < total)
        : '<div class="muted">Aucun objet à expertiser.</div>';
    }

    return '<div class="screen shop-screen">' +
      '<div class="shop-head"><h1>⚒ Forge de Maître Halvor</h1><div class="purse">' + gold(p.gold) + '</div></div>' +
      '<div class="tabs">' +
      btn('forgeTab', 'Acheter', 'buy', tab === 'buy' ? 'tab on' : 'tab') +
      btn('forgeTab', 'Vendre', 'sell', tab === 'sell' ? 'tab on' : 'tab') +
      btn('forgeTab', 'Expertise', 'appraise', tab === 'appraise' ? 'tab on' : 'tab') +
      '</div>' +
      '<div class="scrolly">' + body + '</div>' +
      '<div class="row-actions">' + btn('nextDay', 'Renouveler le stock (200 or)', null, '', p.gold < 200) + btn('town', 'Retour en ville') + '</div>' +
      '</div>';
  }

  /* =========================== APOTHICAIRE ============================= */
  function screenPotion() {
    var p = game.profile;
    var stock = I.CONSUMABLES.map(function (c) {
      return '<div class="item" style="--rc:' + c.color + '">' +
        '<div class="iname">' + c.icon + ' ' + c.name + '</div>' +
        '<div class="isub">' + c.desc + '</div>' +
        '<div class="ifoot">' + gold(c.value) +
        btn('buyPotion', 'Acheter', c.id, 'small primary', p.gold < c.value) +
        btn('buyPotion5', '×5', c.id, 'small', p.gold < c.value * 5) + '</div></div>';
    }).join('');

    var pouch = p.pouch.map(function (st, i) {
      var c = I.consumable(st.id);
      return '<div class="item" style="--rc:' + (c ? c.color : '#ccc') + '">' +
        '<div class="iname">' + (c ? c.icon + ' ' + c.name : st.id) + ' ×' + st.qty + '</div>' +
        '<div class="ifoot">' + btn('pouchOut', 'Retirer', i, 'small') + '</div></div>';
    }).join('');

    return '<div class="screen shop-screen">' +
      '<div class="shop-head"><h1>🧪 Apothicaire de Dame Ysoline</h1><div class="purse">' + gold(p.gold) + '</div></div>' +
      '<div class="cols">' +
      '<div class="col"><h2>Étal</h2><div class="scrolly">' + stock + '</div></div>' +
      '<div class="col"><h2>Besace emportée <small>(' + p.pouch.length + ' / 8 types)</small></h2>' +
      '<div class="scrolly">' + (pouch || '<div class="muted">Vide. Achetez des potions pour les emporter.</div>') + '</div>' +
      '<p class="muted small">En donjon : touche <b>Objet</b> pour consommer, <b>Q</b>/<b>E</b> pour changer d\'objet actif. La besace est partagée par le groupe.</p>' +
      '</div></div>' +
      '<div class="row-actions">' + btn('town', 'Retour en ville') + '</div></div>';
  }

  /* ============================== TEMPLE =============================== */
  var BLESSINGS = [
    { id: 'hp', name: 'Bénédiction de vigueur', desc: '+5 % de PV max pour tous les héros (cumulable).', cost: 800 },
    { id: 'atk', name: 'Bénédiction de force', desc: '+4 % d\'attaque pour tous les héros (cumulable).', cost: 1000 },
    { id: 'luck', name: 'Bénédiction de fortune', desc: '+3 de chance : meilleur butin (cumulable).', cost: 1200 },
    { id: 'life', name: 'Serment du gardien', desc: '+1 relèvement automatique par expédition.', cost: 2500 }
  ];

  function screenTemple() {
    var p = game.profile;
    p.blessings = p.blessings || {};
    var cursed = p.storage.filter(function (it) { return it.cursed; });
    var list = BLESSINGS.map(function (b) {
      var rank = p.blessings[b.id] || 0;
      var cost = Math.floor(b.cost * Math.pow(1.6, rank));
      return '<div class="item" style="--rc:#ffd24a">' +
        '<div class="iname">' + b.name + (rank ? ' <small>rang ' + rank + '</small>' : '') + '</div>' +
        '<div class="isub">' + b.desc + '</div>' +
        '<div class="ifoot">' + gold(cost) + btn('bless', 'Recevoir', b.id, 'small primary', p.gold < cost) + '</div></div>';
    }).join('');
    var curseList = cursed.length ? cursed.map(function (it) {
      return itemCard(it, { footer: '<div class="ifoot">' + gold(300) + btn('uncurse', 'Purifier', it.uid, 'small', p.gold < 300) + '</div>' });
    }).join('') : '<div class="muted">Aucun objet maudit.</div>';

    return '<div class="screen shop-screen">' +
      '<div class="shop-head"><h1>✚ Temple de la Lumière</h1><div class="purse">' + gold(p.gold) + '</div></div>' +
      '<div class="cols">' +
      '<div class="col"><h2>Bénédictions permanentes</h2><div class="scrolly">' + list + '</div></div>' +
      '<div class="col"><h2>Purification</h2><div class="scrolly">' + curseList + '</div>' +
      '<p class="muted small">Un objet maudit conserve ses statistiques mais ne peut pas être retiré une fois équipé, sauf purification.</p>' +
      '</div></div>' +
      '<div class="row-actions">' + btn('town', 'Retour en ville') + '</div></div>';
  }

  /* =============================== GUILDE ============================== */
  function screenGuild() {
    var p = game.profile;
    var uid = params.hero || p.party.filter(Boolean)[0] || (p.heroes[0] && p.heroes[0].uid);
    var hero = p.heroes.filter(function (h) { return h.uid === uid; })[0];
    if (!hero) return '<div class="screen panel-screen"><h1>Guilde</h1><div class="muted">Aucun héros.</div>' + btn('town', 'Retour') + '</div>';

    var tabs = p.heroes.map(function (h) {
      return btn('guildHero', esc(h.name) + (h.skillPoints ? ' (' + h.skillPoints + ')' : ''), h.uid, 'tab ' + (h.uid === uid ? 'on' : ''));
    }).join('');

    var classSkills = Cl.get(hero.classId).skills;
    var common = Cl.COMMON_SKILLS;
    function skillHtml(d) {
      var r = H.skillRank(hero, d.id);
      var cost = H.skillCostNext(hero, d);
      var maxed = r >= d.max;
      return '<div class="skill ' + (r ? 'known' : '') + '">' +
        '<div class="sk-head"><span class="sk-name">' + (d.icon ? d.icon + ' ' : '') + d.name + '</span>' +
        '<span class="sk-rank">' + r + ' / ' + d.max + '</span></div>' +
        '<div class="sk-desc">' + d.desc + '</div>' +
        '<div class="sk-foot">' + (maxed ? '<span class="muted">Maîtrisé</span>' :
          btn('learn', 'Apprendre (' + cost + ' PC)', d.id, 'small primary', hero.skillPoints < cost)) + '</div></div>';
    }

    return '<div class="screen shop-screen">' +
      '<div class="shop-head"><h1>📜 Guilde des Aventuriers</h1>' +
      '<div class="purse">' + hero.skillPoints + ' point(s) de compétence</div></div>' +
      '<div class="tabs">' + tabs + '</div>' +
      heroSummary(hero) +
      '<div class="scrolly"><h2>Compétences de ' + Cl.get(hero.classId).name + '</h2>' +
      '<div class="skill-grid">' + classSkills.map(skillHtml).join('') + '</div>' +
      '<h2>Compétences communes</h2>' +
      '<div class="skill-grid">' + common.map(skillHtml).join('') + '</div></div>' +
      '<div class="row-actions">' + btn('respec', 'Réinitialiser (500 or)', hero.uid, 'danger', p.gold < 500) + btn('town', 'Retour en ville') + '</div>' +
      '</div>';
  }

  /* ======================== COFFRE / ÉQUIPEMENT ======================== */
  function screenStorage() {
    var p = game.profile;
    var uid = params.hero || p.party.filter(Boolean)[0] || (p.heroes[0] && p.heroes[0].uid);
    var hero = p.heroes.filter(function (h) { return h.uid === uid; })[0];
    if (!hero) return '<div class="screen panel-screen"><h1>Coffre</h1><div class="muted">Aucun héros.</div>' + btn('town', 'Retour') + '</div>';

    var tabs = p.heroes.map(function (h) {
      return btn('storageHero', esc(h.name), h.uid, 'tab ' + (h.uid === uid ? 'on' : ''));
    }).join('');

    var equipped = ['weapon', 'armor', 'accessory'].map(function (slot) {
      var it = hero.equip[slot];
      return '<div class="eq-slot"><div class="eq-label">' + I.SLOTS[slot] + '</div>' +
        itemCard(it, { footer: it ? '<div class="ifoot">' + btn('unequip', 'Retirer', slot, 'small', null, it.cursed) + '</div>' : '' }) + '</div>';
    }).join('');

    var filter = params.filter || 'all';
    var bagItems = p.storage.filter(function (it) {
      if (it.kind !== 'equip') return filter === 'other';
      if (filter === 'all') return true;
      return it.slot === filter;
    });
    bagItems.sort(function (a, b) {
      var ra = a.kind === 'equip' ? I.rarityIndex(a.rarity) : -1;
      var rb = b.kind === 'equip' ? I.rarityIndex(b.rarity) : -1;
      return rb - ra;
    });

    var bagHtml = bagItems.length ? bagItems.map(function (it) {
      var can = H.canEquip(hero, it);
      var reason = !it.appraised ? 'Non expertisé' :
        (it.slot === 'weapon' && it.wtype !== Cl.get(hero.classId).weapon ? 'Arme incompatible' : '');
      return itemCard(it, {
        footer: '<div class="ifoot">' + (it.kind === 'equip'
          ? (can ? btn('equip', 'Équiper', it.uid, 'small primary') : '<span class="muted small">' + reason + '</span>')
          : '<span class="muted small">' + (it.kind === 'treasure' ? 'À vendre' : 'Consommable') + '</span>') +
          btn('trash', 'Jeter', it.uid, 'small danger') + '</div>'
      });
    }).join('') : '<div class="muted">Rien ici.</div>';

    return '<div class="screen shop-screen">' +
      '<div class="shop-head"><h1>🎒 Coffre & Équipement</h1><div class="purse">' + gold(p.gold) + '</div></div>' +
      '<div class="tabs">' + tabs + '</div>' +
      '<div class="cols">' +
      '<div class="col"><h2>Équipement porté</h2>' +
      '<div class="scrolly">' + equipped + heroSummary(hero) + '</div></div>' +
      '<div class="col"><h2>Coffre <small>(' + p.storage.length + ' objets)</small></h2>' +
      '<div class="tabs small">' +
      btn('storageFilter', 'Tout', 'all', 'tab ' + (filter === 'all' ? 'on' : '')) +
      btn('storageFilter', 'Armes', 'weapon', 'tab ' + (filter === 'weapon' ? 'on' : '')) +
      btn('storageFilter', 'Armures', 'armor', 'tab ' + (filter === 'armor' ? 'on' : '')) +
      btn('storageFilter', 'Accessoires', 'accessory', 'tab ' + (filter === 'accessory' ? 'on' : '')) +
      btn('storageFilter', 'Divers', 'other', 'tab ' + (filter === 'other' ? 'on' : '')) +
      '</div>' +
      '<div class="scrolly">' + bagHtml + '</div></div></div>' +
      '<div class="row-actions">' + btn('town', 'Retour en ville') + '</div></div>';
  }

  /* =========================== CHOIX DU DONJON ========================= */
  function screenStageSelect() {
    var p = game.profile;
    var unlocked = DC.Stages.unlockedStages(p.progress);
    var selId = params.stage || (unlocked[unlocked.length - 1] || DC.Stages.LIST[0]).id;
    var st = DC.Stages.byId(selId);
    var route = params.route || 'a';
    var diffId = params.diff || p.progress.difficulty || 'normal';

    var cards = DC.Stages.LIST.map(function (s) {
      var open = unlocked.indexOf(s) >= 0;
      var cleared = p.progress.cleared[s.id];
      return '<div class="stage-card ' + (open ? '' : 'locked') + ' ' + (s.id === selId ? 'sel' : '') + '"' +
        (open ? ' data-act="pickStage" data-arg="' + s.id + '"' : '') + '>' +
        '<div class="sc-name">' + s.name + '</div>' +
        '<div class="sc-lv">Niveau conseillé ' + s.level + (cleared ? ' · ✔ terminé' : '') + '</div>' +
        '<div class="sc-blurb">' + (open ? s.blurb : 'Terminez le donjon précédent pour débloquer.') + '</div>' +
        '</div>';
    }).join('');

    var diffs = DC.Stages.DIFFICULTIES.map(function (d, i) {
      var open = i <= (p.progress.unlockedDiff - 1);
      return btn('pickDiff', d.name, d.id, 'tab ' + (d.id === diffId ? 'on' : '') + (open ? '' : ' locked'), !open);
    }).join('');

    var partyLv = 1;
    p.party.forEach(function (uid, i) {
      if (!uid || p.controls[i] === 'none') return;
      var h = p.heroes.filter(function (x) { return x.uid === uid; })[0];
      if (h) partyLv = Math.max(partyLv, h.level);
    });
    var warn = partyLv + 4 < st.level ? '<div class="warn">Votre groupe semble sous-équipé pour ce donjon.</div>' : '';

    var routeHtml = st.altRooms ? '<div class="tabs">' +
      btn('pickRoute', 'Voie A — la route directe', 'a', 'tab ' + (route === 'a' ? 'on' : '')) +
      btn('pickRoute', 'Voie B — plus dangereuse, plus riche', 'b', 'tab ' + (route === 'b' ? 'on' : '')) +
      '</div>' : '';

    return '<div class="screen shop-screen">' +
      '<div class="shop-head"><h1>🗺 Carte du royaume</h1><div class="purse">' + gold(p.gold) + '</div></div>' +
      '<div class="stage-grid">' + cards + '</div>' +
      '<h2>' + st.name + '</h2>' + routeHtml +
      '<div class="tabs">' + diffs + '</div>' + warn +
      '<div class="row-actions">' + btn('town', 'Retour') +
      btn('launch', '⚔ Lancer l\'expédition', JSON.stringify({ stage: selId, route: route, diff: diffId }), 'big primary') + '</div>' +
      '</div>';
  }

  /* ============================= RÉSULTATS ============================= */
  function screenResults() {
    var r = params.result;
    var p = game.profile;
    var lootHtml = r.bag.length ? '<div class="grid-items">' + r.bag.map(function (it) { return itemCard(it, {}); }).join('') + '</div>'
      : '<div class="muted">Aucun butin rapporté.</div>';
    var heroesHtml = r.heroes.map(function (h) {
      return '<div class="res-hero">' + esc(h.name) + ' — ' + h.xp + ' XP' +
        (h.levels ? ' <span class="badge">+' + h.levels + ' niveau(x)</span>' : '') + '</div>';
    }).join('');

    return '<div class="screen panel-screen">' +
      '<h1 class="' + (r.victory ? 'win' : 'lose') + '">' + (r.victory ? 'Donjon conquis !' : 'Expédition interrompue') + '</h1>' +
      '<div class="res-grid">' +
      '<div><b>Or récolté</b><br>' + gold(r.gold) + '</div>' +
      '<div><b>Ennemis vaincus</b><br>' + r.kills + '</div>' +
      '<div><b>Meilleur combo</b><br>' + r.bestCombo + ' coups</div>' +
      '<div><b>Durée</b><br>' + Math.floor(r.time / 60) + ' s</div>' +
      '</div>' +
      '<div class="res-heroes">' + heroesHtml + '</div>' +
      (r.victory ? '' : '<p class="muted">' + (r.reason === 'retreat'
        ? 'Retraite réussie : le butin est intact, une partie de l\'or de la dernière salle est restée sur place.'
        : 'Les trouvailles ordinaires de la dernière salle ont été perdues ; les pièces rares ont été sauvées.') + '</p>') +
      '<h2>Butin</h2>' + lootHtml +
      '<div class="row-actions">' + btn('town', 'Retour en ville', null, 'big primary') + '</div>' +
      '</div>';
  }

  /* ============================== PAUSE ================================ */
  function screenPause() {
    return '<div class="screen pause-screen"><div class="pause-box">' +
      '<h1>Pause</h1>' +
      btn('resume', 'Reprendre', null, 'big primary') +
      btn('controls', 'Commandes') +
      btn('options', 'Options') +
      btn('abandon', 'Battre en retraite', null, 'danger') +
      '</div></div>';
  }

  /* ============================ Aiguillage ============================= */
  var SCREENS = {
    title: screenTitle, controls: screenControls, options: screenOptions,
    roster: screenRoster, newHero: screenNewHero, town: screenTown,
    forge: screenForge, potion: screenPotion, temple: screenTemple,
    guild: screenGuild, storage: screenStorage, stageSelect: screenStageSelect,
    results: screenResults, pause: screenPause
  };

  var stack = [];

  function show(name, p) {
    if (current && current !== name && name !== 'pause') stack.push({ name: current, params: params });
    params = p || {};
    current = name;
    render();
  }

  function back() {
    var prev = stack.pop();
    if (prev) { current = prev.name; params = prev.params; render(); }
    else show('title');
  }

  function render() {
    if (!current) { root.innerHTML = ''; root.classList.remove('active'); return; }
    var fn = SCREENS[current];
    root.innerHTML = fn ? fn() : '';
    root.classList.add('active');
    root.classList.toggle('overlay', current === 'pause');
    // Restaure la position de défilement de la liste
    var sc = root.querySelector('.scrolly');
    if (sc && scroll[current] !== undefined) sc.scrollTop = scroll[current];
  }

  function hide() { current = null; render(); }

  function toast(msg, kind) {
    var el = document.getElementById('toasts');
    if (!el) return;
    var d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = msg;
    el.appendChild(d);
    setTimeout(function () { d.classList.add('out'); }, 2200);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2800);
  }

  /* =========================== Actions DOM ============================= */
  function findItem(list, uid) {
    for (var i = 0; i < list.length; i++) if (list[i].uid === uid) return list[i];
    return null;
  }

  var ACTIONS = {
    back: function () { back(); },
    title: function () { game.saveProfile(); stack.length = 0; show('title'); },
    roster: function () { show('roster'); },
    town: function () { game.saveProfile(); stack.length = 0; show('town'); },
    controls: function () { show('controls'); },
    options: function () { show('options'); },
    newHeroAsk: function () { show('newHero'); },

    createHero: function (classId) {
      var p = game.profile;
      if (p.heroes.length >= 8) { toast('La compagnie est complète (8 héros).'); return; }
      var name = prompt('Nom du héros ?', U.rnd.pick(H.NAMES[classId]));
      if (name === null) return;
      var hero = H.create(classId, (name || '').trim() || undefined);
      // Équipement de départ, déjà identifié.
      var w = DC.Loot.makeItem({ slot: 'weapon', level: 1, rng: U.rnd, wtype: Cl.get(classId).weapon, appraised: true, rarity: 'common' });
      var a = DC.Loot.makeItem({ slot: 'armor', level: 1, rng: U.rnd, appraised: true, rarity: 'common' });
      hero.equip.weapon = w; hero.equip.armor = a;
      p.heroes.push(hero);
      // Affectation automatique au premier emplacement libre
      for (var i = 0; i < 4; i++) {
        if (!p.party[i]) { p.party[i] = hero.uid; if (p.controls[i] === 'none') p.controls[i] = i === 0 ? 'human' : 'ai'; break; }
      }
      game.saveProfile();
      toast(hero.name + ' rejoint la compagnie !');
      show('roster');
    },
    deleteHero: function (uid) {
      var p = game.profile;
      if (!confirm('Renvoyer définitivement ce héros ?')) return;
      p.heroes = p.heroes.filter(function (h) { return h.uid !== uid; });
      p.party = p.party.map(function (u) { return u === uid ? null : u; });
      game.saveProfile(); render();
    },
    pickHero: function (uid) {
      var p = game.profile;
      if (p.party.indexOf(uid) >= 0) { toast('Ce héros est déjà dans le groupe.'); return; }
      for (var i = 0; i < 4; i++) {
        if (!p.party[i]) {
          p.party[i] = uid;
          if (p.controls[i] === 'none') p.controls[i] = (i === 0 || DC.Input.pad(i).hasGamepad) ? 'human' : 'ai';
          game.saveProfile(); render(); return;
        }
      }
      toast('Le groupe est complet.');
    },
    clearSlot: function (i) { game.profile.party[+i] = null; game.saveProfile(); render(); },
    cycleCtl: function (i) {
      i = +i;
      var p = game.profile;
      var order = ['human', 'ai', 'none'];
      p.controls[i] = order[(order.indexOf(p.controls[i]) + 1) % 3];
      game.saveProfile(); render();
    },

    /* ---- Forge ---- */
    shopForge: function () { show('forge', { tab: 'buy' }); },
    forgeTab: function (t) { params.tab = t; render(); },
    buyItem: function (idx) {
      var p = game.profile, it = game.shopCache[+idx];
      if (!it) return;
      var price = I.buyValue(it);
      if (p.gold < price) return;
      p.gold -= price;
      game.shopCache.splice(+idx, 1);
      p.storage.push(it);
      DC.Audio.play('coin', 0.6);
      toast('Acheté : ' + it.name);
      game.saveProfile(); render();
    },
    sellItem: function (uid) {
      var p = game.profile, it = findItem(p.storage, uid);
      if (!it) return;
      p.gold += I.sellValue(it);
      p.storage = p.storage.filter(function (x) { return x.uid !== uid; });
      DC.Audio.play('coin', 0.5);
      game.saveProfile(); render();
    },
    sellJunk: function () {
      var p = game.profile, total = 0;
      p.storage = p.storage.filter(function (it) {
        if (it.kind === 'equip' && it.appraised && it.rarity === 'common') { total += I.sellValue(it); return false; }
        if (it.kind === 'treasure') { total += I.sellValue(it); return false; }
        return true;
      });
      p.gold += total;
      toast('Vendu pour ' + U.fmtNum(total) + ' or.');
      game.saveProfile(); render();
    },
    appraise: function (uid) {
      var p = game.profile, it = findItem(p.storage, uid);
      if (!it) return;
      var c = I.appraiseCost(it);
      if (p.gold < c) return;
      p.gold -= c; it.appraised = true;
      DC.Audio.play('chest', 0.5);
      toast(it.name + ' — ' + I.rarity(it.rarity).name);
      game.saveProfile(); render();
    },
    appraiseAll: function () {
      var p = game.profile, spent = 0, n = 0;
      p.storage.forEach(function (it) {
        if (it.kind !== 'equip' || it.appraised) return;
        var c = I.appraiseCost(it);
        if (p.gold - spent < c) return;
        spent += c; it.appraised = true; n++;
      });
      p.gold -= spent;
      DC.Audio.play('chest', 0.6);
      toast(n + ' objet(s) expertisé(s) pour ' + U.fmtNum(spent) + ' or.');
      game.saveProfile(); render();
    },
    nextDay: function () {
      var p = game.profile;
      if (p.gold < 200) return;
      p.gold -= 200; p.shopDay++;
      game.shopCache = null;
      game.saveProfile(); render();
    },

    /* ---- Apothicaire ---- */
    shopPotion: function () { show('potion'); },
    buyPotion: function (id) { buyPotion(id, 1); },
    buyPotion5: function (id) { buyPotion(id, 5); },
    pouchOut: function (i) {
      var p = game.profile;
      var st = p.pouch[+i];
      if (!st) return;
      p.gold += Math.floor((I.consumable(st.id).value * 0.4) * st.qty);
      p.pouch.splice(+i, 1);
      game.saveProfile(); render();
    },

    /* ---- Temple ---- */
    temple: function () { show('temple'); },
    bless: function (id) {
      var p = game.profile;
      p.blessings = p.blessings || {};
      var b = BLESSINGS.filter(function (x) { return x.id === id; })[0];
      var rank = p.blessings[id] || 0;
      var cost = Math.floor(b.cost * Math.pow(1.6, rank));
      if (p.gold < cost) return;
      p.gold -= cost;
      p.blessings[id] = rank + 1;
      DC.Audio.play('levelup', 0.6);
      toast(b.name + ' — rang ' + (rank + 1));
      game.saveProfile(); render();
    },
    uncurse: function (uid) {
      var p = game.profile, it = findItem(p.storage, uid);
      if (!it || p.gold < 300) return;
      p.gold -= 300; it.cursed = false;
      toast('Objet purifié.');
      game.saveProfile(); render();
    },

    /* ---- Guilde ---- */
    guild: function () { show('guild', {}); },
    guildHero: function (uid) { params.hero = uid; render(); },
    learn: function (skillId) {
      var p = game.profile;
      var hero = p.heroes.filter(function (h) { return h.uid === (params.hero || p.party.filter(Boolean)[0]); })[0];
      if (!hero) return;
      var defs = Cl.skillsFor(hero.classId);
      var d = defs.filter(function (x) { return x.id === skillId; })[0];
      if (!d) return;
      var res = H.learn(hero, d);
      toast(res.msg);
      if (res.ok) DC.Audio.play('confirm', 0.5);
      game.saveProfile(); render();
    },
    respec: function (uid) {
      var p = game.profile;
      if (p.gold < 500) return;
      var hero = p.heroes.filter(function (h) { return h.uid === uid; })[0];
      if (!hero || !confirm('Réinitialiser toutes les compétences de ' + hero.name + ' pour 500 or ?')) return;
      p.gold -= 500;
      var back = H.respec(hero);
      toast(back + ' point(s) rendus.');
      game.saveProfile(); render();
    },

    /* ---- Coffre ---- */
    storage: function () { show('storage', {}); },
    storageHero: function (uid) { params.hero = uid; render(); },
    storageFilter: function (f) { params.filter = f; render(); },
    equip: function (uid) {
      var p = game.profile;
      var hero = p.heroes.filter(function (h) { return h.uid === (params.hero || p.party.filter(Boolean)[0]); })[0];
      var it = findItem(p.storage, uid);
      if (!hero || !it) return;
      if (!H.canEquip(hero, it)) { toast('Impossible d\'équiper cet objet.'); return; }
      H.equip(hero, it, p.storage);
      DC.Audio.play('confirm', 0.5);
      game.saveProfile(); render();
    },
    unequip: function (slot) {
      var p = game.profile;
      var hero = p.heroes.filter(function (h) { return h.uid === (params.hero || p.party.filter(Boolean)[0]); })[0];
      if (!hero) return;
      var it = hero.equip[slot];
      if (it && it.cursed) { toast('Objet maudit : purification requise au Temple.'); return; }
      H.unequip(hero, slot, p.storage);
      game.saveProfile(); render();
    },
    trash: function (uid) {
      var p = game.profile;
      p.storage = p.storage.filter(function (x) { return x.uid !== uid; });
      game.saveProfile(); render();
    },

    /* ---- Donjon ---- */
    stageSelect: function () { show('stageSelect', {}); },
    pickStage: function (id) { params.stage = id; params.route = 'a'; render(); },
    pickRoute: function (r) { params.route = r; render(); },
    pickDiff: function (d) { params.diff = d; game.profile.progress.difficulty = d; render(); },
    launch: function (json) {
      var cfg = JSON.parse(json);
      hide();
      game.startRun(cfg.stage, cfg.route, cfg.diff);
    },

    /* ---- Divers ---- */
    saveNow: function () { game.saveProfile(); toast('Partie sauvegardée.'); },
    wipeAsk: function () {
      if (!confirm('Effacer définitivement la sauvegarde ?')) return;
      DC.Save.wipe();
      game.profile = DC.Save.fresh();
      toast('Sauvegarde effacée.');
      show('title');
    },
    toggle: function (key) {
      var s = game.profile.settings;
      s[key] = !s[key];
      game.saveProfile(); render();
    },
    exportSave: function () {
      var str = DC.Save.exportString(game.profile);
      window.prompt('Copiez ce code de sauvegarde :', str);
    },
    importSave: function () {
      var str = window.prompt('Collez un code de sauvegarde :', '');
      if (!str) return;
      var data = DC.Save.importString(str);
      if (!data) { toast('Code invalide.'); return; }
      game.profile = data;
      game.saveProfile();
      toast('Sauvegarde importée.');
      show('title');
    },
    resume: function () { game.resume(); },
    abandon: function () {
      if (!confirm('Battre en retraite ? Vous gardez tout le butin ; 20 % de l\'or de la salle en cours est perdu.')) return;
      game.abandonRun();
    }
  };

  function buyPotion(id, n) {
    var p = game.profile;
    var c = I.consumable(id);
    if (!c) return;
    var cost = c.value * n;
    if (p.gold < cost) { toast('Or insuffisant.'); return; }
    var existing = p.pouch.filter(function (x) { return x.id === id; })[0];
    if (!existing && p.pouch.length >= 8) { toast('Besace pleine (8 types max).'); return; }
    p.gold -= cost;
    if (existing) existing.qty += n;
    else p.pouch.push({ kind: 'consumable', id: id, qty: n });
    DC.Audio.play('coin', 0.5);
    game.saveProfile(); render();
  }

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var act = el.getAttribute('data-act');
    var arg = el.getAttribute('data-arg');
    if (el.tagName === 'INPUT') return;
    var sc = root.querySelector('.scrolly');
    if (sc) scroll[current] = sc.scrollTop;
    var fn = ACTIONS[act];
    if (fn) { DC.Audio.play('menu', 0.4); fn(arg, el, e); }
  }

  function onInput(e) {
    var el = e.target;
    var act = el.getAttribute && el.getAttribute('data-act');
    if (!act) return;
    var s = game.profile.settings;
    if (act === 'setSfx') s.sfx = parseFloat(el.value);
    if (act === 'setMusic') s.music = parseFloat(el.value);
    DC.Audio.setVolumes(s);
    game.saveProfile();
    var span = el.nextElementSibling;
    if (span) span.textContent = Math.round(parseFloat(el.value) * 100) + ' %';
  }

  function init(g) {
    game = g;
    root = document.getElementById('ui');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
  }

  return {
    init: init, show: show, hide: hide, back: back, render: render, toast: toast,
    get current() { return current; },
    itemCard: itemCard, BLESSINGS: BLESSINGS
  };
})();

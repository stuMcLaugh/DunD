/* DunD — searchable monster list (stats summarized from SRD 5.1, CC BY 4.0) */
(function () {
  'use strict';

  var U = DnD.util;
  var els = {};

  var XP_BY_CR = {
    0: 10, 0.125: 25, 0.25: 50, 0.5: 100,
    1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
    6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
    11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
    16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
    21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000,
    26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000
  };

  /* Easy / Medium / Hard / Deadly XP thresholds per character level. */
  var XP_THRESHOLDS = [
    [25, 50, 75, 100],
    [50, 100, 150, 200],
    [75, 150, 225, 400],
    [125, 250, 375, 500],
    [250, 500, 750, 1100],
    [300, 600, 900, 1400],
    [350, 750, 1100, 1700],
    [450, 900, 1400, 2100],
    [550, 1100, 1600, 2400],
    [600, 1200, 1900, 2800],
    [800, 1600, 2400, 3600],
    [1000, 2000, 3000, 4500],
    [1100, 2200, 3400, 5100],
    [1250, 2500, 3800, 5700],
    [1400, 2800, 4300, 6400],
    [1600, 3200, 4800, 7200],
    [2000, 3900, 5900, 8800],
    [2100, 4200, 6300, 9500],
    [2400, 4900, 7300, 10900],
    [2800, 5700, 8500, 12700]
  ];

  function encounterMultiplier(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 1.5;
    if (count <= 6) return 2;
    if (count <= 10) return 2.5;
    if (count <= 14) return 3;
    return 4;
  }

  /* [name, type, AC, average HP, challenge rating] */
  var RAW = [
    ['Acolyte', 'Medium humanoid', 10, 9, 0.25],
    ['Adult Red Dragon', 'Huge dragon', 19, 256, 17],
    ['Animated Armor', 'Medium construct', 18, 33, 1],
    ['Bandit', 'Medium humanoid', 12, 11, 0.125],
    ['Barbed Devil', 'Medium fiend', 15, 110, 5],
    ['Basilisk', 'Medium monstrosity', 15, 52, 3],
    ['Bearded Devil', 'Medium fiend', 13, 52, 3],
    ['Beholder', 'Large aberration', 18, 180, 13],
    ['Berserker', 'Medium humanoid', 13, 67, 2],
    ['Black Dragon Wyrmling', 'Medium dragon', 17, 33, 2],
    ['Blue Dragon Wyrmling', 'Medium dragon', 17, 52, 3],
    ['Bone Devil', 'Large fiend', 16, 142, 9],
    ['Brown Bear', 'Large beast', 11, 34, 1],
    ['Bugbear', 'Medium humanoid', 16, 27, 1],
    ['Centaur', 'Large monstrosity', 12, 45, 2],
    ['Chain Devil', 'Medium fiend', 16, 85, 8],
    ['Chimera', 'Large monstrosity', 14, 114, 6],
    ['Clay Golem', 'Large construct', 14, 133, 9],
    ['Cloud Giant', 'Huge giant', 14, 200, 9],
    ['Cult Fanatic', 'Medium humanoid', 13, 33, 2],
    ['Cultist', 'Medium humanoid', 12, 9, 0.125],
    ['Dire Wolf', 'Large beast', 14, 37, 1],
    ['Erinyes', 'Medium fiend', 18, 153, 12],
    ['Ettin', 'Large giant', 12, 85, 4],
    ['Fire Giant', 'Huge giant', 18, 162, 9],
    ['Flameskull', 'Tiny undead', 13, 40, 4],
    ['Flesh Golem', 'Medium construct', 9, 93, 5],
    ['Frost Giant', 'Huge giant', 15, 138, 8],
    ['Gargoyle', 'Medium elemental', 15, 52, 2],
    ['Gelatinous Cube', 'Large ooze', 6, 84, 2],
    ['Ghast', 'Medium undead', 13, 36, 2],
    ['Ghoul', 'Medium undead', 12, 22, 1],
    ['Giant Boar', 'Large beast', 12, 42, 2],
    ['Giant Eagle', 'Large beast', 13, 26, 1],
    ['Giant Rat', 'Small beast', 12, 7, 0.125],
    ['Giant Spider', 'Large beast', 14, 26, 1],
    ['Glabrezu', 'Large fiend', 17, 157, 9],
    ['Gladiator', 'Medium humanoid', 16, 112, 5],
    ['Gnoll', 'Medium humanoid', 15, 22, 0.5],
    ['Goblin', 'Small humanoid', 15, 7, 0.25],
    ['Gray Ooze', 'Medium ooze', 8, 22, 0.5],
    ['Green Dragon Wyrmling', 'Medium dragon', 17, 38, 2],
    ['Griffon', 'Large monstrosity', 12, 59, 2],
    ['Guard', 'Medium humanoid', 16, 11, 0.125],
    ['Harpy', 'Medium monstrosity', 11, 38, 1],
    ['Hell Hound', 'Medium fiend', 15, 45, 3],
    ['Hezrou', 'Large fiend', 16, 136, 8],
    ['Hill Giant', 'Huge giant', 13, 105, 5],
    ['Hobgoblin', 'Medium humanoid', 18, 11, 0.5],
    ['Hydra', 'Huge monstrosity', 15, 172, 8],
    ['Imp', 'Tiny fiend', 13, 10, 1],
    ['Iron Golem', 'Large construct', 20, 210, 16],
    ['Knight', 'Medium humanoid', 18, 52, 3],
    ['Kobold', 'Small humanoid', 12, 5, 0.125],
    ['Lich', 'Medium undead', 17, 135, 21],
    ['Mage', 'Medium humanoid', 12, 40, 6],
    ['Manticore', 'Large monstrosity', 14, 68, 3],
    ['Marilith', 'Large fiend', 18, 189, 16],
    ['Medusa', 'Medium monstrosity', 15, 127, 6],
    ['Mind Flayer', 'Medium aberration', 15, 71, 7],
    ['Minotaur', 'Large monstrosity', 14, 76, 3],
    ['Mummy', 'Medium undead', 11, 58, 3],
    ['Nalfeshnee', 'Large fiend', 18, 184, 13],
    ['Nightmare', 'Large fiend', 13, 68, 3],
    ['Ochre Jelly', 'Large ooze', 8, 45, 2],
    ['Ogre', 'Large giant', 11, 59, 2],
    ['Orc', 'Medium humanoid', 13, 15, 0.5],
    ['Owlbear', 'Large monstrosity', 13, 59, 3],
    ['Pit Fiend', 'Large fiend', 19, 300, 20],
    ['Priest', 'Medium humanoid', 13, 27, 2],
    ['Purple Worm', 'Gargantuan monstrosity', 18, 247, 15],
    ['Quasit', 'Tiny fiend', 13, 7, 1],
    ['Red Dragon Wyrmling', 'Medium dragon', 17, 75, 4],
    ['Roc', 'Gargantuan monstrosity', 15, 248, 11],
    ['Scout', 'Medium humanoid', 13, 16, 0.5],
    ['Shadow', 'Medium undead', 12, 16, 0.5],
    ['Shambling Mound', 'Large plant', 15, 136, 5],
    ['Skeleton', 'Medium undead', 13, 13, 0.25],
    ['Stone Giant', 'Huge giant', 17, 126, 7],
    ['Stone Golem', 'Large construct', 17, 178, 10],
    ['Succubus', 'Medium fiend', 15, 66, 4],
    ['Thug', 'Medium humanoid', 11, 32, 0.5],
    ['Treant', 'Huge plant', 16, 138, 9],
    ['Troll', 'Large giant', 15, 84, 5],
    ['Veteran', 'Medium humanoid', 17, 45, 3],
    ['Vrock', 'Large fiend', 15, 104, 6],
    ['White Dragon Wyrmling', 'Medium dragon', 16, 32, 2],
    ['Wight', 'Medium undead', 14, 45, 3],
    ['Will-o’-Wisp', 'Tiny undead', 19, 22, 2],
    ['Wolf', 'Medium beast', 13, 11, 0.25],
    ['Wraith', 'Medium undead', 13, 67, 5],
    ['Wyvern', 'Large dragon', 13, 110, 6],
    ['Young Green Dragon', 'Large dragon', 18, 136, 8],
    ['Young White Dragon', 'Large dragon', 17, 133, 6],
    ['Zombie', 'Medium undead', 8, 22, 0.25]
  ];

  var MONSTERS = RAW.map(function (row) {
    return {
      name: row[0],
      type: row[1],
      ac: row[2],
      hp: row[3],
      cr: row[4],
      xp: XP_BY_CR[row[4]] || 0
    };
  });

  function crLabel(cr) {
    if (cr === 0.125) return '1/8';
    if (cr === 0.25) return '1/4';
    if (cr === 0.5) return '1/2';
    return String(cr);
  }

  function cardHtml(monster) {
    return '<article class="monster-card">' +
      '<header><h3>' + U.esc(monster.name) + '</h3>' +
        '<span class="cr-badge">CR ' + crLabel(monster.cr) + '</span></header>' +
      '<p class="monster-type">' + U.esc(monster.type) + '</p>' +
      '<dl class="monster-stats">' +
        '<div><dt>AC</dt><dd>' + monster.ac + '</dd></div>' +
        '<div><dt>HP</dt><dd>' + monster.hp + '</dd></div>' +
        '<div><dt>XP</dt><dd>' + monster.xp.toLocaleString() + '</dd></div>' +
      '</dl>' +
      '<div class="monster-actions">' +
        '<button type="button" class="btn small" data-add="' + U.esc(monster.name) + '">Add to combat</button>' +
        '<button type="button" class="btn small ghost" data-build="' + U.esc(monster.name) + '">+ Build</button>' +
      '</div>' +
    '</article>';
  }

  function render() {
    if (!els.list) return;

    var query = els.search.value.trim().toLowerCase();
    var band = els.cr.value;

    var list = MONSTERS.filter(function (m) {
      if (query && m.name.toLowerCase().indexOf(query) < 0 && m.type.toLowerCase().indexOf(query) < 0) {
        return false;
      }
      if (band === 'low') return m.cr <= 0.5;
      if (band === 'mid') return m.cr >= 1 && m.cr <= 4;
      if (band === 'high') return m.cr >= 5 && m.cr <= 10;
      if (band === 'epic') return m.cr >= 11;
      return true;
    });

    list.sort(function (a, b) {
      return a.cr - b.cr || a.name.localeCompare(b.name);
    });

    els.summary.textContent = list.length
      ? list.length + (list.length === 1 ? ' monster' : ' monsters') + ' shown' +
        (query ? ' for “' + els.search.value.trim() + '”' : '') + '.'
      : 'No monsters match that search.';

    els.list.innerHTML = list.map(cardHtml).join('');
  }

  function renderBuilder() {
    if (!els.builderSummary) return;
    var enc = DnD.store.state.encounter;

    els.builderLevel.value = String(enc.level);
    els.builderSize.value = String(enc.size);

    var rows = [];
    var totalCount = 0;
    var baseXp = 0;

    enc.items.forEach(function (item) {
      var monster = MONSTERS.find(function (m) { return m.name === item.name; });
      if (!monster) return;
      totalCount += item.count;
      baseXp += monster.xp * item.count;
      rows.push('<div class="builder-item">' +
        '<span class="builder-name">' + U.esc(item.name) +
          ' <span class="muted">×' + item.count + '</span></span>' +
        '<span class="muted small">' + (monster.xp * item.count).toLocaleString() + ' XP</span>' +
        '<button type="button" class="btn small danger-ghost" data-builder-remove="' +
          U.esc(item.name) + '" aria-label="Remove ' + U.esc(item.name) + ' from the build">×</button>' +
      '</div>');
    });

    els.builderList.innerHTML = rows.length
      ? rows.join('')
      : '<p class="muted small">Nothing selected yet. Use “+ Build” on a monster below to test an encounter.</p>';

    var multiplier = encounterMultiplier(totalCount);
    var adjusted = Math.round(baseXp * multiplier);
    var thresholds = XP_THRESHOLDS[enc.level - 1].map(function (value) { return value * enc.size; });

    var label = 'Trivial';
    if (adjusted >= thresholds[3]) label = 'Deadly';
    else if (adjusted >= thresholds[2]) label = 'Hard';
    else if (adjusted >= thresholds[1]) label = 'Medium';
    else if (adjusted >= thresholds[0]) label = 'Easy';

    els.builderSummary.innerHTML =
      '<span class="builder-xp"><strong>' + adjusted.toLocaleString() + '</strong> adjusted XP</span>' +
      '<span class="builder-diff ' + label.toLowerCase() + '">' + label + '</span>' +
      '<span class="muted small">' + totalCount + ' monster' + (totalCount === 1 ? '' : 's') +
        ' · ' + baseXp.toLocaleString() + ' base XP · ×' + multiplier + '</span>' +
      '<span class="muted small">Thresholds: Easy ' + thresholds[0].toLocaleString() +
        ' · Medium ' + thresholds[1].toLocaleString() +
        ' · Hard ' + thresholds[2].toLocaleString() +
        ' · Deadly ' + thresholds[3].toLocaleString() + '</span>';
  }

  function addToBuilder(name, count) {
    var enc = DnD.store.state.encounter;
    var existing = enc.items.find(function (item) { return item.name === name; });
    if (existing) existing.count = Math.min(99, existing.count + count);
    else enc.items.push({ name: name, count: count });
    DnD.store.save();
    renderBuilder();
  }

  function removeFromBuilder(name) {
    var enc = DnD.store.state.encounter;
    enc.items = enc.items.filter(function (item) { return item.name !== name; });
    DnD.store.save();
    renderBuilder();
  }

  function onClick(event) {
    var button = event.target.closest('[data-add], [data-build]');
    if (!button) return;

    var isBuild = button.hasAttribute('data-build');
    var name = button.getAttribute(isBuild ? 'data-build' : 'data-add');
    var monster = MONSTERS.find(function (m) { return m.name === name; });
    if (!monster) return;

    var count = U.clamp(U.toInt(els.count.value, 1), 1, 20);

    if (isBuild) {
      addToBuilder(monster.name, count);
      if (DnD.ui) DnD.ui.toast('Added ' + count + ' × ' + monster.name + ' to the encounter build.');
      return;
    }

    DnD.combat.addMonster(monster, count);

    if (DnD.ui) {
      var hidden = DnD.store.state.settings.playerView !== false;
      DnD.ui.toast(
        count + ' × ' + monster.name + ' added — ' +
        (monster.xp * count).toLocaleString() + ' XP.' +
        (hidden ? ' HP hidden in player view.' : '')
      );
    }
  }

  function init() {
    els.search = document.getElementById('bestiary-search');
    els.cr = document.getElementById('bestiary-cr');
    els.count = document.getElementById('bestiary-count');
    els.list = document.getElementById('bestiary-list');
    els.summary = document.getElementById('bestiary-summary');
    els.builderLevel = document.getElementById('builder-level');
    els.builderSize = document.getElementById('builder-size');
    els.builderSummary = document.getElementById('builder-summary');
    els.builderList = document.getElementById('builder-list');
    if (!els.list) return;

    els.search.addEventListener('input', render);
    els.cr.addEventListener('change', render);
    els.list.addEventListener('click', onClick);

    els.builderLevel.addEventListener('change', function () {
      DnD.store.state.encounter.level = U.clamp(U.toInt(els.builderLevel.value, 5), 1, 20);
      DnD.store.save();
      renderBuilder();
    });

    els.builderSize.addEventListener('change', function () {
      DnD.store.state.encounter.size = U.clamp(U.toInt(els.builderSize.value, 4), 1, 10);
      DnD.store.save();
      renderBuilder();
    });

    els.builderList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-builder-remove]');
      if (!button) return;
      removeFromBuilder(button.getAttribute('data-builder-remove'));
    });

    var clearButton = document.getElementById('btn-builder-clear');
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        DnD.store.state.encounter.items = [];
        DnD.store.save();
        renderBuilder();
      });
    }

    render();
    renderBuilder();
  }

  DnD.bestiary = {
    init: init,
    render: render,
    refresh: function () {
      render();
      renderBuilder();
    },
    monsters: MONSTERS
  };
})();

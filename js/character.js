/* DunD — personal character sheet for players */
(function () {
  'use strict';

  var U = DnD.util;
  var ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  var CURRENCIES = ['cp', 'sp', 'ep', 'gp', 'pp'];

  var ABILITIES = [
    ['str', 'Strength', 'STR'],
    ['dex', 'Dexterity', 'DEX'],
    ['con', 'Constitution', 'CON'],
    ['int', 'Intelligence', 'INT'],
    ['wis', 'Wisdom', 'WIS'],
    ['cha', 'Charisma', 'CHA']
  ];

  var SKILLS = [
    ['acrobatics', 'Acrobatics', 'dex'],
    ['animal', 'Animal Handling', 'wis'],
    ['arcana', 'Arcana', 'int'],
    ['athletics', 'Athletics', 'str'],
    ['deception', 'Deception', 'cha'],
    ['history', 'History', 'int'],
    ['insight', 'Insight', 'wis'],
    ['intimidation', 'Intimidation', 'cha'],
    ['investigation', 'Investigation', 'int'],
    ['medicine', 'Medicine', 'wis'],
    ['nature', 'Nature', 'int'],
    ['perception', 'Perception', 'wis'],
    ['performance', 'Performance', 'cha'],
    ['persuasion', 'Persuasion', 'cha'],
    ['religion', 'Religion', 'int'],
    ['sleight', 'Sleight of Hand', 'dex'],
    ['stealth', 'Stealth', 'dex'],
    ['survival', 'Survival', 'wis']
  ];

  var els = {};

  function state() { return DnD.store.state; }
  function toast(message) { if (DnD.ui) DnD.ui.toast(message); }

  function pcs() {
    return state().combatants.filter(function (c) { return c.kind === 'pc'; });
  }

  function active() {
    var id = state().settings.activeCharacterId;
    if (!id) return null;
    return state().combatants.find(function (c) {
      return c.id === id && c.kind === 'pc';
    }) || null;
  }

  function conditions() {
    return (DnD.combat && DnD.combat.conditions) || [];
  }

  function mod(score) {
    return Math.floor((U.toInt(score, 10) - 10) / 2);
  }

  function profBonus(level) {
    return 2 + Math.floor((U.clamp(U.toInt(level, 1), 1, 20) - 1) / 4);
  }

  function saveBonus(c, key) {
    return mod(c.pc.abilities[key]) + (c.pc.saveProfs[key] ? profBonus(c.pc.level) : 0);
  }

  function skillBonus(c, key, abilityKey) {
    var rank = U.clamp(U.toInt(c.pc.skillProfs[key], 0), 0, 2);
    return mod(c.pc.abilities[abilityKey]) + rank * profBonus(c.pc.level);
  }

  function recomputePassive(c) {
    c.pc.passive = U.clamp(10 + skillBonus(c, 'perception', 'wis'), 0, 40);
  }

  function spellStats(c) {
    var ability = c.pc.spellAbility;
    if (!ability || !c.pc.abilities[ability]) return { dc: null, atk: null };
    var proficiency = profBonus(c.pc.level);
    var m = mod(c.pc.abilities[ability]);
    return { dc: 8 + proficiency + m, atk: proficiency + m };
  }

  function exprMod(n) {
    return n ? (n > 0 ? '+' + n : String(n)) : '';
  }

  function abilityName(key) {
    var found = ABILITIES.find(function (a) { return a[0] === key; });
    return found ? found[1] : key;
  }

  function findAttack(c, id) {
    return c.pc.attacks.find(function (a) { return a.id === id; });
  }

  function quickRoll(expr, note) {
    try {
      var result = DnD.dice.record(expr, note);
      toast(note + ': ' + result.total +
        (result.nat === 20 ? ' — natural 20!' : result.nat === 1 ? ' — natural 1' : ''));
    } catch (err) {
      toast(err && err.message ? err.message : 'Could not roll that.');
    }
  }

  function spendHitDie(c) {
    var hitDice = c.pc.hitDice;
    if (hitDice.used >= hitDice.total) {
      toast('No hit dice left — take a long rest.');
      return;
    }

    var result;
    try {
      result = DnD.dice.record('1d' + hitDice.die + exprMod(mod(c.pc.abilities.con)), c.name + ' hit die');
    } catch (err) {
      toast('Could not roll the hit die.');
      return;
    }

    hitDice.used = U.clamp(hitDice.used + 1, 0, hitDice.total);
    var healed = Math.max(1, result.total);
    c.hp.current = U.clamp(c.hp.current + healed, 0, c.hp.max);

    DnD.store.log(
      c.name + ' spends a hit die (' + result.expr + ') and regains ' + healed +
      ' HP — HP ' + c.hp.current + '/' + c.hp.max + '.',
      'heal'
    );
    DnD.store.commit();
    toast('Hit die: ' + result.expr + ' = ' + result.total + ' · healed ' + healed + ' HP.');
  }

  function pipsHtml(count, cls) {
    var out = '';
    for (var i = 0; i < 3; i += 1) {
      out += '<span class="pip ' + cls + (i < count ? ' on' : '') + '"></span>';
    }
    return out;
  }

  function profileHtml(c, title) {
    var hitDice = c.pc.hitDice;

    return '<section class="card char-identity-card">' +
      '<div class="char-avatar-wrap">' +
        U.avatar(c, 'large') +
        '<div class="portrait-actions">' +
          '<button type="button" class="btn small ghost" data-act="portrait">Portrait</button>' +
          (c.portrait ? '<button type="button" class="btn small ghost" data-act="clear-portrait">Remove</button>' : '') +
        '</div>' +
      '</div>' +
      '<h2>' + U.esc(c.name) + '</h2>' +
      '<p class="muted">' + U.esc(title || 'Adventurer') +
        (c.pc.player ? ' · ' + U.esc(c.pc.player) : '') + '</p>' +
      '<button type="button" class="btn small inspiration' + (c.pc.inspiration ? ' on' : '') +
        '" data-act="inspiration" aria-pressed="' + (c.pc.inspiration ? 'true' : 'false') + '">' +
        (c.pc.inspiration ? '★ Inspired' : '☆ Inspiration') + '</button>' +
      '<div class="char-stats">' +
        '<span><strong>' + c.ac + '</strong>AC</span>' +
        '<span><strong>' + c.pc.speed + '</strong>Speed</span>' +
        '<span><strong>' + c.pc.passive + '</strong>Passive</span>' +
        '<span><strong>' + U.signed(c.initMod) + '</strong>Init</span>' +
        '<span><strong>' + (hitDice.total - hitDice.used) + '/' + hitDice.total + '</strong>Hit dice</span>' +
      '</div>' +
      '<div class="char-quick-actions">' +
        '<button type="button" class="btn small ghost" data-act="spend-hit-die"' +
          (hitDice.used >= hitDice.total ? ' disabled' : '') + '>Spend d' + hitDice.die + '</button>' +
        '<button type="button" class="btn small ghost" data-act="edit-in-party">Edit basics</button>' +
      '</div>' +
      '<details class="char-config">' +
        '<summary>Speed &amp; hit dice</summary>' +
        '<div class="editor-grid">' +
          '<label class="field"><span>Speed (ft)</span><input data-vitals="speed" type="number" min="0" max="200" value="' + c.pc.speed + '"></label>' +
          '<label class="field"><span>Hit die</span><select data-vitals="die">' +
            [6, 8, 10, 12].map(function (die) {
              return '<option value="' + die + '"' + (hitDice.die === die ? ' selected' : '') + '>d' + die + '</option>';
            }).join('') +
          '</select></label>' +
          '<label class="field"><span>Total hit dice</span><input data-vitals="total" type="number" min="1" max="40" value="' + hitDice.total + '"></label>' +
          '<label class="field"><span>Spent hit dice</span><input data-vitals="used" type="number" min="0" max="' + hitDice.total + '" value="' + hitDice.used + '"></label>' +
        '</div>' +
        '<div class="editor-actions"><button type="button" class="btn primary small" data-act="save-vitals">Save</button></div>' +
      '</details>' +
    '</section>';
  }

  function classHtml(c) {
    var info = DnD.classes.find(c.pc.classId);
    var features = DnD.classes.featuresFor(c.pc.classId, c.pc.level);

    var featureItems = features.length
      ? features.map(function (feature) {
          return '<li><span class="feature-level">' + feature.level + '</span><span>' + U.esc(feature.name) + '</span></li>';
        }).join('')
      : '<li class="muted">Choose a class to see its features.</li>';

    var skillHint = info
      ? 'Class skills (choose ' + info.skills.count + '): ' +
        info.skills.list.map(function (key) { return DnD.classes.skillName(key); }).join(', ') + '.'
      : '';

    var casterLabel = !info
      ? 'not set'
      : info.caster === 'full'
        ? 'full caster'
        : info.caster === 'half'
          ? 'half caster'
          : info.caster === 'artificer'
            ? 'artificer caster'
            : info.caster === 'pact'
              ? 'pact magic'
              : 'martial';

    return '<section class="card">' +
      '<div class="card-head"><h2>Class</h2><span class="muted small">' +
        (info ? 'd' + info.hitDie + ' · ' + casterLabel : 'not set') + '</span></div>' +
      '<div class="class-identity">' +
        '<strong>' + U.esc(c.pc.class || 'No class') + '</strong>' +
        (c.pc.subclass ? '<span class="muted">· ' + U.esc(c.pc.subclass) + '</span>' : '') +
        '<span class="muted">· Level ' + c.pc.level + '</span>' +
      '</div>' +
      '<details class="char-config">' +
        '<summary>Class, subclass &amp; level</summary>' +
        '<div class="editor-grid">' +
          '<label class="field"><span>Class</span><select id="char-class-select">' +
            DnD.classes.optionsHtml(c.pc.classId, c.pc.classId ? '' : c.pc.class) + '</select></label>' +
          '<label class="field"><span>Level</span><input id="char-level" type="number" min="1" max="20" value="' + c.pc.level + '"></label>' +
          '<label class="field full"><span>Subclass</span>' +
            '<input id="char-subclass" list="char-subclass-list" maxlength="40" value="' + U.esc(c.pc.subclass) + '" placeholder="Optional — suggestions appear as you type">' +
            '<datalist id="char-subclass-list">' + DnD.classes.subclassOptionsHtml(c.pc.classId) + '</datalist></label>' +
          '<label class="field full"><span>Custom class name (homebrew)</span>' +
            '<input id="char-class-custom" maxlength="40" value="' + U.esc(info ? '' : c.pc.class) + '" placeholder="Only for homebrew classes"></label>' +
        '</div>' +
        '<div class="editor-actions"><button type="button" class="btn small" data-act="apply-class">Apply class defaults</button></div>' +
        '<p class="hint">Changing class or level applies its hit die, saving throws, spell slots and class resources.</p>' +
        (skillHint ? '<p class="hint">' + U.esc(skillHint) + '</p>' : '') +
      '</details>' +
      '<ul class="feature-list">' + featureItems + '</ul>' +
    '</section>';
  }

  function abilitiesHtml(c) {
    var proficiency = profBonus(c.pc.level);

    var cards = ABILITIES.map(function (a) {
      var score = c.pc.abilities[a[0]];
      var m = mod(score);
      return '<button type="button" class="ability-card" data-act="roll-check" data-key="' + a[0] +
        '" title="Roll a ' + a[1] + ' check (' + U.signed(m) + ')">' +
        '<span class="ability-label">' + a[2] + '</span>' +
        '<strong class="ability-score">' + score + '</strong>' +
        '<span class="ability-mod">' + U.signed(m) + '</span>' +
      '</button>';
    }).join('');

    var saves = ABILITIES.map(function (a) {
      var isProficient = c.pc.saveProfs[a[0]];
      var bonus = mod(c.pc.abilities[a[0]]) + (isProficient ? proficiency : 0);
      return '<div class="save-row">' +
        '<span class="skill-mark ' + (isProficient ? 'prof' : '') + '">' + (isProficient ? '●' : '○') + '</span>' +
        '<span class="save-name">' + a[1] + '</span>' +
        '<strong class="save-bonus">' + U.signed(bonus) + '</strong>' +
        '<button type="button" class="btn small ghost" data-act="roll-save" data-key="' + a[0] + '">Roll</button>' +
      '</div>';
    }).join('');

    var config = ABILITIES.map(function (a) {
      return '<div class="ability-config-row">' +
        '<label class="field"><span>' + a[1] + '</span>' +
          '<input data-ability="' + a[0] + '" type="number" min="1" max="30" value="' + c.pc.abilities[a[0]] + '"></label>' +
        '<label class="check"><input type="checkbox" data-save-prof="' + a[0] + '"' +
          (c.pc.saveProfs[a[0]] ? ' checked' : '') + '> save prof.</label>' +
      '</div>';
    }).join('');

    return '<section class="card">' +
      '<div class="card-head"><h2>Abilities &amp; saves</h2><span class="muted small">click a score to roll</span></div>' +
      '<div class="ability-grid">' + cards + '</div>' +
      '<div class="save-list">' + saves + '</div>' +
      '<details class="char-config">' +
        '<summary>Configure scores &amp; saving throws</summary>' +
        '<div class="ability-config-grid">' + config + '</div>' +
        '<div class="editor-actions"><button type="button" class="btn primary small" data-act="save-abilities">Save abilities</button></div>' +
        '<p class="hint">Saving recalculates passive Perception from the Perception skill.</p>' +
      '</details>' +
    '</section>';
  }

  function skillsHtml(c) {
    var proficiency = profBonus(c.pc.level);

    var rows = SKILLS.map(function (s) {
      var rank = U.clamp(U.toInt(c.pc.skillProfs[s[0]], 0), 0, 2);
      var bonus = mod(c.pc.abilities[s[2]]) + rank * proficiency;
      return '<button type="button" class="skill-row" data-act="roll-skill" data-key="' + s[0] +
        '" title="Roll ' + s[1] + '">' +
        '<span class="skill-mark ' + (rank === 2 ? 'expert' : rank === 1 ? 'prof' : '') + '">' +
          (rank === 2 ? '◆' : rank === 1 ? '●' : '○') + '</span>' +
        '<span class="skill-name">' + s[1] + '</span>' +
        '<span class="skill-ability">' + s[2].toUpperCase() + '</span>' +
        '<strong class="skill-bonus">' + U.signed(bonus) + '</strong>' +
      '</button>';
    }).join('');

    var config = SKILLS.map(function (s) {
      var rank = U.clamp(U.toInt(c.pc.skillProfs[s[0]], 0), 0, 2);
      return '<label class="field"><span>' + s[1] + ' (' + s[2].toUpperCase() + ')</span>' +
        '<select data-skill-prof="' + s[0] + '">' +
          '<option value="0"' + (rank === 0 ? ' selected' : '') + '>—</option>' +
          '<option value="1"' + (rank === 1 ? ' selected' : '') + '>Proficient</option>' +
          '<option value="2"' + (rank === 2 ? ' selected' : '') + '>Expertise</option>' +
        '</select></label>';
    }).join('');

    return '<section class="card">' +
      '<div class="card-head"><h2>Skills</h2><span class="muted small">● prof · ◆ expertise</span></div>' +
      '<div class="skill-list">' + rows + '</div>' +
      '<details class="char-config">' +
        '<summary>Configure proficiencies</summary>' +
        '<div class="skill-config-grid">' + config + '</div>' +
        '<div class="editor-actions"><button type="button" class="btn primary small" data-act="save-skills">Save proficiencies</button></div>' +
      '</details>' +
    '</section>';
  }

  function attacksHtml(c) {
    var list = c.pc.attacks.length
      ? c.pc.attacks.map(function (attack) {
          return '<article class="attack-item">' +
            '<div class="attack-view">' +
              '<div class="attack-info">' +
                '<strong>' + U.esc(attack.name) + '</strong>' +
                '<span class="muted small">' + U.signed(attack.bonus) + ' to hit · ' +
                  U.esc(attack.damage) + (attack.type ? ' ' + U.esc(attack.type) : '') + '</span>' +
              '</div>' +
              '<div class="attack-buttons">' +
                '<button type="button" class="btn small" data-act="roll-attack" data-attack="' + attack.id + '">Attack</button>' +
                '<button type="button" class="btn small ghost" data-act="roll-damage" data-attack="' + attack.id + '">Damage</button>' +
              '</div>' +
            '</div>' +
            '<details class="attack-editor">' +
              '<summary>Edit</summary>' +
              '<div class="editor-grid">' +
                '<label class="field"><span>Name</span><input data-attack-edit="name" maxlength="40" value="' + U.esc(attack.name) + '"></label>' +
                '<label class="field"><span>Attack bonus</span><input data-attack-edit="bonus" type="number" value="' + attack.bonus + '"></label>' +
                '<label class="field"><span>Damage</span><input data-attack-edit="damage" maxlength="40" placeholder="1d8+3" value="' + U.esc(attack.damage) + '"></label>' +
                '<label class="field"><span>Type</span><input data-attack-edit="type" maxlength="30" placeholder="slashing" value="' + U.esc(attack.type) + '"></label>' +
              '</div>' +
              '<div class="editor-actions">' +
                '<button type="button" class="btn primary small" data-act="save-attack" data-attack="' + attack.id + '">Save</button>' +
                '<button type="button" class="btn small danger-ghost" data-act="remove-attack" data-attack="' + attack.id + '">Remove</button>' +
              '</div>' +
            '</details>' +
          '</article>';
        }).join('')
      : '<p class="muted small">No attacks yet — add the ones you use most.</p>';

    var form = '<form id="attack-form" class="attack-form" autocomplete="off">' +
      '<label class="field grow"><span>Name</span><input name="name" maxlength="40" placeholder="Longsword" required></label>' +
      '<label class="field atk-bonus"><span>To hit</span><input name="bonus" type="number" value="0"></label>' +
      '<label class="field atk-damage"><span>Damage</span><input name="damage" maxlength="40" value="1d8" placeholder="1d8+3"></label>' +
      '<label class="field atk-type"><span>Type</span><input name="type" maxlength="30" placeholder="slashing"></label>' +
      '<button type="submit" class="btn small">Add attack</button>' +
    '</form>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Attacks</h2><span class="muted small">roll from here</span></div>' +
      '<div class="attack-list">' + list + '</div>' + form +
    '</section>';
  }

  function slotsHtml(c) {
    var configured = c.pc.slots.filter(function (slot) { return slot.max > 0; });
    if (!configured.length) {
      return '<p class="muted small">No spell slots configured yet.</p>';
    }
    return '<div class="slot-grid">' + configured.map(function (slot) {
      var pips = '';
      for (var i = 0; i < slot.max; i += 1) {
        var used = i < slot.used;
        pips += '<button type="button" class="slot-pip' + (used ? ' used' : '') +
          '" data-act="slot" data-level="' + slot.level + '" data-index="' + i +
          '" aria-label="' + (used ? 'Restore' : 'Use') + ' a level ' + slot.level + ' slot"' +
          ' aria-pressed="' + (used ? 'true' : 'false') + '"></button>';
      }
      return '<div class="slot-row">' +
        '<span class="slot-level">' + ORDINALS[slot.level - 1] + '</span>' +
        '<span class="slot-pips">' + pips + '</span>' +
        '<span class="slot-count">' + (slot.max - slot.used) + ' / ' + slot.max + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function slotConfigHtml(c) {
    return '<details class="slot-config">' +
      '<summary>Configure slot totals</summary>' +
      '<div class="slot-config-grid">' +
        c.pc.slots.map(function (slot) {
          return '<label class="field"><span>' + ORDINALS[slot.level - 1] + '</span>' +
            '<input data-slot-max="' + slot.level + '" type="number" min="0" max="9" value="' + slot.max + '"></label>';
        }).join('') +
      '</div>' +
      '<button type="button" class="btn small" data-act="save-slots">Save slot totals</button>' +
    '</details>';
  }

  function spellcastingHtml(c) {
    var stats = spellStats(c);
    var abilityOptions = [
      ['', '— not a caster —'],
      ['int', 'Intelligence'],
      ['wis', 'Wisdom'],
      ['cha', 'Charisma']
    ].map(function (option) {
      return '<option value="' + option[0] + '"' +
        (c.pc.spellAbility === option[0] ? ' selected' : '') + '>' + option[1] + '</option>';
    }).join('');

    return '<section class="card">' +
      '<div class="card-head"><h2>Spellcasting</h2><span class="muted small">' +
        (stats.dc === null ? 'choose an ability' : 'DC ' + stats.dc + ' · attack ' + U.signed(stats.atk)) +
      '</span></div>' +
      '<div class="spell-head">' +
        '<label class="field grow"><span>Spellcasting ability</span>' +
          '<select id="char-spell-ability">' + abilityOptions + '</select></label>' +
        '<div class="spell-stat"><strong>' + (stats.dc === null ? '—' : stats.dc) + '</strong><span>Save DC</span></div>' +
        '<div class="spell-stat"><strong>' + (stats.atk === null ? '—' : U.signed(stats.atk)) + '</strong><span>Attack</span></div>' +
      '</div>' +
      slotsHtml(c) +
      slotConfigHtml(c) +
      '<label class="field char-spells"><span>Prepared / known spells</span>' +
        '<textarea id="char-spells" rows="4" maxlength="3000" placeholder="Spell list, prepared spells, rituals…">' +
        U.esc(c.pc.spellList) + '</textarea></label>' +
    '</section>';
  }

  function gearHtml(c) {
    var currency = CURRENCIES.map(function (key) {
      return '<label class="field currency"><span>' + key.toUpperCase() + '</span>' +
        '<input data-currency="' + key + '" type="number" min="0" max="999999" value="' + c.pc.currency[key] + '"></label>';
    }).join('');

    return '<section class="card">' +
      '<div class="card-head"><h2>Gear &amp; features</h2><span class="muted small">optional</span></div>' +
      '<div class="currency-row">' + currency + '</div>' +
      '<label class="field"><span>Features &amp; traits</span>' +
        '<textarea id="char-features" rows="4" maxlength="3000" placeholder="Class features, feats, racial traits…">' +
        U.esc(c.pc.features) + '</textarea></label>' +
      '<label class="field"><span>Inventory</span>' +
        '<textarea id="char-inventory" rows="4" maxlength="3000" placeholder="Weapons, armour, magic items, loot…">' +
        U.esc(c.pc.inventory) + '</textarea></label>' +
    '</section>';
  }

  function conditionsHtml(c) {
    var chips = c.conditions.map(function (name) {
      return '<span class="chip">' + U.esc(name) +
        '<button type="button" data-act="drop-cond" data-cond="' + U.esc(name) +
        '" aria-label="Remove ' + U.esc(name) + '">×</button></span>';
    }).join('');

    var options = conditions().filter(function (name) {
      return c.conditions.indexOf(name) < 0;
    }).map(function (name) {
      return '<option value="' + U.esc(name) + '">' + U.esc(name) + '</option>';
    }).join('');

    var death = c.hp.current <= 0
      ? '<div class="death-saves">' +
          '<span class="ds-label">Death saves</span>' +
          '<button type="button" class="death-btn success" data-act="death-success" title="Add a success">' +
            pipsHtml(c.deathSaves.success, 'success') + '</button>' +
          '<button type="button" class="death-btn fail" data-act="death-fail" title="Add a failure">' +
            pipsHtml(c.deathSaves.fail, 'fail') + '</button>' +
          '<span class="ds-hint">successes / failures</span>' +
        '</div>'
      : '';

    return '<section class="card">' +
      '<div class="card-head"><h2>Conditions</h2>' +
        '<span class="muted small">' + (c.hp.current <= 0 ? 'At 0 HP' : 'Track what the table calls') + '</span></div>' +
      '<div class="chips">' + chips +
        '<select class="cond-select" data-act="add-cond" aria-label="Add a condition">' +
        '<option value="">+ condition</option>' + options + '</select></div>' +
      death +
    '</section>';
  }

  function hpHtml(c, pct, hpClass) {
    return '<section class="card">' +
      '<div class="card-head"><h2>Hit points</h2>' +
        '<span class="hp-text">' + c.hp.current + ' / ' + c.hp.max +
        (c.hp.temp ? ' <em>(+' + c.hp.temp + ' temp)</em>' : '') + '</span></div>' +
      '<div class="hp-bar hp-bar-lg"><span class="hp-fill ' + hpClass + '" style="width:' + pct + '%"></span></div>' +
      '<div class="hp-controls">' +
        '<input class="hp-amount" type="number" inputmode="numeric" placeholder="0" aria-label="Hit points to apply">' +
        '<button type="button" class="btn small" data-act="damage">Damage</button>' +
        '<button type="button" class="btn small ghost" data-act="heal">Heal</button>' +
      '</div>' +
      '<div class="char-temp-row">' +
        '<label class="field"><span>Temp HP</span><input id="char-temp" type="number" min="0" max="999" value="' + c.hp.temp + '"></label>' +
        '<button type="button" class="btn small ghost" data-act="set-temp">Apply temp</button>' +
      '</div>' +
    '</section>';
  }

  function slotsCardHtml(c) {
    var configured = c.pc.slots.filter(function (slot) { return slot.max > 0; });

    var rows = configured.length
      ? '<div class="slot-grid">' + configured.map(function (slot) {
          var pips = '';
          for (var i = 0; i < slot.max; i += 1) {
            var used = i < slot.used;
            pips += '<button type="button" class="slot-pip' + (used ? ' used' : '') +
              '" data-act="slot" data-level="' + slot.level + '" data-index="' + i +
              '" aria-label="' + (used ? 'Restore' : 'Use') + ' a level ' + slot.level + ' slot"' +
              ' aria-pressed="' + (used ? 'true' : 'false') + '"></button>';
          }
          return '<div class="slot-row">' +
            '<span class="slot-level">' + ORDINALS[slot.level - 1] + '</span>' +
            '<span class="slot-pips">' + pips + '</span>' +
            '<span class="slot-count">' + (slot.max - slot.used) + ' / ' + slot.max + '</span>' +
          '</div>';
        }).join('') + '</div>'
      : '<p class="muted small">No spell slots configured yet. Tap “Configure slot totals” below.</p>';

    var config = '<details class="slot-config">' +
      '<summary>Configure slot totals</summary>' +
      '<div class="slot-config-grid">' +
        c.pc.slots.map(function (slot) {
          return '<label class="field"><span>' + ORDINALS[slot.level - 1] + '</span>' +
            '<input data-slot-max="' + slot.level + '" type="number" min="0" max="9" value="' + slot.max + '"></label>';
        }).join('') +
      '</div>' +
      '<button type="button" class="btn small" data-act="save-slots">Save slot totals</button>' +
    '</details>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Spell slots</h2><span class="muted small">tap a pip to use or restore</span></div>' +
      rows + config +
    '</section>';
  }

  function resourcesCardHtml(c) {
    var rows = c.pc.resources.length
      ? '<ul class="resource-list">' + c.pc.resources.map(function (resource) {
          return '<li class="resource-row" data-resource="' + resource.id + '">' +
            '<span class="res-name">' + U.esc(resource.name) + '</span>' +
            '<span class="res-recharge">' + (resource.recharge === 'short' ? 'short rest' : 'long rest') + '</span>' +
            '<span class="res-count">' + (resource.max - resource.used) + ' / ' + resource.max + '</span>' +
            '<span class="res-buttons">' +
              '<button type="button" class="btn small ghost" data-act="res-minus" aria-label="Use one ' + U.esc(resource.name) + '">−</button>' +
              '<button type="button" class="btn small ghost" data-act="res-plus" aria-label="Restore one ' + U.esc(resource.name) + '">+</button>' +
              '<button type="button" class="btn small danger-ghost" data-act="res-remove" aria-label="Remove ' + U.esc(resource.name) + '">×</button>' +
            '</span></li>';
        }).join('') + '</ul>'
      : '<p class="muted small">Add limited-use abilities like Ki, Rage or Bardic Inspiration.</p>';

    var form = '<form id="resource-form" class="resource-form" autocomplete="off">' +
      '<label class="field grow"><span>Name</span><input name="name" maxlength="40" placeholder="Ki, Rage…" required></label>' +
      '<label class="field res-max"><span>Max</span><input name="max" type="number" min="1" max="99" value="1"></label>' +
      '<label class="field res-recharge-field"><span>Recharges</span>' +
        '<select name="recharge"><option value="short">Short rest</option><option value="long">Long rest</option></select></label>' +
      '<button type="submit" class="btn small">Add resource</button>' +
    '</form>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Resources</h2>' +
        '<span class="char-rests">' +
          '<button type="button" class="btn small ghost" data-act="short-rest">Short rest</button>' +
          '<button type="button" class="btn small ghost" data-act="long-rest">Long rest</button>' +
        '</span>' +
      '</div>' + rows + form +
    '</section>';
  }

  function sheetHtml(c) {
    var pct = c.hp.max > 0 ? Math.round((c.hp.current / c.hp.max) * 100) : 0;
    var hpClass = pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low';
    var title = [c.pc.class, c.pc.subclass, c.pc.level ? 'Level ' + c.pc.level : '']
      .filter(Boolean).join(' · ');

    return '<div class="character-col">' +
      profileHtml(c, title) +
      classHtml(c) +
      abilitiesHtml(c) +
      skillsHtml(c) +
      '<section class="card">' +
        '<div class="card-head"><h2>Notes</h2><span id="char-save-status" class="muted small">Saved</span></div>' +
        '<label class="field"><span>Concentrating on</span>' +
          '<input id="char-concentration" maxlength="100" placeholder="Spell name" value="' + U.esc(c.pc.concentration) + '"></label>' +
        '<label class="field char-notes"><span>Character notes</span>' +
          '<textarea id="char-notes" rows="6" maxlength="2000" placeholder="Reminders from your paper sheet…">' + U.esc(c.notes) + '</textarea></label>' +
      '</section>' +
    '</div>' +
    '<div class="character-col">' +
      hpHtml(c, pct, hpClass) +
      conditionsHtml(c) +
      attacksHtml(c) +
      spellcastingHtml(c) +
      resourcesCardHtml(c) +
      gearHtml(c) +
    '</div>';
  }

  function render() {
    if (!els.sheet) return;

    var list = pcs();
    var current = active();

    els.select.innerHTML = list.length
      ? '<option value="">Select a character…</option>' + list.map(function (c) {
          return '<option value="' + c.id + '"' +
            (current && current.id === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
        }).join('')
      : '<option value="">No characters yet</option>';

    if (!current) {
      els.empty.hidden = false;
      els.sheet.hidden = true;
      els.sheet.innerHTML = '';
      return;
    }

    els.empty.hidden = true;
    els.sheet.hidden = false;
    els.sheet.innerHTML = sheetHtml(current);
  }

  function syncText(c) {
    var notes = document.getElementById('char-notes');
    var concentration = document.getElementById('char-concentration');
    var spells = document.getElementById('char-spells');
    var features = document.getElementById('char-features');
    var inventory = document.getElementById('char-inventory');

    if (notes) c.notes = notes.value.slice(0, 2000);
    if (concentration) c.pc.concentration = concentration.value.trim().slice(0, 100);
    if (spells) c.pc.spellList = spells.value.slice(0, 3000);
    if (features) c.pc.features = features.value.slice(0, 3000);
    if (inventory) c.pc.inventory = inventory.value.slice(0, 3000);
  }

  function onClick(event) {
    var c = active();
    if (!c) return;

    var button = event.target.closest('button[data-act]');
    if (!button) return;

    var act = button.getAttribute('data-act');

    if (act === 'damage' || act === 'heal') {
      var input = document.querySelector('#character-sheet .hp-amount');
      DnD.combat.applyHp(c.id, input ? input.value : '', act);
    } else if (act === 'set-temp') {
      var tempInput = document.getElementById('char-temp');
      c.hp.temp = Math.max(0, U.toInt(tempInput ? tempInput.value : 0, 0));
      DnD.store.commit();
      toast('Temporary HP set to ' + c.hp.temp + '.');
    } else if (act === 'drop-cond') {
      var name = button.getAttribute('data-cond');
      c.conditions = c.conditions.filter(function (x) { return x !== name; });
      DnD.store.commit();
    } else if (act === 'death-success' || act === 'death-fail') {
      DnD.combat.adjustDeathSave(c.id, act === 'death-success' ? 'success' : 'fail');
    } else if (act === 'slot') {
      var level = U.toInt(button.getAttribute('data-level'), 0);
      var index = U.toInt(button.getAttribute('data-index'), 0);
      var slot = c.pc.slots.find(function (s) { return s.level === level; });
      if (slot) {
        slot.used = slot.used > index ? index : index + 1;
        DnD.store.commit();
      }
    } else if (act === 'save-slots') {
      Array.prototype.forEach.call(
        document.querySelectorAll('#character-sheet [data-slot-max]'),
        function (field) {
          var lvl = U.toInt(field.getAttribute('data-slot-max'), 0);
          var target = c.pc.slots.find(function (s) { return s.level === lvl; });
          if (!target) return;
          target.max = U.clamp(U.toInt(field.value, 0), 0, 9);
          target.used = U.clamp(target.used, 0, target.max);
        }
      );
      DnD.store.commit();
      toast('Spell slots updated.');
    } else if (act === 'res-minus' || act === 'res-plus' || act === 'res-remove') {
      var row = button.closest('[data-resource]');
      var resourceId = row ? row.getAttribute('data-resource') : '';
      var resource = c.pc.resources.find(function (r) { return r.id === resourceId; });
      if (!resource) return;

      if (act === 'res-minus') {
        resource.used = U.clamp(resource.used + 1, 0, resource.max);
        DnD.store.commit();
      } else if (act === 'res-plus') {
        resource.used = U.clamp(resource.used - 1, 0, resource.max);
        DnD.store.commit();
      } else {
        c.pc.resources = c.pc.resources.filter(function (r) { return r.id !== resourceId; });
        DnD.store.commit();
      }
    } else if (act === 'short-rest') {
      DnD.combat.shortRest(c.id);
    } else if (act === 'long-rest') {
      DnD.combat.longRest(c.id);
    } else if (act === 'apply-class') {
      if (!c.pc.classId) {
        toast('Choose a class first.');
        return;
      }
      DnD.classes.apply(c.pc, c.pc.level);
      DnD.store.commit();
      toast('Class defaults applied.');
    } else if (act === 'inspiration') {
      c.pc.inspiration = !c.pc.inspiration;
      DnD.store.commit();
      toast(c.pc.inspiration ? 'Inspiration gained.' : 'Inspiration spent.');
    } else if (act === 'spend-hit-die') {
      spendHitDie(c);
    } else if (act === 'save-vitals') {
      var vitalSpeed = document.querySelector('[data-vitals="speed"]');
      var vitalDie = document.querySelector('[data-vitals="die"]');
      var vitalTotal = document.querySelector('[data-vitals="total"]');
      var vitalUsed = document.querySelector('[data-vitals="used"]');
      var newTotal = U.clamp(U.toInt(vitalTotal ? vitalTotal.value : c.pc.hitDice.total, c.pc.hitDice.total), 1, 40);

      c.pc.speed = U.clamp(U.toInt(vitalSpeed ? vitalSpeed.value : c.pc.speed, c.pc.speed), 0, 200);
      c.pc.hitDice.die = U.toInt(vitalDie ? vitalDie.value : c.pc.hitDice.die, 8);
      c.pc.hitDice.total = newTotal;
      c.pc.hitDice.used = U.clamp(U.toInt(vitalUsed ? vitalUsed.value : c.pc.hitDice.used, 0), 0, newTotal);
      DnD.store.commit();
      toast('Speed and hit dice saved.');
    } else if (act === 'save-abilities') {
      ABILITIES.forEach(function (a) {
        var scoreInput = document.querySelector('[data-ability="' + a[0] + '"]');
        var profInput = document.querySelector('[data-save-prof="' + a[0] + '"]');
        if (scoreInput) c.pc.abilities[a[0]] = U.clamp(U.toInt(scoreInput.value, 10), 1, 30);
        if (profInput) c.pc.saveProfs[a[0]] = profInput.checked;
      });
      recomputePassive(c);
      DnD.store.commit();
      toast('Ability scores saved.');
    } else if (act === 'save-skills') {
      SKILLS.forEach(function (s) {
        var profSelect = document.querySelector('[data-skill-prof="' + s[0] + '"]');
        if (profSelect) c.pc.skillProfs[s[0]] = U.clamp(U.toInt(profSelect.value, 0), 0, 2);
      });
      recomputePassive(c);
      DnD.store.commit();
      toast('Skill proficiencies saved.');
    } else if (act === 'roll-check') {
      var checkKey = button.getAttribute('data-key');
      quickRoll('1d20' + exprMod(mod(c.pc.abilities[checkKey])), abilityName(checkKey) + ' check');
    } else if (act === 'roll-save') {
      var saveKey = button.getAttribute('data-key');
      quickRoll('1d20' + exprMod(saveBonus(c, saveKey)), abilityName(saveKey) + ' save');
    } else if (act === 'roll-skill') {
      var skillKey = button.getAttribute('data-key');
      var skill = SKILLS.find(function (s) { return s[0] === skillKey; });
      if (skill) quickRoll('1d20' + exprMod(skillBonus(c, skillKey, skill[2])), skill[1]);
    } else if (act === 'roll-attack' || act === 'roll-damage') {
      var attackId = button.getAttribute('data-attack');
      var attack = findAttack(c, attackId);
      if (!attack) return;
      if (act === 'roll-attack') quickRoll('1d20' + exprMod(attack.bonus), attack.name + ' attack');
      else quickRoll(attack.damage, attack.name + ' damage');
    } else if (act === 'save-attack') {
      var editId = button.getAttribute('data-attack');
      var edited = findAttack(c, editId);
      var attackItem = button.closest('.attack-item');
      if (!edited || !attackItem) return;
      var attackName = attackItem.querySelector('[data-attack-edit="name"]');
      var attackBonus = attackItem.querySelector('[data-attack-edit="bonus"]');
      var attackDamage = attackItem.querySelector('[data-attack-edit="damage"]');
      var attackType = attackItem.querySelector('[data-attack-edit="type"]');
      if (attackName) edited.name = attackName.value.trim().slice(0, 40) || edited.name;
      if (attackBonus) edited.bonus = U.clamp(U.toInt(attackBonus.value, 0), -20, 30);
      if (attackDamage) edited.damage = attackDamage.value.trim().slice(0, 40) || edited.damage;
      if (attackType) edited.type = attackType.value.trim().slice(0, 30);
      DnD.store.commit();
      toast('Attack saved.');
    } else if (act === 'remove-attack') {
      var removeId = button.getAttribute('data-attack');
      c.pc.attacks = c.pc.attacks.filter(function (a) { return a.id !== removeId; });
      DnD.store.commit();
    } else if (act === 'portrait') {
      pickPortrait(c);
    } else if (act === 'clear-portrait') {
      c.portrait = '';
      DnD.store.commit();
      toast('Portrait removed.');
    } else if (act === 'edit-in-party') {
      DnD.app.activateTab('party');
      var card = document.querySelector('#party-list [data-id="' + c.id + '"]');
      if (card) {
        card.scrollIntoView({ block: 'center' });
        var details = card.querySelector('details');
        if (details && !details.open) details.open = true;
      }
    }
  }

  function onChange(event) {
    var c = active();
    if (!c) return;
    var target = event.target;

    if (target.id === 'char-class-select') {
      if (target.value === 'custom') {
        c.pc.classId = '';
        c.pc.class = '';
        c.pc.subclass = '';
        DnD.store.commit();
        toast('Custom class — mechanics are left to you.');
        return;
      }

      var classInfo = DnD.classes.find(target.value);
      if (classInfo) {
        c.pc.classId = classInfo.id;
        c.pc.class = classInfo.name;
        DnD.classes.apply(c.pc, c.pc.level);
        DnD.store.commit();
        toast(classInfo.name + ' defaults applied — hit die, saves, slots and resources.');
      }
      return;
    }

    if (target.id === 'char-level') {
      var newLevel = U.clamp(U.toInt(target.value, c.pc.level), 1, 20);
      if (newLevel !== c.pc.level) {
        c.pc.level = newLevel;
        if (DnD.classes.find(c.pc.classId)) {
          DnD.classes.apply(c.pc, newLevel);
        } else {
          c.pc.hitDice.total = U.clamp(newLevel, 1, 40);
          c.pc.hitDice.used = U.clamp(c.pc.hitDice.used, 0, c.pc.hitDice.total);
        }
        DnD.store.commit();
        toast('Level ' + newLevel + ' applied.');
      }
      return;
    }

    if (target.id === 'char-subclass') {
      c.pc.subclass = target.value.trim().slice(0, 40);
      DnD.store.commit();
      return;
    }

    if (target.id === 'char-class-custom' && !c.pc.classId) {
      c.pc.class = target.value.trim().slice(0, 40) || 'Adventurer';
      DnD.store.commit();
      return;
    }

    var select = target.closest && target.closest('select[data-act="add-cond"]');
    if (select && select.value) {
      if (c.conditions.indexOf(select.value) < 0) c.conditions.push(select.value);
      DnD.store.commit();
      return;
    }

    if (target.id === 'char-spell-ability') {
      c.pc.spellAbility = ['int', 'wis', 'cha'].indexOf(target.value) >= 0 ? target.value : '';
      DnD.store.commit();
      return;
    }

    if (target.hasAttribute && target.hasAttribute('data-currency')) {
      c.pc.currency[target.getAttribute('data-currency')] =
        U.clamp(U.toInt(target.value, 0), 0, 999999);
      DnD.store.save();
      return;
    }

    if (target.id === 'char-notes' || target.id === 'char-concentration' ||
        target.id === 'char-spells' || target.id === 'char-features' ||
        target.id === 'char-inventory') {
      syncText(c);
      DnD.store.save();
      var status = document.getElementById('char-save-status');
      if (status) status.textContent = 'Saved ' + U.time();
    }
  }

  var saveText = U.debounce(function () {
    var c = active();
    if (!c) return;
    syncText(c);
    DnD.store.save();
    var status = document.getElementById('char-save-status');
    if (status) status.textContent = 'Saved ' + U.time();
  }, 400);

  function onInput(event) {
    var id = event.target.id;
    if (id === 'char-notes' || id === 'char-concentration' || id === 'char-spells' ||
        id === 'char-features' || id === 'char-inventory') {
      saveText();
    }
  }

  function onSubmit(event) {
    if (event.target.id !== 'resource-form' && event.target.id !== 'attack-form') return;
    event.preventDefault();

    var c = active();
    if (!c) return;

    if (event.target.id === 'attack-form') {
      var attackData = new FormData(event.target);
      var attackName = String(attackData.get('name') || '').trim();
      if (!attackName) {
        toast('Give the attack a name.');
        return;
      }
      var damageExpr = String(attackData.get('damage') || '1d6').trim() || '1d6';
      try {
        DnD.dice.parse(damageExpr);
      } catch (err) {
        toast('Damage must be a dice expression like 1d8+3.');
        return;
      }
      c.pc.attacks.push({
        id: U.uid(),
        name: attackName.slice(0, 40),
        bonus: U.clamp(U.toInt(attackData.get('bonus'), 0), -20, 30),
        damage: damageExpr.slice(0, 40),
        type: String(attackData.get('type') || '').trim().slice(0, 30)
      });
      DnD.store.commit();
      toast(attackName + ' added.');
      return;
    }

    var data = new FormData(event.target);
    var name = String(data.get('name') || '').trim();
    if (!name) {
      toast('Give the resource a name.');
      return;
    }

    c.pc.resources.push({
      id: U.uid(),
      name: name.slice(0, 40),
      max: U.clamp(U.toInt(data.get('max'), 1), 1, 99),
      used: 0,
      recharge: data.get('recharge') === 'long' ? 'long' : 'short'
    });

    DnD.store.commit();
    toast(name + ' added.');
  }

  function pickPortrait(c) {
    U.pickImage(160).then(function (url) {
      if (!url) return;
      c.portrait = url;
      DnD.store.commit();
      toast('Portrait updated.');
    }).catch(function (err) {
      toast(err && err.message ? err.message : 'Could not use that image.');
    });
  }

  function goToParty() {
    if (DnD.app) DnD.app.activateTab('party');
    var nameInput = document.querySelector('#party-form [name="name"]');
    if (nameInput) nameInput.focus();
  }

  function init() {
    els.select = document.getElementById('character-select');
    els.empty = document.getElementById('character-empty');
    els.sheet = document.getElementById('character-sheet');
    if (!els.sheet || !els.select) return;

    els.select.addEventListener('change', function () {
      state().settings.activeCharacterId = els.select.value || null;
      DnD.store.commit();
    });

    document.getElementById('btn-new-character').addEventListener('click', goToParty);
    document.getElementById('btn-character-empty-add').addEventListener('click', goToParty);

    els.sheet.addEventListener('click', onClick);
    els.sheet.addEventListener('change', onChange);
    els.sheet.addEventListener('input', onInput);
    els.sheet.addEventListener('submit', onSubmit);

    DnD.store.on(render);
    render();
  }

  DnD.character = {
    init: init,
    render: render,
    refresh: render
  };
})();

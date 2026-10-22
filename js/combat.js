/* DunD — initiative & combat tracker */
(function () {
  'use strict';

  var U = DnD.util;
  var CONDITIONS = [
    'Blinded', 'Charmed', 'Concentrating', 'Deafened', 'Exhaustion', 'Frightened',
    'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
    'Prone', 'Restrained', 'Stable', 'Stunned', 'Unconscious', 'Dead'
  ];

  var openEditors = new Set();
  var els = {};

  function state() { return DnD.store.state; }
  function log(text, kind) { DnD.store.log(text, kind); }
  function toast(message) { if (DnD.ui) DnD.ui.toast(message); }

  function playerView() {
    return state().settings.playerView !== false;
  }

  function isDown(c) {
    if (playerView() && c.kind === 'monster' && !c.hpKnown) return c.status === 'Down';
    return c.hp.current <= 0;
  }

  function findById(id) {
    return state().combatants.find(function (c) { return c.id === id; });
  }

  function compareCombatants(a, b) {
    if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (b.initMod !== a.initMod) return b.initMod - a.initMod;
    return a.name.localeCompare(b.name);
  }

  function sortAll() {
    state().combatants.sort(compareCombatants);
  }

  function rollInitiative(c) {
    var expr = '1d20' + (c.initMod ? (c.initMod > 0 ? '+' + c.initMod : String(c.initMod)) : '');
    return DnD.dice.rollExpr(expr).total;
  }

  function uniqueName(base, created) {
    var used = new Set(state().combatants.map(function (c) { return c.name; }));
    (created || []).forEach(function (c) { used.add(c.name); });
    var clean = String(base || 'Combatant').trim().slice(0, 60) || 'Combatant';
    if (!used.has(clean)) return clean;
    var i = 1;
    while (used.has(clean + ' ' + i)) i += 1;
    return clean + ' ' + i;
  }

  function addCondition(c, name) {
    if (c.conditions.indexOf(name) < 0) c.conditions.push(name);
  }

  function removeCondition(c, name) {
    c.conditions = c.conditions.filter(function (x) { return x !== name; });
  }

  function addCombatants(options) {
    var count = U.clamp(U.toInt(options.quantity, 1), 1, 20);
    var maxHp = Math.max(1, U.toInt(options.maxHp, 10));
    var created = [];

    for (var i = 0; i < count; i += 1) {
      created.push({
        id: U.uid(),
        name: uniqueName(options.name, created),
        kind: options.kind === 'pc' || options.kind === 'ally' ? options.kind : 'monster',
        initiative: count > 1 || options.initiative === undefined ? null : options.initiative,
        initMod: U.toInt(options.initMod, 0),
        hp: { current: maxHp, max: maxHp, temp: 0 },
        hpKnown: options.kind === 'pc' || options.kind === 'ally' ? true : options.hpKnown !== false,
        status: '',
        portrait: '',
        ac: Math.max(0, U.toInt(options.ac, 10)),
        conditions: [],
        notes: '',
        pc: { class: '', level: 1, passive: 10, player: '', concentration: '', slots: [], resources: [] },
        monster: {
          cr: options.cr === undefined || options.cr === null ? null : Number(options.cr),
          xp: U.toInt(options.xp, 0),
          type: String(options.type || '').slice(0, 60)
        },
        deathSaves: { success: 0, fail: 0 }
      });
    }

    Array.prototype.push.apply(state().combatants, created);

    if (created.some(function (c) { return c.initiative !== null; })) sortAll();

    log(
      created.length > 1
        ? created.length + ' × ' + options.name + ' were added to the encounter.'
        : created[0].name + ' was added to the encounter.',
      'info'
    );

    DnD.store.commit();
    return created;
  }

  function addMonster(monster, count, options) {
    options = options || {};
    return addCombatants({
      name: monster.name,
      kind: 'monster',
      maxHp: monster.hp,
      ac: monster.ac,
      initMod: 0,
      cr: monster.cr,
      xp: monster.xp,
      type: monster.type,
      quantity: count || 1,
      hpKnown: options.hpKnown === undefined ? !playerView() : options.hpKnown
    });
  }

  function addCharacter(info) {
    var maxHp = Math.max(1, U.toInt(info.maxHp, 10));
    var classInfo = typeof DnD.classes !== 'undefined' ? DnD.classes.find(info.classId) : null;
    var className = classInfo ? classInfo.name : String(info.className || '').slice(0, 40);
    var c = {
      id: U.uid(),
      name: String(info.name || 'Adventurer').slice(0, 60),
      kind: 'pc',
      initiative: null,
      initMod: U.toInt(info.initMod, 0),
      hp: { current: maxHp, max: maxHp, temp: 0 },
      hpKnown: true,
      status: '',
      portrait: '',
      ac: Math.max(0, U.toInt(info.ac, 10)),
      conditions: [],
      notes: '',
      pc: {
        class: className,
        classId: classInfo ? classInfo.id : '',
        subclass: String(info.subclass || '').slice(0, 40),
        level: U.clamp(U.toInt(info.level, 1), 1, 20),
        passive: U.clamp(U.toInt(info.passive, 10), 0, 40),
        player: String(info.player || '').slice(0, 40),
        concentration: '',
        slots: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (level) {
          return { level: level, max: 0, used: 0 };
        }),
        resources: [],
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        saveProfs: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
        skillProfs: {
          acrobatics: 0, animal: 0, arcana: 0, athletics: 0, deception: 0, history: 0,
          insight: 0, intimidation: 0, investigation: 0, medicine: 0, nature: 0,
          perception: 0, performance: 0, persuasion: 0, religion: 0, sleight: 0,
          stealth: 0, survival: 0
        },
        speed: 30,
        hitDice: {
          die: 8,
          total: U.clamp(U.toInt(info.level, 1), 1, 40),
          used: 0
        },
        inspiration: false,
        attacks: [],
        spellAbility: '',
        spellList: '',
        features: '',
        inventory: '',
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
      },
      monster: { cr: null, xp: 0, type: '' },
      deathSaves: { success: 0, fail: 0 }
    };

    if (classInfo) DnD.classes.apply(c.pc, c.pc.level);

    state().combatants.push(c);
    if (!state().settings.activeCharacterId) state().settings.activeCharacterId = c.id;
    log(c.name + ' joins the party.', 'info');
    DnD.store.commit();
    return c;
  }

  function announce(name) {
    var el = document.getElementById('turn-announcer');
    if (el) el.textContent = 'Current turn: ' + name;
  }

  function startCombat(rerollAll) {
    var st = state();
    if (!st.combatants.length) {
      toast('Add a combatant first.');
      return;
    }

    var view = playerView();
    var rolls = [];

    st.combatants.forEach(function (c) {
      if (view && c.kind === 'monster') return;
      if (rerollAll || c.initiative === null) {
        c.initiative = rollInitiative(c);
        rolls.push(c.name + ' ' + c.initiative);
      }
    });

    sortAll();

    var first = st.combatants.find(function (c) { return c.initiative !== null; });
    if (!first) {
      toast(view
        ? 'Add your character (or enter initiative) first.'
        : 'Enter or roll initiative first.');
      return;
    }

    if (rolls.length) {
      log('Initiative — ' + rolls.join(', ') + '.', 'initiative');
    }

    st.combat.active = true;
    st.combat.round = 1;
    st.combat.turnId = first.id;

    if (view && st.combatants.some(function (c) { return c.kind === 'monster' && c.initiative === null; })) {
      log('Monster initiative is blank — fill it in as the DM calls it.', 'info');
    }

    log('Round 1 — ' + first.name + ' is up.', 'round');

    DnD.store.commit();
    announce(first.name);
  }

  function nextTurn() {
    var st = state();
    if (!st.combatants.length) {
      toast('Add a combatant first.');
      return;
    }
    if (!st.combat.active || st.combat.turnId === null) {
      startCombat(false);
      return;
    }

    var length = st.combatants.length;
    var index = st.combatants.findIndex(function (c) { return c.id === st.combat.turnId; });
    if (index < 0) index = -1;

    for (var step = 0; step < length; step += 1) {
      index += 1;
      if (index >= length) {
        index = 0;
        st.combat.round += 1;
        log('Round ' + st.combat.round + ' begins.', 'round');
      }

      var c = st.combatants[index];
      if (c.kind === 'monster' && isDown(c)) continue;

      st.combat.turnId = c.id;
      log(c.name + '’s turn.', 'turn');
      DnD.store.commit();
      announce(c.name);
      return;
    }

    toast('Every monster is down — the encounter is over.');
  }

  function prevTurn() {
    var st = state();
    if (!st.combatants.length) return;

    var length = st.combatants.length;
    var index = st.combatants.findIndex(function (c) { return c.id === st.combat.turnId; });
    if (index < 0) index = 0;

    index -= 1;
    if (index < 0) {
      index = length - 1;
      st.combat.round = Math.max(1, st.combat.round - 1);
      log('Back to round ' + st.combat.round + '.', 'round');
    }

    st.combat.turnId = st.combatants[index].id;
    log(st.combatants[index].name + '’s turn.', 'turn');
    DnD.store.commit();
    announce(st.combatants[index].name);
  }

  function setTurn(c) {
    var st = state();
    if (!st.combat.active) {
      st.combat.active = true;
      if (st.combat.round < 1) st.combat.round = 1;
    }
    st.combat.turnId = c.id;
    log(c.name + ' is up.', 'turn');
    DnD.store.commit();
    announce(c.name);
  }

  function applyHp(id, amountRaw, mode) {
    var c = findById(id);
    if (!c) return;

    if (c.kind === 'monster' && !c.hpKnown && playerView()) {
      toast('Monster HP is hidden — mark its stats as known in Edit first.');
      return;
    }

    var amount = Math.abs(U.toInt(amountRaw, 0));
    if (!amount) {
      toast('Enter a number of hit points first.');
      return;
    }

    var before = c.hp.current;
    var absorbed = 0;

    if (mode === 'damage') {
      var remaining = amount;
      if (c.hp.temp > 0) {
        absorbed = Math.min(c.hp.temp, remaining);
        c.hp.temp -= absorbed;
        remaining -= absorbed;
      }
      c.hp.current = U.clamp(before - remaining, 0, c.hp.max);
    } else {
      c.hp.current = U.clamp(before + amount, 0, c.hp.max);
    }

    var after = c.hp.current;

    if (mode === 'damage') {
      log(
        c.name + ' takes ' + amount + ' damage' +
        (absorbed ? ' (' + absorbed + ' absorbed by temp HP)' : '') +
        ' — HP ' + after + '/' + c.hp.max + '.',
        'damage'
      );
    } else {
      log(c.name + ' regains ' + amount + ' HP — HP ' + after + '/' + c.hp.max + '.', 'heal');
    }

    if (before > 0 && after === 0) {
      if (c.kind === 'pc') {
        addCondition(c, 'Unconscious');
        log(c.name + ' drops to 0 HP and falls unconscious.', 'danger');
      } else {
        c.status = 'Down';
        addCondition(c, 'Dead');
        log(c.name + ' is down.', 'danger');
      }
    }

    if (before === 0 && after > 0) {
      removeCondition(c, 'Unconscious');
      removeCondition(c, 'Dead');
      if (c.kind !== 'pc') c.status = '';
      c.deathSaves = { success: 0, fail: 0 };
      log(c.name + ' is back on their feet.', 'heal');
    }

    DnD.store.commit();
  }

  function bumpDeathSave(c, kind) {
    var value = ((c.deathSaves[kind] || 0) + 1) % 4;
    c.deathSaves[kind] = value;

    if (value === 3 && kind === 'success') {
      log(c.name + ' is stable.', 'heal');
      addCondition(c, 'Stable');
    }
    if (value === 3 && kind === 'fail') {
      addCondition(c, 'Dead');
      log(c.name + ' has died.', 'danger');
    }
    if (value === 0 && kind === 'fail') {
      removeCondition(c, 'Dead');
    }

    DnD.store.commit();
  }

  function removeCombatant(c) {
    if (!window.confirm('Remove ' + c.name + ' from the encounter?')) return;

    var st = state();
    var index = st.combatants.findIndex(function (x) { return x.id === c.id; });
    if (index < 0) return;

    st.combatants.splice(index, 1);
    openEditors.delete(c.id);

    if (state().settings.activeCharacterId === c.id) {
      var remainingParty = st.combatants.filter(function (x) { return x.kind === 'pc'; });
      state().settings.activeCharacterId = remainingParty.length ? remainingParty[0].id : null;
    }

    if (st.combat.turnId === c.id) {
      st.combat.turnId = st.combatants.length
        ? st.combatants[Math.min(index, st.combatants.length - 1)].id
        : null;
    }

    log(c.name + ' was removed.', 'info');
    DnD.store.commit();
  }

  function saveEditor(c, details) {
    if (!details) return;

    function input(name) {
      return details.querySelector('[data-edit="' + name + '"]');
    }

    var nameInput = input('name');
    if (nameInput) c.name = (nameInput.value || c.name).trim().slice(0, 60) || c.name;

    var initInput = input('initiative');
    if (initInput) {
      c.initiative = initInput.value.trim() === '' ? null : U.toInt(initInput.value, 0);
    }

    if (input('initMod')) c.initMod = U.toInt(input('initMod').value, 0);
    if (input('ac')) c.ac = Math.max(0, U.toInt(input('ac').value, 0));

    if (input('maxHp')) {
      var maxHp = Math.max(1, U.toInt(input('maxHp').value, c.hp.max));
      c.hp.max = maxHp;
      if (input('currentHp')) {
        c.hp.current = U.clamp(U.toInt(input('currentHp').value, c.hp.current), 0, maxHp);
      }
    }

    if (input('tempHp')) c.hp.temp = Math.max(0, U.toInt(input('tempHp').value, 0));

    if (c.kind === 'pc') {
      if (input('pcClass')) c.pc.class = input('pcClass').value.trim().slice(0, 40);
      if (input('pcLevel')) c.pc.level = U.clamp(U.toInt(input('pcLevel').value, 1), 1, 20);
      if (input('pcPassive')) c.pc.passive = U.clamp(U.toInt(input('pcPassive').value, 10), 0, 40);
      if (input('pcPlayer')) c.pc.player = input('pcPlayer').value.trim().slice(0, 40);
      if (input('pcConc')) c.pc.concentration = input('pcConc').value.trim().slice(0, 100);
    }

    if (input('hpKnown')) c.hpKnown = input('hpKnown').checked;

    c.conditions = Array.prototype.slice
      .call(details.querySelectorAll('[data-cond-check]:checked'))
      .map(function (el) { return el.value; });

    if (input('notes')) c.notes = input('notes').value.trim().slice(0, 2000);

    sortAll();
    log(c.name + ' updated.', 'info');
    DnD.store.commit();
  }

  function deathSavesHtml(c) {
    function pips(n, cls) {
      var out = '';
      for (var i = 0; i < 3; i += 1) {
        out += '<span class="pip ' + cls + (i < n ? ' on' : '') + '"></span>';
      }
      return out;
    }
    return '<div class="death-saves">' +
      '<span class="ds-label">Death saves</span>' +
      '<button type="button" class="death-btn success" data-act="death-success" title="Add a success (click again to reset)">' +
      pips(c.deathSaves.success, 'success') + '</button>' +
      '<button type="button" class="death-btn fail" data-act="death-fail" title="Add a failure (click again to reset)">' +
      pips(c.deathSaves.fail, 'fail') + '</button>' +
      '<span class="ds-hint">successes / failures</span>' +
      '</div>';
  }

  function statusSelectHtml(c) {
    var states = ['Fine', 'Hurt', 'Bloodied', 'Down'];
    var options = states.map(function (name) {
      return '<option value="' + name + '"' + (c.status === name ? ' selected' : '') + '>' + name + '</option>';
    }).join('');
    return '<select class="status-select" data-act="set-status" aria-label="Battlefield status for ' +
      U.esc(c.name) + '">' +
      '<option value="">Status…</option>' + options + '</select>';
  }

  function combatantHtml(c, isActive) {
    var unknown = playerView() && c.kind === 'monster' && !c.hpKnown;
    var pct = c.hp.max > 0 ? Math.round((c.hp.current / c.hp.max) * 100) : 0;
    var hpClass = pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low';
    var down = isDown(c);
    var isPc = c.kind === 'pc';

    var kindTag = c.kind === 'pc' ? 'PC' : c.kind === 'ally' ? 'Ally' : 'Monster';
    var avatar = c.portrait ? U.avatar(c, 'tiny') : '';

    var condChips = c.conditions.map(function (name) {
      return '<span class="chip">' + U.esc(name) +
        '<button type="button" data-act="drop-cond" data-cond="' + U.esc(name) +
        '" aria-label="Remove ' + U.esc(name) + '">×</button></span>';
    }).join('');

    var concentration = isPc && c.pc.concentration
      ? '<span class="chip chip-conc">Concentrating: ' + U.esc(c.pc.concentration) + '</span>'
      : '';

    var condOptions = CONDITIONS.filter(function (name) {
      return c.conditions.indexOf(name) < 0;
    }).map(function (name) {
      return '<option value="' + U.esc(name) + '">' + U.esc(name) + '</option>';
    }).join('');

    var condChecks = CONDITIONS.map(function (name) {
      return '<label><input type="checkbox" data-cond-check value="' + U.esc(name) + '"' +
        (c.conditions.indexOf(name) >= 0 ? ' checked' : '') + '> ' + U.esc(name) + '</label>';
    }).join('');

    var pcFields = isPc
      ? '<label class="field"><span>Class</span><input data-edit="pcClass" value="' + U.esc(c.pc.class) + '"></label>' +
        '<label class="field"><span>Level</span><input data-edit="pcLevel" type="number" min="1" max="20" value="' + c.pc.level + '"></label>' +
        '<label class="field"><span>Passive perception</span><input data-edit="pcPassive" type="number" min="0" max="40" value="' + c.pc.passive + '"></label>' +
        '<label class="field"><span>Player</span><input data-edit="pcPlayer" value="' + U.esc(c.pc.player) + '"></label>' +
        '<label class="field"><span>Concentrating on</span><input data-edit="pcConc" maxlength="100" value="' + U.esc(c.pc.concentration) + '" placeholder="Spell name"></label>'
      : '';

    var knownField = c.kind === 'monster'
      ? "<label class=\"check full\"><input type=\"checkbox\" data-edit=\"hpKnown\"" + (c.hpKnown ? ' checked' : '') + "> I know this monster's stats (show HP and AC)</label>"
      : '';

    return '<article class="combatant' + (isActive ? ' active' : '') + (down ? ' down' : '') +
      '" data-id="' + c.id + '">' +
      '<div class="init-col">' +
        '<button type="button" class="init-badge" data-act="set-turn" title="' +
          (c.initiative === null ? 'Set initiative' : 'Make this combatant current') + '" aria-label="' +
          (c.initiative === null
            ? 'Set initiative for ' + U.esc(c.name)
            : 'Make ' + U.esc(c.name) + ' the current turn, initiative ' + c.initiative) + '">' +
          (c.initiative === null ? '—' : c.initiative) + '</button>' +
        '<span class="init-mod" title="Initiative modifier">' + U.signed(c.initMod) + '</span>' +
      '</div>' +
      '<div class="c-body">' +
        '<div class="c-top">' +
          avatar +
          '<h3 class="c-name">' + U.esc(c.name) + '</h3>' +
          '<span class="tag tag-' + c.kind + '">' + kindTag + '</span>' +
          (isActive ? '<span class="turn-pill">Now</span>' : '') +
          (down ? '<span class="dead-pill">Down</span>' : '') +
        '</div>' +
        (unknown
          ? '<div class="hp-row">' +
              '<span class="hp-unknown">HP hidden</span>' +
              '<span class="ac-text">AC —</span>' +
              statusSelectHtml(c) +
            '</div>'
          : '<div class="hp-row">' +
              '<div class="hp-bar"><span class="hp-fill ' + hpClass + '" style="width:' + pct + '%"></span></div>' +
              '<span class="hp-text">' + c.hp.current + ' / ' + c.hp.max +
                (c.hp.temp ? ' <em>(+' + c.hp.temp + ' temp)</em>' : '') + '</span>' +
              '<span class="ac-text">AC ' + c.ac + '</span>' +
              (c.kind === 'monster' ? statusSelectHtml(c) : '') +
            '</div>') +
        (condChips || concentration || condOptions
          ? '<div class="chips">' + condChips + concentration +
            '<select class="cond-select" data-act="add-cond" aria-label="Add a condition">' +
            '<option value="">+ condition</option>' + condOptions + '</select></div>'
          : '') +
        (isPc && down ? deathSavesHtml(c) : '') +
        (unknown
          ? '<div class="hp-controls">' +
              '<span class="inline-hint">HP hidden — set a status above.</span>' +
              '<button type="button" class="btn small danger-ghost" data-act="remove">Remove</button>' +
            '</div>'
          : '<div class="hp-controls">' +
              '<input class="hp-amount" type="number" inputmode="numeric" placeholder="0" aria-label="Hit points to apply to ' + U.esc(c.name) + '">' +
              '<button type="button" class="btn small" data-act="damage">Damage</button>' +
              '<button type="button" class="btn small ghost" data-act="heal">Heal</button>' +
              '<button type="button" class="btn small danger-ghost" data-act="remove">Remove</button>' +
            '</div>') +
        '<details class="row-editor"' + (openEditors.has(c.id) ? ' open' : '') + '>' +
          '<summary>Edit ' + U.esc(c.name) + '</summary>' +
          '<div class="editor-grid">' +
            '<label class="field"><span>Name</span><input data-edit="name" maxlength="60" value="' + U.esc(c.name) + '"></label>' +
            '<label class="field"><span>Initiative</span><input data-edit="initiative" type="number" placeholder="unrolled" value="' + (c.initiative === null ? '' : c.initiative) + '"></label>' +
            '<label class="field"><span>Init mod</span><input data-edit="initMod" type="number" value="' + c.initMod + '"></label>' +
            '<label class="field"><span>AC</span><input data-edit="ac" type="number" min="0" value="' + c.ac + '"></label>' +
            '<label class="field"><span>Max HP</span><input data-edit="maxHp" type="number" min="1" value="' + c.hp.max + '"></label>' +
            '<label class="field"><span>Current HP</span><input data-edit="currentHp" type="number" min="0" value="' + c.hp.current + '"></label>' +
            '<label class="field"><span>Temp HP</span><input data-edit="tempHp" type="number" min="0" value="' + c.hp.temp + '"></label>' +
            pcFields +
            knownField +
            '<label class="field full"><span>Conditions</span><div class="cond-grid">' + condChecks + '</div></label>' +
            '<label class="field full"><span>Notes</span><input data-edit="notes" maxlength="500" value="' + U.esc(c.notes) + '"></label>' +
          '</div>' +
          '<div class="editor-actions"><button type="button" class="btn primary small" data-act="save-edit">Save changes</button></div>' +
        '</details>' +
      '</div>' +
    '</article>';
  }

  function renderLog() {
    var entries = state().combat.log.slice(-60).reverse();
    if (!entries.length) {
      els.log.innerHTML = '<li class="log-item"><span class="muted">The log is empty.</span></li>';
      return;
    }
    els.log.innerHTML = entries.map(function (entry) {
      return '<li class="log-item ' + U.esc(entry.kind) + '">' +
        '<span class="log-time">' + U.time(entry.t) + '</span>' +
        '<span>' + U.esc(entry.text) + '</span></li>';
    }).join('');
  }

  function render() {
    if (!els.list) return;

    var st = state();
    var index = st.combatants.findIndex(function (c) { return c.id === st.combat.turnId; });
    var active = index >= 0 ? st.combatants[index] : null;

    els.round.textContent = String(st.combat.round || 1);
    els.turnName.textContent = active ? active.name : (st.combat.active ? 'Choose a combatant' : 'Not started');
    els.turnPos.textContent = active
      ? (index + 1) + ' / ' + st.combatants.length
      : st.combatants.length + (st.combatants.length === 1 ? ' combatant' : ' combatants');

    els.next.disabled = st.combatants.length === 0;
    els.prev.disabled = st.combatants.length === 0;

    var view = playerView();
    els.start.textContent = view
      ? (st.combat.active ? 'Reroll party initiative' : 'Roll party initiative')
      : (st.combat.active ? 'Reroll initiative' : 'Roll initiative');
    if (els.viewNote) els.viewNote.hidden = !view;

    els.list.innerHTML = st.combatants.map(function (c) {
      return combatantHtml(c, c.id === st.combat.turnId);
    }).join('');

    els.list.hidden = st.combatants.length === 0;
    els.empty.hidden = st.combatants.length > 0;

    renderLog();
  }

  /* Events -------------------------------------------------------------- */

  function onAddSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    if (!name) {
      toast('Give the combatant a name.');
      return;
    }

    var initRaw = String(data.get('initiative') || '').trim();
    var kindRaw = String(data.get('kind') || 'monster');
    var trackField = form.querySelector('[name="trackHp"]');
    var hpKnown = kindRaw === 'monster' ? Boolean(trackField && trackField.checked) : true;

    addCombatants({
      name: name,
      kind: kindRaw,
      initiative: initRaw === '' ? null : U.toInt(initRaw, 0),
      initMod: U.toInt(data.get('initMod'), 0),
      maxHp: U.toInt(data.get('maxHp'), 10),
      ac: U.toInt(data.get('ac'), 10),
      quantity: U.toInt(data.get('quantity'), 1),
      hpKnown: hpKnown
    });

    form.reset();
    var kind = form.querySelector('[name="kind"]');
    if (kind) kind.value = 'monster';
    var qty = form.querySelector('[name="quantity"]');
    if (qty) qty.value = '1';
    if (trackField) trackField.checked = !playerView();
    var nameInput = form.querySelector('[name="name"]');
    if (nameInput) nameInput.focus();
  }

  function onListClick(event) {
    var button = event.target.closest('button[data-act]');
    if (!button) return;

    var row = button.closest('[data-id]');
    if (!row) return;

    var c = findById(row.getAttribute('data-id'));
    if (!c) return;

    var act = button.getAttribute('data-act');

    if (act === 'damage' || act === 'heal') {
      var input = row.querySelector('.hp-amount');
      applyHp(c.id, input ? input.value : '', act);
    } else if (act === 'remove') {
      removeCombatant(c);
    } else if (act === 'set-turn') {
      if (c.initiative === null) {
        var entered = window.prompt('Initiative for ' + c.name + ':', '');
        if (entered === null) return;
        if (entered.trim() !== '') {
          c.initiative = U.toInt(entered, 0);
          sortAll();
          log(c.name + ' enters initiative at ' + c.initiative + '.', 'initiative');
          DnD.store.commit();
        }
        return;
      }
      setTurn(c);
    } else if (act === 'drop-cond') {
      var condition = button.getAttribute('data-cond');
      removeCondition(c, condition);
      log(c.name + ' no longer has ' + condition + '.', 'info');
      DnD.store.commit();
    } else if (act === 'death-success' || act === 'death-fail') {
      bumpDeathSave(c, act === 'death-success' ? 'success' : 'fail');
    } else if (act === 'save-edit') {
      saveEditor(c, row.querySelector('details'));
    }
  }

  function onListChange(event) {
    var statusSelect = event.target.closest('select[data-act="set-status"]');
    if (statusSelect) {
      var statusRow = statusSelect.closest('[data-id]');
      var statusTarget = statusRow ? findById(statusRow.getAttribute('data-id')) : null;
      if (statusTarget) {
        statusTarget.status = statusSelect.value;
        if (statusTarget.status) {
          log(statusTarget.name + ' is ' + statusTarget.status.toLowerCase() + '.', 'info');
        }
        DnD.store.commit();
      }
      return;
    }

    var select = event.target.closest('select[data-act="add-cond"]');
    if (!select || !select.value) return;

    var row = select.closest('[data-id]');
    if (!row) return;

    var c = findById(row.getAttribute('data-id'));
    if (!c) return;

    if (c.conditions.indexOf(select.value) < 0) {
      addCondition(c, select.value);
      log(c.name + ' gains the ' + select.value + ' condition.', 'info');
    }
    select.value = '';
    DnD.store.commit();
  }

  function onListToggle(event) {
    var details = event.target;
    if (!details || details.tagName !== 'DETAILS') return;
    var row = details.closest('[data-id]');
    if (!row) return;
    var id = row.getAttribute('data-id');
    if (details.open) openEditors.add(id);
    else openEditors.delete(id);
  }

  function resetEncounter() {
    if (!window.confirm('Clear all monsters and allies from the encounter? Party members stay.')) return;

    var st = state();
    st.combatants = st.combatants.filter(function (c) { return c.kind === 'pc'; });
    st.combatants.forEach(function (c) {
      c.initiative = null;
      c.conditions = [];
      c.deathSaves = { success: 0, fail: 0 };
    });
    st.combat.active = false;
    st.combat.round = 1;
    st.combat.turnId = null;
    openEditors.clear();

    log('Encounter cleared. Party members remain.', 'info');
    DnD.store.commit();
    toast('Encounter cleared.');
  }

  function longRest(id) {
    var party = state().combatants.filter(function (c) {
      return c.kind === 'pc' && (!id || c.id === id);
    });
    if (!party.length) {
      toast('Add a party member first.');
      return;
    }

    party.forEach(function (c) {
      c.hp.current = c.hp.max;
      c.hp.temp = 0;
      c.conditions = [];
      c.deathSaves = { success: 0, fail: 0 };
      c.pc.concentration = '';
      if (Array.isArray(c.pc.slots)) {
        c.pc.slots.forEach(function (slot) { slot.used = 0; });
      }
      if (Array.isArray(c.pc.resources)) {
        c.pc.resources.forEach(function (resource) { resource.used = 0; });
      }
      if (c.pc.hitDice) {
        var regained = Math.ceil(c.pc.hitDice.total / 2);
        c.pc.hitDice.used = Math.max(0, c.pc.hitDice.used - regained);
      }
    });

    log(id
      ? party[0].name + ' finishes a long rest — HP, slots and resources restored.'
      : 'The party takes a long rest — HP, slots and resources restored.', 'heal');
    DnD.store.commit();
    toast(id ? 'Long rest: ' + party[0].name + ' restored.' : 'Long rest: party restored.');
  }

  function shortRest(id) {
    var party = state().combatants.filter(function (c) {
      return c.kind === 'pc' && (!id || c.id === id);
    });
    if (!party.length) {
      toast('Add a party member first.');
      return;
    }

    party.forEach(function (c) {
      if (Array.isArray(c.pc.resources)) {
        c.pc.resources.forEach(function (resource) {
          if (resource.recharge === 'short') resource.used = 0;
        });
      }
      if (c.pc.classId === 'warlock' && Array.isArray(c.pc.slots)) {
        c.pc.slots.forEach(function (slot) { slot.used = 0; });
      }
    });

    log(id ? party[0].name + ' takes a short rest.' : 'The party takes a short rest.', 'heal');
    DnD.store.commit();
    toast('Short rest: short-rest resources restored.');
  }

  function adjustDeathSave(id, kind) {
    var c = findById(id);
    if (c) bumpDeathSave(c, kind);
  }

  function loadDemo() {
    var st = state();
    if (st.combatants.length && !window.confirm('Add the demo party and monsters to the current encounter?')) {
      return;
    }

    function demoSlots(maxima) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (level) {
        return { level: level, max: maxima[level - 1] || 0, used: 0 };
      });
    }

    function mergeDemoPc(pc, extras) {
      Object.keys(extras).forEach(function (key) {
        var value = extras[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          pc[key] = Object.assign({}, pc[key] || {}, value);
        } else {
          pc[key] = value;
        }
      });
    }

    var demoExtras = {
      Aria: {
        abilities: { str: 10, dex: 18, con: 14, int: 12, wis: 14, cha: 10 },
        saveProfs: { dex: true, int: true },
        skillProfs: { acrobatics: 1, deception: 1, investigation: 1, perception: 1, persuasion: 1, sleight: 1, stealth: 2 },
        attacks: [
          { id: 'demo-aria-rapier', name: 'Rapier', bonus: 7, damage: '1d8+4', type: 'piercing' },
          { id: 'demo-aria-bow', name: 'Shortbow', bonus: 7, damage: '1d6+4', type: 'piercing' }
        ],
        features: 'Sneak Attack (3d6), Cunning Action, Uncanny Dodge, Evasion',
        inventory: 'Rapier, shortbow, 20 arrows, thieves’ tools, studded leather, hooded lantern',
        currency: { gp: 25 },
        hitDice: { die: 8, total: 5, used: 0 }
      },
      Borin: {
        abilities: { str: 17, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
        saveProfs: { str: true, con: true },
        skillProfs: { athletics: 2, intimidation: 1, survival: 1 },
        attacks: [
          { id: 'demo-borin-longsword', name: 'Longsword', bonus: 6, damage: '1d8+5', type: 'slashing' },
          { id: 'demo-borin-javelin', name: 'Javelin', bonus: 6, damage: '1d6+3', type: 'piercing' }
        ],
        features: 'Second Wind, Action Surge, Extra Attack, Fighting Style (Dueling)',
        inventory: 'Longsword, shield, splint mail, 4 javelins, explorer’s pack',
        currency: { gp: 18 },
        hitDice: { die: 10, total: 5, used: 0 }
      },
      Lyra: {
        abilities: { str: 12, dex: 10, con: 14, int: 10, wis: 17, cha: 13 },
        saveProfs: { wis: true, cha: true },
        skillProfs: { insight: 1, medicine: 1, perception: 1, religion: 1 },
        attacks: [
          { id: 'demo-lyra-mace', name: 'Mace', bonus: 4, damage: '1d6+1', type: 'bludgeoning' },
          { id: 'demo-lyra-bolt', name: 'Guiding Bolt', bonus: 6, damage: '4d6', type: 'radiant' }
        ],
        slots: demoSlots([4, 3, 2]),
        spellAbility: 'wis',
        spellList: 'Cantrips: Guidance, Sacred Flame, Light\n1st: Bless, Healing Word, Shield of Faith\n2nd: Aid, Spiritual Weapon\n3rd: Spirit Guardians, Revivify',
        features: 'Channel Divinity, Disciple of Life, Preserve Life',
        inventory: 'Mace, scale mail, shield, holy symbol, healer’s kit',
        currency: { gp: 32 },
        hitDice: { die: 8, total: 5, used: 0 }
      },
      Pip: {
        abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
        saveProfs: { int: true, wis: true },
        skillProfs: { arcana: 1, history: 1, investigation: 1, perception: 1 },
        attacks: [
          { id: 'demo-pip-firebolt', name: 'Fire Bolt', bonus: 7, damage: '2d10', type: 'fire' },
          { id: 'demo-pip-dagger', name: 'Dagger', bonus: 5, damage: '1d4+2', type: 'piercing' }
        ],
        slots: demoSlots([4, 3, 2]),
        spellAbility: 'int',
        spellList: 'Cantrips: Fire Bolt, Mage Hand, Minor Illusion, Prestidigitation\n1st: Magic Missile, Shield, Detect Magic\n2nd: Misty Step, Web\n3rd: Fireball, Counterspell',
        features: 'Arcane Recovery, Portent, Spellcasting',
        inventory: 'Spellbook, dagger, component pouch, robes, ink and quill',
        currency: { gp: 40 },
        hitDice: { die: 6, total: 5, used: 0 }
      }
    };

    var demoParty = [
      { name: 'Aria', classId: 'rogue', subclass: 'Thief', level: 5, ac: 16, maxHp: 38, initMod: 4, passive: 15, player: 'Sam' },
      { name: 'Borin', classId: 'fighter', subclass: 'Champion', level: 5, ac: 18, maxHp: 49, initMod: 1, passive: 11, player: 'Alex' },
      { name: 'Lyra', classId: 'cleric', subclass: 'Life Domain', level: 5, ac: 17, maxHp: 40, initMod: 0, passive: 16, player: 'Jordan' },
      { name: 'Pip', classId: 'wizard', subclass: 'School of Evocation', level: 5, ac: 13, maxHp: 30, initMod: 2, passive: 14, player: 'Casey' }
    ];

    demoParty.forEach(function (row) {
      var c = addCharacter({
        name: row.name,
        classId: row.classId,
        subclass: row.subclass,
        level: row.level,
        ac: row.ac,
        maxHp: row.maxHp,
        initMod: row.initMod,
        passive: row.passive,
        player: row.player
      });
      if (demoExtras[row.name]) mergeDemoPc(c.pc, demoExtras[row.name]);
    });

    addMonster({ name: 'Goblin', type: 'Small humanoid', ac: 15, hp: 7, cr: 0.25, xp: 50 }, 3);
    addMonster({ name: 'Hobgoblin', type: 'Medium humanoid', ac: 18, hp: 11, cr: 0.5, xp: 100 }, 1);

    st.combatants.forEach(function (c) {
      if (c.initiative === null) c.initiative = rollInitiative(c);
    });

    log('Demo encounter loaded.', 'info');
    startCombat(false);
  }

  function init() {
    els = {
      round: document.getElementById('round-number'),
      turnName: document.getElementById('turn-name'),
      turnPos: document.getElementById('turn-position'),
      next: document.getElementById('btn-next-turn'),
      prev: document.getElementById('btn-prev-turn'),
      start: document.getElementById('btn-start-combat'),
      reset: document.getElementById('btn-reset-encounter'),
      list: document.getElementById('combat-list'),
      empty: document.getElementById('combat-empty'),
      log: document.getElementById('encounter-log'),
      viewNote: document.getElementById('player-view-note'),
      form: document.getElementById('add-combatant')
    };
    if (!els.list) return;

    var trackField = els.form.querySelector('[name="trackHp"]');
    if (trackField) trackField.checked = !playerView();

    els.form.addEventListener('submit', onAddSubmit);
    els.next.addEventListener('click', nextTurn);
    els.prev.addEventListener('click', prevTurn);
    els.start.addEventListener('click', function () { startCombat(state().combat.active); });
    els.reset.addEventListener('click', resetEncounter);

    els.list.addEventListener('click', onListClick);
    els.list.addEventListener('change', onListChange);
    els.list.addEventListener('toggle', onListToggle, true);

    var demoButton = document.getElementById('btn-load-demo');
    if (demoButton) demoButton.addEventListener('click', loadDemo);

    DnD.store.on(render);
    render();
  }

  DnD.combat = {
    init: init,
    render: render,
    conditions: CONDITIONS,
    nextTurn: nextTurn,
    prevTurn: prevTurn,
    startCombat: startCombat,
    resetEncounter: resetEncounter,
    longRest: longRest,
    shortRest: shortRest,
    adjustDeathSave: adjustDeathSave,
    addCombatants: addCombatants,
    addMonster: addMonster,
    addCharacter: addCharacter,
    applyHp: applyHp,
    loadDemo: loadDemo,
    syncAddForm: function () {
      if (!els.form) return;
      var track = els.form.querySelector('[name="trackHp"]');
      if (track) track.checked = !playerView();
    }
  };
})();

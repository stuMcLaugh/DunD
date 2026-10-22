/* DunD — party roster */
(function () {
  'use strict';

  var U = DnD.util;
  var openEditors = new Set();
  var els = {};

  function state() { return DnD.store.state; }
  function pcs() { return state().combatants.filter(function (c) { return c.kind === 'pc'; }); }
  function toast(message) { if (DnD.ui) DnD.ui.toast(message); }

  function cardHtml(c) {
    var pct = c.hp.max > 0 ? Math.round((c.hp.current / c.hp.max) * 100) : 0;
    var hpClass = pct > 50 ? 'high' : pct > 20 ? 'mid' : 'low';
    var title = [c.pc.class, c.pc.subclass, c.pc.level ? 'Level ' + c.pc.level : '']
      .filter(Boolean).join(' · ');
    var isActive = state().settings.activeCharacterId === c.id;
    var conditions = c.conditions.map(function (name) {
      return '<span class="chip">' + U.esc(name) + '</span>';
    }).join('');

    return '<article class="party-card card' + (isActive ? ' active-character' : '') + '" data-id="' + c.id + '">' +
      '<header class="party-head">' +
        '<div class="party-ident">' +
          U.avatar(c, 'small') +
          '<div>' +
            '<h3>' + U.esc(c.name) + '</h3>' +
            '<p class="muted small">' + U.esc(title || 'Adventurer') +
              (c.pc.player ? ' · ' + U.esc(c.pc.player) : '') + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="party-vitals">' +
          '<span title="Armor class"><strong>' + c.ac + '</strong><small>AC</small></span>' +
          '<span title="Passive perception"><strong>' + c.pc.passive + '</strong><small>PP</small></span>' +
          '<span title="Initiative"><strong>' + (c.initiative === null ? '—' : c.initiative) + '</strong><small>Init</small></span>' +
        '</div>' +
      '</header>' +
      '<div class="party-playbar">' +
        (isActive
          ? '<span class="you-pill">★ Your character</span>'
          : '<button type="button" class="btn small ghost" data-act="play">Play as this character</button>') +
      '</div>' +
      '<div class="hp-row">' +
        '<div class="hp-bar"><span class="hp-fill ' + hpClass + '" style="width:' + pct + '%"></span></div>' +
        '<span class="hp-text">' + c.hp.current + ' / ' + c.hp.max +
          (c.hp.temp ? ' <em>(+' + c.hp.temp + ' temp)</em>' : '') + '</span>' +
      '</div>' +
      (conditions ? '<div class="chips">' + conditions + '</div>' : '') +
      '<div class="hp-controls">' +
        '<input class="hp-amount" type="number" inputmode="numeric" placeholder="0" aria-label="Hit points to apply to ' + U.esc(c.name) + '">' +
        '<button type="button" class="btn small" data-act="damage">Damage</button>' +
        '<button type="button" class="btn small ghost" data-act="heal">Heal</button>' +
        '<button type="button" class="btn small danger-ghost" data-act="remove">Remove</button>' +
      '</div>' +
      '<details class="row-editor"' + (openEditors.has(c.id) ? ' open' : '') + '>' +
        '<summary>Edit character</summary>' +
        '<div class="editor-grid">' +
          '<label class="field"><span>Name</span><input data-edit="name" maxlength="60" value="' + U.esc(c.name) + '"></label>' +
          '<label class="field"><span>Class</span><select data-edit="class">' + DnD.classes.optionsHtml(c.pc.classId, c.pc.classId ? '' : c.pc.class) + '</select></label>' +
          '<label class="field"><span>Level</span><input data-edit="level" type="number" min="1" max="20" value="' + c.pc.level + '"></label>' +
          '<label class="field"><span>Subclass</span><input data-edit="subclass" list="party-subclass-' + c.id + '" maxlength="40" value="' + U.esc(c.pc.subclass) + '"></label>' +
          '<datalist id="party-subclass-' + c.id + '">' + DnD.classes.subclassOptionsHtml(c.pc.classId) + '</datalist>' +
          '<label class="field full"><span>Custom class name (homebrew)</span><input data-edit="classCustom" maxlength="40" value="' + U.esc(c.pc.classId ? '' : c.pc.class) + '"></label>' +
          '<label class="field"><span>Player</span><input data-edit="player" maxlength="40" value="' + U.esc(c.pc.player) + '"></label>' +
          '<label class="field"><span>AC</span><input data-edit="ac" type="number" min="0" value="' + c.ac + '"></label>' +
          '<label class="field"><span>Max HP</span><input data-edit="maxHp" type="number" min="1" value="' + c.hp.max + '"></label>' +
          '<label class="field"><span>Current HP</span><input data-edit="currentHp" type="number" min="0" value="' + c.hp.current + '"></label>' +
          '<label class="field"><span>Temp HP</span><input data-edit="tempHp" type="number" min="0" value="' + c.hp.temp + '"></label>' +
          '<label class="field"><span>Init mod</span><input data-edit="initMod" type="number" value="' + c.initMod + '"></label>' +
          '<label class="field"><span>Passive perc.</span><input data-edit="passive" type="number" min="0" max="40" value="' + c.pc.passive + '"></label>' +
          '<div class="field full"><span>Portrait</span>' +
            '<div class="portrait-actions">' +
              '<button type="button" class="btn small" data-act="portrait">Choose image…</button>' +
              '<button type="button" class="btn small ghost" data-act="clear-portrait"' + (c.portrait ? '' : ' disabled') + '>Remove</button>' +
              '<span class="muted small">Saved on this device only.</span>' +
            '</div>' +
          '</div>' +
          '<label class="field full"><span>Notes</span><input data-edit="notes" maxlength="500" value="' + U.esc(c.notes) + '"></label>' +
        '</div>' +
        '<div class="editor-actions"><button type="button" class="btn primary small" data-act="save">Save changes</button></div>' +
      '</details>' +
    '</article>';
  }

  function render() {
    if (!els.list) return;
    var party = pcs();
    els.list.innerHTML = party.map(cardHtml).join('');
    els.list.hidden = party.length === 0;
    els.empty.hidden = party.length > 0;
  }

  function onSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    if (!name) {
      toast('Give the character a name.');
      return;
    }

    var character = DnD.combat.addCharacter({
      name: name,
      classId: DnD.classes.find(String(data.get('class') || ''))
        ? DnD.classes.find(String(data.get('class') || '')).id
        : '',
      className: DnD.classes.find(String(data.get('class') || ''))
        ? DnD.classes.find(String(data.get('class') || '')).name
        : String(data.get('className') || '').trim(),
      subclass: String(data.get('subclass') || '').trim(),
      level: U.toInt(data.get('level'), 1),
      player: String(data.get('player') || '').trim(),
      ac: U.toInt(data.get('ac'), 10),
      maxHp: U.toInt(data.get('maxHp'), 10),
      initMod: U.toInt(data.get('initMod'), 0),
      passive: U.toInt(data.get('passive'), 10)
    });

    form.reset();
    var level = form.querySelector('[name="level"]');
    if (level) level.value = '1';
    var ac = form.querySelector('[name="ac"]');
    if (ac) ac.value = '10';
    var hp = form.querySelector('[name="maxHp"]');
    if (hp) hp.value = '10';
    var init = form.querySelector('[name="initMod"]');
    if (init) init.value = '0';
    var passive = form.querySelector('[name="passive"]');
    if (passive) passive.value = '10';

    if (els.classSelect) {
      els.classSelect.value = '';
      syncClassFields();
    }

    var nameInput = form.querySelector('[name="name"]');
    if (nameInput) nameInput.focus();

    toast(character.name + ' joined the party.');
  }

  function onClick(event) {
    var button = event.target.closest('button[data-act]');
    if (!button) return;

    var card = button.closest('[data-id]');
    if (!card) return;

    var id = card.getAttribute('data-id');
    var c = state().combatants.find(function (x) { return x.id === id; });
    if (!c) return;

    var act = button.getAttribute('data-act');

    if (act === 'damage' || act === 'heal') {
      var input = card.querySelector('.hp-amount');
      DnD.combat.applyHp(id, input ? input.value : '', act);
    } else if (act === 'play') {
      state().settings.activeCharacterId = id;
      DnD.store.log(c.name + ' is now the active character.', 'info');
      DnD.store.commit();
      toast('Playing as ' + c.name + '.');
    } else if (act === 'portrait') {
      pickPortrait(c);
    } else if (act === 'clear-portrait') {
      c.portrait = '';
      DnD.store.commit();
      toast('Portrait removed.');
    } else if (act === 'remove') {
      if (!window.confirm('Remove ' + c.name + ' from the party?')) return;
      state().combatants = state().combatants.filter(function (x) { return x.id !== id; });
      if (state().combat.turnId === id) state().combat.turnId = null;
      if (state().settings.activeCharacterId === id) {
        var remaining = state().combatants.filter(function (x) { return x.kind === 'pc'; });
        state().settings.activeCharacterId = remaining.length ? remaining[0].id : null;
      }
      openEditors.delete(id);
      DnD.store.log(c.name + ' left the party.', 'info');
      DnD.store.commit();
    } else if (act === 'save') {
      saveEditor(c, card.querySelector('details'));
    }
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

  function onToggle(event) {
    var details = event.target;
    if (!details || details.tagName !== 'DETAILS') return;
    var card = details.closest('[data-id]');
    if (!card) return;
    var id = card.getAttribute('data-id');
    if (details.open) openEditors.add(id);
    else openEditors.delete(id);
  }

  function saveEditor(c, details) {
    if (!details) return;

    function input(name) {
      return details.querySelector('[data-edit="' + name + '"]');
    }

    if (input('name')) c.name = input('name').value.trim().slice(0, 60) || c.name;

    var previousClassId = c.pc.classId;
    var previousClass = c.pc.class;
    var previousLevel = c.pc.level;
    var classSelect = input('class');
    var classValue = classSelect ? classSelect.value : (c.pc.classId || '');
    var classInfo = DnD.classes.find(classValue);
    var customClass = input('classCustom');
    var newClassId = classInfo ? classInfo.id : '';
    var newClassName = classInfo
      ? classInfo.name
      : (customClass && customClass.value.trim()
        ? customClass.value.trim().slice(0, 40)
        : (c.pc.classId ? '' : c.pc.class));
    var newLevel = input('level')
      ? U.clamp(U.toInt(input('level').value, previousLevel), 1, 20)
      : previousLevel;

    c.pc.classId = newClassId;
    c.pc.class = newClassName;
    c.pc.level = newLevel;
    if (input('subclass')) c.pc.subclass = input('subclass').value.trim().slice(0, 40);

    var classChanged = newClassId !== previousClassId || newClassName !== previousClass;
    if ((classChanged || newLevel !== previousLevel) && classInfo) {
      DnD.classes.apply(c.pc, newLevel);
    } else if (newLevel !== previousLevel) {
      c.pc.hitDice.total = U.clamp(newLevel, 1, 40);
      c.pc.hitDice.used = U.clamp(c.pc.hitDice.used, 0, c.pc.hitDice.total);
    }

    if (input('player')) c.pc.player = input('player').value.trim().slice(0, 40);
    if (input('ac')) c.ac = Math.max(0, U.toInt(input('ac').value, 0));

    if (input('maxHp')) {
      var maxHp = Math.max(1, U.toInt(input('maxHp').value, c.hp.max));
      c.hp.max = maxHp;
      if (input('currentHp')) {
        c.hp.current = U.clamp(U.toInt(input('currentHp').value, c.hp.current), 0, maxHp);
      }
    }

    if (input('tempHp')) c.hp.temp = Math.max(0, U.toInt(input('tempHp').value, 0));
    if (input('initMod')) c.initMod = U.toInt(input('initMod').value, 0);
    if (input('passive')) c.pc.passive = U.clamp(U.toInt(input('passive').value, 10), 0, 40);
    if (input('notes')) c.notes = input('notes').value.trim().slice(0, 2000);

    DnD.store.log(c.name + ' updated.', 'info');
    DnD.store.commit();
  }

  function init() {
    els.list = document.getElementById('party-list');
    els.empty = document.getElementById('party-empty');
    els.form = document.getElementById('party-form');
    els.classSelect = document.getElementById('party-class-select');
    els.subclassInput = document.getElementById('party-subclass');
    els.subclassList = document.getElementById('party-subclass-list');
    els.customClassField = document.getElementById('party-custom-class-field');
    if (!els.list || !els.form) return;

    if (els.classSelect) {
      els.classSelect.innerHTML = DnD.classes.optionsHtml('', '');
      els.classSelect.addEventListener('change', syncClassFields);
      syncClassFields();
    }

    els.form.addEventListener('submit', onSubmit);
    els.list.addEventListener('click', onClick);
    els.list.addEventListener('toggle', onToggle, true);
    els.list.addEventListener('change', function (event) {
      var select = event.target.closest('select[data-edit="class"]');
      if (!select) return;
      var card = select.closest('[data-id]');
      var dataList = card ? card.querySelector('datalist') : null;
      if (dataList) {
        dataList.innerHTML = select.value === 'custom'
          ? ''
          : DnD.classes.subclassOptionsHtml(select.value);
      }
    });

    DnD.store.on(render);
    render();
  }

  function syncClassFields() {
    if (!els.classSelect) return;
    var isCustom = els.classSelect.value === 'custom';
    if (els.customClassField) els.customClassField.hidden = !isCustom;
    if (els.subclassList) {
      els.subclassList.innerHTML = isCustom
        ? ''
        : DnD.classes.subclassOptionsHtml(els.classSelect.value);
    }
    if (isCustom && els.subclassInput) els.subclassInput.value = '';
  }

  DnD.party = {
    init: init,
    render: render,
    refresh: render
  };
})();

/* DunD — app shell: tabs, header actions, shortcuts, toasts */
(function () {
  'use strict';

  window.DnD = window.DnD || {};
  var U = DnD.util;

  DnD.ui = {
    _timer: null,
    toast: function (message) {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = message;
      el.classList.add('show');
      clearTimeout(DnD.ui._timer);
      DnD.ui._timer = setTimeout(function () { el.classList.remove('show'); }, 2600);
    }
  };

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function updateTitle() {
    var name = DnD.store.state.campaign.name;
    document.title = name ? name + ' — DunD' : 'DunD — Table Companion';
  }

  function stamp() {
    var el = document.getElementById('save-stamp');
    if (!el) return;
    el.textContent = DnD.store.lastSaved
      ? 'Saved ' + U.time(DnD.store.lastSaved)
      : 'Auto-saves locally';
  }

  function updateViewButton() {
    var button = document.getElementById('btn-player-view');
    if (!button) return;
    var on = DnD.store.state.settings.playerView !== false;
    button.textContent = 'Player view: ' + (on ? 'on' : 'off');
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.classList.toggle('on', on);
  }

  function ensureActiveCharacter() {
    var st = DnD.store.state;
    var currentId = st.settings.activeCharacterId;
    if (currentId && st.combatants.some(function (c) { return c.id === currentId && c.kind === 'pc'; })) {
      return;
    }
    var firstPc = st.combatants.find(function (c) { return c.kind === 'pc'; });
    st.settings.activeCharacterId = firstPc ? firstPc.id : null;
    if (firstPc) DnD.store.save();
  }

  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
    var current = 'combat';

    try {
      var saved = window.sessionStorage.getItem('dnd:tab');
      if (saved && panels.some(function (p) { return p.id === 'panel-' + saved; })) current = saved;
    } catch (err) { /* ignore */ }

    function activate(name) {
      if (!panels.some(function (p) { return p.id === 'panel-' + name; })) name = 'combat';

      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-tab') === name;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
      });

      panels.forEach(function (panel) {
        panel.hidden = panel.id !== 'panel-' + name;
      });

      current = name;
      try { window.sessionStorage.setItem('dnd:tab', name); } catch (err) { /* ignore */ }
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-tab')); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        var direction = event.key === 'ArrowRight' ? 1 : -1;
        var next = tabs[(index + direction + tabs.length) % tabs.length];
        activate(next.getAttribute('data-tab'));
        next.focus();
      });
    });

    activate(current);

    DnD.app = DnD.app || {};
    DnD.app.activateTab = activate;
    DnD.app.currentTab = function () { return current; };
  }

  function initHeader() {
    var exportButton = document.getElementById('btn-export');
    var importButton = document.getElementById('btn-import');
    var fileInput = document.getElementById('import-file');
    var resetButton = document.getElementById('btn-reset');
    var restButton = document.getElementById('btn-long-rest');
    var viewButton = document.getElementById('btn-player-view');

    viewButton.addEventListener('click', function () {
      var settings = DnD.store.state.settings;
      settings.playerView = settings.playerView === false;
      DnD.combat.syncAddForm();
      DnD.store.commit();
      DnD.ui.toast(settings.playerView
        ? 'Player view: unknown monster HP and AC are hidden.'
        : 'DM view: full monster stats shown.');
    });

    exportButton.addEventListener('click', function () {
      var name = (DnD.store.state.campaign.name || 'dnd-save')
        .replace(/[^\w\- ]+/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase() || 'dnd-save';
      var date = new Date().toISOString().slice(0, 10);
      U.download(name + '-' + date + '.json', JSON.stringify(DnD.store.state, null, 2), 'application/json');
      DnD.ui.toast('Save file downloaded.');
    });

    importButton.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result));
          var data = parsed && parsed.data ? parsed.data : parsed;

          if (!data || typeof data !== 'object' || !Array.isArray(data.combatants)) {
            throw new Error('that does not look like a DunD save file');
          }
          if (!window.confirm('Replace the current party, encounter and notes with this save?')) return;

          DnD.store.replace(data);
          ensureActiveCharacter();
          DnD.notes.refresh();
          DnD.dice.refresh();
          DnD.bestiary.refresh();
          DnD.character.refresh();
          DnD.ui.toast('Save loaded.');
        } catch (err) {
          DnD.ui.toast('Could not import that file — ' + err.message + '.');
        } finally {
          fileInput.value = '';
        }
      };
      reader.onerror = function () {
        DnD.ui.toast('Could not read that file.');
        fileInput.value = '';
      };
      reader.readAsText(file);
    });

    resetButton.addEventListener('click', function () {
      if (!window.confirm('Reset everything? This clears the party, encounter, dice history and notes on this device.')) {
        return;
      }
      DnD.store.reset();
      DnD.notes.refresh();
      DnD.dice.refresh();
      DnD.bestiary.refresh();
      DnD.character.refresh();
      DnD.ui.toast('Everything has been reset.');
    });

    restButton.addEventListener('click', function () { DnD.combat.longRest(); });
  }

  function initShortcuts() {
    var tabNames = ['character', 'combat', 'dice', 'party', 'bestiary', 'notes', 'reference'];

    document.addEventListener('keydown', function (event) {
      if (event.defaultPrevented) return;

      if (event.altKey && /^[1-7]$/.test(event.key) && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        DnD.app.activateTab(tabNames[Number(event.key) - 1]);
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      var target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        DnD.app.activateTab('combat');
        DnD.combat.nextTurn();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        DnD.app.activateTab('dice');
        var input = document.getElementById('dice-expr-input');
        if (input) {
          input.focus();
          input.select();
        }
      }
    });
  }

  ready(function () {
    DnD.store.load();
    ensureActiveCharacter();

    DnD.combat.init();
    DnD.character.init();
    DnD.party.init();
    DnD.dice.init();
    DnD.bestiary.init();
    DnD.notes.init();
    DnD.reference.init();

    initTabs();
    initHeader();
    initShortcuts();

    updateTitle();
    updateViewButton();
    stamp();

    DnD.store.on(function (state) {
      updateTitle();
      updateViewButton();
    });

    document.addEventListener('dnd:saved', stamp);

    window.addEventListener('pagehide', function () {
      var notes = document.getElementById('notes-text');
      var campaign = document.getElementById('campaign-name');
      if (notes) DnD.store.state.notes = notes.value;
      if (campaign) DnD.store.state.campaign.name = campaign.value.trim().slice(0, 60);

      var activeId = DnD.store.state.settings.activeCharacterId;
      var activeCharacter = activeId
        ? DnD.store.state.combatants.find(function (c) { return c.id === activeId; })
        : null;
      if (activeCharacter) {
        var charNotes = document.getElementById('char-notes');
        var charConcentration = document.getElementById('char-concentration');
        if (charNotes) activeCharacter.notes = charNotes.value;
        if (charConcentration) activeCharacter.pc.concentration = charConcentration.value.trim().slice(0, 100);
      }

      DnD.store.save();
    });
  });
})();

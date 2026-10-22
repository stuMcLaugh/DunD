/* DunD — campaign and session notes */
(function () {
  'use strict';

  var U = DnD.util;
  var els = {};

  function state() { return DnD.store.state; }
  function toast(message) { if (DnD.ui) DnD.ui.toast(message); }

  function init() {
    els.name = document.getElementById('campaign-name');
    els.text = document.getElementById('notes-text');
    els.status = document.getElementById('notes-status');
    els.copy = document.getElementById('btn-copy-notes');
    els.download = document.getElementById('btn-download-notes');
    if (!els.text) return;

    refresh();

    var autosave = U.debounce(function () {
      state().notes = els.text.value;
      state().campaign.name = els.name.value.trim().slice(0, 60);
      document.title = state().campaign.name
        ? state().campaign.name + ' — DunD'
        : 'DunD — Table Companion';
      DnD.store.save();
      els.status.textContent = 'Saved ' + U.time();
    }, 350);

    els.text.addEventListener('input', function () {
      els.status.textContent = 'Saving…';
      autosave();
    });

    els.name.addEventListener('input', function () {
      els.status.textContent = 'Saving…';
      autosave();
    });

    els.copy.addEventListener('click', copyNotes);
    els.download.addEventListener('click', downloadNotes);
  }

  function copyNotes() {
    var text = els.text.value;

    function fallback() {
      els.text.focus();
      els.text.select();
      try {
        document.execCommand('copy');
        toast('Notes copied to the clipboard.');
      } catch (err) {
        toast('Could not copy automatically — select the text and copy it manually.');
      }
      els.text.setSelectionRange(0, 0);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('Notes copied to the clipboard.');
      }, fallback);
    } else {
      fallback();
    }
  }

  function downloadNotes() {
    var campaign = els.name.value.trim() || 'Session notes';
    var slug = campaign.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'session-notes';
    var body = '# ' + campaign + '\n\n' + els.text.value + '\n';
    U.download(slug + '.md', body, 'text/markdown;charset=utf-8');
    toast('Notes downloaded.');
  }

  function refresh() {
    if (!els.text) return;
    els.text.value = state().notes || '';
    els.name.value = state().campaign.name || '';
    els.status.textContent = 'Saved';
  }

  DnD.notes = {
    init: init,
    refresh: refresh
  };
})();

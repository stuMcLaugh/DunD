/* DunD — dice parser, roller and dice tab UI */
(function () {
  'use strict';

  var U = DnD.util;
  var MAX_DICE = 100;

  function randomInt(max) {
    if (max <= 0) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      var buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function rollDie(sides) {
    return 1 + randomInt(sides);
  }

  /**
   * Parse an expression like "2d6+3", "4d6kh3", "2d20kl1", "1d8+1d6+2".
   * Returns an array of terms or throws an Error with a readable message.
   */
  function parse(expr) {
    var src = String(expr == null ? '' : expr).trim();
    if (!src) throw new Error('Type a dice expression, like 2d6+3.');

    var re = /([+-])?\s*(?:(\d+)\s*d\s*(\d+)(?:\s*(kh|kl)\s*(\d+))?|(\d+))/gi;
    var terms = [];
    var match;
    var last = 0;

    while ((match = re.exec(src))) {
      if (match.index !== last) {
        var gap = src.slice(last, match.index).trim();
        if (gap) throw new Error('Could not understand “' + gap + '”.');
      }
      last = re.lastIndex;

      var sign = match[1] === '-' ? -1 : 1;

      if (match[3]) {
        var count = U.clamp(U.toInt(match[2] || '1', 1), 1, MAX_DICE);
        var sides = U.toInt(match[3], 0);
        if (sides < 2 || sides > 1000) throw new Error('Dice need between 2 and 1000 sides.');

        var keep = null;
        if (match[4]) {
          keep = {
            mode: match[4].toLowerCase(),
            n: U.clamp(U.toInt(match[5] || '1', 1), 1, count)
          };
        }
        terms.push({ type: 'dice', sign: sign, count: count, sides: sides, keep: keep });
      } else {
        terms.push({ type: 'flat', sign: sign, value: U.toInt(match[6], 0) });
      }
    }

    var tail = src.slice(last).trim();
    if (tail) throw new Error('Could not understand “' + tail + '”.');
    if (!terms.length) throw new Error('No dice or numbers found.');

    return terms;
  }

  /** Roll a parsed expression (or string) and return the full breakdown. */
  function rollExpr(expr) {
    var terms = parse(expr);
    var rolled = [];
    var total = 0;
    var nat = null;

    terms.forEach(function (term) {
      if (term.type === 'flat') {
        var flatTotal = term.sign * term.value;
        total += flatTotal;
        rolled.push({
          type: 'flat', sign: term.sign, value: term.value,
          subtotal: flatTotal, rolls: [], kept: []
        });
        return;
      }

      var rolls = [];
      for (var i = 0; i < term.count; i += 1) rolls.push(rollDie(term.sides));

      var kept = rolls.map(function () { return true; });

      if (term.keep) {
        kept = rolls.map(function () { return false; });
        var order = rolls.map(function (v, index) { return index; });
        order.sort(function (a, b) {
          return term.keep.mode === 'kh' ? rolls[b] - rolls[a] : rolls[a] - rolls[b];
        });
        order.slice(0, term.keep.n).forEach(function (index) { kept[index] = true; });
      }

      var subtotal = rolls.reduce(function (sum, value, index) {
        return sum + (kept[index] ? value : 0);
      }, 0) * term.sign;

      total += subtotal;

      if (term.sides === 20) {
        var keptValues = rolls.filter(function (v, index) { return kept[index]; });
        if (keptValues.length === 1) nat = keptValues[0];
      }

      rolled.push({
        type: 'dice', sign: term.sign, count: term.count, sides: term.sides,
        keep: term.keep, rolls: rolls, kept: kept, subtotal: subtotal
      });
    });

    return { expr: String(expr).trim(), terms: rolled, total: total, nat: nat };
  }

  /** Turn advantage/disadvantage into a keep-highest/lowest roll on d20 terms. */
  function applyMode(expr, mode) {
    if (mode !== 'adv' && mode !== 'dis') return expr;
    return String(expr).replace(/\b(\d*)d20\b/i, function (full, countText) {
      var count = Math.max(1, U.toInt(countText || '1', 1));
      return (count + 1) + 'd20' + (mode === 'adv' ? 'kh' : 'kl') + count;
    });
  }

  /* UI ------------------------------------------------------------------ */

  var els = null;
  var physicalTouched = false;

  function partHtml(term) {
    if (term.type === 'flat') {
      return '<div class="dice-part flat"><span class="dp-label">' +
        (term.sign < 0 ? '−' : '+') + term.value + '</span></div>';
    }
    var dice = term.rolls.map(function (value, index) {
      return '<span class="die ' + (term.kept[index] ? '' : 'dropped') + '">' + value + '</span>';
    }).join('');
    var label = term.count + 'd' + term.sides + (term.keep ? term.keep.mode + term.keep.n : '');
    return '<div class="dice-part">' +
      '<span class="dp-label">' + (term.sign < 0 ? '−' : '') + label + '</span>' +
      '<span class="dp-dice">' + dice + '</span>' +
      '<span class="dp-total">' + (term.sign < 0 ? '−' : '+') + Math.abs(term.subtotal) + '</span>' +
      '</div>';
  }

  function modeLabel(mode) {
    if (mode === 'adv') return ' with advantage';
    if (mode === 'dis') return ' with disadvantage';
    return '';
  }

  function renderResult(result, mode) {
    els.total.textContent = String(result.total);
    els.total.className = 'dice-total';
    if (result.nat === 20) els.total.classList.add('crit');
    if (result.nat === 1) els.total.classList.add('fumble');

    els.expr.textContent = result.expr + modeLabel(mode);
    els.breakdown.innerHTML = result.terms.map(partHtml).join('');
  }

  function showError(message) {
    els.total.textContent = '!';
    els.total.className = 'dice-total fumble';
    els.expr.textContent = message;
    els.breakdown.innerHTML = '';
  }

  function renderHistory() {
    var items = DnD.store.state.dice.history;
    if (!items.length) {
      els.history.innerHTML = '<li class="muted">No rolls yet.</li>';
      return;
    }
    els.history.innerHTML = items.map(function (h) {
      var crit = h.nat === 20;
      return '<li class="' + (crit ? 'crit' : '') + '">' +
        '<span class="h-expr">' + U.esc(h.expr) +
          (h.physical ? ' <span class="h-tag">physical</span>' : '') +
          (crit ? ' <span class="h-crit">crit!</span>' : '') + '</span>' +
        '<span class="h-total">' + U.toInt(h.total, 0) + '</span>' +
        '<span class="h-time">' + U.time(h.t) + '</span>' +
        '</li>';
    }).join('');
  }

  function performRoll(expr, mode) {
    var result;
    try {
      result = rollExpr(expr);
    } catch (err) {
      showError(err.message);
      return;
    }

    renderResult(result, mode);

    var state = DnD.store.state;
    state.dice.history.unshift({
      id: U.uid(),
      expr: result.expr,
      total: result.total,
      nat: result.nat,
      t: Date.now(),
      mode: mode || 'normal'
    });
    state.dice.history = state.dice.history.slice(0, 30);
    state.dice.expr = els.input.value.trim() || '1d20';
    state.dice.modifier = U.toInt(els.modifier.value, 0);
    state.dice.mode = els.mode.value;

    DnD.store.save();
    renderHistory();
  }

  function init() {
    els = {
      form: document.getElementById('dice-form'),
      input: document.getElementById('dice-expr-input'),
      modifier: document.getElementById('dice-modifier'),
      mode: document.getElementById('dice-mode'),
      total: document.getElementById('dice-total'),
      expr: document.getElementById('dice-expr'),
      breakdown: document.getElementById('dice-breakdown'),
      quick: document.getElementById('dice-quick'),
      history: document.getElementById('dice-history'),
      clear: document.getElementById('btn-clear-dice'),
      physicalForm: document.getElementById('physical-form'),
      physicalValue: document.getElementById('physical-value'),
      physicalMod: document.getElementById('physical-mod'),
      physicalNote: document.getElementById('physical-note')
    };
    if (!els.form) return;

    var state = DnD.store.state;
    els.input.value = state.dice.expr || '1d20';
    els.modifier.value = String(state.dice.modifier || 0);
    els.mode.value = state.dice.mode || 'normal';
    if (els.physicalMod) els.physicalMod.value = String(state.dice.modifier || 0);

    els.modifier.addEventListener('input', function () {
      if (!physicalTouched && els.physicalMod) els.physicalMod.value = els.modifier.value;
    });

    if (els.physicalMod) {
      els.physicalMod.addEventListener('input', function () { physicalTouched = true; });
    }

    els.form.addEventListener('submit', function (event) {
      event.preventDefault();
      var raw = els.input.value.trim() || '1d20';
      var mod = U.toInt(els.modifier.value, 0);
      var expr = raw + (mod ? (mod > 0 ? '+' + mod : String(mod)) : '');
      var mode = els.mode.value;
      var appliedMode = /d20/i.test(expr) ? mode : 'normal';
      performRoll(applyMode(expr, mode), appliedMode);
    });

    els.quick.addEventListener('click', function (event) {
      var button = event.target.closest('[data-die]');
      if (!button) return;
      var sides = U.toInt(button.getAttribute('data-die'), 20);
      var mod = U.toInt(els.modifier.value, 0);
      var expr = '1d' + sides + (mod ? (mod > 0 ? '+' + mod : String(mod)) : '');
      var mode = els.mode.value;
      var appliedMode = sides === 20 ? mode : 'normal';
      performRoll(applyMode(expr, mode), appliedMode);
    });

    els.clear.addEventListener('click', function () {
      DnD.store.state.dice.history = [];
      DnD.store.save();
      renderHistory();
      els.total.textContent = '—';
      els.total.className = 'dice-total';
      els.expr.textContent = 'Roll something';
      els.breakdown.innerHTML = '';
    });

    if (els.physicalForm) {
      els.physicalForm.addEventListener('submit', onPhysicalRoll);
    }

    renderHistory();
  }

  function onPhysicalRoll(event) {
    event.preventDefault();

    var raw = els.physicalValue.value.trim();
    if (raw === '') {
      showError('Type the total shown on your dice.');
      els.physicalValue.focus();
      return;
    }

    var value = Math.max(0, U.toInt(raw, 0));
    var modifier = U.toInt(els.physicalMod.value, 0);
    var note = els.physicalNote.value.trim().slice(0, 40);
    var total = value + modifier;

    els.total.textContent = String(total);
    els.total.className = 'dice-total';
    els.expr.textContent = (note ? note + ' · ' : '') +
      'physical roll ' + value +
      (modifier ? (modifier > 0 ? ' + ' + modifier : ' − ' + Math.abs(modifier)) : '');
    els.breakdown.innerHTML = '<div class="dice-part">' +
      '<span class="dp-label">die</span>' +
      '<span class="dp-dice"><span class="die">' + value + '</span></span>' +
      '<span class="dp-total">' + (modifier ? (modifier > 0 ? '+' + modifier : '−' + Math.abs(modifier)) : '+0') + '</span>' +
      '</div>';

    var st = DnD.store.state;
    st.dice.history.unshift({
      id: U.uid(),
      expr: (note ? note + ' — ' : '') + 'physical ' + value +
        (modifier ? (modifier > 0 ? '+' + modifier : String(modifier)) : ''),
      total: total,
      nat: null,
      t: Date.now(),
      mode: 'physical',
      physical: true
    });
    st.dice.history = st.dice.history.slice(0, 30);
    DnD.store.save();
    renderHistory();

    els.physicalValue.value = '';
    els.physicalNote.value = '';
    els.physicalValue.focus();
  }

  function refresh() {
    if (!els) return;
    var state = DnD.store.state;
    els.input.value = state.dice.expr || '1d20';
    els.modifier.value = String(state.dice.modifier || 0);
    els.mode.value = state.dice.mode || 'normal';
    els.total.textContent = '—';
    els.total.className = 'dice-total';
    els.expr.textContent = 'Roll something';
    els.breakdown.innerHTML = '';
    renderHistory();
  }

  /** Roll from elsewhere in the app and record it in the dice history. */
  function record(expr, note) {
    var result = rollExpr(expr);

    if (els) {
      renderResult(result, 'normal');
      if (els.expr) els.expr.textContent = (note ? note + ' · ' : '') + result.expr;
    }

    var st = DnD.store.state;
    st.dice.history.unshift({
      id: U.uid(),
      expr: (note ? note + ' — ' : '') + result.expr,
      total: result.total,
      nat: result.nat,
      t: Date.now(),
      mode: 'normal'
    });
    st.dice.history = st.dice.history.slice(0, 30);
    DnD.store.save();

    if (els) renderHistory();
    return result;
  }

  DnD.dice = {
    rollDie: rollDie,
    parse: parse,
    rollExpr: rollExpr,
    applyMode: applyMode,
    record: record,
    init: init,
    refresh: refresh
  };
})();

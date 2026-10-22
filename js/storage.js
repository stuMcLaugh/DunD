/* DunD — persistence, state shape and small utilities */
(function () {
  'use strict';

  window.DnD = window.DnD || {};

  var KEY = 'dnd-companion-v1';
  var MAX_LOG = 200;

  var util = {
    uid: function () {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    },

    toInt: function (value, fallback) {
      var n = typeof value === 'number' ? value : parseInt(value, 10);
      if (!Number.isFinite(n)) return fallback === undefined ? 0 : fallback;
      return Math.trunc(n);
    },

    clamp: function (n, min, max) {
      return Math.min(max, Math.max(min, n));
    },

    esc: function (value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    signed: function (n) {
      n = Number(n) || 0;
      return (n >= 0 ? '+' : '') + n;
    },

    debounce: function (fn, wait) {
      var timer;
      return function () {
        var args = arguments;
        var context = this;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(context, args); }, wait);
      };
    },

    time: function (ts) {
      var date = ts ? new Date(ts) : new Date();
      try {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (err) {
        return date.toTimeString().slice(0, 5);
      }
    },

    avatar: function (combatant, extraClass) {
      var classes = 'avatar' + (extraClass ? ' ' + extraClass : '');
      if (combatant && typeof combatant.portrait === 'string' && combatant.portrait) {
        return '<img class="' + classes + '" src="' + util.esc(combatant.portrait) + '" alt="">';
      }
      var name = combatant && combatant.name ? combatant.name : '?';
      var initials = String(name).trim().split(/\s+/).slice(0, 2).map(function (part) {
        return part.charAt(0);
      }).join('').toUpperCase() || '?';
      return '<span class="' + classes + ' avatar-fallback" aria-hidden="true">' + util.esc(initials) + '</span>';
    },

    /** Read an image file and return a square, downscaled JPEG data URL. */
    readImage: function (file, size) {
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) {
          reject(new Error('Choose an image file.'));
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          reject(new Error('That image is larger than 8 MB.'));
          return;
        }

        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('Could not read that image.')); };
        reader.onload = function () {
          var image = new Image();
          image.onerror = function () { reject(new Error('Could not decode that image.')); };
          image.onload = function () {
            var dimension = size || 128;
            var side = Math.min(image.width, image.height);
            var sx = Math.round((image.width - side) / 2);
            var sy = Math.round((image.height - side) / 2);

            var canvas = document.createElement('canvas');
            canvas.width = dimension;
            canvas.height = dimension;
            var context = canvas.getContext('2d');
            context.drawImage(image, sx, sy, side, side, 0, 0, dimension, dimension);

            try {
              resolve(canvas.toDataURL('image/jpeg', 0.82));
            } catch (err) {
              reject(new Error('Could not process that image.'));
            }
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    },

    /** Let the user pick an image; resolves with a data URL, or null if cancelled. */
    pickImage: function (size) {
      return new Promise(function (resolve, reject) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        var settled = false;
        function finish(handler, value) {
          if (settled) return;
          settled = true;
          input.remove();
          handler(value);
        }

        input.addEventListener('change', function () {
          var file = input.files && input.files[0];
          if (!file) {
            finish(resolve, null);
            return;
          }
          util.readImage(file, size).then(function (url) {
            finish(resolve, url);
          }, function (err) {
            finish(reject, err);
          });
        });

        window.addEventListener('focus', function onFocus() {
          window.removeEventListener('focus', onFocus);
          setTimeout(function () {
            if (!settled && (!input.files || !input.files.length)) finish(resolve, null);
          }, 500);
        });

        input.click();
      });
    },

    download: function (filename, text, type) {
      var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
  };

  DnD.util = util;

  function defaults() {
    return {
      version: 4,
      campaign: { name: '' },
      notes: '',
      settings: { playerView: true, activeCharacterId: null },
      combat: { active: false, round: 1, turnId: null, log: [] },
      combatants: [],
      dice: { expr: '1d20', modifier: 0, mode: 'normal', history: [] },
      encounter: { level: 5, size: 4, items: [] }
    };
  }

  function normalizeSlots(raw) {
    var slots = [];
    for (var level = 1; level <= 9; level += 1) {
      var found = null;
      if (Array.isArray(raw)) {
        found = raw.find(function (slot) { return slot && util.toInt(slot.level, 0) === level; }) || null;
      }
      var max = found ? util.clamp(util.toInt(found.max, 0), 0, 9) : 0;
      var used = found ? util.clamp(util.toInt(found.used, 0), 0, max) : 0;
      slots.push({ level: level, max: max, used: used });
    }
    return slots;
  }

  function normalizeResources(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 20).map(function (resource) {
      var r = resource && typeof resource === 'object' ? resource : {};
      var max = util.clamp(util.toInt(r.max, 1), 0, 99);
      return {
        id: typeof r.id === 'string' && r.id ? r.id : util.uid(),
        name: String(r.name || 'Resource').slice(0, 40),
        max: max,
        used: util.clamp(util.toInt(r.used, 0), 0, max),
        recharge: r.recharge === 'long' ? 'long' : 'short',
        source: r.source === 'class' ? 'class' : ''
      };
    });
  }

  var ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var SKILL_KEYS = [
    'acrobatics', 'animal', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleight', 'stealth', 'survival'
  ];

  function normalizeAbilities(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var out = {};
    ABILITY_KEYS.forEach(function (key) {
      out[key] = util.clamp(util.toInt(src[key], 10), 1, 30);
    });
    return out;
  }

  function normalizeSaveProfs(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var out = {};
    ABILITY_KEYS.forEach(function (key) { out[key] = Boolean(src[key]); });
    return out;
  }

  function normalizeSkillProfs(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var out = {};
    SKILL_KEYS.forEach(function (key) {
      var rank = util.toInt(src[key], 0);
      out[key] = rank === 2 ? 2 : rank === 1 ? 1 : 0;
    });
    return out;
  }

  function normalizeAttacks(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 20).map(function (attack) {
      var a = attack && typeof attack === 'object' ? attack : {};
      return {
        id: typeof a.id === 'string' && a.id ? a.id : util.uid(),
        name: String(a.name || 'Attack').slice(0, 40),
        bonus: util.clamp(util.toInt(a.bonus, 0), -20, 30),
        damage: String(a.damage || '1d6').slice(0, 40),
        type: String(a.type || '').slice(0, 30)
      };
    });
  }

  function normalizeCurrency(raw) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var out = {};
    ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(function (key) {
      out[key] = util.clamp(util.toInt(src[key], 0), 0, 999999);
    });
    return out;
  }

  function normalizeHitDice(raw, level) {
    var src = raw && typeof raw === 'object' ? raw : {};
    var total = util.clamp(util.toInt(src.total, level), 1, 40);
    var die = util.toInt(src.die, 8);
    if ([6, 8, 10, 12].indexOf(die) < 0) die = 8;
    return {
      die: die,
      total: total,
      used: util.clamp(util.toInt(src.used, 0), 0, total)
    };
  }

  function normalizeCombatant(raw) {
    var c = raw && typeof raw === 'object' ? raw : {};
    var hpRaw = c.hp && typeof c.hp === 'object' ? c.hp : {};
    var maxHp = Math.max(1, util.toInt(hpRaw.max, 10));
    var current = util.clamp(util.toInt(hpRaw.current, maxHp), 0, maxHp);
    var pc = c.pc && typeof c.pc === 'object' ? c.pc : {};
    var mon = c.monster && typeof c.monster === 'object' ? c.monster : {};
    var saves = c.deathSaves && typeof c.deathSaves === 'object' ? c.deathSaves : {};
    var level = util.clamp(util.toInt(pc.level, 1), 1, 20);
    var classInfo = typeof DnD.classes !== 'undefined'
      ? (DnD.classes.find(pc.classId) || DnD.classes.find(pc.class))
      : null;
    var classId = classInfo
      ? classInfo.id
      : (typeof pc.classId === 'string' && pc.classId !== 'custom' ? pc.classId : '');
    var className = classInfo ? classInfo.name : String(pc.class || '').slice(0, 40);

    return {
      id: typeof c.id === 'string' && c.id ? c.id : util.uid(),
      name: String(c.name || 'Unnamed').slice(0, 60),
      kind: c.kind === 'pc' || c.kind === 'ally' || c.kind === 'monster' ? c.kind : 'monster',
      initiative: c.initiative === null || c.initiative === undefined || c.initiative === ''
        ? null
        : util.toInt(c.initiative, 0),
      initMod: util.toInt(c.initMod, 0),
      hp: {
        current: current,
        max: maxHp,
        temp: Math.max(0, util.toInt(hpRaw.temp, 0))
      },
      ac: Math.max(0, util.toInt(c.ac, 10)),
      hpKnown: typeof c.hpKnown === 'boolean' ? c.hpKnown : true,
      status: ['Fine', 'Hurt', 'Bloodied', 'Down'].indexOf(c.status) >= 0 ? c.status : '',
      portrait: typeof c.portrait === 'string' && /^data:image\//.test(c.portrait) && c.portrait.length < 400000
        ? c.portrait
        : '',
      conditions: Array.isArray(c.conditions)
        ? c.conditions.filter(function (v) { return typeof v === 'string'; }).slice(0, 30)
        : [],
      notes: String(c.notes || '').slice(0, 2000),
      pc: {
        class: className,
        classId: classId,
        subclass: String(pc.subclass || '').slice(0, 40),
        level: level,
        passive: util.clamp(util.toInt(pc.passive, 10), 0, 40),
        player: String(pc.player || '').slice(0, 40),
        concentration: String(pc.concentration || '').slice(0, 100),
        slots: normalizeSlots(pc.slots),
        resources: normalizeResources(pc.resources),
        abilities: normalizeAbilities(pc.abilities),
        saveProfs: normalizeSaveProfs(pc.saveProfs),
        skillProfs: normalizeSkillProfs(pc.skillProfs),
        speed: util.clamp(util.toInt(pc.speed, 30), 0, 200),
        hitDice: normalizeHitDice(pc.hitDice, level),
        inspiration: Boolean(pc.inspiration),
        attacks: normalizeAttacks(pc.attacks),
        spellAbility: ['int', 'wis', 'cha'].indexOf(pc.spellAbility) >= 0 ? pc.spellAbility : '',
        spellList: String(pc.spellList || '').slice(0, 3000),
        features: String(pc.features || '').slice(0, 3000),
        inventory: String(pc.inventory || '').slice(0, 3000),
        currency: normalizeCurrency(pc.currency)
      },
      monster: {
        cr: mon.cr === null || mon.cr === undefined ? null : Number(mon.cr),
        xp: util.toInt(mon.xp, 0),
        type: String(mon.type || '').slice(0, 60)
      },
      deathSaves: {
        success: util.clamp(util.toInt(saves.success, 0), 0, 3),
        fail: util.clamp(util.toInt(saves.fail, 0), 0, 3)
      }
    };
  }

  function normalize(raw) {
    var d = defaults();
    var src = raw && typeof raw === 'object' ? raw : {};
    var st = {};

    Object.keys(d).forEach(function (key) { st[key] = d[key]; });
    Object.keys(src).forEach(function (key) { st[key] = src[key]; });

    st.campaign = Object.assign({}, d.campaign, src.campaign && typeof src.campaign === 'object' ? src.campaign : {});
    st.combat = Object.assign({}, d.combat, src.combat && typeof src.combat === 'object' ? src.combat : {});
    st.dice = Object.assign({}, d.dice, src.dice && typeof src.dice === 'object' ? src.dice : {});
    st.settings = Object.assign({}, d.settings, src.settings && typeof src.settings === 'object' ? src.settings : {});
    st.encounter = Object.assign({}, d.encounter, src.encounter && typeof src.encounter === 'object' ? src.encounter : {});

    st.campaign.name = String(st.campaign.name || '').slice(0, 60);
    st.notes = typeof src.notes === 'string' ? src.notes : '';
    st.combatants = Array.isArray(src.combatants) ? src.combatants.map(normalizeCombatant) : [];

    st.combat.active = Boolean(st.combat.active);
    st.combat.round = Math.max(1, util.toInt(st.combat.round, 1));
    st.combat.turnId = typeof st.combat.turnId === 'string' ? st.combat.turnId : null;
    if (st.combat.turnId && !st.combatants.some(function (c) { return c.id === st.combat.turnId; })) {
      st.combat.turnId = null;
    }

    st.combat.log = Array.isArray(st.combat.log)
      ? st.combat.log
          .filter(function (e) { return e && typeof e.text === 'string'; })
          .slice(-MAX_LOG)
          .map(function (e) {
            return {
              id: typeof e.id === 'string' ? e.id : util.uid(),
              t: util.toInt(e.t, Date.now()),
              text: String(e.text).slice(0, 300),
              kind: typeof e.kind === 'string' ? e.kind : 'info'
            };
          })
      : [];

    st.dice.history = Array.isArray(st.dice.history) ? st.dice.history.slice(0, 30) : [];
    st.dice.mode = st.dice.mode === 'adv' || st.dice.mode === 'dis' ? st.dice.mode : 'normal';
    st.dice.modifier = util.toInt(st.dice.modifier, 0);
    st.dice.expr = typeof st.dice.expr === 'string' && st.dice.expr.trim() ? st.dice.expr : '1d20';

    st.settings.playerView = st.settings.playerView !== false;
    st.settings.activeCharacterId = typeof st.settings.activeCharacterId === 'string'
      ? st.settings.activeCharacterId
      : null;
    if (st.settings.activeCharacterId) {
      var active = st.combatants.find(function (c) {
        return c.id === st.settings.activeCharacterId && c.kind === 'pc';
      });
      if (!active) st.settings.activeCharacterId = null;
    }

    st.encounter.level = util.clamp(util.toInt(st.encounter.level, 5), 1, 20);
    st.encounter.size = util.clamp(util.toInt(st.encounter.size, 4), 1, 10);
    st.encounter.items = Array.isArray(st.encounter.items)
      ? st.encounter.items
          .filter(function (item) { return item && typeof item.name === 'string'; })
          .slice(0, 40)
          .map(function (item) {
            return {
              name: String(item.name).slice(0, 60),
              count: util.clamp(util.toInt(item.count, 1), 1, 99)
            };
          })
      : [];

    st.version = 4;
    return st;
  }

  var listeners = new Set();

  var store = {
    state: defaults(),
    lastSaved: null,

    load: function () {
      var raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (err) { raw = null; }
      var parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }
      }
      store.state = normalize(parsed);
      return store.state;
    },

    save: function () {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(store.state));
        store.lastSaved = Date.now();
      } catch (err) {
        /* Storage can be blocked or full; the app still works in memory. */
      }
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('dnd:saved'));
      }
    },

    commit: function () {
      store.save();
      listeners.forEach(function (fn) {
        try { fn(store.state); } catch (err) { console.error(err); }
      });
    },

    on: function (fn) {
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    },

    reset: function () {
      store.state = defaults();
      store.save();
      listeners.forEach(function (fn) { fn(store.state); });
    },

    replace: function (next) {
      store.state = normalize(next);
      store.save();
      listeners.forEach(function (fn) { fn(store.state); });
    },

    normalizeCharacter: function (raw) {
      return normalizeCombatant(raw);
    },

    log: function (text, kind) {
      var st = store.state;
      st.combat.log.push({
        id: util.uid(),
        t: Date.now(),
        text: String(text).slice(0, 300),
        kind: kind || 'info'
      });
      if (st.combat.log.length > MAX_LOG) {
        st.combat.log.splice(0, st.combat.log.length - MAX_LOG);
      }
    }
  };

  DnD.store = store;
  DnD.storageKey = KEY;
})();

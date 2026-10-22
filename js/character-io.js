/* DunD — import/export a single character as JSON */
(function () {
  'use strict';

  var U = DnD.util;
  var ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var SKILL_KEYS = [
    'acrobatics', 'animal', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleight', 'stealth', 'survival'
  ];

  var EXAMPLE = {
    format: 'dunD-character',
    version: 1,
    name: 'Lyra',
    class: 'Cleric',
    classId: 'cleric',
    subclass: 'Life Domain',
    level: 5,
    player: 'Jordan',
    ac: 17,
    initMod: 0,
    passive: 16,
    speed: 30,
    hp: { current: 40, max: 40, temp: 0 },
    abilities: { str: 12, dex: 10, con: 14, int: 10, wis: 17, cha: 13 },
    saveProfs: ['wis', 'cha'],
    skillProfs: {
      insight: 'proficient',
      medicine: 'proficient',
      perception: 'proficient',
      religion: 'proficient'
    },
    attacks: [
      { name: 'Mace', bonus: 4, damage: '1d6+1', type: 'bludgeoning' },
      { name: 'Guiding Bolt', bonus: 6, damage: '4d6', type: 'radiant' }
    ],
    spellAbility: 'wis',
    spellList: 'Cantrips: Guidance, Sacred Flame, Light\n1st: Bless, Healing Word, Shield of Faith\n2nd: Aid, Spiritual Weapon\n3rd: Spirit Guardians, Revivify',
    slots: [
      { level: 1, max: 4, used: 0 },
      { level: 2, max: 3, used: 0 },
      { level: 3, max: 2, used: 0 }
    ],
    resources: [
      { name: 'Channel Divinity', max: 1, used: 0, recharge: 'short' }
    ],
    hitDice: { die: 8, total: 5, used: 0 },
    inspiration: false,
    conditions: [],
    features: 'Channel Divinity, Disciple of Life, Preserve Life',
    inventory: "Mace, scale mail, shield, holy symbol, healer's kit",
    currency: { cp: 0, sp: 0, ep: 0, gp: 32, pp: 0 },
    notes: 'Keeps the party alive. Prepared spells can change after a long rest.',
    portrait: ''
  };

  function text(value, max) {
    return String(value == null ? '' : value).slice(0, max);
  }

  function number(value, fallback, min, max) {
    var n = U.toInt(value, fallback);
    if (typeof min === 'number') n = Math.max(min, n);
    if (typeof max === 'number') n = Math.min(max, n);
    return n;
  }

  function emptySlots() {
    var out = [];
    for (var level = 1; level <= 9; level += 1) {
      out.push({ level: level, max: 0, used: 0 });
    }
    return out;
  }

  function defaultAbilities() {
    var out = {};
    ABILITY_KEYS.forEach(function (key) { out[key] = 10; });
    return out;
  }

  function defaultSaveProfs() {
    var out = {};
    ABILITY_KEYS.forEach(function (key) { out[key] = false; });
    return out;
  }

  function defaultSkillProfs() {
    var out = {};
    SKILL_KEYS.forEach(function (key) { out[key] = 0; });
    return out;
  }

  function slotsFrom(raw) {
    if (raw === undefined || raw === null) return null;
    var out = [];

    if (Array.isArray(raw)) {
      var allNumbers = raw.length > 0 && raw.every(function (value) { return typeof value === 'number'; });
      if (allNumbers) {
        raw.slice(0, 9).forEach(function (max, index) {
          out.push({ level: index + 1, max: U.clamp(U.toInt(max, 0), 0, 9), used: 0 });
        });
        return out.length ? out : null;
      }

      raw.slice(0, 40).forEach(function (entry) {
        if (!entry || typeof entry !== 'object') return;
        var level = U.clamp(U.toInt(entry.level, 0), 1, 9);
        if (!level) return;
        var max = U.clamp(U.toInt(entry.max, 0), 0, 9);
        out.push({
          level: level,
          max: max,
          used: U.clamp(U.toInt(entry.used, 0), 0, max)
        });
      });
      return out.length ? out : null;
    }

    if (typeof raw === 'object') {
      Object.keys(raw).slice(0, 9).forEach(function (key) {
        var level = U.clamp(U.toInt(key, 0), 1, 9);
        if (!level) return;
        out.push({ level: level, max: U.clamp(U.toInt(raw[key], 0), 0, 9), used: 0 });
      });
      return out.length ? out : null;
    }

    return null;
  }

  function saveProfsFrom(raw) {
    if (Array.isArray(raw)) {
      var list = raw.map(function (value) { return String(value).toLowerCase(); });
      var out = {};
      ABILITY_KEYS.forEach(function (key) { out[key] = list.indexOf(key) >= 0; });
      return out;
    }

    if (raw && typeof raw === 'object') {
      var partial = {};
      ABILITY_KEYS.forEach(function (key) {
        if (typeof raw[key] === 'boolean') partial[key] = raw[key];
      });
      return Object.keys(partial).length ? partial : null;
    }

    return null;
  }

  function skillRank(value) {
    if (typeof value === 'number') return U.clamp(Math.trunc(value), 0, 2);
    if (value === true) return 1;
    var textValue = String(value || '').toLowerCase();
    if (textValue === 'expertise' || textValue === 'expert' || textValue === '2') return 2;
    if (textValue === 'proficient' || textValue === 'proficiency' || textValue === 'prof' || textValue === '1') return 1;
    return 0;
  }

  function skillProfsFrom(raw) {
    if (Array.isArray(raw)) {
      var list = raw.map(function (value) { return String(value).toLowerCase(); });
      var out = {};
      SKILL_KEYS.forEach(function (key) { out[key] = list.indexOf(key) >= 0 ? 1 : 0; });
      return out;
    }

    if (raw && typeof raw === 'object') {
      var partial = {};
      SKILL_KEYS.forEach(function (key) {
        if (raw[key] !== undefined) partial[key] = skillRank(raw[key]);
      });
      return Object.keys(partial).length ? partial : null;
    }

    return null;
  }

  function attacksFrom(raw) {
    if (!Array.isArray(raw)) return null;
    return raw.slice(0, 20).filter(function (entry) {
      return entry && typeof entry === 'object' && String(entry.name || '').trim();
    }).map(function (entry) {
      return {
        id: U.uid(),
        name: text(entry.name, 40),
        bonus: number(entry.bonus !== undefined ? entry.bonus : entry.attackBonus, 0, -20, 30),
        damage: text(entry.damage || '1d6', 40),
        type: text(entry.type, 30)
      };
    });
  }

  function resourcesFrom(raw) {
    return raw.slice(0, 20).filter(function (entry) {
      return entry && typeof entry === 'object' && String(entry.name || '').trim();
    }).map(function (entry) {
      var max = number(entry.max !== undefined ? entry.max : entry.uses, 1, 0, 99);
      var used = entry.used !== undefined
        ? number(entry.used, 0, 0, max)
        : (entry.current !== undefined ? U.clamp(max - U.toInt(entry.current, max), 0, max) : 0);
      return {
        id: U.uid(),
        name: text(entry.name, 40),
        max: max,
        used: used,
        recharge: entry.recharge === 'long' ? 'long' : 'short',
        source: ''
      };
    });
  }

  function hitDiceFrom(raw, level) {
    if (!raw || typeof raw !== 'object') return null;
    var die = U.toInt(raw.die, 8);
    if ([6, 8, 10, 12].indexOf(die) < 0) die = 8;
    var total = U.clamp(number(raw.total, level, 1, 40), 1, 40);
    return {
      die: die,
      total: total,
      used: U.clamp(U.toInt(raw.used, 0), 0, total)
    };
  }

  function currencyFrom(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var out = {};
    ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(function (key) {
      if (raw[key] !== undefined) out[key] = number(raw[key], 0, 0, 999999);
    });
    return Object.keys(out).length ? out : null;
  }

  function buildCharacter(source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw new Error('Each character must be a JSON object.');
    }

    var name = text(source.name, 60).trim();
    if (!name) throw new Error('Every character needs a name.');

    var info = DnD.classes.find(source.classId) || DnD.classes.find(source.class);
    var level = number(source.level, 1, 1, 20);

    var maxHp = 10;
    var currentHp = 10;
    var tempHp = 0;
    if (typeof source.hp === 'number') {
      maxHp = number(source.hp, 10, 1, 9999);
      currentHp = maxHp;
    } else if (source.hp && typeof source.hp === 'object') {
      maxHp = number(source.hp.max, number(source.maxHp, 10, 1, 9999), 1, 9999);
      currentHp = number(source.hp.current, number(source.currentHp, maxHp, 0, maxHp), 0, maxHp);
      tempHp = number(source.hp.temp, 0, 0, 9999);
    } else {
      maxHp = number(source.maxHp, 10, 1, 9999);
      currentHp = number(source.currentHp, maxHp, 0, maxHp);
    }

    var pc = {
      class: info ? info.name : text(source.class || source.className, 40),
      classId: info ? info.id : '',
      subclass: text(source.subclass, 40),
      level: level,
      passive: number(source.passive, 10, 0, 40),
      player: text(source.player, 40),
      concentration: text(source.concentration, 100),
      slots: emptySlots(),
      resources: [],
      abilities: defaultAbilities(),
      saveProfs: defaultSaveProfs(),
      skillProfs: defaultSkillProfs(),
      speed: number(source.speed, 30, 0, 200),
      hitDice: { die: 8, total: level, used: 0 },
      inspiration: Boolean(source.inspiration),
      attacks: [],
      spellAbility: '',
      spellList: text(source.spellList || source.spells, 3000),
      features: text(source.features, 3000),
      inventory: text(source.inventory, 3000),
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
    };

    if (source.abilities && typeof source.abilities === 'object') {
      ABILITY_KEYS.forEach(function (key) {
        if (source.abilities[key] !== undefined) {
          pc.abilities[key] = number(source.abilities[key], 10, 1, 30);
        }
      });
    }

    if (info) DnD.classes.apply(pc, level);

    var saves = saveProfsFrom(source.saveProfs);
    if (saves) pc.saveProfs = Object.assign({}, pc.saveProfs, saves);

    var skills = skillProfsFrom(source.skillProfs);
    if (skills) pc.skillProfs = Object.assign({}, pc.skillProfs, skills);

    var spellAbility = source.spellAbility !== undefined
      ? source.spellAbility
      : source.spellcastingAbility;
    if (spellAbility !== undefined) {
      var ability = String(spellAbility || '').toLowerCase();
      pc.spellAbility = ['int', 'wis', 'cha'].indexOf(ability) >= 0 ? ability : '';
    }

    var slots = slotsFrom(source.slots);
    if (slots) {
      slots.forEach(function (slot) {
        var target = pc.slots[slot.level - 1];
        if (!target) return;
        target.max = slot.max;
        target.used = U.clamp(slot.used, 0, slot.max);
      });
    }

    if (Array.isArray(source.resources)) {
      resourcesFrom(source.resources).forEach(function (resource) {
        var existing = pc.resources.find(function (entry) {
          return String(entry.name).toLowerCase() === resource.name.toLowerCase();
        });
        if (existing) {
          existing.max = resource.max;
          existing.used = resource.used;
          existing.recharge = resource.recharge;
        } else {
          pc.resources.push(resource);
        }
      });
    }

    var hitDice = hitDiceFrom(source.hitDice, level);
    if (hitDice) pc.hitDice = hitDice;

    if (Array.isArray(source.attacks)) pc.attacks = attacksFrom(source.attacks);

    if (source.passive === undefined) {
      var rank = pc.skillProfs.perception || 0;
      var proficiency = 2 + Math.floor((pc.level - 1) / 4);
      pc.passive = U.clamp(
        10 + Math.floor((pc.abilities.wis - 10) / 2) + rank * proficiency,
        0,
        40
      );
    }

    var currency = currencyFrom(source.currency);
    if (currency) pc.currency = Object.assign({}, pc.currency, currency);

    var conditions = Array.isArray(source.conditions)
      ? source.conditions.filter(function (value) { return typeof value === 'string'; }).slice(0, 30)
      : [];

    var raw = {
      id: U.uid(),
      name: name,
      kind: 'pc',
      initiative: source.initiative === undefined || source.initiative === null
        ? null
        : number(source.initiative, 0),
      initMod: number(source.initMod, 0, -20, 30),
      hp: { current: currentHp, max: maxHp, temp: tempHp },
      hpKnown: true,
      status: '',
      portrait: source.portrait === undefined ? '' : String(source.portrait),
      ac: number(source.ac, 10, 0, 40),
      conditions: conditions,
      notes: text(source.notes, 2000),
      pc: pc,
      monster: { cr: null, xp: 0, type: '' },
      deathSaves: { success: 0, fail: 0 }
    };

    return DnD.store.normalizeCharacter(raw);
  }

  function importText(rawText) {
    var parsed;
    try {
      parsed = JSON.parse(String(rawText));
    } catch (err) {
      throw new Error('That file is not valid JSON.');
    }

    var entries;
    if (Array.isArray(parsed)) {
      entries = parsed;
    } else if (parsed && Array.isArray(parsed.combatants)) {
      entries = parsed.combatants.filter(function (entry) {
        return entry && (entry.kind === 'pc' || entry.pc);
      });
    } else if (parsed && parsed.character) {
      entries = [parsed.character];
    } else {
      entries = [parsed];
    }

    if (!entries.length) throw new Error('No characters found in that file.');

    var names = [];
    var errors = [];
    var firstImported = null;
    var state = DnD.store.state;

    entries.forEach(function (entry, index) {
      try {
        var character = buildCharacter(entry);
        state.combatants.push(character);
        names.push(character.name);
        if (!firstImported) firstImported = character;
      } catch (err) {
        errors.push((entries.length > 1 ? 'Character ' + (index + 1) + ': ' : '') + err.message);
      }
    });

    if (!names.length) throw new Error(errors[0] || 'No characters could be imported.');

    if (!state.settings.activeCharacterId && firstImported) {
      state.settings.activeCharacterId = firstImported.id;
    }

    DnD.store.log(
      'Imported character' + (names.length === 1 ? ' ' + names[0] : 's ' + names.join(', ')) + '.',
      'info'
    );
    DnD.store.commit();

    return { imported: names, errors: errors };
  }

  function toModel(c) {
    var saves = ABILITY_KEYS.filter(function (key) { return c.pc.saveProfs[key]; });
    var skills = {};
    SKILL_KEYS.forEach(function (key) {
      var rank = c.pc.skillProfs[key] || 0;
      if (rank === 2) skills[key] = 'expertise';
      else if (rank === 1) skills[key] = 'proficient';
    });

    return {
      format: 'dunD-character',
      version: 1,
      name: c.name,
      class: c.pc.class,
      classId: c.pc.classId || undefined,
      subclass: c.pc.subclass,
      level: c.pc.level,
      player: c.pc.player,
      ac: c.ac,
      initMod: c.initMod,
      passive: c.pc.passive,
      speed: c.pc.speed,
      hp: { current: c.hp.current, max: c.hp.max, temp: c.hp.temp },
      abilities: Object.assign({}, c.pc.abilities),
      saveProfs: saves,
      skillProfs: skills,
      attacks: c.pc.attacks.map(function (attack) {
        return { name: attack.name, bonus: attack.bonus, damage: attack.damage, type: attack.type };
      }),
      spellAbility: c.pc.spellAbility,
      spellList: c.pc.spellList,
      slots: c.pc.slots
        .filter(function (slot) { return slot.max > 0; })
        .map(function (slot) { return { level: slot.level, max: slot.max, used: slot.used }; }),
      resources: c.pc.resources.map(function (resource) {
        return { name: resource.name, max: resource.max, used: resource.used, recharge: resource.recharge };
      }),
      hitDice: { die: c.pc.hitDice.die, total: c.pc.hitDice.total, used: c.pc.hitDice.used },
      inspiration: Boolean(c.pc.inspiration),
      conditions: c.conditions.slice(),
      features: c.pc.features,
      inventory: c.pc.inventory,
      currency: Object.assign({}, c.pc.currency),
      notes: c.notes,
      portrait: c.portrait || ''
    };
  }

  function downloadCharacter(c) {
    var slug = (c.name || 'character')
      .replace(/[^\w\- ]+/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase() || 'character';
    U.download(slug + '.json', JSON.stringify(toModel(c), null, 2), 'application/json');
    if (DnD.ui) DnD.ui.toast('Character JSON downloaded.');
  }

  function downloadExample() {
    U.download('dunD-character-example.json', JSON.stringify(EXAMPLE, null, 2), 'application/json');
    if (DnD.ui) DnD.ui.toast('Example character model downloaded.');
  }

  DnD.characterIO = {
    example: EXAMPLE,
    toModel: toModel,
    importText: importText,
    downloadCharacter: downloadCharacter,
    downloadExample: downloadExample
  };
})();

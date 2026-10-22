/* DunD — D&D 5e class data and class-driven defaults */
(function () {
  'use strict';

  var U = DnD.util;
  var ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  var SKILL_NAMES = {
    acrobatics: 'Acrobatics',
    animal: 'Animal Handling',
    arcana: 'Arcana',
    athletics: 'Athletics',
    deception: 'Deception',
    history: 'History',
    insight: 'Insight',
    intimidation: 'Intimidation',
    investigation: 'Investigation',
    medicine: 'Medicine',
    nature: 'Nature',
    perception: 'Perception',
    performance: 'Performance',
    persuasion: 'Persuasion',
    religion: 'Religion',
    sleight: 'Sleight of Hand',
    stealth: 'Stealth',
    survival: 'Survival'
  };

  /* Spell slot maxima by character level, for full casters. */
  var FULL_CASTER = [
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ];

  var HALF_CASTER = [
    [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
    [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
  ];

  var ARTIFICER_CASTER = [
    [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
    [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2],
    [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
  ];

  var RAGE_USES = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 99];

  function modifier(score) {
    return Math.floor((U.toInt(score, 10) - 10) / 2);
  }

  var CLASSES = [
    {
      id: 'barbarian',
      name: 'Barbarian',
      hitDie: 12,
      saves: ['str', 'con'],
      spellAbility: '',
      caster: '',
      skills: { count: 2, list: ['animal', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
      subclasses: ['Path of the Berserker', 'Path of the Totem Warrior', 'Path of the Zealot', 'Path of the Ancestral Guardian', 'Path of the Storm Herald'],
      resources: [{ name: 'Rage', from: 1, max: 'rage', recharge: 'long' }],
      features: [
        [1, 'Rage · Unarmored Defense'],
        [2, 'Reckless Attack · Danger Sense'],
        [3, 'Primal Path'],
        [4, 'Ability Score Improvement'],
        [5, 'Extra Attack · Fast Movement'],
        [6, 'Path feature'],
        [7, 'Feral Instinct'],
        [8, 'Ability Score Improvement'],
        [9, 'Brutal Critical (1 die)'],
        [10, 'Path feature'],
        [11, 'Relentless Rage'],
        [12, 'Ability Score Improvement'],
        [13, 'Brutal Critical (2 dice)'],
        [14, 'Path feature'],
        [15, 'Persistent Rage'],
        [16, 'Ability Score Improvement'],
        [17, 'Brutal Critical (3 dice)'],
        [18, 'Indomitable Might'],
        [19, 'Ability Score Improvement'],
        [20, 'Primal Champion']
      ]
    },
    {
      id: 'bard',
      name: 'Bard',
      hitDie: 8,
      saves: ['dex', 'cha'],
      spellAbility: 'cha',
      caster: 'full',
      skills: { count: 3, list: ['acrobatics', 'animal', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight', 'stealth', 'survival'] },
      subclasses: ['College of Lore', 'College of Valor', 'College of Swords', 'College of Glamour', 'College of Whispers', 'College of Creation', 'College of Eloquence'],
      resources: [{
        name: 'Bardic Inspiration',
        from: 1,
        max: 'bardic',
        recharge: function (level) { return level >= 5 ? 'short' : 'long'; }
      }],
      features: [
        [1, 'Spellcasting · Bardic Inspiration (d6)'],
        [2, 'Jack of All Trades · Song of Rest (d6)'],
        [3, 'Bard College · Expertise'],
        [4, 'Ability Score Improvement'],
        [5, 'Bardic Inspiration (d8) · Font of Inspiration'],
        [6, 'Countercharm · College feature'],
        [8, 'Ability Score Improvement'],
        [9, 'Song of Rest (d8)'],
        [10, 'Bardic Inspiration (d10) · Expertise · Magical Secrets'],
        [12, 'Ability Score Improvement'],
        [13, 'Song of Rest (d10)'],
        [14, 'Magical Secrets · College feature'],
        [15, 'Bardic Inspiration (d12)'],
        [16, 'Ability Score Improvement'],
        [17, 'Song of Rest (d12)'],
        [18, 'Magical Secrets'],
        [19, 'Ability Score Improvement'],
        [20, 'Superior Inspiration']
      ]
    },
    {
      id: 'cleric',
      name: 'Cleric',
      hitDie: 8,
      saves: ['wis', 'cha'],
      spellAbility: 'wis',
      caster: 'full',
      skills: { count: 2, list: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
      subclasses: ['Life Domain', 'Light Domain', 'War Domain', 'Tempest Domain', 'Trickery Domain', 'Knowledge Domain', 'Nature Domain', 'Death Domain', 'Forge Domain', 'Grave Domain', 'Order Domain', 'Peace Domain', 'Twilight Domain'],
      resources: [{ name: 'Channel Divinity', from: 2, max: 'channel', recharge: 'short' }],
      features: [
        [1, 'Spellcasting · Divine Domain'],
        [2, 'Channel Divinity · Domain feature'],
        [4, 'Ability Score Improvement'],
        [5, 'Destroy Undead (CR 1/2)'],
        [6, 'Channel Divinity (2/rest) · Domain feature'],
        [8, 'Ability Score Improvement · Destroy Undead (CR 1) · Domain feature'],
        [10, 'Divine Intervention'],
        [11, 'Destroy Undead (CR 2)'],
        [12, 'Ability Score Improvement'],
        [14, 'Destroy Undead (CR 3) · Domain feature'],
        [16, 'Ability Score Improvement'],
        [17, 'Destroy Undead (CR 4) · Domain feature'],
        [18, 'Channel Divinity (3/rest)'],
        [19, 'Ability Score Improvement'],
        [20, 'Divine Intervention improvement']
      ]
    },
    {
      id: 'druid',
      name: 'Druid',
      hitDie: 8,
      saves: ['int', 'wis'],
      spellAbility: 'wis',
      caster: 'full',
      skills: { count: 2, list: ['arcana', 'animal', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
      subclasses: ['Circle of the Land', 'Circle of the Moon', 'Circle of Dreams', 'Circle of the Shepherd', 'Circle of Spores', 'Circle of Stars', 'Circle of Wildfire'],
      resources: [{ name: 'Wild Shape', from: 2, max: 2, recharge: 'short' }],
      features: [
        [1, 'Druidic · Spellcasting'],
        [2, 'Wild Shape · Druid Circle'],
        [4, 'Ability Score Improvement · Wild Shape improvement'],
        [6, 'Circle feature'],
        [8, 'Ability Score Improvement · Wild Shape improvement'],
        [10, 'Circle feature'],
        [12, 'Ability Score Improvement'],
        [14, 'Circle feature'],
        [16, 'Ability Score Improvement'],
        [18, 'Timeless Body · Beast Spells'],
        [19, 'Ability Score Improvement'],
        [20, 'Archdruid']
      ]
    },
    {
      id: 'fighter',
      name: 'Fighter',
      hitDie: 10,
      saves: ['str', 'con'],
      spellAbility: '',
      caster: '',
      skills: { count: 2, list: ['acrobatics', 'animal', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
      subclasses: ['Champion', 'Battle Master', 'Eldritch Knight', 'Cavalier', 'Samurai', 'Arcane Archer', 'Echo Knight', 'Psi Warrior', 'Rune Knight'],
      resources: [
        { name: 'Second Wind', from: 1, max: 1, recharge: 'short' },
        { name: 'Action Surge', from: 2, max: 'actionSurge', recharge: 'short' }
      ],
      features: [
        [1, 'Fighting Style · Second Wind'],
        [2, 'Action Surge'],
        [3, 'Martial Archetype'],
        [4, 'Ability Score Improvement'],
        [5, 'Extra Attack'],
        [6, 'Ability Score Improvement'],
        [7, 'Archetype feature'],
        [8, 'Ability Score Improvement'],
        [9, 'Indomitable (1 use)'],
        [10, 'Archetype feature'],
        [11, 'Extra Attack (2)'],
        [12, 'Ability Score Improvement'],
        [13, 'Indomitable (2 uses)'],
        [14, 'Ability Score Improvement'],
        [15, 'Archetype feature'],
        [16, 'Ability Score Improvement'],
        [17, 'Action Surge (2 uses) · Indomitable (3 uses)'],
        [18, 'Archetype feature'],
        [19, 'Ability Score Improvement'],
        [20, 'Extra Attack (3)']
      ]
    },
    {
      id: 'monk',
      name: 'Monk',
      hitDie: 8,
      saves: ['str', 'dex'],
      spellAbility: '',
      caster: '',
      skills: { count: 2, list: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
      subclasses: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements', 'Way of Mercy', 'Way of the Drunken Master', 'Way of the Kensei', 'Way of the Astral Self'],
      resources: [{ name: 'Ki', from: 2, max: 'level', recharge: 'short' }],
      features: [
        [1, 'Unarmored Defense · Martial Arts'],
        [2, 'Ki · Unarmored Movement'],
        [3, 'Monastic Tradition · Deflect Missiles'],
        [4, 'Ability Score Improvement · Slow Fall'],
        [5, 'Extra Attack · Stunning Strike'],
        [6, 'Ki-Empowered Strikes · Tradition feature'],
        [7, 'Evasion · Stillness of Mind'],
        [8, 'Ability Score Improvement'],
        [9, 'Unarmored Movement improvement'],
        [10, 'Purity of Body'],
        [11, 'Tradition feature'],
        [12, 'Ability Score Improvement'],
        [13, 'Tongue of the Sun and Moon'],
        [14, 'Diamond Soul'],
        [15, 'Timeless Body'],
        [16, 'Ability Score Improvement'],
        [17, 'Tradition feature'],
        [18, 'Empty Body'],
        [19, 'Ability Score Improvement'],
        [20, 'Perfect Self']
      ]
    },
    {
      id: 'paladin',
      name: 'Paladin',
      hitDie: 10,
      saves: ['wis', 'cha'],
      spellAbility: 'cha',
      caster: 'half',
      skills: { count: 2, list: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
      subclasses: ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance', 'Oath of Conquest', 'Oath of Redemption', 'Oath of Glory', 'Oath of the Watchers'],
      resources: [{ name: 'Lay on Hands', from: 1, max: 'levelTimes5', recharge: 'long' }],
      features: [
        [1, 'Divine Sense · Lay on Hands'],
        [2, 'Fighting Style · Spellcasting · Divine Smite'],
        [3, 'Divine Health · Sacred Oath'],
        [4, 'Ability Score Improvement'],
        [5, 'Extra Attack'],
        [6, 'Aura of Protection'],
        [7, 'Oath feature'],
        [8, 'Ability Score Improvement'],
        [10, 'Aura of Courage'],
        [11, 'Improved Divine Smite'],
        [12, 'Ability Score Improvement'],
        [14, 'Cleansing Touch'],
        [15, 'Oath feature'],
        [16, 'Ability Score Improvement'],
        [18, 'Aura improvements'],
        [19, 'Ability Score Improvement'],
        [20, 'Oath feature']
      ]
    },
    {
      id: 'ranger',
      name: 'Ranger',
      hitDie: 10,
      saves: ['str', 'dex'],
      spellAbility: 'wis',
      caster: 'half',
      skills: { count: 3, list: ['animal', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
      subclasses: ['Hunter', 'Beast Master', 'Gloom Stalker', 'Horizon Walker', 'Monster Slayer', 'Fey Wanderer', 'Swarmkeeper', 'Drakewarden'],
      resources: [],
      features: [
        [1, 'Favored Enemy · Natural Explorer'],
        [2, 'Fighting Style · Spellcasting'],
        [3, 'Primeval Awareness · Ranger Archetype'],
        [4, 'Ability Score Improvement'],
        [5, 'Extra Attack'],
        [6, 'Favored Enemy improvement · Natural Explorer improvement'],
        [7, 'Archetype feature'],
        [8, "Ability Score Improvement · Land's Stride"],
        [10, 'Natural Explorer improvement · Hide in Plain Sight'],
        [11, 'Archetype feature'],
        [12, 'Ability Score Improvement'],
        [14, 'Favored Enemy improvement · Vanish'],
        [15, 'Archetype feature'],
        [16, 'Ability Score Improvement'],
        [18, 'Feral Senses'],
        [19, 'Ability Score Improvement'],
        [20, 'Foe Slayer']
      ]
    },
    {
      id: 'rogue',
      name: 'Rogue',
      hitDie: 8,
      saves: ['dex', 'int'],
      spellAbility: '',
      caster: '',
      skills: { count: 4, list: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight', 'stealth'] },
      subclasses: ['Thief', 'Assassin', 'Arcane Trickster', 'Swashbuckler', 'Mastermind', 'Inquisitive', 'Scout', 'Soulknife', 'Phantom'],
      resources: [],
      features: [
        [1, "Expertise · Sneak Attack (1d6) · Thieves' Cant"],
        [2, 'Cunning Action'],
        [3, 'Roguish Archetype · Sneak Attack (2d6)'],
        [4, 'Ability Score Improvement'],
        [5, 'Uncanny Dodge · Sneak Attack (3d6)'],
        [6, 'Expertise'],
        [7, 'Evasion · Sneak Attack (4d6)'],
        [8, 'Ability Score Improvement'],
        [9, 'Sneak Attack (5d6)'],
        [10, 'Ability Score Improvement'],
        [11, 'Reliable Talent · Sneak Attack (6d6)'],
        [12, 'Ability Score Improvement'],
        [13, 'Sneak Attack (7d6)'],
        [14, 'Blindsense'],
        [15, 'Slippery Mind · Sneak Attack (8d6)'],
        [16, 'Ability Score Improvement'],
        [17, 'Sneak Attack (9d6)'],
        [18, 'Elusive'],
        [19, 'Ability Score Improvement · Sneak Attack (10d6)'],
        [20, 'Stroke of Luck']
      ]
    },
    {
      id: 'sorcerer',
      name: 'Sorcerer',
      hitDie: 6,
      saves: ['con', 'cha'],
      spellAbility: 'cha',
      caster: 'full',
      skills: { count: 2, list: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
      subclasses: ['Draconic Bloodline', 'Wild Magic', 'Divine Soul', 'Shadow Magic', 'Storm Sorcery', 'Aberrant Mind', 'Clockwork Soul'],
      resources: [{ name: 'Sorcery Points', from: 2, max: 'level', recharge: 'long' }],
      features: [
        [1, 'Spellcasting · Sorcerous Origin'],
        [2, 'Font of Magic · Sorcery Points'],
        [3, 'Metamagic'],
        [4, 'Ability Score Improvement'],
        [6, 'Origin feature'],
        [8, 'Ability Score Improvement'],
        [10, 'Metamagic'],
        [12, 'Ability Score Improvement'],
        [14, 'Origin feature'],
        [16, 'Ability Score Improvement'],
        [17, 'Metamagic'],
        [18, 'Origin feature'],
        [19, 'Ability Score Improvement'],
        [20, 'Sorcerous Restoration']
      ]
    },
    {
      id: 'warlock',
      name: 'Warlock',
      hitDie: 8,
      saves: ['wis', 'cha'],
      spellAbility: 'cha',
      caster: 'pact',
      skills: { count: 2, list: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
      subclasses: ['The Archfey', 'The Fiend', 'The Great Old One', 'The Hexblade', 'The Celestial', 'The Fathomless', 'The Genie', 'The Undead'],
      resources: [],
      features: [
        [1, 'Otherworldly Patron · Pact Magic'],
        [2, 'Eldritch Invocations'],
        [3, 'Pact Boon'],
        [4, 'Ability Score Improvement'],
        [6, 'Patron feature'],
        [8, 'Ability Score Improvement'],
        [10, 'Patron feature'],
        [11, 'Mystic Arcanum (6th)'],
        [12, 'Ability Score Improvement'],
        [13, 'Mystic Arcanum (7th)'],
        [14, 'Patron feature'],
        [15, 'Mystic Arcanum (8th)'],
        [16, 'Ability Score Improvement'],
        [17, 'Mystic Arcanum (9th)'],
        [19, 'Ability Score Improvement'],
        [20, 'Eldritch Master']
      ]
    },
    {
      id: 'wizard',
      name: 'Wizard',
      hitDie: 6,
      saves: ['int', 'wis'],
      spellAbility: 'int',
      caster: 'full',
      skills: { count: 2, list: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
      subclasses: ['School of Evocation', 'School of Abjuration', 'School of Divination', 'School of Enchantment', 'School of Illusion', 'School of Necromancy', 'School of Conjuration', 'School of Transmutation', 'Bladesinging', 'War Magic', 'Chronurgy Magic', 'Graviturgy Magic'],
      resources: [{ name: 'Arcane Recovery', from: 1, max: 1, recharge: 'long' }],
      features: [
        [1, 'Arcane Recovery · Spellcasting'],
        [2, 'Arcane Tradition'],
        [4, 'Ability Score Improvement'],
        [6, 'Tradition feature'],
        [8, 'Ability Score Improvement'],
        [10, 'Tradition feature'],
        [12, 'Ability Score Improvement'],
        [14, 'Tradition feature'],
        [16, 'Ability Score Improvement'],
        [18, 'Spell Mastery'],
        [19, 'Ability Score Improvement'],
        [20, 'Signature Spells']
      ]
    },
    {
      id: 'artificer',
      name: 'Artificer',
      hitDie: 8,
      saves: ['con', 'int'],
      spellAbility: 'int',
      caster: 'artificer',
      skills: { count: 2, list: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight'] },
      subclasses: ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith'],
      resources: [],
      features: [
        [1, 'Magical Tinkering · Spellcasting'],
        [2, 'Infuse Item'],
        [3, 'Artificer Specialist · The Right Tool for the Job'],
        [4, 'Ability Score Improvement'],
        [6, 'Tool Expertise'],
        [7, 'Flash of Genius'],
        [8, 'Ability Score Improvement'],
        [10, 'Magic Item Adept'],
        [11, 'Spell-Storing Item'],
        [12, 'Ability Score Improvement'],
        [14, 'Magic Item Savant'],
        [16, 'Ability Score Improvement'],
        [18, 'Magic Item Master'],
        [19, 'Ability Score Improvement'],
        [20, 'Soul of Artifice']
      ]
    }
  ];

  function find(idOrName) {
    if (!idOrName) return null;
    var key = String(idOrName).toLowerCase();
    return CLASSES.find(function (c) {
      return c.id === key || c.name.toLowerCase() === key;
    }) || null;
  }

  function featuresFor(classId, level) {
    var info = find(classId);
    if (!info) return [];
    var max = U.clamp(U.toInt(level, 1), 1, 20);
    return info.features
      .filter(function (entry) { return entry[0] <= max; })
      .map(function (entry) { return { level: entry[0], name: entry[1] }; });
  }

  function slotMaxima(info, level) {
    var maxima = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (!info) return maxima;

    if (info.caster === 'pact') {
      var count = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
      var slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
      maxima[slotLevel - 1] = count;
      return maxima;
    }

    var table = info.caster === 'full'
      ? FULL_CASTER
      : info.caster === 'half'
        ? HALF_CASTER
        : info.caster === 'artificer'
          ? ARTIFICER_CASTER
          : null;

    if (!table) return maxima;
    var row = table[level - 1] || [];
    row.forEach(function (amount, index) { maxima[index] = amount; });
    return maxima;
  }

  function maxFor(def, level, abilities) {
    var value = def.max;
    if (typeof value === 'number') return U.clamp(value, 0, 99);
    if (value === 'level') return U.clamp(level, 1, 99);
    if (value === 'levelTimes5') return U.clamp(level * 5, 1, 99);
    if (value === 'bardic') return U.clamp(Math.max(1, modifier(abilities.cha)), 1, 99);
    if (value === 'rage') return RAGE_USES[level - 1] || 2;
    if (value === 'channel') return level >= 18 ? 3 : level >= 6 ? 2 : 1;
    if (value === 'actionSurge') return level >= 17 ? 2 : 1;
    return 0;
  }

  function resourcesFor(info, level, abilities) {
    var out = [];
    if (!info) return out;

    info.resources.forEach(function (def) {
      if (level < (def.from || 1)) return;
      var max = maxFor(def, level, abilities);
      if (max <= 0) return;
      out.push({
        id: U.uid(),
        name: def.name,
        max: max,
        used: 0,
        recharge: typeof def.recharge === 'function' ? def.recharge(level) : (def.recharge || 'long'),
        source: 'class'
      });
    });

    return out;
  }

  /** Apply class-derived hit die, saves, spellcasting, slots and resources. */
  function apply(pc, level) {
    var info = find(pc.classId);
    if (!info) return false;

    level = U.clamp(U.toInt(level, pc.level), 1, 20);
    pc.level = level;
    pc.classId = info.id;
    pc.class = info.name;

    if (pc.subclass && info.subclasses.indexOf(pc.subclass) < 0) {
      var belongsElsewhere = CLASSES.some(function (other) {
        return other.id !== info.id && other.subclasses.indexOf(pc.subclass) >= 0;
      });
      if (belongsElsewhere) pc.subclass = '';
    }

    if (!pc.hitDice) pc.hitDice = { die: info.hitDie, total: level, used: 0 };
    pc.hitDice.die = info.hitDie;
    pc.hitDice.total = U.clamp(level, 1, 40);
    pc.hitDice.used = U.clamp(U.toInt(pc.hitDice.used, 0), 0, pc.hitDice.total);

    ABILITY_KEYS.forEach(function (key) {
      pc.saveProfs[key] = info.saves.indexOf(key) >= 0;
    });

    pc.spellAbility = info.spellAbility || '';

    var previousUsed = {};
    (pc.slots || []).forEach(function (slot) {
      if (slot && slot.level) previousUsed[slot.level] = U.toInt(slot.used, 0);
    });
    var maxima = slotMaxima(info, level);
    pc.slots = maxima.map(function (max, index) {
      var slotLevel = index + 1;
      return {
        level: slotLevel,
        max: max,
        used: U.clamp(U.toInt(previousUsed[slotLevel], 0), 0, max)
      };
    });

    var previousResources = {};
    (pc.resources || []).forEach(function (resource) {
      if (resource && resource.source === 'class') previousResources[resource.name] = resource.used;
    });
    pc.resources = (pc.resources || []).filter(function (resource) {
      return resource.source !== 'class';
    });
    resourcesFor(info, level, pc.abilities).forEach(function (resource) {
      resource.used = U.clamp(U.toInt(previousResources[resource.name], 0), 0, resource.max);
      pc.resources.push(resource);
    });

    return true;
  }

  function optionsHtml(classId, className) {
    var info = find(classId);
    var isCustom = !info && !!className;
    var html = '<option value="">— choose a class —</option>';

    CLASSES.forEach(function (entry) {
      html += '<option value="' + entry.id + '"' +
        (info && info.id === entry.id ? ' selected' : '') + '>' + entry.name + '</option>';
    });

    html += '<option value="custom"' + (isCustom ? ' selected' : '') + '>Custom / homebrew</option>';
    return html;
  }

  function subclassOptionsHtml(classId) {
    var info = find(classId);
    if (!info) return '';
    return info.subclasses.map(function (name) {
      return '<option value="' + U.esc(name) + '"></option>';
    }).join('');
  }

  function skillName(key) {
    return SKILL_NAMES[key] || key;
  }

  DnD.classes = {
    all: CLASSES,
    find: find,
    apply: apply,
    featuresFor: featuresFor,
    slotMaxima: function (classId, level) {
      return slotMaxima(find(classId), U.clamp(U.toInt(level, 1), 1, 20));
    },
    resourcesFor: function (classId, level, abilities) {
      return resourcesFor(find(classId), U.clamp(U.toInt(level, 1), 1, 20), abilities || {});
    },
    optionsHtml: optionsHtml,
    subclassOptionsHtml: subclassOptionsHtml,
    skillName: skillName
  };
})();

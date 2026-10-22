/* DunD — quick rules reference */
(function () {
  'use strict';

  var U = DnD.util;

  var CONDITIONS = [
    ['Blinded', 'Can’t see. Fails checks that rely on sight. Attacks against it have advantage; its attacks have disadvantage.'],
    ['Charmed', 'Can’t attack the charmer. The charmer has advantage on social checks against it.'],
    ['Concentrating', 'Bookmark for a maintained spell. Taking damage forces a Constitution save (DC 10 or half the damage, whichever is higher).'],
    ['Deafened', 'Can’t hear. Fails checks that rely on hearing.'],
    ['Exhaustion', 'Each level stacks penalties (checks, speed, and worse); six levels is fatal. Note the level beside the chip.'],
    ['Frightened', 'Disadvantage on checks and attacks while the source of fear is in sight, and it can’t willingly move closer to that source.'],
    ['Grappled', 'Speed is 0. Ends if the grappler is incapacitated or the two are separated.'],
    ['Incapacitated', 'Can’t take actions or reactions.'],
    ['Invisible', 'Attacks against it have disadvantage; its attacks have advantage. It can hide anywhere.'],
    ['Paralyzed', 'Incapacitated and can’t move or speak. Fails Strength and Dexterity saves. Attacks have advantage, and hits within 5 feet are critical.'],
    ['Petrified', 'Turned to stone and unaware. Resistance to all damage; immune to poison and disease.'],
    ['Poisoned', 'Disadvantage on attack rolls and ability checks.'],
    ['Prone', 'Can only crawl. Its attacks have disadvantage. Melee attacks against it have advantage, ranged attacks have disadvantage. Standing costs half its movement.'],
    ['Restrained', 'Speed 0. Attacks against it have advantage; its attacks have disadvantage. Disadvantage on Dexterity saves.'],
    ['Stable', 'Unconscious but no longer making death saves. Handy bookmark, not a formal condition.'],
    ['Stunned', 'Incapacitated, can’t move, and speaks only haltingly. Fails Strength and Dexterity saves. Attacks against it have advantage.'],
    ['Unconscious', 'Incapacitated, prone, and unaware. Attacks have advantage; hits within 5 feet are critical.'],
    ['Dead', 'Out of the fight.']
  ];

  var ACTIONS = [
    ['Attack', 'Make a weapon or unarmed attack. Grapple and shove are special attacks.'],
    ['Cast a Spell', 'Cast a spell with a casting time of one action.'],
    ['Dash', 'Gain extra movement equal to your speed for the turn.'],
    ['Disengage', 'Your movement doesn’t provoke opportunity attacks for the rest of the turn.'],
    ['Dodge', 'Attacks against you have disadvantage if you can see the attacker, and you have advantage on Dexterity saves.'],
    ['Help', 'Give an ally advantage on their next check or attack, or assist with a task.'],
    ['Hide', 'Make a Stealth check to become unseen and unheard.'],
    ['Ready', 'Prepare an action with a trigger, then use your reaction to perform it.'],
    ['Search', 'Make a Perception or Investigation check to find something.'],
    ['Use an Object', 'Interact with an object or use a magic item that needs an action.'],
    ['Shove', 'Push a creature 5 feet or knock it prone (Strength/Athletics contest).']
  ];

  var RULES = [
    ['Advantage / disadvantage', 'Roll twice and take the higher (advantage) or lower (disadvantage). They don’t stack, and having both cancels out.'],
    ['Cover', 'Half cover: +2 AC and Dexterity saves. Three-quarters cover: +5. Total cover: can’t be targeted directly.'],
    ['Death saves', 'At 0 HP, roll d20 at the start of each turn: 10+ is a success, 9 or less a failure. Three successes stabilize; three failures kill. Damage at 0 HP is a failure (a critical hit counts as two).'],
    ['Concentration', 'Taking damage calls for a Constitution save, DC 10 or half the damage taken, whichever is higher.'],
    ['Passive score', '10 + every modifier that would apply to the check. Passive Perception is the usual example.'],
    ['Surprise', 'A surprised creature can’t move or take actions on its first turn, and can’t take reactions until that turn ends.']
  ];

  var DCS = [
    ['Very easy', 5],
    ['Easy', 10],
    ['Medium', 15],
    ['Hard', 20],
    ['Very hard', 25],
    ['Nearly impossible', 30]
  ];

  function card(title, body, extraClass) {
    return '<section class="card ref-card ' + (extraClass || '') + '">' +
      '<h2>' + U.esc(title) + '</h2>' + body + '</section>';
  }

  function init() {
    var target = document.getElementById('reference-content');
    if (!target) return;

    var conditionsBody = '<dl class="ref-list conditions">' +
      CONDITIONS.map(function (row) {
        return '<div class="ref-item"><dt>' + U.esc(row[0]) + '</dt><dd>' + U.esc(row[1]) + '</dd></div>';
      }).join('') + '</dl>';

    var actionsBody = '<ul class="ref-list bullets">' +
      ACTIONS.map(function (row) {
        return '<li><strong>' + U.esc(row[0]) + '.</strong> ' + U.esc(row[1]) + '</li>';
      }).join('') + '</ul>';

    var dcsBody = '<table class="dc-table"><thead><tr><th>Task</th><th>DC</th></tr></thead><tbody>' +
      DCS.map(function (row) {
        return '<tr><td>' + U.esc(row[0]) + '</td><td>' + row[1] + '</td></tr>';
      }).join('') + '</tbody></table>';

    var rulesBody = '<ul class="ref-list bullets">' +
      RULES.map(function (row) {
        return '<li><strong>' + U.esc(row[0]) + '.</strong> ' + U.esc(row[1]) + '</li>';
      }).join('') + '</ul>' + dcsBody;

    target.innerHTML =
      card('Conditions', conditionsBody, 'wide') +
      card('Actions in combat', actionsBody) +
      card('Checks, saves &amp; other reminders', rulesBody);
  }

  DnD.reference = {
    init: init
  };
})();

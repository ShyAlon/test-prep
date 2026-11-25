import test from 'node:test';
import assert from 'node:assert/strict';
import { numericalTemplates, generateNumerical, generatePractice } from '../src/question-generator.js';
import { createAttempt, generatedOnlyGame } from '../src/model.js';

function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test('notebooks costing 6 each, quantity 2, payment 19 have change 7 after answer shuffling and saving', () => {
  const template = numericalTemplates.find(item => item.id === 'change');
  for (let seed = 0; seed < 100; seed++) {
    const samples = [0.7, 0, 0.7];
    const random = rng(seed);
    const question = JSON.parse(JSON.stringify(generateNumerical(template,
      () => samples.length ? samples.shift() : random(), 'reported-change')));
    assert.deepEqual(question.prompt.match(/\d+/g).map(Number), [6, 2, 19]);
    assert.equal(question.choices[question.correct], '7');
    assert.notEqual(question.choices[question.correct], '5');
    assert.match(question.explanation, /19 − 12 = 7/);
  }
});

test('change answer agrees with the quantities in the displayed wording across the entire supported range', () => {
  const template = numericalTemplates.find(item => item.id === 'change');
  for (let price = 3; price <= 7; price++) {
    for (let count = 2; count <= 4; count++) {
      for (let change = 1; change <= 9; change++) {
        const question = generateNumerical({ ...template, sample: () => ({price, count, change}) }, rng(price * count * change), 'change');
        const [unitCost, quantity, paid] = question.prompt.match(/\d+/g).map(Number);
        assert.equal(Number(question.choices[question.correct]), paid - unitCost * quantity);
      }
    }
  }
});

test('every numerical template has one calculated answer across its parameter range', () => {
  for (const template of numericalTemplates) {
    for (let seed = 0; seed < 1000; seed++) {
      const q = generateNumerical(template, rng(seed), 'test');
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert.equal(Number(q.choices[q.correct]), template.solve(q.parameters));
      assert.ok(q.choices.every(choice => Number.isInteger(Number(choice)) && Number(choice) >= 0));
      assert.ok(q.explanation);
    }
  }
});

test('practice is deterministic, varied, and includes complete reading references', () => {
  for (const count of [10, 20, 30, 50, 100]) {
    const questions = generatePractice(rng(42), count);
    assert.equal(questions.length, count);
    assert.equal(new Set(questions.map(q => q.id)).size, count);
    assert.equal(new Set(questions.map(q => q.prompt)).size, count);
    assert.deepEqual(questions, generatePractice(rng(42), count));
    for (const q of questions) {
      assert.ok(q.prompt && q.explanation && q.skill);
      assert.equal(new Set(q.choices).size, 4);
      assert.ok(q.correct >= 0 && q.correct < 4);
      if (q.passage) assert.ok(q.passageText.includes('\n\n'));
    }
  }
  assert.notDeepEqual(generatePractice(rng(42), 20), generatePractice(rng(43), 20));
});

test('generated questions survive serialization and invalid lengths are rejected', () => {
  const attempt = createAttempt(20, 123456);
  assert.deepEqual(JSON.parse(JSON.stringify(attempt)), attempt);
  for (const round of attempt.rounds) assert.ok(round.question && round.creature);
  assert.throws(() => createAttempt(0, 123456), /Practice length/);
  assert.throws(() => createAttempt(101, 123456), /Practice length/);
});

test('existing generated progress survives while removed content cannot resume or appear in history', () => {
  const generated = createAttempt(20, 123456);
  const old = { id: 12, testId: '1', rounds: [{id: '1-1-1'}] };
  const game = { active: old, history: [old, generated], collection: {25: 2}, sound: false };
  const migrated = generatedOnlyGame(game);
  assert.equal(migrated.active, null);
  assert.deepEqual(migrated.history, [generated]);
  assert.equal(Object.values(migrated.collection).reduce((sum, count) => sum + count, 0), 2);
  assert.equal(migrated.sound, false);
  assert.deepEqual(generatedOnlyGame({...game, active: generated}).active, generated);
  assert.equal(game.active, old);
});

test('known quantities produce expected answers and explanations', () => {
  const examples = { remaining: [0, 8], saving: [0, 2], comparison: [0, 9], change: [0, 1],
    'arithmetic-+': [0, 22], 'arithmetic-−': [0, 18], 'arithmetic-×': [0, 4],
    equation: [0, 7], 'sequence-1': [0, 9], 'sequence--1': [0, 52], alternating: [0, 9], half: [0, 4] };
  for (const template of numericalTemplates) {
    const [random, expected] = examples[template.id];
    const q = generateNumerical(template, () => random, 'fixture');
    assert.equal(Number(q.choices[q.correct]), expected, template.id);
    assert.ok(q.explanation.includes(String(expected)));
  }
});

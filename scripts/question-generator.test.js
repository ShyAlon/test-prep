import test from 'node:test';
import assert from 'node:assert/strict';
import { numericalTemplates, generateNumerical, generatePractice } from '../src/question-generator.js';
import { createAttempt } from '../src/model.js';
import bank from '../src/question-bank.json' with { type: 'json' };

function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

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

test('generated questions survive serialization and booklet attempts remain compatible', () => {
  const attempt = createAttempt(bank, 'practice', 20, 123456);
  assert.deepEqual(JSON.parse(JSON.stringify(attempt)), attempt);
  for (const round of attempt.rounds) assert.ok(round.question && round.pokemon);
  const booklet = createAttempt(bank, '1', undefined, 123456);
  assert.equal(booklet.rounds.length, bank.tests[0].questions.length);
  assert.ok(booklet.rounds.every(round => !round.question));
});

test('booklet text is complete without image fields', () => {
  for (const t of bank.tests) for (const q of t.questions) {
    assert.ok(q.prompt.trim());
    assert.equal(q.choices.length, 4);
    assert.ok(q.choices.every(choice => choice.trim()));
    assert.ok(!q.promptArt && !q.choiceArt && !q.explanationArt);
    if (q.passage) assert.ok(bank.passages[q.passage]);
  }
  assert.ok(!bank.referenceArt);
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

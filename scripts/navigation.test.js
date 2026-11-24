import test from 'node:test';
import assert from 'node:assert/strict';
import { moveQuestion } from '../src/model.js';

const answered = { choice: 2, correct: true, ms: 4300, catchCount: 1 };
const fixture = () => ({ id: 123, rounds: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  index: 1, answers: [answered], choice: 3, questionMs: 7200, totalMs: 15000 });

test('going back and forward preserves the unanswered draft and its elapsed time', () => {
  const original = fixture();
  const previous = moveQuestion(original, 0);
  assert.equal(previous.index, 0);
  assert.equal(previous.choice, 2);
  assert.equal(previous.questionMs, 4300);
  assert.deepEqual(previous.pendingQuestion, { index: 1, choice: 3, ms: 7200 });
  const resumed = moveQuestion(JSON.parse(JSON.stringify(previous)), 1);
  assert.equal(resumed.choice, 3);
  assert.equal(resumed.questionMs, 7200);
  assert.deepEqual(resumed.answers, [answered]);
  assert.equal(resumed.totalMs, original.totalMs);
  assert.equal(original.index, 1);
});

test('navigation cannot skip unanswered questions or leave the test', () => {
  const attempt = fixture();
  for (const index of [-1, 2, 3, NaN, 0.5]) assert.equal(moveQuestion(attempt, index), attempt);
  assert.equal(moveQuestion({ ...attempt, index: 0 }, -1).index, 0);
});

test('multiple answered rounds can be reviewed without changing answers or rewards', () => {
  const attempt = { ...fixture(), index: 2, answers: [answered, { choice: 1, correct: false, ms: 6000 }],
    choice: null, questionMs: 9000 };
  let current = moveQuestion(attempt, 1);
  current = moveQuestion(current, 0);
  current = moveQuestion(current, 1);
  current = moveQuestion(current, 2);
  assert.equal(current.index, 2);
  assert.equal(current.choice, null);
  assert.equal(current.questionMs, 9000);
  assert.equal(current.answers, attempt.answers);
  assert.equal(current.answers[0].catchCount, 1);
});

test('advancing after submission resets time and choice for the next unanswered round', () => {
  const attempt = { ...fixture(), index: 0, choice: 2, questionMs: 4300 };
  const next = moveQuestion(attempt, 1);
  assert.equal(next.choice, null);
  assert.equal(next.questionMs, 0);
  assert.equal(next.pendingQuestion, null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePractice } from '../src/question-generator.js';

const marks = /[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/;
function check(text, label) {
  if (!text || !/[א-ת]/.test(text)) return;
  assert.match(text, marks, `${label} lost its niqqud`);
  assert.doesNotMatch(text, /(?:^|\s)[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/, `${label} has an orphan vowel point`);
  assert.equal(text, text.normalize('NFC'), `${label} must use normalized Unicode`);
}

test('new numerical variants and stories include Unicode niqqud too', () => {
  let state = 91;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  for (const q of generatePractice(random, 100)) {
    for (const key of ['prompt', 'explanation', 'passageText']) check(q[key], `${q.id}.${key}`);
    q.choices.forEach(choice => check(choice, q.id));
  }
});

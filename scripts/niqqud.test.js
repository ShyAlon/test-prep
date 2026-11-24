import test from 'node:test';
import assert from 'node:assert/strict';
import bank from '../src/question-bank.json' with { type: 'json' };
import corrections from './booklet-corrections.json' with { type: 'json' };
import { generatePractice } from '../src/question-generator.js';

const marks = /[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/;
const removeMarks = text => text.replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]/g, '');
function check(text, label) {
  if (!text || !/[א-ת]/.test(text)) return;
  assert.match(text, marks, `${label} lost its niqqud`);
  assert.doesNotMatch(text, /(?:^|\s)[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c7]/, `${label} has an orphan vowel point`);
  assert.equal(text, text.normalize('NFC'), `${label} must use normalized Unicode`);
}

test('all Hebrew booklet fields and reimport corrections preserve niqqud', () => {
  for (const t of bank.tests) for (const q of t.questions) {
    for (const key of ['prompt', 'instruction', 'explanation']) {
      check(q[key], `${q.id}.${key}`);
      if (key in q) assert.equal(corrections.questions[q.id][key], q[key]);
    }
    assert.deepEqual(corrections.questions[q.id].choices, q.choices);
    q.choices.forEach((choice, index) => check(choice, `${q.id}.choices[${index}]`));
  }
  assert.deepEqual(corrections.passages, bank.passages);
  Object.entries(bank.passages).forEach(([id, text]) => check(text, `passage ${id}`));
});

test('new numerical variants and stories include Unicode niqqud too', () => {
  let state = 91;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  for (const q of generatePractice(random, 100)) {
    for (const key of ['prompt', 'explanation', 'passageText']) check(q[key], `${q.id}.${key}`);
    q.choices.forEach(choice => check(choice, q.id));
  }
});

test('restoration keeps formulas, answer keys and reading line references usable', () => {
  const questions = new Map(bank.tests.flatMap(t => t.questions).map(q => [q.id, q]));
  assert.equal(removeMarks(questions.get('2-1-1').prompt), '5 ✕ 4 = __ + 12');
  const cookies = questions.get('1-3-1');
  assert.equal(removeMarks(cookies.choices[cookies.correct]), 'נשארו לשניהם 7 עוגיות.');
  assert.equal(removeMarks(questions.get('1-1-1').prompt), 'היכן איי הגלפגוס?');
  assert.match(bank.passages['3'], /\n18\. /);
  assert.ok(bank.passages['6'].includes('לִמְּדוּ אֶת הַבָּנוֹת'.normalize('NFC')));
});

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server, ui, AuthGate, Home, Results, dialogs, AvatarMenu;
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false, watch: null },
    appType: 'custom',
    logLevel: 'error',
  });
  ui = await server.ssrLoadModule('/src/components/UI.jsx');
  ({ AuthGate } = await server.ssrLoadModule('/src/Auth.jsx'));
  ({ Home } = await server.ssrLoadModule('/src/components/Home.jsx'));
  ({ Results } = await server.ssrLoadModule('/src/components/Results.jsx'));
  ({ AvatarMenu } = await server.ssrLoadModule('/src/components/AvatarMenu.jsx'));
  dialogs = await server.ssrLoadModule('/src/components/Dialogs.jsx');
});
after(async () => {
  await server?.close();
});
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('shared buttons cannot accidentally submit forms, while the sign-in action still submits', () => {
  assert.match(render(ui.Button, { children: 'Action' }), /type="button"/);
  assert.match(render(ui.Button, { type: 'submit', children: 'Sign in' }), /type="submit"/);
  const signin = render(AuthGate, { auth: {} });
  assert.equal((signin.match(/type="submit"/g) ?? []).length, 1);
  assert.match(signin, /autoComplete="current-password"/i);
  assert.match(signin, /htmlFor="auth-email"|for="auth-email"/);
});

test('shared modal titles remain accessible and required attribution survives component extraction', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(dialogs.HelpDialog, { close() {} }),
      React.createElement(dialogs.TermsDialog, { close() {} }),
    ),
  );
  const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2);
  for (const id of ids) assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /This work includes material from the System Reference Document 5\.2\.1/);
  assert.match(html, /https:\/\/creativecommons.org\/licenses\/by\/4.0\/legalcode/);
});

test('history and review render saved generated snapshots without a booklet bank', () => {
  const question = {
    prompt: 'Saved question',
    choices: ['7', '5'],
    correct: 0,
    passageText: 'Original saved story',
    explanation: 'Saved explanation',
  };
  const attempt = {
    id: 1,
    testId: 'practice',
    finishedAt: 1,
    totalMs: 1000,
    rounds: [{ id: 'generated-0', creature: 'bat', question }],
    answers: [{ choice: 1, correct: false, ms: 1000, creature: 'bat' }],
  };
  const home = render(Home, { game: { history: [attempt] }, mode: 'srd' });
  assert.match(home, /class="panel history-list"><button type="button" class=""/);
  const review = render(Results, { attempt });
  for (const text of ['Saved question', 'Original saved story', 'Saved explanation'])
    assert.ok(review.includes(text));
  assert.match(review, /התשובה שלך/);
  assert.match(review, /התשובה הנכונה/);
});


test('avatar menu exposes the selected voxel world alongside existing worlds', () => {
  const html = render(AvatarMenu, {user:{displayName:'Test'},mode:'voxel',changeMode(){}});
  assert.equal((html.match(/type="radio"/g) ?? []).length,4);
  assert.match(html, /aria-label="עולם הקוביות"[^>]*checked=""[^>]*value="voxel"/);
  assert.match(html, /20 יצורים/);
  assert.match(html, /voxel-knight.png/);
});


test('summary labels each saved math and reading question without expanding the review', async () => {
  const { createAttempt } = await import('../src/model.js');
  const { questionType } = await import('../src/practice-summary.js');
  const attempt = createAttempt(10, 123);
  attempt.finishedAt = 1000;
  attempt.answers = attempt.rounds.map(() => ({ choice: 0, correct: false, ms: 100 }));
  const saved = JSON.parse(JSON.stringify(attempt));
  const html = render(Results, { attempt: saved });
  const summaries = [...html.matchAll(/<summary>(.*?)<\/summary>/g)].map(match => match[1]).filter(text => text.includes('review-heading'));
  assert.equal(summaries.length, saved.rounds.length);
  saved.rounds.forEach((round, index) => {
    assert.ok(summaries[index].includes(questionType(round.question)));
  });
  assert.ok(html.includes('חשבון'));
  assert.ok(html.includes('הבנת הנקרא'));
  assert.equal(questionType({ passageText: 'Previously saved passage' }), 'הבנת הנקרא');
  assert.equal(questionType({}), 'תרגול כללי');
});


test('test timers can be hidden while elapsed values and other stats remain intact', async () => {
  const { Quiz } = await server.ssrLoadModule('/src/components/Quiz.jsx');
  const props = {
    attempt: { index: 0, rounds: [{ id: 'q1' }], answers: [], totalMs: 65000, questionMs: 17000 },
    question: { prompt: '2 + 2', choices: ['4', '5'], correct: 0 }, companionId: 'bat', toggleTimers() {},
  };
  const visible = render(Quiz, props);
  assert.match(visible, /01:05/);
  assert.match(visible, /00:17/);
  assert.match(visible, /הסתרת זמנים/);
  const hidden = render(Quiz, { ...props, showTimers: false });
  assert.doesNotMatch(hidden, /01:05|00:17|זמן כולל|זמן לשאלה/);
  assert.match(hidden, /הצגת זמנים/);
  assert.match(hidden, /תשובות נכונות/);
  assert.match(hidden, /רמזים/);
  assert.equal(props.attempt.totalMs, 65000);
  assert.equal(props.attempt.questionMs, 17000);
});

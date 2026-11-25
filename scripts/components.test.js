import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server, ui, AuthGate, Home, Results, dialogs;
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

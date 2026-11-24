import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracker, BATCH_SIZE, MAX_BATCHES } from '../src/tracking-core.js';
import { createTrackingSender } from '../src/tracking-transport.js';
import { cleanupBehavior } from './cleanup-behavior.mjs';

function fixture(send) {
  let clock = 0, sequence = 0;
  const map = new Map();
  const storage = { get length() { return map.size; }, key: i => [...map.keys()][i], getItem: key => map.get(key),
    setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
  const uploads = [];
  const options = { uid: 'alice', send: send ?? (async batch => uploads.push(batch)), storage,
    now: () => clock, wallNow: () => 1800000000000 + clock, id: () => `batch-${sequence++}` };
  return { tracker: createTracker(options), options, uploads, map, tick: ms => { clock += ms; } };
}

test('dwell uses seconds, closes the old context and excludes hidden/unfocused time', async () => {
  const f = fixture();
  f.tracker.enter({ view: 'quiz', questionId: 'q1' });
  f.tick(2500);
  f.tracker.setActive(false);
  f.tick(50000);
  f.tracker.setActive(true);
  f.tick(1250);
  f.tracker.enter({ view: 'quiz', questionId: 'q2' });
  f.tick(3000);
  await f.tracker.flush();
  const events = f.uploads.flatMap(batch => batch.events);
  assert.equal(events.filter(e => e.type === 'dwell' && e.questionId === 'q1').reduce((n,e) => n + e.dwellSeconds, 0), 3.75);
  assert.equal(events.filter(e => e.type === 'dwell' && e.questionId === 'q2')[0].dwellSeconds, 3);
  assert.equal(f.tracker.bufferedCount(), 0);
  assert.equal(f.map.size, 0);
});

test('transient failures retain immutable batches, back off and survive reload', async () => {
  const f = fixture(async () => { throw Error('offline'); });
  f.tracker.track('answer_submit', { choice: 1, correct: false, email: 'must-not-store', password: 'secret' });
  await f.tracker.flush();
  const stored = JSON.stringify([...f.map.values()]);
  assert.ok(!stored.includes('must-not-store') && !stored.includes('secret'));
  let attempts = 0;
  const recovered = createTracker({ ...f.options, send: async () => { attempts++; } });
  await recovered.flush();
  assert.ok(attempts > 0);
  const before = f.tracker.bufferedCount();
  await f.tracker.flush();
  assert.equal(f.tracker.bufferedCount(), before);
});

test('buffer size and batch size remain bounded, including while offline', async () => {
  const f = fixture(async () => { throw Error('offline'); });
  for (let i=0;i<5000;i++) f.tracker.track('next');
  await f.tracker.flush();
  assert.ok(f.tracker.bufferedCount() <= MAX_BATCHES * BATCH_SIZE);
  assert.ok(f.map.size <= MAX_BATCHES);
  for (const value of f.map.values()) assert.ok(JSON.parse(value).events.length <= BATCH_SIZE);
  f.tick(8 * 86400000);
  await f.tracker.flush();
  assert.ok([...f.map.values()].every(v => JSON.parse(v).createdAt >= f.options.wallNow() - 7 * 86400000));
});

test('blocked storage and concurrent flushes cannot crash or duplicate in-flight sends', async () => {
  let finish, sends = 0;
  const f = fixture();
  const tracker = createTracker({ ...f.options, storage: { get length() { throw Error('blocked'); } },
    send: () => { sends++; return new Promise(resolve => { finish = resolve; }); } });
  const first = tracker.flush();
  await tracker.flush();
  assert.equal(sends, 1);
  finish();
  await first;
});

test('transport will not use another account token, and batches have expiry and create preconditions', async () => {
  let request;
  const user = { uid: 'alice', getIdToken: async () => 'test-token' };
  const auth = { currentUser: user, app: { options: { projectId: 'demo' } } };
  const sender = createTrackingSender(auth, { fetcher: async (url, options) => { request = { url, options }; return { ok: true }; } });
  const batch = { id: 'stable-id', uid: 'alice', sessionId: 'session', schemaVersion: 1, createdAt: 1800000000000,
    events: [{ type: 'view', view: 'home', at: 1800000000000 }] };
  await sender(batch);
  const body = JSON.parse(request.options.body);
  assert.equal(body.writes[0].currentDocument.exists, false);
  assert.equal(request.options.keepalive, true);
  assert.equal(Date.parse(body.writes[0].update.fields.expiresAt.timestampValue) - batch.createdAt, 85 * 86400000);
  auth.currentUser = { uid: 'bob' };
  await assert.rejects(sender(batch), /account changed/);
});

test('cleanup deletes only expired documents, uses preconditions and defaults to a dry run', async () => {
  const now = new Date('2026-11-24T00:00:00Z');
  const document = { name: 'projects/demo/databases/(default)/documents/behaviorBatches/old',
    fields: { expiresAt: { timestampValue: '2026-11-23T00:00:00Z' } }, updateTime: '2026-11-01T00:00:00Z' };
  const calls = [];
  const fetcher = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => [{ document }] }; };
  assert.deepEqual(await cleanupBehavior({ projectId: 'demo', token: 'fake', fetcher, now }), { deleted: 0, wouldDelete: 1 });
  assert.equal(calls.length, 1);
  calls.length = 0;
  assert.deepEqual(await cleanupBehavior({ projectId: 'demo', token: 'fake', fetcher, now, apply: true }), { deleted: 1 });
  assert.match(calls[1].url, /currentDocument.updateTime=/);
  document.name = 'projects/demo/databases/(default)/documents/private/other';
  await assert.rejects(cleanupBehavior({ projectId: 'demo', token: 'fake', fetcher, now, apply: true }), /Invalid retention result/);
});

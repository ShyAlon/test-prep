import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { createTrackingSender } from '../src/tracking-transport.js';

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
test('Firestore rules: own immutable batches upload, retry safely, and remain private', { skip: !authHost || !firestoreHost }, async () => {
  assert.match(authHost, /^127\.0\.0\.1:\d+$/);
  assert.match(firestoreHost, /^127\.0\.0\.1:\d+$/);
  const projectId = 'demo-gifted-test-prep';
  const app = initializeApp({ apiKey: 'demo-api-key', projectId }, randomUUID());
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  try {
    const { user } = await createUserWithEmailAndPassword(auth, `tracking-${randomUUID()}@example.test`, randomUUID());
    const batch = { id: randomUUID(), uid: user.uid, sessionId: randomUUID(), schemaVersion: 1, createdAt: Date.now(),
      events: [{ type: 'dwell', at: Date.now(), view: 'quiz', questionId: '1-3-1', dwellSeconds: 12.5 }] };
    const sender = createTrackingSender(auth, { emulatorUrl: `http://${firestoreHost}` });
    await sender(batch);
    await sender(batch); // Lost ACKs and parallel tabs must not duplicate data.
    const base = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/behaviorBatches`;
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const read = await fetch(`${base}/${batch.id}`, { headers });
    assert.equal(read.status, 403);
    const list = await fetch(base, { headers });
    assert.equal(list.status, 403);
    const admin = await fetch(`${base}/${batch.id}`, { headers: { Authorization: 'Bearer owner' } }).then(r => r.json());
    assert.equal(admin.fields.uid.stringValue, user.uid);
    assert.equal(admin.fields.events.arrayValue.values.length, 1);
    assert.equal(Date.parse(admin.fields.expiresAt.timestampValue) - batch.createdAt, 85 * 86400000);
    assert.ok(admin.fields.receivedAt.timestampValue);
    const writes = async (uid, expiresAt) => fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents:commit`, {
      method: 'POST', headers,
      body: JSON.stringify({ writes: [{ update: { name: `projects/${projectId}/databases/(default)/documents/behaviorBatches/${randomUUID()}`,
        fields: { ...admin.fields, uid: { stringValue: uid }, expiresAt: { timestampValue: expiresAt } } },
        updateTransforms: [{ fieldPath: 'receivedAt', setToServerValue: 'REQUEST_TIME' }] }] }),
    });
    assert.equal((await writes('another-user', admin.fields.expiresAt.timestampValue)).status, 403);
    assert.equal((await writes(user.uid, new Date(Date.now() + 365 * 86400000).toISOString())).status, 403);
    const changed = { ...batch, events: [{ type: 'answer_submit', at: Date.now() }] };
    await sender(changed);
    const unchanged = await fetch(`${base}/${batch.id}`, { headers: { Authorization: 'Bearer owner' } }).then(r => r.json());
    assert.deepEqual(unchanged.fields.events, admin.fields.events);
  } finally {
    if (auth.currentUser) await deleteUser(auth.currentUser);
    await deleteApp(app);
  }
});

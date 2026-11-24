import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, deleteUser, sendPasswordResetEmail, signInWithCredential, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
test('Firebase emulator: registration, password login/reset, Google credentials, session observer and sign-out', { skip: !host }, async () => {
  assert.match(host, /^127\.0\.0\.1:\d+$/, 'Integration tests must use a local emulator');
  const projectId = 'demo-gifted-test-prep';
  const app = initializeApp({ apiKey: 'demo-api-key', authDomain: `${projectId}.firebaseapp.com`, projectId }, randomUUID());
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
  const email = `auth-check-${randomUUID()}@example.test`;
  const password = `Training-${randomUUID()}!`;
  const created = [];
  const seen = [];
  const stop = onAuthStateChanged(auth, user => seen.push(user?.uid ?? null));
  try {
    const registered = await createUserWithEmailAndPassword(auth, email, password);
    created.push(registered.user);
    const uid = registered.user.uid;
    assert.equal(auth.currentUser.uid, uid);
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    await assert.rejects(signInWithEmailAndPassword(auth, email, 'wrong-password'));
    assert.equal(auth.currentUser, null);
    const signedIn = await signInWithEmailAndPassword(auth, email, password);
    assert.equal(signedIn.user.uid, uid);
    await sendPasswordResetEmail(auth, email);
    const actions = await fetch(`http://${host}/emulator/v1/projects/${projectId}/oobCodes`).then(response => response.json());
    assert.ok(actions.oobCodes.some(action => action.email === email && action.requestType === 'PASSWORD_RESET'));
    await deleteUser(auth.currentUser);
    created.pop();
    const payload = { sub: randomUUID(), email: `google-check-${randomUUID()}@example.test`, email_verified: true,
      name: 'Emulated Google Trainer', iss: 'https://accounts.google.com', aud: 'demo-client' };
    const token = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;
    const google = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
    created.push(google.user);
    assert.equal(google.user.providerData[0].providerId, 'google.com');
    assert.equal(google.user.email, payload.email);
    assert.ok(seen.includes(uid));
    assert.ok(seen.includes(null));
    await deleteUser(auth.currentUser);
    created.pop();
    assert.equal(auth.currentUser, null);
  } finally {
    for (const user of created) await deleteUser(user).catch(() => {});
    stop();
    await deleteApp(app);
  }
});

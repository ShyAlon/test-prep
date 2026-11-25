import test from 'node:test';
import assert from 'node:assert/strict';
import { readGame, saveGame, readLegacyGame, importLegacyGame, canImportLegacyGame } from '../src/profile-storage.js';
import { authErrorMessage } from '../src/auth-errors.js';

function storage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map };
}

test('progress is separated by Firebase UID, including after account switches', () => {
  const local = storage();
  const alice = { history: [{ id: 1 }], sound: false, collection: { 25: 2 }, active: { index: 3 } };
  saveGame(alice, 'alice', local);
  assert.deepEqual(readGame('bob', local), { history: [], sound: true });
  saveGame({ history: [{ id: 2 }], sound: true }, 'bob', local);
  assert.deepEqual(readGame('alice', local), alice);
  assert.equal(readGame('bob', local).history[0].id, 2);
  assert.throws(() => readGame('', local));
  assert.throws(() => saveGame(alice, undefined, local));
});

test('legacy migration is opt-in, strips the PIN and cannot overwrite another profile', () => {
  const local = storage();
  const old = { history: [{ id: 17 }], collection: { 133: 1 }, sound: true, pin: { hash: 'old-pin-hash' } };
  local.setItem('poke-training.v1', JSON.stringify(old));
  assert.deepEqual(readGame('alice', local), { history: [], sound: true });
  assert.equal(canImportLegacyGame('alice', local), true);
  const migrated = importLegacyGame('alice', local);
  assert.ok(!('pin' in migrated));
  assert.equal(readGame('alice', local).history[0].id, 17);
  assert.equal(readLegacyGame(local), null);
  assert.equal(canImportLegacyGame('bob', local), false);
  assert.equal(JSON.parse(local.getItem('poke-training.v1')).pin.hash, 'old-pin-hash');
  assert.throws(() => importLegacyGame('alice', local));
  assert.throws(() => importLegacyGame('bob', local));
});

test('invalid or unavailable local storage starts safely and save failures surface', () => {
  const local = storage();
  saveGame({ history: [], pin: { hash: 'must-not-save' } }, 'alice', local);
  assert.ok(!('pin' in readGame('alice', local)));
  local.setItem('poke-training.v1.user.alice', '{bad json');
  assert.deepEqual(readGame('alice', local), { history: [], sound: true });
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.deepEqual(readGame('alice', broken), { history: [], sound: true });
  assert.throws(() => saveGame({ history: [] }, 'alice', broken));
});

test('sign-in errors are actionable without echoing provider details or exposing account existence', () => {
  const invalid = authErrorMessage({ code: 'auth/invalid-credential' });
  assert.equal(invalid, authErrorMessage({ code: 'auth/user-not-found' }));
  assert.equal(invalid, authErrorMessage({ code: 'auth/wrong-password' }));
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /חלונות קופצים/);
  assert.doesNotMatch(authErrorMessage({ message: 'private provider diagnostic' }), /private/);
});


test('visual world selection and world collections persist per account', () => {
  const local=storage();
  saveGame({history:[],creatureMode:'animals',collection:{'animal-lion':2,'myth-dragon':3,bat:1}},'alice',local);
  const saved=readGame('alice',local);
  assert.equal(saved.creatureMode,'animals');
  assert.deepEqual(saved.collection,{'animal-lion':2,'myth-dragon':3,bat:1});
  assert.equal(readGame('bob',local).creatureMode,undefined);
});

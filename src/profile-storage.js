const legacyKey = 'poke-training.v1';
const migrationKey = `${legacyKey}.migrated-to`;
const emptyGame = () => ({ history: [], sound: true });

function accountKey(uid) {
  if (typeof uid !== 'string' || !uid) throw new Error('An authenticated user ID is required');
  return `${legacyKey}.user.${encodeURIComponent(uid)}`;
}
function gameData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyGame();
  // The former PIN verifier never becomes part of an account's saved profile.
  const { pin: _pin, ...game } = value;
  return { ...emptyGame(), ...game, history: Array.isArray(game.history) ? game.history : [], sound: game.sound !== false };
}
function hasProgress(game) {
  return Boolean(game.active || game.history.length || Object.keys(game.collection ?? {}).length);
}
export function readGame(uid, storage = globalThis.localStorage) {
  const key = accountKey(uid);
  try {
    return gameData(JSON.parse(storage.getItem(key)));
  } catch {
    return emptyGame();
  }
}
export function saveGame(game, uid, storage = globalThis.localStorage) {
  storage.setItem(accountKey(uid), JSON.stringify(gameData(game)));
}
export function readLegacyGame(storage = globalThis.localStorage) {
  try {
    if (storage.getItem(migrationKey)) return null;
    const legacy = gameData(JSON.parse(storage.getItem(legacyKey)));
    return hasProgress(legacy) ? legacy : null;
  } catch {
    return null;
  }
}
export function importLegacyGame(uid, storage = globalThis.localStorage) {
  if (hasProgress(readGame(uid, storage))) throw new Error('The account already has progress');
  const legacy = readLegacyGame(storage);
  if (!legacy) throw new Error('No legacy progress is available');
  saveGame(legacy, uid, storage);
  storage.setItem(migrationKey, uid);
  return legacy;
}
export function canImportLegacyGame(uid, storage = globalThis.localStorage) {
  return !hasProgress(readGame(uid, storage)) && Boolean(readLegacyGame(storage));
}

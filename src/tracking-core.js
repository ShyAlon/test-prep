// Best-effort telemetry: no React state, per-second work, or awaited UI actions.
export const BATCH_SIZE = 25;
export const MAX_BATCHES = 20;
export const BUFFER_DAYS = 7;
export const RETENTION_DAYS = 85;
const DAY = 86400000;
const TYPES = new Set(['session_start', 'session_end', 'view', 'dwell', 'test_start', 'test_resume', 'answer_select',
  'answer_submit', 'hint', 'previous', 'next', 'attempt_complete', 'results_open', 'backpack_open', 'backpack_close',
  'magnifier_toggle', 'sound_toggle', 'explanation_open', 'explanation_close', 'passage_open', 'passage_close', 'legacy_import', 'logout']);
const FIELDS = new Set(['view', 'testId', 'attemptId', 'questionId', 'questionIndex', 'answered', 'choice', 'correct',
  'count', 'enabled', 'dwellSeconds']);
function fields(value) {
  const result = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    if (!FIELDS.has(key)) continue;
    if (typeof item === 'string') result[key] = item.slice(0, 80);
    else if (typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) result[key] = item;
  }
  return result;
}

export function createTracker({ uid, send, storage, wallNow = Date.now, now = () => performance.now(),
  id = () => crypto.randomUUID(), active = true }) {
  const sessionId = id();
  const prefix = `poke-behavior.v1.${encodeURIComponent(uid)}.`;
  let sequence = 0;
  let context = {};
  let pending = [];
  let batches = [];
  let last = now();
  let focused = active;
  let stopped = false;
  let sending = false;
  let failures = 0;
  let retryAt = 0;
  const safely = callback => { try { return callback(); } catch { return undefined; } };
  function remove(batch) { safely(() => storage?.removeItem(prefix + batch.id)); }
  function prune() {
    const cutoff = wallNow() - BUFFER_DAYS * DAY;
    batches = batches.filter(batch => {
      if (batch.createdAt >= cutoff && batch.createdAt <= wallNow() + 300000) return true;
      remove(batch);
      return false;
    });
    batches.sort((a, b) => a.createdAt - b.createdAt);
    while (batches.length > MAX_BATCHES) remove(batches.shift());
  }
  // Sealed batches are immutable and have unique IDs. Multiple tabs may retry
  // the same batch safely; the server accepts an ID only once.
  safely(() => {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith('poke-behavior.v1.')) continue;
      let batch;
      try { batch = JSON.parse(storage.getItem(key)); } catch { continue; }
      if (!batch || batch.createdAt < wallNow() - BUFFER_DAYS * DAY) {
        safely(() => storage.removeItem(key));
        index--;
        continue;
      }
      if (!key.startsWith(prefix)) continue;
      if (batch.uid === uid && typeof batch.id === 'string' && Array.isArray(batch.events)
        && batch.events.length > 0 && batch.events.length <= BATCH_SIZE && Number.isFinite(batch.createdAt)) batches.push(batch);
    }
  });
  prune();
  function track(type, detail = {}) {
    if (stopped || !TYPES.has(type)) return;
    pending.push({ type, at: wallNow(), sequence: sequence++, ...fields(context), ...fields(detail) });
    if (pending.length > BATCH_SIZE * MAX_BATCHES) pending.shift();
  }
  function checkpoint() {
    const current = now();
    const elapsed = Math.max(0, current - last);
    last = current;
    if (focused && elapsed > 0) track('dwell', { dwellSeconds: Math.round(elapsed) / 1000 });
  }
  function enter(next) {
    const clean = fields(next);
    if (JSON.stringify(clean) === JSON.stringify(context)) return;
    checkpoint();
    context = clean;
    track('view');
  }
  function setActive(value) {
    checkpoint();
    focused = value;
  }
  function seal() {
    prune();
    while (pending.length) {
      const events = pending.splice(0, BATCH_SIZE);
      const batch = { id: id(), uid, sessionId, schemaVersion: 1, createdAt: Math.min(...events.map(event => event.at)), events };
      batches.push(batch);
      safely(() => storage?.setItem(prefix + batch.id, JSON.stringify(batch)));
    }
    prune();
  }
  async function flush({ force = false } = {}) {
    checkpoint();
    seal();
    if (sending || (!force && wallNow() < retryAt)) return;
    sending = true;
    try {
      // At most two small requests per flush, including an offline backlog.
      for (let index = 0; index < 2 && batches.length; index++) {
        const batch = batches[0];
        await send(batch);
        batches = batches.filter(item => item.id !== batch.id);
        remove(batch);
      }
      failures = 0;
      retryAt = 0;
    } catch {
      failures++;
      retryAt = wallNow() + Math.min(300000, 30000 * 2 ** Math.min(failures - 1, 4));
    } finally {
      sending = false;
    }
  }
  function stop() {
    if (stopped) return;
    checkpoint();
    track('session_end');
    focused = false;
    stopped = true;
    seal();
    void flush({ force: true });
  }
  track('session_start');
  return { track, enter, setActive, checkpoint, flush, stop,
    // Exposed for diagnostics/tests; nothing here contains credentials.
    bufferedCount: () => pending.length + batches.reduce((sum, batch) => sum + batch.events.length, 0) };
}

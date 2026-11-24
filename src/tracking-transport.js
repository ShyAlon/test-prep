import { RETENTION_DAYS } from './tracking-core.js';

function encode(value) {
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
}

export function createTrackingSender(auth, { emulatorUrl, fetcher = fetch } = {}) {
  const root = emulatorUrl || 'https://firestore.googleapis.com';
  const database = `projects/${auth.app.options.projectId}/databases/(default)`;
  return async batch => {
    const user = auth.currentUser;
    if (!user || user.uid !== batch.uid) throw new Error('Tracking account changed');
    const token = await user.getIdToken();
    if (auth.currentUser?.uid !== batch.uid) throw new Error('Tracking account changed');
    const { id, ...data } = batch;
    const fields = encode(data).mapValue.fields;
    fields.createdAt = { timestampValue: new Date(batch.createdAt).toISOString() };
    fields.expiresAt = { timestampValue: new Date(batch.createdAt + RETENTION_DAYS * 86400000).toISOString() };
    const response = await fetcher(`${root}/v1/${database}/documents:commit`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{ update: { name: `${database}/documents/behaviorBatches/${id}`, fields },
        currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'receivedAt', setToServerValue: 'REQUEST_TIME' }] }] }),
      // Small keepalive requests can finish after a tab hides/closes. Delivery
      // is still best effort; sealed local batches are retained until ACKed.
      keepalive: true, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 409 && error.error?.status === 'ALREADY_EXISTS') return;
      throw new Error(`Tracking upload failed (${response.status})`);
    }
  };
}

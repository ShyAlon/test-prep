import { pathToFileURL } from 'node:url';

// IAM-authenticated retention job. No Firebase user credentials or static keys.
export async function cleanupBehavior({ projectId, token, apply = false, fetcher = fetch, now = new Date() }) {
  if (!projectId || !token) throw new Error('Project ID and a short-lived OAuth token are required');
  const root = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let count = 0;
  for (let page = 0; page < 50; page++) {
    const query = await fetcher(`${root}:runQuery`, { method: 'POST', headers,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'behaviorBatches' }],
        where: { fieldFilter: { field: { fieldPath: 'expiresAt' }, op: 'LESS_THAN_OR_EQUAL', value: { timestampValue: now.toISOString() } } },
        orderBy: [{ field: { fieldPath: 'expiresAt' }, direction: 'ASCENDING' }], limit: 200 } }), signal: AbortSignal.timeout(30000) });
    if (!query.ok) throw new Error(`Retention query failed (${query.status})`);
    const documents = (await query.json()).filter(row => row.document).map(row => row.document);
    if (!documents.length) break;
    for (const doc of documents) {
      // Defense in depth: refuse paths outside this one collection or rows
      // without an expired timestamp, even if the query response is malformed.
      const expected = `projects/${projectId}/databases/(default)/documents/behaviorBatches/`;
      if (!doc.name.startsWith(expected) || doc.name.slice(expected.length).includes('/')
        || !doc.fields?.expiresAt?.timestampValue || Date.parse(doc.fields.expiresAt.timestampValue) > now.getTime()
        || !Number.isFinite(Date.parse(doc.fields.expiresAt.timestampValue))) throw new Error('Invalid retention result');
      if (apply) {
        const deleted = await fetcher(`https://firestore.googleapis.com/v1/${doc.name}?currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`,
          { method: 'DELETE', headers, signal: AbortSignal.timeout(10000) });
        if (!deleted.ok && deleted.status !== 404) throw new Error(`Retention deletion failed (${deleted.status})`);
      }
      count++;
    }
    if (!apply || documents.length < 200) break;
  }
  return { deleted: apply ? count : 0, ...(apply ? {} : { wouldDelete: count }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await cleanupBehavior({ projectId: process.env.GOOGLE_CLOUD_PROJECT,
      token: process.env.GOOGLE_OAUTH_ACCESS_TOKEN, apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

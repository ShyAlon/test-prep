import defaults from './google-drive-config.json' with { type: 'json' };

// Public browser key: restricted to the Drive API and this app's referrers.
export function googleDriveApiRequest(link, apiKey = import.meta.env?.VITE_GOOGLE_DRIVE_API_KEY || defaults.apiKey) {
  if (!apiKey) return null;
  const shared = new URL(link.downloadUrl);
  const fileId = shared.searchParams.get('id');
  const resourceKey = shared.searchParams.get('resourcekey');
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set('alt', 'media');
  url.searchParams.set('key', apiKey);
  const headers = resourceKey ? { 'X-Goog-Drive-Resource-Keys': `${fileId}/${resourceKey}` } : {};
  return { url: url.href, headers, referrerPolicy: 'strict-origin-when-cross-origin' };
}

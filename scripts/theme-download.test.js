import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { downloadThemeZip as downloadThemeZipWithConfig, themeDownloadLink, ThemeDownloadError, validateThemeLink } from '../src/theme-download.js';
import { MAX_THEME_BYTES, parseThemeZip } from '../src/theme-storage.js';
const downloadThemeZip = (url, options) => downloadThemeZipWithConfig(url, { driveApiKey: 'test-browser-key', ...options });

test('inline validation explains common mistakes and offers explicit HTTPS corrections', () => {
  for (const [input, correction] of [
    ['example.com/theme.zip', 'https://example.com/theme.zip'],
    ['drive.google.com/file/d/example/view?resourcekey=keep', 'https://drive.google.com/file/d/example/view?resourcekey=keep'],
    ['http://www.dropbox.com/s/token/theme.zip?rlkey=keep', 'https://www.dropbox.com/s/token/theme.zip?rlkey=keep'],
  ]) {
    const result = validateThemeLink(input);
    assert.equal(result.valid, false);
    assert.ok(result.message);
    assert.ok(result.hint);
    assert.equal(result.correction, correction);
    assert.equal(validateThemeLink(correction).valid, true);
  }
  for (const input of ['', 'not a URL', 'https://incomplete', 'https://example.com/a b.zip', 'file:///theme.zip', 'https://user:password@example.com/theme.zip']) {
    const result = validateThemeLink(input);
    assert.equal(result.valid, false);
    assert.ok(result.hint);
    assert.equal(result.correction, '');
  }
  assert.match(validateThemeLink('https://drive.google.com/drive/folders/example').hint, /Google Drive/);
  assert.match(validateThemeLink('https://www.dropbox.com/scl/fo/folder').hint, /Dropbox/);
  const valid = validateThemeLink('https://example.com/download?signature=keep');
  assert.equal(valid.valid, true, 'direct download endpoints do not need a .zip extension');
  assert.equal(valid.message, undefined);
});

test('Drive file and open links preserve resource keys while targeting the same download', () => {
  const file = themeDownloadLink('https://drive.google.com/file/d/example-123/view?usp=sharing&resourcekey=secret-key');
  const open = themeDownloadLink('https://drive.google.com/open?id=example-123&resourcekey=secret-key');
  assert.deepEqual(file, open);
  const url = new URL(file.url);
  assert.equal(url.hostname, 'drive.usercontent.google.com');
  assert.equal(url.searchParams.get('id'), 'example-123');
  assert.equal(url.searchParams.get('resourcekey'), 'secret-key');
  assert.equal(themeDownloadLink(file.url).url, file.url);
});

test('Dropbox supports current and legacy shared files without dropping access keys', () => {
  for (const path of ['s/token/theme.zip', 'scl/fi/token/theme.zip']) {
    const link = themeDownloadLink(`https://www.dropbox.com/${path}?rlkey=keep&dl=0&raw=1#preview`);
    const direct = new URL(link.url), download = new URL(link.downloadUrl);
    assert.equal(direct.hostname, 'dl.dropboxusercontent.com');
    assert.equal(direct.searchParams.get('rlkey'), 'keep');
    assert.equal(direct.searchParams.has('raw'), false);
    assert.equal(download.searchParams.get('dl'), '1');
    assert.equal(direct.hash, '');
    assert.deepEqual(themeDownloadLink(link.url), link);
  }
});

test('invalid URLs, credentials and cloud folders are rejected before any request', async () => {
  for (const link of ['invalid', 'javascript:alert(1)', 'http://example.com/a.zip', 'https://user:pass@example.com/a.zip',
    'https://drive.google.com/drive/folders/example', 'https://www.dropbox.com/scl/fo/folder', 'https://drive.google.com/open?id=bad/id']) {
    await assert.rejects(downloadThemeZip(link, { fetch: () => assert.fail('must not fetch') }), /HTTPS/);
  }
});

test('a downloaded ZIP uses the existing manifest validation, without credentials or referrer', async () => {
  const manifest = { version:1,id:'link-theme',name:'Linked theme',description:'Fixture',avatar:'friend',companion:'friend',
    creatures:[{id:'friend',name:'Friend',english:'Friend',color:'grass',rarity:'standard',image:'friend.png'}] };
  const zip = zipSync({ 'theme.json':strToU8(JSON.stringify(manifest)), 'friend.png':new Uint8Array([137,80,78,71]) });
  const bytes = await downloadThemeZip('https://www.dropbox.com/s/token/theme.zip?dl=0', {
    fetch: async (url, options) => {
      assert.ok(url.startsWith('https://dl.dropboxusercontent.com/'));
      assert.equal(options.credentials, 'omit');
      assert.equal(options.referrerPolicy, 'no-referrer');
      return new Response(zip);
    },
  });
  assert.equal(parseThemeZip(bytes).manifest.id, 'link-theme');
  await assert.rejects(downloadThemeZip('https://example.com/theme.zip', { fetch: async () => new Response('PKinvalid') }).then(parseThemeZip));
});

test('permission pages, server errors and blocked downloads provide a usable fallback link', async () => {
  for (const fetch of [async () => new Response('sign in', {headers:{'content-type':'text/html'}}),
    async () => new Response('forbidden', {status:403}), async () => new Response('<html>confirm download</html>'),
    async () => { throw new TypeError('Failed to fetch'); }]) {
    await assert.rejects(downloadThemeZip('https://drive.google.com/file/d/example/view', {fetch}), error => {
      assert.ok(error instanceof ThemeDownloadError);
      assert.ok(error.downloadUrl.includes('id=example'));
      return true;
    });
  }
});

test('advertised and streamed size limits cancel downloads before parsing or storing', async () => {
  for (const advertised of [true, false]) {
    let cancelled = false;
    const body = new ReadableStream({
      start(controller) { if (!advertised) controller.enqueue(new Uint8Array(MAX_THEME_BYTES + 1)); },
      cancel() { cancelled = true; },
    });
    await assert.rejects(downloadThemeZip('https://example.com/theme.zip', {
      fetch: async () => new Response(body, {headers:advertised?{'content-length':String(MAX_THEME_BYTES+1)}:{}}),
    }), /3MB/);
    assert.ok(cancelled);
  }
});

test('slow requests time out with fallback; user cancellation stays distinguishable', async () => {
  const fetch = async (_url, {signal}) => new Promise((_resolve,reject) => {
    if (signal.aborted) reject(new DOMException('aborted','AbortError'));
    else signal.addEventListener('abort', () => reject(new DOMException('aborted','AbortError')), {once:true});
  });
  await assert.rejects(downloadThemeZip('https://example.com/theme.zip', {fetch,timeoutMs:5}), ThemeDownloadError);
  const controller = new AbortController();
  const pending = downloadThemeZip('https://example.com/theme.zip', {fetch,signal:controller.signal});
  controller.abort();
  await assert.rejects(pending, {name:'AbortError'});
});

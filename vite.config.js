import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

function offlineApp() {
  return {
    name: 'offline-app',
    apply: 'build',
    generateBundle(_options, bundle) {
      const publicRoot = new URL('./public/', import.meta.url);
      const walk = (folder = '') => readdirSync(new URL(folder, publicRoot), { withFileTypes: true })
        .flatMap(entry => entry.isDirectory() ? walk(`${folder}${entry.name}/`) : [`${folder}${entry.name}`]);
      const publicFiles = walk().sort();
      const files = [...Object.keys(bundle), ...publicFiles];
      const hash = createHash('sha256');
      for (const item of Object.values(bundle)) hash.update(item.type === 'chunk' ? item.code : item.source);
      for (const file of publicFiles) hash.update(readFileSync(new URL(`./public/${file}`, import.meta.url)));
      const version = hash.digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const PREFIX = 'training-camp-' + self.registration.scope;
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(files)}.map(file => new URL(file, self.registration.scope).href);
const HOME = new URL('index.html', self.registration.scope).href;
self.addEventListener('install', event => {
  console.info('[PWA update] Installing cache', { cache: CACHE, files: FILES.length });
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => {
    console.info('[PWA update] Cache installation complete', { cache: CACHE });
  }).catch(error => {
    console.error('[PWA update] Cache installation failed', { cache: CACHE, files: FILES.length }, error);
    throw error;
  }));
});
// Activate on an explicit update request, otherwise wait for existing windows to close.
self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') {
    console.info('[PWA update] Activation request received', { cache: CACHE });
    event.waitUntil(self.skipWaiting().catch(error => {
      console.error('[PWA update] skipWaiting failed', error); throw error;
    }));
  }
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()).then(() => {
    console.info('[PWA update] Worker active', { cache: CACHE });
  }).catch(error => {
    console.error('[PWA update] Activation failed', { cache: CACHE }, error); throw error;
  }));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept Firebase authentication, tracking, or external requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (request.mode === 'navigate' && (url.pathname === scope.pathname || url.href.split('?')[0] === HOME)) {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match(HOME))));
    return;
  }
  url.search = '';
  if (!FILES.includes(url.href)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.href)) || fetch(request)));
});
` });
    },
  };
}

export default defineConfig({ base: './', cacheDir: '.vite', plugins: [offlineApp()] });

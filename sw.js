// Drift Log: lets the app open when the connection is slow or missing.
// The network is tried first, so a newer version is always picked up when you are online.
const CACHE = 'drift-log-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  ]));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const saved = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : undefined));
  const fresh = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {}));
    }
    return res;
  });
  // If the network has not answered in 4 seconds, open the saved copy instead of leaving a blank screen.
  const patience = new Promise((resolve) => setTimeout(resolve, 4000)).then(saved);
  event.respondWith(
    Promise.race([fresh.catch(() => null), patience]).then((res) => res || saved().then((hit) => hit || fresh))
  );
});

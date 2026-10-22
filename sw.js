/* Карманный наставник — офлайн-кэш. При выпуске новой версии меняйте VERSION. */
const VERSION = 'nastavnik-1.5';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Сначала сеть (чтобы получать обновления), без сети — из кэша
    e.respondWith(
      Promise.race([
        // cache: 'no-cache' — не брать устаревшую страницу из кэша браузера (GitHub Pages кэширует до 10 минут)
        fetch('./index.html', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))
      ]).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

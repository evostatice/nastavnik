/* Карманный наставник — офлайн-кэш. Версия приходит из адреса (sw.js?v=…), её задаёт APP_VERSION в index.html */
const VERSION = 'nastavnik-' + (new URL(location.href).searchParams.get('v') || 'dev');
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' — мимо кэша браузера, иначе новая версия могла положить в офлайн-кэш старую страницу
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
      // нет сети и нет копии в кэше — пробуем сеть ещё раз без ограничения времени, а не показываем пустую ошибку
      ]).catch(() => caches.match('./index.html').then(hit => hit || fetch(req)))
    );
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

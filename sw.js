// 터틀 레이스 오프라인 실행(서비스 워커): 한 번 받은 그림·소리는 저장해 두고, 코드·페이지는 새것 먼저(없으면 저장본)
const V = 'turtle-race-868a9c7';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(V).then((c) => c.addAll(['./', './index.html', './manifest.json']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  const asset = /\/assets\//.test(u.pathname);
  if (asset) { // 그림·소리: 저장본 먼저
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((ca) => ca.put(e.request, c)); } return r; })));
  } else { // 코드·페이지: 새것 먼저
    e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((ca) => ca.put(e.request, c)); } return r; }).catch(() => caches.match(e.request)));
  }
});

// 퇴근중 — 오프라인 캐시. 파일을 바꾸면 VERSION 숫자를 올려 주세요.
const VERSION = "toegeunjung-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "images/poses/base.png", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))));
  self.clients.claim();
});
// 네트워크 우선, 실패하면 캐시 (항상 최신 버전을 먼저 보여줌)
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

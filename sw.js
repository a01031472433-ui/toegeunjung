// 퇴근중 — 오프라인 캐시. 파일을 바꾸면 VERSION 숫자를 올려 주세요.
const VERSION = "toegeunjung-v61";
const CORE = ["./", "index.html", "wordgame.js", "words-vocab.json", "community.js", "luck.js", "village.js", "runner-core.js", "runner-art.js", "runner.js", "manifest.webmanifest", "pose-base.png", "office-day.jpg", "office-night.jpg", "outfit-tie.webp", "outfit-beanie.webp", "outfit-glasses.webp", "outfit-hoodie.webp", "outfit-headset.webp", "outfit-shades.webp", "outfit-suit.webp", "outfit-crown.webp","outfit-goldtie.webp","outfit-golfcap.webp", "pet-cloud.webp", "pet-bunny.webp", "pet-bird.webp", "pet-sprout.webp", "pet-jelly.webp", "pet-turtle.webp", "home-gosi.webp", "home-ruin.webp", "home-rooftop.webp", "home-villa.webp", "home-apt.webp", "home-house.webp", "home-country.webp", "home-mansion.webp","yard-resort.webp", "furn-plant.webp", "furn-poster.webp", "furn-lamp.webp", "furn-coffee.webp","furn-shelf.webp","furn-sofa.webp","furn-bed.webp","furn-tv.webp", "icon-192.png"];
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

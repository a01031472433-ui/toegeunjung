// 퇴근중 — 오프라인 캐시. 파일을 바꾸면 VERSION 숫자를 올려 주세요.
const VERSION = "toegeunjung-v103";
const CORE = ["./", "index.html", "wordgame.js", "words-vocab.json", "community.js", "luck.js", "village.js", "runner-core.js", "runner-art.js", "runner.js", "omok.js", "manifest.webmanifest", "pose-base.png", "office-day.jpg", "office-night.jpg", "outfit-tie.webp", "outfit-beanie.webp", "outfit-glasses.webp", "outfit-hoodie.webp", "outfit-headset.webp", "outfit-shades.webp", "outfit-suit.webp", "outfit-crown.webp","outfit-goldtie.webp","outfit-golfcap.webp", "pet-cloud.webp", "pet-bunny.webp", "pet-bird.webp", "pet-sprout.webp", "pet-jelly.webp", "pet-turtle.webp", "home-gosi.webp", "home-ruin.webp", "home-rooftop.webp", "home-villa.webp", "home-apt.webp", "home-house.webp", "home-country.webp", "home-mansion.webp","yard-resort.webp", "furn-plant-0.webp", "furn-plant-1.webp", "furn-plant-2.webp", "furn-plant-s0.webp", "furn-plant-s1.webp", "furn-plant-s2.webp", "furn-poster-0.webp", "furn-poster-1.webp", "furn-poster-2.webp", "furn-lamp-0.webp", "furn-lamp-1.webp", "furn-lamp-2.webp", "furn-lamp-s0.webp", "furn-lamp-s1.webp", "furn-lamp-s2.webp", "furn-coffee-0.webp", "furn-coffee-1.webp", "furn-coffee-2.webp", "furn-coffee-s0.webp", "furn-coffee-s1.webp", "furn-coffee-s2.webp","furn-shelf-0.webp", "furn-shelf-1.webp", "furn-shelf-2.webp", "furn-shelf-s0.webp", "furn-shelf-s1.webp", "furn-shelf-s2.webp","furn-sofa-0.webp", "furn-sofa-1.webp", "furn-sofa-2.webp", "furn-sofa-s0.webp", "furn-sofa-s1.webp", "furn-sofa-s2.webp","furn-bed-0.webp", "furn-bed-1.webp", "furn-bed-2.webp", "furn-bed-s0.webp", "furn-bed-s1.webp", "furn-bed-s2.webp","furn-tv-0.webp", "furn-tv-1.webp", "furn-tv-2.webp", "furn-tv-s0.webp", "furn-tv-s1.webp", "furn-tv-s2.webp", "stone-01.webp", "stone-02.webp", "stone-03.webp", "stone-04.webp", "stone-05.webp", "stone-06.webp", "stone-07.webp", "stone-08.webp", "stone-09.webp", "stone-10.webp", "stone-11.webp", "stone-12.webp", "stone-13.webp", "stone-14.webp", "stone-15.webp", "stone-16.webp", "stone-17.webp", "stone-18.webp", "stone-19.webp", "stone-20.webp", "stone-21.webp", "stone-22.webp", "stone-23.webp", "stone-24.webp", "stone-25.webp", "stone-26.webp", "stone-27.webp", "stone-28.webp", "stone-29.webp", "stone-30.webp", "icon-192.png"];
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

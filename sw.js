/* sw.js - オフラインでも遊べるようにファイルを保存しておく */
var CACHE = 'ccnaquest-v3';
var FILES = [
  './', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/style.css',
  'js/core.js', 'js/sprites.js', 'js/audio.js', 'js/gen.js', 'js/maps.js', 'js/ui.js', 'js/quiz.js', 'js/battle.js', 'js/world.js', 'js/screens.js', 'js/main.js',
  'packs/ccna/a1.js', 'packs/ccna/a2.js', 'packs/ccna/a3.js', 'packs/ccna/a4.js', 'packs/ccna/a5.js', 'packs/ccna/a6.js', 'packs/ccna/a7.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
/* 更新を取りこぼさないよう「ネットワーク優先、だめならキャッシュ」 */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return res;
  }).catch(function () { return caches.match(e.request); }));
});

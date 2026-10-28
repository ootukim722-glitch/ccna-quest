/* main.js - 起動 */
(function () {
  'use strict';
  var Q = window.QUEST, ui = Q.ui;
  var inited = false;
  Q.world.initOnce = function () { if (inited) return; inited = true; Q.world.initInput(); };

  function boot() {
    Q.init();
    Q.load();
    if (!Q.areas.length) {
      ui.$('s-title').innerHTML = '<div class="logo">読み込みエラー</div><div class="muted">教材データ(packs/ccna)が見つかりません</div>';
      return;
    }
    ui.$('btn-menu').addEventListener('click', function () { Q.sfx('tap'); Q.audioUnlock(); Q.screens.menu(); });
    document.addEventListener('contextmenu', function (e) { if (!e.target.closest('input, textarea')) e.preventDefault(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) Q.write(); });
    Q.screens.title();
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

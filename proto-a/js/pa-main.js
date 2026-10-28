/* pa-main.js - 起動 */
(function () {
  'use strict';
  var Q = window.QUEST, PA = Q.pa, ui = PA.ui;
  var inited = false;
  PA.world.initOnce = function () { if (inited) return; inited = true; PA.world.initInput(); };

  function boot() {
    Q.init();
    Q.load();
    PA.ensure();
    if (!Q.area('a1')) {
      ui.$('s-title').innerHTML = '<div class="logo">読み込みエラー</div><div class="muted">教材データ(packs/ccna/a1.js)が見つかりません</div>';
      return;
    }
    ui.$('btn-menu').addEventListener('click', function () { Q.sfx('tap'); PA.unlock(); PA.screens.openMenu(); });
    document.addEventListener('contextmenu', function (e) { if (!e.target.closest('input, textarea')) e.preventDefault(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) Q.write(); });
    PA.world.initOnce();
    PA.screens.title();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

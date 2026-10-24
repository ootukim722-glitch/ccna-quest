/* ui.js - 画面切り替え、会話ウィンドウ、確認ダイアログ */
(function () {
  'use strict';
  var Q = window.QUEST;
  var ui = Q.ui = {};
  var $ = ui.$ = function (id) { return document.getElementById(id); };

  var screens = ['title', 'map', 'battle', 'panel'];
  ui.show = function (name) {
    screens.forEach(function (s) { $('s-' + s).hidden = (s !== name); });
    ui.current = name;
  };

  /* ---------- トースト・フラッシュ ---------- */
  var toastTimer = null;
  ui.toast = function (msg, ms) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
  };
  ui.flash = function () {
    return new Promise(function (res) {
      var f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      setTimeout(function () { f.classList.remove('go'); res(); }, 720);
    });
  };
  ui.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- 会話ウィンドウ ---------- */
  ui.say = function (pages, name) {
    if (typeof pages === 'string') pages = [pages];
    pages = pages.filter(Boolean);
    return new Promise(function (resolve) {
      var box = $('dialog'), txt = $('dlg-text'), nm = $('dlg-name');
      var i = 0, pos = 0, timer = null, full = '';
      nm.textContent = name || '';
      box.hidden = false;
      function show() {
        full = pages[i]; pos = 0; txt.textContent = '';
        clearInterval(timer);
        timer = setInterval(function () {
          pos += 2; txt.textContent = full.slice(0, pos);
          if (pos % 6 === 0) Q.sfx('talk');
          if (pos >= full.length) { clearInterval(timer); timer = null; }
        }, 22);
      }
      function next(e) {
        if (e) e.preventDefault();
        if (timer) { clearInterval(timer); timer = null; txt.textContent = full; return; }
        Q.sfx('tap');
        i++;
        if (i >= pages.length) { box.hidden = true; box.removeEventListener('pointerdown', next); document.removeEventListener('keydown', key); resolve(); return; }
        show();
      }
      function key(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); next(); } }
      box.addEventListener('pointerdown', next);
      document.addEventListener('keydown', key);
      if (!pages.length) { box.hidden = true; resolve(); return; }
      show();
    });
  };

  /* ---------- はい/いいえ ---------- */
  ui.confirm = function (msg, yes, no) {
    return new Promise(function (resolve) {
      var o = document.createElement('div');
      o.style.cssText = 'position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
      o.innerHTML = '<div class="card" style="width:100%;max-width:360px;margin:0;background:#1f2b4d"><div style="white-space:pre-wrap;line-height:1.7;margin-bottom:14px;font-weight:600">' + Q.esc(msg) +
        '</div><button class="btn go center" data-v="1">' + Q.esc(yes || 'はい') + '</button><button class="btn center" data-v="0" style="margin-bottom:0">' + Q.esc(no || 'やめる') + '</button></div>';
      o.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        Q.sfx('tap'); o.remove(); resolve(b.getAttribute('data-v') === '1');
      });
      $('app').appendChild(o);
    });
  };

  /* ---------- 汎用パネル ---------- */
  ui.panel = function (title, html, opts) {
    opts = opts || {};
    var p = $('s-panel');
    p.innerHTML = '<div class="panel-head">' + (opts.back === false ? '' : '<button class="back" id="p-back">← もどる</button>') +
      '<h2>' + Q.esc(title) + '</h2></div><div class="panel-body" id="p-body">' + html + '</div>';
    ui.show('panel');
    var back = $('p-back');
    if (back) back.onclick = function () { Q.sfx('tap'); if (opts.onBack) opts.onBack(); };
    return $('p-body');
  };

  /* data-act 属性のボタンにクリックを割り当てる */
  ui.bind = function (root, handlers) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || b.classList.contains('disabled')) return;
      var h = handlers[b.getAttribute('data-act')];
      if (h) { Q.sfx('tap'); h(b.getAttribute('data-arg'), b); }
    });
  };

  ui.hearts = function (n, max) {
    var s = '<span class="hrow">';
    for (var i = 0; i < max; i++) s += '<i class="heart' + (i < n ? '' : ' off') + '"></i>';
    return s + '</span>';
  };
})();

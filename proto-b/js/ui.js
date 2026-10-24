/* ui.js - 画面まわりの小さな道具(DOM、ドット絵の人物・小物、通知) */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PB = window.PB = window.PB || {};
  var U = PB.ui = {};

  U.$ = function (id) { return document.getElementById(id); };
  U.el = function (tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  };
  U.clear = function (n) { while (n.firstChild) n.removeChild(n.firstChild); return n; };
  U.btn = function (label, cls, fn) {
    var b = U.el('button', cls || 'btn', label);
    b.type = 'button';
    if (fn) b.addEventListener('click', function (ev) { PB.sfx('tap'); fn(ev); });
    return b;
  };

  var SCREENS = ['title', 'cases', 'scene', 'term', 'review'];
  U.show = function (id) {
    SCREENS.forEach(function (s) { U.$('s-' + s).hidden = (s !== id); });
    U.fit();
  };

  var toastTimer = null;
  U.toast = function (msg) {
    var t = U.$('toast');
    t.textContent = msg;
    t.className = 'on';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 2200);
  };

  /* ---------- ドット絵の人物 ---------- */
  U.portrait = function (look) {
    var cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16; cv.className = 'px';
    var c = cv.getContext('2d');
    Q.drawPerson(c, 0, 0, look, 'down', 0);
    return cv;
  };

  /* ---------- ドット絵の小物(32x24) ---------- */
  function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  U.prop = function (kind) {
    var cv = document.createElement('canvas');
    cv.width = 32; cv.height = 24; cv.className = 'px prop';
    var c = cv.getContext('2d');
    if (kind === 'monitor') {
      R(c, '#1d2230', 6, 2, 20, 15); R(c, '#2b2f3a', 7, 3, 18, 13); R(c, '#2f6fcf', 8, 4, 16, 11);
      R(c, '#9fd0ff', 9, 5, 7, 1); R(c, '#9fd0ff', 9, 7, 11, 1); R(c, '#9fd0ff', 9, 9, 9, 1); R(c, '#9fd0ff', 9, 11, 12, 1);
      R(c, '#555b6b', 14, 17, 4, 2); R(c, '#555b6b', 11, 19, 10, 2); R(c, '#9aa3b5', 5, 21, 22, 2);
    } else if (kind === 'switch') {
      R(c, '#1d2230', 2, 7, 28, 12); R(c, '#4a5d7e', 3, 8, 26, 10); R(c, '#6c82a8', 3, 8, 26, 1);
      var i;
      for (i = 0; i < 8; i++) { R(c, '#11151f', 5 + i * 3, 12, 2, 3); R(c, i === 5 ? '#ffb347' : '#4ade80', 5 + i * 3, 10, 2, 1); }
      R(c, '#2b3550', 4, 19, 4, 2); R(c, '#2b3550', 24, 19, 4, 2);
    } else if (kind === 'printer') {
      R(c, '#f5f5f5', 9, 2, 14, 6); R(c, '#cfd3dc', 9, 2, 14, 1);
      R(c, '#1d2230', 3, 8, 26, 11); R(c, '#d8d4c8', 4, 9, 24, 9); R(c, '#b9b4a6', 4, 9, 24, 1);
      R(c, '#4ade80', 23, 11, 2, 2); R(c, '#6c7388', 6, 12, 10, 1);
      R(c, '#11151f', 8, 16, 16, 2); R(c, '#ffffff', 10, 18, 12, 4); R(c, '#cfd3dc', 10, 20, 12, 1);
    }
    return cv;
  };

  U.pips = function (n, max) {
    var s = U.el('span', 'pips');
    for (var i = 0; i < max; i++) s.appendChild(U.el('i', 'pip' + (i < n ? ' on' : '')));
    return s;
  };

  /* 人物と小物を、ステージの高さに合わせて整数倍で拡大する */
  U.fit = function () {
    var st = U.$('stage');
    if (!st || st.offsetParent === null) return;
    var h = st.clientHeight;
    if (!h) return;
    var s = Math.max(3, Math.floor((h * 0.74) / 16));
    var cvs = st.querySelectorAll('.pt canvas');
    for (var i = 0; i < cvs.length; i++) { cvs[i].style.width = (16 * s) + 'px'; cvs[i].style.height = (16 * s) + 'px'; }
    var ps = Math.max(2, Math.floor((h * 0.5) / 24));
    var pr = st.querySelectorAll('canvas.prop');
    for (var j = 0; j < pr.length; j++) { pr[j].style.width = (32 * ps) + 'px'; pr[j].style.height = (24 * ps) + 'px'; }
  };
  window.addEventListener('resize', U.fit);
})();

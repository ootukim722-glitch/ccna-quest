/* pa-ui.js - 画面切り替え、会話ウィンドウ、選択肢、追加の効果音 */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PA = Q.pa = Q.pa || {};
  var ui = PA.ui = {};
  var $ = ui.$ = function (id) { return document.getElementById(id); };

  var screens = ['title', 'world', 'battle', 'panel'];
  ui.current = 'title';
  ui.show = function (name) {
    screens.forEach(function (s) { $('s-' + s).hidden = (s !== name); });
    ui.current = name;
  };
  ui.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  var toastTimer = null;
  ui.toast = function (msg, ms) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2000);
  };
  ui.flash = function () {
    return new Promise(function (res) {
      var f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
      setTimeout(function () { f.classList.remove('go'); res(); }, 720);
    });
  };
  ui.fade = function (on) {
    $('fade').classList.toggle('on', !!on);
    return ui.wait(280);
  };

  /* ---------- 追加の効果音(Q.sfx にない音を、試作側で足す) ---------- */
  var actx = null;
  function ensure() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { actx = new AC(); } catch (e) { actx = null; return false; }
    return true;
  }
  function tone(f, t0, dur, type, vol, slide) {
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  PA.unlock = function () { Q.audioUnlock(); ensure(); };
  PA.sfx = function (name) {
    var own = { alert: 1, hit: 1, hurt: 1, levelup: 1, evolve: 1, heal: 1, door: 1, badge: 1, faint: 1 };
    if (!own[name]) { Q.sfx(name); return; }
    if (!Q.S || !Q.S.set.sfx || !ensure()) return;
    var t = actx.currentTime, i;
    switch (name) {
      case 'alert': tone(880, t, 0.08, 'square', 0.12); tone(1175, t + 0.09, 0.14, 'square', 0.12); break;
      case 'hit': tone(260, t, 0.14, 'sawtooth', 0.14, 70); tone(90, t, 0.1, 'square', 0.12); break;
      case 'hurt': tone(180, t, 0.2, 'sawtooth', 0.14, 60); break;
      case 'faint': tone(300, t, 0.5, 'triangle', 0.16, 70); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach(function (f, k) { tone(f, t + k * 0.07, 0.14, 'square', 0.12); }); break;
      case 'evolve': for (i = 0; i < 14; i++) tone(300 + i * 70, t + i * 0.12, 0.14, 'square', 0.1); [784, 988, 1175, 1568].forEach(function (f, k) { tone(f, t + 1.8 + k * 0.1, 0.4, 'square', 0.14); }); break;
      case 'heal': [523, 659, 784, 659, 784, 1046].forEach(function (f, k) { tone(f, t + k * 0.16, 0.2, 'triangle', 0.16); }); break;
      case 'door': tone(140, t, 0.08, 'square', 0.1); tone(190, t + 0.07, 0.1, 'square', 0.1); break;
      case 'badge': [523, 659, 784, 1046, 784, 1046, 1318].forEach(function (f, k) { tone(f, t + k * 0.14, 0.22, 'square', 0.14); }); break;
    }
  };

  /* ---------- 会話ウィンドウ(世界用) ---------- */
  ui.say = function (pages, name) {
    if (typeof pages === 'string') pages = [pages];
    pages = pages.filter(Boolean);
    return new Promise(function (resolve) {
      var box = $('dialog'), txt = $('dlg-text'), nm = $('dlg-name');
      var i = 0, pos = 0, timer = null, full = '';
      nm.textContent = name || '';
      if (!pages.length) { resolve(); return; }
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
        if (e && e.preventDefault) e.preventDefault();
        if (timer) { clearInterval(timer); timer = null; txt.textContent = full; return; }
        Q.sfx('tap');
        i++;
        if (i >= pages.length) {
          box.hidden = true; box.removeEventListener('pointerdown', next); document.removeEventListener('keydown', key);
          resolve(); return;
        }
        show();
      }
      function key(e) {
        if (e.repeat) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); next(); }
      }
      box.addEventListener('pointerdown', next);
      document.addEventListener('keydown', key);
      show();
    });
  };

  /* ---------- 選択肢(1つ選ぶ) ---------- */
  ui.choose = function (prompt, options) {
    return new Promise(function (resolve) {
      var o = $('choice');
      var html = '<div class="choice-box"><div class="choice-q">' + Q.esc(prompt || '') + '</div>';
      options.forEach(function (t, i) { html += '<button class="btn center' + (i === 0 ? ' go' : '') + '" data-i="' + i + '">' + Q.esc(t) + '</button>'; });
      o.innerHTML = html + '</div>';
      o.hidden = false;
      function done(i) { o.hidden = true; o.innerHTML = ''; o.onclick = null; document.removeEventListener('keydown', key); Q.sfx('tap'); resolve(i); }
      o.onclick = function (e) { var b = e.target.closest('button'); if (b) done(+b.getAttribute('data-i')); };
      function key(e) { var n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) { e.preventDefault(); done(n - 1); } }
      document.addEventListener('keydown', key);
    });
  };

  /* ---------- 汎用パネル(手持ち・ずかんなど) ---------- */
  ui.panel = function (title, html, onBack) {
    var p = $('s-panel');
    p.innerHTML = '<div class="panel-head"><button class="back" id="p-back">もどる</button><h2>' + Q.esc(title) + '</h2></div>' +
      '<div class="panel-body" id="p-body">' + html + '</div>';
    ui.show('panel');
    $('p-back').onclick = function () { Q.sfx('tap'); if (onBack) onBack(); };
    return $('p-body');
  };
  ui.bind = function (root, handlers) {
    root.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b || b.classList.contains('disabled')) return;
      var h = handlers[b.getAttribute('data-act')];
      if (h) { Q.sfx('tap'); h(b.getAttribute('data-arg'), b); }
    };
  };

  /* 用語の表示用 */
  ui.bar = function (cls, ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    return '<div class="bar ' + cls + '"><i style="width:' + (ratio * 100).toFixed(1) + '%"></i></div>';
  };
  /* 文章を、読みやすい長さ(ページ)に分ける */
  ui.chunk = function (text, limit) {
    limit = limit || 54;
    var parts = String(text).match(/[^。!?]+[。!?]*|[。!?]+/g) || [], pages = [], cur = '';
    parts.forEach(function (s) {
      if (cur && (cur + s).length > limit) { pages.push(cur); cur = s; } else cur += s;
    });
    if (cur) pages.push(cur);
    return pages;
  };
})();

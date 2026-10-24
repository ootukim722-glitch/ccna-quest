/* pa-sprites.js - 試作A用の絵。進化段階つきモンスター、うしろ姿、バッジ(すべてコードで描く) */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PA = Q.pa = Q.pa || {};

  /* ---------- 進化 ---------- */
  PA.EVO1 = 8;
  PA.EVO2 = 16;
  PA.stageOf = function (lv) { return lv >= PA.EVO2 ? 2 : lv >= PA.EVO1 ? 1 : 0; };
  PA.stageName = function (id, stage) {
    var m = Q.mon[id], n = m ? m.nick : id;
    return stage === 0 ? n : (stage === 1 ? n + '・改' : n + '・極');
  };
  PA.stageLabel = ['だい1けいたい', 'だい2けいたい', 'さいしゅうけいたい'];

  var cache = {};
  function hsl(h, s, l) { return 'hsl(' + Math.round(h) + ',' + Math.round(s) + '%,' + Math.round(l) + '%)'; }

  /* Q.monImg と同じ乱数で同じ体つきを作り、段階ごとに色・つの・つばさ・かんむりを足す。
     back=true で、うしろ姿(顔なし、せなかの板つき)を描く。 */
  PA.monImg = function (id, stage, back) {
    stage = stage || 0;
    var key = id + ':' + stage + (back ? ':b' : '');
    if (cache[key]) return cache[key];
    var areaId = (Q.mon[id] && Q.mon[id].areaId) || 'a1';
    var N = 10, S = 2, PAD = 3;
    var r = Q.rng(Q.hash(id + 'v2'));
    var hue = Q.theme(areaId).hue + (r() * 70 - 35);
    var sat = 55 + r() * 25, light = 60 + r() * 8;
    hue += stage * 26; sat = Math.min(92, sat + stage * 9); light = light - stage * 4;
    var half = N / 2, g = [], y, x;
    for (y = 0; y < N; y++) { g.push([]); for (x = 0; x < N; x++) g[y].push(0); }
    for (y = 0; y < N; y++) {
      for (x = 0; x < half; x++) {
        var dx = (half - 0.5 - x) / half, dy = Math.abs(y - (N - 1) / 2) / (N / 2);
        var d = Math.sqrt(dx * dx * 0.55 + dy * dy);
        var p = 1.12 - d * 1.05;
        var on = (d < 0.38) || r() < p;
        g[y][x] = on ? 1 : 0; g[y][N - 1 - x] = on ? 1 : 0;
      }
    }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      if (!g[y][x]) continue;
      var nb = (y > 0 && g[y - 1][x]) + (y < N - 1 && g[y + 1][x]) + (x > 0 && g[y][x - 1]) + (x < N - 1 && g[y][x + 1]);
      if (nb === 0) { g[y][x] = 0; g[y][N - 1 - x] = 0; }
    }
    g[N - 1][1] = g[N - 1][N - 2] = 1; g[N - 2][1] = g[N - 2][N - 2] = 1;
    var ex = 2, ey = 3, found = false;
    for (var yy = 2; yy <= 5 && !found; yy++) for (var xx = 2; xx >= 1 && !found; xx--) {
      if (g[yy][xx] && g[yy][xx + 1] && g[yy - 1][xx]) { ex = xx; ey = yy; found = true; }
    }
    g[ey][ex] = g[ey][N - 1 - ex] = 1;

    var W = (N + PAD * 2) * S;
    var cv = document.createElement('canvas'); cv.width = cv.height = W;
    var c = cv.getContext('2d');
    var base = hsl(hue, sat, light), dark = hsl(hue, sat, light - 14), line = hsl(hue, sat + 5, 18);
    var belly = hsl(hue + 25, 55, 86), hi = hsl(hue, sat, light + 12);
    var wing = hsl(hue + 40, 70, 78), wingD = hsl(hue + 40, 60, 52);
    function px(cx, cy, col) { c.fillStyle = col; c.fillRect((cx + PAD) * S, (cy + PAD) * S, S, S); }
    function topOf(col) { for (var t = 0; t < N; t++) if (g[t][col]) return t; return -1; }
    function leftOf(row) { for (var t = 0; t < N; t++) if (g[row][t]) return t; return -1; }

    // 2だん目: つばさ(からだの後ろに描く)
    if (stage >= 2) {
      var wl = { 2: 1, 3: 3, 4: 3, 5: 2 };
      for (var wy in wl) {
        var row = +wy, lx = leftOf(row);
        if (lx < 0) continue;
        for (var k = 1; k <= wl[wy]; k++) {
          var wx = lx - k;
          px(wx, row, k === wl[wy] ? wingD : wing);
          px(N - 1 - wx, row, k === wl[wy] ? wingD : wing);
        }
      }
    }
    // 輪郭
    for (y = -1; y <= N; y++) for (x = -1; x <= N; x++) {
      var inside = y >= 0 && y < N && x >= 0 && x < N && g[y][x];
      if (inside) continue;
      var near = (y > 0 && y <= N && x >= 0 && x < N && g[y - 1][x]) || (y >= -1 && y < N - 1 && x >= 0 && x < N && g[y + 1] && g[y + 1][x]) ||
        (x > 0 && x <= N && y >= 0 && y < N && g[y][x - 1]) || (x >= -1 && x < N - 1 && y >= 0 && y < N && g[y][x + 1]);
      if (near) px(x, y, line);
    }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      if (!g[y][x]) continue;
      var col = base;
      if (y >= N * 0.62 || !(y + 1 < N && g[y + 1][x])) col = dark;
      if (y <= 2 && x < half - 1 && y < 3 && (x + y) % 3 === 0) col = hi;
      var bx = Math.abs(x - (N - 1) / 2);
      if (!back && y >= N * 0.52 && y <= N * 0.86 && bx < N * 0.2) col = belly;
      px(x, y, col);
    }
    if (back) {
      // せなかの板
      for (var by = 2; by <= 7; by += 2) {
        if (g[by][half - 1]) { px(half - 1, by, hi); px(half, by, hi); }
      }
    } else {
      [ex, N - 1 - ex].forEach(function (e) {
        c.fillStyle = '#111827'; c.fillRect((e + PAD) * S, (ey + PAD) * S, S, S);
        c.fillStyle = '#ffffff'; c.fillRect((e + PAD) * S, (ey + PAD) * S, 1, 1);
      });
      if (r() < 0.6) { px(ex - 1 >= 0 ? ex - 1 : ex, ey + 1, '#ff9eb5'); px(N - 1 - (ex - 1 >= 0 ? ex - 1 : ex), ey + 1, '#ff9eb5'); }
      var my = Math.min(N - 3, ey + 2);
      if (g[my][half - 1]) { c.fillStyle = '#111827'; c.fillRect((half - 1 + PAD) * S, (my + PAD) * S, S * 2, 1); }
    }
    // 1だん目から: つの
    if (stage >= 1) {
      var hc = -1, ht = 99;
      for (var cc = 1; cc <= 3; cc++) { var tp = topOf(cc); if (tp >= 0 && tp < ht) { ht = tp; hc = cc; } }
      if (hc >= 0) {
        [hc, N - 1 - hc].forEach(function (col) {
          px(col, ht - 1, '#f6e7a8'); px(col, ht - 2, '#f6e7a8'); px(col, ht - 3, line);
          px(col - 1, ht - 2, line); px(col + 1, ht - 2, line);
        });
      }
    }
    // 2だん目: かんむり
    if (stage >= 2) {
      var tc = topOf(half - 1); if (tc < 0) tc = 1;
      c.fillStyle = '#ffd166';
      for (var q = half - 2; q <= half + 1; q++) c.fillRect((q + PAD) * S, (tc - 1 + PAD) * S, S, S);
      c.fillRect((half - 2 + PAD) * S, (tc - 2 + PAD) * S, S, S);
      c.fillRect((half + 1 + PAD) * S, (tc - 2 + PAD) * S, S, S);
      c.fillStyle = '#e63946'; c.fillRect((half - 1 + PAD) * S, (tc - 1 + PAD) * S, S, S);
    }
    var url = cv.toDataURL();
    cache[key] = url;
    return url;
  };

  /* ---------- バッジ(16x16) ---------- */
  PA.badgeImg = function () {
    if (cache.badge) return cache.badge;
    var cv = document.createElement('canvas'); cv.width = cv.height = 16;
    var c = cv.getContext('2d');
    function f(col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
    // 八角形
    f('#7a4a00', 4, 0, 8, 16); f('#7a4a00', 0, 4, 16, 8); f('#7a4a00', 2, 1, 12, 14); f('#7a4a00', 1, 2, 14, 12);
    f('#ffd166', 4, 1, 8, 14); f('#ffd166', 1, 4, 14, 8); f('#ffd166', 2, 2, 12, 12);
    f('#fff1b8', 3, 2, 6, 1); f('#fff1b8', 2, 3, 1, 5);
    // 中のネットワーク図
    f('#7b2cbf', 7, 4, 2, 2); f('#7b2cbf', 4, 10, 2, 2); f('#7b2cbf', 10, 10, 2, 2);
    f('#7b2cbf', 7, 6, 1, 2); f('#7b2cbf', 5, 8, 6, 1); f('#7b2cbf', 5, 9, 1, 1); f('#7b2cbf', 10, 9, 1, 1);
    cache.badge = cv.toDataURL();
    return cache.badge;
  };
})();

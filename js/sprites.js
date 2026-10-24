/* sprites.js - ドット絵をコードで描く(素材ファイル不要・すべてオリジナル) */
(function () {
  'use strict';
  var Q = window.QUEST;

  /* ---------- エリアごとの色 ---------- */
  Q.themes = {
    a1: { hue: 125, ground: '#6fb552', g2: '#63a84a', grass: '#2f8f3a', blade: '#1f6b2a', tree: '#1f6b2e', tree2: '#2f8f45', path: '#d8c590', path2: '#c8b27c', water: '#4c9be0', water2: '#8cc6f2' },
    a2: { hue: 28, ground: '#dcc189', g2: '#cfb27a', grass: '#7cb342', blade: '#558b2f', tree: '#4e8a2a', tree2: '#6aa83a', path: '#b9805a', path2: '#a56d49', water: '#4aa3df', water2: '#8ccdf5' },
    a3: { hue: 200, ground: '#86b3a8', g2: '#79a69b', grass: '#3f8f7a', blade: '#2c6e5c', tree: '#2d6a5b', tree2: '#3f8f7a', path: '#c8d4d9', path2: '#b3c2c9', water: '#3f8fd6', water2: '#82bdf0' },
    a4: { hue: 50, ground: '#c9b86b', g2: '#bda95c', grass: '#8f9d2e', blade: '#6b7a1f', tree: '#5d7a2a', tree2: '#7a9a38', path: '#e9dcaa', path2: '#d8c88f', water: '#4aa3df', water2: '#8ccdf5' },
    a5: { hue: 180, ground: '#e6d5a0', g2: '#dac792', grass: '#5fae6a', blade: '#3e8e4f', tree: '#3d8b5a', tree2: '#54a874', path: '#b39a6b', path2: '#a38a5c', water: '#2f8fd8', water2: '#7ec2f2' },
    a6: { hue: 350, ground: '#9aa0ab', g2: '#8d939e', grass: '#6c8f6a', blade: '#4b6e4a', tree: '#3b5a3f', tree2: '#4d7451', path: '#5c6370', path2: '#4e5461', water: '#5b7db1', water2: '#91b0dd' },
    a7: { hue: 270, ground: '#6c5ba7', g2: '#62529a', grass: '#9b59b6', blade: '#7d3c98', tree: '#3d2a6b', tree2: '#5a4496', path: '#c3b1e1', path2: '#b19fd0', water: '#5a67d8', water2: '#9aa5f0' }
  };
  Q.theme = function (id) { return Q.themes[id] || Q.themes.a1; };

  /* ---------- モンスター(ランダム生成のシンメトリ生物) ---------- */
  var imgCache = {};
  function hsl(h, s, l) { return 'hsl(' + Math.round(h) + ',' + Math.round(s) + '%,' + Math.round(l) + '%)'; }

  Q.monImg = function (id, opts) {
    opts = opts || {};
    var key = id + (opts.boss ? ':boss' : '');
    if (imgCache[key]) return imgCache[key];
    var areaId = (Q.mon[id] && Q.mon[id].areaId) || opts.areaId || 'a1';
    var N = opts.boss ? 14 : 10, S = 2, PAD = 1;
    var r = Q.rng(Q.hash(key + 'v2'));
    var hue = Q.theme(areaId).hue + (r() * 70 - 35);
    var sat = 55 + r() * 25, light = 60 + r() * 8;
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
    // 孤立したマスを消す
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      if (!g[y][x]) continue;
      var nb = (y > 0 && g[y - 1][x]) + (y < N - 1 && g[y + 1][x]) + (x > 0 && g[y][x - 1]) + (x < N - 1 && g[y][x + 1]);
      if (nb === 0) { g[y][x] = 0; g[y][N - 1 - x] = 0; }
    }
    // 足
    g[N - 1][1] = g[N - 1][N - 2] = 1; g[N - 2][1] = g[N - 2][N - 2] = 1;
    // 目の位置
    var ex = 2, ey = 3, found = false;
    for (var yy = 2; yy <= 5 && !found; yy++) for (var xx = 2; xx >= 1 && !found; xx--) {
      if (g[yy][xx] && g[yy][xx + 1] && g[yy - 1][xx]) { ex = xx; ey = yy; found = true; }
    }
    if (opts.boss) { ex = 3; ey = 5; }
    g[ey][ex] = g[ey][N - 1 - ex] = 1;

    var W = (N + PAD * 2) * S;
    var cv = document.createElement('canvas'); cv.width = cv.height = W;
    var c = cv.getContext('2d');
    var base = hsl(hue, sat, light), dark = hsl(hue, sat, light - 14), line = hsl(hue, sat + 5, 18);
    var belly = hsl(hue + 25, 55, 86), hi = hsl(hue, sat, light + 12);
    function px(cx, cy, col) { c.fillStyle = col; c.fillRect((cx + PAD) * S, (cy + PAD) * S, S, S); }
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
      if (y >= N * 0.52 && y <= N * 0.86 && bx < N * 0.2) col = belly;
      px(x, y, col);
    }
    // 目(2x2: 白いハイライト+黒)
    [ex, N - 1 - ex].forEach(function (e) {
      c.fillStyle = '#111827'; c.fillRect((e + PAD) * S, (ey + PAD) * S, S, S);
      c.fillStyle = '#ffffff'; c.fillRect((e + PAD) * S, (ey + PAD) * S, 1, 1);
    });
    // ほっぺと口
    if (r() < 0.6) { px(ex - 1 >= 0 ? ex - 1 : ex, ey + 1, '#ff9eb5'); px(N - 1 - (ex - 1 >= 0 ? ex - 1 : ex), ey + 1, '#ff9eb5'); }
    var my = Math.min(N - 3, ey + 2);
    if (g[my][half - 1]) { c.fillStyle = '#111827'; c.fillRect((half - 1 + PAD) * S, (my + PAD) * S, S * 2, 1); }
    // ボスの王冠
    if (opts.boss) {
      var top = 0; while (top < N && !g[top][half - 1]) top++;
      c.fillStyle = '#ffd166';
      for (var k = half - 3; k <= half + 2; k++) c.fillRect((k + PAD) * S, (top - 1 + PAD) * S, S, S);
      c.fillRect((half - 3 + PAD) * S, (top - 2 + PAD) * S, S, S);
      c.fillRect((half + PAD) * S - S / 2 * 0, (top - 2 + PAD) * S, S, S);
      c.fillRect((half + 2 + PAD) * S, (top - 2 + PAD) * S, S, S);
    }
    var url = cv.toDataURL();
    imgCache[key] = url;
    return url;
  };

  /* ---------- マップのタイル(16px) ---------- */
  function sp(ctx, x, y, col, rx, ry, w, h) { ctx.fillStyle = col; ctx.fillRect(x + rx, y + ry, w, h); }

  Q.drawTile = function (ctx, t, x, y, th, fr, tx, ty) {
    var h = Q.hash(tx + ',' + ty);
    var plain = function () {
      sp(ctx, x, y, th.ground, 0, 0, 16, 16);
      if (h % 5 < 3) sp(ctx, x, y, th.g2, (h >> 3) % 14, (h >> 7) % 14, 2, 1);
      if (h % 7 < 2) sp(ctx, x, y, th.g2, (h >> 5) % 12, (h >> 9) % 12, 1, 2);
    };
    switch (t) {
      case '#': // 木
        plain();
        sp(ctx, x, y, 'rgba(0,0,0,.22)', 2, 13, 12, 2);
        sp(ctx, x, y, '#6b4a2b', 6, 10, 4, 5);
        sp(ctx, x, y, th.tree, 1, 1, 14, 11);
        sp(ctx, x, y, th.tree, 3, 0, 10, 1);
        sp(ctx, x, y, th.tree2, 3, 2, 5, 4);
        sp(ctx, x, y, th.tree2, 9, 6, 4, 3);
        sp(ctx, x, y, 'rgba(0,0,0,.18)', 2, 10, 12, 2);
        break;
      case '~': // 水
        sp(ctx, x, y, th.water, 0, 0, 16, 16);
        var o = (fr >> 3) % 4;
        sp(ctx, x, y, th.water2, (2 + o * 3 + h) % 12, 4, 4, 1);
        sp(ctx, x, y, th.water2, (9 + o * 2 + h) % 12, 11, 3, 1);
        break;
      case 'g': // 草むら
        plain();
        var sw = ((fr >> 4) & 1);
        for (var i = 0; i < 4; i++) {
          var bx = 1 + i * 4;
          sp(ctx, x, y, th.blade, bx + sw, 6, 2, 8);
          sp(ctx, x, y, th.grass, bx + 1 - sw, 3, 2, 8);
          sp(ctx, x, y, th.grass, bx + sw, 1 + (i % 2) * 2, 1, 4);
        }
        break;
      case '.': // 道
        sp(ctx, x, y, th.path, 0, 0, 16, 16);
        if (h % 4 < 2) sp(ctx, x, y, th.path2, (h >> 3) % 13, (h >> 6) % 13, 3, 2);
        if (h % 9 < 3) sp(ctx, x, y, th.path2, (h >> 4) % 13, (h >> 8) % 13, 2, 2);
        break;
      case 'F': // 花
        plain();
        sp(ctx, x, y, '#ff6b9d', 3, 4, 3, 3); sp(ctx, x, y, '#ffd166', 4, 5, 1, 1);
        sp(ctx, x, y, '#ffffff', 10, 9, 3, 3); sp(ctx, x, y, '#ffd166', 11, 10, 1, 1);
        break;
      case 'M': // 看板(ヒントNPC代わりの石碑)
        plain();
        sp(ctx, x, y, 'rgba(0,0,0,.2)', 2, 14, 12, 2);
        sp(ctx, x, y, '#8a8a99', 3, 3, 10, 11); sp(ctx, x, y, '#b5b5c5', 3, 3, 10, 2);
        sp(ctx, x, y, '#4a4a5a', 5, 6, 6, 1); sp(ctx, x, y, '#4a4a5a', 5, 9, 6, 1);
        break;
      default:
        plain();
    }
  };

  /* 人物(16x16) o: {hair, shirt, pants, hat, cape} */
  Q.drawPerson = function (ctx, x, y, o, dir, step) {
    sp(ctx, x, y, 'rgba(0,0,0,.25)', 3, 14, 10, 2);
    var legA = step ? 1 : 0;
    // 足
    sp(ctx, x, y, o.pants, 5, 11, 3, 4 - (legA ? 1 : 0));
    sp(ctx, x, y, o.pants, 8, 11, 3, 4 - (legA ? 0 : 1));
    sp(ctx, x, y, '#2b2b3a', 5, 14 - (legA ? 1 : 0), 3, 1);
    sp(ctx, x, y, '#2b2b3a', 8, 14 - (legA ? 0 : 1), 3, 1);
    // マント
    if (o.cape) sp(ctx, x, y, o.cape, 3, 6, 10, 7);
    // 体
    sp(ctx, x, y, o.shirt, 4, 7, 8, 5);
    sp(ctx, x, y, 'rgba(255,255,255,.2)', 4, 7, 8, 1);
    // うで
    sp(ctx, x, y, o.shirt, 3, 8, 1, 3); sp(ctx, x, y, o.shirt, 12, 8, 1, 3);
    // 頭
    sp(ctx, x, y, '#f2c9a0', 5, 2, 6, 6);
    // 髪
    sp(ctx, x, y, o.hair, 4, 1, 8, 3);
    if (dir === 'up') { sp(ctx, x, y, o.hair, 4, 1, 8, 6); }
    else if (dir === 'down') {
      sp(ctx, x, y, o.hair, 4, 3, 1, 2); sp(ctx, x, y, o.hair, 11, 3, 1, 2);
      sp(ctx, x, y, '#1f2937', 6, 5, 1, 1); sp(ctx, x, y, '#1f2937', 9, 5, 1, 1);
    } else if (dir === 'left') {
      sp(ctx, x, y, o.hair, 9, 3, 3, 4); sp(ctx, x, y, '#1f2937', 6, 5, 1, 1);
    } else {
      sp(ctx, x, y, o.hair, 4, 3, 3, 4); sp(ctx, x, y, '#1f2937', 9, 5, 1, 1);
    }
    if (o.hat) { sp(ctx, x, y, o.hat, 4, 0, 8, 2); sp(ctx, x, y, o.hat, 3, 2, 10, 1); }
  };

  Q.looks = {
    player: { hair: '#4a2c17', shirt: '#e63946', pants: '#274472', hat: '#ffffff' },
    teacher: { hair: '#d8d8e8', shirt: '#ffffff', pants: '#4a4a6a', hat: null },
    boss: { hair: '#2b2b3a', shirt: '#7b2cbf', pants: '#2b2b3a', hat: '#ffd166', cape: '#c9184a' },
    npc: { hair: '#8a5a2b', shirt: '#2a9d8f', pants: '#6d597a', hat: null }
  };
})();

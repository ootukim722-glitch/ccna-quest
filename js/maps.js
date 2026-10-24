/* maps.js - エリアのマップを自動生成(同じエリアはいつも同じ地形) */
(function () {
  'use strict';
  var Q = window.QUEST;
  var W = 15, H = 26;

  Q.bosses = {
    a1: { name: 'もりのヌシ ケーブルじい', intro: 'ほう、ここまで来たか…。基本の力、見せてもらおう!' },
    a2: { name: 'まちの番人 サブネット王', intro: 'アドレスの区切り方は覚えたか? 試させてもらう!' },
    a3: { name: 'たにの守護者 ブイラン将軍', intro: 'スイッチの世界を支配するのは私だ! 挑戦を受けよう!' },
    a4: { name: 'かいどうの王 ルート大王', intro: '道案内ならおまかせあれ。さあ、最短ルートを答えよ!' },
    a5: { name: 'みなとの主 ナット船長', intro: 'いろんなサービスが行き交う港だ。ついてこれるかな?' },
    a6: { name: 'とりでの騎士 ACL卿', intro: '通すか、止めるか。守りの知識を見せてみよ!' },
    a7: { name: 'とうの賢者 オート博士', intro: '作業は機械にまかせる時代だ。仕組みを理解しておるかな?' }
  };
  Q.boss = function (areaId) { return Q.bosses[areaId] || { name: 'エリアのヌシ', intro: '勝負だ!' }; };

  Q.tips = [
    'わからない問題は「消去法」だ! あきらかに違う選択肢を2つ消せば、正解率は50%に上がるよ。',
    '試験は120分。1問に使えるのは1〜2分くらい。迷ったら先へ進んで、あとで戻ろう。',
    'CCNAは英語の用語がそのまま出るよ。ずかんで英語名もいっしょに覚えておこう。',
    '毎日5分でも続けるのがいちばん強い! 連続日数をのばしていこう。',
    'サブネット計算は「ブロックサイズ = 256 − マスクの値」が最強の近道だよ。',
    '間違えた問題は宝物だよ。あとで復習に出るから、次は負けない!',
    'show コマンドの出力は「どの行を見るか」が大事。ルーティングテーブルなら先頭の記号に注目!',
    'たとえ話でイメージできれば、用語はずっと覚えやすくなるよ。',
    '夜ふかしより睡眠! 寝ている間に、脳は今日の勉強を整理してくれるんだ。',
    '試験前日は新しいことを増やさず、ずかんとふくしゅうバトルで総復習しよう。'
  ];

  var cache = {};
  Q.buildMap = function (areaId) {
    if (cache[areaId]) return cache[areaId];
    var r = Q.rng(Q.hash('map-v3-' + areaId));
    var g = [], x, y, i;
    for (y = 0; y < H; y++) { g.push([]); for (x = 0; x < W; x++) g[y].push((x === 0 || y === 0 || x === W - 1 || y === H - 1) ? '#' : ','); }
    function inside(px, py) { return px >= 1 && px <= W - 2 && py >= 1 && py <= H - 2; }
    var watery = areaId === 'a5' ? 5 : (areaId === 'a3' ? 3 : 2);

    // 池
    for (i = 0; i < watery; i++) {
      var pw = 3 + Math.floor(r() * 3), ph = 2 + Math.floor(r() * 2);
      var pxx = 1 + Math.floor(r() * (W - 2 - pw)), pyy = 5 + Math.floor(r() * (H - 11));
      for (y = pyy; y < pyy + ph; y++) for (x = pxx; x < pxx + pw; x++) if (inside(x, y)) g[y][x] = '~';
    }
    // 木と花
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      if (g[y][x] !== ',') continue;
      var v = r();
      if (v < 0.17) g[y][x] = '#'; else if (v < 0.22) g[y][x] = 'F';
    }
    // 道(下から上へ、ゆるくカーブ)
    var cx = 7, sy = H - 3, path = [];
    for (y = sy; y >= 3; y--) {
      if (y < sy && y > 4 && r() < 0.4) {
        var dir = r() < 0.5 ? -1 : 1, nx = Math.max(3, Math.min(W - 4, cx + dir));
        if (nx !== cx) { cx = nx; g[y + 1][cx] = '.'; path.push({ x: cx, y: y + 1 }); }
      }
      g[y][cx] = '.'; path.push({ x: cx, y: y });
    }
    // 出口付近
    var bossX = cx, bossY = 2;
    g[sy + 1][7] = '.'; g[sy + 1][6] = ','; g[sy + 1][8] = ',';
    for (y = 2; y <= 4; y++) for (x = bossX - 2; x <= bossX + 2; x++) if (inside(x, y) && g[y][x] !== '.') g[y][x] = ',';
    // 草むら(道の両側)
    function rowPathX(row) { for (var xx = 1; xx < W - 1; xx++) if (g[row][xx] === '.') return xx; return 7; }
    for (i = 0; i < 8; i++) {
      var gy = 6 + Math.floor(r() * (H - 12)), gx = rowPathX(gy), side = r() < 0.5 ? -1 : 1;
      var gw = 3 + Math.floor(r() * 2), gh = 2 + Math.floor(r() * 2);
      for (y = gy; y < gy + gh; y++) for (x = 0; x < gw; x++) {
        var tx = side < 0 ? gx - 1 - x : gx + 1 + x;
        if (inside(tx, y) && g[y][tx] !== '.' && g[y][tx] !== '~') g[y][tx] = 'g';
      }
    }
    // 道の途中の足もと(道そのものが草むらに接する場所を確保)
    var teacherY = sy - 2, tx0 = rowPathX(teacherY), tdir = (g[teacherY][tx0 + 1] !== '.' ? 1 : -1);
    var tpos = { x: tx0 + tdir, y: teacherY };
    g[tpos.y][tpos.x] = 'T';
    // 周りの逃げ道
    [[tpos.x + tdir, tpos.y], [tpos.x, tpos.y - 1], [tpos.x, tpos.y + 1]].forEach(function (p) { if (inside(p[0], p[1]) && g[p[1]][p[0]] === '#') g[p[1]][p[0]] = ','; });
    // NPC
    var npcs = [];
    [Math.floor(H * 0.55), Math.floor(H * 0.35)].forEach(function (ny, k) {
      var nx0 = rowPathX(ny), nd = (k % 2 ? -1 : 1);
      var nx = nx0 + nd;
      if (!inside(nx, ny) || g[ny][nx] === '.') nx = nx0 - nd;
      if (inside(nx, ny) && g[ny][nx] !== '.') { g[ny][nx] = 'N'; npcs.push({ x: nx, y: ny, tip: (k + Q.hash(areaId)) % Q.tips.length }); }
    });
    // ボス
    g[bossY][bossX] = 'B';
    g[bossY - 1][bossX] = '#';

    var rows = g.map(function (row) { return row.join(''); });
    var spawn = { x: 7, y: sy };
    var m = { w: W, h: H, rows: rows, spawn: spawn, teacher: tpos, boss: { x: bossX, y: bossY }, npcs: npcs };
    cache[areaId] = m;
    return m;
  };
})();

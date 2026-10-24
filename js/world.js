/* world.js - マップ移動、会話、野生モンスターとの遭遇 */
(function () {
  'use strict';
  var Q = window.QUEST, ui = Q.ui;
  var TILE = 16, VW = 9, VH = 11, STEP_MS = 150;
  var SOLID = '#~TBNM';

  var Wd = Q.world = {
    area: null, map: null, x: 0, y: 0, dir: 'up', moving: false, t: 0, fx: 0, fy: 0,
    held: null, frame: 0, busy: false, running: false, sinceEnc: 0, stepAlt: 0, last: 0
  };
  var canvas, ctx;

  function tileAt(x, y) {
    var m = Wd.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return '#';
    return m.rows[y].charAt(x);
  }

  Wd.enter = function (areaId, atSpawn) {
    var area = Q.area(areaId) || Q.areas[0];
    Wd.area = area; Wd.map = Q.buildMap(area.id);
    Q.S.pos.area = area.id; Q.write();
    Wd.x = Wd.map.spawn.x; Wd.y = Wd.map.spawn.y; Wd.dir = 'up'; Wd.moving = false; Wd.held = null; Wd.sinceEnc = 0;
    ui.show('map'); Q.bgm('map');
    Wd.updateHud();
    Wd.start();
  };

  Wd.updateHud = function () {
    ui.$('hud-area').textContent = Wd.area.name;
    var n = Q.caughtIn(Wd.area), t = Wd.area.monsters.length;
    ui.$('hud-prog').textContent = Wd.area.domain + '　ずかん ' + n + '/' + t + (Q.S.badges[Wd.area.id] ? '　🏅' : '');
  };

  /* ---------- 描画 ---------- */
  function draw(now) {
    var th = Q.theme(Wd.area.id), fr = Wd.frame;
    var px = Wd.x * TILE, py = Wd.y * TILE;
    if (Wd.moving) {
      var k = Math.min(1, Wd.t / STEP_MS);
      px = (Wd.fx + (Wd.x - Wd.fx) * k) * TILE; py = (Wd.fy + (Wd.y - Wd.fy) * k) * TILE;
    }
    var camX = Math.round(px + 8 - VW * TILE / 2), camY = Math.round(py + 8 - VH * TILE / 2);
    camX = Math.max(0, Math.min(Wd.map.w * TILE - VW * TILE, camX));
    camY = Math.max(0, Math.min(Wd.map.h * TILE - VH * TILE, camY));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    var tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
    for (var ty = ty0; ty <= ty0 + VH; ty++) for (var tx = tx0; tx <= tx0 + VW; tx++) {
      var ch = tileAt(tx, ty), sx = tx * TILE - camX, sy = ty * TILE - camY;
      var base = (ch === 'T' || ch === 'B' || ch === 'N') ? ',' : ch;
      Q.drawTile(ctx, base, sx, sy, th, fr, tx, ty);
      if (ch === 'T' || ch === 'B' || ch === 'N') {
        var look = ch === 'T' ? Q.looks.teacher : ch === 'B' ? Q.looks.boss : Q.looks.npc;
        var face = 'down';
        Q.drawPerson(ctx, sx, sy, look, face, 0);
        if (ch === 'B') { ctx.fillStyle = 'rgba(255,209,102,.9)'; ctx.fillRect(sx + 6, sy - 3 + ((fr >> 4) & 1), 4, 2); }
        if (ch === 'T' && !(Q.S.taught && Q.S.taught[Wd.area.id])) { ctx.fillStyle = '#ffd166'; ctx.fillRect(sx + 7, sy - 4 + ((fr >> 4) & 1), 2, 2); }
      }
    }
    // プレイヤー
    Q.drawPerson(ctx, px - camX, py - camY, Q.looks.player, Wd.dir, Wd.moving && ((Wd.t / (STEP_MS / 2)) | 0) % 2);
  }

  /* ---------- 更新 ---------- */
  function dirVec(d) { return d === 'up' ? [0, -1] : d === 'down' ? [0, 1] : d === 'left' ? [-1, 0] : [1, 0]; }

  function tryMove(d) {
    Wd.dir = d;
    var v = dirVec(d), nx = Wd.x + v[0], ny = Wd.y + v[1], ch = tileAt(nx, ny);
    if (SOLID.indexOf(ch) >= 0) {
      if ('TBN'.indexOf(ch) >= 0) { Wd.held = null; Wd.interact(nx, ny, ch); } else Q.sfx('bump');
      return false;
    }
    Wd.fx = Wd.x; Wd.fy = Wd.y; Wd.x = nx; Wd.y = ny; Wd.moving = true; Wd.t = 0;
    return true;
  }

  function arrive() {
    Q.S.stats.steps++;
    Wd.sinceEnc++;
    Q.sfx('step');
    var ch = tileAt(Wd.x, Wd.y);
    if (ch === 'g' && Wd.sinceEnc >= 3 && Math.random() < 0.28) { Wd.sinceEnc = 0; Wd.encounter(); }
  }

  function loop(now) {
    if (!Wd.running) return;
    requestAnimationFrame(loop);
    var dt = Math.min(60, now - (Wd.last || now)); Wd.last = now;
    Wd.frame++;
    if (!Wd.busy) {
      if (Wd.moving) {
        Wd.t += dt;
        if (Wd.t >= STEP_MS) { Wd.moving = false; arrive(); if (!Wd.busy && Wd.held) tryMove(Wd.held); }
      } else if (Wd.held) {
        tryMove(Wd.held);
      }
    }
    draw(now);
  }

  Wd.start = function () { if (Wd.running) return; Wd.running = true; Wd.last = 0; requestAnimationFrame(loop); };
  Wd.stop = function () { Wd.running = false; Wd.held = null; };

  /* ---------- 会話 ---------- */
  Wd.interact = async function (x, y, ch) {
    if (Wd.busy) return;
    Wd.busy = true; Wd.held = null;
    try {
      var a = Wd.area;
      if (ch === 'T') {
        await ui.say(a.teacher && a.teacher.pages && a.teacher.pages.length ? a.teacher.pages : ['この エリアの せつめいは じゅんびちゅうだよ。'], (a.teacher && a.teacher.name) || 'せんせい');
        Q.S.taught = Q.S.taught || {}; Q.S.taught[a.id] = 1; Q.S.taught_any = 1; Q.write();
        await ui.say('草むら(濃い緑のところ)を歩くと、モンスターに出会えるよ。\nまずは説明を読んでからバトルしよう!', a.teacher && a.teacher.name);
      } else if (ch === 'N') {
        var npc = Wd.map.npcs.filter(function (n) { return n.x === x && n.y === y; })[0];
        await ui.say(Q.tips[(npc ? npc.tip : 0)] || Q.tips[0], 'たびのひと');
      } else if (ch === 'B') {
        await Wd.bossTalk();
      }
    } finally { Wd.busy = false; }
  };

  Wd.bossTalk = async function () {
    var a = Wd.area, b = Q.boss(a.id), n = Q.caughtIn(a), t = a.monsters.length, need = Math.ceil(t * 0.7);
    if (n < need) {
      await ui.say(['…まだ早いな。', 'この エリアの なかまを あと ' + (need - n) + ' 体(' + need + '体いじょう)つれてこい!\n(いま ' + n + '/' + t + '体)'], b.name);
      return;
    }
    await ui.say(b.intro, b.name);
    var yes = await ui.confirm(a.name + ' のボスに ちょうせんする?\n全5問、やる気(❤️)は3つ。', 'ちょうせん!', 'まだ やめとく');
    if (!yes) return;
    await ui.flash();
    var picks = pickBossQuestions(a, 5);
    var res = await Q.battle({
      kind: 'boss', area: a, mon: { id: 'boss-' + a.id, areaId: a.id }, img: Q.monImg('boss-' + a.id, { boss: true, areaId: a.id }),
      enemyName: b.name, enemyTerm: a.domain, intro: b.intro, questions: picks, hp: picks.length, hearts: 3
    });
    Wd.afterBattle();
    if (res.won) await ui.say('見事だ…! バッジを授けよう。\n試験でも この調子でいけるぞ!', b.name);
    else await ui.say('今回はここまでだ。ずかんを見直して、また来い!', b.name);
  };

  function pickBossQuestions(a, n) {
    // 習熟度が低いモンスターを優先して、1体につき1問
    var mons = Q.shuffle(a.monsters).sort(function (x, y) { return Q.mastery(x) - Q.mastery(y); }).slice(0, n);
    while (mons.length < n && a.monsters.length) mons.push(Q.pick(a.monsters));
    return mons.map(function (m) { return Q.chooseQuestion(m, []); });
  }

  /* ---------- 遭遇 ---------- */
  function pickWild(area) {
    // 学ぶ順に少しずつ解放: 仲間の数 + 3 体まで
    var list = area.monsters, caught = Q.caughtIn(area);
    var pool = list.slice(0, caught + 3);
    var weights = pool.map(function (m) {
      var w = 1;
      if (!Q.isCaught(m)) w += 3;
      else if (Q.monDue(m)) w += 3;
      else w += (1 - Q.mastery(m)) * 1.5;
      return w;
    });
    var sum = weights.reduce(function (s, x) { return s + x; }, 0), r = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  Wd.encounter = async function () {
    if (Wd.busy) return;
    Wd.busy = true; Wd.held = null;
    try {
      var m = pickWild(Wd.area);
      if (!m) return;
      Q.bgm(null);
      Q.sfx('encounter'); await ui.flash();
      var wasCaught = Q.isCaught(m);
      var res = await Q.battle({ kind: 'wild', mon: m, area: Wd.area, hp: wasCaught ? 2 : (m.tier >= 2 ? 3 : 2), hearts: 3 });
      Wd.afterBattle();
      if (res.won && res.newly) {
        var a = Wd.area, n = Q.caughtIn(a), need = Math.ceil(a.monsters.length * 0.7);
        if (n === need) ui.toast('ボスに挑戦できるようになったよ!');
        else ui.toast('ずかん ' + Q.totalCaught() + '/' + Q.totalMon());
      }
    } finally { Wd.busy = false; }
  };

  Wd.afterBattle = function () {
    ui.show('map'); Q.bgm('map'); Wd.updateHud(); Wd.moving = false; Wd.held = null;
  };

  /* ---------- 入力 ---------- */
  Wd.initInput = function () {
    canvas = ui.$('map'); ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    var btns = document.querySelectorAll('.dpad button');
    btns.forEach(function (b) {
      b.style.touchAction = 'none';
      var d = b.getAttribute('data-dir');
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); Q.audioUnlock(); Wd.held = d; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (x) { } });
      function up() { if (Wd.held === d) Wd.held = null; b.classList.remove('on'); }
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    ui.$('btn-a').addEventListener('pointerdown', function (e) { e.preventDefault(); Wd.action(); });
    var keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    document.addEventListener('keydown', function (e) {
      if (ui.current !== 'map' || Wd.busy) return;
      if (keys[e.key]) { e.preventDefault(); Wd.held = keys[e.key]; }
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); Wd.action(); }
    });
    document.addEventListener('keyup', function (e) { if (keys[e.key] && Wd.held === keys[e.key]) Wd.held = null; });
  };

  Wd.action = function () {
    if (Wd.busy || Wd.moving) return;
    var v = dirVec(Wd.dir), nx = Wd.x + v[0], ny = Wd.y + v[1], ch = tileAt(nx, ny);
    if ('TBN'.indexOf(ch) >= 0) Wd.interact(nx, ny, ch);
    else ui.toast('目の前には なにもないよ');
  };
})();

/* pa-world.js - マップ移動、建物の出入り、会話、トレーナー、草むら、復習所、ジム */
(function () {
  'use strict';
  var Q = window.QUEST, PA = Q.pa, ui = PA.ui, $ = ui.$;
  var T = 16, VW = 11, VH = 13, STEP = 140;
  var SOLID = '#~rwvMfX=STPCHKI';

  var Wd = PA.world = {
    map: null, mapId: '', npcs: [], w: 0, h: 0, x: 0, y: 0, dir: 'up', moving: false, t: 0, fx: 0, fy: 0,
    held: null, frame: 0, busy: false, last: 0, sinceEnc: 0, heal: 0, bang: null, bump: 0
  };
  var canvas, ctx, timer = null;

  function S() { return Q.S.pa; }
  function vec(d) { return d === 'up' ? [0, -1] : d === 'down' ? [0, 1] : d === 'left' ? [-1, 0] : [1, 0]; }
  function opposite(d) { return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left'; }
  function faceTo(from, to) {
    var dx = to.x - from.x, dy = to.y - from.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.h) return '#';
    return Wd.map.rows[y].charAt(x);
  }
  function solidAt(x, y) {
    var ch = tileAt(x, y);
    if (ch === 'X') return !S().flags.starter;
    return SOLID.indexOf(ch) >= 0;
  }
  function npcAt(x, y) {
    for (var i = 0; i < Wd.npcs.length; i++) if (Wd.npcs[i].x === x && Wd.npcs[i].y === y) return Wd.npcs[i];
    return null;
  }
  function warpAt(x, y) {
    var l = Wd.map.warps || [];
    for (var i = 0; i < l.length; i++) if (l[i].x === x && l[i].y === y) return l[i];
    return null;
  }
  function say(pages, name) {
    Wd.busy = true; Wd.held = null;
    return ui.say(pages, name).then(function () { Wd.busy = false; });
  }

  /* ---------- マップに入る ---------- */
  Wd.enter = function (id, x, y, dir) {
    var m = PA.maps[id];
    Wd.map = m; Wd.mapId = id; Wd.w = m.rows[0].length; Wd.h = m.rows.length;
    Wd.npcs = (m.npcs || []).map(function (n) { var c = {}; for (var k in n) c[k] = n[k]; c.ox = 0; c.oy = 0; return c; });
    Wd.x = x; Wd.y = y; Wd.dir = dir || 'up'; Wd.moving = false; Wd.held = null; Wd.sinceEnc = 0; Wd.bang = null;
    var p = S().pos; p.map = id; p.x = x; p.y = y; p.dir = Wd.dir;
    Q.write();
    ui.show('world'); Q.bgm(m.bgm || 'map'); Wd.updateHud();
    Wd.start();
  };

  Wd.updateHud = function () {
    ui.$('hud-area').textContent = Wd.map.name;
    var n = Q.caughtIn(Q.area('a1')), tot = Q.area('a1').monsters.length, due = Q.dueIds('a1').length;
    ui.$('hud-prog').textContent = 'なかま ' + n + '/' + tot + '  バッジ ' + (Q.S.badges.a1 ? 1 : 0) + '/1  ふくしゅう ' + due;
  };

  /* ---------- 描画 ---------- */
  function draw() {
    var m = Wd.map, th = Q.theme(m.theme || 'a1'), fr = Wd.frame;
    var px = Wd.x * T, py = Wd.y * T;
    if (Wd.moving) {
      var k = Math.min(1, Wd.t / STEP);
      px = (Wd.fx + (Wd.x - Wd.fx) * k) * T; py = (Wd.fy + (Wd.y - Wd.fy) * k) * T;
    }
    var camX = Math.round(px + 8 - VW * T / 2), camY = Math.round(py + 8 - VH * T / 2);
    if (Wd.w * T <= VW * T) camX = -Math.round((VW * T - Wd.w * T) / 2); else camX = Math.max(0, Math.min(Wd.w * T - VW * T, camX));
    if (Wd.h * T <= VH * T) camY = -Math.round((VH * T - Wd.h * T) / 2); else camY = Math.max(0, Math.min(Wd.h * T - VH * T, camY));
    ctx.fillStyle = '#0b1226'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    var env = { map: m, theme: th, fr: fr, tileAt: tileAt, heal: Wd.heal, opened: !!S().flags.starter };
    var tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx, ty;
    for (ty = ty0; ty <= ty0 + VH; ty++) for (tx = tx0; tx <= tx0 + VW; tx++) {
      if (tx < 0 || ty < 0 || tx >= Wd.w || ty >= Wd.h) continue;
      PA.drawTile(ctx, tileAt(tx, ty), tx * T - camX, ty * T - camY, tx, ty, env);
    }
    /* 人物は、下にいる人ほど手前に描く */
    var list = Wd.npcs.map(function (n) { return { y: n.y + n.oy, n: n }; });
    list.push({ y: py / T, p: true });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) {
      if (o.p) {
        Q.drawPerson(ctx, px - camX, py - camY, PA.looks.player, Wd.dir, Wd.moving && ((Wd.t / (STEP / 2)) | 0) % 2);
        return;
      }
      var n = o.n, sx = Math.round((n.x + n.ox) * T - camX), sy = Math.round((n.y + n.oy) * T - camY);
      if (sx < -T || sy < -T || sx > VW * T || sy > VH * T) return;
      Q.drawPerson(ctx, sx, sy, PA.looks[n.look] || PA.looks.villager1, n.dir, (n.ox || n.oy) ? ((fr >> 3) & 1) : 0);
      if (n.kind === 'teacher' && !S().flags.starter) { ctx.fillStyle = '#ffd166'; ctx.fillRect(sx + 7, sy - 4 + ((fr >> 4) & 1), 2, 2); }
      if (n.kind === 'leader' && !Q.S.badges.a1) { ctx.fillStyle = '#ffd166'; ctx.fillRect(sx + 6, sy - 3 + ((fr >> 4) & 1), 4, 2); }
      if (Wd.bang === n) PA.drawBang(ctx, sx, sy);
    });
  }

  /* ---------- 更新 ---------- */
  function lockMsg(wp) {
    if (wp.need === 'gym') {
      var n = Q.totalCaught();
      if (n < PA.CFG.GYM_NEED) {
        return ['ジムの とびらは かたく とじている。\nはり紙「なかまが ' + PA.CFG.GYM_NEED + 'たい いじょうの ものだけ はいれる」',
          'いま なかまは ' + n + 'たい。\nあと ' + (PA.CFG.GYM_NEED - n) + 'たい! くさむらで なかまを あつめよう。'];
      }
    }
    return null;
  }

  function tryMove(d) {
    Wd.dir = d;
    var v = vec(d), nx = Wd.x + v[0], ny = Wd.y + v[1];
    if (npcAt(nx, ny)) { bump(); return false; }
    if (solidAt(nx, ny)) {
      if (tileAt(nx, ny) === 'X') { Wd.held = null; say(['この さきは そうげんが ひろがっていて あぶないぞ!', 'まずは ハカセの いえ(ひだりうえの あかい やね)で\n「さいしょの なかま」を もらおう。']); }
      else bump();
      return false;
    }
    var wp = warpAt(nx, ny);
    if (wp && wp.need) {
      var lk = lockMsg(wp);
      if (lk) { Wd.held = null; say(lk); return false; }
    }
    Wd.fx = Wd.x; Wd.fy = Wd.y; Wd.x = nx; Wd.y = ny; Wd.moving = true; Wd.t = 0;
    return true;
  }
  function bump() { if (Wd.bump <= 0) { Q.sfx('bump'); Wd.bump = 14; } }

  function checkTrainer() {
    for (var i = 0; i < Wd.npcs.length; i++) {
      var n = Wd.npcs[i];
      if (n.kind !== 'trainer' || S().beat[n.id]) continue;
      var v = vec(n.dir);
      for (var k = 1; k <= n.sight; k++) {
        var tx = n.x + v[0] * k, ty = n.y + v[1] * k;
        if (solidAt(tx, ty) || npcAt(tx, ty)) break;
        if (tx === Wd.x && ty === Wd.y) return n;
      }
    }
    return null;
  }

  function arrive() {
    Q.S.stats.steps++; Wd.sinceEnc++;
    Q.sfx('step');
    var wp = warpAt(Wd.x, Wd.y);
    if (wp) { doWarp(wp); return; }
    var p = S().pos; p.x = Wd.x; p.y = Wd.y; p.dir = Wd.dir;
    var tr = checkTrainer();
    if (tr) { trainerEncounter(tr, true); return; }
    if (tileAt(Wd.x, Wd.y) === 'g' && Wd.sinceEnc >= 2 && Math.random() < 0.22) { Wd.sinceEnc = 0; wildEncounter(); }
  }

  function loop() {
    var now = performance.now(), dt = Math.min(60, now - (Wd.last || now)); Wd.last = now;
    if (ui.current !== 'world') return;
    Wd.frame++; if (Wd.bump > 0) Wd.bump--;
    if (!Wd.busy) {
      if (Wd.moving) {
        Wd.t += dt;
        if (Wd.t >= STEP) { Wd.moving = false; arrive(); if (!Wd.busy && Wd.held) tryMove(Wd.held); }
      } else if (Wd.held) tryMove(Wd.held);
    }
    draw();
  }
  Wd.start = function () { if (timer) return; timer = setInterval(loop, 16); };

  async function doWarp(wp) {
    Wd.busy = true; Wd.held = null;
    if (wp.door) PA.sfx('door');
    await ui.fade(true);
    Wd.enter(wp.to, wp.tx, wp.ty, wp.dir);
    await ui.fade(false);
    Wd.busy = false;
  }

  /* ---------- バトルのきっかけ ---------- */
  async function afterBattle(res) {
    ui.show('world');
    Wd.moving = false; Wd.held = null;
    await PA.evolveAll();
    if (res.wiped) { await blackout(); return; }
    Q.bgm(Wd.map.bgm || 'map'); Wd.updateHud(); Q.write();
  }
  async function fight(opts) {
    Q.bgm(null); PA.sfx('encounter'); await ui.flash();
    var res = await PA.battle(opts);
    await afterBattle(res);
    return res;
  }
  async function blackout() {
    await ui.say(['たたかえる なかまが みんな たおれてしまった…', 'めのまえが まっくらに なった…']);
    await ui.fade(true);
    PA.healAll();
    Wd.enter('center', 5, 6, 'up');
    await ui.fade(false);
    await ui.say(['ぶじで よかった! みんな すっかり げんきに なったよ。', 'まけても ぜんぜん だいじょうぶ。\nまちがえた もんだいは「ふくしゅう」に のこるから、あとで おさらいしようね。'], 'おねえさん');
  }

  /* 野生 */
  function pickWild() {
    var list = Q.area('a1').monsters, caught = Q.caughtIn(Q.area('a1'));
    var pool = list.slice(0, Math.min(list.length, caught + 4));
    var weights = pool.map(function (m) {
      var w = 1;
      if (!Q.isCaught(m)) w += 4; else if (Q.monDue(m)) w += 3; else w += (1 - Q.mastery(m));
      return w;
    });
    var sum = weights.reduce(function (s, x) { return s + x; }, 0), r = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }
  async function wildEncounter() {
    if (Wd.busy) return;
    Wd.busy = true; Wd.held = null;
    try {
      var m = pickWild(), lv = Math.max(2, PA.maxLv() - 1 + Math.floor(Math.random() * 3));
      var res = await fight({ kind: 'wild', bg: 'grass', foes: [{ id: m.id, lv: lv, hits: 2 }] });
      if (res.recruited) ui.toast('ずかん ' + Q.totalCaught() + '/' + Q.area('a1').monsters.length);
    } finally { Wd.busy = false; }
  }

  /* トレーナー */
  function moveNpc(n, dir) {
    return new Promise(function (resolve) {
      var v = vec(dir); n.x += v[0]; n.y += v[1]; n.dir = dir; n.ox = -v[0]; n.oy = -v[1];
      var t0 = performance.now(), iv = setInterval(function () {
        var k = Math.min(1, (performance.now() - t0) / STEP);
        n.ox = -v[0] * (1 - k); n.oy = -v[1] * (1 - k);
        if (k >= 1) { clearInterval(iv); n.ox = 0; n.oy = 0; resolve(); }
      }, 16);
    });
  }
  async function trainerEncounter(n, spotted) {
    if (Wd.busy && spotted === false) return;
    Wd.busy = true; Wd.held = null;
    try {
      if (spotted) {
        Wd.bang = n; PA.sfx('alert'); await ui.wait(700); Wd.bang = null;
        while (Math.abs(n.x - Wd.x) + Math.abs(n.y - Wd.y) > 1) await moveNpc(n, n.dir);
      }
      n.dir = faceTo(n, { x: Wd.x, y: Wd.y }); Wd.dir = opposite(n.dir);
      await ui.say(n.pre, n.name);
      var lv = PA.maxLv();
      var res = await fight({
        kind: 'trainer', bg: 'grass', trainer: { name: n.name },
        foes: n.team.map(function (t) { return { id: t.id, lv: Math.max(2, lv + (t.d || 0)), hits: 1 }; })
      });
      if (res.won) {
        S().beat[n.id] = 1; Q.write();
        await ui.say(n.win, n.name);
      }
    } finally { Wd.busy = false; }
  }

  /* ---------- 話しかける ---------- */
  Wd.action = function () {
    if (Wd.busy || Wd.moving || ui.current !== 'world') return;
    var v = vec(Wd.dir), nx = Wd.x + v[0], ny = Wd.y + v[1], ch = tileAt(nx, ny);
    var npc = npcAt(nx, ny);
    if (!npc && ch === 'C') npc = npcAt(nx + v[0], ny + v[1]);      /* カウンターごしに話す */
    if (npc) { talk(npc); return; }
    if (ch === 'M') { signTalk(nx, ny); return; }
    if (ch === 'K') { openBox(); return; }
    if (ch === 'H') { ui.toast('回復きかいだ。おねえさんに はなしかけよう'); return; }
    ui.toast('めのまえには なにもないよ');
  };

  async function signTalk(x, y) {
    var pages = Wd.map.signs && Wd.map.signs[x + ',' + y];
    await say(pages || ['なにか かいてある。'], '看板');
  }
  async function openBox() {
    Wd.busy = true; Wd.held = null;
    await PA.screens.box();
    ui.show('world'); Wd.busy = false;
  }

  async function talk(n) {
    if (Wd.busy) return;
    Wd.busy = true; Wd.held = null;
    try {
      n.dir = faceTo(n, { x: Wd.x, y: Wd.y });
      if (n.kind === 'teacher') await teacherTalk(n);
      else if (n.kind === 'nurse') await nurseTalk(n);
      else if (n.kind === 'leader') await leaderTalk(n);
      else if (n.kind === 'trainer') {
        if (S().beat[n.id]) await ui.say(n.after, n.name);
        else { Wd.busy = false; await trainerEncounter(n, false); }
      } else {
        var f = PA.talk[n.id];
        await ui.say(f ? f(S()) : ['…'], '');
      }
    } finally { Wd.busy = false; }
  }

  /* ハカセ: 説明を聞く + さいしょの仲間 */
  async function teacherTalk(n) {
    var a = Q.area('a1'), t = a.teacher, f = S().flags;
    if (!f.starter) {
      await ui.say(['ようこそ、ネットワーク村へ!'].concat(t.pages), t.name);
      await ui.say(['さて、きみの「さいしょの なかま」を えらんでもらおう。', 'どちらも ネットワークの だいじな やくわりを もつ モンスターじゃ。'], t.name);
      var id = null;
      while (!id) {
        var pick = await PA.screens.pickStarter(['a1-router', 'a1-switch']);
        if (!pick) { await ui.say('ゆっくり かんがえて、また はなしかけておくれ。', t.name); return; }
        var yes = await ui.choose(PA.stageName(pick, 0) + ' (' + Q.mon[pick].term + ') に する?', ['この子に する', 'もういちど えらぶ']);
        if (yes === 0) id = pick;
      }
      PA.recruit(id, PA.CFG.START_LV);
      f.starter = true; S().started = true; Q.write();
      PA.sfx('catch');
      await ui.say([PA.stageName(id, 0) + ' を てにいれた!\n(ずかんに とうろくされた)']);
      await ui.say([
        'モンスターは、たたかって かてば なかまに なってくれるぞ。',
        'たたかいでは「たたかう」を えらぶと もんだいが でる。\nただしい こたえで こうげきが あたり、まちがえると はんげきされるぞ。',
        '「ヒント」を つかうと たとえ話が みられる。ただし もらえる けいけんちは はんぶんじゃ。',
        'ロープは はずしておいた。きたの 1ばんどうろで れんしゅうして、\nなかまを ' + PA.CFG.GYM_NEED + 'たい あつめたら ジムに ちょうせんじゃ!',
        'つかれたら 青い やねの ふくしゅうじょへ。\nなかまを やすませて くれるぞ。'
      ], t.name);
      return;
    }
    var c = await ui.choose('ハカセに なにを きく?', ['もういちど せつめいを きく', 'これから どうすればいい?', 'やめる']);
    if (c === 0) await ui.say(t.pages, t.name);
    else if (c === 1) {
      var have = Q.totalCaught();
      if (Q.S.badges.a1) await ui.say(['ジムの バッジを てにいれたな。りっぱじゃ!', 'ずかんを みなおして、まちがえた もんだいを ふくしゅうするのじゃ。'], t.name);
      else if (have < PA.CFG.GYM_NEED) await ui.say(['いま なかまは ' + have + 'たい。ジムには ' + PA.CFG.GYM_NEED + 'たい いるぞ。', '1ばんどうろの くさむらで たたかって、なかまを ふやすのじゃ。'], t.name);
      else await ui.say(['なかまが そろったな! きたの ジムに ちょうせんじゃ。', 'もんだいに まよったら「ヒント」を つかうのも ひとつの てじゃよ。'], t.name);
    }
  }

  /* ふくしゅうじょ */
  async function nurseTalk(n) {
    var nm = 'おねえさん';
    await ui.say('ようこそ、ふくしゅうじょへ! ここでは なかまを やすませて あげられるよ。', nm);
    var c = await ui.choose('なかまを やすませる?', ['おねがいする', 'いまは いいや']);
    if (c === 0) {
      await ui.say('それでは、おあずかりするね。', nm);
      PA.healAll();
      await healAnim();
      await ui.say('おまたせ! みんな すっかり げんきに なったよ!', nm);
    }
    var due = Q.dueIds('a1').length;
    if (due >= PA.CFG.DUE_GUIDE) {
      await ui.say(['ところで… まちがえやすい もんだいが ' + due + 'もん たまっているみたい。', 'ふくしゅうバトルで おさらいすると、ぐっと おぼえやすくなるよ!'], nm);
      var c2 = await ui.choose('ふくしゅうバトルを する?', ['する', 'あとで']);
      if (c2 === 0) await reviewBattle();
    } else {
      await ui.say('いま ふくしゅうが ひつような もんだいは ' + due + 'もん。いい ちょうしだね!', nm);
    }
  }
  async function healAnim() {
    PA.sfx('heal');
    for (var i = 1; i <= 6; i++) { Wd.heal = i; await ui.wait(250); }
    await ui.wait(450); Wd.heal = 0;
  }
  async function reviewBattle() {
    var ids = Q.dueIds('a1'), mons = [];
    Q.shuffle(ids).forEach(function (id) { var m = Q.qs[id].mon; if (mons.indexOf(m) < 0) mons.push(m); });
    mons = mons.slice(0, 3);
    if (!mons.length) return;
    var lv = PA.maxLv();
    await fight({ kind: 'review', bg: 'grass', trainer: { name: 'ふくしゅう' }, foes: mons.map(function (m) { return { id: m.id, lv: lv, hits: 1 }; }) });
  }

  /* ジムリーダー */
  async function leaderTalk(n) {
    var nm = 'ケーブルじい';
    if (Q.S.badges.a1) {
      await ui.say(['…きみは もう バッジを もっているな。', 'ふくしゅうを つづけて、ほんばんの しけんに そなえるのじゃ。'], nm);
      return;
    }
    await ui.say(['ほう、ここまで きたか…。', 'ワシは ケーブルじい。もりの ヌシと よばれておる。', 'きほんの ちから、みせてもらおう!\n5もん せいかいできれば きみの かちじゃ。', 'まちがえると つよい はんげきが とんでくるぞ。きをつけるのじゃ。'], nm);
    var c = await ui.choose('ジムリーダーに ちょうせんする?', ['ちょうせんする', 'まだ やめておく']);
    if (c !== 0) { await ui.say('うむ、じゅんびが できたら また くるがよい。', nm); return; }
    var lv = Math.max(10, PA.maxLv() + 2);
    var res = await fight({
      kind: 'gym', bg: 'gym', trainer: { name: 'ジムリーダー ケーブルじい' }, bossName: 'ケーブルじい', bossTerm: 'ジムリーダー',
      foes: [{ boss: true, id: 'boss', lv: lv, hits: 5 }]
    });
    if (res.won) {
      Wd.busy = true;
      Q.S.badges.a1 = 1; Q.write(); Wd.updateHud();
      PA.sfx('badge');
      var ov = $('badge'); $('badge-img').src = PA.badgeImg(); ov.hidden = false;
      await ui.say(['ケーブルじいに かった!', 'ネットワーク ジムの バッジを てにいれた!']);
      ov.hidden = true;
      await ui.say(['みごとじゃ…! きほんの ちからは しっかり ついておる。', 'この ちょうしで ほかの エリアも めざすがよい。'], nm);
      await PA.screens.ending();
      ui.show('world'); Q.bgm(Wd.map.bgm || 'map');
    } else if (!res.wiped) {
      await ui.say('また ちょうせん するがよい。', nm);
    }
  }

  /* ---------- 入力 ---------- */
  Wd.initInput = function () {
    canvas = $('map'); ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    document.querySelectorAll('.dpad button').forEach(function (b) {
      b.style.touchAction = 'none';
      var d = b.getAttribute('data-dir');
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); PA.unlock(); Wd.held = d; b.classList.add('on');
        try { b.setPointerCapture(e.pointerId); } catch (x) { /* 失敗しても遊べる */ }
      });
      function up() { if (Wd.held === d) Wd.held = null; b.classList.remove('on'); }
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    $('btn-a').addEventListener('pointerdown', function (e) { e.preventDefault(); PA.unlock(); Wd.action(); });
    var keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    document.addEventListener('keydown', function (e) {
      if (ui.current !== 'world' || Wd.busy) return;
      if (keys[e.key]) { e.preventDefault(); Wd.held = keys[e.key]; }
      else if ((e.key === 'Enter' || e.key === ' ' || e.key === 'z') && !e.repeat) { e.preventDefault(); Wd.action(); }
    });
    document.addEventListener('keyup', function (e) { if (keys[e.key] && Wd.held === keys[e.key]) Wd.held = null; });
  };
})();

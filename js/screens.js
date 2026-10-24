/* screens.js - タイトル、メニュー、ずかん、エリア選択、ふくしゅう、計算ドリル、もぎしけん、せってい */
(function () {
  'use strict';
  var Q = window.QUEST, ui = Q.ui, Wd = Q.world;
  var S = Q.screens = {};

  var EXAM_W = { a1: 11, a2: 9, a3: 20, a4: 25, a5: 10, a6: 15, a7: 10 };
  var RANKS = ['みならい', 'ルーキー', 'ちゅうきゅうしゃ', 'じょうきゅうしゃ', 'エキスパート', 'CCNAマスター'];
  function rank() {
    var r = Q.totalCaught() / Math.max(1, Q.totalMon());
    var i = r >= 1 ? 5 : r >= 0.8 ? 4 : r >= 0.55 ? 3 : r >= 0.3 ? 2 : r >= 0.1 ? 1 : 0;
    return RANKS[i];
  }
  function toMap() { ui.show('map'); Q.bgm('map'); Wd.updateHud(); }

  /* ---------- タイトル ---------- */
  S.title = function () {
    var el = ui.$('s-title');
    var ids = Q.areas.length ? Q.areas.map(function (a) { return a.monsters[0] && a.monsters[0].id; }).filter(Boolean) : [];
    var pick = Q.shuffle(ids).slice(0, 3);
    var mons = pick.map(function (id) { return '<img class="px" src="' + Q.monImg(id) + '" alt="">'; }).join('');
    var hasName = !!Q.S.name;
    var h = '<div class="logo">' + Q.esc(Q.title) + '</div><div class="logo-sub">ネットワークの世界を冒険して、資格をゲットしよう</div>' +
      '<div class="title-mons">' + mons + '</div><div class="title-box">';
    if (hasName) {
      h += '<div class="card" style="text-align:left"><div style="font-weight:800">おかえり、' + Q.esc(Q.S.name) + ' (' + rank() + ')</div>' +
        '<div class="muted">れんぞく ' + (Q.S.streak.last === Q.day() || Q.S.streak.last === Q.day() - 1 ? Q.S.streak.days : 0) + ' 日　ずかん ' + Q.totalCaught() + '/' + Q.totalMon() + '</div>' +
        '<div class="muted">きょうは ' + Q.S.daily.answered + ' 問 こたえたよ</div></div>' +
        '<button class="btn go center" data-act="go">つづきから あそぶ</button>';
    } else {
      h += '<input class="input" id="name-in" maxlength="8" placeholder="あなたの なまえ" value="">' +
        '<button class="btn go center" data-act="new">ぼうけんを はじめる</button>';
    }
    h += '<div class="muted" style="margin-top:8px">データは このスマホの中だけに保存されます</div></div>';
    el.innerHTML = h;
    ui.show('title');
    ui.bind(el, {
      go: function () { Q.audioUnlock(); startGame(); },
      'new': async function () {
        var v = (ui.$('name-in').value || '').trim() || 'あなた';
        Q.S.name = v; Q.write(); Q.audioUnlock();
        await startGame(true);
      }
    });
  };

  async function startGame(first) {
    Wd.initOnce();
    var area = (Q.area(Q.S.pos.area) || Q.areas[0]).id;
    Wd.enter(area, true);
    if (first || !Q.S.intro) {
      Q.S.intro = 1; Q.write();
      await ui.say([
        'ようこそ、' + Q.S.name + '! わしは ハカセ。ネットワークの せかいへ ようこそ。',
        'この世界には「ようご」の モンスターが すんでいる。\nクイズに 勝って なかまに しよう!',
        '草むら(濃い緑)を歩くと バトル! 正解すると こうげき、まちがえると やる気ゲージが へる。\n0に なっても ペナルティは ないから あんしんしてね。',
        '説明は 先生(白い服の人)が たとえ話で 教えてくれる。\nまずは 先生に 話しかけてみよう! 右上の「メニュー」で ずかん・ふくしゅう・もぎしけん も使えるよ。'
      ], 'ハカセ');
    }
  }

  /* ---------- メニュー ---------- */
  S.menu = function () {
    var due = Q.dueIds().length, seen = Object.keys(Q.S.srs).length;
    var acc = Q.S.stats.ans ? Math.round(Q.S.stats.ok / Q.S.stats.ans * 100) : 0;
    var rec = '';
    if (due >= 5) rec = 'ふくしゅう が ' + due + ' 問 たまってるよ。ふくしゅうバトルで 思い出そう!';
    else {
      var next = Q.areas.filter(function (a) { return Q.caughtIn(a) < Math.ceil(a.monsters.length * 0.7); })[0];
      rec = next ? 'おすすめ: 「' + next.name + '」で 仲間を ふやそう' : 'ぜんぶのエリアで準備OK! もぎしけんで 実力を試そう';
    }
    var h = '<div class="card"><div style="font-weight:800;font-size:1.05rem">' + Q.esc(Q.S.name) + '　<span class="tag gold">' + rank() + '</span></div>' +
      '<div class="muted">れんぞく ' + (Q.S.streak.last >= Q.day() - 1 ? Q.S.streak.days : 0) + ' 日　ずかん ' + Q.totalCaught() + '/' + Q.totalMon() + ' 体　せいかいりつ ' + acc + '%</div>' +
      '<div class="muted" style="margin-top:6px">' + rec + '</div></div>' +
      '<button class="btn" data-act="dex">ずかん<small>集めた用語の説明を いつでも読める</small></button>' +
      '<button class="btn ' + (due ? 'primary' : '') + '" data-act="review">ふくしゅうバトル<small>' + (due ? due + ' 問 思い出す時期が来ています' : 'いま出す時期の問題はありません(弱点おさらいもできます)') + '</small></button>' +
      '<button class="btn" data-act="areas">エリア いどう<small>ばっじ ' + Object.keys(Q.S.badges).length + '/' + Q.areas.length + '</small></button>' +
      '<button class="btn" data-act="drill">けいさんドリル<small>サブネット計算を 自動で何度でも</small></button>' +
      '<button class="btn" data-act="exam">もぎしけん<small>試験の出題分野の割合で 出題</small></button>' +
      '<button class="btn" data-act="settings">せってい・バックアップ</button>';
    var body = ui.panel('メニュー', h, { onBack: toMap });
    ui.bind(body, { dex: function () { S.dex(); }, review: S.review, areas: S.areas, drill: S.drill, exam: S.exam, settings: S.settings });
  };

  /* ---------- ずかん ---------- */
  var dexArea = null;
  S.dex = function (areaId) {
    dexArea = areaId || dexArea || Q.areas[0].id;
    var tabs = '<div class="tabs">' + Q.areas.map(function (a) {
      return '<button data-act="tab" data-arg="' + a.id + '" class="' + (a.id === dexArea ? 'on' : '') + '">' + Q.esc(a.name) + ' ' + Q.caughtIn(a) + '/' + a.monsters.length + '</button>';
    }).join('') + '</div>';
    var area = Q.area(dexArea);
    var grid = '<div class="dex-grid">' + area.monsters.map(function (m) {
      var got = Q.isCaught(m), st = Q.stars(m);
      return '<div class="dex-cell ' + (got ? '' : 'unk') + '" data-act="mon" data-arg="' + m.id + '"><img class="px" src="' + Q.monImg(m.id) + '" alt="">' +
        '<div class="n">' + (got ? Q.esc(m.nick) : '？？？') + '</div><div class="stars">' + (got ? Q.pips(st, 3) : '') + '</div></div>';
    }).join('') + '</div>';
    var body = ui.panel('ずかん', tabs + grid, { onBack: S.menu });
    ui.bind(body, { tab: function (id) { S.dex(id); }, mon: function (id) { S.monDetail(id); } });
    var on = body.querySelector('.tabs .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  };

  S.monDetail = function (id) {
    var m = Q.mon[id];
    if (!Q.isCaught(m)) { ui.toast('まだ出会っていないよ。草むらで さがそう!'); return; }
    var st = Q.stars(m), h = '<img class="px big-mon" src="' + Q.monImg(m.id) + '" alt="">' +
      '<div class="card"><h3>' + Q.esc(m.nick) + '　<span class="stars">' + Q.pips(st, 3) + '</span></h3><div class="muted">' + Q.esc(m.term) + '</div>' +
      '<div class="learn-card"><div class="analogy">たとえると: ' + Q.rich(m.analogy || '') + '</div><ul>' + (m.points || []).map(function (p) { return '<li>' + Q.rich(p) + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="card"><h3>この用語の問題</h3>' + m.qlist.map(function (q) {
        var r = Q.S.srs[q.id];
        return '<div class="row" style="justify-content:space-between;padding:4px 0"><span class="muted">' + (r ? '練習 ' + r.seen + '回 / 正解 ' + r.ok + '回' : 'まだ解いていない') + '</span><span class="tag ' + (r && r.box >= 3 ? 'ok' : '') + '">' + (r && r.box >= 3 ? '身についた' : '練習中') + '</span></div>';
      }).join('') + '</div>';
    ui.panel(m.nick, h, { onBack: function () { S.dex(m.areaId); } });
  };

  /* ---------- エリア選択 ---------- */
  S.areas = function () {
    var h = Q.areas.map(function (a) {
      var n = Q.caughtIn(a), t = a.monsters.length, pct = Math.round(n / t * 100);
      return '<button class="btn" data-act="go" data-arg="' + a.id + '"><div class="row" style="justify-content:space-between"><span>' + Q.esc(a.name) + (Q.S.badges[a.id] ? ' (バッジ取得)' : '') + '</span><span class="tag">' + n + '/' + t + '</span></div>' +
        '<small>' + Q.esc(a.domain) + (EXAM_W[a.id] ? '(試験の約' + EXAM_W[a.id] + '%)' : '') + '</small><div class="bar" style="margin-top:6px"><i style="width:' + pct + '%"></i></div></button>';
    }).join('');
    var body = ui.panel('エリア いどう', h, { onBack: S.menu });
    ui.bind(body, { go: function (id) { Wd.enter(id, true); } });
  };

  /* ---------- ふくしゅうバトル ---------- */
  S.review = async function () {
    var ids = Q.dueIds();
    ids.sort(function (a, b) { return Q.S.srs[a].box - Q.S.srs[b].box || Q.S.srs[a].due - Q.S.srs[b].due; });
    ids = ids.slice(0, 10);
    var extra = false;
    if (ids.length < 5) {
      var weak = Object.keys(Q.S.srs).filter(function (id) { return Q.qs[id] && ids.indexOf(id) < 0; });
      weak.sort(function (a, b) { return Q.S.srs[a].box - Q.S.srs[b].box; });
      ids = ids.concat(weak.slice(0, 8 - ids.length)); extra = true;
    }
    if (ids.length < 3) { ui.toast('まだ 復習する問題が少ないよ。まずはバトルで なかまを ふやそう!'); return; }
    var qs = Q.shuffle(ids).map(function (id) { return Q.qs[id]; });
    await ui.flash();
    var res = await Q.battle({
      kind: 'review', mon: { id: 'forget', areaId: 'a3' }, img: Q.monImg('forget', { areaId: 'a3' }),
      enemyName: 'ワスレモン', enemyTerm: extra ? '弱点おさらい' : 'ふくしゅう', questions: qs, hp: qs.length, hearts: 5,
      intro: extra ? '時期が来た問題が少ないから、苦手そうなものを まぜて出すよ。' : '忘れかけた頃に ふくしゅうすると、記憶はぐんと強くなるよ。'
    });
    S.menu();
  };

  /* ---------- 計算ドリル ---------- */
  var drillLevel = 1;
  S.drill = function () {
    var K = Q.gen.kinds;
    var h = '<div class="card"><h3>計算のコツ</h3><div class="muted" style="line-height:1.7">ブロックサイズ = 256 − マスクの値。<br>例: /26 のマスクは 255.255.255.192 → ブロックサイズ 64。<br>ネットワークアドレスは 0, 64, 128, 192…。ブロードキャストは「次のネットワークの1つ前」!</div></div>' +
      '<div class="row" style="margin-bottom:10px"><span class="tag">むずかしさ</span><button class="tabs-btn tag ' + (drillLevel === 1 ? 'gold' : '') + '" data-act="lv" data-arg="1" style="border:0">ふつう(/24〜/30)</button><button class="tag ' + (drillLevel === 2 ? 'gold' : '') + '" data-act="lv" data-arg="2" style="border:0">むずかしい(/16〜)</button></div>' +
      '<button class="btn primary" data-act="start" data-arg="mix">ミックス 10問<small>ぜんぶのタイプから ランダム</small></button>' +
      Object.keys(K).map(function (k) { return '<button class="btn" data-act="start" data-arg="' + k + '">' + Q.esc(K[k].label) + '<small>10問</small></button>'; }).join('');
    var body = ui.panel('けいさんドリル', h, { onBack: S.menu });
    ui.bind(body, {
      lv: function (v) { drillLevel = +v; S.drill(); },
      start: function (kind) { S.drillRun(kind); }
    });
  };
  S.drillRun = async function (kind) {
    var qs = Q.gen.set(kind, 10, drillLevel);
    var res = await Q.quiz({ title: 'けいさんドリル', questions: qs, instant: true, record: false });
    if (!res) { S.drill(); return; }
    var again = await Q.quizResult('ドリルの結果', res, '', [{ id: 'again', label: 'もう1セット', cls: 'primary' }, { id: 'back', label: 'ドリルえらびへ' }]);
    if (again === 'again') S.drillRun(kind); else S.drill();
  };

  /* ---------- もぎしけん ---------- */
  S.exam = function () {
    var last = Q.S.exams.slice(-3).reverse().map(function (e) { return '<div class="row" style="justify-content:space-between"><span class="muted">' + e.date + '(' + e.n + '問)</span><b>' + e.pct + '%</b></div>'; }).join('');
    var h = '<div class="card"><div class="muted" style="line-height:1.7">CCNAの出題分野の割合に合わせて出題します。<br>解答中は答え合わせをせず、最後にまとめて解説します(本番の練習)。<br>目安は 80%以上。</div></div>' +
      '<button class="btn primary" data-act="start" data-arg="20">ミニ もぎしけん 20問<small>約15分</small></button>' +
      '<button class="btn" data-act="start" data-arg="40">ほんばん風 もぎしけん 40問<small>約30分</small></button>' +
      (last ? '<div class="card"><h3>これまでの成績</h3>' + last + '</div>' : '');
    var body = ui.panel('もぎしけん', h, { onBack: S.menu });
    ui.bind(body, { start: function (n) { S.examRun(+n); } });
  };
  S.examRun = async function (n) {
    var picked = [], total = 0;
    Q.areas.forEach(function (a) { total += (EXAM_W[a.id] || 10); });
    Q.areas.forEach(function (a) {
      var cnt = Math.max(1, Math.round(n * (EXAM_W[a.id] || 10) / total));
      var pool = [];
      Q.shuffle(a.monsters).forEach(function (m) { pool.push(Q.pick(m.qlist)); });
      picked = picked.concat(pool.slice(0, cnt));
    });
    picked = Q.shuffle(picked).slice(0, n).map(Q.prep);
    var res = await Q.quiz({ title: 'もぎしけん', questions: picked, instant: false, record: true });
    if (!res) { S.exam(); return; }
    var pct = Math.round(res.correct / res.total * 100);
    Q.S.exams.push({ date: new Date().toLocaleDateString('ja-JP'), n: res.total, pct: pct }); Q.S.exams = Q.S.exams.slice(-20); Q.write();
    var br = '<div class="card"><h3>分野ごとの結果</h3>' + Q.areas.map(function (a) {
      var b = res.byArea[a.id]; if (!b) return '';
      var p = Math.round(b.ok / b.n * 100);
      return '<div style="margin-bottom:8px"><div class="row" style="justify-content:space-between"><span>' + Q.esc(a.name) + '</span><span>' + b.ok + '/' + b.n + '</span></div><div class="bar"><i style="width:' + p + '%"></i></div></div>';
    }).join('') + '<div class="muted">まちがえた問題は「ふくしゅうバトル」に出るよ。</div></div>';
    Q.sfx(pct >= 80 ? 'win' : 'lose');
    var next = await Q.quizResult('もぎしけんの結果', res, br, [{ id: 'again', label: 'もういちど', cls: 'primary' }, { id: 'menu', label: 'メニューへ' }]);
    if (next === 'again') S.exam(); else S.menu();
  };

  /* ---------- せってい ---------- */
  S.settings = function () {
    var h = '<button class="btn" data-act="sfx">こうかおん: ' + (Q.S.set.sfx ? 'ON' : 'OFF') + '</button>' +
      '<button class="btn" data-act="bgm">BGM: ' + (Q.S.set.bgm ? 'ON' : 'OFF') + '</button>' +
      '<button class="btn" data-act="export">バックアップ(コピー)<small>進み具合を文字にしてコピーします。機種変更や念のための保存に</small></button>' +
      '<button class="btn" data-act="import">バックアップから戻す<small>コピーした文字を貼りつけます</small></button>' +
      '<button class="btn" data-act="reset" style="background:#7f1d1d">さいしょからやり直す<small>ぜんぶ消えます</small></button>' +
      '<div class="muted" style="margin-top:10px">' + Q.esc(Q.title) + '　ずかん ' + Q.totalMon() + ' 体 / 問題 ' + Object.keys(Q.qs).length + ' 問</div>';
    var body = ui.panel('せってい', h, { onBack: S.menu });
    ui.bind(body, {
      sfx: function () { Q.S.set.sfx = !Q.S.set.sfx; Q.write(); S.settings(); },
      bgm: function () { Q.S.set.bgm = !Q.S.set.bgm; Q.write(); Q.bgmRefresh(); S.settings(); },
      export: function () {
        var txt = JSON.stringify(Q.S);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { ui.toast('コピーしました。メモ帳などに貼って保存してね'); }, function () { window.prompt('これをコピーして保存してね', txt); });
        else window.prompt('これをコピーして保存してね', txt);
      },
      import: function () {
        var txt = window.prompt('バックアップの文字を貼りつけてください');
        if (!txt) return;
        try { var o = JSON.parse(txt); if (!o || typeof o !== 'object' || !o.caught) throw 0; Q.S = o; Q.write(); Q.load(); ui.toast('復元しました'); S.settings(); } catch (e) { ui.toast('うまく読み込めませんでした'); }
      },
      reset: async function () {
        if (await ui.confirm('ほんとうに ぜんぶ消して、さいしょからやり直しますか?', 'けす', 'やめる') && await ui.confirm('もとには戻せません。ほんとうに いいですか?', 'ぜんぶ消す', 'やめる')) {
          Q.reset(); Wd.stop(); Q.bgm(null); S.title();
        }
      }
    });
  };
})();

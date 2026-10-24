/* pa-screens.js - タイトル、メニュー、手持ち、ずかん、ボックス、最初の仲間えらび、エンディング */
(function () {
  'use strict';
  var Q = window.QUEST, PA = Q.pa, ui = PA.ui, $ = ui.$;
  var SC = PA.screens = {};

  function Wd() { return PA.world; }
  function P() { return Q.S.pa; }

  /* ---------- タイトル ---------- */
  SC.title = function () {
    Q.bgm(null);
    var started = !!(Q.S.pa && Q.S.pa.started);
    var rid = 'a1-router';
    var el = $('s-title');
    el.innerHTML =
      '<div class="logo">CCNAクエスト</div>' +
      '<div class="logo-sub">試作A  そだてて、たたかって、そろえる</div>' +
      '<div class="title-mons"><img class="px" src="' + PA.monImg(rid, 0) + '" alt=""><img class="px" src="' + PA.monImg(rid, 1) + '" alt=""><img class="px" src="' + PA.monImg(rid, 2) + '" alt=""></div>' +
      '<div class="title-box">' +
      (started ? '<button class="btn go center" data-act="cont">つづきから</button>' : '') +
      '<button class="btn ' + (started ? '' : 'go ') + 'center" data-act="new">はじめから</button>' +
      '<button class="btn center" data-act="snd">おと: ' + (Q.S.set.sfx ? 'ON' : 'OFF') + '</button>' +
      '<div class="muted tcenter">矢印キー/十字ボタンで いどう、Enter/ボタンで けってい</div>' +
      '</div>';
    ui.show('title');
    ui.bind(el, {
      cont: function () { PA.unlock(); SC.continueGame(); },
      new: async function () {
        PA.unlock();
        if (started) {
          var c = await ui.choose('いままでの データを けして、はじめから あそぶ?', ['はじめから', 'やめる']);
          if (c !== 0) return;
        }
        SC.newGame();
      },
      snd: function () {
        Q.S.set.sfx = !Q.S.set.sfx; Q.S.set.bgm = Q.S.set.sfx; Q.write(); PA.unlock(); SC.title();
      }
    });
  };

  SC.continueGame = function () {
    PA.ensure();
    var p = P().pos, m = PA.maps[p.map] ? p : { map: 'town', x: 10, y: 12, dir: 'up' };
    if (!P().party.length && P().flags.starter) P().flags.starter = false;
    Wd().initOnce();
    Wd().enter(m.map, m.x, m.y, m.dir);
  };
  SC.newGame = async function () {
    var set = Q.S.set;
    Q.reset(); Q.S.set = set; PA.ensure();
    P().started = true; P().pos = { map: 'town', x: 10, y: 12, dir: 'up' };
    Q.write();
    Wd().initOnce();
    Wd().enter('town', 10, 12, 'up');
    Wd().busy = true;
    await ui.say(['ここは ネットワーク村。\nきみの ぼうけんが、いま はじまる!', 'まずは ひだりうえの あかい やねの いえへ。\nハカセが きみを まっているよ。'], '');
    Wd().busy = false;
  };

  /* ---------- メニュー ---------- */
  SC.openMenu = function () {
    var w = Wd();
    if (w.busy || ui.current !== 'world') return;
    w.busy = true; w.held = null;
    SC.menu();
  };
  function closeMenu() {
    ui.show('world'); Wd().busy = false; Wd().updateHud();
  }
  SC.menu = function () {
    var due = Q.dueIds('a1').length;
    var h = '<button class="btn" data-act="party">てもち<small>なかまの レベル・HP・しんかを みる</small></button>' +
      '<button class="btn" data-act="zukan">ずかん<small>' + Q.totalCaught() + ' / ' + Q.area('a1').monsters.length + ' たい  ふくしゅうが ひつよう: ' + due + 'もん</small></button>' +
      '<button class="btn" data-act="box">ボックス<small>' + P().box.length + 'たい あずけている</small></button>' +
      '<button class="btn" data-act="snd">おと: ' + (Q.S.set.sfx ? 'ON' : 'OFF') + '</button>' +
      '<button class="btn" data-act="title">タイトルへ もどる<small>ここまでは じどうで セーブされているよ</small></button>';
    var body = ui.panel('メニュー', h, closeMenu);
    ui.bind(body, {
      party: function () { SC.party(SC.menu); },
      zukan: function () { SC.zukan(SC.menu); },
      box: function () { SC.box().then(SC.menu); },
      snd: function () { Q.S.set.sfx = !Q.S.set.sfx; Q.S.set.bgm = Q.S.set.sfx; Q.write(); Q.bgmRefresh(); SC.menu(); },
      title: function () { Q.write(); Wd().busy = false; SC.title(); }
    });
  };

  /* ---------- 手持ち ---------- */
  function evoPips(stage) { return '<span class="evopips">' + Q.pips(stage + 1, 3) + '</span>'; }

  function detailHtml(m, d, stage, level) {
    var nm = PA.stageName(d.id, stage);
    var h = '<div class="detail">' +
      '<img class="px bigmon st' + stage + '" src="' + PA.monImg(d.id, stage) + '" alt="">' +
      '<div class="dname">' + Q.esc(nm) + (level ? ' <span class="tag">Lv' + level + '</span>' : '') + '</div>' +
      '<div class="muted tcenter">' + Q.esc(PA.stageLabel[stage]) + ' ' + evoPips(stage) + '</div>';
    if (m) {
      var max = PA.maxHp(m);
      h += '<div class="statrow"><span>HP</span>' + ui.bar('hp ' + (m.hp / max > 0.5 ? 'g' : m.hp / max > 0.2 ? 'y' : 'r'), m.hp / max) + '<span>' + m.hp + '/' + max + '</span></div>' +
        '<div class="statrow"><span>EXP</span>' + ui.bar('exp', m.exp / PA.need(m.lv)) + '<span>' + m.exp + '/' + PA.need(m.lv) + '</span></div>';
    }
    h += '<div class="evoline">';
    [0, 1, 2].forEach(function (s) {
      var open = m ? s <= m.stage : s <= stage;
      var range = s === 0 ? 'Lv1-' + (PA.EVO1 - 1) : s === 1 ? 'Lv' + PA.EVO1 + '-' + (PA.EVO2 - 1) : 'Lv' + PA.EVO2 + '-';
      h += '<div class="evocell' + (s === stage ? ' cur' : '') + '"><img class="px' + (open ? '' : ' sil') + '" src="' + PA.monImg(d.id, s) + '" alt=""><small>' + range + '</small></div>';
    });
    h += '</div>';
    h += '<div class="card"><h3>' + Q.esc(d.term) + '</h3>' +
      '<div class="analogy">たとえ話: ' + Q.esc(d.analogy) + '</div>' +
      '<ul class="points">' + d.points.map(function (p) { return '<li>' + Q.esc(p) + '</li>'; }).join('') + '</ul></div>';
    var st = Q.stars(d);
    h += '<div class="muted tcenter">おぼえ具合 ' + Q.pips(st, 3) + (Q.monDue(d) ? '  <span class="tag gold">ふくしゅう</span>' : '') + '</div>';
    return h + '</div>';
  }

  SC.party = function (back) {
    var p = P().party;
    var h = '<div class="muted">さいだい ' + PA.CFG.PARTY_MAX + 'たい。いちばん うえの 子が さいしょに でるよ。</div>';
    p.forEach(function (m, i) {
      var d = Q.mon[m.id], max = PA.maxHp(m);
      h += '<div class="pcard' + (m.hp <= 0 ? ' down' : '') + '" data-act="pd" data-arg="' + i + '">' +
        '<img class="px pimg" src="' + PA.monImg(m.id, m.stage) + '" alt="">' +
        '<div class="pbody"><div class="prow"><b>' + Q.esc(PA.stageName(m.id, m.stage)) + '</b><span class="tag">Lv' + m.lv + '</span>' + evoPips(m.stage) + '</div>' +
        '<div class="muted">' + Q.esc(d.term) + '</div>' +
        '<div class="statrow"><span>HP</span>' + ui.bar('hp ' + (m.hp / max > 0.5 ? 'g' : m.hp / max > 0.2 ? 'y' : 'r'), m.hp / max) + '<span>' + m.hp + '/' + max + '</span></div>' +
        '<div class="statrow"><span>EXP</span>' + ui.bar('exp', m.exp / PA.need(m.lv)) + '<span>' + (PA.need(m.lv) - m.exp) + '</span></div>' +
        '</div></div>';
    });
    var body = ui.panel('てもち', h, back);
    ui.bind(body, { pd: function (i) { SC.partyDetail(+i, back); } });
  };
  SC.partyDetail = function (i, back) {
    var p = P().party, m = p[i], d = Q.mon[m.id];
    var h = detailHtml(m, d, m.stage, m.lv) + '<div class="actions">' +
      (i > 0 ? '<button class="btn go center" data-act="first">いちばん まえに する</button>' : '') +
      (p.length > 1 ? '<button class="btn center" data-act="tobox">ボックスに あずける</button>' : '') + '</div>';
    var body = ui.panel(PA.stageName(m.id, m.stage), h, function () { SC.party(back); });
    ui.bind(body, {
      first: function () { p.splice(i, 1); p.unshift(m); Q.write(); SC.party(back); },
      tobox: function () { p.splice(i, 1); P().box.push(m); Q.write(); SC.party(back); }
    });
  };

  /* ---------- ずかん ---------- */
  SC.zukan = function (back) {
    var a = Q.area('a1'), due = Q.dueIds('a1').length;
    var h = '<div class="muted">つかまえた: ' + Q.caughtIn(a) + ' / ' + a.monsters.length + '   ふくしゅうが ひつよう: ' + due + 'もん</div><div class="dex-grid">';
    a.monsters.forEach(function (m, i) {
      var c = Q.isCaught(m);
      h += '<div class="dex-cell' + (c ? '' : ' unk') + '" data-act="zd" data-arg="' + m.id + '">' +
        (c && Q.monDue(m) ? '<i class="duemark"></i>' : '') +
        '<img class="px" src="' + PA.monImg(m.id, 0) + '" alt="">' +
        '<div class="n">' + (i < 9 ? '0' : '') + (i + 1) + '<br>' + (c ? Q.esc(m.nick) : '？？？') + '</div>' +
        (c ? '<div>' + Q.pips(Q.stars(m), 3) + '</div>' : '') + '</div>';
    });
    h += '</div>';
    var body = ui.panel('ずかん', h, back);
    ui.bind(body, {
      zd: function (id) {
        var d = Q.mon[id];
        if (!Q.isCaught(d)) { ui.toast('まだ であっていない モンスターだよ'); return; }
        var inst = null;
        P().party.concat(P().box).forEach(function (m) { if (m.id === id) inst = m; });
        var h2 = detailHtml(inst, d, inst ? inst.stage : 0, inst ? inst.lv : 0);
        var b2 = ui.panel(d.nick, h2, function () { SC.zukan(back); });
        ui.bind(b2, {});
      }
    });
  };

  /* ---------- ボックス ---------- */
  SC.box = function () {
    return new Promise(function (resolve) {
      function render() {
        var box = P().box, party = P().party;
        var h = '<div class="muted">てもち ' + party.length + ' / ' + PA.CFG.PARTY_MAX + '  ボックス ' + box.length + 'たい</div>';
        if (!box.length) h += '<div class="card muted">ボックスは からっぽです。\nてもちが いっぱいの ときに なかまにした子が ここに くるよ。</div>';
        box.forEach(function (m, i) {
          h += '<div class="pcard" data-act="bx" data-arg="' + i + '"><img class="px pimg" src="' + PA.monImg(m.id, m.stage) + '" alt="">' +
            '<div class="pbody"><div class="prow"><b>' + Q.esc(PA.stageName(m.id, m.stage)) + '</b><span class="tag">Lv' + m.lv + '</span></div>' +
            '<div class="muted">' + Q.esc(Q.mon[m.id].term) + '</div>' +
            '<div class="muted">タップで てもちに くわえる / いれかえる</div></div></div>';
        });
        var body = ui.panel('ボックス', h, function () { resolve(); });
        ui.bind(body, {
          bx: function (i) {
            i = +i;
            if (party.length < PA.CFG.PARTY_MAX) { party.push(box.splice(i, 1)[0]); Q.write(); render(); return; }
            var h2 = '<div class="muted">てもちが いっぱいです。だれと いれかえる?</div>';
            party.forEach(function (m, k) {
              h2 += '<div class="pcard" data-act="sw" data-arg="' + k + '"><img class="px pimg" src="' + PA.monImg(m.id, m.stage) + '" alt="">' +
                '<div class="pbody"><div class="prow"><b>' + Q.esc(PA.stageName(m.id, m.stage)) + '</b><span class="tag">Lv' + m.lv + '</span></div></div></div>';
            });
            var b2 = ui.panel('いれかえ', h2, render);
            ui.bind(b2, { sw: function (k) { k = +k; var t = party[k]; party[k] = box[i]; box[i] = t; Q.write(); render(); } });
          }
        });
      }
      render();
    });
  };

  /* ---------- さいしょの仲間をえらぶ ---------- */
  SC.pickStarter = function (ids) {
    return new Promise(function (resolve) {
      var h = '<div class="muted">どちらかを えらんでね。ずかんに のっている ていどの 子たちだよ。</div>';
      ids.forEach(function (id) {
        var d = Q.mon[id];
        h += '<div class="card starter" data-act="pk" data-arg="' + id + '"><img class="px" src="' + PA.monImg(id, 0) + '" alt="">' +
          '<div><h3>' + Q.esc(d.nick) + '</h3><div class="muted">' + Q.esc(d.term) + '</div>' +
          '<div class="analogy">たとえ話: ' + Q.esc(d.analogy) + '</div></div></div>';
      });
      function fin(v) { ui.show('world'); resolve(v); }
      var body = ui.panel('さいしょの なかま', h, function () { fin(null); });
      ui.bind(body, { pk: function (id) { fin(id); } });
    });
  };

  /* ---------- エンディング(ジムクリア) ---------- */
  SC.ending = function () {
    return new Promise(function (resolve) {
      var s = Q.S.stats, acc = s.ans ? Math.round(s.ok * 100 / s.ans) : 0;
      var lead = P().party[0];
      var h = '<div class="tcenter"><img class="px bigmon" src="' + PA.badgeImg() + '" alt="" style="width:88px;height:88px">' +
        '<div class="big-num">ジム クリア!</div>' +
        '<div class="muted">はじまりの森(Network Fundamentals)の ジムを とっぱした!</div></div>' +
        '<div class="card"><h3>ここまでの きろく</h3><div class="result-list">' +
        '<div class="item">なかま: ' + Q.totalCaught() + ' / ' + Q.area('a1').monsters.length + ' たい</div>' +
        '<div class="item">こたえた もんだい: ' + s.ans + ' もん(せいかいりつ ' + acc + '%)</div>' +
        '<div class="item">いちばん まえの なかま: ' + Q.esc(PA.stageName(lead.id, lead.stage)) + ' Lv' + lead.lv + '</div>' +
        '<div class="item">ふくしゅうが ひつよう: ' + Q.dueIds('a1').length + ' もん</div></div></div>' +
        '<div class="muted">これで 試作Aは ここまで。ふくしゅうじょで おさらいを つづけても いいよ。</div>' +
        '<button class="btn go center" data-act="ok">つづけて あそぶ</button>';
      var body = ui.panel('ジム クリア', h, function () { resolve(); });
      ui.bind(body, { ok: function () { resolve(); } });
    });
  };
})();

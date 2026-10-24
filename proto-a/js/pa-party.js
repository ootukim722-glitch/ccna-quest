/* pa-party.js - 手持ち(パーティ)、レベル、経験値、進化、ボックス */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PA = Q.pa = Q.pa || {};

  /* セーブデータの用意(Q.load のあとに呼ぶ) */
  PA.ensure = function () {
    var S = Q.S;
    if (!S.pa || typeof S.pa !== 'object') S.pa = {};
    var p = S.pa;
    if (!p.party) p.party = [];
    if (!p.box) p.box = [];
    if (!p.flags) p.flags = {};
    if (!p.beat) p.beat = {};
    if (!p.pos) p.pos = { map: 'town', x: 10, y: 12, dir: 'up' };
    if (p.started === undefined) p.started = false;
    return p;
  };
  PA.P = function () { return Q.S.pa; };

  /* ---------- 数字 ---------- */
  PA.need = function (lv) { return 18 + 6 * lv; };                       /* 次のレベルまでの経験値 */
  PA.maxHp = function (m) {
    var d = Q.mon[m.id];
    return 16 + m.lv * 4 + ((d && d.tier) || 1) * 2;
  };
  PA.baseDmg = function (lv) { return 6 + 2 * lv; };                     /* 正解したときのダメージのもと */
  PA.alive = function (m) { return m.hp > 0; };
  PA.maxLv = function () {
    var mx = 1;
    PA.P().party.forEach(function (m) { if (m.lv > mx) mx = m.lv; });
    return mx;
  };
  PA.firstAlive = function () {
    var p = PA.P().party;
    for (var i = 0; i < p.length; i++) if (p[i].hp > 0) return i;
    return -1;
  };
  PA.aliveCount = function () { return PA.P().party.filter(PA.alive).length; };

  PA.newMon = function (id, lv) {
    var m = { id: id, lv: lv, exp: 0, hp: 0, stage: PA.stageOf(lv) };
    m.hp = PA.maxHp(m);
    return m;
  };

  /* 仲間にする。手持ちがいっぱいならボックスへ。'party' か 'box' を返す */
  PA.recruit = function (id, lv) {
    var p = PA.P(), m = PA.newMon(id, lv), where;
    if (p.party.length < PA.CFG.PARTY_MAX) { p.party.push(m); where = 'party'; } else { p.box.push(m); where = 'box'; }
    if (!Q.S.caught[id]) { Q.S.caught[id] = 1; Q.S.daily.caught++; }
    Q.write();
    return where;
  };

  /* 経験値を加える。レベルアップのたびに {lv, hpUp} を入れた配列を返す */
  PA.addExp = function (m, n) {
    var ups = [];
    if (m.lv >= PA.CFG.MAXLV) return ups;
    m.exp += n;
    while (m.exp >= PA.need(m.lv) && m.lv < PA.CFG.MAXLV) {
      var oldMax = PA.maxHp(m);
      m.exp -= PA.need(m.lv);
      m.lv++;
      var up = PA.maxHp(m) - oldMax;
      if (m.hp > 0) m.hp += up;
      ups.push({ lv: m.lv, hpUp: up });
    }
    if (m.lv >= PA.CFG.MAXLV) m.exp = 0;
    return ups;
  };

  PA.healAll = function () {
    var p = PA.P();
    p.party.forEach(function (m) { m.hp = PA.maxHp(m); });
    Q.write();
  };
  PA.hurtCount = function () {
    return PA.P().party.filter(function (m) { return m.hp < PA.maxHp(m); }).length;
  };

  PA.canEvolve = function (m) { return PA.stageOf(m.lv) > m.stage; };

  /* ---------- 進化の演出 ---------- */
  PA.evolve = async function (m) {
    var ui = PA.ui, $ = ui.$;
    var from = m.stage, to = PA.stageOf(m.lv);
    var oldName = PA.stageName(m.id, from), newName = PA.stageName(m.id, to);
    var oldSrc = PA.monImg(m.id, from), newSrc = PA.monImg(m.id, to);
    var ov = $('evo'), im = $('evo-img');
    Q.bgm(null);
    im.className = 'px'; im.src = oldSrc;
    ov.hidden = false; void ov.offsetWidth; ov.classList.add('on');
    await ui.say('…おや? ' + oldName + ' の ようすが…!');
    PA.sfx('evolve');
    var delay = 520, i;
    for (i = 0; i < 18; i++) {
      im.className = 'px sil'; im.src = (i % 2 ? newSrc : oldSrc);
      await ui.wait(delay * 0.55);
      im.className = 'px sil-w';
      await ui.wait(delay * 0.45);
      delay = Math.max(90, delay * 0.86);
    }
    m.stage = to;
    im.src = newSrc; im.className = 'px reveal';
    var ring = $('evo-ring'); ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
    await ui.wait(900);
    await ui.say(oldName + ' は ' + newName + ' に しんかした!');
    var ex = Q.mon[m.id];
    if (ex) await ui.say(ex.term + ' の ちからが ふえた!\nたとえ話は そのままだよ。\n' + ex.analogy);
    ov.classList.remove('on'); ov.hidden = true;
    Q.write();
  };

  /* 手持ちの進化待ちを全部すませる */
  PA.evolveAll = async function () {
    var p = PA.P();
    for (var i = 0; i < p.party.length; i++) {
      if (PA.canEvolve(p.party[i])) await PA.evolve(p.party[i]);
    }
    /* ボックスの子は、見えないところで進む */
    p.box.forEach(function (m) { m.stage = PA.stageOf(m.lv); });
  };
})();

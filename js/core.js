/* core.js - 名前空間、教材の登録、セーブ、復習(間隔反復) */
(function () {
  'use strict';
  var Q = window.QUEST = window.QUEST || {};
  Q.packId = 'ccna';
  Q.title = 'CCNAクエスト';
  Q.packs = {};
  Q.areas = [];
  Q.mon = {};
  Q.qs = {};
  Q.warnings = [];

  /* ---------- 便利関数 ---------- */
  Q.hash = function (s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  Q.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  Q.shuffle = function (arr, r) {
    r = r || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  Q.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  Q.esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };
  /* `コード` を <code> に変換した安全なHTMLを返す */
  Q.rich = function (s) {
    return Q.esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  };
  Q.day = function () {
    return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  };

  /* ---------- 教材の登録 ---------- */
  Q.addArea = function (pack, area) {
    var p = Q.packs[pack] = Q.packs[pack] || { areas: [] };
    p.areas.push(area);
  };

  Q.init = function () {
    var pack = Q.packs[Q.packId] || { areas: [] };
    Q.areas = pack.areas.slice().sort(function (a, b) { return a.order - b.order; });
    Q.areas.forEach(function (area) {
      var good = [];
      (area.monsters || []).forEach(function (m) {
        if (!m || !m.id || Q.mon[m.id]) { Q.warnings.push('重複/不正なモンスター: ' + (m && m.id)); return; }
        m.areaId = area.id;
        m.qlist = [];
        (m.questions || []).forEach(function (q, i) {
          var ok = q && q.q && Array.isArray(q.choices) && q.choices.length === 4 && q.a >= 0 && q.a <= 3 && q.choices[q.a];
          if (!ok) { Q.warnings.push('不正な問題: ' + m.id + ' #' + i); return; }
          q.id = m.id + '#' + i;
          q.mon = m;
          Q.qs[q.id] = q;
          m.qlist.push(q);
        });
        if (!m.qlist.length) { Q.warnings.push('問題なし: ' + m.id); return; }
        Q.mon[m.id] = m;
        good.push(m);
      });
      area.monsters = good;
    });
    if (Q.warnings.length && window.console) console.warn('教材チェック:', Q.warnings);
  };

  Q.area = function (id) { return Q.areas.filter(function (a) { return a.id === id; })[0]; };

  /* ---------- セーブ ---------- */
  var KEY = window.QUEST_SAVE_KEY || 'ccnaquest.save.v1';   /* 試作版は別のキーを指定して、本番の記録と混ざらないようにする */
  function fresh() {
    return {
      v: 1, name: '', caught: {}, srs: {}, badges: {},
      streak: { days: 0, last: 0 },
      daily: { day: 0, caught: 0, answered: 0 },
      pos: { area: 'a1' },
      stats: { ans: 0, ok: 0, steps: 0 },
      set: { sfx: true, bgm: true },
      exams: []
    };
  }
  Q.load = function () {
    var s = null;
    try { var raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; }
    var f = fresh();
    if (s && typeof s === 'object') { for (var k in f) { if (s[k] === undefined) s[k] = f[k]; } } else { s = f; }
    Q.S = s;
    if (Q.S.daily.day !== Q.day()) Q.S.daily = { day: Q.day(), caught: 0, answered: 0 };
  };
  Q.write = function () { try { localStorage.setItem(KEY, JSON.stringify(Q.S)); } catch (e) { /* 保存できなくても遊べる */ } };
  Q.reset = function () { try { localStorage.removeItem(KEY); } catch (e) { } Q.load(); };

  /* ---------- 復習(間隔反復) ----------
     box 0〜5。正解でbox+1、間違いでbox0。次に出る日は箱ごとに決まる。
     試験まで短いので間隔は短め。 */
  var GAP = [0, 1, 2, 4, 7, 12];
  Q.srsOf = function (qid) { return Q.S.srs[qid]; };
  Q.record = function (qid, ok) {
    var t = Q.day(), r = Q.S.srs[qid] || (Q.S.srs[qid] = { box: 0, due: t, seen: 0, ok: 0 });
    r.seen++;
    if (ok) { r.ok++; r.box = Math.min(5, r.box + 1); } else { r.box = 0; }
    r.due = t + GAP[r.box];
    Q.S.stats.ans++; if (ok) Q.S.stats.ok++;
    if (Q.S.daily.day !== t) Q.S.daily = { day: t, caught: 0, answered: 0 };
    Q.S.daily.answered++;
    var st = Q.S.streak;
    if (st.last !== t) { st.days = (st.last === t - 1) ? st.days + 1 : 1; st.last = t; }
    Q.write();
  };
  Q.dueIds = function (areaId) {
    var t = Q.day(), out = [];
    for (var id in Q.S.srs) {
      var q = Q.qs[id]; if (!q) continue;
      if (areaId && q.mon.areaId !== areaId) continue;
      if (Q.S.srs[id].due <= t) out.push(id);
    }
    return out;
  };
  Q.monDue = function (m) {
    var t = Q.day();
    return m.qlist.some(function (q) { var r = Q.S.srs[q.id]; return r && r.due <= t; });
  };
  /* 0〜1: 問題のうち box>=3 の割合 */
  Q.mastery = function (m) {
    var n = 0;
    m.qlist.forEach(function (q) { var r = Q.S.srs[q.id]; if (r && r.box >= 3) n++; });
    return n / m.qlist.length;
  };
  Q.stars = function (m) { var x = Q.mastery(m); return x >= 1 ? 3 : x >= 0.6 ? 2 : x > 0 ? 1 : 0; };
  /* 習熟度の表示(絵文字を使わない小さな四角) */
  Q.pips = function (n, max) {
    var s = '';
    for (var i = 0; i < max; i++) s += '<i class="pip' + (i < n ? ' on' : '') + '"></i>';
    return s;
  };
  Q.isCaught = function (m) { return !!Q.S.caught[m.id]; };
  Q.caughtIn = function (area) { return area.monsters.filter(Q.isCaught).length; };
  Q.totalMon = function () { return Q.areas.reduce(function (n, a) { return n + a.monsters.length; }, 0); };
  Q.totalCaught = function () { return Q.areas.reduce(function (n, a) { return n + Q.caughtIn(a); }, 0); };

  /* モンスターから出す問題を選ぶ: 未出題 > 復習時期 > 箱の低いもの */
  Q.chooseQuestion = function (m, usedIds) {
    var t = Q.day();
    var cand = m.qlist.filter(function (q) { return !usedIds || usedIds.indexOf(q.id) < 0; });
    if (!cand.length) cand = m.qlist.slice();
    cand = Q.shuffle(cand);
    cand.sort(function (a, b) { return score(a) - score(b); });
    function score(q) {
      var r = Q.S.srs[q.id];
      if (!r) return -2;
      if (r.due <= t) return -1 + r.box * 0.1;
      return r.box;
    }
    return cand[0];
  };

  /* 選択肢をシャッフルして、1問の出題データにする */
  Q.prep = function (q) {
    var order = Q.shuffle([0, 1, 2, 3]);
    return {
      id: q.id, q: q.q, ex: q.ex || '', src: q,
      choices: order.map(function (i) { return q.choices[i]; }),
      ans: order.indexOf(q.a)
    };
  };
})();

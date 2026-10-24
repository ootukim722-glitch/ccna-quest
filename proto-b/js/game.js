/* game.js - 試作B「ネットワーク障害調査室」の進行(タイトル、ケース選択、会話、調査、推理、解決、ふりかえり) */
(function () {
  'use strict';
  var Q = window.QUEST, PB = window.PB, U = PB.ui;
  var el = U.el, $ = U.$, clear = U.clear;
  var DEFAULT_NAME = 'ミナト';
  var G = null;            /* いま遊んでいるケースの状態 */
  var typeTimer = null, termTimer = null;

  /* ---------- 保存 ---------- */
  function sv() {
    var s = Q.S;
    if (!s.protoB || typeof s.protoB !== 'object') s.protoB = {};
    var p = s.protoB;
    if (!p.cases) p.cases = {};
    if (!p.name) p.name = DEFAULT_NAME;
    if (p.cur === undefined) p.cur = null;
    return p;
  }
  function saveCur() {
    if (!G) return;
    sv().cur = { id: G.c.id, st: G.st };
    Q.write();
  }

  /* ---------- 小さな道具 ---------- */
  function sub(s) { return String(s).replace(/\{me\}/g, sv().name); }
  function castOf(k) { return (G && G.c.cast && G.c.cast[k]) || PB.cast[k] || { name: k, look: PB.cast.senior.look }; }
  function nameOf(k) {
    if (k === 'me') return sv().name;
    if (k === 'narr') return '';
    return castOf(k).name;
  }
  function stopTimers() {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    if (termTimer) { clearTimeout(termTimer); termTimer = null; }
  }
  function panel() { stopTimers(); var p = $('panel'); clear(p); p.scrollTop = 0; return p; }
  function rankOf(misses, hints) {
    var t = misses + hints;
    return t <= 2 ? 'S' : (t <= 5 ? 'A' : 'B');
  }
  var RANK_V = { S: 0, A: 1, B: 2 };

  /* ---------- 証拠メモ ---------- */
  function buildEv(c) {
    var m = {};
    function reg(ev, kind, owner, src) {
      if (!ev) return;
      ev.kind = kind; ev.src = src;
      if (ev.grep) {
        var lines = owner.out.split('\n'), got = [];
        ev.grep.forEach(function (key) {
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf(key) >= 0) {
              var ln = lines[i].replace(/\s+$/, '');
              if (got.indexOf(ln) < 0) got.push(ln);
              break;
            }
          }
        });
        ev.lines = got;
        ev.mono = true;
      }
      m[ev.id] = ev;
    }
    (c.talks || []).forEach(function (t) { reg(t.ev, 'say', t, ''); });
    (c.looks || []).forEach(function (t) { reg(t.ev, 'look', t, ''); });
    (c.cmds || []).forEach(function (t) {
      var dev = c.devs.filter(function (d) { return d.id === t.dev; })[0];
      reg(t.ev, 'cmd', t, dev ? dev.name : '');
    });
    return m;
  }
  var KIND = { say: '証言', look: '現場', cmd: 'コマンド' };

  function evCard(ev, extraCls) {
    var d = el('div', 'ev ev-' + ev.kind + (extraCls ? ' ' + extraCls : ''));
    var h = el('div', 'ev-h');
    h.appendChild(el('span', 'chip', KIND[ev.kind]));
    h.appendChild(el('b', '', ev.title));
    d.appendChild(h);
    var b = el('div', 'ev-b' + (ev.mono ? ' mono' : ''));
    if (ev.lines) {
      ev.lines.forEach(function (ln) { b.appendChild(el('div', 'ev-l', ln)); });
    } else if (ev.text) {
      b.appendChild(el('p', '', ev.text));
    }
    d.appendChild(b);
    return d;
  }

  function addEv(ev) {
    if (!ev || G.st.memo.indexOf(ev.id) >= 0) return;
    G.st.memo.push(ev.id);
    PB.sfx('memo');
    U.toast('証拠メモに貼りました: ' + ev.title);
    refreshTop();
    saveCur();
  }

  function openMemo() {
    var list = clear($('memo-list'));
    if (!G || !G.st.memo.length) {
      list.appendChild(el('p', 'muted', 'まだ証拠はありません。人に聞いたり、現場やコマンドを調べると、ここに自動で貼られます。'));
    } else {
      G.st.memo.forEach(function (id) { list.appendChild(evCard(G.ev[id])); });
    }
    $('memo').hidden = false;
  }
  function closeMemo() { $('memo').hidden = true; }

  /* ---------- 画面上部(ポイントとメモ) ---------- */
  function refreshTop() {
    if (!G) return;
    var n = G.st.memo.length;
    $('memo-n').textContent = n;
    $('t-memo-n').textContent = n;
    ['tb-pts', 't-pts'].forEach(function (id) {
      var box = clear($(id));
      if (G.st.phase === 'invest') {
        box.appendChild(el('span', 'pts-l', '調査ポイント'));
        box.appendChild(U.pips(G.st.points, G.c.points));
      }
    });
  }

  /* ---------- ステージ(立ち絵) ---------- */
  function setStage(keys) {
    var people = clear($('people'));
    var uniq = [];
    keys.forEach(function (k) { if (k && k !== 'me' && k !== 'narr' && uniq.indexOf(k) < 0) uniq.push(k); });
    uniq = uniq.slice(0, 2);
    uniq.sort(function (a, b) { return (a === 'senior' ? 1 : 0) - (b === 'senior' ? 1 : 0); });
    G.stageKeys = uniq;
    uniq.forEach(function (k) {
      var d = el('div', 'pt');
      d.setAttribute('data-k', k);
      d.appendChild(U.portrait(castOf(k).look));
      d.appendChild(el('div', 'pt-name', castOf(k).name));
      people.appendChild(d);
    });
    U.fit();
  }
  function focusSpeaker(k) {
    var pts = $('people').children;
    for (var i = 0; i < pts.length; i++) {
      var on = pts[i].getAttribute('data-k') === k;
      pts[i].className = 'pt' + (on ? ' on' : (k === 'narr' ? '' : ' dim'));
    }
  }
  function defaultStage() {
    var c = G.c, keys = Object.keys(c.cast || {});
    return [keys[0], 'senior'];
  }
  function setCompact(on) { $('s-scene').className = 'screen' + (on ? ' compact' : ''); U.fit(); }

  /* ---------- 会話 ---------- */
  function say(lines, done) {
    var tok = ++G.tok, i = 0, P = panel();
    var box = el('div', 'dlg'), nm = el('div', 'dlg-name'), tx = el('div', 'dlg-text'), nx = el('div', 'dlg-next');
    box.appendChild(nm); box.appendChild(tx); box.appendChild(nx);
    P.appendChild(box);
    var full = '', pos = 0, typing = false;
    function stopType() { if (typeTimer) { clearInterval(typeTimer); typeTimer = null; } typing = false; }
    function put() {
      var L = lines[i];
      if (!L) { stopType(); if (tok === G.tok && done) done(); return; }
      var w = L.w;
      if (w !== 'me' && w !== 'narr' && G.stageKeys.indexOf(w) < 0) setStage(w === 'senior' ? ['senior'] : [w, 'senior']);
      box.className = 'dlg' + (w === 'narr' ? ' narr' : '') + ' w-' + (w === 'senior' ? 'senior' : (w === 'me' ? 'me' : (w === 'narr' ? 'narr' : 'other')));
      nm.textContent = nameOf(w);
      nm.style.display = (w === 'narr') ? 'none' : '';
      focusSpeaker(w);
      full = sub(L.t); pos = 0; tx.textContent = '';
      nx.style.visibility = 'hidden';
      stopType(); typing = true;
      typeTimer = setInterval(function () {
        pos += 1; tx.textContent = full.slice(0, pos);
        if (pos % 5 === 1) PB.sfx('talk');
        if (pos >= full.length) { stopType(); nx.style.visibility = 'visible'; }
      }, 24);
    }
    box.addEventListener('click', function () {
      if (tok !== G.tok) return;
      if (typing) { stopType(); tx.textContent = full; nx.style.visibility = 'visible'; }
      else { i++; put(); }
    });
    put();
  }

  /* ---------- ケース開始 ---------- */
  function startCase(id, resume) {
    var c = PB.byId(id), p = sv();
    stopTimers();
    var st;
    if (resume && p.cur && p.cur.id === id) { st = p.cur.st; }
    else {
      st = { phase: 'intro', points: c.points, done: {}, memo: [], misses: 0, hints: 0, hintLv: 0, read: {}, wrong: {}, fixWrong: {} };
    }
    G = { c: c, st: st, ev: buildEv(c), tok: 0, log: [], dev: c.devs[0].id, stageKeys: [] };
    saveCur();
    $('stage').className = 'stage bg-' + (c.bg || 'office');
    var slot = clear($('prop-slot'));
    slot.appendChild(U.prop(c.prop || 'monitor'));
    $('tb-title').textContent = 'ケース' + c.no + ' ' + c.title;
    $('t-title').textContent = '調査用の端末';
    closeMemo();
    U.show('scene');
    setCompact(false);
    refreshTop();
    PB.bgm('map');
    setStage(defaultStage());
    if (st.phase === 'intro') { say(c.intro, function () { hub(); }); }
    else if (st.phase === 'reason') { reasonStart(true); }
    else if (st.phase === 'fix') { fixStart(true); }
    else { hub(); }
  }

  /* ---------- 調査パート ---------- */
  function canAct(it) { return !!G.st.done[it.id] || G.st.points > 0 || !!it.key; }
  function spend(it) {
    if (G.st.done[it.id]) return;
    if (G.st.points > 0) G.st.points--;
    G.st.done[it.id] = true;
    refreshTop();
    saveCur();
  }

  function menuBtn(label, subText, cls, fn, disabled) {
    var b = el('button', 'mbtn' + (cls ? ' ' + cls : ''));
    b.type = 'button';
    b.appendChild(el('span', 'mb-t', label));
    if (subText) b.appendChild(el('span', 'mb-s', subText));
    if (disabled) b.disabled = true;
    b.addEventListener('click', function () { PB.sfx('tap'); fn(); });
    return b;
  }

  function hub(msg) {
    G.st.phase = 'invest';
    saveCur();
    refreshTop();
    setCompact(false);
    PB.bgm('map');
    if (G.stageKeys.length !== 2 || G.stageKeys[1] !== 'senior') setStage(defaultStage());
    focusSpeaker('narr');
    var P = panel();
    P.appendChild(el('div', 'hub-q', msg || 'どうやって調べる?'));
    var list = el('div', 'menu');
    list.appendChild(menuBtn('関係者に聞く', '話を聞く(ポイントは使いません)', '', subTalks));
    list.appendChild(menuBtn('現場を調べる', '見に行く(1ポイント)', '', subLooks));
    list.appendChild(menuBtn('コマンドを実行する', '端末で調べる(1ポイント)', '', openTerm));
    list.appendChild(menuBtn('先輩に相談する', 'ヒントをもらう(ヒント回数が増えます)', 'hint', hintAsk));
    list.appendChild(menuBtn('推理にすすむ', '原因を指名する', 'go', function () { reasonStart(false); }));
    P.appendChild(list);
    if (G.st.points <= 0) {
      P.appendChild(el('p', 'note', '調査ポイントが0になりました。ここからは「大事な調査」だけ、ポイントなしで続けられます。足りないときは先輩に相談しよう。'));
    }
  }

  function subMenu(title, items, back) {
    var P = panel();
    setCompact(true);
    P.appendChild(el('div', 'hub-q', title));
    var list = el('div', 'menu');
    items.forEach(function (it) { list.appendChild(it); });
    P.appendChild(list);
    var b = U.btn('もどる', 'btn ghost', back);
    P.appendChild(b);
  }

  function subTalks() {
    var c = G.c;
    var items = c.talks.map(function (t) {
      var done = !!G.st.done[t.id];
      return menuBtn(t.label, done ? '済み(もう一度聞けます)' : '', done ? 'done' : '', function () {
        G.st.done[t.id] = true;
        setCompact(false);
        setStage(t.who === 'senior' ? ['senior'] : [t.who, 'senior']);
        say(t.lines, function () { addEv(t.ev); hub(); });
      });
    });
    subMenu('だれに聞く?', items, function () { hub(); });
  }

  function subLooks() {
    var c = G.c;
    var items = c.looks.map(function (t) {
      var done = !!G.st.done[t.id];
      var locked = !canAct(t);
      var s = done ? '済み(もう一度見られます)' : (locked ? 'ポイントが足りません' : (G.st.points > 0 ? '1ポイント' : 'ポイントなしで調べられます'));
      return menuBtn(t.label, s, done ? 'done' : '', function () {
        spend(t);
        setCompact(false);
        setStage(['senior']);
        say(t.lines, function () { addEv(t.ev); hub(); });
      }, locked);
    });
    subMenu('どこを調べる?', items, function () { hub(); });
  }

  function hintAsk() {
    var c = G.c, lv = G.st.hintLv;
    var idx = Math.min(lv, c.hints.length - 1);
    if (lv < c.hints.length) { G.st.hintLv++; G.st.hints++; saveCur(); }
    setCompact(false);
    setStage(['senior']);
    say([{ w: 'senior', t: c.hints[idx] }], function () { hub(); });
  }

  /* ---------- 端末 ---------- */
  function devOf(cm) { return G.c.devs.filter(function (d) { return d.id === cm.dev; })[0]; }

  function openTerm() {
    G.st.phase = 'invest';
    stopTimers();
    U.show('term');
    refreshTop();
    renderTermLog();
    renderDevs();
    renderCmds();
    clear($('readbox'));
    $('readbox').appendChild(el('p', 'muted', '下のコマンドを選ぶと実行されます。表示は本物の機器に近い形です。実行しても機器は壊れません。'));
  }

  function renderTermLog() {
    var pre = clear($('termpre'));
    if (!G.log.length) {
      var d = el('div', 'tb', '-- 調査用の端末 --\n機器をえらんで、実行したいコマンドをタップしてください。');
      pre.appendChild(d);
    }
    G.log.forEach(function (e) { pre.appendChild(el('div', e.t, e.text)); });
    pre.scrollTop = pre.scrollHeight;
  }

  function renderDevs() {
    var box = clear($('devtabs'));
    G.c.devs.forEach(function (d) {
      var b = el('button', 'devtab' + (d.id === G.dev ? ' on' : ''), d.name);
      b.type = 'button';
      b.addEventListener('click', function () { PB.sfx('tap'); G.dev = d.id; renderDevs(); renderCmds(); });
      box.appendChild(b);
    });
  }

  function renderCmds() {
    var box = clear($('cmdlist'));
    var dev = G.c.devs.filter(function (d) { return d.id === G.dev; })[0];
    box.appendChild(el('div', 'cmd-dev', dev.prompt));
    G.c.cmds.filter(function (cm) { return cm.dev === G.dev; }).forEach(function (cm) {
      var done = !!G.st.done[cm.id];
      var locked = !canAct(cm);
      var b = el('button', 'cmdbtn' + (done ? ' done' : '') + (locked ? ' locked' : ''));
      b.type = 'button';
      b.appendChild(el('code', '', cm.cmd));
      b.appendChild(el('span', 'cmd-d', cm.desc));
      b.appendChild(el('span', 'cmd-s', done ? '実行済み' : (locked ? 'ポイント不足' : (G.st.points > 0 ? '1ポイント' : 'ポイントなし'))));
      if (locked) b.disabled = true;
      b.addEventListener('click', function () { PB.sfx('tap'); runCmd(cm); });
      box.appendChild(b);
    });
  }

  function skipRun() {
    if (G && G.skip) { var f = G.skip; G.skip = null; f(); }
  }

  function runCmd(cm) {
    if (!canAct(cm)) { U.toast('調査ポイントが足りません'); return; }
    skipRun();
    stopTimers();
    spend(cm);
    var dev = devOf(cm), pre = $('termpre');
    var entry = { t: 'tp', text: dev.prompt + cm.cmd };
    var out = { t: 'to', text: cm.out };
    G.log.push(entry); G.log.push(out);
    if (G.log.length > 60) G.log.splice(0, G.log.length - 60);
    var eNode = el('div', 'tp', entry.text);
    var oNode = el('div', 'to', '');
    pre.appendChild(eNode); pre.appendChild(oNode);
    var lines = out.text.split('\n'), i = 0;
    clear($('readbox'));
    renderCmds();
    function step() {
      var n = Math.min(lines.length, i + 4);
      oNode.textContent = lines.slice(0, n).join('\n');
      i = n;
      PB.sfx('key');
      pre.scrollTop = pre.scrollHeight;
      if (i < lines.length) { termTimer = setTimeout(step, 45); }
      else { finish(); }
    }
    function finish() {
      termTimer = null;
      G.skip = null;
      oNode.textContent = out.text;
      if (cm.ev) addEv(cm.ev);
      renderRead(cm);
      pre.scrollTop = Math.max(0, eNode.offsetTop - 4);
    }
    G.skip = function () { if (termTimer) { clearTimeout(termTimer); termTimer = null; } finish(); };
    step();
  }

  function renderRead(cm) {
    var box = clear($('readbox'));
    if (!cm.read) return;
    var row = el('div', 'rd');
    var face = el('div', 'rd-face');
    face.appendChild(U.portrait(castOf('senior').look));
    row.appendChild(face);
    var body = el('div', 'rd-body');
    if (G.st.read[cm.id]) {
      body.appendChild(el('div', 'rd-name', '凪野先輩'));
      body.appendChild(el('p', '', cm.read));
    } else {
      body.appendChild(el('p', 'muted', 'この結果の読み方を、先輩に聞けます。(ヒントを1回使います)'));
      body.appendChild(U.btn('先輩に読み方を聞く', 'btn small', function () {
        G.st.read[cm.id] = true; G.st.hints++; saveCur();
        renderRead(cm);
      }));
    }
    row.appendChild(body);
    box.appendChild(row);
  }

  /* ---------- 推理パート ---------- */
  function reasonStart(resumed) {
    G.st.phase = 'reason';
    saveCur();
    refreshTop();
    closeMemo();
    U.show('scene');
    setCompact(false);
    PB.bgm('battle');
    setStage(defaultStage());
    say([{ w: 'senior', t: G.c.reason.ask }], showCauses);
  }

  function showCauses() {
    var R = G.c.reason, P = panel();
    setCompact(true);
    P.appendChild(el('div', 'hub-q', '原因はこれだ、と思うものを選ぼう'));
    var list = el('div', 'menu');
    R.causes.forEach(function (cs) {
      var wrong = !!G.st.wrong[cs.id];
      list.appendChild(menuBtn(cs.t, wrong ? '違うみたい(先輩の説明を読み返せます)' : '', wrong ? 'wrong' : '', function () { pickCause(cs); }));
    });
    P.appendChild(list);
    P.appendChild(U.btn('調査にもどる', 'btn ghost', function () { hub('もう少し調べてみよう。'); }));
  }

  function pickCause(cs) {
    var R = G.c.reason;
    setCompact(false);
    if (cs.id !== R.answer) {
      PB.sfx('ng');
      if (!G.st.wrong[cs.id]) { G.st.misses++; G.st.wrong[cs.id] = true; saveCur(); }
      say([
        { w: 'me', t: '原因は「' + cs.t + '」だと思います。' },
        { w: 'senior', t: 'なるほど、そう考えたくなるよね。でも、証拠と見比べてみよう。' },
        { w: 'senior', t: cs.why },
        { w: 'senior', t: '間違えても大丈夫。もう一度、考えてみよう。' }
      ], showCauses);
    } else {
      PB.sfx('reveal');
      var correct = R.causes.filter(function (x) { return x.id === R.answer; })[0];
      say([
        { w: 'me', t: '原因は「' + correct.t + '」だと思います。' },
        { w: 'senior', t: R.askProof }
      ], function () { showProof([]); });
    }
  }

  function weight(id) {
    var R = G.c.reason;
    if (R.proofs.indexOf(id) >= 0) return 1;
    if (R.supports.indexOf(id) >= 0) return 0.5;
    return 0;
  }

  function showProof(sel) {
    var R = G.c.reason, P = panel();
    setCompact(true);
    P.appendChild(el('div', 'hub-q', '決め手になる証拠を、1〜2個えらんで「つきつける」'));
    if (!G.st.memo.length) {
      P.appendChild(el('p', 'note', '証拠メモがまだ空です。調査にもどって、手がかりを集めよう。'));
      P.appendChild(U.btn('調査にもどる', 'btn', function () { hub('まずは手がかりを集めよう。'); }));
      return;
    }
    var list = el('div', 'evlist');
    var goBtn;
    function sync() {
      goBtn.disabled = sel.length < 1;
      goBtn.textContent = sel.length ? 'この証拠をつきつける(' + sel.length + '個)' : '証拠をえらんでください';
    }
    G.st.memo.forEach(function (id) {
      var ev = G.ev[id];
      var card = evCard(ev, 'pick' + (sel.indexOf(id) >= 0 ? ' sel' : ''));
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      var tick = el('span', 'tick');
      card.firstChild.appendChild(tick);
      function toggle() {
        PB.sfx('tap');
        var k = sel.indexOf(id);
        if (k >= 0) { sel.splice(k, 1); card.className = card.className.replace(' sel', ''); }
        else if (sel.length < 2) { sel.push(id); card.className += ' sel'; }
        else { U.toast('えらべるのは2個までです'); }
        sync();
      }
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      list.appendChild(card);
    });
    P.appendChild(list);
    var bar = el('div', 'proofbar');
    goBtn = U.btn('', 'btn go', function () { judge(sel.slice()); });
    bar.appendChild(goBtn);
    bar.appendChild(U.btn('調査にもどる', 'btn ghost', function () { hub('もう少し調べてみよう。'); }));
    P.appendChild(bar);
    sync();
  }

  function judge(sel) {
    var R = G.c.reason, score = 0;
    sel.forEach(function (id) { score += weight(id); });
    setCompact(false);
    PB.sfx('point');
    var lines = [{ w: 'me', t: 'この証拠を見てください!' }];
    sel.forEach(function (id) {
      var ev = G.ev[id], wgt = weight(id);
      if (wgt >= 1) lines.push({ w: 'senior', t: '「' + ev.title + '」。' + ev.say });
      else if (wgt > 0) lines.push({ w: 'senior', t: '「' + ev.title + '」。' + ev.say + '(これは決め手を支えるメモだね)' });
      else lines.push({ w: 'senior', t: '「' + ev.title + '」。' + ev.no });
    });
    if (score >= R.need) {
      G.st.phase = 'fix'; saveCur();
      lines.push({ w: 'senior', t: 'うん、その証拠で原因は決まりだね!' });
      lines = lines.concat(R.solved);
      say(lines, function () { PB.sfx('win'); fixStart(false); });
    } else {
      G.st.misses++; saveCur();
      PB.sfx('ng');
      lines.push({ w: 'senior', t: '惜しい! 原因は合っているけど、この証拠だけでは、まだ相手を納得させられないんだ。' });
      lines.push({ w: 'senior', t: R.need > 1 ? '決め手になる証拠と、それを支える証拠を組み合わせてみよう。' : '原因をはっきり示す証拠を選び直してみよう。' });
      say(lines, function () { showProof([]); });
    }
  }

  /* ---------- 解決パート ---------- */
  function fixStart(resumed) {
    G.st.phase = 'fix';
    saveCur();
    refreshTop();
    closeMemo();
    U.show('scene');
    setCompact(false);
    PB.bgm('map');
    setStage(defaultStage());
    say([{ w: 'senior', t: G.c.fix.ask }], showFix);
  }

  function showFix() {
    var F = G.c.fix, P = panel();
    setCompact(true);
    P.appendChild(el('div', 'hub-q', '直し方を選ぼう'));
    var list = el('div', 'menu');
    F.options.forEach(function (op, idx) {
      var wrong = !!G.st.fixWrong[idx];
      list.appendChild(menuBtn(op.t, wrong ? '違うみたい' : '', wrong ? 'wrong' : '', function () { pickFix(op, idx); }));
    });
    P.appendChild(list);
  }

  function pickFix(op, idx) {
    setCompact(false);
    if (!op.ok) {
      PB.sfx('ng');
      if (!G.st.fixWrong[idx]) { G.st.misses++; G.st.fixWrong[idx] = true; saveCur(); }
      say([
        { w: 'senior', t: 'うーん、それだと直らないかもしれない。' },
        { w: 'senior', t: op.why }
      ], showFix);
    } else {
      PB.sfx('ok');
      verify();
    }
  }

  function verify() {
    var F = G.c.fix, P = panel();
    setCompact(true);
    P.appendChild(el('div', 'hub-q', '直したあとの確認'));
    var box = el('div', 'vterm');
    P.appendChild(box);
    var note = el('p', 'note ok-note', F.verifyNote);
    note.hidden = true;
    P.appendChild(note);
    var next = U.btn('つぎへ', 'btn go', function () { setCompact(false); say(F.after, finishCase); });
    next.hidden = true;
    P.appendChild(next);
    var text = [];
    F.verify.forEach(function (b) {
      text.push({ t: 'tp', text: b.prompt + b.cmd });
      if (b.out) text.push({ t: 'to', text: b.out });
    });
    var i = 0;
    function step() {
      if (i >= text.length) { note.hidden = false; next.hidden = false; PB.sfx('win'); return; }
      var e = text[i++];
      box.appendChild(el('div', e.t, e.text));
      PB.sfx('key');
      termTimer = setTimeout(step, e.t === 'tp' ? 350 : 200);
    }
    step();
  }

  /* ---------- 結果と保存 ---------- */
  function finishCase() {
    var c = G.c, p = sv();
    var rank = rankOf(G.st.misses, G.st.hints);
    var prev = p.cases[c.id];
    var rec = { done: true, rank: rank, misses: G.st.misses, hints: G.st.hints, plays: (prev ? prev.plays : 0) + 1 };
    if (prev && prev.done) {
      var better = RANK_V[prev.rank] < RANK_V[rank] || (prev.rank === rank && (prev.misses + prev.hints) <= (rec.misses + rec.hints));
      if (better) { rec.rank = prev.rank; rec.bestMisses = prev.misses; rec.bestHints = prev.hints; rec.misses = prev.misses; rec.hints = prev.hints; }
    }
    p.cases[c.id] = rec;
    G.last = { rank: rank, misses: G.st.misses, hints: G.st.hints };
    p.cur = null;
    G.st.phase = 'done';
    Q.write();
    PB.bgm(null);
    PB.sfx('win');
    renderReview();
  }

  function renderReview() {
    var c = G.c, L = c.lesson, root = clear($('review-body'));
    U.show('review');
    $('s-review').scrollTop = 0;
    $('review-body').scrollTop = 0;
    var head = el('div', 'rv-head');
    head.appendChild(el('div', 'rv-clear', '事件解決'));
    head.appendChild(el('div', 'rv-title', 'ケース' + c.no + ' ' + c.title));
    var score = el('div', 'rv-score');
    var rk = el('div', 'rv-rank r-' + G.last.rank);
    rk.appendChild(el('span', 'rk-l', 'ランク'));
    rk.appendChild(el('span', 'rk-v', G.last.rank));
    score.appendChild(rk);
    var det = el('div', 'rv-det');
    det.appendChild(el('div', '', '推理・修理のミス  ' + G.last.misses + '回'));
    det.appendChild(el('div', '', '使ったヒント  ' + G.last.hints + '回'));
    det.appendChild(el('div', 'muted', 'ミスとヒントが合計2回までならS、5回までならA'));
    score.appendChild(det);
    head.appendChild(score);
    root.appendChild(head);

    var sec1 = el('section', 'rv-sec');
    sec1.appendChild(el('h3', '', '今回の原因'));
    sec1.appendChild(el('div', 'rv-cause', L.cause));
    L.text.forEach(function (t) { sec1.appendChild(el('p', '', t)); });
    root.appendChild(sec1);

    var sec2 = el('section', 'rv-sec');
    sec2.appendChild(el('h3', '', 'ポイントのまとめ'));
    var ul = el('ul', 'rv-list');
    L.points.forEach(function (t) { ul.appendChild(el('li', '', t)); });
    sec2.appendChild(ul);
    root.appendChild(sec2);

    var sec3 = el('section', 'rv-sec');
    sec3.appendChild(el('h3', '', '試験でのポイント'));
    sec3.appendChild(el('p', '', L.exam));
    root.appendChild(sec3);

    var sec4 = el('section', 'rv-sec');
    sec4.appendChild(el('h3', '', '関連する用語(復習)'));
    var any = false;
    (L.mons || []).forEach(function (id) {
      var m = Q.mon[id];
      if (!m) return;
      any = true;
      var card = el('div', 'mon');
      var img = el('img', 'px mon-img');
      img.src = Q.monImg(id);
      img.alt = '';
      card.appendChild(img);
      var body = el('div', 'mon-b');
      body.appendChild(el('div', 'mon-nick', m.nick));
      body.appendChild(el('div', 'mon-term', m.term));
      body.appendChild(el('p', 'mon-an', m.analogy));
      var u = el('ul', 'mon-pts');
      (m.points || []).forEach(function (t) { u.appendChild(el('li', '', t)); });
      body.appendChild(u);
      card.appendChild(body);
      sec4.appendChild(card);
    });
    if (!any) sec4.appendChild(el('p', 'muted', '教材データを読み込めませんでした。'));
    root.appendChild(sec4);

    var act = el('div', 'rv-act');
    var idx = PB.cases.indexOf(c), nxt = PB.cases[idx + 1];
    if (nxt) act.appendChild(U.btn('つぎの事件へ: ' + nxt.title, 'btn go', function () { startCase(nxt.id, false); }));
    else act.appendChild(el('p', 'note', '試作の事件はここまで。遊んでくれてありがとう!'));
    act.appendChild(U.btn('ケース一覧へ', 'btn', function () { showCases(); }));
    act.appendChild(U.btn('この事件をもう一度', 'btn ghost', function () { startCase(c.id, false); }));
    root.appendChild(act);
  }

  /* ---------- ケース選択 ---------- */
  function unlocked(c) {
    var p = sv();
    if (p.unlockAll) return true;
    var i = PB.cases.indexOf(c);
    if (i <= 0) return true;
    var prev = p.cases[PB.cases[i - 1].id];
    return !!(prev && prev.done);
  }

  function showCases() {
    stopTimers();
    var root = clear($('cases-list')), p = sv();
    U.show('cases');
    PB.bgm(null);
    PB.cases.forEach(function (c) {
      var rec = p.cases[c.id], open = unlocked(c);
      var card = el('div', 'case' + (open ? '' : ' locked') + (rec && rec.done ? ' cleared' : ''));
      var no = el('div', 'case-no', String(c.no));
      card.appendChild(no);
      var body = el('div', 'case-b');
      var top = el('div', 'case-top');
      top.appendChild(el('span', 'chip lv', c.level));
      top.appendChild(el('b', '', c.title));
      body.appendChild(top);
      body.appendChild(el('p', 'case-sub', c.sub));
      if (rec && rec.done) {
        body.appendChild(el('div', 'case-rec', 'ランク ' + rec.rank + '  /  ミス ' + rec.misses + '回  /  ヒント ' + rec.hints + '回'));
      }
      var acts = el('div', 'case-act');
      if (!open) {
        acts.appendChild(el('span', 'muted', '前の事件を解決すると開きます'));
      } else if (p.cur && p.cur.id === c.id) {
        acts.appendChild(U.btn('つづきから', 'btn go small', function () { startCase(c.id, true); }));
        acts.appendChild(U.btn('はじめから', 'btn ghost small', function () { startCase(c.id, false); }));
      } else {
        acts.appendChild(U.btn(rec && rec.done ? 'もう一度調べる' : '調査開始', 'btn go small', function () { startCase(c.id, false); }));
      }
      body.appendChild(acts);
      card.appendChild(body);
      root.appendChild(card);
    });
    var foot = $('cases-foot');
    clear(foot);
    foot.appendChild(U.btn(p.unlockAll ? '(試作用)順番どおりに戻す' : '(試作用)ぜんぶ開く', 'btn ghost small', function () { p.unlockAll = !p.unlockAll; Q.write(); showCases(); }));
  }

  /* ---------- タイトル ---------- */
  function showTitle() {
    stopTimers();
    G = null;
    var root = clear($('title-body')), p = sv();
    U.show('title');
    PB.bgm(null);

    var hero = el('div', 'hero');
    var cvs = el('div', 'hero-people');
    [PB.cast.senior.look, { hair: '#4a2c17', shirt: '#4f7cff', pants: '#2d3a5a', hat: null }].forEach(function (lk, i) {
      var c = U.portrait(lk); c.className = 'px hero-pt' + (i ? ' r' : '');
      cvs.appendChild(c);
    });
    hero.appendChild(cvs);
    root.appendChild(hero);
    root.appendChild(el('div', 'logo-s', 'CCNAクエスト 試作B'));
    root.appendChild(el('h1', 'logo', 'ネットワーク障害調査室'));
    root.appendChild(el('p', 'logo-c', '設定画面を読んで、原因を見つけ出そう。'));

    var nameRow = el('label', 'name-row');
    nameRow.appendChild(el('span', '', 'あなたの名前'));
    var inp = el('input', 'name-in');
    inp.type = 'text'; inp.maxLength = 8; inp.value = p.name; inp.setAttribute('aria-label', 'あなたの名前');
    inp.addEventListener('change', function () {
      var v = inp.value.replace(/^\s+|\s+$/g, '');
      p.name = v || DEFAULT_NAME; inp.value = p.name; Q.write();
    });
    nameRow.appendChild(inp);
    root.appendChild(nameRow);

    var list = el('div', 'menu');
    var first = PB.cases[0];
    if (p.cur) {
      list.appendChild(menuBtn('つづきから', 'ケース' + PB.byId(p.cur.id).no + ' ' + PB.byId(p.cur.id).title, 'go', function () { startCase(p.cur.id, true); }));
    } else {
      var nextCase = null;
      PB.cases.forEach(function (c) { if (!nextCase && !(p.cases[c.id] && p.cases[c.id].done)) nextCase = c; });
      if (nextCase) list.appendChild(menuBtn(Object.keys(p.cases).length ? 'つぎの事件へ' : 'はじめる', 'ケース' + nextCase.no + ' ' + nextCase.title, 'go', function () { startCase(nextCase.id, false); }));
      else list.appendChild(menuBtn('もう一度はじめる', 'ケース' + first.no + ' ' + first.title, 'go', function () { startCase(first.id, false); }));
    }
    list.appendChild(menuBtn('ケースを選ぶ', '好きな事件から調べる', '', showCases));
    root.appendChild(list);

    var set = el('div', 'set-row');
    function toggle(label, key) {
      var b = el('button', 'btn ghost small', label + ': ' + (Q.S.set[key] ? 'ON' : 'OFF'));
      b.type = 'button';
      b.addEventListener('click', function () {
        Q.S.set[key] = !Q.S.set[key]; Q.write();
        if (key === 'bgm') Q.bgmRefresh();
        b.textContent = label + ': ' + (Q.S.set[key] ? 'ON' : 'OFF');
        PB.sfx('tap');
      });
      return b;
    }
    set.appendChild(toggle('効果音', 'sfx'));
    set.appendChild(toggle('BGM', 'bgm'));
    var rs = el('button', 'btn ghost small', 'きろくを消す');
    rs.type = 'button';
    rs.addEventListener('click', function () {
      if (window.confirm('試作Bの記録(解いた事件とランク)を、すべて消します。よろしいですか?')) {
        var nm = p.name;
        delete Q.S.protoB; Q.write();
        sv().name = nm; Q.write();
        showTitle();
      }
    });
    set.appendChild(rs);
    root.appendChild(set);
  }

  /* ---------- 起動 ---------- */
  function boot() {
    Q.init();
    Q.load();
    if (!PB.cases.length) {
      $('title-body').textContent = '事件データ(data/*.js)が読み込めませんでした。';
      return;
    }
    $('stage').addEventListener('transitionend', U.fit);
    $('b-menu').addEventListener('click', function () { PB.sfx('tap'); showCases(); });
    $('b-memo').addEventListener('click', function () { PB.sfx('tap'); openMemo(); });
    $('t-memo').addEventListener('click', function () { PB.sfx('tap'); openMemo(); });
    $('memo-close').addEventListener('click', function () { PB.sfx('tap'); closeMemo(); });
    $('memo').addEventListener('click', function (e) { if (e.target === $('memo')) closeMemo(); });
    $('t-back').addEventListener('click', function () { PB.sfx('tap'); skipRun(); stopTimers(); U.show('scene'); hub(); });
    $('termpre').addEventListener('pointerdown', skipRun);
    $('t-clear').addEventListener('click', function () { PB.sfx('tap'); if (G) { G.log = []; renderTermLog(); } });
    $('c-back').addEventListener('click', function () { PB.sfx('tap'); showTitle(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) Q.write(); });
    showTitle();
  }
  PB.game = { boot: boot, state: function () { return G; }, startCase: startCase };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

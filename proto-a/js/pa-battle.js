/* pa-battle.js - バトル画面(上に相手、下に自分、メッセージ窓、コマンド、わざ=4択) */
(function () {
  'use strict';
  var Q = window.QUEST, PA = Q.pa, ui = PA.ui, $ = ui.$;
  var wait = ui.wait;
  var B = null;
  var hpTimer = null;

  function unit() { var f = $('b-field'); f.style.setProperty('--u', (f.clientWidth / 100) + 'px'); }
  window.addEventListener('resize', function () { if (ui.current === 'battle') unit(); });

  /* ---------- メッセージ窓 ---------- */
  function setText(t) { $('b-text').textContent = t; $('b-next').classList.remove('on'); }
  /* tap=true なら、タップするまで待つ。そうでなければ少し待って自動で進む(タップで早送り) */
  function msg(text, tap) {
    return new Promise(function (resolve) {
      var box = $('b-msg'), t = $('b-text'), nx = $('b-next');
      var pos = 0, typed = false, timer = null, autoT = null;
      t.textContent = ''; nx.classList.remove('on'); t.scrollTop = 0;
      function end() {
        clearInterval(timer); clearTimeout(autoT);
        box.removeEventListener('pointerdown', onTap); document.removeEventListener('keydown', onKey);
        nx.classList.remove('on'); resolve();
      }
      function finish() {
        clearInterval(timer); timer = null; t.textContent = text; typed = true;
        if (tap) nx.classList.add('on'); else autoT = setTimeout(end, 380 + text.length * 9);
      }
      function onTap(e) { if (e && e.preventDefault) e.preventDefault(); if (!typed) finish(); else end(); }
      function onKey(e) {
        if (e.repeat) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); onTap(); }
      }
      box.addEventListener('pointerdown', onTap);
      document.addEventListener('keydown', onKey);
      timer = setInterval(function () { pos += 2; t.textContent = text.slice(0, pos); if (pos >= text.length) finish(); }, 24);
    });
  }

  /* ---------- コマンド・わざボタン ---------- */
  function cmd(items, cls, withBack) {
    return new Promise(function (resolve) {
      var c = $('b-cmd'); c.className = cls || 'cmd4';
      var html = '';
      items.forEach(function (it, i) {
        html += '<button class="cb ' + (it.cls || '') + '" data-i="' + i + '"><span class="cbl">' + Q.rich(it.label) + '</span></button>';
      });
      if (withBack) html += '<button class="cb backbtn" data-i="' + items.length + '"><span class="cbl">もどる</span></button>';
      c.innerHTML = html;
      function done(i) { c.onclick = null; document.removeEventListener('keydown', onKey); resolve(i); }
      c.onclick = function (e) {
        var b = e.target.closest('button'); if (!b || b.disabled) return;
        PA.sfx('tap'); done(+b.getAttribute('data-i'));
      };
      function onKey(e) {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= items.length) { e.preventDefault(); done(n - 1); }
      }
      document.addEventListener('keydown', onKey);
    });
  }
  function cmdClear() { var c = $('b-cmd'); c.innerHTML = ''; c.onclick = null; c.className = 'cmd4'; }

  /* ---------- 見た目の部品 ---------- */
  function anim(el, cls, ms) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    return wait(ms || 500).then(function () { el.classList.remove(cls); });
  }
  function setBar(inner, r) {
    r = Math.max(0, Math.min(1, r));
    inner.style.width = (r * 100) + '%';
    inner.parentNode.className = 'hpbar ' + (r > 0.5 ? 'g' : r > 0.2 ? 'y' : 'r');
  }
  function setExpBar(r, animate) {
    var el = $('b-me-exp');
    if (!animate) el.style.transition = 'none';
    el.style.width = (Math.max(0, Math.min(1, r)) * 100) + '%';
    if (!animate) { void el.offsetWidth; el.style.transition = ''; }
  }
  function meName() { return PA.stageName(B.me.id, B.me.stage); }
  function trainerName() { return (B.opts.trainer && B.opts.trainer.name) || ''; }

  function mkFoe(spec) {
    var f = { id: spec.id, lv: spec.lv, boss: !!spec.boss, hits: spec.hits || 1 };
    if (f.boss) {
      f.name = B.opts.bossName || 'ヌシ'; f.term = B.opts.bossTerm || ''; f.stage = 2;
      f.src = Q.monImg('boss-a1', { boss: true, areaId: 'a1' });
      f.max = f.hits;
    } else {
      var d = Q.mon[f.id];
      f.stage = PA.stageOf(f.lv); f.name = PA.stageName(f.id, f.stage); f.term = d.term;
      f.src = PA.monImg(f.id, f.stage);
      f.max = Math.max(1, Math.round(f.hits * PA.baseDmg(B.me.lv)));
    }
    f.hp = f.max;
    return f;
  }

  function showFoeInfo() {
    var f = B.foe;
    $('b-foe-name').textContent = f.name;
    $('b-foe-lv').textContent = 'Lv' + f.lv;
    $('b-foe-term').textContent = f.term;
    setBar($('b-foe-hp'), f.hp / f.max);
    var im = $('b-foe'); im.src = f.src; im.className = 'spr foe px st' + f.stage + (f.boss ? ' boss' : '');
    var balls = $('b-foe-balls'), n = B.opts.foes.length, h = '';
    if (n > 1) { for (var i = 0; i < n; i++) h += '<i class="ball' + (i >= B.fi ? ' on' : '') + '"></i>'; }
    balls.innerHTML = h;
  }
  function showMeInfo() {
    var m = B.me, max = PA.maxHp(m);
    $('b-me-name').textContent = meName();
    $('b-me-lv').textContent = 'Lv' + m.lv;
    setBar($('b-me-hp'), m.hp / max);
    $('b-me-hpnum').textContent = m.hp + ' / ' + max;
    setExpBar(m.exp / PA.need(m.lv), false);
    var im = $('b-me'); im.src = PA.monImg(m.id, m.stage, true); im.className = 'spr me px st' + m.stage;
  }
  function setMeHp(from) {
    var m = B.me, max = PA.maxHp(m);
    setBar($('b-me-hp'), m.hp / max);
    var el = $('b-me-hpnum'), k = 0, steps = 12;
    clearInterval(hpTimer);
    hpTimer = setInterval(function () {
      k++; el.textContent = Math.round(from + (m.hp - from) * k / steps) + ' / ' + max;
      if (k >= steps) clearInterval(hpTimer);
    }, 40);
  }
  function burst() {
    var fx = $('b-fx'), d = document.createElement('div');
    d.className = 'burst'; fx.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 600);
  }
  function banner() {
    var b = $('b-lvup'); b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    setTimeout(function () { b.hidden = true; }, 1300);
  }

  /* ---------- 問題を選ぶ ---------- */
  function pickGymMon() {
    var all = Q.area('a1').monsters;
    var seen = all.filter(function (m) { return Q.isCaught(m); });
    var list = (seen.length >= 5 ? seen : all).filter(function (m) { return B.gymMons.indexOf(m.id) < 0; });
    if (!list.length) list = all.slice();
    list = Q.shuffle(list).sort(function (a, b) { return Q.mastery(a) - Q.mastery(b); });
    B.gymMons.push(list[0].id);
    return list[0];
  }
  function pickQ() {
    var f = B.foe, m = f.boss ? pickGymMon() : Q.mon[f.id], q;
    if (B.kind === 'review') {
      var t = Q.day();
      var dues = m.qlist.filter(function (x) { var r = Q.S.srs[x.id]; return r && r.due <= t && B.used.indexOf(x.id) < 0; });
      q = dues.length ? Q.pick(dues) : Q.chooseQuestion(m, B.used);
    } else q = Q.chooseQuestion(m, B.used);
    B.used.push(q.id);
    return Q.prep(q);
  }

  /* ---------- ダメージ ---------- */
  function foeDmg() {
    var d = 3 + Math.round(B.foe.lv * 1.5) + Math.floor(Math.random() * 4);
    if (B.foe.boss) d = Math.round(d * 1.6);
    return Math.max(4, d);
  }
  var PRAISE = [
    '{f}は ぐらりと ゆれた! かんぺきな こたえだ!',
    'いいところを ついた! {f}に ふかく ささった!',
    'ひらめきの いちげき! {f}は たじろいだ!',
    'せいかい! {f}に ずっしり きいている!',
    'ちしきの ちからが はじけた! {f}は よろめいた!'
  ];

  /* ---------- 経験値 ---------- */
  async function giveExp(n, half) {
    var m = B.me, nm = meName();
    var ups = PA.addExp(m, n);
    await msg(nm + 'は けいけんち ' + n + ' を てにいれた!' + (half ? '\n(ヒントを つかったので はんぶん)' : ''));
    if (!ups.length) { setExpBar(m.exp / PA.need(m.lv), true); return; }
    for (var i = 0; i < ups.length; i++) {
      setExpBar(1, true); await wait(480);
      PA.sfx('levelup'); banner();
      $('b-me-lv').textContent = 'Lv' + ups[i].lv;
      var hpMaxNow = PA.maxHp(m);
      setBar($('b-me-hp'), m.hp / hpMaxNow);
      $('b-me-hpnum').textContent = m.hp + ' / ' + hpMaxNow;
      await msg(nm + 'は レベル ' + ups[i].lv + ' に あがった!\nさいだいHPが ' + ups[i].hpUp + ' ふえた!', true);
      setExpBar(0, false);
    }
    setExpBar(m.exp / PA.need(m.lv), true);
    if (PA.canEvolve(m)) await msg(nm + 'の からだが ひかりはじめた…!\n(バトルが おわると しんかするよ)', true);
  }

  /* ---------- かいせつ ---------- */
  async function explain(q, ok) {
    var txt = (ok ? '' : 'せいかいは「' + q.choices[q.ans] + '」。') + q.ex;
    var pages = ui.chunk(txt, 56);
    for (var i = 0; i < pages.length; i++) await msg((i === 0 && ok ? 'かいせつ:\n' : '') + pages[i], true);
  }

  /* ---------- たたかう ---------- */
  async function doFight() {
    var q = B.q;
    var head = (B.kind === 'gym' || B.kind === 'review') ? '[' + q.src.mon.term + ']\n' : '';
    setText(head + q.q);
    var items = q.choices.map(function (c, i) { return { label: c, cls: 'mv' + i }; });
    var pick = await cmd(items, 'moves', true);
    if (pick === items.length) { cmdClear(); return; }
    B.q = null;
    var ok = pick === q.ans;
    var btns = $('b-cmd').querySelectorAll('.cb');
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (i === q.ans) btns[i].classList.add('right'); else if (i === pick) btns[i].classList.add('wrong'); else btns[i].classList.add('dim');
    }
    PA.sfx(ok ? 'ok' : 'ng');
    Q.record(q.id, ok);                     /* 復習データへ、毎回かならず記録する */
    B.res.answered++; if (ok) B.res.correct++;
    await wait(900);
    cmdClear();

    if (ok) {
      B.streak++;
      var crit = B.streak >= 3, f = B.foe, nm = meName();
      await msg(nm + 'の こうげき!');
      PA.sfx('hit');
      await anim($('b-me'), 'lunge', 320);
      burst();
      var dmg = f.boss ? 1 : PA.baseDmg(B.me.lv) + Math.floor(Math.random() * 3);
      if (crit && !f.boss) dmg = Math.round(dmg * 1.3);
      f.hp = Math.max(0, f.hp - dmg);
      setBar($('b-foe-hp'), f.hp / f.max);
      await anim($('b-foe'), 'hit', 600);
      await msg(crit ? 'れんぞく せいかい! きゅうしょに あたった!\n' + f.name + 'は おおきく ゆらいだ!' : Q.pick(PRAISE).replace('{f}', f.name));
      await giveExp(Math.round((7 + f.lv * 0.5) * (B.hinted ? 0.5 : 1)), B.hinted);
      await explain(q, true);
      if (f.hp <= 0) await foeDown();
    } else {
      B.streak = 0;
      var nm2 = meName(), f2 = B.foe;
      await msg('ちがった…! ' + f2.name + 'の はんげき!');
      await anim($('b-foe'), 'lunge-foe', 320);
      var d = foeDmg(), from = B.me.hp;
      B.me.hp = Math.max(0, B.me.hp - d);
      PA.sfx('hurt'); setMeHp(from);
      await anim($('b-me'), 'hit', 600);
      await msg(nm2 + 'は ' + d + ' の ダメージを うけた!');
      await explain(q, false);
      if (B.me.hp <= 0) await meDown();
    }
  }

  /* ---------- たおれる ---------- */
  async function foeDown() {
    var f = B.foe, fe = $('b-foe');
    PA.sfx('faint'); fe.classList.add('faint'); await wait(700);
    fe.style.visibility = 'hidden'; fe.classList.remove('faint');
    await msg(B.kind === 'wild' ? 'やせいの ' + f.name + ' を たおした!' : f.name + ' を たおした!');
    await giveExp(Math.round((10 + f.lv) * (B.kind === 'wild' ? 1 : 1.4)), false);
    B.fi++;
    if (B.fi < B.opts.foes.length) {
      B.foe = mkFoe(B.opts.foes[B.fi]); B.q = null;
      showFoeInfo();
      await msg(trainerName() + ' は ' + B.foe.name + ' を くりだした!');
      var fe2 = $('b-foe'); fe2.style.visibility = 'visible'; anim(fe2, 'enter-foe', 600);
      return;
    }
    await victory();
  }
  async function meDown() {
    var me = $('b-me'), nm = meName();
    PA.sfx('faint'); me.classList.add('faint'); await wait(700);
    me.style.visibility = 'hidden'; me.classList.remove('faint');
    await msg(nm + 'は たおれた!');
    if (PA.aliveCount() === 0) {
      await msg('たたかえる なかまが いなくなった…', true);
      B.res.wiped = true; B.over = true; return;
    }
    await doSwitch(true);
  }

  async function victory() {
    B.res.won = true;
    PA.sfx('win');
    if (B.kind === 'wild') await recruitFlow();
    else if (B.kind === 'gym') await msg(trainerName() + ' との しょうぶに かった!', true);
    else if (B.kind === 'review') await msg('ふくしゅうバトル かんりょう! おぼえなおせたね!', true);
    else await msg(trainerName() + ' との しょうぶに かった!', true);
    B.over = true;
  }

  /* 野生: 仲間にする */
  async function recruitFlow() {
    var f = B.foe, d = Q.mon[f.id];
    if (Q.S.caught[f.id]) return;
    await msg(f.name + 'は なかまに なりたそうに こちらを みている!', true);
    await msg(d.term + '\n' + d.analogy, true);
    await msg('ようてん\n' + d.points.map(function (p) { return '- ' + p; }).join('\n'), true);
    setText('なかまに する?');
    var c = await cmd([{ label: 'なかまに する', cls: 'c-fight' }, { label: 'ならない', cls: 'c-run' }], 'cmd2');
    cmdClear();
    if (c !== 0) { await msg(f.name + 'は しずかに もりへ かえっていった。'); return; }
    var where = PA.recruit(f.id, f.lv);
    B.res.recruited = f.id;
    PA.sfx('catch');
    await msg(f.name + ' が なかまに くわわった!\nずかんに とうろくされた!', true);
    if (where === 'box') await msg('てもちが いっぱいなので、' + f.name + 'は ボックスへ おくられた。', true);
  }

  /* ---------- なかま(入れ替え) ---------- */
  function pickMate(forced) {
    return new Promise(function (resolve) {
      var sw = $('b-sw'), p = PA.P().party;
      var h = '<div class="sw-head">' + (forced ? 'つぎに だす なかまを えらぼう' : 'だれと こうたいする?') + '</div><div class="sw-list">';
      p.forEach(function (m, i) {
        var cur = (m === B.me), ok = m.hp > 0 && !cur, max = PA.maxHp(m);
        h += '<button class="sw-row' + (ok ? '' : ' off') + '" data-i="' + i + '"' + (ok ? '' : ' disabled') + '>' +
          '<img class="px" src="' + PA.monImg(m.id, m.stage) + '" alt="">' +
          '<span class="sw-main"><b>' + Q.esc(PA.stageName(m.id, m.stage)) + '</b> <small>Lv' + m.lv + (cur ? '(でている)' : m.hp <= 0 ? '(たおれた)' : '') + '</small>' +
          ui.bar('hp ' + (m.hp / max > 0.5 ? 'g' : m.hp / max > 0.2 ? 'y' : 'r'), m.hp / max) + '<small>HP ' + m.hp + ' / ' + max + '</small></span></button>';
      });
      h += '</div>' + (forced ? '' : '<button class="btn center" data-i="-1">もどる</button>');
      sw.innerHTML = h; sw.hidden = false;
      sw.onclick = function (e) {
        var b = e.target.closest('button'); if (!b || b.disabled) return;
        PA.sfx('tap'); sw.hidden = true; sw.onclick = null; sw.innerHTML = '';
        resolve(+b.getAttribute('data-i'));
      };
    });
  }
  async function doSwitch(forced) {
    cmdClear();
    setText(forced ? 'つぎに だす なかまを えらぼう。' : 'だれと こうたいする?');
    var i = await pickMate(forced);
    if (i < 0) return;
    var P = PA.P(), nu = P.party[i], me = $('b-me');
    if (!forced) {
      await msg(meName() + ' もどれ!');
      me.classList.add('out'); await wait(380);
      me.style.visibility = 'hidden'; me.classList.remove('out');
    }
    B.me = nu; B.mi = i; B.streak = 0;
    showMeInfo();
    me.style.visibility = 'visible'; anim(me, 'enter-me', 600);
    await msg('ゆけ! ' + meName() + '!');
  }

  /* ---------- ヒント・にげる ---------- */
  async function doHint() {
    var m = B.q.src.mon;
    cmdClear();
    if (B.hinted) {
      await msg('ヒントは もう よんだね。たとえ話を おもいだそう。');
      await msg(m.analogy, true);
      return;
    }
    B.hinted = true;
    await msg('ヒント! (この もんだいの けいけんちは はんぶんに なるよ)');
    await msg(m.analogy, true);
  }
  async function doRun() {
    cmdClear();
    if (B.kind !== 'wild') { await msg('しょうぶの さいちゅうに せなかは みせられない!'); return; }
    await msg('うまく にげきれた!');
    B.res.ran = true; B.over = true;
  }

  /* ---------- 本体 ---------- */
  PA.battle = async function (opts) {
    var P = PA.P();
    B = {
      kind: opts.kind, opts: opts, fi: 0, used: [], q: null, hinted: false, streak: 0, over: false, gymMons: [],
      res: { won: false, wiped: false, ran: false, recruited: false, answered: 0, correct: 0 }
    };
    B.mi = PA.firstAlive(); B.me = P.party[B.mi];
    ui.show('battle'); unit();
    $('b-field').className = 'bg-' + (opts.bg || 'grass');
    Q.bgm(opts.kind === 'gym' ? 'boss' : 'battle');
    cmdClear(); setText(''); $('b-sw').hidden = true; $('b-lvup').hidden = true; $('b-fx').innerHTML = '';
    B.foe = mkFoe(opts.foes[0]);
    showFoeInfo(); showMeInfo();
    $('b-me').style.visibility = 'hidden';
    var fe = $('b-foe'); fe.style.visibility = 'visible'; fe.classList.add('enter-foe');
    await wait(650); fe.classList.remove('enter-foe');

    var tn = trainerName();
    if (opts.kind === 'wild') await msg('あ! やせいの ' + B.foe.name + ' が とびだしてきた!');
    else if (opts.kind === 'review') {
      await msg('ふくしゅうバトル! ' + opts.foes.length + 'たいの モンスターが あらわれた!');
    } else {
      await msg(tn + ' が しょうぶを しかけてきた!');
      await msg(tn + ' は ' + B.foe.name + ' を くりだした!');
    }
    var me = $('b-me'); me.style.visibility = 'visible'; anim(me, 'enter-me', 600);
    await msg('ゆけ! ' + meName() + '!');

    while (!B.over) {
      if (!B.q) { B.q = pickQ(); B.hinted = false; }
      setText(meName() + 'は どうする?');
      var c = await cmd([
        { label: 'たたかう', cls: 'c-fight' }, { label: 'なかま', cls: 'c-mate' },
        { label: 'ヒント', cls: 'c-hint' }, { label: 'にげる', cls: 'c-run' }
      ], 'cmd4');
      if (c === 0) await doFight();
      else if (c === 1) await doSwitch(false);
      else if (c === 2) await doHint();
      else if (c === 3) await doRun();
    }
    cmdClear();
    Q.write();
    return B.res;
  };
})();

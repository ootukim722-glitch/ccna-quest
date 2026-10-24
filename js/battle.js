/* battle.js - クイズバトル(野生 / ボス / ふくしゅう) */
(function () {
  'use strict';
  var Q = window.QUEST, ui = Q.ui;

  /* opts: { kind:'wild'|'boss'|'review', mon, area, questions?:[Question], hp, hearts, enemyName, enemyTerm, img }
     戻り値: Promise<{won, newly}> */
  Q.battle = function (opts) {
    return new Promise(function (resolve) {
      var root = ui.$('s-battle');
      var hpMax = opts.hp, hp = hpMax, hearts = opts.hearts, heartsMax = opts.hearts;
      var used = [], mistakes = 0, queue = opts.questions ? opts.questions.slice() : null;
      var mon = opts.mon;
      var img = opts.img || Q.monImg(mon.id, { boss: opts.kind === 'boss' });
      var name = opts.enemyName || (mon.nick + ' (' + mon.term + ')');

      root.innerHTML =
        '<div class="b-top"><div class="b-info"><div class="b-name">' + Q.esc(opts.enemyName || mon.nick) + '</div>' +
        '<div class="b-term">' + Q.esc(opts.enemyTerm || mon.term) + '</div>' +
        '<div class="hp"><div class="bar"><i id="b-hp" style="width:100%"></i></div></div></div>' +
        '<div class="hearts" id="b-hearts"></div></div>' +
        '<div class="b-stage"><img class="px" id="b-img" src="' + img + '" alt=""></div>' +
        '<div class="b-body" id="b-body"></div>';
      ui.show('battle');
      Q.bgm(opts.kind === 'boss' ? 'boss' : 'battle');
      var body = ui.$('b-body'), imgEl = ui.$('b-img');

      function drawHud() {
        ui.$('b-hp').style.width = Math.max(0, hp / hpMax * 100) + '%';
        ui.$('b-hearts').innerHTML = ui.hearts(hearts, heartsMax) + '<small>やる気</small>';
      }
      drawHud();

      function button(label, cls) { return '<button class="btn ' + (cls || 'primary') + ' center" data-go="1">' + label + '</button>'; }
      function waitTap(html) {
        return new Promise(function (res) {
          body.innerHTML = html;
          body.scrollTop = 0;
          var b = body.querySelector('[data-go]');
          b.onclick = function () { Q.sfx('tap'); res(); };
        });
      }

      function learnCard(m) {
        var h = '<div class="learn-card"><div class="muted">はじめて出会った! まず説明を聞こう</div><h3>' + Q.esc(m.nick) + '</h3>' +
          '<div class="muted">' + Q.esc(m.term) + '</div>' +
          '<div class="analogy">たとえると: ' + Q.rich(m.analogy || '') + '</div><ul>';
        (m.points || []).forEach(function (p) { h += '<li>' + Q.rich(p) + '</li>'; });
        return h + '</ul></div>' + button('わかった! バトルかいし');
      }

      function nextQuestion() {
        if (queue) return queue.shift();
        if (opts.kind === 'boss') return null;
        var q = Q.chooseQuestion(mon, used); used.push(q.id); return q;
      }

      function ask(q) {
        return new Promise(function (res) {
          var p = Q.prep(q);
          var h = '<div class="q-text">' + Q.rich(p.q) + '</div><div id="b-ch">';
          p.choices.forEach(function (c, k) { h += '<button class="choice" data-k="' + k + '">' + Q.rich(c) + '</button>'; });
          body.innerHTML = h + '</div><div id="b-fb"></div>';
          body.scrollTop = 0;
          var done = false;
          body.querySelector('#b-ch').addEventListener('click', function (e) {
            var b = e.target.closest('.choice'); if (!b || done) return; done = true;
            var k = +b.getAttribute('data-k'), ok = (k === p.ans);
            body.querySelectorAll('.choice').forEach(function (x, n) {
              x.classList.add('dis'); if (n === p.ans) x.classList.add('ok'); else if (n === k) x.classList.add('ng');
            });
            Q.record(q.id, ok);
            res({ ok: ok, p: p });
          });
        });
      }

      function feedback(ok, p, last) {
        return new Promise(function (res) {
          var fb = body.querySelector('#b-fb');
          fb.innerHTML = '<div class="verdict ' + (ok ? 'good' : 'bad') + '">' + (ok ? 'せいかい! こうげきが きまった!' : 'おしい! やる気が すこし へった…') + '</div>' +
            '<div class="ex ' + (ok ? 'good' : 'bad') + '">' + Q.rich(p.ex) + '</div>' + button(last ? 'つぎへ' : 'つぎのもんだい');
          fb.querySelector('[data-go]').onclick = function () { Q.sfx('tap'); res(); };
          fb.scrollIntoView({ block: 'end', behavior: 'smooth' });
        });
      }

      function hitAnim() {
        imgEl.classList.remove('hit'); void imgEl.offsetWidth; imgEl.classList.add('hit');
      }

      (async function run() {
        Q.sfx('encounter');
        if (opts.kind === 'wild' && !Q.isCaught(mon)) {
          await waitTap(learnCard(mon));
        } else if (opts.kind === 'boss') {
          await waitTap('<div class="learn-card"><h3>' + Q.esc(opts.enemyName) + '</h3><div class="analogy">' + Q.rich(opts.intro || '') + '</div>' +
            '<div class="muted">全 ' + hpMax + ' 問。やる気ゲージは ' + heartsMax + ' つ。がんばれ!</div></div>' + button('しょうぶ!'));
        } else if (opts.kind === 'review') {
          await waitTap('<div class="learn-card"><h3>' + Q.esc(opts.enemyName) + '</h3><div class="analogy">' + Q.rich(opts.intro || '') + '</div></div>' + button('たおしにいく!'));
        } else {
          await waitTap('<div class="learn-card"><h3>' + Q.esc(mon.nick) + ' があらわれた!</h3><div class="muted">' + Q.esc(mon.term) + '</div></div>' + button('バトルかいし'));
        }

        while (hp > 0 && hearts > 0) {
          var q = nextQuestion();
          if (!q) break;
          var a = await ask(q);
          if (a.ok) {
            Q.sfx('ok'); hitAnim(); hp--; drawHud();
          } else {
            Q.sfx('ng'); hearts--; mistakes++; drawHud();
            document.getElementById('app').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 240 });
          }
          await feedback(a.ok, a.p, hp <= 0 || hearts <= 0);
        }

        var won = hp <= 0;
        if (won) {
          Q.sfx(opts.kind === 'wild' ? 'catch' : 'win');
          imgEl.classList.add('caught');
          var newly = false;
          if (opts.kind === 'wild') {
            newly = !Q.isCaught(mon);
            if (newly) { Q.S.caught[mon.id] = { day: Q.day() }; Q.S.daily.caught++; }
            Q.write();
            var star = Q.stars(mon);
            await waitTap('<div class="learn-card"><div class="verdict good" style="font-size:1.3rem">' + (newly ? Q.esc(mon.nick) + ' が なかまに なった!' : Q.esc(mon.nick) + ' に勝った!') + '</div>' +
              '<div class="muted">' + Q.esc(mon.term) + ' ／ ミス ' + mistakes + ' 回</div>' +
              '<div class="analogy">たとえると: ' + Q.rich(mon.analogy || '') + '</div><ul>' + (mon.points || []).map(function (p) { return '<li>' + Q.rich(p) + '</li>'; }).join('') + '</ul>' +
              '<div class="stars">マスターど ' + Q.pips(star, 3) + '</div></div>' + button('とじる'));
          } else if (opts.kind === 'boss') {
            Q.S.badges[opts.area.id] = Q.S.badges[opts.area.id] || Q.day(); Q.write();
            await waitTap('<div class="learn-card"><div class="verdict good" style="font-size:1.3rem">' + Q.esc(opts.area.name) + ' のバッジを ゲット!</div>' +
              '<div class="muted">ミス ' + mistakes + ' 回。よくがんばった!</div></div>' + button('とじる'));
          } else {
            await waitTap('<div class="learn-card"><div class="verdict good" style="font-size:1.3rem">ワスレモンを やっつけた!</div>' +
              '<div class="muted">思い出す力が ついたよ。ミス ' + mistakes + ' 回</div></div>' + button('とじる'));
          }
          Q.bgm(null);
          resolve({ won: true, newly: newly, mistakes: mistakes });
        } else {
          Q.sfx('lose');
          var hint = '';
          if (mon && opts.kind === 'wild') {
            hint = '<div class="analogy">たとえると: ' + Q.rich(mon.analogy || '') + '</div><ul>' + (mon.points || []).map(function (p) { return '<li>' + Q.rich(p) + '</li>'; }).join('') + '</ul>';
          }
          await waitTap('<div class="learn-card"><div class="verdict bad" style="font-size:1.2rem">やる気が なくなった… 今日はここまで</div>' +
            '<div class="muted">大丈夫、間違えた問題は復習に出るよ。もう一度 おさらいしよう!</div>' + hint + '</div>' + button('とじる', 'dim'));
          Q.bgm(null);
          resolve({ won: false, newly: false, mistakes: mistakes });
        }
      })();
    });
  };
})();

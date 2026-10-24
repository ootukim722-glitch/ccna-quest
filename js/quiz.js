/* quiz.js - バトル以外の出題(計算ドリル・もぎしけん)に使う共通クイズ画面 */
(function () {
  'use strict';
  var Q = window.QUEST, ui = Q.ui;

  /* opts: { title, questions:[prep形式], instant:true/false, record:true/false, onExit }
     戻り値: Promise<{ correct, total, wrong:[...], byArea:{} }> */
  Q.quiz = function (opts) {
    return new Promise(function (resolve) {
      var qs = opts.questions, i = 0, correct = 0, wrong = [], byArea = {};
      var answered = false;

      function dots() {
        var h = '<div class="progress-dots">';
        var n = Math.min(qs.length, 30);
        for (var k = 0; k < n; k++) h += '<i class="' + (k < i ? 'on' : (k === i ? 'cur' : '')) + '"></i>';
        return h + '</div>';
      }
      function render() {
        answered = false;
        var q = qs[i];
        var html = dots() + '<div class="muted" style="text-align:center">' + (i + 1) + ' / ' + qs.length + '</div>' +
          '<div class="q-text">' + Q.rich(q.q) + '</div><div id="qz-ch">';
        q.choices.forEach(function (c, k) { html += '<button class="choice" data-k="' + k + '">' + Q.rich(c) + '</button>'; });
        html += '</div><div id="qz-fb"></div>';
        var body = ui.panel(opts.title, html, { onBack: function () { quit(); } });
        body.querySelector('#qz-ch').addEventListener('click', function (e) {
          var b = e.target.closest('.choice'); if (!b || answered) return;
          answered = true; answer(+b.getAttribute('data-k'), body);
        });
      }
      function answer(k, body) {
        var q = qs[i], ok = (k === q.ans);
        var btns = body.querySelectorAll('.choice');
        if (opts.instant) {
          btns.forEach(function (b, n) { b.classList.add('dis'); if (n === q.ans) b.classList.add('ok'); else if (n === k) b.classList.add('ng'); });
        } else {
          btns.forEach(function (b, n) { b.classList.add('dis'); if (n === k) b.style.borderColor = 'var(--accent)'; });
        }
        if (ok) correct++; else wrong.push({ q: q, picked: k });
        var aid = q.src && q.src.mon ? q.src.mon.areaId : (q.id && q.id.indexOf('gen:') === 0 ? 'gen' : 'x');
        var b = byArea[aid] = byArea[aid] || { ok: 0, n: 0 }; b.n++; if (ok) b.ok++;
        if (opts.record && q.src && q.id) Q.record(q.id, ok);
        else if (!q.src) { Q.S.stats.ans++; if (ok) Q.S.stats.ok++; Q.write(); }
        Q.sfx(opts.instant ? (ok ? 'ok' : 'ng') : 'tap');
        var fb = body.querySelector('#qz-fb');
        var last = (i + 1 >= qs.length);
        var h = '';
        if (opts.instant) {
          h += '<div class="verdict ' + (ok ? 'good' : 'bad') + '">' + (ok ? '⭕ せいかい!' : '❌ ざんねん…') + '</div>' +
            '<div class="ex ' + (ok ? 'good' : 'bad') + '">' + Q.rich(q.ex || '') + '</div>';
        }
        h += '<button class="btn primary center" id="qz-next">' + (last ? '結果を見る' : 'つぎへ') + '</button>';
        fb.innerHTML = h;
        fb.querySelector('#qz-next').onclick = function () { Q.sfx('tap'); i++; if (i >= qs.length) finish(); else render(); };
        fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      function finish() { resolve({ correct: correct, total: qs.length, wrong: wrong, byArea: byArea }); }
      function quit() {
        if (i === 0 && !answered) { resolve(null); return; }
        ui.confirm('ここでやめますか?\n(ここまでの結果は保存されません)', 'つづける', 'やめる').then(function (keep) {
          if (!keep) resolve(null);
        });
      }
      render();
    });
  };

  /* 結果画面。wrongの一覧つき。戻り値は押したボタン */
  Q.quizResult = function (title, res, extraHtml, actions) {
    var pct = Math.round(res.correct / res.total * 100);
    var html = '<div class="card" style="text-align:center"><div class="muted">せいかい</div><div class="big-num">' + res.correct + ' / ' + res.total + '</div>' +
      '<div class="verdict ' + (pct >= 80 ? 'good' : 'bad') + '">' + pct + '%</div></div>' + (extraHtml || '');
    if (res.wrong.length) {
      html += '<h3 style="margin:14px 0 6px">まちがえた問題</h3><div class="result-list">';
      res.wrong.forEach(function (w) {
        html += '<div class="item"><div style="font-weight:700;margin-bottom:4px">' + Q.rich(w.q.q) + '</div>' +
          '<div style="color:var(--ng)">あなた: ' + Q.rich(w.q.choices[w.picked]) + '</div>' +
          '<div style="color:var(--ok)">正解: ' + Q.rich(w.q.choices[w.q.ans]) + '</div>' +
          '<div class="ex">' + Q.rich(w.q.ex || '') + '</div></div>';
      });
      html += '</div>';
    }
    html += '<div style="margin-top:14px">' + actions.map(function (a, k) { return '<button class="btn ' + (a.cls || '') + ' center" data-act="r' + k + '">' + Q.esc(a.label) + '</button>'; }).join('') + '</div>';
    return new Promise(function (resolve) {
      var body = ui.panel(title, html, { back: false });
      ui.bind(body, (function () { var h = {}; actions.forEach(function (a, k) { h['r' + k] = function () { resolve(a.id); }; }); return h; })());
    });
  };
})();

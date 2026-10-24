/* sfx.js - 試作B用の効果音。基本は本体の Q.sfx を使い、足りない音だけここで合成する */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PB = window.PB = window.PB || {};
  var ctx = null, master = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function tone(freq, t0, dur, type, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  PB.sfx = function (name) {
    try {
      if (!Q.S || !Q.S.set.sfx) return;
      if (name === 'tap' || name === 'ok' || name === 'ng' || name === 'win' || name === 'talk' || name === 'lose') { Q.sfx(name); return; }
      if (!ensure()) return;
      var t = ctx.currentTime;
      switch (name) {
        case 'memo':   /* 証拠メモに貼った */
          tone(660, t, 0.06, 'square', 0.1); tone(990, t + 0.07, 0.12, 'square', 0.1); break;
        case 'key':    /* 端末の文字が出る */
          tone(1800, t, 0.015, 'square', 0.025); break;
        case 'reveal': /* 推理が決まる */
          [392, 523.3, 659.3, 784].forEach(function (f, i) { tone(f, t + i * 0.08, 0.14, 'square', 0.12); }); break;
        case 'point':  /* 証拠をつきつける */
          tone(220, t, 0.08, 'sawtooth', 0.12); tone(440, t + 0.09, 0.16, 'square', 0.13); break;
      }
    } catch (e) { /* 音が出なくても遊べる */ }
  };
  PB.bgm = function (name) { try { Q.bgm(name); } catch (e) { } };

  document.addEventListener('pointerdown', function () { try { Q.audioUnlock(); } catch (e) { } }, { passive: true });
})();

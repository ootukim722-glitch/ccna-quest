/* audio.js - 効果音とBGMをその場で合成(音声ファイル不要・著作権の心配なし) */
(function () {
  'use strict';
  var Q = window.QUEST;
  var ctx = null, master = null, bgmGain = null, timer = null, curTrack = null, step = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.07; bgmGain.connect(master);
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function tone(freq, t0, dur, type, vol, dest, slideTo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5, A3: 220, G3: 196, E3: 164.8, F3: 174.6, D3: 146.8, C3: 130.8 };

  Q.sfx = function (name) {
    if (!Q.S || !Q.S.set.sfx || !ensure()) return;
    var t = ctx.currentTime;
    switch (name) {
      case 'ok': tone(N.E5, t, 0.1, 'square', 0.18); tone(N.A5, t + 0.09, 0.16, 'square', 0.18); break;
      case 'ng': tone(N.G3, t, 0.18, 'sawtooth', 0.18); tone(N.D3, t + 0.14, 0.28, 'sawtooth', 0.18); break;
      case 'tap': tone(N.A4, t, 0.05, 'square', 0.08); break;
      case 'step': tone(120, t, 0.04, 'triangle', 0.05); break;
      case 'bump': tone(90, t, 0.07, 'square', 0.07); break;
      case 'encounter': [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.07, 0.09, 'square', 0.14); }); break;
      case 'catch': [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E5 * 2].forEach(function (f, i) { tone(f, t + i * 0.11, 0.16, 'square', 0.16); }); break;
      case 'win': [N.G4, N.C5, N.E5, N.G5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.13, 0.2, 'square', 0.15); }); break;
      case 'lose': [N.E4, N.D4, N.C4, N.A3].forEach(function (f, i) { tone(f, t + i * 0.2, 0.3, 'triangle', 0.2); }); break;
      case 'talk': tone(N.E5, t, 0.04, 'square', 0.06); break;
    }
  };

  var TRACKS = {
    map: { tempo: 0.24, lead: [N.E5, 0, N.G5, 0, N.A5, N.G5, N.E5, 0, N.D5, 0, N.E5, 0, N.C5, 0, 0, 0, N.E5, 0, N.G5, 0, N.A5, N.G5, N.E5, 0, N.G5, 0, N.D5, 0, N.C5, 0, 0, 0], bass: [N.C3, 0, N.G3, 0, N.A3, 0, N.E3, 0, N.F3, 0, N.C3, 0, N.G3, 0, N.G3, 0] },
    battle: { tempo: 0.15, lead: [N.A4, N.A4, N.C5, N.A4, N.E5, N.A4, N.C5, N.A4, N.G4, N.G4, N.B4, N.G4, N.D5, N.G4, N.B4, N.G4, N.F4, N.F4, N.A4, N.F4, N.C5, N.F4, N.A4, N.F4, N.G4, N.G4, N.B4, N.G4, N.E5, D5(), N.B4, N.G4], bass: [N.A3, 0, N.A3, 0, N.G3, 0, N.G3, 0, N.F3, 0, N.F3, 0, N.G3, 0, N.G3, 0] },
    boss: { tempo: 0.13, lead: [N.E5, N.E5, 0, N.E5, N.G5, 0, N.E5, 0, N.D5, N.D5, 0, N.D5, N.F4 * 2, 0, N.D5, 0, N.C5, N.C5, 0, N.C5, N.E5, 0, N.C5, 0, N.B4, 0, N.D5, 0, N.G5, 0, 0, 0], bass: [N.E3, N.E3, N.E3, N.E3, N.D3, N.D3, N.D3, N.D3, N.C3, N.C3, N.C3, N.C3, N.G3, N.G3, N.G3, N.G3] }
  };
  function D5() { return N.D5; }

  function tick() {
    if (!curTrack || !ctx) return;
    var tr = TRACKS[curTrack], t = ctx.currentTime + 0.02;
    var f = tr.lead[step % tr.lead.length];
    if (f) tone(f, t, tr.tempo * 0.9, 'square', 0.9, bgmGain);
    if (step % 2 === 0) {
      var b = tr.bass[(step / 2) % tr.bass.length];
      if (b) tone(b, t, tr.tempo * 1.8, 'triangle', 1.2, bgmGain);
    }
    step++;
  }
  Q.bgm = function (name) {
    if (name === curTrack) return;
    curTrack = name; step = 0;
    if (timer) { clearInterval(timer); timer = null; }
    if (!name || !Q.S || !Q.S.set.bgm || !ensure()) return;
    timer = setInterval(tick, TRACKS[name].tempo * 1000);
  };
  Q.bgmRefresh = function () { var n = curTrack; curTrack = null; Q.bgm(n); };
  Q.audioUnlock = function () { ensure(); };
})();

/* gen.js - サブネット計算ドリル(問題を自動で作る) */
(function () {
  'use strict';
  var Q = window.QUEST;

  function ip2n(a, b, c, d) { return (((a << 24) | (b << 16) | (c << 8) | d) >>> 0); }
  function n2ip(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function maskN(p) { return p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0); }
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function randIp(level) {
    var f = level >= 2 ? Q.pick([10, 172, 192, 100]) : Q.pick([192, 172, 10]);
    if (f === 192) return ip2n(192, 168, ri(0, 255), ri(1, 254));
    if (f === 172) return ip2n(172, ri(16, 31), ri(0, 255), ri(1, 254));
    if (f === 100) return ip2n(100, ri(64, 127), ri(0, 255), ri(1, 254));
    return ip2n(10, ri(0, 255), ri(0, 255), ri(1, 254));
  }
  function randPrefix(level) { return level >= 2 ? ri(16, 30) : ri(24, 30); }

  /* 正解+ダミーを4択にする。ダミーは重複させない */
  function build(q, correct, wrongs, ex) {
    var set = [String(correct)];
    wrongs.forEach(function (w) { w = String(w); if (set.indexOf(w) < 0) set.push(w); });
    var guard = 0;
    while (set.length < 4 && guard++ < 50) { var w = wrongs[0]; set.push(String(w) + '*'.repeat(set.length)); }
    set = set.slice(0, 4);
    var order = Q.shuffle([0, 1, 2, 3]);
    var choices = order.map(function (i) { return set[i]; });
    return { id: null, q: q, choices: choices, ans: order.indexOf(0), ex: ex, gen: true };
  }
  function blockInfo(p) {
    var oct = Math.floor((p - 1) / 8);          // 変化する桁 0〜3
    var bits = 8 * (oct + 1) - p;               // その桁で使うホスト側ビット数
    var block = Math.pow(2, bits);
    return { oct: oct, block: block, maskOct: 256 - block };
  }

  var KINDS = {
    net: { label: 'ネットワークアドレスを求める', make: function (lv) {
      var p = randPrefix(lv), ip = randIp(lv), m = maskN(p), net = (ip & m) >>> 0, size = Math.pow(2, 32 - p), b = blockInfo(p);
      var ex = 'IP を /' + p + ' のマスクで区切ります。変化する桁は第' + (b.oct + 1) + 'オクテット、ブロックサイズは 256−' + b.maskOct + '＝' + b.block + '。\n' +
        'IP のその桁 ' + (ip2arr(ip)[b.oct]) + ' を含む ' + b.block + ' の倍数の区切りが ' + ip2arr(net)[b.oct] + ' なので、ネットワークアドレスは ' + n2ip(net) + ' です。';
      return build(n2ip(ip) + '/' + p + ' の「ネットワークアドレス」は？', n2ip(net),
        [n2ip((net + size) >>> 0), n2ip((net - size) >>> 0), n2ip((net + size - 1) >>> 0), n2ip(ip)], ex);
    } },
    bc: { label: 'ブロードキャストアドレスを求める', make: function (lv) {
      var p = randPrefix(lv), ip = randIp(lv), m = maskN(p), net = (ip & m) >>> 0, size = Math.pow(2, 32 - p), bc = (net + size - 1) >>> 0, b = blockInfo(p);
      var ex = 'まずネットワークアドレスを出すと ' + n2ip(net) + '。ブロードキャストは「そのサブネットの一番最後」なので、次のネットワーク（' + n2ip((net + size) >>> 0) + '）の 1 つ前＝ ' + n2ip(bc) + ' です。（ブロックサイズ ' + b.block + ' ）';
      return build(n2ip(ip) + '/' + p + ' の「ブロードキャストアドレス」は？', n2ip(bc),
        [n2ip(net), n2ip((bc + size) >>> 0), n2ip((bc - 1) >>> 0), n2ip((net + size) >>> 0)], ex);
    } },
    hosts: { label: '使えるホスト数を求める', make: function (lv) {
      var p = lv >= 2 ? ri(16, 30) : ri(24, 30), hb = 32 - p, n = Math.pow(2, hb) - 2;
      var ex = '/' + p + ' はホスト部が ' + hb + ' ビット。2の' + hb + '乗＝' + Math.pow(2, hb) + ' から、ネットワークアドレスとブロードキャストの 2 つを引いて ' + n + ' 台です。';
      return build('/' + p + ' のサブネットで、ホストに割り当てられる IP アドレスは何個？', n,
        [n + 2, n + 1, n * 2 + 2, Math.max(2, (n + 2) / 2 - 2)], ex);
    } },
    mask: { label: 'プレフィックス→サブネットマスク', make: function (lv) {
      var p = randPrefix(lv), m = n2ip(maskN(p)), b = blockInfo(p);
      var ex = '/' + p + ' は 1 が ' + p + ' 個並ぶマスクです。変化する桁は第' + (b.oct + 1) + 'オクテットで 256−' + b.block + '＝' + b.maskOct + '。よって ' + m + ' です。';
      return build('/' + p + ' をサブネットマスク（ドット表記）にすると？', m,
        [n2ip(maskN(Math.min(32, p + 1))), n2ip(maskN(p - 1)), n2ip(maskN(Math.min(32, p + 2))), n2ip(maskN(p - 2))], ex);
    } },
    prefix: { label: 'サブネットマスク→プレフィックス', make: function (lv) {
      var p = randPrefix(lv), m = n2ip(maskN(p));
      var ex = m + ' の 2 進数で 1 が何個並ぶか数えます。' + p + ' 個なので /' + p + ' です。（255＝8個、255.255.255.0＝/24 を基準に足し引きすると楽です）';
      return build(m + ' は、プレフィックス長でいくつ？', '/' + p, ['/' + (p + 1), '/' + (p - 1), '/' + (p + 2), '/' + (p - 2)], ex);
    } },
    first: { label: '最初/最後に使えるホスト', make: function (lv) {
      var p = randPrefix(lv), ip = randIp(lv), m = maskN(p), net = (ip & m) >>> 0, size = Math.pow(2, 32 - p);
      var last = Math.random() < 0.5, ans = last ? ((net + size - 2) >>> 0) : ((net + 1) >>> 0);
      var ex = 'ネットワークアドレスは ' + n2ip(net) + '、ブロードキャストは ' + n2ip((net + size - 1) >>> 0) + '。使えるホストはその間なので、' + (last ? '一番最後は ブロードキャストの 1 つ手前＝ ' : '一番最初は ネットワークアドレスの 1 つ先＝ ') + n2ip(ans) + ' です。';
      return build(n2ip(ip) + '/' + p + ' で、' + (last ? '最後' : '最初') + 'に使えるホストアドレスは？', n2ip(ans),
        [n2ip(last ? ((net + size - 1) >>> 0) : net), n2ip(last ? ((net + size - 3) >>> 0) : ((net + 2) >>> 0)), n2ip(last ? ((net + size) >>> 0) : ((net - 1) >>> 0)), n2ip(ip)], ex);
    } },
    same: { label: '同じサブネットに入るのは？', make: function (lv) {
      var p = ri(25, 28), base = randIp(1), m = maskN(p), net = (base & m) >>> 0, size = Math.pow(2, 32 - p);
      var host = (net + ri(1, size - 2)) >>> 0, same = (net + ri(1, size - 2)) >>> 0;
      if (same === host) same = (net + (host - net) % (size - 2) + 1) >>> 0;
      var wrongs = [(net + size + ri(1, size - 2)) >>> 0, (net - ri(1, size - 2)) >>> 0, (net + size * 2 + ri(1, size - 2)) >>> 0];
      var ex = n2ip(host) + '/' + p + ' のネットワークアドレスは ' + n2ip(net) + '、ブロードキャストは ' + n2ip((net + size - 1) >>> 0) + '。この範囲に入る ' + n2ip(same) + ' が同じサブネットです。';
      return build(n2ip(host) + '/' + p + ' と「同じサブネット」にいるホストはどれ？', n2ip(same), wrongs.map(n2ip), ex);
    } },
    bin: { label: '2進数⇄10進数', make: function () {
      var v = ri(1, 254), s = ('00000000' + v.toString(2)).slice(-8), toDec = Math.random() < 0.5;
      var vals = [v, v ^ 1, v ^ 2, v ^ 16, v ^ 128].filter(function (x) { return x >= 0 && x <= 255; });
      var ex = '2 進数の各桁は左から 128, 64, 32, 16, 8, 4, 2, 1 の重みです。1 の桁の重みを足すと ' + v + ' になります。';
      if (toDec) return build('2進数 ' + s + ' を10進数にすると？', v, vals.slice(1).concat([v + 3]), ex);
      return build('10進数の ' + v + ' を8ビットの2進数にすると？', s,
        vals.slice(1).map(function (x) { return ('00000000' + x.toString(2)).slice(-8); }), ex);
    } },
    wild: { label: 'ワイルドカードマスク', make: function (lv) {
      var p = randPrefix(lv), wm = (~maskN(p)) >>> 0, m = maskN(p);
      var ex = 'ワイルドカードマスクは、サブネットマスクの 0 と 1 を逆にしたものです（255 − マスクの各値）。/' + p + ' のマスクは ' + n2ip(m) + ' なので、ワイルドカードは ' + n2ip(wm) + ' です。';
      return build('/' + p + ' に対応するワイルドカードマスクは？（ACLで使う）', n2ip(wm), [n2ip(m), n2ip((~maskN(p + 1)) >>> 0), n2ip((~maskN(p - 1)) >>> 0), n2ip((wm ^ 1) >>> 0)], ex);
    } },
    need: { label: '何台必要ならどのプレフィックス？', make: function () {
      var need = Q.pick([10, 14, 25, 30, 50, 60, 100, 120, 200, 250, 500]);
      var hb = 1; while (Math.pow(2, hb) - 2 < need) hb++;
      var p = 32 - hb, ex = 'ホスト ' + need + ' 台に必要なアドレスは、ネットワーク用とブロードキャスト用の 2 つを足して ' + (need + 2) + ' 個以上。2 の ' + hb + ' 乗＝' + Math.pow(2, hb) + ' が最初にそれを超えるので、ホスト部は ' + hb + ' ビット、つまり /' + p + ' です（使えるのは ' + (Math.pow(2, hb) - 2) + ' 台）。';
      return build('ホストが ' + need + ' 台必要です。無駄を最も少なくできるプレフィックス長は？', '/' + p, ['/' + (p + 1), '/' + (p - 1), '/' + (p + 2), '/' + (p - 2)], ex);
    } }
  };
  function ip2arr(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }

  Q.gen = {
    kinds: KINDS,
    make: function (kind, level) { return KINDS[kind].make(level || 1); },
    set: function (kind, n, level) {
      var keys = Object.keys(KINDS), out = [], seen = {};
      var guard = 0;
      while (out.length < n && guard++ < n * 8) {
        var k = kind === 'mix' ? Q.pick(keys) : kind;
        var q = KINDS[k].make(level || 1);
        if (seen[q.q]) continue;
        seen[q.q] = 1; q.id = 'gen:' + k; out.push(q);
      }
      return out;
    }
  };
})();

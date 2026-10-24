/* cases.js - 事件データの登録所と、出力を組み立てる道具(Windows / Cisco IOS)
   事件ファイル(case1.js など)は、このファイルのあとに読み込む。
   事件の形式は proto-b/README.md を参照。 */
(function () {
  'use strict';
  var PB = window.PB = window.PB || {};
  PB.cases = [];
  PB.addCase = function (c) {
    PB.cases.push(c);
    PB.cases.sort(function (a, b) { return a.no - b.no; });
  };
  PB.byId = function (id) {
    for (var i = 0; i < PB.cases.length; i++) if (PB.cases[i].id === id) return PB.cases[i];
    return null;
  };

  /* 全ケース共通の登場人物(ケースごとに cast で足してよい) */
  PB.cast = {
    me: { name: 'あなた', look: { hair: '#3b2a20', shirt: '#4f7cff', pants: '#2d3a5a', hat: null } },
    senior: { name: '凪野先輩', look: { hair: '#2b2f4a', shirt: '#2a9d8f', pants: '#3b3f58', hat: null } }
  };

  /* ---------- 文字列の道具 ---------- */
  var F = PB.fmt = {};
  F.pad = function (s, n) { s = String(s); while (s.length < n) s += ' '; return s; };
  F.padL = function (s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; };

  /* ---------- Windows ---------- */
  /* ipconfig の1行: 「項目名 . . . . : 値」の形(英語版Windowsの表示) */
  F.wl = function (label, val, wide) {
    var f = label;
    if (wide) f += '  ';
    while (f.length < 34) f += (f.length % 2 === 0) ? '.' : ' ';
    return '   ' + f + ': ' + val;
  };

  /* ipconfig
     o: { ip, mask, gw, v6, apipa } */
  F.ipconfig = function (o) {
    var L = ['', 'Windows IP Configuration', '', '', 'Ethernet adapter Ethernet:', ''];
    L.push(F.wl('Connection-specific DNS Suffix', '', true));
    L.push(F.wl('Link-local IPv6 Address', o.v6));
    L.push(F.wl(o.apipa ? 'Autoconfiguration IPv4 Address' : 'IPv4 Address', o.ip));
    L.push(F.wl('Subnet Mask', o.mask));
    L.push(F.wl('Default Gateway', o.gw || ''));
    L.push('');
    return L.join('\n');
  };

  /* ipconfig /all
     o: { host, desc, mac, dhcp(bool), ip, mask, gw, dns, v6, apipa, dhcpServer, lease:[取得,期限], iaid, duid } */
  F.ipconfigAll = function (o) {
    var L = ['', 'Windows IP Configuration', ''];
    L.push(F.wl('Host Name', o.host));
    L.push(F.wl('Primary Dns Suffix', '', true));
    L.push(F.wl('Node Type', 'Hybrid'));
    L.push(F.wl('IP Routing Enabled', 'No'));
    L.push(F.wl('WINS Proxy Enabled', 'No'));
    L.push('');
    L.push('Ethernet adapter Ethernet:');
    L.push('');
    L.push(F.wl('Connection-specific DNS Suffix', '', true));
    L.push(F.wl('Description', o.desc));
    L.push(F.wl('Physical Address', o.mac));
    L.push(F.wl('DHCP Enabled', o.dhcp ? 'Yes' : 'No'));
    L.push(F.wl('Autoconfiguration Enabled', 'Yes'));
    L.push(F.wl('Link-local IPv6 Address', o.v6 + '(Preferred) '));
    L.push(F.wl(o.apipa ? 'Autoconfiguration IPv4 Address' : 'IPv4 Address', o.ip + '(Preferred) '));
    L.push(F.wl('Subnet Mask', o.mask));
    if (o.lease) {
      L.push(F.wl('Lease Obtained', o.lease[0]));
      L.push(F.wl('Lease Expires', o.lease[1]));
    }
    L.push(F.wl('Default Gateway', o.gw || ''));
    if (o.dhcpServer) L.push(F.wl('DHCP Server', o.dhcpServer));
    L.push(F.wl('DHCPv6 IAID', o.iaid));
    L.push(F.wl('DHCPv6 Client DUID', o.duid));
    if (o.dns) L.push(F.wl('DNS Servers', o.dns));
    L.push(F.wl('NetBIOS over Tcpip', 'Enabled'));
    L.push('');
    return L.join('\n');
  };

  /* ping (Windows)
     target: 宛先 / src: 自分のIP / res: 4つの結果
       { t: '<1', ttl: 255 }  返事あり (t は ms の数字。'<1' は 1ms 未満)
       'to'                   Request timed out.
       'un'                   Destination host unreachable (自分のIPから) */
  F.ping = function (target, src, res) {
    var L = ['', 'Pinging ' + target + ' with 32 bytes of data:'];
    var got = 0, ok = 0, times = [];
    res.forEach(function (r) {
      if (r === 'to') { L.push('Request timed out.'); }
      else if (r === 'un') { L.push('Reply from ' + src + ': Destination host unreachable.'); got++; }
      else {
        var tt = (r.t === '<1') ? 'time<1ms' : 'time=' + r.t + 'ms';
        L.push('Reply from ' + target + ': bytes=32 ' + tt + ' TTL=' + r.ttl);
        got++; ok++; times.push(r.t === '<1' ? 0 : r.t);
      }
    });
    L.push('');
    L.push('Ping statistics for ' + target + ':');
    L.push('    Packets: Sent = ' + res.length + ', Received = ' + got + ', Lost = ' + (res.length - got) +
      ' (' + Math.round((res.length - got) * 100 / res.length) + '% loss),');
    if (ok > 0) {
      var mn = Math.min.apply(null, times), mx = Math.max.apply(null, times);
      var sum = 0; times.forEach(function (x) { sum += x; });
      L.push('Approximate round trip times in milli-seconds:');
      L.push('    Minimum = ' + mn + 'ms, Maximum = ' + mx + 'ms, Average = ' + Math.floor(sum / ok) + 'ms');
    }
    L.push('');
    return L.join('\n');
  };

  /* arp -a
     o: { ip: 自分のIP, idx: '0x6', rows: [[IP, MAC, 'dynamic'|'static'], ...] } */
  F.arpa = function (o) {
    var L = ['', 'Interface: ' + o.ip + ' --- ' + o.idx];
    L.push('  ' + F.pad('Internet Address', 22) + F.pad('Physical Address', 22) + 'Type');
    o.rows.forEach(function (r) {
      L.push('  ' + F.pad(r[0], 22) + F.pad(r[1], 22) + F.pad(r[2], 9));
    });
    L.push('');
    return L.join('\n');
  };
  /* 共通の static 行(ブロードキャストとマルチキャスト) */
  F.arpStatic = function (bcast) {
    return [
      [bcast, 'ff-ff-ff-ff-ff-ff', 'static'],
      ['224.0.0.22', '01-00-5e-00-00-16', 'static'],
      ['224.0.0.251', '01-00-5e-00-00-fb', 'static'],
      ['224.0.0.252', '01-00-5e-00-00-fc', 'static'],
      ['239.255.255.250', '01-00-5e-7f-ff-fa', 'static'],
      ['255.255.255.255', 'ff-ff-ff-ff-ff-ff', 'static']
    ];
  };

  /* ---------- Cisco IOS ---------- */
  /* show ip interface brief   rows: [名前, IP, Method, Status, Protocol] */
  F.ibrief = function (rows) {
    var L = [F.pad('Interface', 23) + F.pad('IP-Address', 16) + F.pad('OK?', 4) + F.pad('Method', 7) + F.pad('Status', 22) + 'Protocol'];
    rows.forEach(function (r) {
      L.push(F.pad(r[0], 23) + F.pad(r[1], 16) + F.pad('YES', 4) + F.pad(r[2], 7) + F.pad(r[3], 22) + r[4]);
    });
    return L.join('\n');
  };

  /* show vlan brief   list: [{id, name, ports:[...]}] */
  F.vlanBrief = function (list) {
    var L = [];
    L.push('VLAN Name                             Status    Ports');
    L.push('---- -------------------------------- --------- -------------------------------');
    var indent = F.pad('', 48);
    list.forEach(function (v) {
      var first = F.pad(v.id, 5) + F.pad(v.name, 33) + F.pad('active', 10);
      if (!v.ports.length) { L.push(first.replace(/\s+$/, '')); return; }
      for (var i = 0; i < v.ports.length; i += 4) {
        var chunk = v.ports.slice(i, i + 4).join(', ');
        L.push((i === 0 ? first : indent) + chunk);
      }
    });
    L.push(F.pad('1002', 5) + F.pad('fddi-default', 33) + 'act/unsup ');
    L.push(F.pad('1003', 5) + F.pad('token-ring-default', 33) + 'act/unsup ');
    L.push(F.pad('1004', 5) + F.pad('fddinet-default', 33) + 'act/unsup ');
    L.push(F.pad('1005', 5) + F.pad('trnet-default', 33) + 'act/unsup ');
    return L.join('\n');
  };

  /* show interfaces status   rows: [port, name, status, vlan, duplex, speed, type] */
  F.ifStatus = function (rows) {
    var L = [F.pad('Port', 10) + F.pad('Name', 19) + F.pad('Status', 13) + F.pad('Vlan', 11) + F.pad('Duplex', 8) + F.pad('Speed', 6) + 'Type'];
    rows.forEach(function (r) {
      L.push(F.pad(r[0], 10) + F.pad(r[1], 19) + F.pad(r[2], 13) + F.pad(r[3], 11) + F.pad(r[4], 8) + F.pad(r[5], 6) + r[6]);
    });
    return L.join('\n');
  };

  /* show mac address-table dynamic   rows: [vlan, mac, port] */
  F.macTable = function (rows) {
    var L = [];
    L.push('          Mac Address Table');
    L.push('-------------------------------------------');
    L.push('');
    L.push('Vlan    Mac Address       Type        Ports');
    L.push('----    -----------       --------    -----');
    rows.forEach(function (r) {
      L.push(F.padL(r[0], 4) + '    ' + r[1] + '    ' + F.pad('DYNAMIC', 12) + r[2]);
    });
    L.push('Total Mac Addresses for this criterion: ' + rows.length);
    return L.join('\n');
  };

  /* show running-config interface ...   lines: 設定の行(先頭に空白を含めて書く) */
  F.cfg = function (lines) {
    var body = '!\n' + lines.join('\n') + '\nend\n';
    return 'Building configuration...\n\nCurrent configuration : ' + body.length + ' bytes\n' + body.replace(/\n$/, '');
  };
})();

/* case3.js - ケース3: 午後から経理のプリンタが使えない
   原因: IPアドレスの重複(プリンタとノートPCが 192.168.20.50 を使っている)(教材 a2-ipv4 / a1-mac-table) */
(function () {
  'use strict';
  var PB = window.PB, F = PB.fmt;

  var NB_MAC_WIN = '3c-a9-f4-61-2e-d8';

  var outPcIp = F.ipconfig({ ip: '192.168.20.31', mask: '255.255.255.0', gw: '192.168.20.1', v6: 'fe80::2f4b:9c10:d7a3:6e55%6' });

  var pingGw = F.ping('192.168.20.1', '192.168.20.31', [{ t: 1, ttl: 255 }, { t: '<1', ttl: 255 }, { t: '<1', ttl: 255 }, { t: '<1', ttl: 255 }]);
  var pingMix = F.ping('192.168.20.50', '192.168.20.31', [{ t: 2, ttl: 64 }, 'to', { t: '<1', ttl: 128 }, 'to']);
  var pingFixed = F.ping('192.168.20.50', '192.168.20.31', [{ t: 2, ttl: 64 }, { t: 1, ttl: 64 }, { t: 1, ttl: 64 }, { t: 2, ttl: 64 }]);

  var arpRows = [
    ['192.168.20.1', '00-1b-54-aa-10-01', 'dynamic'],
    ['192.168.20.32', 'b0-83-fe-12-8a-4d', 'dynamic'],
    ['192.168.20.50', NB_MAC_WIN, 'dynamic']
  ].concat(F.arpStatic('192.168.20.255'));
  var outArp = F.arpa({ ip: '192.168.20.31', idx: '0x6', rows: arpRows });

  var outNbAll = F.ipconfigAll({
    host: 'MORITA-NB', desc: 'Intel(R) Ethernet Connection I219-LM', mac: NB_MAC_WIN.toUpperCase(), dhcp: false,
    ip: '192.168.20.50', mask: '255.255.255.0', gw: '192.168.20.1', dns: '192.168.20.1', v6: 'fe80::b17e:38d2:0a46:c9f1%8',
    iaid: '103655924', duid: '00-01-00-01-2A-F4-5C-3B-3C-A9-F4-61-2E-D8'
  });
  var outNbAllFixed = F.ipconfigAll({
    host: 'MORITA-NB', desc: 'Intel(R) Ethernet Connection I219-LM', mac: NB_MAC_WIN.toUpperCase(), dhcp: true,
    ip: '192.168.20.34', mask: '255.255.255.0', gw: '192.168.20.1', dns: '192.168.20.1', v6: 'fe80::b17e:38d2:0a46:c9f1%8',
    dhcpServer: '192.168.20.1',
    lease: ['Tuesday, October 27, 2026 2:05:31 PM', 'Wednesday, October 28, 2026 2:05:31 PM'],
    iaid: '103655924', duid: '00-01-00-01-2A-F4-5C-3B-3C-A9-F4-61-2E-D8'
  });

  var outBinding = [
    'Bindings from all pools not associated with VRF:',
    'IP address          Client-ID/              Lease expiration        Type',
    '                    Hardware address/',
    '                    User name',
    '192.168.20.31       015c.260a.3fd1.88       Oct 28 2026 08:41 AM    Automatic',
    '192.168.20.32       01b0.83fe.128a.4d       Oct 28 2026 08:55 AM    Automatic',
    '192.168.20.33       0150.9a4c.7e21.f6       Oct 28 2026 09:02 AM    Automatic'
  ].join('\n');

  var outDhcpCfg = [
    'ip dhcp excluded-address 192.168.20.1 192.168.20.30',
    'ip dhcp pool KEIRI',
    ' network 192.168.20.0 255.255.255.0',
    ' default-router 192.168.20.1',
    ' dns-server 192.168.20.1'
  ].join('\n');

  var outIfBrief = F.ibrief([
    ['GigabitEthernet0/0', '192.168.20.1', 'manual', 'up', 'up'],
    ['GigabitEthernet0/1', '203.0.113.6', 'manual', 'up', 'up']
  ]);

  var outMac = F.macTable([
    ['20', '001b.54aa.1001', 'Gi0/1'],
    ['20', '5c26.0a3f.d188', 'Fa0/3'],
    ['20', 'b083.fe12.8a4d', 'Fa0/4'],
    ['20', '509a.4c7e.21f6', 'Fa0/5'],
    ['20', '3ca9.f461.2ed8', 'Fa0/7'],
    ['20', '0026.738d.4b1e', 'Fa0/20']
  ]);

  var outSt20 = F.ifStatus([['Fa0/20', 'printer', 'connected', '20', 'a-full', 'a-100', '10/100BaseTX']]);

  PB.addCase({
    id: 'c3', no: 3, level: '中級',
    title: 'とまったプリンタ',
    sub: '午前中は使えたのに、午後から経理のプリンタが調子悪い',
    bg: 'room', prop: 'printer',
    cast: {
      client: { name: '白石さん', look: { hair: '#1c1c28', shirt: '#e8e6f2', pants: '#5c5470', hat: null } },
      morita: { name: '森田さん', look: { hair: '#8a6f3e', shirt: '#5b7fa6', pants: '#33415c', hat: null } }
    },
    intro: [
      { w: 'narr', t: 'それから数日後の午後。経理部から、先輩あてに電話が入った。' },
      { w: 'client', t: '経理の白石です。午前中は普通に印刷できていたのに、午後から急にプリンターが使えなくなって…。' },
      { w: 'client', t: '「プリンターが見つかりません」と出たり、印刷が止まったりします。でも、たまに印刷できるときもあって、わけがわからないんです。' },
      { w: 'senior', t: '「たまに通る」は大事なヒントだよ、{me}さん。完全に壊れていたら、いつも使えないはずだからね。' },
      { w: 'client', t: 'そういえば午後から、出張から戻った森田さんが、うちの空いている席でノートパソコンを使い始めましたけど…関係ないですよね?' },
      { w: 'senior', t: 'それも大事な情報かもしれないよ。メモしておこう。経理部の席へ行って、調べてみようか。' }
    ],
    points: 8,

    talks: [
      {
        id: 'tk_shira', who: 'client', label: '白石さんに、くわしく聞く',
        lines: [
          { w: 'me', t: 'プリンターの電源や、用紙は大丈夫ですか?' },
          { w: 'client', t: '電源は入っていて、紙もあります。プリンターの画面にも、エラーは出ていません。' },
          { w: 'client', t: 'ほかの人のパソコンから印刷しても、同じように「たまにだめ」なんです。午前中は誰も困っていませんでした。' }
        ],
        ev: {
          id: 'e_shira', title: '白石さんの話',
          text: '午前中は問題なし。午後から「見つからない」や印刷が止まる症状が、ときどき出る。誰のPCからでも同じ。プリンターの電源・紙・画面は問題なし。',
          say: '午後から、ときどき起きる不安定な症状です。壊れているのではなく、何かが午後に変わったと考えられます。',
          no: '症状を教えてくれる大事なメモだけど、原因そのものを示す証拠ではないんだ。'
        }
      },
      {
        id: 'tk_morita', who: 'morita', label: '森田さんに聞く',
        lines: [
          { w: 'me', t: '森田さん、ノートパソコンは、どんな設定でネットワークにつないでいますか?' },
          { w: 'morita', t: 'たしか前に、経理の席を借りたときに、空いている番号を手で入れたんです。それからずっと、そのままで…。' },
          { w: 'morita', t: '今日の午後、出張から戻ってLANケーブルをつないだら、右下に黄色い警告がちらっと出ましたけど、すぐ消えたので気にしていませんでした。' }
        ],
        ev: {
          id: 'e_morita', title: '森田さんの話',
          text: 'ノートPCは、以前に手でIPアドレスを入れたまま(固定IP)。午後に出張から戻り、LANにつないだ。つないだとき、警告がちらっと出た。',
          say: '午後からつないだノートPCが、固定IPを持っています。「午後から」に合う、大事な手がかりです。',
          no: '午後に何が起きたかを教えてくれる大事な話だけど、原因そのものを決める証拠としては、設定画面のメモのほうが強いよ。'
        }
      },
      {
        id: 'tk_senior', who: 'senior', label: '先輩に聞く: 経理部のネットワークの決まり',
        lines: [
          { w: 'me', t: '先輩、経理部のネットワークはどうなっているんですか?' },
          { w: 'senior', t: '経理部は 192.168.20.0/24。出口のルーター RT-3F が 192.168.20.1 で、パソコンのアドレスは DHCP で自動的に配っているよ。' },
          { w: 'senior', t: 'ただ、プリンターは毎回同じアドレスで使いたいから、手で入力した固定IPにしているんだ。' }
        ],
        ev: {
          id: 'e_rule', title: '先輩の話(経理部の決まり)',
          text: '経理部は 192.168.20.0/24。ルーターは 192.168.20.1。PCはDHCPで自動設定。プリンターは固定IP。',
          say: 'プリンターは固定IP、PCは自動、という決まりがわかります。',
          no: '経理部の決まりがわかる大事なメモ。でも、実際の設定がどうなっているかは、別のメモを見ないとわからないよ。'
        }
      }
    ],

    looks: [
      {
        id: 'lk_printer', label: 'プリンターの画面で、ネットワーク設定を見る', key: true,
        lines: [
          { w: 'narr', t: 'プリンターの小さな画面から「ネットワーク設定」を開く。' },
          { w: 'narr', t: '「IPアドレス設定: 手動」「IPアドレス: 192.168.20.50」「サブネットマスク: 255.255.255.0」「ゲートウェイ: 192.168.20.1」「MACアドレス: 00:26:73:8D:4B:1E」「状態: 接続中」と出ている。' },
          { w: 'senior', t: 'MACアドレスは、機器ごとにちがう「本体の番号」だよ。プリンターのMACアドレスを、覚えておこう。' }
        ],
        ev: {
          id: 'e_printer', title: 'プリンターの設定画面',
          lines: ['IPアドレス設定  手動', 'IPアドレス  192.168.20.50', 'サブネットマスク  255.255.255.0', 'ゲートウェイ  192.168.20.1', 'MACアドレス  00:26:73:8D:4B:1E'],
          say: 'プリンターは 192.168.20.50 を手入力で使っています。本当のMACアドレスは 00:26:73:8D:4B:1E です。',
          no: 'プリンター自身の設定がわかる大事なメモだけど、これ1枚だけでは原因は決まらないよ。ほかのメモと組み合わせてみよう。'
        }
      },
      {
        id: 'lk_power', label: 'プリンター本体の電源とランプを見る',
        lines: [
          { w: 'narr', t: '電源は入っていて、エラーのランプは消えている。LANコネクタのランプは点灯している。用紙もトナーも十分ある。' },
          { w: 'senior', t: 'プリンター本体は、元気そうだね。' }
        ],
        ev: {
          id: 'e_power', title: 'プリンター本体の様子',
          text: '電源ON、エラー表示なし、LANランプ点灯。用紙もトナーも十分。',
          say: '',
          no: 'プリンター本体は元気、という確認だね。壊れているわけではなさそうだよ。'
        }
      },
      {
        id: 'lk_ledger', label: '「固定IPの管理表」を見る',
        lines: [
          { w: 'narr', t: 'システム室の壁に、固定IPの管理表が貼ってある。' },
          { w: 'narr', t: '「192.168.20.1  ルーター RT-3F」「192.168.20.50  経理プリンター」。ほかの登録はない。' },
          { w: 'senior', t: 'この表によると、192.168.20.50 は経理のプリンター専用のアドレスだね。' }
        ],
        ev: {
          id: 'e_ledger', title: '固定IPの管理表',
          lines: ['192.168.20.1  ルーター RT-3F', '192.168.20.50  経理プリンター', 'ほかの登録  なし'],
          say: '192.168.20.50 はプリンターのために決めたアドレスです。ほかの機器が使ってはいけません。',
          no: '固定IPの持ち主がわかる大事なメモ。でも、誰かがそれを使っているかは、別のメモを見ないとわからないよ。'
        }
      }
    ],

    devs: [
      { id: 'pc', name: '白石さんのPC', prompt: 'C:\\Users\\shiraishi>' },
      { id: 'nb', name: '森田さんのノートPC', prompt: 'C:\\Users\\morita>' },
      { id: 'rt', name: 'ルーター RT-3F', prompt: 'RT-3F#' },
      { id: 'sw', name: 'スイッチ SW-3F', prompt: 'SW-3F#' }
    ],

    cmds: [
      {
        id: 'cm_ipconfig', dev: 'pc', cmd: 'ipconfig',
        desc: '白石さんのPCのIPアドレスなどを見る',
        out: outPcIp,
        read: '白石さんのPCは 192.168.20.31/24。Default Gateway は 192.168.20.1 で、ルーターの住所と合っているね。PC自身の設定は、正しそうだよ。',
        ev: {
          id: 'e_pc_ip', title: '白石PC: ipconfig',
          grep: ['IPv4 Address', 'Subnet Mask', 'Default Gateway'],
          say: '',
          no: '白石さんのPCの設定は正しい、という確認だね。PC側に問題はなさそうだよ。'
        }
      },
      {
        id: 'cm_ping_gw', dev: 'pc', cmd: 'ping 192.168.20.1',
        desc: '出口のルーターまで届くか確認',
        out: pingGw,
        read: 'ルーターからは毎回返事がきているね。PCからルーターまでの道は、安定しているよ。',
        ev: {
          id: 'e_ping_gw', title: '白石PC: ping 192.168.20.1(ルーター)',
          grep: ['Reply from', 'Packets:'],
          say: '',
          no: 'ルーターまでは安定して届く、という確認だね。プリンターの不調の理由までは教えてくれないよ。'
        }
      },
      {
        id: 'cm_ping_prn', dev: 'pc', cmd: 'ping 192.168.20.50', key: true,
        desc: 'プリンター(192.168.20.50)まで届くか確認',
        out: pingMix,
        read: '4回のうち、返事が2回、タイムアウトが2回。ときどきしか返事がないね。そして返事の TTL に注目! 1回目は 64、3回目は 128 と、バラバラだよ。TTL は機器の種類で違う初期値から始まるので、返事をしている相手が1台ではなく、2台いるかもしれないよ。',
        ev: {
          id: 'e_ping_prn', title: '白石PC: ping 192.168.20.50',
          grep: ['Reply from', 'Request timed out', 'Packets:'],
          say: '返事が来たり来なかったりで、TTLも 64 と 128 で違います。192.168.20.50 に答えている機器が2台いる疑いがあります。',
          no: 'プリンターへの通信が不安定なことがわかるメモ。でも「なぜ」までは、まだ決まらないよ。'
        }
      },
      {
        id: 'cm_arp', dev: 'pc', cmd: 'arp -a', key: true,
        desc: '「IPアドレスとMACアドレスの対応表」(ARPテーブル)を見る',
        out: outArp,
        read: 'ARPテーブルは、PCが覚えている「このIPアドレスの相手は、このMACアドレス」という名簿だよ。192.168.20.50 の行に注目。プリンターの本当のMACアドレス(画面で見たもの)と、同じかな?',
        ev: {
          id: 'e_arp', title: '白石PC: arp -a',
          grep: ['Internet Address', '192.168.20.1 ', '192.168.20.50'],
          say: '192.168.20.50 の相手として、3c-a9-f4-61-2e-d8 が載っています。プリンターの本当のMAC(00-26-73-8d-4b-1e)とは別の機器です。',
          no: 'IPアドレスとMACアドレスの対応が見えるメモ。MACアドレスの欄を、プリンターのものと比べてみよう。'
        }
      },
      {
        id: 'cm_nb_all', dev: 'nb', cmd: 'ipconfig /all', key: true,
        desc: '森田さんのノートPCの、くわしい設定を見る',
        out: outNbAll,
        read: '「DHCP Enabled」が No で、IPv4 Address は 192.168.20.50。手入力のアドレスだね。Physical Address(MACアドレス)も出ているよ。',
        ev: {
          id: 'e_nb_all', title: '森田ノートPC: ipconfig /all',
          grep: ['Physical Address', 'DHCP Enabled', 'IPv4 Address'],
          say: 'ノートPCも、手入力で 192.168.20.50 を使っています。MACアドレスは 3C-A9-F4-61-2E-D8 で、プリンターとは別です。',
          no: 'ノートPCの設定が見えるメモだけど、これ1枚だけでは決まらないよ。ほかのメモと合わせて考えよう。'
        }
      },
      {
        id: 'cm_rt_bind', dev: 'rt', cmd: 'show ip dhcp binding',
        desc: 'DHCPで配ったアドレスの一覧を見る',
        out: outBinding,
        read: 'DHCPが配ったアドレスの一覧だよ。.31、.32、.33 の3台。192.168.20.50 は載っていない、つまりDHCPで配ったアドレスではないんだ。',
        ev: {
          id: 'e_bind', title: 'RT-3F: show ip dhcp binding',
          grep: ['IP address', '192.168.20.31', '192.168.20.33'],
          say: '192.168.20.50 はDHCPが配ったものではありません。手入力で使われているアドレスです。',
          no: 'DHCPが配ったアドレスの一覧だね。.50 が載っていないことに気づけたかな?'
        }
      },
      {
        id: 'cm_rt_cfg', dev: 'rt', cmd: 'show running-config | section dhcp',
        desc: 'DHCPサーバーの設定部分だけを見る',
        out: outDhcpCfg,
        read: '「ip dhcp excluded-address 192.168.20.1 192.168.20.30」は、.1 から .30 は配らない、という除外の設定。「ip dhcp pool KEIRI」の中の network が配る範囲(192.168.20.0/24)。つまり、.50 は除外されていなくて、配る範囲の中に入っているよ。',
        ev: {
          id: 'e_dhcpcfg', title: 'RT-3F: show running-config | section dhcp',
          grep: ['excluded-address', 'network'],
          say: '',
          no: 'DHCPの設定が見えるメモだね。.50 が配る範囲に入っているのは、将来の注意点だけど、今回の決め手ではないよ。'
        }
      },
      {
        id: 'cm_rt_if', dev: 'rt', cmd: 'show ip interface brief',
        desc: 'ルーターの各ポートのIPアドレスと状態を見る',
        out: outIfBrief,
        read: '2本のポートとも up と up で、正常だよ。Gi0/0 が経理部側、192.168.20.1。ルーターは問題なさそう。',
        ev: {
          id: 'e_rt_if', title: 'RT-3F: show ip interface brief',
          grep: ['Interface ', 'GigabitEthernet0/0'],
          say: '',
          no: 'ルーターは正常に動いている、という確認だね。プリンターの不調の理由は、ここではわからないよ。'
        }
      },
      {
        id: 'cm_sw_mac', dev: 'sw', cmd: 'show mac address-table dynamic',
        desc: 'どのポートに、どのMACアドレスの機器がいるか',
        out: outMac,
        read: '経理部(VLAN 20)にいる機器の名簿だよ。プリンターのMAC(0026.738d.4b1e)は Fa0/20、森田さんのノートPC(3ca9.f461.2ed8)は Fa0/7。2台とも別々のポートにいる、別の機器だね。',
        ev: {
          id: 'e_sw_mac', title: 'SW-3F: show mac address-table dynamic',
          grep: ['Vlan    Mac Address', '0026.738d.4b1e', '3ca9.f461.2ed8'],
          say: 'プリンター(Fa0/20)とノートPC(Fa0/7)は、別々のポートにいる別々の機器です。',
          no: 'どの機器がどこにいるかがわかるメモ。MACアドレスは機器ごとにちがうんだ。'
        }
      },
      {
        id: 'cm_sw_st', dev: 'sw', cmd: 'show interfaces fa0/20 status',
        desc: 'プリンターがつながっている20番ポートの状態',
        out: outSt20,
        read: 'Status は connected、Vlan は 20。経理部と同じVLANで、ケーブルもつながっているよ。ポートに問題はないね。',
        ev: {
          id: 'e_sw_st', title: 'SW-3F: show interfaces fa0/20 status',
          grep: ['Port ', 'Fa0/20'],
          say: '',
          no: 'プリンターのポートは正常、という確認だね。ポートやVLANは問題なさそうだよ。'
        }
      }
    ],

    hints: [
      'ときどき返事がある、という症状は大事なヒント。完全に壊れているわけでも、VLANが違うわけでもなさそうだね。',
      'まず白石さんのPCから ping 192.168.20.50 を実行してみよう。返事の TTL の数字に注目してね。',
      'arp -a で 192.168.20.50 の相手のMACアドレスを見て、プリンターの画面にあったMACアドレスと比べてみよう。',
      'あと一歩。192.168.20.50 を使っている機器は、本当に1台だけかな?森田さんのノートPCの設定も見てみよう。'
    ],

    reason: {
      ask: '推理の時間だよ。プリンターが不安定になる原因は、どれだと思う?',
      causes: [
        { id: 'printer', t: 'プリンター本体が壊れかけている', why: 'プリンターは ping に(ときどき)返事をしているし、画面も「接続中」だったよ。壊れているなら、いつも返事がないはず。それに、午後から急に変わったのも不自然だね。' },
        { id: 'gw', t: '経理PCのデフォルトゲートウェイが間違っている', why: '同じネットワークの中にあるプリンターへは、ゲートウェイ(出口)を通らず直接届くよ。それに経理PCのゲートウェイは正しくて、ルーターにも届いているね。' },
        { id: 'vlan', t: 'プリンターのポートが別のVLANに入っている', why: 'プリンターのポートは VLAN 20 で、経理PCと同じ部屋だったよ。もしVLANが違えば、「ときどき通る」ことはなく、いつも通らないはず。' },
        { id: 'dup', t: 'プリンターとノートPCが、同じIPアドレス(192.168.20.50)を使っている', why: '' },
        { id: 'dhcp', t: 'DHCPサーバーが故障している', why: 'プリンターは固定IPで、DHCPを使っていないよ。経理PCはDHCPで普通にアドレスをもらえているから、DHCPサーバーは動いているね。' }
      ],
      answer: 'dup',
      proofs: ['e_nb_all', 'e_printer', 'e_arp'],
      supports: ['e_ping_prn', 'e_ledger', 'e_morita', 'e_sw_mac', 'e_bind', 'e_rule', 'e_shira'],
      need: 1.5,
      askProof: 'いい推理だね。では、その根拠を見せて! 証拠メモから、決め手を2個選んでね(決め手1個と、それを支えるメモ1個でもいいよ)。',
      solved: [
        { w: 'senior', t: 'そのとおり! 192.168.20.50 を、プリンターとノートPCの2台が使っていたんだ。IPアドレスの重複だね。' },
        { w: 'senior', t: '同じ番号を名乗る機器が2台いると、PCは「どっちに送るのか」わからなくなる。その時々で、どちらかが返事をしていたんだよ。だから「たまに通る」状態になったんだ。' },
        { w: 'client', t: 'なるほど。午後に森田さんが戻ってきたから、午後から調子が悪くなったんですね。' }
      ]
    },

    fix: {
      ask: '原因がわかったね。どう直すのが正しいかな?',
      options: [
        { t: 'プリンターを再起動して、様子を見る', ok: false, why: '再起動しても、同じ番号を2台が使っている状態は変わらないよ。一時的に直ったように見えても、またすぐ起きてしまうんだ。' },
        { t: 'ノートPCの固定IPをやめて自動取得(DHCP)に戻し、あわせて 192.168.20.50 をDHCPの配布から除外する(ip dhcp excluded-address 192.168.20.50)', ok: true, why: '' },
        { t: '経理PCのARPテーブルを消す(arp -d)だけにする', ok: false, why: 'ARPテーブルを消しても、2台が同じIPを名乗る限り、またすぐ混ざってしまうよ。原因である重複そのものをなくす必要があるんだ。' },
        { t: '経理PCのサブネットマスクを変える', ok: false, why: 'マスクは正しい設定だったよ。変えるとほかの機器との通信がおかしくなるかもしれない。重複の原因とは関係ないんだ。' }
      ],
      verify: [
        { prompt: 'C:\\Users\\morita>', cmd: 'ipconfig /all', out: outNbAllFixed },
        { prompt: 'RT-3F#', cmd: 'configure terminal', out: 'Enter configuration commands, one per line.  End with CNTL/Z.' },
        { prompt: 'RT-3F(config)#', cmd: 'ip dhcp excluded-address 192.168.20.50', out: '' },
        { prompt: 'RT-3F(config)#', cmd: 'end', out: 'RT-3F#\n*Oct 27 14:07:44.301: %SYS-5-CONFIG_I: Configured from console by console' },
        { prompt: 'C:\\Users\\shiraishi>', cmd: 'ping 192.168.20.50', out: pingFixed }
      ],
      verifyNote: 'ノートPCは自動で 192.168.20.34 をもらい、プリンターへの ping は毎回返事がきた。直ったね。',
      after: [
        { w: 'client', t: '印刷できました! 何度やっても大丈夫です。ありがとうございます!' },
        { w: 'morita', t: 'すみません、昔の設定をそのままにしていました。これからは自動のままにしますね。' },
        { w: 'senior', t: '固定IPを使うときは、管理表に書いて、DHCPの配る範囲から外しておく。これでミスがぐっと減るよ。' },
        { w: 'me', t: 'はい! 「たまに通る」は、同じ番号が重なっているサインでもあるんですね。' }
      ]
    },

    lesson: {
      cause: 'IPアドレスの重複(同じアドレスを2台が使っている)',
      text: [
        'IPアドレスは、同じネットワークの中で1台ずつ、重ならないように使います。住所が同じ家が2軒あると、郵便が迷子になるのと同じです。',
        '同じIPアドレスを2台が名乗ると、PCの「IPアドレスとMACアドレスの対応表(ARPテーブル)」が、その時々でどちらかに書き換わります。そのため、通信が通ったり通らなかったりします。',
        'MACアドレスは機器ごとに違う番号なので、arp -a で「本来の機器のMACアドレス」と食い違っていないか見ると、重複を見つけられます。'
      ],
      points: [
        '「ときどき通る」「午後から急に」は、IP重複を疑うサイン。',
        'arp -a で、同じIPに対応するMACアドレスが、本来の機器と違っていないか確認する。',
        '固定IPは管理表で記録し、DHCPの配布範囲から除外(ip dhcp excluded-address)しておく。',
        'Windows は、重複を見つけると「IPアドレスの競合」の警告を出すことがある。'
      ],
      exam: '試験では、ipconfig や arp の出力から、同じIPアドレスを複数の機器が使っていることを読み取る問題が考えられます。同じIPに別々のMACアドレスが出ていないかに注目しよう。',
      mons: ['a2-ipv4', 'a1-mac-table', 'a2-client']
    }
  });
})();

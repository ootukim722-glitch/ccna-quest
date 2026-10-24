/* case1.js - ケース1(入門): 営業部だけインターネットに出られない
   原因: 営業部PCのデフォルトゲートウェイの設定ミス(教材 a2-client) */
(function () {
  'use strict';
  var PB = window.PB, F = PB.fmt;

  var V6 = 'fe80::8c3a:51f2:7b1d:9e44%12';
  var SALES = 'SALES-PC07', SIP = '192.168.10.57';

  var outIpconfig = F.ipconfig({ ip: SIP, mask: '255.255.255.0', gw: '192.168.10.254', v6: V6 });
  var outIpconfigAll = F.ipconfigAll({
    host: SALES, desc: 'Intel(R) Ethernet Connection I219-LM', mac: '3C-52-82-4A-1B-C6', dhcp: false,
    ip: SIP, mask: '255.255.255.0', gw: '192.168.10.254', dns: '192.168.10.1', v6: V6,
    iaid: '50418306', duid: '00-01-00-01-2B-4C-9A-11-3C-52-82-4A-1B-C6'
  });
  var outIpconfigKeiri = F.ipconfig({ ip: '192.168.10.131', mask: '255.255.255.0', gw: '192.168.10.1', v6: 'fe80::5d2e:70a1:c4b9:3f02%9' });

  var pingLo = F.ping('127.0.0.1', SIP, [{ t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }]);
  var pingSrv = F.ping('192.168.10.20', SIP, [{ t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }]);
  var pingRt = F.ping('192.168.10.1', SIP, [{ t: 1, ttl: 255 }, { t: '<1', ttl: 255 }, { t: '<1', ttl: 255 }, { t: '<1', ttl: 255 }]);
  var ping254 = F.ping('192.168.10.254', SIP, ['un', 'un', 'un', 'un']);
  var pingNet = F.ping('8.8.8.8', SIP, ['un', 'un', 'un', 'un']);
  var pingNetKeiri = F.ping('8.8.8.8', '192.168.10.131', [{ t: 11, ttl: 117 }, { t: 12, ttl: 117 }, { t: 12, ttl: 117 }, { t: 13, ttl: 117 }]);
  var pingNetFixed = F.ping('8.8.8.8', SIP, [{ t: 12, ttl: 117 }, { t: 11, ttl: 117 }, { t: 12, ttl: 117 }, { t: 13, ttl: 117 }]);
  var outIpconfigFixed = F.ipconfig({ ip: SIP, mask: '255.255.255.0', gw: '192.168.10.1', v6: V6 });

  var outIfBrief = F.ibrief([
    ['GigabitEthernet0/0', '192.168.10.1', 'manual', 'up', 'up'],
    ['GigabitEthernet0/1', '203.0.113.2', 'manual', 'up', 'up'],
    ['Serial0/0/0', 'unassigned', 'unset', 'administratively down', 'down']
  ]);

  var outRoute = [
    'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area ',
    '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2',
    '       E1 - OSPF external type 1, E2 - OSPF external type 2',
    '       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2',
    '       ia - IS-IS inter area, * - candidate default, U - per-user static route',
    '       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP',
    '       + - replicated route, % - next hop override',
    '',
    'Gateway of last resort is 203.0.113.1 to network 0.0.0.0',
    '',
    'S*    0.0.0.0/0 [1/0] via 203.0.113.1',
    '      192.168.10.0/24 is variably subnetted, 2 subnets, 2 masks',
    'C        192.168.10.0/24 is directly connected, GigabitEthernet0/0',
    'L        192.168.10.1/32 is directly connected, GigabitEthernet0/0',
    '      203.0.113.0/24 is variably subnetted, 2 subnets, 2 masks',
    'C        203.0.113.0/30 is directly connected, GigabitEthernet0/1',
    'L        203.0.113.2/32 is directly connected, GigabitEthernet0/1'
  ].join('\n');

  PB.addCase({
    id: 'c1', no: 1, level: '入門',
    title: 'つながらない営業部',
    sub: 'ファイルは見えるのに、インターネットだけ見られない',
    bg: 'office', prop: 'monitor',
    cast: {
      client: { name: '小暮さん', look: { hair: '#5a3a1e', shirt: '#c8553d', pants: '#37415c', hat: null } },
      keiri: { name: '白石さん', look: { hair: '#1c1c28', shirt: '#e8e6f2', pants: '#5c5470', hat: null } }
    },
    intro: [
      { w: 'narr', t: '月曜日の朝。小さな文具の会社「つばめ文具」の情報システム係に、あなたは今日から配属された。' },
      { w: 'senior', t: 'おはよう、{me}さん。わたしは凪野。ここでは、社内のパソコンやネットワークの困りごとを解決するのが仕事だよ。' },
      { w: 'senior', t: 'わからないことは、何でも聞いてね。間違えても大丈夫。いっしょに調べていこう。' },
      { w: 'me', t: 'はい、よろしくお願いします!' },
      { w: 'narr', t: 'そこへ、営業部の人が困った顔でやってきた。' },
      { w: 'client', t: 'すみません、営業部の小暮です。朝からパソコンでインターネットが見られなくて…。' },
      { w: 'client', t: '社内のファイルサーバーの共有フォルダは、いつも通り開けるんです。でも、ウェブサイトも、社外とのメールも全部だめで。' },
      { w: 'senior', t: '社内は見えるのに、外だけだめなんだね。{me}さん、まず「誰に起きているか」を整理しよう。' },
      { w: 'client', t: '営業部のみんなが同じです。経理の人は普通に見られているみたいなので、うちの部だけなんです。' },
      { w: 'senior', t: 'いいね、それは大事な手がかりだよ。調べ方は「人に聞く」「現場を見る」「コマンドを実行する」の3つ。' },
      { w: 'senior', t: 'わかったことは「証拠メモ」に自動で貼られるよ。調査ポイントには限りがあるけど、困ったらわたしに相談してね。' }
    ],
    points: 8,

    talks: [
      {
        id: 'tk_client', who: 'client', label: '小暮さんに、くわしく聞く',
        lines: [
          { w: 'me', t: 'いつから、どんなふうに見られないんですか?' },
          { w: 'client', t: '朝、8時半に出社してからです。ウェブサイトを開こうとすると「このページにアクセスできません」と出ます。' },
          { w: 'client', t: '共有フォルダは、いつも通り開けるんです。ネットだけがだめで。' },
          { w: 'client', t: '営業部のみんなも同じです。ケーブルは抜けていないし、パソコンの再起動も試しました。' }
        ],
        ev: {
          id: 'e_client', title: '小暮さんの話',
          text: '社内のファイルサーバーは見える。ウェブとメール(外のもの)は全部だめ。営業部のみんなが同じ。再起動しても直らない。',
          say: '「社内は見えるのに、外だけだめ」。これは、原因をしぼる大事な手がかりです。ただ、これだけでは原因までは決まりません。',
          no: '症状を教えてくれる大事なメモだけど、原因そのものを示す証拠ではないんだ。'
        }
      },
      {
        id: 'tk_keiri', who: 'keiri', label: '経理の白石さんに聞く',
        lines: [
          { w: 'me', t: '経理部のインターネットは、いかがですか?' },
          { w: 'keiri', t: 'うちは普通に見られていますよ。さっきも銀行のサイトを開きました。' },
          { w: 'keiri', t: 'うちのパソコンは、つなぐだけで自動的に設定される(DHCP)ようになっていたはずです。' }
        ],
        ev: {
          id: 'e_keiri', title: '白石さんの話',
          text: '経理部のPCはインターネットを普通に見られる。IPアドレスは自動で設定される(DHCP)。',
          say: '会社の出口(ルーター)や回線は、動いているらしいとわかります。',
          no: '経理部は元気、という大事な情報だけど、営業部のどこがおかしいかまでは教えてくれないね。'
        }
      },
      {
        id: 'tk_senior', who: 'senior', label: '先輩に聞く: 営業部のPCの設定',
        lines: [
          { w: 'me', t: '先輩、営業部のパソコンは、どうやってIPアドレスを設定したんですか?' },
          { w: 'senior', t: '先週の入れ替えのとき、前任の人が作った「設定表」を見ながら、1台ずつ手で入力したんだ(固定IP)。' },
          { w: 'senior', t: '営業部だけ、自動(DHCP)じゃないんだよ。その設定表は、あとで見られるはず。' }
        ],
        ev: {
          id: 'e_static', title: '先輩の話',
          text: '営業部のPCだけ、IPアドレスなどを手で入力している(固定IP)。ほかの部署は自動(DHCP)。',
          say: '営業部だけが手入力だとわかります。手入力した設定のどこかに、ミスがあるかもしれません。',
          no: '営業部だけ設定のしかたが違う、という情報だけど、どこが間違っているかまでは書かれていないね。'
        }
      }
    ],

    looks: [
      {
        id: 'lk_diagram', label: '壁の「ネットワーク構成図」を見る', key: true,
        lines: [
          { w: 'narr', t: '壁に、ネットワーク構成図が貼ってある。' },
          { w: 'narr', t: '「ルーター RT-1F  社内側 192.168.10.1 /24」「ファイルサーバー 192.168.10.20」「営業部PC 192.168.10.50 から 59」と書かれている。' },
          { w: 'senior', t: 'ルーターは、社内のネットワークから外(インターネット)へ出るための出口だよ。' }
        ],
        ev: {
          id: 'e_diagram', title: '構成図(壁)',
          lines: ['出口のルーター RT-1F(社内側)  192.168.10.1 /24', 'ファイルサーバー  192.168.10.20', '営業部PC  192.168.10.50 から 59'],
          say: '本当の出口(ルーター)の住所が 192.168.10.1 だとわかります。PCの設定と見比べる材料になります。',
          no: '正しい出口の住所がわかる大事なメモだけど、これだけでは「PCの設定が違う」とは言えないね。PCの設定と見比べる必要があるよ。'
        }
      },
      {
        id: 'lk_sheet', label: '営業部PCの「設定表」を見る',
        lines: [
          { w: 'narr', t: '引き継ぎ用のノートに、前任の人が書いた設定表がはさまっている。' },
          { w: 'narr', t: '「営業部PC 設定(全台共通)  サブネットマスク 255.255.255.0 / デフォルトゲートウェイ 192.168.10.254 / DNS 192.168.10.1 / IPアドレスは 192.168.10.50 から 59 を1台ずつ」' },
          { w: 'senior', t: 'この表のとおりに、先週みんなのPCへ入力したんだね。ゲートウェイの数字は、ほかの資料とも見比べてみたいな。' }
        ],
        ev: {
          id: 'e_sheet', title: '設定表(前任者のメモ)',
          lines: ['サブネットマスク  255.255.255.0', 'デフォルトゲートウェイ  192.168.10.254', 'DNS  192.168.10.1'],
          say: '営業部PCには、ゲートウェイ 192.168.10.254 を入れる表になっていました。本当の出口の住所と食い違っています。',
          no: '設定表の内容そのものは大事だけど、今回の原因を決める証拠としては別のメモのほうが強いよ。'
        }
      },
      {
        id: 'lk_lamp', label: 'LANケーブルとランプを見る',
        lines: [
          { w: 'narr', t: 'ケーブルはしっかり差さっている。パソコンのLANランプは緑に光り、ときどき点滅している。' },
          { w: 'senior', t: 'ランプが光っているのは、ケーブルを通して相手の機器とつながっている、という印だよ。' }
        ],
        ev: {
          id: 'e_lamp', title: 'LANランプ',
          text: 'LANランプは点灯(ケーブルでつながっている)。',
          say: 'ケーブルはつながっているとわかります。',
          no: 'ケーブルが生きているという情報だね。これは「ケーブルが原因ではない」とわかる材料だけど、本当の原因は教えてくれないんだ。'
        }
      }
    ],

    devs: [
      { id: 'pc', name: '小暮さんのPC(営業部)', prompt: 'C:\\Users\\kogure>' },
      { id: 'kpc', name: '白石さんのPC(経理部)', prompt: 'C:\\Users\\shiraishi>' },
      { id: 'rt', name: 'ルーター RT-1F', prompt: 'RT-1F#' }
    ],

    cmds: [
      {
        id: 'cm_ipconfig', dev: 'pc', cmd: 'ipconfig', key: true,
        desc: 'このPCのIPアドレスなどを見る',
        out: outIpconfig,
        read: 'IPv4 Address が、このPCの住所。Subnet Mask は住所の区切り方。Default Gateway は「同じネットワークの外へ出るときの出口」の住所だよ。ここの数字を、構成図の「出口のルーター」の住所と見比べてみよう。',
        ev: {
          id: 'e_ipconfig', title: '営業PC: ipconfig',
          grep: ['IPv4 Address', 'Subnet Mask', 'Default Gateway'],
          say: 'このPCの Default Gateway は 192.168.10.254 です。ところが本当の出口(ルーター)は 192.168.10.1 でした。',
          no: 'PCの設定が見えるメモだけど、今回の原因の決め手にはなりにくいみたい。'
        }
      },
      {
        id: 'cm_all', dev: 'pc', cmd: 'ipconfig /all',
        desc: 'もっとくわしい設定を見る(自動か手入力か、MACアドレスなど)',
        out: outIpconfigAll,
        read: '「DHCP Enabled」が No なら、住所を自動でもらっていない(手入力)という意味。DNS Servers は、サイトの名前を住所に変えてくれるサーバーだよ。Default Gateway の欄も、ipconfig と同じ数字になっているね。',
        ev: {
          id: 'e_all', title: '営業PC: ipconfig /all',
          grep: ['DHCP Enabled', 'Default Gateway', 'DNS Servers'],
          say: '手入力の設定(DHCP Enabled: No)で、Default Gateway は 192.168.10.254 です。',
          no: 'このPCが手入力の設定だとわかるメモ。大事だけど、決め手は別のメモにあるよ。'
        }
      },
      {
        id: 'cm_lo', dev: 'pc', cmd: 'ping 127.0.0.1',
        desc: '自分自身の中のネットワーク機能が動いているか確認',
        out: pingLo,
        read: '127.0.0.1 は「自分自身」を表す特別な住所(ループバック)。返事があれば、このPCの中のTCP/IPは動いているよ。外に出る話ではないから、今回の原因探しにはあまり役に立たないね。',
        ev: {
          id: 'e_lo', title: '営業PC: ping 127.0.0.1',
          grep: ['Reply from', 'Packets:'],
          say: '',
          no: 'このPCの中のネットワーク機能は動いている、という確認だね。外に出られない原因は教えてくれないよ。'
        }
      },
      {
        id: 'cm_ping_srv', dev: 'pc', cmd: 'ping 192.168.10.20',
        desc: 'ファイルサーバーまで届くか確認',
        out: pingSrv,
        read: '返事(Reply)が4回きているね。ファイルサーバーは同じネットワークの中にいるから、出口を通らずに直接届くんだ。社内が見えるのは、このためだよ。',
        ev: {
          id: 'e_ping_srv', title: '営業PC: ping 192.168.10.20(ファイルサーバー)',
          grep: ['Reply from', 'Packets:'],
          say: '同じネットワーク内には届くとわかります。',
          no: '同じネットワークの中は大丈夫、という確認だね。外に出られない理由までは教えてくれないんだ。'
        }
      },
      {
        id: 'cm_ping_rt', dev: 'pc', cmd: 'ping 192.168.10.1', key: true,
        desc: '構成図にあった、出口のルーターまで届くか確認',
        out: pingRt,
        read: 'ルーター(192.168.10.1)から返事がきたよ。TTL=255 は Cisco のルーターによくある値。つまり、本当の出口はちゃんと生きていて、このPCから届くんだ。',
        ev: {
          id: 'e_ping_rt', title: '営業PC: ping 192.168.10.1(ルーター)',
          grep: ['Reply from', 'Packets:'],
          say: '本当の出口(192.168.10.1)には、このPCから届きます。つまり、PCが別の住所を出口だと思っているのが怪しいです。',
          no: 'ルーターには届く、という大事な情報。ただ、これだけで原因は決まらないよ。'
        }
      },
      {
        id: 'cm_ping_254', dev: 'pc', cmd: 'ping 192.168.10.254',
        desc: 'このPCに設定されているゲートウェイ(Default Gateway)まで届くか確認',
        out: ping254,
        read: '「Reply from 192.168.10.57: Destination host unreachable.」は、相手からの返事ではなく、自分のPC(…57)が「そこへたどり着けない」と言っているんだ。そこに機器がいない、という意味だよ。なお、Windows の統計の Received が 4 になっていても、本当の返事ではないよ。',
        ev: {
          id: 'e_ping_254', title: '営業PC: ping 192.168.10.254(設定されているゲートウェイ)',
          grep: ['Reply from', 'Packets:'],
          say: 'PCに設定されているゲートウェイ 192.168.10.254 には、たどり着けません。そこに出口はいないのです。',
          no: 'このメモの意味を取り違えているかも。もう一度よく読んでみよう。'
        }
      },
      {
        id: 'cm_ping_net', dev: 'pc', cmd: 'ping 8.8.8.8',
        desc: 'インターネット上の公開DNSサーバー(8.8.8.8)まで届くか確認',
        out: pingNet,
        read: '外の相手には届いていないね。ここで名前(www...)ではなく数字の住所(8.8.8.8)で試しているのがポイント。数字でもだめなら、サイトの名前を変換するDNSの問題ではない、と考えられるよ。',
        ev: {
          id: 'e_ping_net', title: '営業PC: ping 8.8.8.8',
          grep: ['Reply from', 'Packets:'],
          say: '数字の住所で試しても外に届かないので、DNSではなく、外へ出る道(出口)の問題だとわかります。',
          no: '外に届かないことは確認できたけど、「なぜ」までは教えてくれないんだ。'
        }
      },
      {
        id: 'cm_flush', dev: 'pc', cmd: 'ipconfig /flushdns',
        desc: 'DNSの記憶(キャッシュ)を消す',
        out: '\nWindows IP Configuration\n\nSuccessfully flushed the DNS Resolver Cache.\n',
        read: 'DNSキャッシュ(サイト名と住所の記憶)を消しただけ。今回は外に数字の住所でも届かないから、これでは直らないよ。'
      },
      {
        id: 'cm_keiri_ip', dev: 'kpc', cmd: 'ipconfig',
        desc: '経理部のPC(普通に使えている)の設定を見る',
        out: outIpconfigKeiri,
        read: '経理部のPCは、Default Gateway が 192.168.10.1 だね。営業PCの設定と並べて比べてみよう。',
        ev: {
          id: 'e_keiri_ip', title: '経理PC: ipconfig',
          grep: ['IPv4 Address', 'Subnet Mask', 'Default Gateway'],
          say: '普通に使えている経理PCは、Default Gateway が 192.168.10.1 です。営業PC(…254)と違います。サブネットマスクは同じです。',
          no: '経理PCの設定が見えるメモ。比べる材料にはなるけど、決め手というほどではないよ。'
        }
      },
      {
        id: 'cm_keiri_ping', dev: 'kpc', cmd: 'ping 8.8.8.8',
        desc: '経理部のPCから、同じ外の相手に届くか確認',
        out: pingNetKeiri,
        read: '経理PCからは、外(8.8.8.8)に返事がきているね。回線やルーター、外の世界は、ちゃんと動いているということだよ。',
        ev: {
          id: 'e_keiri_ping', title: '経理PC: ping 8.8.8.8',
          grep: ['Reply from', 'Packets:'],
          say: '会社の外への道は動いています。おかしいのは営業PC側の可能性が高いです。',
          no: '会社の外への道は動いている、という確認だね。営業PCのどこが悪いかまでは教えてくれないよ。'
        }
      },
      {
        id: 'cm_rt_if', dev: 'rt', cmd: 'show ip interface brief',
        desc: 'ルーターの各ポートのIPアドレスと状態を一覧で見る',
        out: outIfBrief,
        read: '上から2本のポート(Gi0/0 が社内側、Gi0/1 が回線側)は、Status も Protocol も up。つまり、ルーターの出入口は正常に動いているよ。Gi0/0 の 192.168.10.1 が、社内の出口の住所だね。',
        ev: {
          id: 'e_rt_if', title: 'ルーター: show ip interface brief',
          grep: ['Interface ', 'GigabitEthernet0/0', 'GigabitEthernet0/1'],
          say: '',
          no: 'ルーターは正常に動いている、という確認だね。営業PCのどこが悪いかまでは教えてくれないよ。'
        }
      },
      {
        id: 'cm_rt_route', dev: 'rt', cmd: 'show ip route',
        desc: 'ルーターが持つ「道案内の表」(ルーティングテーブル)を見る',
        out: outRoute,
        read: '「S*  0.0.0.0/0 ... via 203.0.113.1」は、行き先がわからない通信は全部、回線の先(203.0.113.1)へ送る、というデフォルトルート。ルーターは外へ出る道をちゃんと持っているよ。',
        ev: {
          id: 'e_rt_route', title: 'ルーター: show ip route',
          grep: ['Gateway of last resort', 'S*', '192.168.10.0/24 is directly'],
          say: '',
          no: 'ルーターには外へ出る道がある、という確認だね。ルーター側は問題なさそうだよ。'
        }
      }
    ],

    hints: [
      '社内のファイルサーバーには届くのに、外には出られない。PCは外の相手へ送るとき、まず「デフォルトゲートウェイ」という出口に荷物を渡すんだ。',
      'まず営業部のPCで ipconfig を実行して、Default Gateway の欄を見てみよう。そこに書かれた住所が、PCが「出口」だと思っている相手だよ。',
      '構成図で本当の出口(ルーター)の住所を探して、PCの設定と見比べてみて。ping で、その住所に届くかも確かめられるよ。',
      'あと一歩だよ。PCが思っている出口と、本当の出口の住所は同じかな?'
    ],

    reason: {
      ask: 'さあ、推理の時間だよ。ここまでの証拠から、原因はどれだと思う?',
      causes: [
        { id: 'cable', t: 'LANケーブルが切れている', why: 'LANランプは点灯していて、ファイルサーバーやルーターにも ping が届いているよね。ケーブルは生きているよ。' },
        { id: 'gw', t: 'PCの「デフォルトゲートウェイ」の設定がまちがっている', why: '' },
        { id: 'router', t: '出口のルーターが壊れている', why: 'ルーターは show ip interface brief で up と up。それに経理PCはインターネットに出られているよ。ルーターは元気みたい。' },
        { id: 'dns', t: 'DNSサーバーの設定がおかしい', why: 'DNSの問題なら、8.8.8.8 のように数字の住所で試せば届くはず。でも今回は数字の住所でも届いていないんだ。' },
        { id: 'mask', t: 'サブネットマスクがまちがっている', why: 'マスクは 255.255.255.0 で、経理PCと同じ。それにファイルサーバーには届いているから、マスクではなさそうだよ。' }
      ],
      answer: 'gw',
      proofs: ['e_ipconfig', 'e_all', 'e_ping_254', 'e_sheet'],
      supports: ['e_diagram', 'e_ping_rt', 'e_keiri_ip', 'e_ping_net', 'e_ping_srv', 'e_keiri_ping', 'e_static'],
      need: 1,
      askProof: 'そのとおり、いい線だね。では、その根拠を見せて! 証拠メモから、決め手になるものを1〜2個選んでね。',
      solved: [
        { w: 'senior', t: 'そのとおり! 営業部のPCは「外へ出るなら 192.168.10.254 に渡す」と思っている。でもそこには誰もいないんだ。' },
        { w: 'senior', t: '本当の出口(ルーター)は 192.168.10.1。住所が1つ違うだけで、外に出られなくなるんだね。' },
        { w: 'client', t: 'なるほど…。社内のサーバーが見えたのは、出口を通らなくても届く相手だったからなんですね。' }
      ]
    },

    fix: {
      ask: '原因がわかったね。どう直すのが正しいかな?',
      options: [
        { t: 'ルーターの住所を 192.168.10.254 に変えて、PCの設定に合わせる', ok: false, why: 'ルーターを変えると、経理部など「192.168.10.1」を出口にしている他の部署が、一斉に外へ出られなくなってしまうよ。間違っているのは営業部のPC側だから、PC側を直そう。' },
        { t: '営業部のPCのIPv4設定で、デフォルトゲートウェイを 192.168.10.1 に書き直す', ok: true, why: '' },
        { t: '営業部のPCのDNSサーバーを 8.8.8.8 に変える', ok: false, why: 'DNSを変えても、外へ出る「出口」が間違っているままだと、やっぱり外に届かないよ。数字の住所(ping 8.8.8.8)も届かなかったよね。' },
        { t: 'LANケーブルを新しいものに交換する', ok: false, why: 'ケーブルは正常につながっていて、ルーターにも届いているから、交換しても変わらないよ。' }
      ],
      verify: [
        { prompt: 'C:\\Users\\kogure>', cmd: 'ipconfig', out: outIpconfigFixed },
        { prompt: 'C:\\Users\\kogure>', cmd: 'ping 8.8.8.8', out: pingNetFixed }
      ],
      verifyNote: 'Default Gateway が 192.168.10.1 になり、外の 8.8.8.8 から返事がきた。直ったね。',
      after: [
        { w: 'client', t: 'あ、見られるようになりました! ありがとうございます!' },
        { w: 'senior', t: '営業部のほかのPCも、同じ設定表で入れたから、同じミスがあるはず。全台直しておこう。それから、設定表のゲートウェイの数字も訂正しておこうね。' },
        { w: 'me', t: 'はい! 住所が1つ違うだけでも、つながらなくなるんですね。' },
        { w: 'senior', t: 'そうなんだ。お疲れさま、{me}さん。最初の事件、解決だよ。' }
      ]
    },

    lesson: {
      cause: 'デフォルトゲートウェイ(Default Gateway)の設定ミス',
      text: [
        'デフォルトゲートウェイは、同じネットワークの外へ出るときの「出口」になるルーターの住所です。',
        '同じネットワークの中(ファイルサーバーなど)には、出口を通らず直接届きます。だから、ゲートウェイが間違っていても、社内は見えたのです。',
        '外(インターネット)宛ての通信は、まずゲートウェイに渡されます。その住所に機器がいないと、届かずに Destination host unreachable になります。'
      ],
      points: [
        'ゲートウェイは、PCと同じサブネットの中にある、ルーターのアドレスにする。',
        '「社内は通じるのに、外へ出られない」ときは、まず Default Gateway を疑う。',
        'ping は「近い所から順に」試すと、どこまで届くかわかる(自分、ゲートウェイ、外)。',
        'Windows の確認は ipconfig /all。Cisco のルーターは show ip interface brief。'
      ],
      exam: '試験では、ipconfig の表示や show コマンドの出力が示されて「社内は通じるが、外へ出られない。原因は?」のように聞かれることがあります。出力のうち、まず Default Gateway の欄を見る、と覚えておこう。',
      mons: ['a2-client', 'a2-mask']
    }
  });
})();

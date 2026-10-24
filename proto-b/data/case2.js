/* case2.js - ケース2: 席を移したAさんのPCだけ通信できない
   原因: スイッチのポート(Fa0/12)が企画部のVLAN 30ではなく、初期値のVLAN 1に入っている(教材 a3-vlan / a3-access-port) */
(function () {
  'use strict';
  var PB = window.PB, F = PB.fmt;

  var V6 = 'fe80::6b1d:42c9:a8e7:15d3%14';

  var outApipa = F.ipconfig({ ip: '169.254.87.201', mask: '255.255.0.0', gw: '', v6: V6, apipa: true });
  var outApipaAll = F.ipconfigAll({
    host: 'AOKI-PC', desc: 'Intel(R) Ethernet Connection I219-V', mac: '8C-16-45-2D-7A-90', dhcp: true,
    ip: '169.254.87.201', mask: '255.255.0.0', gw: '', apipa: true, v6: V6,
    iaid: '60036677', duid: '00-01-00-01-2B-3E-71-0C-8C-16-45-2D-7A-90'
  });
  var pingLo = F.ping('127.0.0.1', '169.254.87.201', [{ t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }, { t: '<1', ttl: 128 }]);
  var outRenewFail = '\nWindows IP Configuration\n\nAn error occurred while renewing interface Ethernet : unable to contact your DHCP server. Request has timed out.\n';
  var outYama = F.ipconfig({ ip: '192.168.30.25', mask: '255.255.255.0', gw: '192.168.30.1', v6: 'fe80::91a4:3e0f:62bd:77c1%11' });

  var outVlan = F.vlanBrief([
    { id: '1', name: 'default', ports: ['Fa0/12', 'Fa0/13', 'Fa0/14', 'Fa0/15', 'Fa0/16', 'Fa0/17', 'Fa0/18', 'Fa0/19', 'Fa0/20', 'Fa0/21', 'Fa0/22', 'Fa0/23', 'Fa0/24', 'Gi0/2'] },
    { id: '20', name: 'KEIRI', ports: ['Fa0/1', 'Fa0/2', 'Fa0/3', 'Fa0/4'] },
    { id: '30', name: 'KIKAKU', ports: ['Fa0/5', 'Fa0/6', 'Fa0/7', 'Fa0/8', 'Fa0/9', 'Fa0/10', 'Fa0/11'] }
  ]);

  var outSt12 = F.ifStatus([['Fa0/12', '', 'connected', '1', 'a-full', 'a-100', '10/100BaseTX']]);
  var outSt12Fixed = F.ifStatus([['Fa0/12', '', 'connected', '30', 'a-full', 'a-100', '10/100BaseTX']]);
  var outRun12 = F.cfg(['interface FastEthernet0/12', ' switchport mode access']);
  var outRun11 = F.cfg(['interface FastEthernet0/11', ' switchport access vlan 30', ' switchport mode access']);

  var outMac = F.macTable([
    ['1', '8c16.452d.7a90', 'Fa0/12'],
    ['20', '001b.54aa.1001', 'Gi0/1'],
    ['20', 'd0c2.82a1.3b04', 'Fa0/2'],
    ['30', '001b.54aa.1001', 'Gi0/1'],
    ['30', '509a.4c7e.21f6', 'Fa0/7'],
    ['30', 'b083.fe12.8a4d', 'Fa0/6'],
    ['30', 'f4a4.7c11.20be', 'Fa0/5']
  ]);

  var outTrunk = [
    'Port        Mode             Encapsulation  Status        Native vlan',
    'Gi0/1       on               802.1q         trunking      1',
    '',
    'Port        Vlans allowed on trunk',
    'Gi0/1       1-4094',
    '',
    'Port        Vlans allowed and active in management domain',
    'Gi0/1       1,20,30',
    '',
    'Port        Vlans in spanning tree forwarding state and not pruned',
    'Gi0/1       1,20,30'
  ].join('\n');

  var outRenewOk = F.ipconfig({ ip: '192.168.30.41', mask: '255.255.255.0', gw: '192.168.30.1', v6: V6 });
  var pingGwOk = F.ping('192.168.30.1', '192.168.30.41', [{ t: 1, ttl: 255 }, { t: '<1', ttl: 255 }, { t: '<1', ttl: 255 }, { t: '<1', ttl: 255 }]);

  PB.addCase({
    id: 'c2', no: 2, level: '初級',
    title: 'ひとりぼっちの青木さん',
    sub: '席を移したら、青木さんのPCだけ通信できない',
    bg: 'floor', prop: 'switch',
    cast: {
      client: { name: '青木さん', look: { hair: '#7a3b2e', shirt: '#f4a259', pants: '#3d405b', hat: null } },
      yama: { name: '山本さん', look: { hair: '#303030', shirt: '#6c9a8b', pants: '#4a4e69', hat: null } }
    },
    intro: [
      { w: 'narr', t: 'それから数日後。昼休みが終わったころ、2階の企画部から連絡が入った。' },
      { w: 'senior', t: '{me}さん、2階の企画部から呼ばれているよ。いっしょに行こう。' },
      { w: 'client', t: '企画部の青木です。今日、席替えで窓ぎわの席に移ったんです。そうしたら、私のパソコンだけネットワークにつながらなくて…。' },
      { w: 'client', t: '画面の右下に「識別されていないネットワーク」と出ています。ファイルも、チャットも、ウェブも全部だめなんです。' },
      { w: 'me', t: 'パソコンやケーブルは、前の席のものを持ってきたんですか?' },
      { w: 'client', t: 'はい、パソコンは同じものです。前の席では、普通に使えていました。' },
      { w: 'senior', t: 'ふむふむ。「場所を変えたら、その人だけだめ」。これは、つなぎ先の場所に原因があるかもしれないね。' },
      { w: 'senior', t: '今回は、パソコンだけでなく、スイッチというネットワーク機器の中も見てみよう。スイッチは、LANケーブルをたくさん差せる「たこ足配線」のような機器だよ。' }
    ],
    points: 8,

    talks: [
      {
        id: 'tk_aoki', who: 'client', label: '青木さんに、くわしく聞く',
        lines: [
          { w: 'me', t: '席を移したときの流れを教えてください。' },
          { w: 'client', t: '夜のうちに、床の配線工事をしてもらったそうです。朝、私は壁の「2F-12」と書いてあるジャックにLANケーブルを差しました。' },
          { w: 'client', t: '差した直後から、画面に「識別されていないネットワーク」と出て、そこから変わりません。' }
        ],
        ev: {
          id: 'e_aoki', title: '青木さんの話',
          text: '席を移してから、青木さんのPCだけネットワークにつながらない。新しい席のLANジャックは「2F-12」。前の席では使えていた。',
          say: '席の場所(つなぎ先)が変わってから起きたとわかります。',
          no: '症状を教えてくれる大事なメモだけど、原因そのものを示す証拠ではないんだ。'
        }
      },
      {
        id: 'tk_yama', who: 'yama', label: '隣の席の山本さんに聞く',
        lines: [
          { w: 'yama', t: '私は朝から普通に使えていますよ。企画部のほかの人も、困っているとは聞いていないです。' },
          { w: 'yama', t: '席は青木さんの隣です。夜に床の工事をしていたみたいですけど、私のほうは何ともありません。' }
        ],
        ev: {
          id: 'e_yama', title: '山本さんの話',
          text: '企画部のほかの人は、普通に使えている。困っているのは青木さんだけ。',
          say: '企画部全体の問題ではなく、青木さんの席だけの問題だとわかります。',
          no: '企画部のほかの人は大丈夫、という情報だけど、青木さんの席のどこが悪いかまでは教えてくれないね。'
        }
      },
      {
        id: 'tk_senior', who: 'senior', label: '先輩に聞く: 2階のネットワークの決まり',
        lines: [
          { w: 'me', t: '先輩、2階のネットワークは、どんな決まりになっているんですか?' },
          { w: 'senior', t: '2階のスイッチは SW-2F。部署ごとに、見えない壁で「部屋」を分けてあるんだ。この部屋のことを VLAN(ブイラン)と呼ぶよ。' },
          { w: 'senior', t: '経理部は VLAN 20、企画部は VLAN 30。企画部のパソコンは、つなぐと自動で 192.168.30.x のアドレスをもらえる決まりだよ。' }
        ],
        ev: {
          id: 'e_rule', title: '先輩の話(2階の決まり)',
          text: '2階のスイッチは SW-2F。経理部は VLAN 20、企画部は VLAN 30(192.168.30.0/24、ゲートウェイ 192.168.30.1)。企画部のPCは、つなぐとアドレスを自動でもらえる(DHCP)。',
          say: '企画部のポートは VLAN 30 に入っているべき、という決まりがわかります。',
          no: '2階の決まりがわかる大事なメモ。でも、青木さんの席がどうなっているかは、別のメモを見ないとわからないよ。'
        }
      }
    ],

    looks: [
      {
        id: 'lk_jack', label: '壁のLANジャックと配線表を見る', key: true,
        lines: [
          { w: 'narr', t: '青木さんの席の壁には、「2F-12」の札が付いたLANジャックがある。' },
          { w: 'narr', t: '近くの配線表には、こう書いてある。「2F-05(山本さん)はスイッチ SW-2F の Fa0/5」「2F-11 は Fa0/11」「2F-12(青木さん)は Fa0/12」。' },
          { w: 'senior', t: 'Fa0/12 は FastEthernet 0/12 の略で、スイッチの12番ポートのことだよ。' }
        ],
        ev: {
          id: 'e_jack', title: '配線表',
          lines: ['2F-12(青木さんの席)  SW-2F の Fa0/12', '2F-05(山本さんの席)  SW-2F の Fa0/5', '2F-11  SW-2F の Fa0/11'],
          say: '青木さんの席は、スイッチ SW-2F の Fa0/12 につながっているとわかります。',
          no: 'どのポートにつながっているかがわかる大事なメモ。でも、そのポートの設定がどうなっているかは、また別のメモだよ。'
        }
      },
      {
        id: 'lk_lamp', label: 'PCとスイッチのランプを見る',
        lines: [
          { w: 'narr', t: '青木さんのパソコンのLANランプは点灯している。スイッチ側の12番ポートのランプも、緑色に光っている。' },
          { w: 'senior', t: 'ケーブルは、ちゃんとつながっているみたいだね。' }
        ],
        ev: {
          id: 'e_lamp', title: 'ランプの様子',
          text: 'PCのLANランプも、スイッチの12番ポートのランプも点灯。ケーブルはつながっている。',
          say: 'ケーブルは生きているとわかります。',
          no: 'ケーブルはつながっているという情報だね。ケーブルが原因ではないとわかるけれど、本当の原因は教えてくれないんだ。'
        }
      },
      {
        id: 'lk_ticket', label: '席替えの作業メモを見る',
        lines: [
          { w: 'narr', t: '先輩のデスクに、席替えの作業メモがある。' },
          { w: 'narr', t: '「床の配線工事(2F-12 の新設)  完了」「スイッチのポート設定  ( 記入なし )」と書いてある。' },
          { w: 'senior', t: 'あっ…。ポートの設定をしたかどうか、チェックがついていないね。わたしの確認不足だったかも。' }
        ],
        ev: {
          id: 'e_ticket', title: '作業メモ',
          lines: ['配線工事(2F-12 の新設)  完了', 'スイッチのポート設定  記入なし'],
          say: 'ポートの設定をしたかどうか、記録がありません。設定がされていないかもしれない、と考えられます。',
          no: '設定したかどうか不明、という手がかり。でも、実際に設定がどうなっているかを見ないと、決め手にはならないよ。'
        }
      }
    ],

    devs: [
      { id: 'pc', name: '青木さんのPC', prompt: 'C:\\Users\\aoki>' },
      { id: 'ypc', name: '山本さんのPC', prompt: 'C:\\Users\\yamamoto>' },
      { id: 'sw', name: 'スイッチ SW-2F', prompt: 'SW-2F#' }
    ],

    cmds: [
      {
        id: 'cm_ipconfig', dev: 'pc', cmd: 'ipconfig', key: true,
        desc: '青木さんのPCのIPアドレスなどを見る',
        out: outApipa,
        read: '「Autoconfiguration IPv4 Address」の 169.254.x.x は、DHCPからアドレスをもらえなかったときに、PCが自分で付ける仮のアドレス(APIPA)だよ。Subnet Mask が 255.255.0.0 で、Default Gateway が空っぽなのも、そのしるし。つまり、このPCはDHCPサーバーと話せていないんだ。',
        ev: {
          id: 'e_apipa', title: '青木PC: ipconfig',
          grep: ['Autoconfiguration IPv4 Address', 'Subnet Mask', 'Default Gateway'],
          say: '169.254.x.x の仮のアドレスで、ゲートウェイも空っぽ。DHCPサーバーとやり取りできていません。',
          no: 'PCの設定が見えるメモだけど、「なぜ」までは教えてくれないんだ。'
        }
      },
      {
        id: 'cm_all', dev: 'pc', cmd: 'ipconfig /all',
        desc: 'もっとくわしい設定を見る',
        out: outApipaAll,
        read: 'DHCP Enabled は Yes(自動でもらう設定)。それなのに、DHCP Server の欄がないよね。もらおうとしたけれど、DHCPサーバーが返事をくれなかったんだ。Physical Address はこのPCのMACアドレスだよ。',
        ev: {
          id: 'e_all', title: '青木PC: ipconfig /all',
          grep: ['Physical Address', 'DHCP Enabled', 'Autoconfiguration IPv4 Address'],
          say: 'DHCPで自動取得する設定なのに、仮のアドレスのままです。MACアドレスは 8C-16-45-2D-7A-90 です。',
          no: '詳しい設定が見えるメモ。MACアドレスの情報が役に立つ場面もあるけど、決め手というほどではないよ。'
        }
      },
      {
        id: 'cm_lo', dev: 'pc', cmd: 'ping 127.0.0.1',
        desc: '自分自身の中のネットワーク機能が動いているか確認',
        out: pingLo,
        read: '127.0.0.1 は自分自身。返事があるので、このPCの中のTCP/IPは正常だよ。つまりPC本体の故障ではなさそう。',
        ev: {
          id: 'e_lo', title: '青木PC: ping 127.0.0.1',
          grep: ['Reply from', 'Packets:'],
          say: '',
          no: 'PC本体のネットワーク機能は動いている、という確認だね。外とつながらない理由までは教えてくれないよ。'
        }
      },
      {
        id: 'cm_renew', dev: 'pc', cmd: 'ipconfig /renew',
        desc: 'IPアドレスをもらい直してみる(DHCP)',
        out: outRenewFail,
        read: '「unable to contact your DHCP server」は「DHCPサーバーに連絡できない」という意味。もらい直そうとしても、DHCPサーバーまで声が届いていないんだ。',
        ev: {
          id: 'e_renew', title: '青木PC: ipconfig /renew',
          grep: ['An error occurred'],
          say: 'DHCPサーバーに連絡できません。声が届いていないのです。',
          no: 'DHCPに届いていないとわかるメモだけど、なぜ届かないのかは、また別のメモを見ないとわからないよ。'
        }
      },
      {
        id: 'cm_ya_ip', dev: 'ypc', cmd: 'ipconfig',
        desc: '隣の山本さん(普通に使えている)のPCの設定を見る',
        out: outYama,
        read: '山本さんは 192.168.30.25 で、Default Gateway は 192.168.30.1。企画部は 192.168.30.0/24 のネットワークで、ちゃんとアドレスをもらえているね。青木さんのPCと比べてみよう。',
        ev: {
          id: 'e_ya_ip', title: '山本PC: ipconfig',
          grep: ['IPv4 Address', 'Subnet Mask', 'Default Gateway'],
          say: '企画部の山本さんは 192.168.30.x のアドレスを普通にもらえています。DHCPサーバー自体は動いているとわかります。',
          no: '企画部の普通の状態がわかるメモ。比べる材料にはなるけど、決め手というほどではないよ。'
        }
      },
      {
        id: 'cm_vlan', dev: 'sw', cmd: 'show vlan brief', key: true,
        desc: 'VLANの一覧と、各ポートがどのVLANに入っているか',
        out: outVlan,
        read: 'VLANごとに、そこに入っているポートが並んでいるよ。企画部(KIKAKU, VLAN 30)には Fa0/5 から Fa0/11 までが入っている。さて、青木さんのつなぎ先 Fa0/12 は、どの行にあるかな?',
        ev: {
          id: 'e_vlan', title: 'SW-2F: show vlan brief',
          grep: ['VLAN Name', 'default', 'KIKAKU', 'Fa0/9, Fa0/10'],
          say: 'Fa0/12 は VLAN 1(default)に入っています。企画部の VLAN 30 には Fa0/5 から Fa0/11 までしか入っていません。',
          no: 'VLANの一覧が見えるメモ。よく見ると、大事な情報が隠れているよ。'
        }
      },
      {
        id: 'cm_st12', dev: 'sw', cmd: 'show interfaces fa0/12 status',
        desc: '12番ポートの状態(つながっているか、どのVLANか)',
        out: outSt12,
        read: 'Status が connected なので、ケーブルは認識されているよ。そして Vlan の欄に、そのポートが所属しているVLANの番号が出ている。ここが 1 だね。',
        ev: {
          id: 'e_st12', title: 'SW-2F: show interfaces fa0/12 status',
          grep: ['Port ', 'Fa0/12'],
          say: 'Fa0/12 は connected(つながっている)で、所属は VLAN 1 です。企画部の VLAN 30 ではありません。',
          no: '12番ポートの状態が見えるメモだね。よく見ると大事な数字があるよ。'
        }
      },
      {
        id: 'cm_run12', dev: 'sw', cmd: 'show running-config interface fa0/12',
        desc: '12番ポートの設定内容を見る',
        out: outRun12,
        read: '「switchport mode access」はあるけれど、「switchport access vlan (番号)」の行がないね。VLANを指定しないと、そのポートは最初のまま VLAN 1 に入っているよ。',
        ev: {
          id: 'e_run12', title: 'SW-2F: show running-config interface fa0/12',
          grep: ['interface FastEthernet0/12', 'switchport'],
          say: 'switchport mode access はあるのに、switchport access vlan の行がありません。VLANを指定していないので、初期の VLAN 1 のままです。',
          no: '12番ポートの設定が見えるメモだね。何が足りないか、考えてみよう。'
        }
      },
      {
        id: 'cm_run11', dev: 'sw', cmd: 'show running-config interface fa0/11',
        desc: '11番ポート(企画部の別の席)の設定内容を見る',
        out: outRun11,
        read: '11番ポートには「switchport access vlan 30」の行があるね。これで、このポートは VLAN 30(企画部)に入る。12番ポートの設定と比べてみよう。',
        ev: {
          id: 'e_run11', title: 'SW-2F: show running-config interface fa0/11',
          grep: ['interface FastEthernet0/11', 'switchport'],
          say: '正しく設定された11番ポートには switchport access vlan 30 があります。12番ポートにはこの行がありません。',
          no: '正しい設定の見本だね。12番と比べる材料になるけど、これだけでは決め手にならないよ。'
        }
      },
      {
        id: 'cm_mac', dev: 'sw', cmd: 'show mac address-table dynamic',
        desc: 'どのポートに、どのMACアドレスの機器がいるか(VLAN別)',
        out: outMac,
        read: 'スイッチが覚えた「ポートとMACアドレスの名簿」だよ。青木さんのPCのMACアドレスは 8C-16-45-2D-7A-90(ipconfig /all で確認)。スイッチの表記では 8c16.452d.7a90 になる。その行の Vlan の欄を見てみよう。',
        ev: {
          id: 'e_mac', title: 'SW-2F: show mac address-table dynamic',
          grep: ['Vlan    Mac Address', '8c16.452d.7a90', 'f4a4.7c11.20be'],
          say: '青木さんのPC(8c16.452d.7a90)は、Fa0/12 の VLAN 1 にいます。山本さんたち企画部は VLAN 30 です。別の部屋にいるのです。',
          no: 'どのポートに誰がいるかがわかるメモ。VLANの欄に注目してみよう。'
        }
      },
      {
        id: 'cm_trunk', dev: 'sw', cmd: 'show interfaces trunk',
        desc: 'スイッチ同士やルーターとつなぐ「トランク」の状態',
        out: outTrunk,
        read: 'Gi0/1 は trunking(トランクとして動作中)で、VLAN 1、20、30 が通れるよ。ルーターとの道は大丈夫そう。',
        ev: {
          id: 'e_trunk', title: 'SW-2F: show interfaces trunk',
          grep: ['Gi0/1       on', 'Gi0/1       1,20,30'],
          say: '',
          no: 'ルーターとの道(トランク)は正常だね。企画部のみんなが使えているのも、そのおかげ。でも青木さんだけの原因は教えてくれないよ。'
        }
      }
    ],

    hints: [
      '企画部のほかの人は大丈夫で、青木さんの席だけがだめ。席を変えて変わったのは「つなぎ先のポート」だね。',
      'まずPCで ipconfig を実行してみよう。169.254 から始まるアドレスは、DHCPからアドレスをもらえなかったときの仮のアドレス(APIPA)だよ。',
      'なぜもらえないのか。スイッチで show vlan brief を実行して、Fa0/12 がどのVLANに入っているか、企画部の人(Fa0/5など)と見比べてみて。',
      'あと一歩だよ。Fa0/12 が入っているVLANと、企画部のVLAN(30)は同じかな?'
    ],

    reason: {
      ask: '推理の時間だよ。青木さんだけ通信できない原因は、どれだと思う?',
      causes: [
        { id: 'trunk', t: 'SW-2Fとルーターの間のトランクが壊れている', why: 'トランク(Gi0/1)は trunking で動いていて、企画部の山本さんたちは普通に使えているよ。トランクが壊れていたら、企画部のみんなが困るはずだね。' },
        { id: 'dhcp', t: 'DHCPサーバーが止まっている', why: 'DHCPが止まっていたら、山本さんもアドレスをもらえないはず。企画部のほかのPCはちゃんともらえているから、DHCP全体の故障ではないんだ。青木さんの声だけが届いていないんだよ。' },
        { id: 'vlan', t: 'スイッチのポート Fa0/12 が、企画部のVLAN 30ではなく別のVLANに入っている', why: '' },
        { id: 'shut', t: 'Fa0/12 が shutdown(停止)されている', why: 'shutdown されたポートなら、ランプも消えて、show interfaces status の Status が disabled と出るよ。Fa0/12 は connected(つながっている)になっているね。' },
        { id: 'cable', t: 'LANケーブルがつながっていない', why: 'ランプは点灯していて、スイッチのポートも connected。ケーブルは生きているよ。' }
      ],
      answer: 'vlan',
      proofs: ['e_vlan', 'e_st12', 'e_run12', 'e_mac'],
      supports: ['e_apipa', 'e_jack', 'e_ticket', 'e_run11', 'e_all', 'e_renew', 'e_ya_ip', 'e_rule'],
      need: 1.5,
      askProof: 'いい推理だね。では、その根拠を見せて! 証拠メモから、決め手を2個選んでね(決め手1個と、それを支えるメモ1個でもいいよ)。',
      solved: [
        { w: 'senior', t: 'そのとおり! Fa0/12 は、企画部の VLAN 30 ではなく、初期値の VLAN 1 に入ったままだったんだ。' },
        { w: 'senior', t: 'DHCPの呼びかけは、同じVLANの中にしか届かない。だから青木さんは、DHCPサーバーにたどり着けなくて、仮のアドレスになったんだね。' },
        { w: 'client', t: '同じスイッチにつないでいても、「部屋」が違うと話せないんですね。' }
      ]
    },

    fix: {
      ask: '原因がわかったね。どう直すのが正しいかな?',
      options: [
        { t: 'PCに 192.168.30.99 を手入力で設定する', ok: false, why: 'Fa0/12 が VLAN 1 に入ったままだと、PCにVLAN 30のアドレスを手入力しても、VLAN 30の仲間やルーターとは「見えない壁」で隔てられたままだよ。壁のほうを直そう。' },
        { t: 'SW-2F の Fa0/12 を「switchport access vlan 30」で、企画部の VLAN 30 に入れる', ok: true, why: '' },
        { t: 'Fa0/12 に「switchport mode trunk」を設定する', why: 'トランクは、複数のVLANをまとめて運ぶ道だよ。PCはVLANの印(タグ)を付けられないので、PCをつなぐポートには向かないんだ。PC用のポートは、アクセスポートにしてVLANを1つ指定するよ。', ok: false },
        { t: 'ルーターを再起動する', ok: false, why: 'ルーターは元気で、ほかの企画部のPCは使えているよ。再起動しても、Fa0/12 が入っているVLANは変わらないね。' }
      ],
      verify: [
        { prompt: 'SW-2F#', cmd: 'configure terminal', out: 'Enter configuration commands, one per line.  End with CNTL/Z.' },
        { prompt: 'SW-2F(config)#', cmd: 'interface FastEthernet0/12', out: '' },
        { prompt: 'SW-2F(config-if)#', cmd: 'switchport access vlan 30', out: '' },
        { prompt: 'SW-2F(config-if)#', cmd: 'end', out: 'SW-2F#\n*Oct 27 13:42:09.115: %SYS-5-CONFIG_I: Configured from console by console' },
        { prompt: 'SW-2F#', cmd: 'show interfaces fa0/12 status', out: outSt12Fixed },
        { prompt: 'C:\\Users\\aoki>', cmd: 'ipconfig /renew', out: outRenewOk },
        { prompt: 'C:\\Users\\aoki>', cmd: 'ping 192.168.30.1', out: pingGwOk }
      ],
      verifyNote: 'Fa0/12 が VLAN 30 になり、青木さんのPCは 192.168.30.41 をもらえた。ゲートウェイにも届いたね。',
      after: [
        { w: 'client', t: 'あ、つながりました! ありがとうございます!' },
        { w: 'senior', t: '設定の保存(copy running-config startup-config)も忘れずにね。電源が切れると、せっかくの設定が消えてしまうよ。' },
        { w: 'senior', t: 'それから、席替えのときの作業メモに「ポートのVLAN設定」のチェック欄を作っておこう。' },
        { w: 'me', t: 'はい! 「ケーブルがつながっている」のと「同じ部屋にいる」のは、別の話なんですね。' }
      ]
    },

    lesson: {
      cause: 'アクセスポートのVLAN設定もれ(ポートが初期値の VLAN 1 のまま)',
      text: [
        'VLANが違うと、同じスイッチにつながっていても、別のネットワークとして扱われます。ルーターを通さない限り、通信できません。',
        'DHCPの呼びかけ(ブロードキャスト)は、同じVLANの中にしか届きません。だから、別のVLANに入ったPCは、アドレスをもらえず 169.254.x.x の仮のアドレス(APIPA)になりました。',
        'PCをつなぐポートは「アクセスポート」にして、VLANを1つ指定します。指定しないと、ポートは初期値の VLAN 1 に入ったままです。'
      ],
      points: [
        '設定は「switchport mode access」と「switchport access vlan 30」の2行セット。',
        '確認は show vlan brief(VLANごとのポート一覧)と show interfaces <ポート> status(Vlan の欄)。',
        'PCが 169.254.x.x になっていたら、DHCPに声が届いていない。VLANやケーブルを疑う。',
        'ランプが光っていても、VLANが違えば通信できない。'
      ],
      exam: '試験では、show vlan brief の出力が示されて「PCが通信できない原因は?」と聞かれる問題が考えられます。そのPCのポートが、どのVLANの行に載っているかを、落ち着いて探そう。',
      mons: ['a3-vlan', 'a3-access-port', 'a2-special']
    }
  });
})();

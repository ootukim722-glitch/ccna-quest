/* pa-data.js - 手書きのマップ、人物、トレーナー、調整用の数字
   タイルの文字:
   [外] # 木  ~ 水  , 地面  . 道  g 草むら  F 花  M 看板  X ロープ(さいしょの仲間をもらうまで通れない)
        r 屋根  w かべ  v 窓つきのかべ  D ドア
   [中] = 奥のかべ  : ゆか  m じゅうたん  O 出口マット  S 本だな  T つくえ  P 植木  C カウンター
        H 回復きかい  K ボックス端末  I 柱 */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PA = Q.pa = Q.pa || {};

  PA.CFG = {
    PARTY_MAX: 6,
    MAXLV: 30,
    GYM_NEED: 6,       /* ジムに入るのに必要な仲間の数 */
    DUE_GUIDE: 3,      /* 復習が必要な問題がこの数以上なら、復習所で案内する */
    START_LV: 3
  };

  var maps = PA.maps = {};

  /* ===== ネットワーク村 20x16 ===== */
  maps.town = {
    id: 'town', name: 'ネットワーク村', out: true, theme: 'a1', bgm: 'map',
    rows: [
      '#########..#########',
      '#,,,,,,,,XX,,,,,,,,#',
      '#,rrrrr,,..,,rrrrr,#',
      '#,rrrrr,,..,,rrrrr,#',
      '#,vwDwv,,..,,vwDwv,#',
      '#,,,.,,,,..,,,,.,,,#',
      '#,,,.,,,,..,,,,.,,,#',
      '#,,,............,,,#',
      '#,F,,,,,,..,,,,,,F,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,rrrr,,,..,,~~~~,,#',
      '#,vwwv,,,..,,~~~~,,#',
      '#,,,,,,,,..,,,~~~,,#',
      '#,F,,M,,,..,,,,,,F,#',
      '#,,,,,,,,..,,,,,,,,#',
      '####################'
    ],
    buildings: [
      { x: 2, y: 2, w: 5, h: 3, kind: 'house' },
      { x: 13, y: 2, w: 5, h: 3, kind: 'center' },
      { x: 2, y: 10, w: 4, h: 2, kind: 'deco' }
    ],
    warps: [
      { x: 4, y: 4, to: 'house', tx: 4, ty: 6, dir: 'up', door: true },
      { x: 15, y: 4, to: 'center', tx: 5, ty: 6, dir: 'up', door: true },
      { x: 9, y: 0, to: 'route1', tx: 9, ty: 32, dir: 'up' },
      { x: 10, y: 0, to: 'route1', tx: 10, ty: 32, dir: 'up' }
    ],
    signs: {
      '5,13': ['ここは ネットワーク村。\nひだりうえの あかい やねが ハカセの いえ、\nみぎうえの あおい やねが ふくしゅうじょ。']
    },
    npcs: [
      { id: 'v1', x: 6, y: 9, dir: 'down', look: 'villager1', kind: 'talk' },
      { id: 'v2', x: 13, y: 8, dir: 'left', look: 'villager2', kind: 'talk' },
      { id: 'v3', x: 12, y: 13, dir: 'up', look: 'kid', kind: 'talk' }
    ]
  };

  /* ===== 1番道路 20x34 ===== */
  maps.route1 = {
    id: 'route1', name: '1ばんどうろ', out: true, theme: 'a1', bgm: 'map',
    rows: [
      '####################',
      '#,,,,,,rrrrrr,,,,,,#',
      '#,,,,,,rrrrrr,,,,,,#',
      '#,,,,,,vwwDwv,,,,,,#',
      '#,,F,,,,,..,,,,F,,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,##,,,,..,,,,##,,#',
      '#,,##,,,,..,,,,##,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,gggggg,..,gggggg,#',
      '#,gggggg,..,gggggg,#',
      '#,gggggg,..,gggggg,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,~~,,,,..,,,,,,,,#',
      '#,~~~~,,,..,,,,,,,,#',
      '#,,~~,,,,..,,,,##,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,gggggg,..,gggggg,#',
      '#,gggggg,..,gggggg,#',
      '#,gggggg,..,gggggg,#',
      '#,gggggg,..,gggggg,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,,F,,,,..,,,,,F,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,gggg,,,..,,,gggg,#',
      '#,gggg,,,..,,,gggg,#',
      '#,gggg,,,..,,,gggg,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#,,,,M,,,..,,,,,,,,#',
      '#,,,,,,,,..,,,,,,,,#',
      '#########..#########'
    ],
    buildings: [
      { x: 7, y: 1, w: 6, h: 3, kind: 'gym' }
    ],
    warps: [
      { x: 10, y: 3, to: 'gym', tx: 5, ty: 10, dir: 'up', door: true, need: 'gym' },
      { x: 9, y: 33, to: 'town', tx: 9, ty: 2, dir: 'down' },
      { x: 10, y: 33, to: 'town', tx: 10, ty: 2, dir: 'down' }
    ],
    signs: {
      '5,31': ['1ばんどうろ\nみなみ: ネットワーク村\nきた: ジム(なかまを そろえてから いこう)']
    },
    npcs: [
      {
        id: 'tr1', kind: 'trainer', name: 'たんけんか ミノル', x: 4, y: 14, dir: 'right', sight: 6, look: 't1',
        team: [{ id: 'a1-switch', d: -1 }, { id: 'a1-mac-table', d: 0 }],
        pre: ['おっ、なかまを つれてるね!\nぼくと しょうぶだ!'],
        win: ['やられた…! きみ、ちしきが しっかりしてるな。'],
        after: ['ぼくも もっと べんきょうして つよくなるぞ!']
      },
      {
        id: 'tr2', kind: 'trainer', name: 'ケーブルしょくにん タケ', x: 15, y: 24, dir: 'left', sight: 6, look: 't2',
        team: [{ id: 'a1-fiber', d: 0 }, { id: 'a1-utp-poe', d: 0 }, { id: 'a1-wan', d: 0 }],
        pre: ['ケーブルのことなら おれに まかせろ!\nこの3たいを のりこえられるかな?'],
        win: ['まいった! ケーブルの ちしき、バッチリだ。'],
        after: ['ケーブルの なかまは ほかにもいるぞ。くさむらで さがしてみな。']
      },
      {
        id: 'tr3', kind: 'trainer', name: 'ネットがくせい ミサキ', x: 15, y: 8, dir: 'left', sight: 6, look: 't3',
        team: [{ id: 'a1-tcp', d: 0 }, { id: 'a1-udp', d: 0 }, { id: 'a1-cloud', d: 1 }],
        pre: ['ジムを めざしてるのね?\nそのまえに わたしの 3たいと しょうぶよ!'],
        win: ['やるわね…! ジムリーダーにも まけないでね。'],
        after: ['TCPとUDPの ちがいは、ジムでも でるわよ。']
      }
    ]
  };

  /* ===== ハカセの家 9x8 ===== */
  maps.house = {
    id: 'house', name: 'ハカセの いえ', floor: 'wood', theme: 'a1', bgm: 'map',
    rows: [
      '=========',
      '=SS:::SS=',
      '=:::::::=',
      '=:mmmmm:=',
      '=:mmmmm:=',
      '=P:::::P=',
      '=:::::::=',
      '====O===='
    ],
    buildings: [],
    warps: [{ x: 4, y: 7, to: 'town', tx: 4, ty: 5, dir: 'down' }],
    signs: {},
    npcs: [{ id: 'teacher', x: 4, y: 2, dir: 'down', look: 'teacher', kind: 'teacher' }]
  };

  /* ===== ふくしゅうじょ 11x8 ===== */
  maps.center = {
    id: 'center', name: 'ふくしゅうじょ', floor: 'tile', theme: 'a1', bgm: 'map',
    rows: [
      '===========',
      '=SS:::::SS=',
      '=:::::::::=',
      '=:CCCCCCH:=',
      '=:::::::::=',
      '=K:::::::P=',
      '=:::::::::=',
      '=====O====='
    ],
    buildings: [],
    warps: [{ x: 5, y: 7, to: 'town', tx: 15, ty: 5, dir: 'down' }],
    signs: {},
    npcs: [
      { id: 'nurse', x: 5, y: 2, dir: 'down', look: 'nurse', kind: 'nurse' },
      { id: 'visitor', x: 8, y: 5, dir: 'left', look: 'villager2', kind: 'talk' }
    ]
  };

  /* ===== ジム 11x12 ===== */
  maps.gym = {
    id: 'gym', name: 'ネットワーク ジム', floor: 'stone', theme: 'a1', bgm: 'map',
    rows: [
      '===========',
      '=II:::::II=',
      '=:::::::::=',
      '=:::mmm:::=',
      '=:I:mmm:I:=',
      '=:::mmm:::=',
      '=:I:mmm:I:=',
      '=:::mmm:::=',
      '=:I:mmm:I:=',
      '=:::mmm:::=',
      '=:::mmm:::=',
      '=====O====='
    ],
    buildings: [],
    warps: [{ x: 5, y: 11, to: 'route1', tx: 10, ty: 4, dir: 'down' }],
    signs: {},
    npcs: [{ id: 'leader', x: 5, y: 2, dir: 'down', look: 'leader', kind: 'leader' }]
  };

  /* 人物の台詞(状況に応じて変わるものは関数) */
  PA.talk = {
    v1: function (S) {
      return S.flags.starter
        ? ['くさむらの モンスターは、たたかって かてば なかまに なってくれるんだ。', 'たたかうとき わからなければ「ヒント」を つかってみてね。\nまちがいの わざが 2つ きえるよ。']
        : ['ハカセの いえは ひだりうえの あかい やねだよ。', 'さいしょの なかまを もらいに いくといいよ!'];
    },
    v2: function (S) {
      return ['ふくしゅうじょ(あおい やね)では、つかれた なかまを やすませてくれる。', 'まちがえた もんだいの おさらい(ふくしゅうバトル)も できるよ。'];
    },
    v3: function (S) {
      return ['ジムの ドアは、なかまが ' + PA.CFG.GYM_NEED + 'たい いないと ひらかないんだって。', 'いま ' + Q.totalCaught() + 'たい なかまに してるんだよね?'];
    },
    visitor: function (S) {
      return ['ずかんを ひらくと、まちがえた もんだいが たまっている モンスターに しるしが つくよ。', 'しるしの モンスターは、また たたかって おぼえなおそう!'];
    }
  };
})();

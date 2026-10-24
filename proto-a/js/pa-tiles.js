/* pa-tiles.js - 建物(屋根・かべ・窓・ドア)と室内のタイルを描く関数 */
(function () {
  'use strict';
  var Q = window.QUEST;
  var PA = Q.pa = Q.pa || {};

  function sp(c, x, y, col, rx, ry, w, h) { c.fillStyle = col; c.fillRect(x + rx, y + ry, w, h); }

  var PAL = {
    house: { roof: '#c0392b', roofD: '#8e2a20', roofL: '#e0594a', wall: '#f2e4c2', wallD: '#d6c294', trim: '#7a5230' },
    center: { roof: '#2e86de', roofD: '#1b5aa0', roofL: '#63a9f0', wall: '#f4f7fc', wallD: '#c9d4e8', trim: '#3a5a8a' },
    gym: { roof: '#7b2cbf', roofD: '#54199a', roofL: '#a05ae0', wall: '#ddd5ee', wallD: '#b6a9d4', trim: '#4a3a7a' },
    deco: { roof: '#2f8f6a', roofD: '#1f6a4e', roofL: '#52b58c', wall: '#efe8d4', wallD: '#d2c7a6', trim: '#6b4a2b' }
  };

  function kindAt(map, tx, ty) {
    var bl = map.buildings || [];
    for (var i = 0; i < bl.length; i++) {
      var b = bl[i];
      if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return b.kind;
    }
    return 'house';
  }

  /* ---------- 屋根 ---------- */
  function roof(c, x, y, p, above, below) {
    sp(c, x, y, p.roof, 0, 0, 16, 16);
    var i, j, k;
    for (i = 0; i < 4; i++) sp(c, x, y, p.roofD, 0, i * 4 + 3, 16, 1);
    for (j = 0; j < 4; j++) {
      var off = (j % 2) * 4;
      for (k = off; k < 16; k += 8) sp(c, x, y, p.roofD, k, j * 4, 1, 3);
    }
    if (above !== 'r') { sp(c, x, y, p.roofL, 0, 0, 16, 2); }
    if (below !== 'r') { sp(c, x, y, p.roofD, 0, 13, 16, 3); sp(c, x, y, 'rgba(0,0,0,.22)', 0, 15, 16, 1); }
  }

  /* ---------- かべ・窓 ---------- */
  function wall(c, x, y, p, win) {
    sp(c, x, y, p.wall, 0, 0, 16, 16);
    sp(c, x, y, p.wallD, 0, 5, 16, 1); sp(c, x, y, p.wallD, 0, 10, 16, 1);
    sp(c, x, y, '#8a8a99', 0, 14, 16, 2);
    if (win) {
      sp(c, x, y, p.trim, 3, 2, 10, 9);
      sp(c, x, y, '#8fd0ff', 4, 3, 8, 7);
      sp(c, x, y, p.trim, 7, 3, 2, 7); sp(c, x, y, p.trim, 4, 6, 8, 1);
      sp(c, x, y, '#ffffff', 5, 4, 2, 1);
    }
  }

  /* ---------- ドア ---------- */
  function door(c, x, y, p, kind) {
    wall(c, x, y, p, false);
    if (kind === 'center') {
      sp(c, x, y, p.trim, 3, 0, 10, 7); sp(c, x, y, '#ffffff', 4, 1, 8, 5);
      sp(c, x, y, '#e63946', 7, 1, 2, 5); sp(c, x, y, '#e63946', 5, 3, 6, 2);
      sp(c, x, y, p.trim, 2, 7, 12, 9); sp(c, x, y, '#9fd8ff', 3, 8, 10, 8);
      sp(c, x, y, '#ffffff', 7, 8, 2, 8); sp(c, x, y, '#ffffff', 4, 9, 2, 1);
    } else if (kind === 'gym') {
      sp(c, x, y, p.trim, 2, 0, 12, 6); sp(c, x, y, '#ffd166', 3, 1, 10, 4);
      sp(c, x, y, '#7b2cbf', 5, 2, 2, 2); sp(c, x, y, '#7b2cbf', 9, 2, 2, 2); sp(c, x, y, '#7b2cbf', 7, 3, 2, 1);
      sp(c, x, y, '#2a1f45', 2, 6, 12, 10); sp(c, x, y, '#3d2f66', 3, 7, 4, 9); sp(c, x, y, '#3d2f66', 9, 7, 4, 9);
      sp(c, x, y, '#ffd166', 6, 10, 1, 3); sp(c, x, y, '#ffd166', 9, 10, 1, 3);
    } else {
      sp(c, x, y, p.trim, 2, 2, 12, 14); sp(c, x, y, '#8a5a2b', 3, 3, 10, 13);
      sp(c, x, y, '#74481f', 4, 4, 8, 5); sp(c, x, y, '#74481f', 4, 10, 8, 5);
      sp(c, x, y, '#ffd166', 10, 9, 2, 2);
    }
  }

  /* ---------- 室内の床・かべ ---------- */
  function floor(c, x, y, style, tx, ty) {
    if (style === 'tile') {
      sp(c, x, y, ((tx + ty) & 1) ? '#e9eef5' : '#dbe3ee', 0, 0, 16, 16);
      sp(c, x, y, 'rgba(0,0,0,.05)', 0, 15, 16, 1);
    } else if (style === 'stone') {
      sp(c, x, y, ((tx + ty) & 1) ? '#8e94a8' : '#82889c', 0, 0, 16, 16);
      sp(c, x, y, 'rgba(255,255,255,.08)', 0, 0, 16, 1);
    } else {
      sp(c, x, y, '#c89a6a', 0, 0, 16, 16);
      sp(c, x, y, '#b3834f', 0, 7, 16, 1); sp(c, x, y, '#b3834f', 0, 15, 16, 1);
      sp(c, x, y, '#b3834f', ((ty & 1) ? 4 : 11), 0, 1, 7); sp(c, x, y, '#b3834f', ((ty & 1) ? 11 : 4), 8, 1, 7);
    }
  }
  function backWall(c, x, y, style) {
    if (style === 'tile') {
      sp(c, x, y, '#cfe3f5', 0, 0, 16, 16); sp(c, x, y, '#9bbbd8', 0, 13, 16, 3); sp(c, x, y, '#b6d2ea', 0, 6, 16, 1);
    } else if (style === 'stone') {
      sp(c, x, y, '#5a5f78', 0, 0, 16, 16); sp(c, x, y, '#3f435a', 0, 13, 16, 3);
      sp(c, x, y, '#4d526b', 0, 5, 16, 1); sp(c, x, y, '#4d526b', 0, 10, 16, 1);
      sp(c, x, y, '#4d526b', 4, 0, 1, 5); sp(c, x, y, '#4d526b', 11, 6, 1, 4);
    } else {
      sp(c, x, y, '#e8d8b0', 0, 0, 16, 16); sp(c, x, y, '#8a5a2b', 0, 13, 16, 3);
      sp(c, x, y, '#d6c294', 0, 4, 16, 1); sp(c, x, y, '#d6c294', 0, 9, 16, 1);
    }
  }

  var BOOKS = ['#e63946', '#2a9d8f', '#ffd166', '#4361ee', '#f4a261', '#8338ec'];

  /* 1タイルを描く。env: { map, theme, fr, tileAt(x,y), heal } */
  PA.drawTile = function (c, ch, x, y, tx, ty, env) {
    var map = env.map, th = env.theme, style = map.floor || 'wood';
    var h = Q.hash(tx + ',' + ty + map.id);
    switch (ch) {
      /* --- 外 --- */
      case 'r': case 'w': case 'v': case 'D': {
        var kind = kindAt(map, tx, ty), p = PAL[kind] || PAL.house;
        if (ch === 'r') roof(c, x, y, p, env.tileAt(tx, ty - 1), env.tileAt(tx, ty + 1));
        else if (ch === 'w') wall(c, x, y, p, false);
        else if (ch === 'v') wall(c, x, y, p, true);
        else door(c, x, y, p, kind);
        return;
      }
      case 'X': {
        Q.drawTile(c, '.', x, y, th, env.fr, tx, ty);
        if (!env.opened) {
          sp(c, x, y, 'rgba(0,0,0,.2)', 1, 14, 14, 2);
          sp(c, x, y, '#8a5a2b', 1, 4, 2, 11); sp(c, x, y, '#8a5a2b', 13, 4, 2, 11);
          sp(c, x, y, '#ffd166', 1, 3, 2, 2); sp(c, x, y, '#ffd166', 13, 3, 2, 2);
          sp(c, x, y, '#e63946', 3, 6, 10, 2); sp(c, x, y, '#e63946', 3, 10, 10, 2);
        }
        return;
      }
      /* --- 室内 --- */
      case ':': floor(c, x, y, style, tx, ty); return;
      case '=': backWall(c, x, y, style); return;
      case 'O': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, '#6b4a2b', 1, 4, 14, 12); sp(c, x, y, '#a98a5a', 2, 6, 12, 1); sp(c, x, y, '#a98a5a', 2, 9, 12, 1); sp(c, x, y, '#a98a5a', 2, 12, 12, 1);
        return;
      }
      case 'm': {
        floor(c, x, y, style, tx, ty);
        var main = style === 'stone' ? '#2f5fb0' : '#b5453c', edge = style === 'stone' ? '#ffd166' : '#e8c15a';
        sp(c, x, y, main, 0, 0, 16, 16);
        if (env.tileAt(tx - 1, ty) !== 'm') sp(c, x, y, edge, 0, 0, 2, 16);
        if (env.tileAt(tx + 1, ty) !== 'm') sp(c, x, y, edge, 14, 0, 2, 16);
        if (env.tileAt(tx, ty - 1) !== 'm') sp(c, x, y, edge, 0, 0, 16, 2);
        if (env.tileAt(tx, ty + 1) !== 'm') sp(c, x, y, edge, 0, 14, 16, 2);
        sp(c, x, y, 'rgba(255,255,255,.12)', 5, 5, 6, 6);
        return;
      }
      case 'S': {
        backWall(c, x, y, style);
        sp(c, x, y, '#6b4a2b', 1, 1, 14, 15); sp(c, x, y, '#3d2a18', 2, 2, 12, 13);
        sp(c, x, y, '#8a5a2b', 2, 8, 12, 1);
        var i;
        for (i = 0; i < 5; i++) {
          sp(c, x, y, BOOKS[(h + i) % 6], 2 + i * 2 + (i > 2 ? 1 : 0), 3, 2, 5);
          sp(c, x, y, BOOKS[(h + i + 2) % 6], 2 + i * 2 + (i > 2 ? 1 : 0), 9, 2, 5);
        }
        return;
      }
      case 'T': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, 'rgba(0,0,0,.2)', 1, 13, 14, 3);
        sp(c, x, y, '#7a4a1f', 2, 9, 2, 6); sp(c, x, y, '#7a4a1f', 12, 9, 2, 6);
        sp(c, x, y, '#a9743a', 0, 4, 16, 6); sp(c, x, y, '#c58d4e', 0, 4, 16, 1);
        return;
      }
      case 'P': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, 'rgba(0,0,0,.2)', 3, 14, 10, 2);
        sp(c, x, y, '#b5653a', 4, 10, 8, 5); sp(c, x, y, '#8e4a26', 4, 10, 8, 1);
        sp(c, x, y, '#2f8f45', 3, 3, 10, 8); sp(c, x, y, '#46b062', 5, 2, 4, 4); sp(c, x, y, '#1f6b2e', 9, 6, 4, 4);
        return;
      }
      case 'C': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, '#e8eef7', 0, 3, 16, 5); sp(c, x, y, '#ffffff', 0, 3, 16, 1);
        sp(c, x, y, '#3a7bd5', 0, 8, 16, 8); sp(c, x, y, '#2a5ca8', 0, 8, 16, 1); sp(c, x, y, '#5a9bf0', 2, 11, 12, 1);
        return;
      }
      case 'H': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, '#3a7bd5', 0, 8, 16, 8); sp(c, x, y, '#2a5ca8', 0, 8, 16, 1);
        sp(c, x, y, '#cfd8e6', 0, 0, 16, 9); sp(c, x, y, '#9aa8bd', 0, 8, 16, 1);
        sp(c, x, y, '#2a9d8f', 2, 1, 5, 3);
        var heal = env.heal || 0;
        for (var k = 0; k < 6; k++) {
          var lit = heal > k;
          sp(c, x, y, lit ? '#ffd166' : '#6b7285', 2 + (k % 3) * 4, 5 + ((k / 3) | 0) * 3, 3, 2);
        }
        return;
      }
      case 'K': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, 'rgba(0,0,0,.2)', 1, 14, 14, 2);
        sp(c, x, y, '#3a3a4a', 2, 1, 12, 9); sp(c, x, y, '#5ee6d0', 3, 2, 10, 7);
        sp(c, x, y, '#2fb5a0', 3, 4, 10, 1); sp(c, x, y, '#2fb5a0', 3, 7, 10, 1);
        sp(c, x, y, '#555566', 6, 10, 4, 2); sp(c, x, y, '#8a8a99', 3, 12, 10, 3);
        return;
      }
      case 'I': {
        floor(c, x, y, style, tx, ty);
        sp(c, x, y, 'rgba(0,0,0,.25)', 2, 14, 12, 2);
        sp(c, x, y, '#6e748c', 3, 13, 10, 3); sp(c, x, y, '#9aa0b8', 4, 2, 8, 11); sp(c, x, y, '#b9bfd6', 4, 2, 2, 11);
        sp(c, x, y, '#6e748c', 3, 0, 10, 3);
        sp(c, x, y, '#7b2cbf', 4, 5, 8, 1); sp(c, x, y, '#7b2cbf', 4, 8, 8, 1); sp(c, x, y, '#7b2cbf', 4, 11, 8, 1);
        sp(c, x, y, '#ffd166', 7, 4, 2, 1);
        return;
      }
      default:
        Q.drawTile(c, ch, x, y, th, env.fr, tx, ty);
    }
  };

  /* びっくりマーク(トレーナーが見つけたとき) */
  PA.drawBang = function (c, x, y) {
    sp(c, x, y, '#111827', 4, -14, 8, 12);
    sp(c, x, y, '#ffffff', 5, -13, 6, 10);
    sp(c, x, y, '#e63946', 7, -12, 2, 5); sp(c, x, y, '#e63946', 7, -6, 2, 2);
    sp(c, x, y, '#111827', 6, -2, 4, 2);
  };

  /* 人物の見た目 */
  PA.looks = {
    player: Q.looks.player,
    teacher: Q.looks.teacher,
    leader: Q.looks.boss,
    nurse: { hair: '#f19cbb', shirt: '#ffffff', pants: '#f19cbb', hat: '#ffffff' },
    villager1: { hair: '#8a5a2b', shirt: '#2a9d8f', pants: '#6d597a', hat: null },
    villager2: { hair: '#2b2b3a', shirt: '#f4a261', pants: '#264653', hat: '#ffd166' },
    kid: { hair: '#c0392b', shirt: '#4361ee', pants: '#2b2b3a', hat: null },
    t1: { hair: '#2b2b3a', shirt: '#e76f51', pants: '#264653', hat: '#e9c46a' },
    t2: { hair: '#6b4a2b', shirt: '#3a86ff', pants: '#3d3d4d', hat: '#ffffff' },
    t3: { hair: '#7b2cbf', shirt: '#2a9d8f', pants: '#264653', hat: null }
  };
})();

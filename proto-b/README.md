# 試作B: ネットワーク障害調査室(探偵・法廷ゲーム風)

CCNAクエストの別案。草むらのクイズではなく、「ネットワークの困りごと(事件)を調べて原因を当てる」形で、
`show` コマンドや `ipconfig` の出力を読む練習をする。ポケモン風(本体)と遊び比べるための試作。

## 遊び方
- 開き方: `node tools/serve.js 8082` を起動して `http://localhost:8082/proto-b/index.html` を開く(GitHub Pages では `/ccna-quest/proto-b/`)。`index.html` を直接開いても動く。
- 主人公は小さな会社の新人ITサポート。先輩(凪野)がやさしく助けてくれる。事件は3本を順に解く。
- 1ケースの流れ:
  1. 依頼人の話(立ち絵つきの会話。タップで進む)
  2. 調査: 「関係者に聞く」(ポイント不要)、「現場を調べる」(1ポイント)、「コマンドを実行する」(1ポイント)。手がかりは「証拠メモ」に自動で貼られる。調査ポイントが0になっても、「大事な調査」だけはポイントなしで続けられる(詰まない)。
  3. 推理: 原因を選び、根拠の証拠メモを1〜2個つきつける。間違えたら先輩が理由を教えてやり直し。
  4. 解決: 直し方を選ぶ。直したあとの確認画面(擬似端末)が出る。
  5. ふりかえり: 今回の原因、ポイントのまとめ、試験でのポイント、教材(a1〜a3 のモンスター)のたとえ話と要点。
- ランク: 「推理・修理のミス」+「使ったヒント」(先輩への相談、コマンド結果の読み方を聞く)の合計が2回までS、5回までA、それ以上B。
- 進捗(解いた事件、ランク、ミス数、ヒント数)と、途中経過(続きから)は localStorage の `ccnaquest.protoB.v1` に保存(本番のセーブとは別)。

## 事件
| No | タイトル | 原因 | 関連教材 |
|---|---|---|---|
| 1 | つながらない営業部 | 営業部PCのデフォルトゲートウェイの設定ミス | a2-client, a2-mask |
| 2 | ひとりぼっちの青木さん | スイッチのポートが企画部のVLANではなく VLAN 1 に入っている | a3-vlan, a3-access-port, a2-special |
| 3 | とまったプリンタ | プリンタとノートPCが同じIPアドレスを使っている(IP重複) | a2-ipv4, a1-mac-table, a2-client |

## ファイル
| 場所 | 中身 |
|---|---|
| `index.html` | 画面の骨組み。本体の `js/core.js` `js/sprites.js` `js/audio.js` と `packs/ccna/a1〜a3.js` を相対パスで読む。`QUEST_SAVE_KEY` を試作用に指定 |
| `data/cases.js` | 事件の登録(`PB.addCase`)と、Windows/Cisco の出力を組み立てる道具(`PB.fmt`) |
| `data/case1.js` 〜 `case3.js` | 事件データ(1ファイル1事件) |
| `js/game.js` | 進行(タイトル、ケース選択、会話、調査、端末、推理、解決、ふりかえり、保存) |
| `js/ui.js` `js/sfx.js` | DOM・ドット絵(人物は `Q.drawPerson`、小物は fillRect)・効果音の道具 |
| `css/style.css` | 見た目(縦画面、100dvh) |

## 事件データの形式
事件を足すには、`data/caseN.js` を作り、`index.html` の `data/case3.js` の次に `<script>` を1行足す。

```js
PB.addCase({
  id: 'c4', no: 4, level: '初級', title: '...', sub: '一覧に出る1行説明',
  bg: 'office' | 'floor' | 'room',     // 背景の色合い
  prop: 'monitor' | 'switch' | 'printer', // 背景のドット絵の小物
  cast: { client: { name: '...', look: { hair, shirt, pants, hat } } }, // 人物。senior と me は共通(PB.cast)
  intro: [ { w: 'client', t: '台詞' }, ... ],   // w: cast のキー / 'me' / 'senior' / 'narr'(地の文)。{me} は主人公の名前
  points: 8,                                    // 調査ポイント
  talks: [ { id, who, label, lines: [...], ev: {...} } ],   // 関係者に聞く(0ポイント)
  looks: [ { id, label, key: true?, lines: [...], ev: {...} } ], // 現場を調べる(1ポイント)
  devs:  [ { id, name, prompt: 'C:\\Users\\x>' } ],          // 端末で選べる機器
  cmds:  [ { id, dev, cmd, desc, out, read, key: true?, ev: {...} } ], // コマンド
  hints: [ '先輩のヒント(順に出る)', ... ],
  reason: { ask, causes: [ { id, t, why } ], answer, proofs: [evId], supports: [evId], need, askProof, solved: [lines] },
  fix:    { ask, options: [ { t, ok, why } ], verify: [ { prompt, cmd, out } ], verifyNote, after: [lines] },
  lesson: { cause, text: [...], points: [...], exam, mons: ['a2-client', ...] } // mons は packs のモンスターid
});
```
- `ev`(証拠メモ): `{ id, title, say, no, text | lines | grep }`。
  - `grep: ['文字列', ...]` は、コマンド出力から「その文字列を含む最初の行」をそのまま抜き出して貼る(出力と食い違わない)。
  - `say` は決め手・補強として出したときの先輩の説明、`no` は関係が薄いものを出したときの説明。
- `reason.proofs` は決め手(1点)、`supports` は補強(0.5点)。選んだ証拠の合計が `need` 以上で推理成功。例: need 1.5 は「決め手2つ」か「決め手1つ+補強1つ」。
- `key: true` は「大事な調査」。ポイントが0でも実行できる。key だけで解けるように作ること。
- 出力の組み立て: `PB.fmt.ipconfig / ipconfigAll / ping / arpa`(Windows)、`ibrief / vlanBrief / ifStatus / macTable / cfg`(Cisco)。
- 確認: `node --check` で各JSを検査。データの整合(証拠idの参照、grepの命中など)は、事件データを読み込む簡易スクリプトで確かめた。

## 未実装・今後の課題
- 試作のため、ケースは3本のみ。ケース間のつながり(会社の物語)は薄い。
- 擬似端末は「選んだコマンドの事前出力を表示」のみ。コマンドを自分で打つ、設定を実際に変える(config モード)はない。直し方も選択式。
- 現場を調べる、人に聞くは固定の会話。尋問で矛盾を突く法廷風の演出(証言の矛盾を見つける)は未実装。
- 立ち絵は `Q.drawPerson` の1種類のみ(表情なし)。BGMは本体の曲の流用。
- Windows の出力は英語版の形式(日本語版Windowsは項目名が日本語になる)。
- 製品版にするとき: 事件数を増やす(OSPF、ACL、NAT、STP などの show 出力)、出力の事実確認(実機またはCisco公式資料との突き合わせ)、復習(間隔反復)との連携、本体 `screens.js` のメニューからの導線、`sw.js` のキャッシュ登録、スコアの見直し(ヒントの扱い)、シナリオの校正。
- `ip dhcp excluded-address` などルーターのDHCP設定は、CCNA v1.1 の範囲よりやや細かい内容を含む(復習の主眼は IP重複の見つけ方)。

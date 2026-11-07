# 2 本目のアプリ（『すくう』）引き継ぎメモ

最終更新：2026-11-08（Claude Code、ios-apps）— 第15回（批評 r14＝74 点への対応）済み・批評 r15 待ち。いちばん上の「第15回」の節、その下の「引き継ぎ（第14回後）」を読む。

## ★★★★★★★★★★★★★★★ 第15回（批評 r14＝74 点への対応、自動ループ 再開 4/40）（いちばん新しい）
- 批評 r14 の 3 つ：①大陸の構図（焦点がない・まばら・枠の外に島）②+数字が大きくポイ・惑星に重なる ③宇宙がごちゃごちゃ
- 入れたもの（commit 1666448、main、push なし、index `game.js?v=15`、VERSION 13 のまま。詳細 `proto/sukuu-html5/NOTES.md`「第15回」）：大陸は真ん中へ・島は大陸を囲む輪へ寄る（`landCenter()`）、大陸の絵 1.25 倍、小島 9→7。瓶へ飛ぶ獲物は後半薄く。+数字 84〜140px→50〜58px（≤64px）、候補 16 か所・ポイと丸い獲物を避ける。宇宙の背景の彩度 6 割減＋暗く、キンちゃんのまわりを暗く（光を当てる）、銀河 16→10・星雲 3→2
- 数字（`tmp/r15/f/`、人の速さ seed3）：各段 36.2/50.7/62.7/60.9 秒・宇宙 70.3 秒、エラー 0、絵の失敗 0、10 匹以上の破れ 0。+数字が主かポイに入った回 205 回中 1、魚に入った回 13（r14 は 72）
- 前提なしの haiku 2 回（`tmp/r15/f/stages5.png`）：池 5/7・海 6/7・大陸 6/7・星 7/7・宇宙 6/6。大陸は「焦点がある」になった。宇宙は「黒い穴・星雲・キンちゃんが競う」が残る（未達）
- 確認 `tmp/r11/q_report.txt`：人の速さ seed1〜3＝各段 ≤62.7 秒・宇宙 69.7〜71.2 秒（出来事 ≥4）・10 匹以上の破れ 0・エラー 0・overlay_max 1 ○。初心者 hand 2 回＝すくえない最長 14.4／16.7 秒 ○、買い物の間 28.3／28.0 秒 ○、海 132／127 秒 ○、稼ぎの谷 ×（2 回目の 60〜90 秒が 0.86 倍、1 回目は伸び 1.11 倍）
- 次：批評 r15 を待つ。候補＝宇宙の黒い穴の輪を小さく・暗く、池の +数字を魚から外す、初心者の 30〜60 秒の谷
- 消してよい（自分では消していない）：`tmp/r15/a`〜`e`

## ★★★★★★★★★★★★★★ 引き継ぎ（第14回後。いちばん新しい。下の節より優先）

### ① 課題
- 本人：「プロダクトレベルにしてから出せ」（iPhone で 5 分飽きない／強化が遊び方を変える／池→海→大陸→星→宇宙で「すくう＝救う」）。
- 批評役「金魚すくい批評」との自動ループ（再開後 3/40 往復済み、合格 85 点まで本人に出さない）。批評が届くたびにその 3 つを直し、日本語で「やったこと／結果／本人に必要な判断」を報告。直近は r13＝74 点（第14回で対応済み、r14 の採点待ち）。

### ② 今の状態
- ブランチ main、最新 commit 7e89f07（コードは 9d96948、push なし）。未 commit は他セッションの `docs/STATUS.md`・`rec/manual.json`・`rec/upg_r7.json`・`rec/fps.json`、それと `tmp/` の作業物だけ（commit に含めない。`git commit -a` 禁止）。
- 第14回で入れたもの（index `game.js?v=14`、`VERSION` は 13 のまま＝セーブが残る。詳細 `proto/sukuu-html5/NOTES.md`「第14回」、下の節）：縮めた絵 `assets/s/`（`tools/proto/sukuu_shrink_sprites.py` で作る、3.3MB）＋読み直し＋`ev('art_ready'/'art_fail')`＋`window.__artReady()`、道具（`sukuu_check.py`・`record_sukuu.py`・批評役の `tmp/critic/play2.py`・`hand.py`）は絵を最大 10 秒待つ。主に重なる紙を 0.45 倍に薄く。しぶき 6 割・星と宇宙は星くず（`DUST_COLS`）。+数字は `totalPos`（10 か所から獲物の少ない所、`ev('total_pos',{hits})`）。小島・火山の縁を透かす `featherEdge`、島の下は浅瀬の光、小島 1.38・火山 1.2 倍の絵。海と大陸に `drawSeaLight`
- 数字・見た目は下の「第14回」の節。未達：前提なしの大陸 6／6（「似た小島が多く焦点がない」）、星 6（+1.4M が惑星に重なる）、初心者 hand 2 回目の 60〜90 秒の稼ぎ 0.92 倍と 10 匹以上の破れ 2
- 批評役のメモ `tmp/critic/STATUS.md` の先頭に「r13 の宇宙は絵が読めていない回だった・art_ready で確かめられる」と書き足し済み
- Notion 台帳（行「2 本目のアプリ（企画）」page 4110e8c7da4d81f884aeeb19ccac4310）は第14回で更新済み（進行中、要対応 OFF、次回確認日 2026-11-09）
- 道具（下の第13回後の節と同じ。追加分）：批評役と同じ撮り方＝http サーバー 8765（`curl http://127.0.0.1:8765/game.js` で確認）→ `cd tmp/critic && python play2.py ../r14/<名前> 420 "human=1&seed=3" 10` → `python sheet.py ../r14/<名前> ../r14/<名前>/stages5.png "20,70,130,190,260" 5` → 前提なしの haiku に 2 回採点。長い確認は `Start-Process ... run_hand2.sh <tag>`（使った tag：n、o、p）

### ③ 次の一手
1. 批評役の r14 の採点が届いたら、その 3 つを直す（NOTES.md に第15回、commit、このメモと台帳を更新、報告）。
2. 届くまでの候補：大陸の焦点（大陸の主を目立たせる・小島の並びを散らす）、星の +数字が惑星にかかる、初心者の 60〜90 秒の谷。
3. 合格後：予告動画を作り直す（`record_sukuu.py` の auto_segments を boss_catch／world／earth_reveal に対応）→ 秘書 v2 経由で本人へ。
4. 秘書側の作業待ち：iPhone の `/api/proto/sukuu/` が assets（png・jpg）を返さない（`assets/s/` も含めて許してもらう必要あり）。

### ④ 完了の条件
- 批評役が 85 点以上で合格。
- 初心者 hand 2 回（`run_hand2.sh`）：すくえない最長 ≤20 秒、買い物の間 ≤30 秒、30 秒ごとの稼ぎが下がらない（池の主の直後の区間は別扱いと明記）、海 ≤150 秒。
- 人の速さ seed1〜3：1 周目の各段 ≤70 秒、宇宙 60〜90 秒で中に新しい出来事 ≥3、10 匹以上の破れ ≤3／周、エラー 0、overlay_max ≤1。
- 前提なしの haiku が 5 段の一覧を 2 回とも全段 ≥7（今は大陸・星・宇宙が 6）。events.json に `art_ready` failed 0。+数字に主が入る回 0（済み）。
- iPhone 実機で `/api/proto/sukuu/` が開けて絵も出る（本人か秘書の確認）。

## ★★★★★★★★★★★★★ 第14回（批評 r13＝74 点への対応、自動ループ 再開 3/40）作業メモ（済み。上の節が新しい）
- 批評 r13 の 3 つ：①宇宙で泳ぐキンちゃんが淡い黄色の塊・ポイに隠れる ②大陸の島が丸いシール・海の暗い所が空 ③白い泡と +数字の重なり
- 原因①：絵の読み込み失敗（批評役の回だけキンちゃんがコードの代わりの絵。絵 1 枚 2MB・計 24.6MB）
- 入れたもの（commit 9d96948、main、push なし、index `game.js?v=14`、VERSION 13 のまま＝セーブは残る。詳細 `proto/sukuu-html5/NOTES.md`「第14回」）：縮めた絵 `assets/s/`（3.3MB）＋読み直し＋`art_ready`/`art_fail`＋道具が絵を待つ、主に重なる紙を薄く、しぶき 6 割・星と宇宙は星くず、+数字は獲物の少ない所（10 か所から）、小島の縁を透かし絵を 3 割大きく、海と大陸に光の筋と粒
- 数字：人の速さ seed3 各段 36/51/67/58/76 秒・エラー 0。+数字に主が入る回 0（前は 3〜6）。前提なしの haiku 2 回：海 7/7、大陸 6/6（未達、弱点「似た小島が多く焦点がない」）、宇宙 6〜7（「goldfish」と答えた）、星 6（+1.4M が惑星に重なる）、池 7
- 初心者 hand の確認（`tmp/r11/p_report.txt`）：すくえない最長 10.2／16.7 秒 ○、買い物の間 21.2／25.7 秒 ○、海 138.7／125.5 秒 ○、30 秒ごとの稼ぎ 53→110→135→400 ○／53→111→102→538 ×（2 回目の 60〜90 秒だけ 0.92 倍、10 匹以上の破れ 2 回）。人の速さ seed1〜3＝各段 ≤66.6 秒、宇宙 61.6〜66.2 秒（出来事 ≥5）、10 匹以上の破れ 0、エラー 0、overlay_max 1。速い bot 各段 22.9〜52.5 秒
- 次：批評 r14 を待つ。待つ間の候補＝大陸の焦点（大陸の主を目立たせる、小島の種類の偏り）、星の +数字
- 消してよい（自分では消していない）：`tmp/r14/`（`notes14.md` は空の書きかけ）、`proto/sukuu-html5/rec/tmp/r14/`、`assets/` 直下の大きい絵 22 枚は `assets/s/` が読めないときの予備なので残す

## ★★★★★★★★★★★★ 引き継ぎ（第13回後。いちばん新しい。下の節より優先）

### ① 課題
- 本人：「プロダクトレベルにしてから出せ」（iPhone で 5 分飽きない／強化が遊び方を変える／池→海→大陸→星→宇宙で「すくう＝救う」）。
- 批評役「金魚すくい批評」との自動ループ（再開後 2/40 往復済み、合格 85 点まで本人に出さない）。批評が届くたびに直して、日本語で「やったこと／結果／本人に必要な判断」を報告。直近は r12＝73 点（第13回で対応済み、r13 の採点待ち）。

### ② 今の状態
- ブランチ main、最新 commit 2bebf74（push なし）。未 commit は他セッションの `docs/STATUS.md`・`rec/manual.json`・`rec/upg_r7.json`・`rec/fps.json` だけ（commit に含めない。`git commit -a` 禁止）。
- 第13回で入れたもの（VERSION 13、index `game.js?v=13`。詳細 `proto/sukuu-html5/NOTES.md`「第13回」）：
  - ポイの紙を半透明の濡れ紙に（`paperStyle` 0.4、濡れると 0.22、`drawPaper` につや）
  - gpt-image の絵 9 枚（プロンプト `assets/prompts/`）：`demekin_body`・`demekin_red_body`（体＋目）、`sp_koi`・`sp_bigkoi`（`drawKoiArt`、後ろ 35% を揺らす）、`kin_tail`（`tailArt` で色ごとに染める、`finTail` の art 引数）、`isl_small4/5`（小島 4 種、少し傾ける）
  - 池の金魚・出目金は絵だけ 1.12 倍、池の水面に提灯の映り 5 つと縁の暗がり（`renderScene`）
  - キンちゃん大写し `drawKinClose` のまわりを濃い夜空（中心 0.96）で覆う → 魚にかかる粒 0
  - 初心者：`G.slow`（池を 90 秒以上かけた人は海から先も `buyAssist`）、`buyHelp`（最後の買い物から 20 秒でどのボタンも手持ちで買える、`BUY_HELP_T`）
- 数字（`tmp/r11/o_report.txt`）：初心者 hand 2 回＝すくえない最長 18.1／14.1 秒、買い物の間 27.5／21.4 秒、海 119／123 秒、10 匹以上の破れ 0、稼ぎ 54→59→126→7967→1565（最後は池の主の次の区間で海）／43→72→123→386→13560。人の速さ seed1〜3＝各段 ≤66.6 秒、宇宙 61.6〜66.2 秒（出来事 5）、エラー 0、overlay_max 1。速い bot 各段 22.9〜52.5 秒。1 コマ中央 1.1ms／95% 2.1ms
- 見た目：前提なしの haiku（`proto/sukuu-html5/rec/tmp/r13/s3/`）＝池 6／海 7／大陸 7／星 7／宇宙 7／大写し 8／すくった瞬間 6。ポイの中は見える。池の弱点＝空のポイが平たい赤い輪に見える・+数字が魚に重なる。すくった瞬間の一覧 `rec/tmp/r13/scoop4.png`
- Notion 台帳（行「2 本目のアプリ（企画）」page 4110e8c7da4d81f884aeeb19ccac4310）は第13回で更新済み（進行中、要対応 OFF、次回確認日 2026-11-09）
- 道具：
  - 長い確認：PowerShell `Start-Process -FilePath 'C:\Program Files\Git\bin\bash.exe' -ArgumentList 'tmp/r11/run_hand2.sh','<tag>' -WorkingDirectory C:\Users\yuton\workspace\ios-apps -WindowStyle Hidden` → `tmp/r11/<tag>_report.txt` の最後に DONE（約 9 分、回している間は重い処理を重ねない）。使った tag：n、o
  - スクショ：`python tools/proto/sukuu_check.py shots --human --seed 1 --at 20,70,130,190,250,270.2 --dir tmp/r13/<名前>`（dir は rec/ からの相対）→ `python tmp/r9/sheet.py out.png a.png ...`。すくう瞬間は sim json（list）の `scoop` の t の直前・直後
  - 処理時間：`python tools/proto/record_sukuu.py fps --seconds 25 --extra "&bot=1&human=1"`（bench は file:// の絵で canvas が汚れて使えない）
  - 絵：`node tools/proto/imggen_asset.mjs <out.png> <size> <prompt.txt> transparent`（1 枚数円、tmp/r13 に作って見てから assets へ、魚は透明の外を切る）
  - 採点：前提なしの haiku サブエージェントに画像パスだけ渡して 1〜10 点
- 消してよい（自分では消していない）：`tmp/critic/r11hand_n1`・`n2`、`proto/sukuu-html5/rec/r11_n_*.json`、`tmp/r11/n_*`・`hand_n*.log`、`rec/tmp/r13/s1`・`s2`、`tmp/r13/game_r12.js`、および下の節に書いた分

### ③ 次の一手
1. 批評役の r13 の採点が届いたら、その 3 つを直す（NOTES.md に第14回、commit、このメモと台帳を更新、報告）。
2. 届くまでの候補：池の見た目を 7 以上に（空のポイの見え方、+数字を魚に重ねない位置）、星の暗い惑星。
3. 合格後：予告動画を作り直す（`record_sukuu.py` の auto_segments を boss_catch／world／earth_reveal に対応）→ 秘書 v2 経由で本人へ。
4. 秘書側の作業待ち：iPhone の `/api/proto/sukuu/` が assets（png・jpg）を返さない。

### ④ 完了の条件
- 批評役が 85 点以上で合格。
- 初心者 hand 2 回（`run_hand2.sh`）：すくえない最長 ≤20 秒、買い物の間 ≤30 秒、30 秒ごとの稼ぎが下がらない（池の主の直後の区間は別扱いと明記）、海 ≤150 秒。
- 人の速さ seed1〜3：1 周目の各段 ≤70 秒、宇宙 60〜90 秒で中に新しい出来事 ≥3、10 匹以上の破れ ≤3／周、エラー 0、overlay_max ≤1。
- 前提なしのエージェントが 5 段の一覧を全段 ≥7 と採点（今は池だけ 6）。ポイの中が見える（済み）。大写しの魚にかかる粒 ≤10%（済み、0）。
- iPhone 実機で `/api/proto/sukuu/` が開けて絵も出る（本人か秘書の確認）。

## ★★★★★★★★★★★ 第13回（批評 r12＝73 点への対応、自動ループ 再開 2/40）作業メモ（済み。上の節が新しい。詳細 proto/sukuu-html5/NOTES.md「第13回」）
- 批評 r12 の 3 つ：①ポイの紙が不透明な白い板 ②池の魚の絵（黒い出目金がコード、小さく平板）・大陸の小島が同じ絵 ③キンちゃん大写しに白い泡がかぶる・尾が橙一色（＋初心者の買い物の間 ≤30 秒を保つ。r12 の批評役の計測は 31.2 秒）
- 入れたもの（VERSION 13、index `game.js?v=13`、commit e9d037d ほか）：紙を半透明の濡れ紙に（`paperStyle` 0.95→0.4）、出目金 2 色・鯉・池の主・尾びれ・小島 2 種を gpt-image の絵に、池の金魚の絵 1.12 倍、大写しのまわりを濃い夜空で覆う、池の水面に提灯の映りと縁の暗がり
- 足したもの：初心者の買い物（`G.slow`＝池を 90 秒以上かけた人は海から先も値下げ、`buyHelp`＝最後の買い物から 20 秒でどのボタンも手持ちで買える）
- **第13回は済み（main、push なし）。批評役の r13 採点待ち。** 数字 `tmp/r11/o_report.txt`：初心者 hand＝すくえない最長 18.1／14.1 秒、買い物の間 27.5／21.4 秒、海 119／123 秒、10 匹以上の破れ 0。人の速さ seed1〜3＝各段 ≤66.6 秒、宇宙 61.6〜66.2 秒、エラー 0、overlay_max 1。1 コマ中央 1.1ms
- 前提なしの haiku（`rec/tmp/r13/s3/`）＝池 6／海 7／大陸 7／星 7／宇宙 7／大写し 8。ポイの中は見える。大写しの魚にかかる粒 0（`tmp/r13/kin_close_crop.png`）。未達：池だけ 6（空の網が平たい赤い輪・+数字が魚に重なる）
- 次：批評 r13 を待つ。待つ間の候補＝池の見た目（空の網・+数字の位置）、星の暗い惑星

## ★★★★★★★★★★ 引き継ぎ（第12回後。下の節より優先）

### ① 課題
- 本人：「プロダクトレベルにしてから出せ」（iPhone で 5 分飽きない／強化が遊び方を変える／池→海→大陸→星→宇宙で「すくう＝救う」）。
- 批評役「金魚すくい批評」との自動ループ（再開後 1/40 往復済み、合格 85 点まで本人に出さない）。批評が届くたびに直して、日本語で「やったこと／結果／本人に必要な判断」を報告。直近は r11＝74 点（つかみ 7・強化 7・流れ 8・手ざわり 7・見た目 7・SNS 7・5 分 8）。

### ② 今の状態
- ブランチ main、最新 commit 45375b4（push なし）。未 commit は他セッションの `docs/STATUS.md`・`rec/manual.json`・`rec/upg_r7.json` だけ（commit に含めない。`git commit -a` 禁止）。
- 第12回で入れたもの（VERSION 12、index `game.js?v=12`、詳細は `proto/sukuu-html5/NOTES.md`「第12回」と下の節）：
  - 絵（gpt-image、`tools/proto/imggen_asset.mjs`、プロンプト `assets/prompts/`）：`sp_whale`・`isl_small2/3`（小屋・灯台、小島はこの 2 種だけ）・`kin_body`・`kingyo_body`・`sp_tai`・`sp_kame`。体だけ絵で尾はコード（`bodyArt`・`finTail` にすじ）、読み込み時に縮める（`shrinkImage`・`SPRITE_MAX`）
  - キンちゃん：輪の中の魚 r×0.68、捕った瞬間の大写し `drawKinClose`（宇宙だけ clear 2.4 秒 `clearLen()`）
  - 初心者：2 倍を 25 すくいでなだらかに（`tail`）、`catchUp` 30 秒から +3%/秒、`buyAssist` 6 秒から 10%/秒・最低 15%、すくえない人は 170px 先まで寄せる（`slump()`）、一晩目の池は守りの間こぼれるだけ（`firstPondSoft`）、一晩目の群れはあふれるだけ、疲れた主は残る（`bossKeep`）
  - おまけ札：-0% を出さない、右端で切れないよう内側に
- 確かめた数字（`tmp/r11/m_report.txt`）：初心者 hand 2 回＝すくえない最長 12.6／15.7 秒、買い物の間 20.3／20.0 秒、海 126.0／125.7 秒、30 秒ごとの稼ぎ 75→72→162→833（1 回目の 30〜60 秒だけ 0.96 倍）／71→93→156→449。人の速さ seed1〜3＝各段 34.2〜66.6 秒、宇宙 61.6〜66.2 秒（超新星・大群・キンちゃん登場・暴れるブラックホール）、10 匹以上の破れ 0、エラー 0、overlay_max 1。速い bot＝各段 22.9〜52.5 秒。fps：1 コマの処理 中央 1.8ms
- 見た目：最終一覧 `tmp/r12/final2_sheet.png`（元 `proto/sukuu-html5/rec/tmp/r12/final2/`）。前提なしの haiku＝池 5／海 6／大陸 6／星 6／宇宙 6／大写し 6。弱点＝池の黒い出目金（コード）、小島が同じ絵の並び、ポイの中の白い塊、宇宙の渦の絵の繰り返し、おまけ札がボタンの上端に食い込む。キンちゃん大写し `tmp/r12/kin5.png`
- Notion 台帳（行「2 本目のアプリ（企画）」page 4110e8c7da4d81f884aeeb19ccac4310）は更新済み（進行中、要対応 OFF、次回確認日 2026-11-09）
- 道具：
  - 長い確認は切り離す：PowerShell `Start-Process -FilePath 'C:\Program Files\Git\bin\bash.exe' -ArgumentList 'tmp/r11/run_hand2.sh','<tag>' -WorkingDirectory C:\Users\yuton\workspace\ios-apps -WindowStyle Hidden` → `tmp/r11/<tag>_report.txt` の最後に DONE（初心者 hand 2 回→人の速さ seed1〜3＋速い bot、約 9 分）。`bash` だけだと WSL に行って動かない
  - hand は実時間なので、回している間はスクショ・sim など重い処理を重ねない
  - スクショ：`python tools/proto/sukuu_check.py shots --human --seed 1 --at 30,75,125,185,250,<キンちゃん捕獲+1> --dir tmp/r12/<名前>`（dir は rec/ からの相対）→ `python tmp/r9/sheet.py out.png a.png ...`。捕獲時刻は sim の json の `"type": "boss_catch", "world": 4`
  - 採点：前提なしの haiku サブエージェントに画像パスだけ渡して 1〜10 点
- 消してよい（自分では消していない）：`tmp/critic/r11hand_e`〜`r11hand_l2`、`proto/sukuu-html5/rec/r11_e_*`〜`r11_l_*.json`、`rec/tmp/r12/stages`〜`stages5`・`pond6`、`tmp/r11/e_*`〜`l_*` の txt

### ③ 次の一手
1. 批評役の r12 の採点が届いたら、その 3 つを直す（NOTES.md に第13回、commit、このメモと台帳を更新、報告）。
2. 届くまでの候補：見た目の残り（出目金の体を絵に、小島の種類を増やす、ポイの中の獲物が読めるように、宇宙の渦の絵に変化、おまけ札の位置）→ 撮り直し → 前提なしの採点。
3. 合格後：予告動画を作り直す（`record_sukuu.py` の auto_segments を boss_catch／world／earth_reveal に対応）→ 秘書 v2 経由で本人へ。
4. 秘書側の作業待ち：iPhone の `/api/proto/sukuu/` が assets（png・jpg）を返さない。

### ④ 完了の条件
- 批評役が 85 点以上で合格。
- 初心者 hand 2 回（`hand_check.py`）：すくえない最長 ≤20 秒、買い物の間 ≤30 秒、30 秒ごとの稼ぎが下がらない、海 ≤150 秒。
- 人の速さ seed1〜3：1 周目の各段 ≤70 秒、宇宙 60〜90 秒で中に新しい出来事 ≥3、10 匹以上の破れ ≤3／周、エラー 0、overlay_max ≤1。
- 前提なしのエージェントが 5 段の一覧を全段 ≥7 と採点。キンちゃんを捕る瞬間に魚が画面幅 25% 以上で 1.5 秒以上（達成済み、`tmp/r12/kin5.png`）。
- iPhone 実機で `/api/proto/sukuu/` が開けて絵も出る（本人か秘書の確認）。

## ★★★★★★★★★ 第12回（批評 r11＝74 点への対応）作業メモ（済み。上の節が新しい。詳細 proto/sukuu-html5/NOTES.md「第12回」）
- 批評 r11（自動ループ 再開 1/40）：①大陸の島・海の鯨の絵（前提なしの採点で全段 ≥7）②キンちゃんの魚が幅 10%（捕る瞬間に 25% 以上を 1.5 秒以上）③初心者の 30〜90 秒の谷（すくえない ≤20 秒・買い物の間 ≤30 秒・稼ぎが下がらない・海 ≤150 秒）
- 入れたもの（VERSION 12、index `game.js?v=12`）：鯨の絵 `assets/sp_whale.png`、小島 2 種 `isl_small2/3.png`（小屋・灯台）と島を絵だけ大きく＋影、キンちゃんの魚 r×0.68、捕った瞬間の大写し `drawKinClose`（2.4 秒、宇宙だけ `clearLen()`）、2 倍の切れ方を 25 すくいでなだらかに（`tail`）、すくえない人には 170px 先まで寄せる、`buyAssist` 12 秒から 1 秒 6%・最低 15%
- 後から足したもの：一晩目の池は守りの間 重すぎても こぼれるだけ・一晩目の群れは あふれるだけ・疲れた主は残る（`bossKeep`）、キンちゃん・金魚・鯛・亀の体を絵に（`kin_body`・`kingyo_body`・`sp_tai`・`sp_kame`）、尾びれにすじ、絵は読み込み時に縮める、`catchUp` 30 秒から、`buyAssist` 6 秒から 1 秒 10%
- **第12回は済み（main、push なし）。批評役の r12 採点待ち。** 数字（`tmp/r11/m_report.txt`）：初心者 hand 2 回＝すくえない最長 12.6／15.7 秒 ○・買い物の間 20.3／20.0 秒 ○・海 126 秒 ○・稼ぎは 1 回目の 30〜60 秒だけ 75→72（0.96 倍）。人の速さ seed1〜3＝各段 ≤66.6 秒・宇宙 61.6〜66.2 秒・10 匹以上の破れ 0・エラー 0。キンちゃんの大写し＝魚が画面幅の約 4 割で約 2 秒（`tmp/r12/kin5.png`）。前提なしの採点（`tmp/r12/final2_sheet.png`）＝5/6/6/6/6/6（全段 7 は未達）
- 長い確認は `Start-Process -FilePath 'C:\Program Files\Git\bin\bash.exe' -ArgumentList 'tmp/r11/run_hand2.sh','<tag>'`（`bash` だけだと WSL に行って動かない）→ `tmp/r11/<tag>_report.txt`
- 次：批評 r12 を待つ。見た目の残り＝池の黒い出目金（コード）、小島の同じ絵の並び、ポイの中の白い塊、宇宙の渦の絵の繰り返し
- 消してよい（自分では消していない）：`tmp/critic/r11hand_e`〜`r11hand_l2`、`proto/sukuu-html5/rec/r11_e_*`〜`r11_l_*.json`、`rec/tmp/r12/stages`〜`stages5`・`pond6`、`tmp/r11/e_*`〜`l_*` の txt

## ★★★★★★★★ 引き継ぎ（第11回の途中。下の節より優先）

### ① 課題
- 本人：「プロダクトレベルにしてから出せ」（iPhone で 5 分飽きない／強化が遊び方を変える／池→海→大陸→星→宇宙で「すくう＝救う」）。批評役「金魚すくい批評」との自動ループ（合格 85 点、5 時間枠が戻って再開した分は 0/40 から数え直し）。今は批評 r10（71 点）の 3 つを直している：
  1. 初心者が池で止まる（基準：`hand.py 180 12` で すくえない最長 ≤20 秒、買い物の間隔 ≤30 秒、後半 3 区間の稼ぎが前の 1.2 倍以上、180 秒までに池の主か海）
  2. 宇宙の山場（宇宙の段 60〜90 秒・中に新しい出来事 ≥3、キンちゃんが画面幅 30% 以上）と大陸の絵（前提なしのエージェントの採点で 5 段とも ≥7）
  3. 一度に大量に失う破れ（10 匹以上の破れ ≤3 回/周、限界が近いとき破れる前に見える合図）

### ② 今の状態
- ブランチ main（push なし）。最新 commit 60a84ea。**未 commit：`proto/sukuu-html5/game.js`（buyAssist：一晩目の池で最後の買い物から 15 秒たつと 1 秒 4% 値下げ、最低 3 割。`G.lastBuyT`）、`docs/second-app/STATUS.md`、`tmp/r11/run_check.sh`（新規）**。commit しようとしたら権限確認が途切れた（Stream closed）。まず `node --check` → commit（`git commit -a` は使わない。`docs/STATUS.md`・`rec/manual.json`・`rec/upg_r7.json` は含めない）
- 第11回で入れたもの（VERSION 11、index.html `game.js?v=11`、NOTES.md「第11回」に記載済み）：slump 守り、疲れた池の主（`tiredOf`/`wOf`、95 秒から 40 秒で 17→3.4）、catchUp 上限なし（+4%/秒）、一晩目の池の買い物 1 回目 9・2 回目は Lv0 なら 20（`FIRST_FIXED`、`G.pondBuys` をセーブ）、群れのあふれ（`SPILL_MAX` 1.8、「あふれた！ -N」）、限界 75% からのきしみ（`poi.strain`：震え・黄→赤の輪・ひび）、空振りの言葉を 8 秒おきに、宇宙の `COSMOS`（超新星 12 秒／キンちゃん 34 秒で登場＋「キンちゃんが 来た！」／ブラックホールが 48 秒から 10 秒暴れる）、キンちゃんの輪 r×0.74（直径 222px＝31%）、島 4 種と惑星・太陽・銀河・星雲の gpt-image 絵（`assets/isl_*.png`・`sp_*.png`、プロンプト `assets/prompts/`、一覧 `tmp/r11/art_sheet.png`）、`WORLD_PRICE=[3.3, 2.7, 1.8, 3.0, 6.5]`
- 確かめた数字（buyAssist の前）：
  - 人の速さ seed 1〜3（`tmp/r11/d_h*.txt`）：各段 ≤67.4 秒、宇宙 60.0〜65.6 秒（超新星・大群・キンちゃん登場・ブラックホールが中に）、10 匹以上の破れ 0〜2、エラー 0、overlay_max 1、最後の段 225〜245 秒。速い bot `d_f1`：10 匹以上の破れ 1（焦げ）
  - 初心者 `tmp/critic/r11hand6`：すくえない最長 16.1 秒 ○、稼ぎの伸び 1.34/1.64/1.49 ○、池の主 131 秒・海 133 秒 ○、**買い物の間隔 49.9 秒 ×**（23→73 秒）→ buyAssist を足した（未確認）
- 秘書の再起動で長い処理が何度も切れる。長い確認は Start-Process で切り離す（下の③）
- 消してよい（自分では消していない）：`tmp/critic/r10hand_c`、`tmp/critic/r11hand1`〜`r11hand5`、`tmp/r11/a_*`・`b_*`・`c_*`、`proto/sukuu-html5/rec/r11_a_*`〜`r11_c_*.json`

### ③ 次の一手
1. 未 commit 分を commit
2. 切り離して確認：PowerShell で `Start-Process -FilePath bash -ArgumentList 'tmp/r11/run_check.sh','e' -WorkingDirectory C:\Users\yuton\workspace\ios-apps -WindowStyle Hidden` → `tmp/r11/e_report.txt` の最後に DONE が出たら読む（人の速さ 1〜3・速い bot・初心者 hand をまとめて出す）。池が 50 秒未満に縮んだら buyAssist の 15 秒を延ばす
3. 見た目：`sukuu_check.py shots --human --seed 1 --at 40,100,165,225,290 --dir tmp/r11/stages`（dir は rec/ からの相対）で 5 段＋キンちゃん登場を撮り、`tmp/r9/sheet.py` で一覧 → 前提なしの haiku サブエージェントに採点させる（全段 ≥7 を目指す）。きしみの合図のスクショも 1 枚
4. NOTES.md「第11回」に確かめた数字、このメモ、Notion 台帳（行「2 本目のアプリ（企画）」page 4110e8c7da4d81f884aeeb19ccac4310）を更新して報告（やったこと／結果／本人に必要な判断：iPhone の `/api/proto/sukuu/` が assets を返すよう秘書側に頼むか、`tmp/critic/r10hand_c` は消してよい）

### ④ 完了の条件
- 初心者 `hand_check.py`：4 項目とも ok=True（実時間でぶれるので 2 回）
- 人の速さ seed 1〜3：1 周目の各段 ≤70 秒（宇宙は 60〜90 秒）、宇宙の中に新しい出来事 ≥3、10 匹以上の破れ ≤3、エラー 0、overlay_max ≤1
- 5 段の一覧を前提なしのエージェントが全段 ≥7 と採点、キンちゃんが画面幅 30% 以上に写ったスクショがある
- 批評役が 85 点以上で合格

## ★★★★★★★ 第11回（批評 r10＝71 点への対応）途中メモ（上の節が新しい。詳細は proto/sukuu-html5/NOTES.md「第11回」）
- 済み（main、push なし。commit 219f1ec→…→最新）：VERSION 11。slump 守り・疲れた池の主（`tiredOf`/`wOf`）・catchUp 上限なし・2 回目の買い物（Lv0 なら 20）・群れのあふれ（`SPILL_MAX` 1.8）・限界 75% からのきしみ（`poi.strain`）・宇宙の山場（`COSMOS`：超新星 12 秒／キンちゃん 34 秒／暴れるブラックホール 48 秒）・キンちゃんの輪 r×0.74・島と宇宙の獲物の絵（`assets/isl_*`・`sp_*`）。`WORLD_PRICE=[3.3, 2.7, 1.8, 3.0, 6.5]`
- 数字（`tmp/r11/d_h*.txt`・`python tmp/r11/loss.py proto/sukuu-html5/rec/r11_d_*.json`）：人の速さ seed 1〜3 の各段 ≤67.4 秒、宇宙 60.0〜65.6 秒（中に超新星・大群・キンちゃん登場・ブラックホール）、10 匹以上の破れ 0〜2、エラー 0、overlay_max 1。最後の段 225〜245 秒（seed 3 は 240 未満）
- 初心者（`tmp/critic/r11hand4`、2 回目の値下げ前）：すくえない最長 16.1 秒・池の主 123 秒・海 125 秒。買い物の間隔 34 秒だけ未達 → 2 回目の値下げを入れて r11hand6 を取り直し中（再起動で止まらないよう Start-Process で切り離して実行。`python tmp/r11/hand_check.py tmp/critic/r11hand6`）
- 残り：hand の確認、5 段のスクショ一覧と前提なしの採点（全段 ≥7）、きしみの合図のスクショ、STATUS・台帳更新、報告

## ★★★★★★ 引き継ぎ（第10回後。下の節より優先。詳細と数字は proto/sukuu-html5/NOTES.md「第10回」）

### ① 課題
- 本人：「プロダクトレベルにしてから出せ」。iPhone で 5 分遊んで飽きない／どの強化も遊び方を変える／池→海→大陸→星→宇宙で「すくう＝救う」が見えていく。
- 批評役との自動ループ（最大 40 往復、5/40 まで済み）。批評が届くたびに直し、日本語で「やったこと／結果／本人に必要な判断」を報告。合格（85 点）まで本人に出さない。
- 秘書の追加指示（2026-11-08）：①段階ごとに、数字の大きさに合わせて画面がどう変わるかを各段 1 枚のスクショで残す ②UI は frontend-design スキル（`C:\Users\yuton\workspace\ai-secretary\tmp\ui-model-eval\frontend-design-SKILL.md`）と「作る→撮る→比べる→直す」で、gpt-image の絵（`ai-secretary/tmp/ui-model-eval/topics/compare-sukuu.png` の 8 番：夜祭りの提灯・深い青の水面・金の立体ボタン）を目指す。急ぎではない。

### ② 今の状態
- 済み：第10回（main、push なし。commit 0e3336e→2b4909f→ef9aa03→af7cdb9→…→76ff4a4）。VERSION 10、index.html は `game.js?v=10`。
  - 見た目：`drawShopPlate`・`PLATE`（金の立体ボタン）、`frame()` に縁のつや、`artWater()` と `assets/sea_water.jpg`・`land_water.jpg`・`sky_space.jpg`・`cosmos.jpg`（プロンプトは `assets/prompts/`、道具 `tools/proto/imggen_asset.mjs`）。各段 1 枚：直す前 `tmp/r10_stages_before_sheet.png`、後 `tmp/r10_stages_d_sheet.png`（数字は同じ＝遊びは不変）。ボタン 3 状態 `tmp/r10/btn_c/stack.png`（`tmp/r10/btn_states.py`）。
  - 初心者：`ease()`（一晩目の池 60〜170 秒で 1→0：濡れ方・重すぎの許し 1+1.5×ease 倍・1 匹で持てない魚はこぼれるだけ・軽い金魚を寄せる）、`catchUp`（一晩目の池 50〜130 秒で値段 1→3 倍）、最初の 12 すくいは 2 倍、重さで破れたら「ビリッ！ 重すぎ」＋厚さボタンが 4 秒光る（`G.thickHint`）。
  - お守り：`PERKS`（厚紙・大枠・風・鈴・福袋）、宇宙の後に 3 枚から選ぶ（`drawPerkCards`、`rec/tmp/r10/perk/t0192.6.png`）、セーブに残る。`ngPrice()`＝×(1+0.7×ng)、宇宙は ×3 の重み。`WORLD_PRICE=[3.3, 2.3, 1.8, 2.6, 3.3]`。
  - 数字：初心者 `tmp/critic/r10hand5`＝61〜120 秒の破れ 3・10 秒最大 2・稼ぎ 108→144、海には着かない／人の速さ seed 1〜3 `tmp/r10/t*.txt`＝1 周目各段 ≤69.5 秒、最後の段 242.7／250.8／237.2 秒、エラー 0、overlay_max 1、2 周目 54〜76 秒／速い bot お守り別 `tmp/r10/v*.txt`＝2 周目各段 32〜61 秒、池の買う順がお守りで変わる。
  - Notion 台帳は更新済み（進行中、要対応 OFF、次回確認日 2026-11-09）。
- 未達・未確認：
  - 初心者が 180 秒で海に着かない（でたらめに押すと厚さ Lv4 に届かない）。hand.py は実時間なので回ごとにぶれる（r10hand3 は 176 秒で厚さ Lv4）。
  - seed 3 の最後の段 237 秒（240 に 3 秒不足）、2 周目の大陸・星が人の速さで 74〜76 秒。
  - 海〜宇宙を「池と同じ質」と前提なしのエージェントが答えるかは未確認。
  - iPhone の `/api/proto/sukuu/` は assets（png・jpg）を返さない → 秘書側の作業待ち。
  - 批評役の r10 の採点はまだ。
- 道具：`python tools/proto/sukuu_check.py sim --seconds 700 --human --seed N [--perk id] --out X.json > tmp/r10/X.txt`、`python tmp/r8/summ.py <txt>`、`python tmp/critic/hand.py <dir> 180 12`（実時間、ほかの重い処理と同時に回さない）→ `python tmp/r10/hand_check.py tmp/critic/<dir>`、`sukuu_check.py shots --at ... --dir tmp/...`（dir は rec/ からの相対）、`python tmp/r9/sheet.py out.png a.png ...`。
- 注意：秘書の再起動で長い呼び出しが何度も途切れる。長い処理の前に commit。`docs/STATUS.md`・`rec/manual.json`・`rec/upg_r7.json` はほかの変更なので commit に含めない（`git commit -a` を使わない）。ファイルの書き換えは Edit/Write で（sed 禁止）。
- 消してよい（自分では消していない）：`tmp/critic/r10hand1`〜`r10hand4`、`tmp/r10/` の f_・g・h・k・m・n・p・q・r・s・u の txt、リポジトリ直下の `tmp_r10_*.json`（sim の --out が直下に出た）、`rec/tmp/r10/stages_a`〜`stages_c`。

### ③ 次の一手
1. 批評役の r10 の採点が届いたら指摘を直す（NOTES.md に第11回、commit、台帳とこのメモを更新）。
2. 待つ間：魚の絵（体は gpt-image・尾はコード）とタイトル画面を目標の絵に寄せる。各段の 1 枚を撮り直して一覧を残す。
3. 段の長さの確認は人の速さ seed 1〜3（できれば 1〜6）と速い bot のお守り 5 種を並列で。
4. 合格後：予告動画を作り直す（record_sukuu.py の auto_segments を boss_catch／world／earth_reveal に対応）→ 秘書 v2 経由で本人へ。

### ④ 完了の条件
- 批評役が合格（85 点以上）を出す。
- 初心者 `hand.py <dir> 180 12`：最初の 3 回の破れ 0、61〜120 秒の破れ ≤4、どの 10 秒も ≤2、61〜120 秒の稼ぎ ≥ 最初の 60 秒、180 秒で海に着く（`hand_check.py` の worlds に 1）。
- 人の速さ seed 1〜3：1 周目各段 ≤70 秒、最後の段に 240〜360 秒、エラー 0、overlay_max ≤1。速い bot：2 周目の各段 ≥30 秒、お守りで池の買う順が変わる。
- 5 段のスクショ一覧を前提なしのエージェントに見せて「同じ質のゲーム」と答える。
- iPhone 実機で `/api/proto/sukuu/` が開けて、新しい絵も出て遊べる（本人か秘書の確認）。

## ★★★★★ 第10回（見た目＋批評 r9 への対応）作業メモ（済み。上の節が新しい）
- **済み**（詳細と数字は proto/sukuu-html5/NOTES.md「第10回」）。批評役の r10 の採点待ち。残り：初心者が 180 秒で海に着かない、seed 3 の最後の段 237 秒、2 周目の大陸・星が 70 秒を少し超える、iPhone で絵が出ない（秘書側）。
- 次の一手：r10 の採点が届いたら直す。待つ間は魚の絵（体は絵・尾はコード）とタイトル画面。
- 秘書の追加指示：①段階（池→海→大陸→星→宇宙）ごとに、数字の大きさに合わせて画面がどう変わるかを各段 1 枚のスクショで残す ②UI は frontend-design スキル（`ai-secretary/tmp/ui-model-eval/frontend-design-SKILL.md`）と「作る→撮る→比べる→直す」で、gpt-image の絵（compare-sukuu.png の 8 番）を目指す。急ぎではない（本人はモデルと見た目を選ぶ段）。
- 直す前の各段 1 枚：`proto/sukuu-html5/rec/tmp/r10/stages_before/`（`sukuu_check.py shots --human --seed 1 --at 40,100,165,232,290 --dir tmp/r10/stages_before`、dir は rec/ からの相対）。一覧 `tmp/r10_stages_before_sheet.png`。数字は 89 → 1,817 → 33.3K → 4.2M → 28.5M。
- 目標と比べて負けている点：店のボタンが紺の平たい板（目標は金の縁・クリーム色の立体ボタン）／水槽の縁が細い（目標は太い光る青の縁）／海・大陸・星・宇宙の背景がコードの絵で平たい。
- 進め方：まずボタン（全段で効く）→ 水槽の縁 → 海〜宇宙の背景（gpt-image）。
- 済み（commit 0e3336e・2b4909f）：店のボタンを金の縁の立体の板に（`drawShopPlate`・`PLATE`、買えないときは紺で下から金が満ちる）、水槽の縁につや、海・大陸・星・宇宙の背景を gpt-image で 4 枚（`assets/sea_water.jpg` ほか、`artWater()`、読めないときはコードの絵）。直した後の各段 1 枚：`rec/tmp/r10/stages_d/`、一覧 `tmp/r10_stages_d_sheet.png`。数字は直す前と同じ（遊びは変わっていない）。ボタンの 3 状態：`tmp/r10/btn_c/stack.png`（道具 `tmp/r10/btn_states.py`）。
- 批評 r9 = 71 点。直す 3 つ：①守りが切れた直後の連続の破れ（61〜120 秒の破れ ≤4、どの 10 秒でも ≤2、61〜120 秒の稼ぎ ≥ 最初の 60 秒、180 秒で海に着く）②海〜宇宙の見た目（↑で対応）③2 周目に選ぶもの（お守り 3 択、選んだもので池の買う順が変わる、2 周目の各段 ≥30 秒）。
- 途中（commit ef9aa03 以降）：①`ease()`（一晩目の池 60〜170 秒で 1→0、濡れ・値段 2 倍・重すぎの許し・寄せ）、重さで破れたら「ビリッ！ 重すぎ」＋紙の厚さが 4 秒光る（`G.thickHint`）。③`PERKS`（厚紙・大枠・風・鈴・福袋）、終わりの画面で 3 枚から選ぶ（`drawPerkCards`）、`ngPrice()`（二晩目から値段 ×(1+0.35×ng)）。`sukuu_check.py sim/shots --perk id`。VERSION 10。初心者の試験 `python tmp/r10/hand_check.py tmp/critic/<dir>`。

## ★★★★ 引き継ぎ（第9回後。いちばん新しい。下の節より優先。詳細と数字は proto/sukuu-html5/NOTES.md「第9回」）

### ① 課題
- 本人：「プロダクトレベルにしてから出せ」。iPhone で 5 分遊んで飽きない／どの強化も遊び方を変える／池→海→大陸→星→宇宙で「すくう＝救う」が見えていく。
- 批評役との自動ループ（最大 40 往復、4/40 まで済み）。批評が届くたびに直し、日本語で「やったこと／結果／本人に必要な判断」を報告。合格まで本人に出さない。
- 秘書の追加指示（2026-11-08）：見た目は gpt-image-2.6-sunburst の絵（`C:\Users\yuton\workspace\ai-secretary\tmp\ui-model-eval\topics\compare-sukuu.png` の 8 番：夜祭りの提灯・深い青の水面・立体的なボタン）を「目指す見た目」に。素材は gpt-image で作って取り込んでよい（1 枚数円）。遊びの中身の直しと同時に進める。

### ② 今の状態
- 済み：第9回（main、push なし。commit 66c416b→6403f74→a0505c2→be7ff45）。VERSION 9、index.html は `game.js?v=9`。
  - ①初心者：`grace()`（一晩目の池の最初の 3 回は破れない）、`beginner()`（最初の 12 すくい：真下の金魚は逃げず紙の上でゆっくり・濡れ半分・値段 2 倍・重すぎはこぼれるだけ）、空のポイは濡れても破れず自動で上がり「速く動かすと 紙がぬれる」、最初の買い物はどれでも 9（`firstOff`）、`drawWetGauge`、押した所にポイ。
  - ②地球：`drawMorph`（地球→地球柄の金魚→キンちゃんの色→袋）、`EARTH_LEN=6.6`、`kin_reveal`。主の泡 140 粒・水槽の上で切る、白い光は水槽だけ。
  - ③`UPF`（段ごとの [厚さ,大きさ,速乾] 値段係数、2 周目は (i+ng)%3 でずらす）、主：鯨 r195 w7／大陸 根 2.6 秒 w6／太陽 w10・熱 ×6／キンちゃん光の輪 r150 w6。bot は `botWetExp`・`botDryOK`・足りない強化を安い順に買う。2 周目の新しい生き物：竜宮の亀・浮き島・彗星（流れ星は `G.fastT` で種類ごと）・星の金魚。`WORLD_PRICE=[3.1, 2.2, 1.8, 2.6, 3.3]`。
  - 見た目：`proto/sukuu-html5/assets/` に pond_backdrop.png・pond_water.png（池の背景に使用、`buildPondArtBG`、読めないときはコードの絵）、kingyo.png（透過、未使用）。プロンプトは `assets/prompts/`。道具 `tools/proto/imggen_asset.mjs <out.png> <size> <prompt.txt> [transparent]`（モデル gpt-image-2.6-sunburst、鍵は chieri-agent の .env）。
  - 確かめた数字：初心者 `hand.py r9hand7 120 12` 最初の 3 回＝すくう×3・60 秒の破れ 0・最初の買い物 20.4 秒／人の速さ seed 1〜6 `tmp/r9/j_h*.txt` 各段 ≤70.3 秒（seed 1 の星だけ 0.3 秒超え）、最後の段 230〜262 秒、エラー 0、overlay_max 1／地球の 1 枚 `tmp/r9/earth3/e04.2.png` を前提なしのエージェントが「地球が実は金魚だった」と読んだ／主の直後 `rec/shots_r9boss/` で上の数字が見える。
  - Notion 台帳は更新済み（進行中、要対応 OFF、次回確認日 2026-11-08）。
- 途中・未確認：
  - 批評役の r9 の採点はまだ届いていない。
  - seed 4〜6 は最後の段が 240 秒より前（230〜236 秒）。速い bot は 157 秒。
  - iPhone の `/api/proto/sukuu/` は index.html と game.js しか返さない → 新しい絵は iPhone で出ない。秘書側で `assets/*.png` を許す必要あり（報告済み、秘書の返事待ち）。素材は 4.1MB の png（軽くする余地）。
  - `sukuu_check.py upg` の期待値は第9回の仕様変更で変わった（池 Lv0 は grace で破れない、大陸は 1.5 秒では根が抜けない）。
- 道具：`tmp/critic/hand.py <dir> <秒> <揺れ>`（批評役の初心者試験、実時間。ほかの重い処理と同時に回すと遅くなる）、`tmp/r9/earth_shots.py <dir> t1,t2,..`、`tmp/r9/sheet.py out.png a.png ...`、`python tools/proto/sukuu_check.py sim --seconds 900 --human --seed N --out X.json > tmp/r9/X.txt`。
- 注意：秘書の再起動で長い呼び出しが何度も途切れた。長い処理の前に commit しておく。
- 消してよい（自分では消していない）：`tmp/critic/r9base`・`r9hand`〜`r9hand6`、`tmp/r9/earth1`・`earth2`・`a_*`〜`i_*.txt`。
- ブランチ：main（最新 be7ff45、push なし）。`docs/STATUS.md` はほかのセッションの記録なので触らない。

### ③ 次の一手
1. 批評役の r9 の採点が届いたら、指摘を直す（直したら NOTES.md に第10回、commit、台帳とこのメモを更新）。
2. 並行して見た目：目標の絵（compare-sukuu.png の 8 番）と今の画面を並べ、負けている所から素材を作る。海・大陸・星・宇宙の背景と水面、立体的な店のボタン、魚（尾の動きを残すなら体だけ絵にして尾はコード、などを試す）。
3. 段の長さの確認は必ず人の速さ seed 1〜6 を並列で回す（seed ごとのばらつきが ±7 秒ある）。
4. 合格後：予告動画を作り直す（record_sukuu.py の auto_segments を boss_catch／world／earth_reveal に対応）→ 秘書 v2 経由で本人へ。

### ④ 完了の条件
- 批評役が合格を出す（点数とコメントで確認）。
- 初心者 `python tmp/critic/hand.py <dir> 120 12`：最初の 3 回の破れ 0、最初の 60 秒の破れ ≤6、最初の買い物 ≤30 秒。
- 人の速さの bot seed 1〜3（できれば 1〜6）：各段 ≤70 秒、買い物の間隔 ≤40 秒、新しいことが起きない時間 ≤45 秒、最後の段に 240〜360 秒、エラー 0、overlay_max ≤1、5 段の買う順がすべて同じではない、2 周目の各段に 1 周目にない生き物。
- 地球の場面の 1 枚を前提なしのエージェントに見せて「地球は金魚だった」と答える。主をすくった直後に上の数字が隠れる時間 ≤0.3 秒。
- 見た目：目標の絵と並べた比較画像を自分で見て、負けている点を NOTES.md に書いて直してある。
- iPhone 実機で `/api/proto/sukuu/` が開けて、新しい絵も出て遊べる（本人か秘書の確認）。

## ★★★ 第9回（批評 r8＝66 点への対応）途中メモ（済み。上の節が新しい）
- 批評の 3 点：①狙わない初心者の最初の 60 秒（`python tmp/critic/hand.py <dir> 120 12`：最初の 3 回は破れ 0・60 秒で破れ ≤6・最初の買い物 ≤30 秒）②地球＝キンちゃんを 1 枚で読めるように／主の泡が上の数字を隠さない（≤0.3 秒）③段ごとに主役の強化を変える・2 周目に各段の新しい生き物と値段の並び替え。
- 方針：①最初の 3 回は破れない（重すぎは重いものがこぼれる、濡れは自動で上がる）、空のポイは濡れても破れず自動で上がり「速く動かすと紙がぬれる」を 1 回出す、ポイの縁に濡れの輪、押した所にポイが飛ぶ、一晩目の池は最初の 12 回は真下の金魚が逃げない、最初の買い物は半額 ②地球→地球の模様の金魚に変形→キンちゃんの色に→袋へ。泡は水槽の外に出さない・白い光は水槽だけ ③UPF（段ごとの値段の係数）：池＝厚さ、海＝大きさ（鯨を大きく）、大陸＝速乾（大陸の根 3.2 秒）、星＝厚さ＋速乾、宇宙＝大きさ（キンちゃんに光の輪）。2 周目は係数を回し、各段に新しい生き物。
- 済み（game.js 未 commit）：①の全部（grace/beginner/firstOff/drawWetGauge/押した所にポイ）、泡と白い光を水槽だけに、地球の変身（drawMorph・EARTH_LEN 6.6・kin_reveal）、UPF と price。確かめ用：`tmp/r9/earth_shots.py`・`tmp/r9/sheet.py`。
- **第9回は済み（commit は下の最新、詳細と数字は proto/sukuu-html5/NOTES.md「第9回」）。批評役の r9 の採点待ち。** 秘書の指示（2026-11-08）：見た目は gpt-image-2.6-sunburst の絵（ai-secretary/tmp/ui-model-eval/topics/compare-sukuu.png の 8 番）を目指す。素材は `tools/proto/imggen_asset.mjs` で作ってよい（1 枚数円）。池の背景と水面は取り込み済み。次は海〜宇宙の背景・ボタン・魚。
- （以下は第9回の途中メモ。済み）残り：③の主の作り変え（海の鯨 r195 w7／大陸の根 2.6 秒 w6／星の太陽 w10・熱 ×6／宇宙のキンちゃん光の輪 r150 w6）と bot の買い方、2 周目の新しい生き物、VERSION 9、sim で各段 ≤70 秒に値段を合わせる、hand.py で①を確かめる。

## ★★ 引き継ぎ（第8回後。いちばん新しい。下の節より優先。詳細は proto/sukuu-html5/NOTES.md「第8回」）

### ① 課題
- 本人の指示：「プロダクトレベルにしてから出せ」。iPhone で 5 分遊んで飽きない。どの強化も遊び方を変える（数字だけ変わるのは不可）。池→海→大陸→星→宇宙と進み、「すくう＝救う」が見えていく。
- 批評役「金魚すくい批評」との自動ループ（最大 40 往復。3/40 往復目まで済み）。批評が届くたびに直し、日本語で「やったこと／結果／本人に必要な判断」を報告する。**合格するまで本人には出さない。**

### ② 今の状態
- 済み：第8回（commit `c93c71b`、main、push なし）。批評 r7（61 点）への対応。
  - 直したこと：
    - 乾いた紙に 12% の余裕（`capEff = cap×(1.12-0.6×wet)`）
    - 沈めた瞬間にポイの下にいた群れだけが入る（`f.inDip`）
    - おまけ：段に入って 40 秒を過ぎると 1 秒 2.5% 値引き、最大 6 割（`OMAKE_T`・`omake()`）。ボタンに赤い札
    - 大群：段に入って 24 秒で、金色・値段 2 倍の群れ 14 匹（`SWARM_AT`）
    - 太陽の重さ 15、キンちゃん 13、`WORLD_PRICE=[1.7, 2.4, 1.95, 2.55, 2.6]`
    - 地球の場面（`drawEarthTrans`・`EARTH_LEN=6.4`）：地球を直径 420px で 2.6 秒止め、キンちゃん（r150）と模様を並べて光らせる
    - 二晩目：`G.ng`、`ngMul()=1+0.5×ng`、池に星の金魚（`hoshikin`）とキンちゃん（`kinret`、rare）。バナーと HUD に「二晩目・ご縁×1.5」
    - 白く光るのは水槽と上の帯まで（ボタンは白くしない）。銀河を水色にした
    - bot（人の速さ）：重さの印を見てから 0.2 秒で上げる。重さで破ったら欲張りを控える（`BOTS.greedK`）
  - バージョン：`VERSION=8`、index.html は `game.js?v=8`。
  - 道具：`tools/proto/sukuu_check.py`。`loop2_new_first60`・`loop2_first_boss_after`・`earth_reveal` を足した。集計用の `tmp/r8/summ.py`（`python tmp/r8/summ.py tmp/r8/l_h*.txt`）。
  - 最終の数字（人の速さ seed 1〜3）：
    - 各段の最長 66.0／68.4／67.7 秒、最後の段に 249／247／250 秒
    - 買い物の最大間隔 ≤20.2 秒、新しいことの最大間隔 ≤21.3 秒
    - 2 周目の最初の 60 秒に新しいできごと 3 つ、エラー 0、overlay_max 1
    - 証拠：`tmp/r8/l_h1〜6.txt`・`proto/sukuu-html5/rec/r8l_h*.json`
  - 見た目の証拠：`rec/shots_r8b/t0187.4.png`（地球とキンちゃん）・`rec/shots_r8/t0050.0.png`（おまけの札）・`t0260.0.png`（宇宙）・`rec/shots_r8c/t0312.3.png`（二晩目）。
  - Notion 台帳は更新済み（進行中、要対応 OFF）。
- 途中・未確認：
  - 批評役の r8 への採点はまだ届いていない。
  - 追加で回した seed 4 は、池が 70.6 秒（0.6 秒超え）。
  - 速い bot は最後の段に 183 秒で着く（4 分より短い）。
  - 人の速さの破れが 8〜14 回に減った（第7回は 38〜49 回）。批評で「ハラハラが弱い」と言われる可能性がある。
  - iPhone 実機と手で遊ぶことは未確認。予告動画は第7回以降作っていない。
- 消してよい（自分では消していない）：`tmp/r8/` の a〜k の txt、`proto/sukuu-html5/rec/` の `base_h*.json`・`r8a〜r8k_*.json`、`rec/shots_r8/` の t0184〜t0188・t0297〜t0306 の画像。
- ブランチ：main（最新 `c93c71b`、push なし）。`docs/STATUS.md` はほかのセッションの記録なので触らない。

### ③ 次の一手
1. 批評役の r8 への採点を待ち、指摘を直す。直したら NOTES.md に第9回として書き、commit し、台帳とこのメモを更新する。
2. 値段の調整は seed ごとのばらつきが大きい。必ず人の速さ seed 1〜3（できれば 4〜6 も）を並列で回して確かめる：
   `python tools/proto/sukuu_check.py sim --seconds 560 --human --seed N --out X.json > tmp/r8/X.txt`
3. 合格後：予告動画を作り直す（record_sukuu.py の auto_segments を boss_catch／world／earth_reveal に対応させる）→ 秘書 v2 経由で本人へ。

### ④ 完了の条件
- 批評役が合格を出す（点数とコメントで確認）。
- 人の速さの bot（seed 1〜3）で：各段 ≤70 秒、買い物の間隔 ≤40 秒、新しいことが起きない時間 ≤45 秒、最後の段に 240〜360 秒、`loop2_new_first60` が 3 つ以上、エラー 0、overlay_max ≤1。
- `sukuu_check.py upg`：厚さ Lv0 → 主で tear、Lv4 → boss_catch。海は大きさ Lv2 で boss_catch。
- 地球の場面のスクショで、地球が直径 180px 以上・1.5 秒以上映り、キンちゃんの模様と同じ並びだと読める。
- iPhone 実機で `/api/proto/sukuu/` が開けて遊べる（本人か秘書の確認）。

## ★ 引き継ぎ（第7回時点。上の節が新しい。詳細は proto/sukuu-html5/NOTES.md「第7回」）

### ① 課題（いま頼まれていること）
- 本人が r6 を iPhone で遊んで「割とマシだがつまらない。鯨で終わった。ポイの強さが意味なかった。プロダクトレベルにしてから出せ」。
- 秘書 v2 の方針：池 → 海 → 星 → 宇宙と段階を作り「すくう＝救う」が少しずつ見える／どの強化も遊び方を変える（数字だけ変わるのは不可）／iPhone で 5 分遊んで飽きない。置き場所は今のまま（秘書の `/api/proto/sukuu/`）。
- 批評役「金魚すくい批評」との自動ループ（最大 40 往復）：批評が届くたびに直して報告する。**合格するまで本人には出さない**。報告は日本語で「やったこと／結果／本人に必要な判断」。

### ② 今の状態
- 済み：第7回の作り直し（commit `782fe43`、main、push なし）。
  - `proto/sukuu-html5/game.js`（全面書き直し）、`index.html`（`game.js?v=7`）。r6 は `proto/sukuu-html5/r6/` に写して残した。
  - 5 段：池 → 海 → 大陸 → 星 → 宇宙 → 終わり（宇宙を引くと縁日のたらい・花火・「すくう」→「救う」・救った数）→ タップで 2 周目（お金 0 から）。各段の「主」をすくうと前の世界が次の世界のポイの中に縮んで袋へ。大陸 → 星で地球（キンちゃんの模様と同じ並び）。
  - 段ごとの仕組み：池＝重さ（赤い点線）／海＝群れ＋渦潮（渦の中は 2 倍＝救う、ラベルが「救った」に）／大陸＝島は根（緑の輪が満ちるまでおさえる）／星＝流れ星の待ち伏せ・太陽の熱で焦げる／宇宙＝ブラックホールが沈めたポイを引く。
  - 強化 3 系統（段ごとに Lv0 から）：紙の厚さ（持てる重さ 3×1.6^Lv、ボタンに「→ 〇〇が持てる」）／ポイの大きさ（入らない獲物に橙の矢印の輪、鯨・大陸は大きさ Lv が要る、大きいほど早く濡れる）／速乾。
  - 主な調整値（game.js 冒頭）：`WORLDS`（重さ w・値段 v・vs）、`UPG`（base 18/24/30）、`WORLD_PRICE=[1,1.5,1.6,1.9,2.0]`、`mult=1+0.3(n-1)`、主の w=17（大陸 15）。
  - 道具：`tools/proto/sukuu_check.py`（`sim --seconds 420 [--human] [--seed N] --out X.json`／`upg`／`shots --at 2,15,... --dir D`）。批評役の物差し（段の数・各段の秒・破れる割合・買い物の間隔・最大で止まるボタン・30 秒ごとの稼ぎ・大演出の回数）も出す。`record_sukuu.py manual` は新しい lv 名に対応済み。
  - 最新の数字（bot／人の速さの bot、seed 1）：段が上がる 5／5、最後の段 164 秒／241 秒、1 周 214 秒／325 秒、新しいできごとの最大間隔 29／39 秒、段に入って 15 秒の破れる割合 22%／27%、厚さを買って 10 秒の破れ 11%／21%、6 分の破れ 26／41 回、エラー 0、overlay_max 1、大演出 5。
  - 見た目の確認：`proto/sukuu-html5/rec/sheet_r7a.png`・`sheet_r7b.png`・`sheet_r7c.png`。
  - Notion 台帳は更新済み（進行中、要対応 OFF、次回確認日 2026-11-08）。
- 途中・未確認：
  - 批評役の採点は r6 に対する 41 点（1・2 往復目）のみ。r7 への採点はまだ届いていない。
  - iPhone 実機は未確認（指の 64px 上にポイ、音、fps）。manual のタッチ試験は大陸を足す前に 11/12・エラー 0。
  - 人の速さで宇宙の段が 84 秒（批評の目安 30〜70 秒を超える）。厚さを買った直後の破れが 5% を超える（主・熱・重力の挑戦が主な原因。普通の獲物だけなら旧計測で 4.8%）。速い bot は最後の段に 164 秒で着き、4〜6 分より短い。
  - 15 秒の予告動画は第7回では作っていない（record_sukuu.py の auto_segments は旧 whale_hit 前提）。
- 消してよい：リポジトリ直下の `rec_*.txt`、`proto/sukuu-html5/rec/shots_r7a〜c/`（一覧画像があるので）。ほかは STATUS 下の「消してよいもの」のとおり。
- ブランチ：main（最新 `782fe43`、push なし）。秘書側（ai-secretary）は触っていない（`server/proto.mjs` がこのフォルダをそのまま返す）。

### ③ 次の一手
1. 批評役の r7 への採点を待ち、指摘を直す（直したら NOTES.md に第8回として条件・結果を書き、commit、台帳更新）。
2. 待つ間に直せるもの：宇宙の段を 70 秒以内に（`WORLD_PRICE[4]` か宇宙の獲物の値段）、厚さを買った直後の破れの内訳を `sukuu_check.py` で「主・熱・重力を除く」でも出す、`record_sukuu.py manual` を撮り直す。
3. 合格後：予告動画を作り直す（auto_segments を boss_catch／world に対応）→ 秘書 v2 経由で本人へ。

### ④ 完了の条件（確かめ方）
- 批評役が合格を出す（点数とコメントで確認）。
- `sukuu_check.py sim --human`（seed 1 と 7）で：段が上がる 5 回、最後の段に 4〜6 分、各段 30〜70 秒、新しいできごとの間隔 ≤ 45 秒、エラー 0、overlay_max ≤ 1。
- `sukuu_check.py upg`：厚さ Lv0 → 主で tear、Lv4 → boss_catch／海は大きさ Lv0 で入らず Lv2 で boss_catch。
- `sukuu_check.py sim`（bot）で：段に入って 15 秒の破れ 15〜30%、6 分で破れ 20 回以上、「最大」で 10 秒超えのボタン 0、大演出 ≤ 10。
- `record_sukuu.py manual`：タッチで 10/12 以上沈む・エラー 0。iPhone 実機で `/api/proto/sukuu/` が開けて遊べる（本人か秘書の確認）。
Notion 台帳の行：「2 本目のアプリ（企画）」（page 4110e8c7da4d81f884aeeb19ccac4310）

## ① 課題（何を頼まれているか）
- 本人（秘書 v2 経由）の 2 本目のアプリ企画。調査を重ねて、今は **縁日の金魚すくいのインクリメンタルゲーム『すくう』**（Steam 向け、のちに iPhone も）に絞っている。
  - 中身：ポイで金魚を掬い、強化していくと大陸・地球・銀河・宇宙まで掬える。裏の設定は「最初の金魚は実は惑星だった」。
- 本人が一番重く見ているのは「ゲームとして面白いか」「SNS・動画で映えるか」。題名は後回し。
- 指示の流れ：絵コンテ動画はやめて、**触れる見本（HTML5）を作り、自分で遊んで録画した 15 秒の予告**を出す。実物の予告編と比べて、負けている点を直してから出す。
- 直近の指示（秘書 v2、2026-11-07 夜。第5回で対応済み）：①画面がうるさい→数字は 1 回 1 つ・帯をポイや獲物に重ねない ②金魚を減らして大きく、すくう瞬間の気持ちよさを 1 つ強く ③最後の 2〜3 秒で「池が星に見える」引き（鯨の先がある気配） ④本人は PC のファイルを開けないので iPhone で遊べる形に。外部公開せず、秘書の画面（ログインの内側）から開ける置き場所の案を出す。直したら Black Hole・Vampire Survivors との比較画像を作って v2 に報告。`rec/frames/` は消さない。
- その次の指示（秘書 v2、r5 を見て。第6回で対応済み）：①予告の最初のコマの「+28」を消し 0 秒目から新しい 1 すくいで始める ②合計の数字はポイが離れたらすぐ右上のコインへ飛んで消す ③鯨の段に画面全体が変わる一撃（例：水が全部はね上がって白く光る）、背景の水の模様・ビー玉・提灯は半分の濃さ。置き場所は**案 A に決定**、作るのは秘書改善の作業者（こちらは作らない）。直したら r6 の予告と比較画像を報告。→ 報告済み（v2 の返事待ち）
- 案 1「離れて暮らす親子の見守り（生きもの）」も本人は興味あり。調べ終えて保留中（docs/next-app-ideas-v2.md の §8-1）。

## ② 今の状態
**済んだこと**（すべて main に commit 済み、push はしていない）
- 企画と調査の正本：`docs/next-app-ideas-v2.md`
  - §1〜6：最初の案出し
  - §7〜8：親子の見守り・Steam で品質を出せるか
  - §9〜12：『すくう』の案と競合（関連ゲーム約 80 本）
  - §13：見本の進め方。本人が気に入った dsh-game-studio 式：自分で遊んで fps・エラー・スクショを確かめてから渡す。絵はまずコードで描き、良ければ AI の絵に差し替える（費用は承認）
  - §14：見た目の基準・Gemini の画像
- 売れているゲームの公式スクショ 48 枚：`docs/concepts/refs-2026-11-07/`
- 予告編の最初の 12 秒の研究：`docs/concepts/refs-youtube-2026-11-07/README.md`
  - 共通点は 5 つ：0 秒目から遊び画面、道具が常に映る、0.5 秒ごとに弾ける、4〜9 秒で強化を買って強くなる、文字は少なく数字が主役。
- Gemini で作ったイメージ画像 7 枚と比較画像：`docs/concepts/gemini-2026-11-07/`
  - 看板は `06b_capsule_simple.png` が良い案。社内用で、外に出すなら AI 開示が要る。
- **遊べる見本**：`proto/sukuu-html5/index.html`
  - PC のブラウザで開くと遊べる。`?bot=1` で自動プレイ、`?fixed=1` は録画用の固定刻み。
  - 作業記録：`proto/sukuu-html5/NOTES.md`
  - 録画・計測の道具：`tools/proto/record_sukuu.py`（sim / fps / record / trailer / sheet / compare）
  - 予告動画：`proto/sukuu-html5/rec/trailer_15s.mp4`（450 コマ・15.0 秒）
  - 全プレイ：`proto/sukuu-html5/rec/play_60s.mp4`（65MB、.gitignore で commit から外している）
  - 比較画像：`proto/sukuu-html5/rec/compare/r1〜r4_*`
  - 測った数字：エラー 0 件。自動プレイで最初のコイン 1.7 秒、出目金 13.9 秒、鯉 43 秒、鯨 67.5 秒。
- 古い試作物：15 秒の絵コンテ動画 v3 は `docs/concepts/sukuu-v3-video/`。本人と奥さんに「全く面白さがない」と言われ、方針を変えた。

- **第5回（秘書 v2 の指摘への対応、2026-11-07 夜）**：詳細は `proto/sukuu-html5/NOTES.md` の「第5回」
  - 数字は 1 回すくうごとに 1 つ／帯は池の外／金魚 18 匹・大きく／しなり・水しぶき・魚がコインへ飛ぶ
  - 鯨の後に「？？？」を買うと、カメラが引いて池が青い星になり、宇宙に金魚、巨大なポイの縁が入る（文字なし）
  - 予告：`proto/sukuu-html5/rec/trailer_15s_r5.mp4`（450 コマ・15.0 秒、12.5 秒から星）。全プレイ `rec/play_76s_r5.mp4`
  - 比較：`rec/compare/r5_blackhole_vs_trailer.png`・`r5_vampire_vs_trailer.png`・`r5_before_after.png`・一覧 `r5_trailer_sheet.png`
  - 録画のコマ：`rec/frames_r5/`（0〜76 秒、.gitignore 済み）。録画道具に `--frames <フォルダ名>` を足した（古い `rec/frames/` は触らない）
  - 確かめた数字：文字・数字は同時に 1 つまで（`rec/overlay_*.json` の overlay_max=1）、帯 y44〜156／池 y192〜、予告 (450, 15.0)、金魚 18 匹・半径 30〜38px、390x844 タッチ 10/12 沈む・エラー 0（`rec/manual.json`）
  - 自動プレイ（sim 80 秒）：コイン 1.53／破れ 8.1／出目金 12.8／鯉 34.2／鯨 41.7／？？？ 69.5 秒。値段 [250,3000,16000,120000]、価値 [7,40,200,1400]
  - 比べてまだ負けている点：背景がにぎやか（Black Hole は無地）／Vampire の大爆発のような「画面全体が変わる一撃」が引きまで無い／予告の最初のコマに前の「+28」が残る／合計の数字がポイが離れても 1 秒残る
  - Notion 台帳は更新済み（要対応 ON、次回確認日 2026-11-08）

- **第6回（秘書 v2 の指摘への対応、2026-11-07）**：詳細は `proto/sukuu-html5/NOTES.md` の「第6回」
  - 予告の最初のコマに数字なし（overlay_now=0）／合計は満額で出て 0.63 秒でコインへ飛んで消える／鯨を最初にすくうと画面が真っ白に光り池の水が全部はね上がる（2 回目以降は弱く）／背景の模様・ビー玉・提灯・ぼけを半分の濃さ（BGK=0.5）
  - 予告：`proto/sukuu-html5/rec/trailer_15s_r6.mp4`（450 コマ・15.0 秒）。比較：`rec/compare/r6_before_after.png`・`r6_blackhole_vs_trailer.png`・`r6_vampire_vs_trailer.png`・`r6_trailer_sheet.png`・`r6_whale_hit_strip.png`
  - 置き場所は案 A に決定（秘書 v2）。作るのは秘書改善の作業者で、こちらは作らない
  - commit 71e605d（main、push なし）。Notion 台帳は更新済み（要対応 ON：v2 が r6 を確認、次回確認日 2026-11-08）
  - コード：`game.js` の `BGK`（背景の濃さ 0.5）、`whaleHit()`（最初の 1 回は全力・以後は弱く）、`TOTAL_HOLD`/`TOTAL_FLY`（合計 0.3＋0.35 秒）、`window.__overlayNow()`。道具：`auto_segments` は whale_hit を使い、最初の区間は直前 1.0 秒にすくいが無いものから選ぶ。区間だけ撮ったフォルダでも trailer が動く
  - 録画のコマ `rec/frames_r6/` は予告の区間だけ（.gitignore 済み）。区間 [(2.95,4.7),(7.5,9.1),(12.07,14.57),(34.87,36.77),(41.77,44.72),(64.87,69.17)]。events は `rec/events_r6.json`
  - sim 80 秒：コイン 1.3／破れ 8.1／出目金 12.8／鯉 35.2／鯨 40.1／最初の whale_hit 42.3／？？？ 65.3 秒。合計の寿命 0.633 秒
  - まだ負けている点：一撃の後 2 秒ほど落ちてくる水の粒が白い点で残る（予告 10.5 秒）／Vampire の爆発ほど色は変わらない（白く光るだけ）

**iPhone で開く置き場所の案（秘書の画面のログインの内側、外部公開なし）**
- 秘書は Node の http サーバー（`ai-secretary/server/index.mjs`、127.0.0.1:8787）を Tailscale Serve でスマホに出している。`/api/` の外はログイン無しで見えるので、置くなら `/api/` の下。
- 案 A（おすすめ）：秘書に `/api/proto/sukuu/` を 1 本足す。ログイン後だけ、`index.html` と `game.js` の 2 ファイルだけを返す（決め打ちの一覧、`..` 拒否、no-store）。service worker は `/api/` を素通しするので古い画面に化けない。秘書改善の作業者（ai-secretary-wt-kaizen）のやり方で、試験を足して master へ、v2 が restart_self。
- 案 B：既存の `/api/media`（画像・動画だけ）を html/js にも広げる。→ `?p=` の形だと game.js の相対読み込みが壊れる・ワークスペース全体が対象になるので勧めない。
- 案 C：別ポートで静的サーバーを立てて Tailscale Serve の別パスに載せる。→ ログインが無く、tailnet 内なら誰でも見える。秘書のログインの内側という条件を満たさない。
- 注意：ホーム画面の秘書アプリと Safari はクッキーが別。秘書アプリ内で同じ窓で開けばログインのまま。iPhone は消音スイッチで音が出ない。

**途中・未確認**
- **秘書 v2 の確認待ち**：第6回の予告と比較画像（そのあと本人へ）。置き場所の案 A は秘書改善の作業者が作る。
- 本人の評価：予告動画と、iPhone で遊んだ感想（置き場所ができてから）。
- FPS が未確定：測ったとき PC の CPU が 96〜100% 埋まっていた（実時間 19fps、1 コマの描画時間からの換算では 55fps 相当）。
- 見本の弱点：
  - 「？？？」の引きの後は鯨の池に戻るだけ。大陸・地球・銀河の段階、1 晩＝1 回の区切り（花火）はまだない。
  - 音は動画に入っていない。
  - スマホ実機と、人が遊んだときの時間は未確認。
- 消してよいもの（自分では消していない）：`rec/rec6_*.log`、`rec/rec6b_*.log`、
  - `proto/sukuu-html5/rec/frames/`（1.2GB）、`rec/play_90s.mp4`、試し撮りの `rec/frames_r5test/`・`rec/frames_r5test2/`（`rec/frames_r5/` は最新の録画なので残す）
  - `docs/concepts/` の古い版：`2026-11-07-1`、`sukuu`、`sukuu-v2`、`sukuu-v3-video` の preview と r1〜r3

**ブランチ**：main（最新 commit 71e605d＝第6回、push はしていない）。秘書側（`C:\Users\yuton\workspace\ai-secretary`）は何も変えていない。`docs/STATUS.md` は配布基盤の記録で、この企画とは別（ほかのセッションが変更中のため触らない）。

## ③ 次の一手
0. 秘書 v2 の返事（第6回）を待つ。返事に指摘があれば、それを先に直す。
1. 置き場所の案 A（`/api/proto/sukuu/`）は秘書改善の作業者が作る。できたら iPhone で開けるか確かめる。
2. （第6回で済み）背景を半分の濃さ・鯨の一撃・最初のコマの「+28」・合計の数字をすぐ消す。
   - 撮り直しの手順（第6回は区間だけ撮った：`record --start <区間の始め> --seconds <長さ> --frames frames_r6` を区間ごとに並列）：`python tools/proto/record_sukuu.py sim --seconds 80` → `record --start S --seconds N --frames frames_r6`（4 本並列）→ `sim --seconds 80`（events.json を全区間に戻す）→ `trailer --frames frames_r6 --name trailer_15s_r6.mp4` → `sheet` → `compare`。描画だけの変更なら、予告の区間だけ撮り直せばよい。
3. 本人の感想を受け取り、「面白くない所」を直す。
2. PC が空いているときに FPS を測り直す：`python tools/proto/record_sukuu.py fps --seconds 20 --channel chromium --args=""`
3. 次に広げる候補（本人の指示があれば）：
   - 数字の整理（重ならない）
   - 段階を大陸 → 地球 → 銀河まで足す
   - 1 晩＝1 回で、花火で区切る
   - 種明かし（docs/next-app-ideas-v2.md §11-1 の設計）
4. 進めるたびに、`proto/sukuu-html5/NOTES.md`・このファイル・Notion の台帳を更新する。

## ④ 完了の条件（次の区切り）
- 第6回の条件（すべて満たした。証拠は NOTES.md「第6回」）：予告の最初のコマ overlay_now=0（`rec/first_overlay_2.95.json`）／合計は 1.0 秒未満で消える（events の scoop→total_end）／whale_hit があり白く光る（`rec/compare/r6_whale_hit_strip.png`）／BGK=0.5／予告 (450, 15.0)・overlay_max≤1・エラー 0
- 次の指摘を直すときも同じ形で：直す前と後を `rec/compare/r7_before_after.png` で並べ、上の数字の確かめ方を使う
- 秘書 v2・本人の指摘が、それぞれ直っている（直す前と後の一覧画像 `rec/compare/rN_before_after.png` で示す）。
- 予告の全コマで文字・数字は同時に 1 つまで（`rec/overlay_*.json` の overlay_max ≤ 1）。帯は池（y192〜）に重ならない。
- 予告の最後の 2〜3 秒に「？？？」の引き（events.json の reveal を含む区間）がある。
- iPhone：秘書の画面からログインした状態で `/api/proto/sukuu/` を開くと遊べ、ログインなしでは 401、`NOTES.md` などほかのファイルは 404（秘書の smoke-test で確かめる）。
- 最新の予告（`rec/trailer_15s_rN.mp4`）が 450 コマ・15.0 秒で、`imageio_ffmpeg.count_frames_and_secs` で確かめてある。
- 予告の最初の 3 秒は遊び画面で、ポイと指が映り、0.5 秒ごとに何か弾ける。0.5 秒刻みの一覧画像（`record_sukuu.py sheet`）で確かめる。
- 実時間 20 秒の自動プレイで、エラー 0 件・FPS 55 以上（`rec/fps.json`）。
- 予告の一覧を `docs/concepts/refs-youtube-2026-11-07/*_first12s.png` と並べた比較画像を自分で見て、負けている点が NOTES.md に記録され、直してある。

## 守ること（本人の指示）
- rm・rmdir・del を使わない。作り直しは新しいフォルダやファイルに書き出す。
- 報告の前に、本人の突っ込みを 5〜10 個先読みして調べる。競合は「関連するもの」まで広く調べる。
- お金がかかるもの（有料 API・外注）は、見積もりを出して承認を取ってから使う。Gemini の画面からの画像作り（本人のアカウント）は無料で使ってよい。
- PC の GPU は vtuber 用なので使わない。
- 秒数・金額などの決まっていない値を、推測で埋めない。

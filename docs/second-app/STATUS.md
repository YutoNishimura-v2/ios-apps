# 2 本目のアプリ（『すくう』）引き継ぎメモ

最終更新：2026-11-07（Claude Code、ios-apps）— 第7回（5 段の作り直し）済み。批評役「金魚すくい批評」の自動ループ中（合格まで本人に出さない）

## 第7回（いちばん新しい。詳細は proto/sukuu-html5/NOTES.md「第7回」）
- 本人が r6 を iPhone で遊んで「つまらない・鯨で終わった・ポイの強さが意味ない」。批評役の 1 回目（r6 に対して）は 41 点・不合格。
- game.js を作り直した（r6 は proto/sukuu-html5/r6/ に残した）：池 → 海 → 大陸 → 星 → 宇宙 → 終わり（宇宙＝縁日のたらい、「すくう」→「救う」）。段ごとに仕組みが変わり、強化 3 系統（紙の厚さ・ポイの大きさ・速乾）は「何が取れるか」を変える。
- 置き場所はそのまま（秘書の /api/proto/sukuu/ はこのフォルダを直接返すので、もう新しい版が開ける）。index.html は game.js?v=7。
- 確かめ方：`python tools/proto/sukuu_check.py sim --seconds 420 [--human]`、`upg`、`shots --at ...`
- 次の一手：批評役の次の採点を待ち、指摘を直す。iPhone 実機の手ざわり（指の上にポイを出す 64px など）は未確認。
- 消してよい：リポジトリ直下の rec_*.txt（sim の出力の控え）
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

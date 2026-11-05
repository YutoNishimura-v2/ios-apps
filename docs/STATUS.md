# STATUS

## 開発メモ

- push は SSH で行う。gh のトークンに `workflow` スコープがないため、HTTPS では `.github/workflows/` を変えるコミットを push できない。PC の SSH 鍵は GitHub に登録済み。ただし `~/.ssh/known_hosts` に github.com がないので、`gh api meta --jq '.ssh_keys[]'` で取った公式のホスト鍵を一時ファイルに書き、`GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=<一時ファイル> -o StrictHostKeyChecking=yes"` を付けて push する。HTTPS で push したいなら、本人が一度 `gh auth refresh -h github.com -s workflow`（ブラウザで承認）を実行する。
- `docs/` だけの変更ではビルドは走らない（ワークフローの paths に入れていない）。
- `pages/index.html` の `sidestore://source?url=` リンクが SideStore で効くかは未確認。効かないときは配布元の URL を手で貼る（SETUP.md に記載）。

## 2026-11-04

- リポジトリ作成。見開きリーダー（`apps/MihirakiReader`）のソース、XcodeGen 設定、アイコン、Actions ワークフロー、配布元 JSON の生成スクリプトを追加。
- cmoa.jp トップの UA 別の返り方（ログインなし、curl）：Mac 版 Safari の UA では `viewport width=1024`（PC 版）、iPhone の UA では `width=device-width`（スマホ版）。同じ URL のままサーバー側で UA を見て切り替えている。アプリは WebView 全体に Mac の UA を付けるので、ビューアが別ホストでも PC 版が返る見込み。実機での見開き表示は未確認。
- 初回ビルド（run 41669217528、commit c764f49）：ビルドと IPA 作成は成功。リリース作成だけ HTTP 403（Resource not accessible by integration）。トークンには Contents: write が付いていた。リポジトリ最初のコミットだったことが関係していそう（原因は未確定）。
- 2回目（run 41669362926、commit cdeb5e5）：全部成功。リリース `MihirakiReader-v1.0.2`、IPA 263,673 バイト。配布元 JSON と配布ページを GitHub Pages に公開。
  - ランナー：macos-latest = macOS 26.6.2、Xcode 26.6、SDK iphoneos26.5。XcodeGen は `brew install` で入れる。
  - IPA の中身：arm64、`CFBundleDisplayName` = 見開き、`CFBundleIdentifier` = io.github.yutonishimura-v2.mihiraki、`CFBundleShortVersionString` = 1.0.2、`CFBundleVersion` = 2、MinimumOSVersion 16.0、横向きのみ、`UILaunchScreen` あり、アイコン入り、署名なし。
  - 配布元 JSON の `version` / `buildVersion` は IPA と一致（SideStore はバンドル ID とバージョンを照合する）。
- SideStore の仕様（コードを読んで確認、0.6.4〜develop）：署名なし IPA は SideStore が署名し直す。`appPermissions` は省略可で、権限の照合は既定でオフ。無料アカウントではバンドル ID の末尾にチーム ID が付く（配布元には元の ID を書く）。
- Windows 側（本人承認のうえで実施）：
  - Apple 版 iTunes（iTunes64Setup.exe、Apple 署名 Valid）と iloader の msi（SHA-256 一致）を `C:\Users\yuton\Downloads\sidestore-setup` に落としたが、どちらも管理者の確認（UAC）が要り、本人が PC の前にいないため入れられなかった（UAC はキャンセル扱い）。
  - 代わりに UAC の要らない版で入れた：iloader 2.4.1 は `iloader-windows-x64.exe /S`（Tauri 既定のユーザー単位、`%LOCALAPPDATA%\iloader`、SHA-256 0b9a129a… 一致）、iTunes は `winget install --id 9PB2MZ1ZMB1S --source msstore`（AppleInc.iTunes 12139.12003.62022.0）。
  - Store 版 iTunes は Windows サービスを作らず、`AppleMobileDeviceProcess` をスタートアップタスク（初期は無効）で動かす。iTunes を一度開いたところ使用許諾の画面で止まっている。同意は本人が PC の前に来たときに行う（画面操作の許可は出なかった）。
- 実機での見開き表示は未確認（本人が SideStore で入れたあとに確認）。
- 本人が iTunes の使用許諾に同意。`AppleMobileDeviceProcess` が動いているのを確認し、iloader を起動した。Windows 側の準備は完了。
- 本人：見開きリーダーはたぶん使わない。このリポジトリは今後の自作アプリの配布基盤として使う。次は iPhone に SideStore を入れる（SETUP.md 手順2）。
- HingeLab（`apps/hinge-lab`、Duo の開き角度の計測アプリ）を追加。run 41829557499（commit 8f70fb8）で一度で成功。リリース `hinge-lab-v1.0.3`、IPA 95,626 バイト、配布元に掲載（`io.github.yutonishimura-v2.hingelab` 1.0.3、minOSVersion 27.1）。
  - ランナーを `macos-latest` から `xcode-27`（標準サイズ、Apple Silicon）に変え、`/Applications/Xcode_27.1.app` に固定。ログ：macOS 27.0.1、Xcode 27.1（27A9275）、iOS SDK 27.1。イメージ 20261026.0314 には Xcode 27.0 / 27.1（既定）/ 27.2 RC が入っている。
  - `app.json` に `minSDK` を書くと、SDK が足りないときにビルド前に理由つきで止まる（hinge-lab は 27.1）。
  - 角度は SwiftUI の `onHingeChange`（`DeviceHingeContext.hinge?.angle.degrees`、状態は closed / partiallyOpen / fullyOpen）。API の形は FoldSafe（MIT）の BUILD_NOTES にある SDK の宣言で確認。コードは流用せず自前で書いた（HingeKit も MIT、未使用）。
  - 見開きリーダーも同じ push で 1.0.3 に上がった（全アプリを毎回ビルドする仕組みのため）。
  - Duo 実機での動作は未確認（SideStore のサインイン -80045 が解決してから）。
- 本人：時間を置いても SideStore のサインインは -80045 のまま。SideStore・AltStore・iloader・Sideloadly で 10 月中旬から同じ報告が多く、[SideStore #1709](https://github.com/SideStore/SideStore/issues/1709) は未解決（Apple 側の認証の変更が原因とみられる）。11/3 に「これで通った」報告が複数ある回避策（[#1709 のコメント](https://github.com/SideStore/SideStore/issues/1709#issuecomment-6573352382)）：設定 → User Customizations で On-Device Anisette をオフ → Anisette Servers で SideStore (New) を選び Enable Auto Rotation をオフ → Anisette Client Configuration → Remote Server Sync で Fetch → Save as Overrides → Reset adi.pb → サインイン。本人が試す。
  - 補足（SideStore 0.7.0-alpha のソースと配布中の一覧で確認）：設定はすべて iPhone の SideStore で行う（iloader の Anisette 一覧は別物で、そこには SideStore (New) はない）。iloader の「SideStore (Stable)」は GitHub の latest リリース＝0.7.0-alpha を入れる。設定画面の「ADVANCED SETTINGS」に User Customizations と Anisette Servers があるが、Anisette Servers の行は On-Device Anisette をオフにしたあとでないと出ない。SideStore (New)（https://new.ani.sidestore.io）は SideStore が読む一覧 https://servers.sidestore.io/servers.json に載っている（2026-11-04 確認）。
- 本人：上の手順で SideStore へのサインインが通った（2026-11-04）。次は配布元を登録し、Duo に HingeLab を入れて実機で測る。
- Duo 実機（iOS 27.2）で HingeLab 1.0.3 が動いた。更新は動かしている間だけ来る（最大 101 回/秒、総数 401）。0.0〜180.0° まで取れた。本人の感想：振動で本体が震えると角度の値が少しブレる。40〜50° あたりより閉じると外側の画面に切り替わる（外側でも 0° まで測れる）。1.0.3 はスライダーの値も同じ集計に混ぜていたので、ヒンジだけの数値ではない。
- HingeLab 1.0.4（run 41833281120、成功）：計測はヒンジの値だけ、5° ごとの振動は境目を 0.75° 越えないと鳴らない（振動→ブレ→また振動、のループ対策）、直近1秒の幅、画面が内↔外に切り替わったときの角度を記録。
- 作業2（光の反射パズル）の設計は Notion「Duo角度パズル 仕様と引き継ぎ」に追記。非公開リポジトリの作成と配布の方法は本人の判断待ち。
- HingeLab 1.0.4 の実機結果（ヒンジの値だけ）：更新は最大 26 回/秒（1.0.3 の 101 回/秒はスライダーの分だった）、最小の刻み 0.057°、最長の間隔 667 ms、角度 59.4〜180.0°。このときは内↔外の切り替わりは記録されなかった（59.4° までしか閉じていない）。
- 本人の承認で、非公開リポジトリ `YutoNishimura-v2/duo-light-puzzle` を作成。配布は案A：非公開側のビルド（xcode-27、Xcode 27.1）が IPA を ios-apps の Release `LightPuzzle-v0.1.<番号>` に載せ、`gh api .../dispatches`（event_type=ipa-published）で `publish.yml` を呼ぶ。
  - Release のイベントではなく repository_dispatch にしたのは、Pages の環境 github-pages が main からしか公開できないため（Release のイベントはタグで走る）。
  - `build.yml` の list は `project.yml` があるフォルダだけを返すようにした。`apps/LightPuzzle` は `app.json` とアイコンだけ。
  - 非公開側の最初のビルド（run 41835443700）は成功。IPA 621,081 バイト、ステージ JSON 3つ入り。トークン `IOS_APPS_TOKEN` が未登録なので、IPA は Actions の成果物にあるだけで、まだ配布元には出ていない。
- 本人が `IOS_APPS_TOKEN` を登録。非公開側の run 41836389999 で `LightPuzzle-v0.1.3` が ios-apps に載り、repository_dispatch で publish.yml（run 41836486889、main）が走って配布元に「光の反射（試作）」0.1.3（171,343 バイト）が出た。IPA はログインなしで落とせることを確認。
- 実機で「光の反射（試作）」0.1.3 の導入が `SideSign.DeveloperPortalError 10`（Bundle identifier unavailable: invalid value '光の反射' for 'appIdName'）で失敗。SideStore 0.7.0-alpha は表示名（CFBundleDisplayName）をそのまま App ID の名前に使い、Apple は ASCII 以外を断る（develop には英字に直す `sanitizeAppIDName` が入っているが、0.7.0-alpha にはない）。
  - 対処：表示名を ASCII（Light Puzzle、Mihiraki）にし、日本語の名前は `ja.lproj/InfoPlist.strings` の訳で出す。両方のビルドに「表示名が ASCII か」の確認を足した。LightPuzzle 0.1.4・見開きリーダー 1.0.6 で反映（IPA に ja.lproj が入っているのを確認）。実機での導入は未確認。
- 本人の判断（2026-11-05）：光の反射パズルは「角度をスライダー代わりにしているだけで折る必然がない」。代わりに Duo 専用カメラの方向へ。最初の実験として **CatchLight**（外側の画面を、背面カメラで撮る被写体への照明にする。瞳に光の形を映す）を作った。
  - ソースは非公開の duo-light-puzzle の `CatchLight/`。外側の画面は `CameraCaptureAccessory`（iOS 27.1）。光の形 7 種、色温度・色・明るさ、外側を触るとシャッター、外側の画面の明るさを最大に。
  - 非公開側のビルドを呼び出し式の `ios-build.yml` にまとめ、`build.yml`（光の反射、版の番号を続けるため名前はそのまま）と `catchlight.yml` から呼ぶ。
  - run 41841063885 で一度で成功。配布元に「キャッチライト（試作）」0.1.1（205,005 バイト）が出た。実機では未確認（外側に出るか、明るさが照明として足りるか、瞳に映るか）。
- CatchLight 0.1.1 の実機結果（本人、2026-11-05）：外側の画面の光は照明として全然足りない。瞳に映りようがない。画面をこれ以上明るくするのは物理的に無理なので、この案はやめる。
- 二人で遊ぶカメラ：本人の「撮る人がこっそりお題を出す」案を、ジェスチャーゲーム＋ハイライト動画に直して POC を作った（本人承認）。**OdaiCam**（表示名 OdaiCam、日本語名「お題カメラ」）、ソースは非公開の duo-light-puzzle の `OdaiCam/`。
  - お題は外側の画面（CameraCaptureAccessory）にだけ出る。Duo を持つ人が内側でカメラ越しに見て「○」「パス」。30/60/90 秒、山札 4 つ＋自作のお題帳。
  - ラウンドを背面カメラで丸ごと録画（音声も）し、終わったらお題ごとに答える直前 4 秒＋0.8 秒を切り出してつなぎ、お題の帯を重ねたハイライト動画を作る。写真ライブラリに保存できる。
  - run 41845287139 で一度で成功（AVMutableVideoComposition などが iOS 26/27 で非推奨という警告のみ）。配布元に「ジェスチャーお題カメラ（試作）」0.1.1（166,822 バイト）。実機では未確認。
- OdaiCam 0.1.3：本人の指摘（正解を知っているのは演じる人なのに、ボタンは当てる人が持つ）を受け、声で自動判定を入れた。iPhone の音声認識（Speech、端末の中だけ。できない端末では自動判定を切る）で当てる人の声を聞き、お題ごとに聞き直す。かなとローマ字読みにそろえて比べる。録画は AVAssetWriter に変え、同じマイクの音を録画と聞き取りの両方に流す。○・パスのボタンは残す。run 41846905576 で成功（1 回目はクロージャの self の書き漏れで失敗、直した）。聞き取りの精度と、録画の向き・ハイライトの見え方は実機で未確認。
- OdaiCam：本人の評価「良かった、初めて売れるかもと思えた。ただ普通のジェスチャーゲームなので、もう一工夫」（2026-11-05）。本人の指示で次を実装（承認なしで進めてよいと本人）。
  - 見え方しばり 5 種（棒人間＝Vision の骨格、影絵＝人物の切り抜き、だんだん晴れるモザイク、3 秒遅れ、うろつくのぞき穴）。既定はお題ごとのくじ。当てる人の画面はしばりだけ（プレビューは下に残す）。しばった画面も同じ時刻で録画し、ハイライトは「見えていた画面 → 実際の演技」の種明かし。run 41935693898 成功。
  - 内側カメラ：MultiCam（背面＋内側）が使えるときだけ、内側カメラで当てる人の顔を見張り（Vision の顔の向き、最初の 1 秒を基準に 0.4 rad・0.6 秒）、顔を上げたら −1。内側も録画し、ハイライトの右上にワイプ。使えない端末では自動で切る。run 41936250210 成功。
  - 0.1.5 でメニューに MultiCam の対応状況を出した（Duo が背面＋内側に対応しているかは本人の画面で確認待ち）。配布元は 0.1.7。実機では未確認。
- OdaiCam 0.1.8：本人の依頼で UI・UX を大手アプリ並みに作り直した。Heads Up!・Kahoot!・Duolingo・BeReal・Psych!・Jackbox をサブエージェントで調べ、配色（藍 #1B1035 の地、ピンク #FF4F7B、山札ごとの色）、SF Pro Rounded の太字、押すと沈む立体ボタン、初回の説明 3 枚と許可の前置き、山札カード、しばりのチップ、正解・パスの全画面フラッシュと音・振動、残り時間の輪、結果の数え上げと自己ベストの紙吹雪、共有・保存、外側のお題カード、ハイライトのワイプを左上に白枠・アプリ名の透かし、新しいアイコン。run 41937265222 で一度で成功。シミュレーターもないため見た目は実機で未確認。
- 本人（2026-11-06）：0.1.8 はカウントダウンの直後に落ちる。UI は「ダサい。特定のアプリを決めて、デザインを真似るように」。
- OdaiCam 0.1.9〜0.1.11（duo-light-puzzle の run 42054902807 ほか、すべて成功）：
  - 落ちた原因：しばりの録画で `AVAssetWriterInputPixelBufferAdaptor` を `startWriting()` の後に作っていた（AVFoundation が例外で止める）。最初のしばりの画面が届く＝プレイ開始の瞬間に必ず落ちていた。書き始める前に作るよう直した。3 秒遅れの履歴を 2 つのキューから触っていた競合も直した。実機で直ったかは未確認。
  - 落ちたときの手がかり：Objective-C の例外の中身と直前の操作の足跡を残し、次に開いたとき 設定 →「前回の終了の記録」に出す（共有もできる）。iPhone の 設定 → プライバシーとセキュリティ → 解析と改善 → 解析データ の `OdaiCam-….ips` でも分かる。
  - デザイン：iPhone の「カメラ」アプリをそのまま真似た。映像が全面、上に設定・声判定・カンニング禁止のガラスの丸ボタン、下に時間（レンズ切り替えの丸）、しばりのモード列（選択は黄色）、シャッターで開始、左下に山札。選んだしばりはホームでその場でかかって見える。カウントダウンはセルフタイマーの細い数字、プレイ中の残り時間は録画時間の表示、正解・パスは中央のガラスの四角、カンニングは上から降りる赤い帯。結果はフィットネスの概要（黒地に集計カード）。初回は Apple 純正の「ようこそ」シート、山札と設定は設定アプリと同じ一覧。Liquid Glass（`.glassEffect`、`.buttonStyle(.glass)`）と SF Pro・SF Symbols だけで組み、絵文字・グラデーション・立体ボタン・紙吹雪はやめた。アイコンも黒地に白いファインダーと黄色の「?」に変えた。
  - 見た目の確認：`odaicam-shots.yml` がシミュレータ（iPhone Duo がある）で各画面を開いて写真を撮り、成果物に上げる（起動引数 `-shot home` などでカメラなしの状態を作る）。シミュレータの Duo は閉じた状態で起動し、アプリは外側の画面に出る。内側の画面を使う方法は simctl にない（画面の電源を入れても黒のまま）。

## 2026-11-06 OdaiCam：シミュレータで自動で遊ぶ UI テスト

- 渡す前に落ちる不具合を自分で見つけるため、duo-light-puzzle に試験の仕組みを足した（main の 33791cc）。
  - 偽カメラ（`OdaiCam/Sources/FakeCamera.swift`）：起動引数 `-fakeCamera YES` で、AVCaptureSession の代わりに動画を 30 コマ/秒で繰り返し流し、本物の背面カメラと同じ処理（しばり → しばりの録画 `appendEffect`、生の録画、録画開始・終了、ハイライト作り）を通す。時刻はホストの時計で付け直す。プレビューは最後のコマを出す。声・内側カメラ・許可の確認は使わない。`-testRoundSeconds 8` でラウンドを短くできる。起動引数がなければ実機の動きは変わらない。
  - 流す動画：CI で Wikimedia Commons の「The Grizzly Bear Dance (1913)」（パブリックドメイン）を落とし、ffmpeg で縦長 540x960・10 秒に切る（リポジトリには入れない。`OdaiCam/TestAssets/` は .gitignore）。取れなければアプリが描く人形で代わりにする。
  - UI テスト（`OdaiCam/UITests/OdaiCamUITests.swift`、スキーム `OdaiCamUITests`）：ホームでしばり 7 つを順に選び、そのたびに「あそぶ」「設定」が押せて画面の中にあるかを確かめる。次にしばりごとに 1 ラウンド（正解・パス → 結果 → 種明かしの動画ができるまで）、1 回目は「役を交代してもう一回」も通し、「ホームへ」で戻る。各段階の画面写真を残す。テストは約 4.5 分、ジョブは約 9 分。
  - `odaicam-shots.yml` に uitest ジョブを足した（OdaiCam を触る push と手動実行で走る）。テストが落ちるとワークフローも落ちる。成果物 `odaicam-uitest` に名前付きの画面写真、外側の画面の録画（約 5 MB）、結果の要約、ログ、クラッシュレポート。
  - シミュレータの Duo（閉じた状態、アプリは外側の画面）でも XCUITest はそのまま操作できた。回避策は要らなかった。
- 確かめたこと：直した 2 つの不具合（書き始めた後のアダプタ作成、scaledToFill でボタンが画面の外）を一時的に戻したら、テストが両方とも見つけた（run 42082815679：「棒人間：設定 が画面の外」「カウントダウンのあと落ちた」）。
- テストで見つけて直した不具合：種明かしの動画が毎回「ハイライトを作れませんでした」（-11800／-12780）になっていた。元の動画（AVAsset）を手放してから書き出していたため（トラックは動画を弱くしか持たない）。書き出しが終わるまで持つようにした。実機でも同じだったはずだが、実機では未確認。あわせて、失敗の文言に元の原因の番号まで出すようにした。
- シミュレータだけの制限：ハイライトの帯（AVVideoCompositionCoreAnimationTool）はシミュレータの描画で落ちるので、シミュレータでは帯なしで書き出す（実機はそのまま）。帯はテストで確かめていない。Vision の骨格・人物の切り抜きはシミュレータでは何も見つけない（棒人間・影絵は空の絵になるが、処理は最後まで通る）。
- 気づいたこと（直していない）：シミュレータの外側の画面では、操作の並びが画面の幅の 8 割ほどに寄っている（以前の画面写真でも同じ。安全領域の差と思われる）。デザインを作り直す人に伝える。
- 最後の成功：main の run 42081097452（odaicam-shots、shots と uitest）、配布の run 42081097539（OdaiCam 0.1.13）。

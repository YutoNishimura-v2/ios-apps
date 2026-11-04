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

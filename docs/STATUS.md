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

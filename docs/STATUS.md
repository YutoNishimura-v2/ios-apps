# STATUS

## 2026-11-04

- リポジトリ作成。見開きリーダー（`apps/MihirakiReader`）のソース、XcodeGen 設定、アイコン、Actions ワークフロー、配布元 JSON の生成スクリプトを追加。
- cmoa.jp トップの UA 別の返り方（ログインなし、curl）：Mac 版 Safari の UA では `viewport width=1024`（PC 版）、iPhone の UA では `width=device-width`（スマホ版）。同じ URL のままサーバー側で UA を見て切り替えている。アプリは WebView 全体に Mac の UA を付けるので、ビューアが別ホストでも PC 版が返る見込み。実機での見開き表示は未確認。
- 初回ビルド（run 41669217528、commit c764f49）：ビルドと IPA 作成は成功。リリース作成だけ HTTP 403（Resource not accessible by integration）。トークンには Contents: write が付いていた。リポジトリ最初のコミットだったことが関係していそう（原因は未確定）。
- 2回目（run 41669362926、commit cdeb5e5）：全部成功。リリース `MihirakiReader-v1.0.2`、IPA 263,673 バイト。配布元 JSON と配布ページを GitHub Pages に公開。
  - ランナー：macos-latest = macOS 26.6.2、Xcode 26.6、SDK iphoneos26.5。XcodeGen は `brew install` で入れる。
  - IPA の中身：arm64、`CFBundleDisplayName` = 見開き、`CFBundleIdentifier` = io.github.yutonishimura-v2.mihiraki、`CFBundleShortVersionString` = 1.0.2、`CFBundleVersion` = 2、MinimumOSVersion 16.0、横向きのみ、`UILaunchScreen` あり、アイコン入り、署名なし。
  - 配布元 JSON の `version` / `buildVersion` は IPA と一致（SideStore はバンドル ID とバージョンを照合する）。
- SideStore の仕様（コードを読んで確認、0.6.4〜develop）：署名なし IPA は SideStore が署名し直す。`appPermissions` は省略可で、権限の照合は既定でオフ。無料アカウントではバンドル ID の末尾にチーム ID が付く（配布元には元の ID を書く）。
- Windows 側：iTunes・iloader は未インストール（2026-11-04 時点）。入れるのは本人の承認待ち。
- 実機での見開き表示は未確認（本人が SideStore で入れたあとに確認）。

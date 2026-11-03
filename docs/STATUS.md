# STATUS

## 2026-11-04

- リポジトリ作成。見開きリーダー（`apps/MihirakiReader`）のソース、XcodeGen 設定、アイコン、Actions ワークフロー、配布元 JSON の生成スクリプトを追加。
- cmoa.jp トップの UA 別の返り方（ログインなし、curl）：Mac 版 Safari の UA では `viewport width=1024`（PC 版）、iPhone の UA では `width=device-width`（スマホ版）。同じ URL のままサーバー側で UA を見て切り替えている。アプリは WebView 全体に Mac の UA を付けるので、ビューアが別ホストでも PC 版が返る見込み。実機での見開き表示は未確認。
- 初回ビルドの結果はこの下に追記する。

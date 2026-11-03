# ios-apps

個人用の自作 iPhone アプリ。Apple Developer Program（有料）を使わずに配る。

- ビルド：GitHub Actions の macOS ランナーで署名なしの IPA を作り、GitHub Releases に置く。
- 導入：iPhone の SideStore が無料 Apple ID で署名してインストールする（7日ごとに更新）。
- 配布元（SideStore のソース）：https://yutonishimura-v2.github.io/ios-apps/apps.json

## アプリ

| フォルダ | 表示名 | 内容 |
| --- | --- | --- |
| `apps/MihirakiReader` | 見開き | cmoa.jp を Mac 版 Safari として開き、PC 版（見開き）のビューアを全画面・横向きで表示する。表示の仕方を変えるだけで、コンテンツの取得・保存はしない。 |

## アプリを足すとき

1. `apps/<ターゲット名>/` に `project.yml`（XcodeGen）、`app.json`（配布元に載せる情報）、ソース、アイコンを置く。
2. main に push すると Actions がビルドし、`<ターゲット名>-v<バージョン>` のリリースを作り、配布元の JSON を更新する。
3. バージョンは `app.json` の `version` に Actions の実行番号を付けたもの（例 `1.0.12`）。push のたびに SideStore で更新が出る。

## 記録

- 手順（本人向け）：[docs/SETUP.md](docs/SETUP.md)
- 状況：[docs/STATUS.md](docs/STATUS.md)

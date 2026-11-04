# ios-apps

個人用の自作 iPhone アプリ。Apple Developer Program（有料）を使わずに配る。

- ビルド：GitHub Actions の `xcode-27` ランナー（Xcode 27.1 に固定）で署名なしの IPA を作り、GitHub Releases に置く。
- 導入：iPhone の SideStore が無料 Apple ID で署名してインストールする（7日ごとに更新）。
- 配布元（SideStore のソース）：https://yutonishimura-v2.github.io/ios-apps/apps.json

## アプリ

| フォルダ | 表示名 | 内容 |
| --- | --- | --- |
| `apps/MihirakiReader` | 見開き | cmoa.jp を Mac 版 Safari として開き、PC 版（見開き）のビューアを全画面・横向きで表示する。表示の仕方を変えるだけで、コンテンツの取得・保存はしない。 |
| `apps/hinge-lab` | HingeLab | iPhone Duo の開き角度（onHingeChange、iOS 27.1 SDK）を表示・計測する。更新回数、直近1秒のブレ、最小・最大、5度ごとの振動、0.5秒止めて確定の判定。ヒンジのない端末はスライダーで代用。 |
| `apps/LightPuzzle` | 光の反射（試作） | Duo の開き角度で鏡を傾ける光のパズル。ソースは非公開の別リポジトリで、ここには配布元に載せる情報（`app.json`、アイコン）だけを置く。IPA は別リポジトリのビルドがこのリポジトリの Release に載せ、`publish.yml` を repository_dispatch で呼んで配布元を作り直す。 |
| `apps/CatchLight` | キャッチライト（試作） | Duo の外側の画面を、背面カメラで撮る被写体への照明にする（光の形・色温度・色・明るさ）。光の反射と同じく、ソースは非公開の別リポジトリで、ここには `app.json` とアイコンだけを置く。 |
| `apps/OdaiCam` | ジェスチャーお題カメラ（試作） | 外側の画面にだけお題を出し、演じる人が演じて、Duo を持つ人が内側でカメラ越しに当てる。ラウンドを録画し、お題ごとのハイライト動画を作る。ソースは非公開の別リポジトリ。 |

## アプリを足すとき

1. `apps/<ターゲット名>/` に `project.yml`（ここでビルドするときだけ）（XcodeGen）、`app.json`（配布元に載せる情報）、ソース、アイコンを置く。
2. main に push すると Actions がビルドし、`<ターゲット名>-v<バージョン>` のリリースを作り、配布元の JSON を更新する。
3. バージョンは `app.json` の `version` に Actions の実行番号を付けたもの（例 `1.0.12`）。push のたびに SideStore で更新が出る。

## 記録

- 手順（本人向け）：[docs/SETUP.md](docs/SETUP.md)
- 状況：[docs/STATUS.md](docs/STATUS.md)

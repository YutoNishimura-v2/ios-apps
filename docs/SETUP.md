# 本人向けの手順（最初の一回だけ）

人の手が要るのはここに書いた分だけ。ビルドと配布元の更新は GitHub Actions が自動でやる。

- 配布ページ（iPhone の Safari で開く）：https://yutonishimura-v2.github.io/ios-apps/
- 配布元（SideStore のソース）：`https://yutonishimura-v2.github.io/ios-apps/apps.json`

## 0. 用意するもの

- サイドロード用の Apple ID（普段のアカウントとは別のものを推奨。無料でよい）
- iPhone と Windows PC をつなぐ USB ケーブル
- iPhone にパスコードを設定しておく

## 1. Windows 側（2026-11-04 に Claude が入れた。管理者の確認なしで入る版）

| ソフト | 入れたもの | 状態 |
| --- | --- | --- |
| iloader 2.4.1 | 公式 github.com/nab138/iloader の `iloader-windows-x64.exe`（ユーザー単位、SHA-256 照合済み） | 入れた。スタートメニューの「iloader」 |
| iTunes | Microsoft Store 版（Apple Inc.、iloader 公式サイトのリンク先と同じ） | 入れた。使用許諾にも同意済み（AppleMobileDeviceProcess が動いているのを確認） |

Store 版 iTunes は、iPhone と USB で話す部品（AppleMobileDeviceProcess）を「iTunes を一度開いて使用許諾に同意したあと」に動かす。

## 2. SideStore を入れる（SideStore 公式手順の順番）

0. PC で iTunes を開き（開いたままの画面があればそれ）、使用許諾に「同意する」。
1. iPhone を USB でつなぎ、iPhone 側で「このコンピュータを信頼」→ パスコード。
2. PC で iloader を開き、サイドロード用の Apple ID でサインインして「Install SideStore (Stable)」。
3. iPhone：設定 → 一般 → VPN とデバイス管理 → 自分の Apple ID →「信頼」。
4. iPhone：設定 → プライバシーとセキュリティ → デベロッパモード → オン → 再起動 →「オンにする」。
5. App Store で **LocalDevVPN**（無料）を入れて開き、「Connect」。
   - iPhone の中だけで閉じた VPN。SideStore が PC なしでアプリを入れる・更新するのに使う。インストール・更新のたびにオンにしておく。
6. SideStore を開き、同じ Apple ID でサインイン。

## 3. 配布元を登録する（一度だけ。以後の自作アプリはここに出てくる）

1. iPhone の Safari で https://yutonishimura-v2.github.io/ios-apps/ を開き、「SideStore に追加」を押す。
   - 効かないときは SideStore の Sources → ＋ に上の配布元 URL を貼る。
2. 使いたいアプリだけ SideStore でインストールする（LocalDevVPN はオン）。見開きリーダーは入れなくてよい。無料 Apple ID は SideStore を含めて3つまでなので、入れない分は枠を使わない。

## 4. 7日ごとの更新

無料 Apple ID の署名は7日で切れる。切れる前に更新（Refresh）すれば使い続けられる。

- SideStore のバックグラウンド更新は最初からオン。ただし LocalDevVPN がつながっている必要がある。
- 確実にするなら、ショートカット App → オートメーション →「時刻」（例：毎日 4:00、すぐに実行）→ アクションに SideStore の「Refresh All Apps」。
  - 成功しないという報告もある。そのときは手で：LocalDevVPN をオン → SideStore の My Apps →「Refresh All」。

## 使い方

- 横向き・全画面で開く。画面の端から横にスワイプすると戻る／進む。
- 3本指で長押しすると、再読み込み・トップへ・戻る・進むのメニューが出る。
- アプリの更新：main に push すると新しい版が配布元に出る。SideStore の My Apps で更新する。

## うまくいかないとき

- iOS を更新したら SideStore が動かなくなった：ペアリングファイルを入れ直す。iloader で「Delete Stored Pairing」→「Manage Pairing File」→ SideStore の横の「Place」。
- 無料 Apple ID の制限：同時に有効なアプリは3つまで（SideStore 自身を含む）、新しい App ID は1週間に10個まで。
- 見開きにならない：ページが PC 版の幅広い表示になっているか確認する。なっていなければ STATUS.md に状況を書いて Claude に渡す。

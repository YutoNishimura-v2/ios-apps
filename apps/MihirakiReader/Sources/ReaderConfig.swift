import Foundation

enum ReaderConfig {
    static let startURL = URL(string: "https://www.cmoa.jp/")!

    // Mac 版 Safari の UA。サイトに PC 版（見開き）のビューアを出させるため。
    static let userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15"

    // 見た目の調整用 CSS。空なら何も注入しない。
    static let customCSS = ""
}

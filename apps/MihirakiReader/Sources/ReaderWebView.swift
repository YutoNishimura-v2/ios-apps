import SwiftUI
import WebKit

/// 表示の仕方（UA・全画面・リンクの開き方）だけを変える WebView。ページの中身には触れない。
struct ReaderWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default() // Cookie を保存してログインを保つ
        config.defaultWebpagePreferences.preferredContentMode = .desktop
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        config.allowsInlineMediaPlayback = true
        if let script = Self.cssScript(ReaderConfig.customCSS) {
            config.userContentController.addUserScript(script)
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = ReaderConfig.userAgent
        webView.allowsBackForwardNavigationGestures = true // 端スワイプで戻る・進む
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator

        // 3本指で長押し：再読み込み・トップへ・戻る・進む（全画面で操作の逃げ道がないため）
        let menuGesture = UILongPressGestureRecognizer(
            target: context.coordinator, action: #selector(Coordinator.showMenu(_:)))
        menuGesture.numberOfTouchesRequired = 3
        menuGesture.minimumPressDuration = 0.6
        menuGesture.cancelsTouchesInView = false
        webView.addGestureRecognizer(menuGesture)

        webView.load(URLRequest(url: ReaderConfig.startURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    private static func cssScript(_ css: String) -> WKUserScript? {
        guard !css.isEmpty,
              let data = try? JSONSerialization.data(withJSONObject: [css]),
              let encoded = String(data: data, encoding: .utf8) else { return nil }
        let source = """
        (function () {
          var style = document.createElement('style');
          style.textContent = \(encoded)[0];
          (document.head || document.documentElement).appendChild(style);
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private static let webSchemes: Set<String> = ["http", "https", "about", "blob", "data", "javascript"]

        // target=_blank と window.open は同じ WebView で開く
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame?.isMainFrame != true {
                webView.load(navigationAction.request)
            }
            return nil
        }

        // tel: や App Store のリンクなど、Web 以外は OS に渡す
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               let scheme = url.scheme?.lowercased(),
               !Self.webSchemes.contains(scheme) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        func webView(_ webView: WKWebView,
                     runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            guard present(alert, from: webView) else { return completionHandler() }
        }

        func webView(_ webView: WKWebView,
                     runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "キャンセル", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            guard present(alert, from: webView) else { return completionHandler(false) }
        }

        @objc func showMenu(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began, let webView = gesture.view as? WKWebView else { return }
            let sheet = UIAlertController(title: nil, message: webView.url?.host, preferredStyle: .actionSheet)
            sheet.addAction(UIAlertAction(title: "再読み込み", style: .default) { _ in webView.reload() })
            sheet.addAction(UIAlertAction(title: "トップへ", style: .default) { _ in
                webView.load(URLRequest(url: ReaderConfig.startURL))
            })
            if webView.canGoBack {
                sheet.addAction(UIAlertAction(title: "戻る", style: .default) { _ in webView.goBack() })
            }
            if webView.canGoForward {
                sheet.addAction(UIAlertAction(title: "進む", style: .default) { _ in webView.goForward() })
            }
            sheet.addAction(UIAlertAction(title: "閉じる", style: .cancel))
            let location = gesture.location(in: webView)
            sheet.popoverPresentationController?.sourceView = webView
            sheet.popoverPresentationController?.sourceRect = CGRect(origin: location, size: .zero)
            present(sheet, from: webView)
        }

        @discardableResult
        private func present(_ controller: UIViewController, from view: UIView) -> Bool {
            guard var top = view.window?.rootViewController else { return false }
            while let presented = top.presentedViewController { top = presented }
            top.present(controller, animated: true)
            return true
        }
    }
}

import SwiftUI

@main
struct MihirakiReaderApp: App {
    var body: some Scene {
        WindowGroup {
            ReaderWebView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}

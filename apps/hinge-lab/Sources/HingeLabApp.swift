import SwiftUI

@main
struct HingeLabApp: App {
    @State private var monitor = HingeMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView(monitor: monitor)
                .hingeUpdates(into: monitor)
                .preferredColorScheme(.dark)
        }
    }
}

extension View {
    /// Apple の onHingeChange（iOS 27.1）を HingeMonitor へ流す。アプリでこの API に触るのはここだけ
    func hingeUpdates(into monitor: HingeMonitor) -> some View {
        onHingeChange { _, newContext in
            let t = ProcessInfo.processInfo.systemUptime
            let degrees = newContext.hinge?.angle.degrees
            let status = newContext.hinge.map { describe($0.status) }
            if Thread.isMainThread {
                MainActor.assumeIsolated { monitor.receive(degrees: degrees, status: status, at: t) }
            } else {
                Task { @MainActor in monitor.receive(degrees: degrees, status: status, at: t) }
            }
        }
    }
}

private func describe(_ status: DeviceHinge.Status) -> String {
    if status == .closed { return "closed" }
    if status == .partiallyOpen { return "partiallyOpen" }
    if status == .fullyOpen { return "fullyOpen" }
    return "unknown"
}

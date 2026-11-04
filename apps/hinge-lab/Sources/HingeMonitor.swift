import Foundation
import Observation
import UIKit

/// 開き角度を受け取り、更新頻度・ブレ・最小最大と、手触りの試し（5度ごとの振動、0.5秒止めて確定）をまとめる。
///
/// 角度の出どころは2つ：本物のヒンジ（onHingeChange）と、ヒンジのない端末向けのスライダー。
/// 計測（更新回数・ブレ・最小最大など）は本物のヒンジの値だけで取る。スライダーは手触りの試し（振動・確定）にだけ使う。
@MainActor
@Observable
final class HingeMonitor {
    enum Availability {
        /// まだ一度も更新が来ていない（Duo でも動かすまで来ないことがある）
        case waiting
        case available
        /// 更新は来たが hinge が nil（ヒンジのない端末）
        case unavailable
    }

    // MARK: 本物のヒンジ

    private(set) var availability = Availability.waiting
    private(set) var realAngle: Double?
    private(set) var status = "—"

    // MARK: スライダー

    var useSlider = false
    var sliderAngle = 120.0 {
        didSet { if usingSlider { haptic(for: sliderAngle) } }
    }

    var usingSlider: Bool { useSlider || availability == .unavailable }
    var angle: Double? { usingSlider ? sliderAngle : realAngle }

    // MARK: 計測

    /// 本物のヒンジから届いた更新の総数
    private(set) var totalUpdates = 0
    /// 直近1秒の更新回数
    private(set) var rate = 0
    private(set) var peakRate = 0
    /// 直近1秒の角度の標準偏差。更新が2回未満なら nil
    private(set) var jitter: Double?
    /// 直近1秒の角度の最大と最小の差
    private(set) var spread: Double?
    private(set) var minAngle: Double?
    private(set) var maxAngle: Double?
    /// 連続する2回の更新で変わった角度の最小値（0 は除く）。刻みの細かさの目安
    private(set) var smallestStep: Double?
    /// 更新の間隔の最大値（秒）。動かしている最中の途切れを見る
    private(set) var longestGap: Double?

    @ObservationIgnored private var samples: [(t: TimeInterval, angle: Double)] = []
    @ObservationIgnored private var lastSample: (t: TimeInterval, angle: Double)?

    // MARK: 手触りの試し

    var hapticsEnabled = true
    @ObservationIgnored private var lastBucket: Int?
    /// 振動で本体が揺れて角度が境目を行き来し、振動が続くのを防ぐ。境目からこの幅だけ離れたら次の目盛りとみなす
    static let hapticHysteresis = 0.75

    // MARK: 画面の切り替わり（内側 ↔ 外側）

    private(set) var screenSwitches: [String] = []
    @ObservationIgnored private var lastScreenArea: CGFloat?
    @ObservationIgnored private let tick5 = UIImpactFeedbackGenerator(style: .light)
    @ObservationIgnored private let confirmFeedback = UINotificationFeedbackGenerator()

    var dwellEnabled = true
    /// この幅（±度）の中に 0.5 秒いたら確定
    var dwellTolerance = 1.5
    static let dwellDuration = 0.5
    private(set) var dwellProgress = 0.0
    private(set) var confirmed: [Double] = []
    @ObservationIgnored private var anchor: (t: TimeInterval, angle: Double)?
    @ObservationIgnored private var anchorConfirmed = false

    var targetEnabled = false {
        didSet { if targetEnabled { newTarget() } }
    }
    private(set) var target = 120.0
    private(set) var lastResult: String?
    static let targetTolerance = 3.0

    @ObservationIgnored private var ticker: Task<Void, Never>?

    init() {
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(33))
                self?.tick()
            }
        }
    }

    // MARK: 入力

    /// onHingeChange から。`degrees` が nil ならヒンジのない端末
    func receive(degrees: Double?, status: String?, at t: TimeInterval) {
        totalUpdates += 1
        guard let degrees else {
            availability = .unavailable
            realAngle = nil
            self.status = "ヒンジなし"
            return
        }
        availability = .available
        realAngle = degrees
        self.status = status ?? "—"
        record(degrees, at: t)
        if !usingSlider { haptic(for: degrees) }
    }

    /// 画面の大きさが変わったとき（内側と外側の切り替わり）の角度を残す
    func screenChanged(to size: CGSize) {
        let area = size.width * size.height
        defer { lastScreenArea = area }
        guard let lastScreenArea, abs(area - lastScreenArea) > 1 else { return }
        let direction = area > lastScreenArea ? "外→内" : "内→外"
        let angleText = realAngle.map { String(format: "%.1f°", $0) } ?? "—"
        screenSwitches.insert("\(direction) \(angleText)（\(Int(size.width))×\(Int(size.height))）", at: 0)
        if screenSwitches.count > 6 { screenSwitches.removeLast() }
    }

    private func record(_ degrees: Double, at t: TimeInterval) {
        if let last = lastSample {
            let step = abs(degrees - last.angle)
            if step > 0 { smallestStep = min(smallestStep ?? step, step) }
            let gap = t - last.t
            if gap < 1 { longestGap = max(longestGap ?? gap, gap) }
        }
        lastSample = (t, degrees)
        samples.append((t, degrees))
        samples.removeAll { t - $0.t > 1 }
        minAngle = min(minAngle ?? degrees, degrees)
        maxAngle = max(maxAngle ?? degrees, degrees)
    }

    private func haptic(for degrees: Double) {
        let bucket = Int((degrees / 5).rounded(.down))
        guard let lastBucket else {
            lastBucket = bucket
            return
        }
        guard bucket != lastBucket else { return }
        // 越えた境目からの距離
        let boundary = Double(bucket > lastBucket ? bucket : lastBucket) * 5
        guard abs(degrees - boundary) >= Self.hapticHysteresis else { return }
        if hapticsEnabled { tick5.impactOccurred() }
        self.lastBucket = bucket
    }

    // MARK: 30Hz で回す処理（更新が止まっても時間で進む分）

    private func tick() {
        let now = ProcessInfo.processInfo.systemUptime
        let recent = samples.filter { now - $0.t <= 1 }
        rate = recent.count
        peakRate = max(peakRate, rate)
        jitter = Self.standardDeviation(recent.map(\.angle))
        let angles = recent.map(\.angle)
        spread = angles.count >= 2 ? angles.max()! - angles.min()! : nil

        guard dwellEnabled, let angle else {
            dwellProgress = 0
            anchor = nil
            return
        }
        if let anchor, abs(angle - anchor.angle) <= dwellTolerance {
            dwellProgress = min(1, (now - anchor.t) / Self.dwellDuration)
            if dwellProgress >= 1 && !anchorConfirmed {
                anchorConfirmed = true
                confirm(angle)
            }
        } else {
            anchor = (now, angle)
            anchorConfirmed = false
            dwellProgress = 0
        }
    }

    private func confirm(_ angle: Double) {
        confirmed.insert(angle, at: 0)
        if confirmed.count > 6 { confirmed.removeLast() }
        guard targetEnabled else {
            confirmFeedback.notificationOccurred(.success)
            return
        }
        let diff = angle - target
        if abs(diff) <= Self.targetTolerance {
            confirmFeedback.notificationOccurred(.success)
            lastResult = String(format: "命中 %.0f° (%+.1f°)", target, diff)
            newTarget()
        } else {
            confirmFeedback.notificationOccurred(.warning)
            lastResult = String(format: "はずれ %+.1f°", diff)
        }
    }

    private func newTarget() {
        // 閉じる方向へ大きく動かさなくて済むよう、60〜175度の範囲で今の角度から離しすぎない
        let here = min(max(angle ?? 120, 60), 175)
        var next: Double
        repeat {
            next = Double(Int.random(in: 12...35) * 5)
        } while abs(next - here) < 10 || abs(next - here) > 60
        target = next
    }

    func reset() {
        samples.removeAll()
        lastSample = nil
        peakRate = 0
        minAngle = nil
        maxAngle = nil
        smallestStep = nil
        longestGap = nil
        confirmed.removeAll()
        lastResult = nil
        screenSwitches.removeAll()
    }

    /// 本人が Claude に貼る用の要約
    var summary: String {
        func f(_ v: Double?, _ format: String = "%.1f") -> String { v.map { String(format: format, $0) } ?? "—" }
        return """
        HingeLab \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "") / iOS \(UIDevice.current.systemVersion)
        確定に使った出どころ: \(usingSlider ? "スライダー" : "ヒンジ")、状態: \(status)
        以下の計測はヒンジの値だけ
        角度: \(f(realAngle))°、最小 \(f(minAngle))°、最大 \(f(maxAngle))°
        更新: 直近1秒 \(rate) 回、最大 \(peakRate) 回/秒、総数 \(totalUpdates)
        ブレ(直近1秒の標準偏差): \(f(jitter, "%.2f"))°、直近1秒の幅: \(f(spread, "%.2f"))°、最小の刻み: \(f(smallestStep, "%.3f"))°、最長の間隔: \(f(longestGap.map { $0 * 1000 }, "%.0f")) ms
        画面の切り替わり: \(screenSwitches.joined(separator: ", "))
        確定した角度: \(confirmed.map { String(format: "%.1f", $0) }.joined(separator: ", "))
        """
    }

    static func standardDeviation(_ values: [Double]) -> Double? {
        guard values.count >= 2 else { return nil }
        let mean = values.reduce(0, +) / Double(values.count)
        let variance = values.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(values.count - 1)
        return variance.squareRoot()
    }
}

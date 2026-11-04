import Foundation
import Observation
import UIKit

/// 開き角度を受け取り、更新頻度・ブレ・最小最大と、手触りの試し（5度ごとの振動、0.5秒止めて確定）をまとめる。
///
/// 角度の出どころは2つ：本物のヒンジ（onHingeChange）と、ヒンジのない端末向けのスライダー。
/// どちらも同じ `record` を通るので、計測と手触りの試しはスライダーでも動く。表示では出どころを必ず示す。
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
        didSet { if usingSlider { record(sliderAngle, real: false) } }
    }

    var usingSlider: Bool { useSlider || availability == .unavailable }
    var angle: Double? { usingSlider ? sliderAngle : realAngle }

    // MARK: 計測

    /// 本物のヒンジから届いた更新の総数
    private(set) var totalUpdates = 0
    /// 直近1秒の更新回数（いま使っている出どころの分）
    private(set) var rate = 0
    private(set) var peakRate = 0
    /// 直近1秒の角度の標準偏差。更新が2回未満なら nil
    private(set) var jitter: Double?
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
        if !usingSlider { record(degrees, real: true, at: t) }
    }

    private func record(_ degrees: Double, real: Bool, at t: TimeInterval = ProcessInfo.processInfo.systemUptime) {
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

        let bucket = Int((degrees / 5).rounded(.down))
        if hapticsEnabled, let lastBucket, bucket != lastBucket { tick5.impactOccurred() }
        lastBucket = bucket
    }

    // MARK: 30Hz で回す処理（更新が止まっても時間で進む分）

    private func tick() {
        let now = ProcessInfo.processInfo.systemUptime
        let recent = samples.filter { now - $0.t <= 1 }
        rate = recent.count
        peakRate = max(peakRate, rate)
        jitter = Self.standardDeviation(recent.map(\.angle))

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
    }

    /// 本人が Claude に貼る用の要約
    var summary: String {
        func f(_ v: Double?, _ format: String = "%.1f") -> String { v.map { String(format: format, $0) } ?? "—" }
        return """
        HingeLab \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "") / iOS \(UIDevice.current.systemVersion)
        出どころ: \(usingSlider ? "スライダー" : "ヒンジ")、状態: \(status)
        角度: \(f(angle))°、最小 \(f(minAngle))°、最大 \(f(maxAngle))°
        更新: 直近1秒 \(rate) 回、最大 \(peakRate) 回/秒、総数 \(totalUpdates)
        ブレ(直近1秒の標準偏差): \(f(jitter, "%.2f"))°、最小の刻み: \(f(smallestStep, "%.2f"))°、最長の間隔: \(f(longestGap.map { $0 * 1000 }, "%.0f")) ms
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

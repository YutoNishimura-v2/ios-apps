import SwiftUI

struct ContentView: View {
    @Bindable var monitor: HingeMonitor
    @State private var copied = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                header
                angleDisplay
                if monitor.usingSlider { slider }
                stats
                controls
                if monitor.dwellEnabled { dwell }
                buttons
            }
            .padding(24)
            .frame(maxWidth: 720)
            .frame(maxWidth: .infinity)
        }
        .background(Color(red: 0.07, green: 0.08, blue: 0.12))
        .onGeometryChange(for: CGSize.self) { $0.size } action: { monitor.screenChanged(to: $0) }
    }

    private var header: some View {
        HStack {
            Text("HingeLab").font(.headline)
            Spacer()
            Label(sourceText, systemImage: monitor.usingSlider ? "slider.horizontal.3" : "book")
                .font(.subheadline)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(monitor.usingSlider ? Color.orange.opacity(0.3) : Color.green.opacity(0.25), in: Capsule())
        }
    }

    private var sourceText: String {
        if monitor.usingSlider {
            return monitor.availability == .unavailable ? "ヒンジなし・スライダー" : "スライダー"
        }
        switch monitor.availability {
        case .waiting: return "ヒンジ 更新待ち"
        case .available: return "ヒンジ \(monitor.status)"
        case .unavailable: return "ヒンジなし"
        }
    }

    private var angleDisplay: some View {
        VStack(spacing: 8) {
            HingeDiagram(angle: monitor.angle)
                .frame(height: 140)
            Text(monitor.angle.map { String(format: "%.1f°", $0) } ?? "—")
                .font(.system(size: 88, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.identity)
            if monitor.availability == .waiting && !monitor.usingSlider {
                Text("まだ更新が来ていません。ゆっくり少しだけ動かしてみてください。")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Text("計測の数値はヒンジの値だけで取ります（スライダーは振動・確定の試し用）")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var slider: some View {
        VStack(alignment: .leading) {
            Text("スライダーで代用（0〜180°）").font(.footnote).foregroundStyle(.secondary)
            Slider(value: $monitor.sliderAngle, in: 0...180)
        }
    }

    private var stats: some View {
        Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 8) {
            row("更新（直近1秒）", "\(monitor.rate) 回", "最大 \(monitor.peakRate) 回/秒")
            row("ブレ（直近1秒の標準偏差）", format(monitor.jitter, "%.2f°"), monitor.jitter == nil ? "更新2回未満" : "")
            row("直近1秒の幅（最大−最小）", format(monitor.spread, "%.2f°"), "")
            row("最小・最大", "\(format(monitor.minAngle, "%.1f°")) 〜 \(format(monitor.maxAngle, "%.1f°"))", "")
            row("最小の刻み", format(monitor.smallestStep, "%.3f°"), "")
            row("最長の更新間隔", format(monitor.longestGap.map { $0 * 1000 }, "%.0f ms"), "1秒未満の間だけ")
            row("ヒンジからの更新総数", "\(monitor.totalUpdates)", "")
            row("画面の切り替わり", monitor.screenSwitches.first ?? "—", "")
        }
        .font(.callout)
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14))
    }

    private func row(_ title: String, _ value: String, _ note: String) -> some View {
        GridRow {
            Text(title).foregroundStyle(.secondary)
            Text(value).monospacedDigit().bold()
            Text(note).font(.caption).foregroundStyle(.secondary)
        }
    }

    private var controls: some View {
        VStack(spacing: 4) {
            Toggle("5度ごとに軽く振動", isOn: $monitor.hapticsEnabled)
            Toggle("止めて確定（\(String(format: "±%.1f", monitor.dwellTolerance))°を0.5秒）", isOn: $monitor.dwellEnabled)
            if monitor.dwellEnabled {
                Picker("確定の幅", selection: $monitor.dwellTolerance) {
                    Text("±0.5°").tag(0.5)
                    Text("±1°").tag(1.0)
                    Text("±1.5°").tag(1.5)
                    Text("±3°").tag(3.0)
                }
                .pickerStyle(.segmented)
                Toggle("目標の角度に合わせる（±3°で命中）", isOn: $monitor.targetEnabled)
            }
            if monitor.availability != .unavailable {
                Toggle("スライダーを使う", isOn: $monitor.useSlider)
            }
        }
    }

    private var dwell: some View {
        HStack(spacing: 20) {
            ZStack {
                Circle().stroke(.white.opacity(0.12), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: monitor.dwellProgress)
                    .stroke(monitor.dwellProgress >= 1 ? Color.green : Color.orange,
                            style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                if monitor.targetEnabled {
                    Text(String(format: "%.0f°", monitor.target)).font(.title3.bold()).monospacedDigit()
                }
            }
            .frame(width: 72, height: 72)
            VStack(alignment: .leading, spacing: 4) {
                if monitor.targetEnabled {
                    Text("目標 \(String(format: "%.0f°", monitor.target)) に合わせて止める").font(.callout)
                    if let result = monitor.lastResult { Text(result).font(.callout.bold()) }
                }
                Text("確定: " + (monitor.confirmed.isEmpty ? "—" : monitor.confirmed.map { String(format: "%.1f°", $0) }.joined(separator: "  ")))
                    .font(.footnote).monospacedDigit().foregroundStyle(.secondary)
            }
            Spacer()
        }
    }

    private var buttons: some View {
        HStack {
            Button("記録をリセット", role: .destructive) { monitor.reset() }
            Spacer()
            Button(copied ? "コピーしました" : "結果をコピー") {
                UIPasteboard.general.string = monitor.summary
                copied = true
                Task { try? await Task.sleep(for: .seconds(2)); copied = false }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private func format(_ value: Double?, _ format: String) -> String {
        value.map { String(format: format, $0) } ?? "—"
    }
}

/// 横から見た本体。下の板は固定、上の板が開き角度だけ開く
struct HingeDiagram: View {
    let angle: Double?

    var body: some View {
        Canvas { context, size in
            let pivot = CGPoint(x: size.width / 2, y: size.height - 10)
            let length = min(size.width / 2 - 10, size.height - 20)
            var base = Path()
            base.move(to: pivot)
            base.addLine(to: CGPoint(x: pivot.x + length, y: pivot.y))
            context.stroke(base, with: .color(.white.opacity(0.5)), style: StrokeStyle(lineWidth: 6, lineCap: .round))
            guard let angle else { return }
            let radians = angle * .pi / 180
            var lid = Path()
            lid.move(to: pivot)
            lid.addLine(to: CGPoint(x: pivot.x + cos(radians) * length, y: pivot.y - sin(radians) * length))
            context.stroke(lid, with: .color(.orange), style: StrokeStyle(lineWidth: 6, lineCap: .round))
            var arc = Path()
            arc.addArc(center: pivot, radius: 28, startAngle: .zero, endAngle: .radians(-radians), clockwise: true)
            context.stroke(arc, with: .color(.orange.opacity(0.6)), lineWidth: 2)
        }
    }
}

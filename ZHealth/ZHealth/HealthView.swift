import SwiftUI
import Charts

struct HealthView: View {
    @EnvironmentObject var store: DataStore
    @State private var section: Section = .sleep

    enum Section: String, CaseIterable { case sleep = "Sleep", heart = "Heart", load = "Load" }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Picker("", selection: $section) {
                        ForEach(Section.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 4)

                    switch section {
                    case .sleep: sleep
                    case .heart: heart
                    case .load: load
                    }
                }
                .padding(16)
            }
            .pageBackground()
            .navigationTitle("Health")
            .refreshable { await store.load() }
        }
    }

    private var sleep: some View {
        let data = store.wellness.suffix(60)
        let last = store.wellness.reversed().first { ($0.sleepSecs ?? 0) > 0 }
        return VStack(spacing: 14) {
            if let last {
                HStack(spacing: 12) {
                    StatTile(label: "Last night", value: formatHM(last.sleepSecs), unit: nil, trend: nil, color: Theme.sleep)
                    StatTile(label: "Score", value: last.sleepScore.map { String(format: "%.0f", $0) } ?? "—", unit: nil, trend: nil, color: Theme.sleep)
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                SectionTitle(text: "Sleep duration · 60d")
                Chart(data, id: \.day) { w in
                    BarMark(x: .value("Day", w.date, unit: .day),
                            y: .value("Hours", Double(w.sleepSecs ?? 0)/3600))
                        .foregroundStyle(Theme.sleep)
                    RuleMark(y: .value("Target", 8))
                        .foregroundStyle(Theme.text3.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [3,3]))
                }
                .frame(height: 200)
            }
            .tile()
        }
    }

    private var heart: some View {
        let data = store.wellness.suffix(90)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Resting heart rate · 90d")
            Chart(data, id: \.day) { w in
                LineMark(x: .value("Day", w.date, unit: .day),
                         y: .value("RHR", w.restingHR ?? 0))
                    .foregroundStyle(Theme.cardio)
                    .interpolationMethod(.monotone)
                PointMark(x: .value("Day", w.date, unit: .day),
                          y: .value("RHR", w.restingHR ?? 0))
                    .foregroundStyle(Theme.cardio.opacity(0.6))
                    .symbolSize(20)
            }
            .frame(height: 240)
            .chartYScale(domain: rhrDomain())
        }
        .tile()
    }

    private var load: some View {
        let data = store.wellness.suffix(90)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Fitness (CTL) vs Fatigue (ATL) · 90d")
            Chart {
                ForEach(data, id: \.day) { w in
                    LineMark(x: .value("Day", w.date, unit: .day),
                             y: .value("CTL", w.ctl),
                             series: .value("Series", "Fitness"))
                        .foregroundStyle(Theme.train)
                    LineMark(x: .value("Day", w.date, unit: .day),
                             y: .value("ATL", w.atl),
                             series: .value("Series", "Fatigue"))
                        .foregroundStyle(Theme.cardio)
                }
            }
            .chartForegroundStyleScale([
                "Fitness": Theme.train, "Fatigue": Theme.cardio
            ])
            .frame(height: 240)
        }
        .tile()
    }

    private func rhrDomain() -> ClosedRange<Int> {
        let vals = store.wellness.compactMap { $0.restingHR }
        guard let mn = vals.min(), let mx = vals.max() else { return 40...80 }
        return max(30, mn-3)...(mx+3)
    }
}

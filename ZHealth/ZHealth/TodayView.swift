import SwiftUI
import Charts

struct TodayView: View {
    @EnvironmentObject var store: DataStore
    @EnvironmentObject var auth: Supabase

    var body: some View {
        NavigationStack {
            ScrollView {
                if store.loading && store.wellness.isEmpty {
                    ProgressView("Pulling your health data…")
                        .foregroundStyle(Theme.text2)
                        .padding(.top, 80)
                } else if let err = store.error {
                    errorBox(err)
                } else {
                    content
                }
            }
            .pageBackground()
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Refresh") { Task { await store.load() } }
                        Button("Sign out", role: .destructive) { auth.signOut() }
                    } label: { Image(systemName: "ellipsis.circle") }
                }
            }
            .refreshable { await store.load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        let last7 = Array(store.wellness.suffix(7))
        let prev7 = Array(store.wellness.dropLast(7).suffix(7))

        let stepsCur = avgInt(last7.map { $0.steps })
        let stepsPrev = avgInt(prev7.map { $0.steps })
        let sleepCur = avgInt(last7.map { $0.sleepSecs })
        let sleepPrev = avgInt(prev7.map { $0.sleepSecs })
        let rhrCur = avgInt(last7.map { $0.restingHR })
        let rhrPrev = avgInt(prev7.map { $0.restingHR })
        let weightCur = avgDouble(last7.map { $0.weight })
        let weightPrev = avgDouble(prev7.map { $0.weight })
        let ctl = store.today?.ctl
        let atl = store.today?.atl

        VStack(spacing: 16) {
            HStack {
                Text("Synced \(store.lastSyncLabel())")
                    .font(.caption).foregroundStyle(Theme.text3)
                Spacer()
            }
            .padding(.horizontal, 4)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                StatTile(label: "Steps", value: fmt(stepsCur), unit: "/d", trend: trendPct(current: stepsCur, prev: stepsPrev), color: Theme.steps)
                StatTile(label: "Sleep", value: hours(sleepCur), unit: "h", trend: trendPct(current: sleepCur, prev: sleepPrev), color: Theme.sleep)
                StatTile(label: "Resting HR", value: fmt(rhrCur), unit: "bpm", trend: trendPct(current: rhrCur, prev: rhrPrev).map { -$0 }, color: Theme.cardio)
                StatTile(label: "Weight", value: weightCur.map { String(format: "%.1f", $0) } ?? "—", unit: "kg", trend: trendPct(current: weightCur, prev: weightPrev).map { -$0 }, color: Theme.recovery)
                StatTile(label: "Fitness (CTL)", value: ctl.map { String(format: "%.0f", $0) } ?? "—", unit: nil, trend: nil, color: Theme.train)
                StatTile(label: "Fatigue (ATL)", value: atl.map { String(format: "%.0f", $0) } ?? "—", unit: nil, trend: nil, color: Theme.cardio)
            }

            stepsChart
            sleepChart
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }

    private var stepsChart: some View {
        let data = store.wellness.suffix(30)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Steps · last 30 days")
            Chart(data, id: \.day) { w in
                BarMark(x: .value("Day", w.date, unit: .day),
                        y: .value("Steps", w.steps ?? 0))
                    .foregroundStyle(Theme.steps)
                    .cornerRadius(2)
            }
            .frame(height: 160)
            .chartYAxis { AxisMarks(values: .automatic(desiredCount: 3)) }
            .chartXAxis { AxisMarks(values: .stride(by: .day, count: 7)) }
        }
        .tile()
    }

    private var sleepChart: some View {
        let data = store.wellness.suffix(30)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Sleep · last 30 days")
            Chart(data, id: \.day) { w in
                BarMark(x: .value("Day", w.date, unit: .day),
                        y: .value("Hours", Double(w.sleepSecs ?? 0) / 3600.0))
                    .foregroundStyle(Theme.sleep)
                    .cornerRadius(2)
                RuleMark(y: .value("Target", 8))
                    .foregroundStyle(Theme.text3.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
            }
            .frame(height: 160)
            .chartYAxis { AxisMarks(values: .automatic(desiredCount: 3)) }
            .chartXAxis { AxisMarks(values: .stride(by: .day, count: 7)) }
        }
        .tile()
    }

    private func errorBox(_ msg: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Couldn't load data").font(.headline).foregroundStyle(Theme.cardio)
            Text(msg).font(.footnote).foregroundStyle(Theme.text2).fixedSize(horizontal: false, vertical: true)
            Button("Retry") { Task { await store.load() } }
                .buttonStyle(.borderedProminent).tint(Theme.cardio)
        }
        .tile()
        .padding(16)
    }

    private func avgInt(_ vals: [Int?]) -> Double? {
        let f = vals.compactMap { $0.map(Double.init) }
        guard !f.isEmpty else { return nil }
        return f.reduce(0,+)/Double(f.count)
    }
    private func avgDouble(_ vals: [Double?]) -> Double? {
        let f = vals.compactMap { $0 }
        guard !f.isEmpty else { return nil }
        return f.reduce(0,+)/Double(f.count)
    }
    private func fmt(_ v: Double?) -> String {
        guard let v else { return "—" }
        if v >= 1000 { return String(format: "%.1fk", v/1000) }
        return String(format: "%.0f", v)
    }
    private func hours(_ secs: Double?) -> String {
        guard let s = secs else { return "—" }
        return String(format: "%.1f", s/3600)
    }
}

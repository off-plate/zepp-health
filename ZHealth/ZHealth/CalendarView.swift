import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var store: DataStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    legend
                    grid
                }
                .padding(16)
            }
            .pageBackground()
            .navigationTitle("Calendar")
            .refreshable { await store.load() }
        }
    }

    private var legend: some View {
        HStack(spacing: 6) {
            Text("Less").font(.caption2).foregroundStyle(Theme.text3)
            ForEach(0..<6) { lvl in
                RoundedRectangle(cornerRadius: 2)
                    .fill(color(for: lvl))
                    .frame(width: 12, height: 12)
            }
            Text("More").font(.caption2).foregroundStyle(Theme.text3)
            Spacer()
        }
    }

    private var grid: some View {
        let days = buildDays()
        let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
        return VStack(alignment: .leading, spacing: 10) {
            SectionTitle(text: "Last 365 days")
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(days, id: \.date) { d in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(color(for: d.level))
                        .aspectRatio(1, contentMode: .fit)
                }
            }
        }
        .tile()
    }

    private struct Day { let date: Date; let level: Int }

    private func buildDays() -> [Day] {
        let byDay: [String: Int] = store.workouts.reduce(into: [:]) { acc, w in
            let k = isoDay(w.date)
            let load = w.load ?? 0
            acc[k] = max(acc[k] ?? 0, load)
        }
        var out: [Day] = []
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        for i in stride(from: 364, through: 0, by: -1) {
            let d = cal.date(byAdding: .day, value: -i, to: today)!
            let v = byDay[isoDay(d)] ?? 0
            let lvl: Int
            switch v {
            case let x where x > 80: lvl = 5
            case let x where x > 60: lvl = 4
            case let x where x > 40: lvl = 3
            case let x where x > 20: lvl = 2
            case let x where x > 0: lvl = 1
            default: lvl = 0
            }
            out.append(Day(date: d, level: lvl))
        }
        return out
    }

    private func isoDay(_ d: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; f.timeZone = .current
        return f.string(from: d)
    }

    private func color(for level: Int) -> Color {
        switch level {
        case 0: return Theme.surfaceStrong
        case 1: return Theme.train.opacity(0.25)
        case 2: return Theme.train.opacity(0.45)
        case 3: return Theme.train.opacity(0.65)
        case 4: return Theme.train.opacity(0.85)
        default: return Theme.cardio
        }
    }
}

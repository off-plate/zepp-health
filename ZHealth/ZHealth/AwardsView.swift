import SwiftUI

struct AwardsView: View {
    @EnvironmentObject var store: DataStore

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(awards, id: \.id) { a in AwardTile(award: a) }
                }
                .padding(16)
            }
            .pageBackground()
            .navigationTitle("Awards")
            .refreshable { await store.load() }
        }
    }

    private var awards: [Award] {
        let totalActivities = store.workouts.count
        let totalRunKm = store.workouts.filter { $0.type == .run }.reduce(0) { $0 + $1.distanceKm }
        let totalSteps = store.wellness.reduce(0) { $0 + ($1.steps ?? 0) }
        let totalElevation = store.workouts.reduce(0) { $0 + $1.elevation }

        return [
            Award(id: "wo10", name: "10 Workouts", current: Double(totalActivities), goal: 10, color: Theme.sleep, icon: "medal.fill"),
            Award(id: "wo100", name: "100 Workouts", current: Double(totalActivities), goal: 100, color: Theme.sleep, icon: "medal.fill"),
            Award(id: "steps100k", name: "100k Steps", current: Double(totalSteps), goal: 100_000, color: Theme.steps, icon: "figure.walk"),
            Award(id: "steps1m", name: "1M Steps", current: Double(totalSteps), goal: 1_000_000, color: Theme.steps, icon: "figure.walk"),
            Award(id: "run100", name: "100 km Run", current: totalRunKm, goal: 100, color: Theme.cardio, icon: "figure.run"),
            Award(id: "run1000", name: "1000 km Run", current: totalRunKm, goal: 1000, color: Theme.cardio, icon: "figure.run"),
            Award(id: "everest", name: "Everested", current: Double(totalElevation), goal: 8848, color: Theme.recovery, icon: "mountain.2.fill")
        ]
    }
}

private struct Award {
    let id: String
    let name: String
    let current: Double
    let goal: Double
    let color: Color
    let icon: String
    var progress: Double { min(1, current / goal) }
    var unlocked: Bool { current >= goal }
}

private struct AwardTile: View {
    let award: Award
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: award.icon)
                .font(.title)
                .foregroundStyle(award.unlocked ? award.color : Theme.text3)
                .frame(width: 56, height: 56)
                .background(Theme.surfaceStrong)
                .clipShape(Circle())
            Text(award.name).font(.caption).foregroundStyle(Theme.text1).bold().multilineTextAlignment(.center)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2).fill(Theme.surfaceStrong)
                    RoundedRectangle(cornerRadius: 2).fill(award.color)
                        .frame(width: geo.size.width * award.progress)
                }
            }
            .frame(height: 4)
            Text(award.unlocked ? "Earned" : String(format: "%.0f%%", award.progress * 100))
                .font(.caption2).foregroundStyle(award.unlocked ? award.color : Theme.text3)
        }
        .frame(maxWidth: .infinity)
        .padding(14)
        .background(Theme.surface)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.hairline, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

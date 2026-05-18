import SwiftUI

struct WorkoutsView: View {
    @EnvironmentObject var store: DataStore

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(store.workouts) { w in
                        NavigationLink(value: w) {
                            WorkoutRow(w: w)
                        }
                        .buttonStyle(.plain)
                    }
                    if store.workouts.isEmpty {
                        Text(store.loading ? "Loading…" : "No workouts yet.")
                            .foregroundStyle(Theme.text3)
                            .padding(.top, 80)
                    }
                }
                .padding(16)
            }
            .pageBackground()
            .navigationTitle("Workouts")
            .navigationDestination(for: Workout.self) { WorkoutDetailView(w: $0) }
            .refreshable { await store.load() }
        }
    }
}

private struct WorkoutRow: View {
    let w: Workout
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconForType(w.type))
                .font(.title3)
                .foregroundStyle(accentForType(w.type))
                .frame(width: 40, height: 40)
                .background(Theme.surfaceStrong)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(w.name).foregroundStyle(Theme.text1).font(.subheadline).bold()
                Text(dateLabel(w.date)).font(.caption2).foregroundStyle(Theme.text3)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(w.durationMin) min").font(.subheadline).foregroundStyle(Theme.text1)
                if w.distanceKm > 0 {
                    Text(String(format: "%.1f km", w.distanceKm)).font(.caption2).foregroundStyle(Theme.text3)
                } else if let hr = w.avgHR {
                    Text("\(hr) bpm").font(.caption2).foregroundStyle(Theme.text3)
                }
            }
        }
        .padding(12)
        .background(Theme.surface)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.hairline, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct WorkoutDetailView: View {
    let w: Workout
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 12) {
                    Image(systemName: iconForType(w.type))
                        .font(.title2).foregroundStyle(accentForType(w.type))
                    VStack(alignment: .leading) {
                        Text(w.name).font(.title2).bold().foregroundStyle(Theme.text1)
                        Text(dateLabel(w.date)).font(.caption).foregroundStyle(Theme.text3)
                    }
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    metric("Duration", "\(w.durationMin) min")
                    if w.distanceKm > 0 { metric("Distance", String(format: "%.2f km", w.distanceKm)) }
                    if let hr = w.avgHR { metric("Avg HR", "\(hr) bpm") }
                    if let hr = w.maxHR { metric("Max HR", "\(hr) bpm") }
                    if let c = w.calories { metric("Calories", "\(c) kcal") }
                    if let l = w.load { metric("Load", "\(l)") }
                    if w.elevation > 0 { metric("Elevation", "\(w.elevation) m") }
                    if let cad = w.avgCadence { metric("Cadence", "\(cad)") }
                }
                if let desc = w.description, !desc.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Notes").font(.caption).foregroundStyle(Theme.text3)
                        Text(desc).foregroundStyle(Theme.text2).font(.subheadline)
                    }
                    .padding(.top, 8)
                }
            }
            .padding(16)
        }
        .pageBackground()
        .navigationBarTitleDisplayMode(.inline)
    }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2).tracking(1.2).foregroundStyle(Theme.text3)
            Text(value).foregroundStyle(Theme.text1).font(.headline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Theme.surface)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.hairline, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private func iconForType(_ t: WorkoutType) -> String {
    switch t {
    case .run: return "figure.run"
    case .ride: return "bicycle"
    case .swim: return "figure.pool.swim"
    case .walk: return "figure.walk"
    case .hike: return "figure.hiking"
    case .strength: return "dumbbell.fill"
    case .yoga: return "figure.yoga"
    case .workout: return "bolt.heart.fill"
    }
}

private func accentForType(_ t: WorkoutType) -> Color {
    switch t {
    case .run: return Theme.cardio
    case .ride, .hike: return Theme.train
    case .swim: return Theme.recovery
    case .walk: return Theme.steps
    case .strength: return Theme.sleep
    case .yoga: return Theme.steps
    case .workout: return Theme.cardio
    }
}

private func dateLabel(_ d: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "EEE d MMM · HH:mm"
    return f.string(from: d)
}

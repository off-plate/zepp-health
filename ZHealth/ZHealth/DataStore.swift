import Foundation
import SwiftUI

@MainActor
final class DataStore: ObservableObject {
    @Published var wellness: [Wellness] = []
    @Published var workouts: [Workout] = []
    @Published var lastSync: Date?
    @Published var loading = false
    @Published var error: String?

    private let isoFmt: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private let dayFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    func load() async {
        loading = true
        error = nil
        defer { loading = false }
        do {
            let oldest = Calendar.current.date(byAdding: .day, value: -365, to: Date())!
            let oldestDay = dayFmt.string(from: oldest)
            let oldestTS = ISO8601DateFormatter().string(from: oldest)

            async let wRaw: [WellnessRow] = Supabase.shared.get(
                "/rest/v1/zepp_wellness?select=*&day=gte.\(oldestDay)&order=day.asc&limit=400",
                as: [WellnessRow].self
            )
            async let aRaw: [ActivityRow] = Supabase.shared.get(
                "/rest/v1/zepp_activities?select=*&start_date=gte.\(oldestTS)&order=start_date.desc&limit=500",
                as: [ActivityRow].self
            )
            async let lRaw: [SyncLogRow] = Supabase.shared.get(
                "/rest/v1/zepp_sync_log?select=*&order=ran_at.desc&limit=1",
                as: [SyncLogRow].self
            )

            let (w, a, l) = try await (wRaw, aRaw, lRaw)
            self.wellness = w.map(mapWellness)
            self.workouts = a.map(mapWorkout)
            if let r = l.first { self.lastSync = parseDate(r.ran_at) }
        } catch let e as APIError {
            self.error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func mapWellness(_ r: WellnessRow) -> Wellness {
        let d = dayFmt.date(from: r.day) ?? Date()
        return Wellness(
            day: r.day, date: d,
            restingHR: r.resting_hr, sleepSecs: r.sleep_secs,
            sleepScore: r.sleep_score, sleepQuality: r.sleep_quality,
            steps: r.steps, weight: r.weight,
            ctl: r.ctl ?? 0, atl: r.atl ?? 0, rampRate: r.ramp_rate ?? 0
        )
    }

    private func mapWorkout(_ r: ActivityRow) -> Workout {
        let type = WorkoutType.from(r.type ?? r.sub_type)
        let durSec = r.moving_time ?? r.elapsed_time ?? 0
        let dateStr = r.start_date_local ?? r.start_date
        let date = parseDate(dateStr) ?? Date()
        return Workout(
            id: r.id,
            type: type,
            subType: r.sub_type,
            name: r.name ?? type.rawValue.capitalized,
            description: r.description,
            date: date,
            durationMin: durSec / 60,
            distanceKm: (r.distance ?? 0) / 1000,
            elevation: Int(r.total_elevation_gain ?? 0),
            avgHR: r.average_heartrate.map { Int($0.rounded()) },
            maxHR: r.max_heartrate,
            avgCadence: r.average_cadence.map { Int($0.rounded()) },
            calories: r.calories.map { Int($0.rounded()) },
            trimp: r.trimp.map { Int($0.rounded()) },
            load: r.icu_training_load.map { Int($0.rounded()) },
            device: r.device_name
        )
    }

    private func parseDate(_ s: String) -> Date? {
        if let d = isoFmt.date(from: s) { return d }
        let alt = ISO8601DateFormatter()
        alt.formatOptions = [.withInternetDateTime]
        return alt.date(from: s)
    }

    // MARK: - Derived helpers

    var today: Wellness? { wellness.last }

    func avg<T: BinaryFloatingPoint>(_ keyPath: KeyPath<Wellness, T?>, lastDays: Int) -> Double? {
        let slice = wellness.suffix(lastDays).compactMap { $0[keyPath: keyPath].map { Double($0) } }
        guard !slice.isEmpty else { return nil }
        return slice.reduce(0, +) / Double(slice.count)
    }

    func avgInt(_ keyPath: KeyPath<Wellness, Int?>, lastDays: Int) -> Double? {
        let slice = wellness.suffix(lastDays).compactMap { $0[keyPath: keyPath].map(Double.init) }
        guard !slice.isEmpty else { return nil }
        return slice.reduce(0, +) / Double(slice.count)
    }

    func lastSyncLabel() -> String {
        guard let d = lastSync else { return "Not synced" }
        let diff = Int(Date().timeIntervalSince(d))
        let m = diff / 60
        if m < 1 { return "just now" }
        if m < 60 { return "\(m)m ago" }
        let h = m / 60
        if h < 24 { return "\(h)h ago" }
        return "\(h / 24)d ago"
    }
}

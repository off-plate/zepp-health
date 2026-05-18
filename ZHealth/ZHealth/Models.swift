import Foundation

struct Wellness: Identifiable, Hashable {
    var id: String { day }
    let day: String
    let date: Date
    let restingHR: Int?
    let sleepSecs: Int?
    let sleepScore: Double?
    let sleepQuality: Int?
    let steps: Int?
    let weight: Double?
    let ctl: Double
    let atl: Double
    var tsb: Double { ctl - atl }
    let rampRate: Double
}

struct WellnessRow: Decodable {
    let user_id: String
    let day: String
    let resting_hr: Int?
    let sleep_secs: Int?
    let sleep_score: Double?
    let sleep_quality: Int?
    let steps: Int?
    let weight: Double?
    let ctl: Double?
    let atl: Double?
    let ramp_rate: Double?
}

enum WorkoutType: String {
    case run, ride, swim, walk, hike, strength, yoga, workout
    static func from(_ raw: String?) -> WorkoutType {
        guard let r = raw?.lowercased().replacingOccurrences(of: " ", with: "") else { return .workout }
        if r.contains("run") { return .run }
        if r.contains("ride") || r.contains("bike") || r.contains("cycl") { return .ride }
        if r.contains("swim") { return .swim }
        if r.contains("walk") { return .walk }
        if r.contains("hike") { return .hike }
        if r.contains("strength") || r.contains("weight") { return .strength }
        if r.contains("yoga") || r.contains("stretch") { return .yoga }
        return .workout
    }
}

struct Workout: Identifiable, Hashable {
    let id: String
    let type: WorkoutType
    let subType: String?
    let name: String
    let description: String?
    let date: Date
    let durationMin: Int
    let distanceKm: Double
    let elevation: Int
    let avgHR: Int?
    let maxHR: Int?
    let avgCadence: Int?
    let calories: Int?
    let trimp: Int?
    let load: Int?
    let device: String?
}

struct ActivityRow: Decodable {
    let id: String
    let user_id: String
    let start_date: String
    let start_date_local: String?
    let type: String?
    let sub_type: String?
    let name: String?
    let description: String?
    let device_name: String?
    let moving_time: Int?
    let elapsed_time: Int?
    let distance: Double?
    let total_elevation_gain: Double?
    let average_heartrate: Double?
    let max_heartrate: Int?
    let average_cadence: Double?
    let calories: Double?
    let trimp: Double?
    let icu_training_load: Double?
}

struct SyncLogRow: Decodable {
    let ran_at: String
    let ok: Bool
}

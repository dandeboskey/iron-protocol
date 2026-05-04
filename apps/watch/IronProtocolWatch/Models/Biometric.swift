import Foundation

/// Hand-mirror of `BiometricEntrySchema` from
/// `packages/api-contract/src/schemas/dashboard.ts`.
///
/// Field correspondence:
///   id, athleteId, source                 -> String
///   date, createdAt                       -> String (ISO; transform downstream)
///   hrvMs, sleepHours, restingHeartRate,
///   respiratoryRate, bodyTemperature,
///   bodyweightLbs                         -> Double?
///   sleepQuality, mood, soreness,
///   energy, stress                        -> Int?
///   notes                                 -> String?
struct BiometricEntry: Codable, Identifiable, Equatable {
    let id: String
    let athleteId: String
    let date: String
    let source: String
    let hrvMs: Double?
    let sleepHours: Double?
    let sleepQuality: Int?
    let mood: Int?
    let soreness: Int?
    let energy: Int?
    let stress: Int?
    let notes: String?
    let restingHeartRate: Double?
    let respiratoryRate: Double?
    let bodyTemperature: Double?
    let bodyweightLbs: Double?
    let createdAt: String
}

/// Mirrors `ReadinessSchema`. Watch UI cares mostly about `score` and
/// `coefficient` for the glance; `flags` is shown as a compact strip.
struct Readiness: Codable, Equatable {
    struct Breakdown: Codable, Equatable {
        let hrvComponent: Double
        let sleepComponent: Double
        let subjectiveComponent: Double
        let rhrComponent: Double?
    }
    let score: Double
    let coefficient: Double
    let flags: [String]
    let breakdown: Breakdown
}

/// Mirrors `DashboardResponseSchema` -> `{ entries, readiness }`.
struct DashboardResponse: Codable, Equatable {
    let entries: [BiometricEntry]
    let readiness: Readiness?
}

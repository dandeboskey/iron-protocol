import Foundation

/// Hand-mirror of `packages/api-contract/src/schemas/checkin.ts`.
///
/// SwiftMirror correspondence (TS Zod -> Swift Codable):
///
///   BiometricCheckinRequestSchema -> BiometricCheckinRequest
///     hrvMs          number? | null  -> hrvMs         : Double?
///     sleepHours     number? | null  -> sleepHours    : Double?
///     sleepQuality   int?   (1-10)   -> sleepQuality  : Int?
///     mood           int?   (1-10)   -> mood          : Int?
///     soreness       int?   (1-10)   -> soreness      : Int?
///     energy         int?   (1-10)   -> energy        : Int?
///     stress         int?   (1-10)   -> stress        : Int?
///     notes          string? | null  -> notes         : String?
///
///   BiometricCheckinResponseSchema -> BiometricCheckinResponse
///     `{ entry: BiometricEntry }` — `BiometricEntry` already lives in
///     Biometric.swift.
///
/// IMPORTANT: the current backend route does NOT read `restingHeartRate`
/// from the body. The TS contract omits it for the same reason; this Swift
/// mirror omits it too. When the backend route is extended to forward RHR
/// (likely tied to HealthKit Phase 2), widen all three layers in one PR.
struct BiometricCheckinRequest: Codable, Equatable {
    var hrvMs: Double?
    var sleepHours: Double?
    var sleepQuality: Int?
    var mood: Int?
    var soreness: Int?
    var energy: Int?
    var stress: Int?
    var notes: String?

    init(
        hrvMs: Double? = nil,
        sleepHours: Double? = nil,
        sleepQuality: Int? = nil,
        mood: Int? = nil,
        soreness: Int? = nil,
        energy: Int? = nil,
        stress: Int? = nil,
        notes: String? = nil
    ) {
        self.hrvMs = hrvMs
        self.sleepHours = sleepHours
        self.sleepQuality = sleepQuality
        self.mood = mood
        self.soreness = soreness
        self.energy = energy
        self.stress = stress
        self.notes = notes
    }
}

struct BiometricCheckinResponse: Codable, Equatable {
    let entry: BiometricEntry
}

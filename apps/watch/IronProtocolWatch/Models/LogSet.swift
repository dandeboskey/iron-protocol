import Foundation

/// Hand-mirror of the log-set schemas from
/// `packages/api-contract/src/schemas/log.ts`.
///
/// SwiftMirror correspondence (TS Zod -> Swift Codable):
///
///   LogSetCreateRequestSchema -> LogSetRequest
///     sessionId       string                -> sessionId       : String
///     prescriptionId  string                -> prescriptionId  : String
///     setNumber       int (positive)        -> setNumber       : Int
///     weightLbs       number (positive)     -> weightLbs       : Double
///     reps            int (positive)        -> reps            : Int
///     rpe             number? | null        -> rpe             : Double?
///
///   LogSetUpdateRequestSchema -> LogSetEditRequest
///     all fields optional. Swift's `Optional` plus `encodeIfPresent` in
///     JSONEncoder is the standard pattern; we expose all fields as
///     Double/Int? and only set the ones the caller wants to change.
///
///   LogSetMutationResponseSchema -> LogSetResponse
///     `{ set: CompletedSet }` — `CompletedSet` already lives in Workout.swift.
///
///   LogSetDeleteResponseSchema -> LogSetDeleteResponse
///     `{ ok: true }` — we model `ok` as `Bool` for Swift ergonomics.
struct LogSetRequest: Codable, Equatable {
    let sessionId: String
    let prescriptionId: String
    let setNumber: Int
    let weightLbs: Double
    let reps: Int
    let rpe: Double?
}

struct LogSetEditRequest: Codable, Equatable {
    var weightLbs: Double?
    var reps: Int?
    var rpe: Double?

    /// Use this initializer at call sites to avoid emitting null fields the
    /// caller didn't intend to clear. The route accepts null `rpe` to
    /// explicitly clear it; pass `rpe: nil` here to omit the key entirely.
    /// JSONEncoder by default emits explicit `null` for `nil` Optional —
    /// callers who need PATCH-vs-clear semantics should encode manually.
    init(weightLbs: Double? = nil, reps: Int? = nil, rpe: Double? = nil) {
        self.weightLbs = weightLbs
        self.reps = reps
        self.rpe = rpe
    }
}

struct LogSetResponse: Codable, Equatable {
    let set: CompletedSet
}

struct LogSetDeleteResponse: Codable, Equatable {
    let ok: Bool
}

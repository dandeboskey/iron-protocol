import Foundation

/// Hand-mirror of `PersonalRecordSchema` from
/// `packages/api-contract/src/schemas/records.ts`.
///
/// TS field -> Swift field correspondence:
///   id            String           -> id           : String
///   athleteId     String           -> athleteId    : String
///   exerciseName  String           -> exerciseName : String
///   recordType    String           -> recordType   : String
///   weightLbs     number           -> weightLbs    : Double
///   reps          number | null    -> reps         : Int?
///   volumeLoad    number? | null   -> volumeLoad   : Double?
///   isAllTime     boolean?         -> isAllTime    : Bool?
///   previousBest  number? | null   -> previousBest : Double?
///   achievedAt    string (ISO)     -> achievedAt   : String   (parse downstream)
///
/// Keep `achievedAt` as `String` (matching the wire format). The Date
/// conversion is the caller's responsibility — same as the TS contract,
/// which keeps `achievedAt` as a string and lets consumers transform.
struct PersonalRecord: Codable, Identifiable, Equatable {
    let id: String
    let athleteId: String
    let exerciseName: String
    let recordType: String
    let weightLbs: Double
    let reps: Int?
    let volumeLoad: Double?
    let isAllTime: Bool?
    let previousBest: Double?
    let achievedAt: String
}

/// Mirrors `RecordsListResponseSchema` -> `{ records: PersonalRecord[] }`.
struct RecordsListResponse: Codable, Equatable {
    let records: [PersonalRecord]
}

import Foundation

/// Hand-mirror of `packages/api-contract/src/schemas/session.ts`.
///
/// SwiftMirror correspondence (TS Zod -> Swift Codable):
///
///   SessionCompleteRequestSchema -> SessionCompleteRequest
///     sessionId  string  -> sessionId : String
///
///   TrainingBlockAdvancedSchema -> TrainingBlockAdvanced
///     id           String              -> id           : String
///     athleteId    String              -> athleteId    : String
///     name         String              -> name         : String
///     phase        String              -> phase        : String  (HYPERTROPHY|STRENGTH|PEAKING|DELOAD)
///     status       String              -> status       : String  (ACTIVE|COMPLETED|PAUSED)
///     startDate    string (ISO)        -> startDate    : String
///     endDate      string? (ISO)       -> endDate      : String?
///     weekCount    int                 -> weekCount    : Int
///     currentWeek  int                 -> currentWeek  : Int
///     currentDay   int                 -> currentDay   : Int
///     templateId   string?             -> templateId   : String?
///     createdAt    string (ISO)        -> createdAt    : String
///     updatedAt    string (ISO)        -> updatedAt    : String
///
///   SessionCompleteResponseSchema -> SessionCompleteResponse
///     `{ block: TrainingBlock }` — note this is NOT `{ ok, advanced }`,
///     even though the conceptual operation is "advance the block".

struct SessionCompleteRequest: Codable, Equatable {
    let sessionId: String
}

struct TrainingBlockAdvanced: Codable, Identifiable, Equatable {
    let id: String
    let athleteId: String
    let name: String
    let phase: String
    let status: String
    let startDate: String
    let endDate: String?
    let weekCount: Int
    let currentWeek: Int
    let currentDay: Int
    let templateId: String?
    let createdAt: String
    let updatedAt: String
}

struct SessionCompleteResponse: Codable, Equatable {
    let block: TrainingBlockAdvanced
}

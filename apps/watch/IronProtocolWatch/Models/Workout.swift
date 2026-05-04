import Foundation

/// Hand-mirror of the workout-related schemas from
/// `packages/api-contract/src/schemas/workout.ts`.
///
/// Watch app Phase 1 only renders summary info (block name, day label,
/// readiness coefficient). Phase 2 will surface the full prescription list
/// and allow set logging from the wrist.

struct ExercisePrescription: Codable, Identifiable, Equatable {
    let id: String
    let sessionId: String
    let exerciseName: String
    let exerciseOrder: Int
    let prescribedSets: Int
    let prescribedReps: Int
    let prescribedRPE: Double
    let percentOfE1RM: Double?
    let targetWeightLbs: Double?
    let isAccessory: Bool
}

struct CompletedSet: Codable, Identifiable, Equatable {
    let id: String
    let sessionId: String
    let prescriptionId: String
    let setNumber: Int
    let reps: Int
    let weightLbs: Double
    let rpe: Double?
    let completedAt: String
}

struct TrainingSession: Codable, Identifiable, Equatable {
    let id: String
    let blockId: String
    let weekNumber: Int
    let dayNumber: Int
    let scheduledDate: String
    let completedAt: String?
    let readinessScore: Double?
    let readinessCoeff: Double
    let autoRegNote: String?
    let createdAt: String
    let prescriptions: [ExercisePrescription]
    let completedSets: [CompletedSet]
}

struct RegulatedPrescription: Codable, Equatable {
    let exerciseName: String
    let sets: Int
    let reps: Int
    let rpe: Double
    let percentOfE1RM: Double?
    let isAccessory: Bool
    let adjustedSets: Int
    let adjustedRpe: Double
    let adjustedPercentE1RM: Double?
    let targetWeightLbs: Double?
    let regulationNote: String
}

struct WorkoutBlockSummary: Codable, Equatable {
    let id: String
    let name: String
    let phase: String // HYPERTROPHY | STRENGTH | PEAKING | DELOAD
    let currentWeek: Int
    let currentDay: Int
    let weekCount: Int
}

/// Mirrors `WorkoutResponseSchema`.
struct WorkoutResponse: Codable, Equatable {
    let session: TrainingSession
    let label: String
    let readiness: Readiness?
    let regulated: [RegulatedPrescription]
    let block: WorkoutBlockSummary
}

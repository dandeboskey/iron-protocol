import Foundation

/// Decoded form of `Resources/constants.json` — the cross-platform domain
/// constants shared with the web/mobile apps via `packages/api-contract/
/// src/constants.json`.
///
/// The TS twin lives at `packages/api-contract/src/constants.ts` and exports
/// the same shape under the name `PROTOCOL`. Field names match exactly — if
/// you rename a field here, rename it there in the same PR.
///
/// This file lays the wiring; views still hold their own UI-side numbers.
/// Future watch features ("explain my readiness", on-wrist phase preview)
/// should pull from `Protocol.shared` instead of hardcoding values.
struct IronProtocol: Decodable {
    let readinessTiers: ReadinessTiers
    let mrvScale: [MrvPoint]
    let phases: [String: PhaseDefinition]
    let e1rmRepCap: Int
    let emergencyDeloadConsecutiveLowDays: Int

    struct ReadinessTiers: Decodable {
        let boost: Tier
        let normal: Tier
        let reduce: Tier
        let regress: Tier
        let deload: Tier
    }

    struct Tier: Decodable {
        let minRc: Double?
        let maxRc: Double?
        let intensityDelta: Double?
        let setDelta: Int?
        let rpeDelta: Double?
        let volumeFactor: Double?
    }

    struct MrvPoint: Decodable {
        let bwRatio: Double
        let factor: Double
    }

    struct PhaseDefinition: Decodable {
        let weeks: Int
    }

    /// Loaded once on first access. The bundle resource is shipped inside
    /// the watch app target — drag `Resources/constants.json` into Xcode
    /// with "Copy items if needed" and tick the watch target's membership.
    static let shared: IronProtocol = {
        guard
            let url = Bundle.main.url(forResource: "constants", withExtension: "json"),
            let data = try? Data(contentsOf: url),
            let decoded = try? JSONDecoder().decode(IronProtocol.self, from: data)
        else {
            // Fail-soft fallback: keeps the app usable in previews / unit
            // tests where the bundle resource may not be wired yet. The
            // production build path always finds the file.
            return IronProtocol(
                readinessTiers: ReadinessTiers(
                    boost: Tier(minRc: 1.05, maxRc: nil, intensityDelta: 0.025, setDelta: nil, rpeDelta: nil, volumeFactor: nil),
                    normal: Tier(minRc: 0.95, maxRc: 1.05, intensityDelta: nil, setDelta: nil, rpeDelta: nil, volumeFactor: nil),
                    reduce: Tier(minRc: 0.85, maxRc: 0.95, intensityDelta: nil, setDelta: -1, rpeDelta: -0.5, volumeFactor: nil),
                    regress: Tier(minRc: 0.75, maxRc: 0.85, intensityDelta: -0.05, setDelta: -2, rpeDelta: -1.0, volumeFactor: nil),
                    deload: Tier(minRc: nil, maxRc: 0.75, intensityDelta: nil, setDelta: nil, rpeDelta: nil, volumeFactor: 0.5)
                ),
                mrvScale: [
                    MrvPoint(bwRatio: 1.5, factor: 1.0),
                    MrvPoint(bwRatio: 2.0, factor: 0.95),
                    MrvPoint(bwRatio: 2.5, factor: 0.88),
                    MrvPoint(bwRatio: 3.0, factor: 0.8),
                    MrvPoint(bwRatio: 3.5, factor: 0.72),
                    MrvPoint(bwRatio: 999, factor: 0.65)
                ],
                phases: [
                    "HYPERTROPHY": PhaseDefinition(weeks: 4),
                    "STRENGTH": PhaseDefinition(weeks: 4),
                    "PEAKING": PhaseDefinition(weeks: 3),
                    "DELOAD": PhaseDefinition(weeks: 1)
                ],
                e1rmRepCap: 12,
                emergencyDeloadConsecutiveLowDays: 3
            )
        }
        return decoded
    }()
}

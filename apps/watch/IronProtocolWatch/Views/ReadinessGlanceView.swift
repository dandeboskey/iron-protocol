import SwiftUI

/// Phase 1 glance view. Calls `GET /api/biometric` on appear and renders
/// the readiness coefficient + score, last-check-in age, and the first
/// flag if any. Deliberately minimal — wrist screens beg for one number,
/// one verb, one nudge.
struct ReadinessGlanceView: View {
    @Environment(ApiClient.self) private var api

    @State private var dashboard: DashboardResponse?
    @State private var errorMessage: String?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Text("Iron Protocol")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                if isLoading {
                    ProgressView()
                } else if let err = errorMessage {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                } else if let r = dashboard?.readiness {
                    Text(coefficientLabel(r.coefficient))
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text("Rc \(r.coefficient, specifier: "%.2f") · score \(Int(r.score))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let firstFlag = r.flags.first {
                        Text(firstFlag)
                            .font(.caption2)
                            .foregroundStyle(.orange)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                    if let age = lastCheckinAge() {
                        Text("checked in \(age)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Text("No check-in yet today")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 8)
        }
        .task { await load() }
    }

    private func coefficientLabel(_ c: Double) -> String {
        switch c {
        case ..<0.85: return "DELOAD"
        case 0.85..<0.95: return "REDUCE"
        case 0.95..<1.05: return "GO"
        default: return "PUSH"
        }
    }

    /// Returns "3h ago" / "2d ago" / "just now" derived from the latest
    /// biometric entry's `date` (the route returns entries newest-first
    /// per `getTrailingBiometrics` ORDER BY date DESC). `nil` if there
    /// are no entries or the date is unparseable.
    private func lastCheckinAge() -> String? {
        guard let latest = dashboard?.entries.first else { return nil }
        return relativeTimeString(fromIso: latest.date)
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            dashboard = try await api.dashboard.get()
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }
}

#Preview {
    ReadinessGlanceView()
        .environment(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

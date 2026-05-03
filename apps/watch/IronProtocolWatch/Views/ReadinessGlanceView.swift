import SwiftUI

/// Phase 1 glance view. Calls `GET /api/biometric` on appear and renders
/// the readiness coefficient + score plus a count of trailing entries.
/// Deliberately minimal — the wiring (api-contract -> Swift Codable ->
/// async/await fetch -> SwiftUI state) is the deliverable.
struct ReadinessGlanceView: View {
    @EnvironmentObject private var api: ApiClient

    @State private var dashboard: DashboardResponse?
    @State private var errorMessage: String?
    @State private var isLoading = true

    var body: some View {
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
                Text("Open on iPhone")
                    .font(.caption2)
                    .foregroundStyle(.blue)
            } else {
                Text("No check-in yet today")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 8)
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
        .environmentObject(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

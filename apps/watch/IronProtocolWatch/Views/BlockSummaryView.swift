import SwiftUI

/// Where am I in the macrocycle? Wraps the `block` summary returned by
/// `GET /api/workout`:
///   - phase (HYPERTROPHY | STRENGTH | PEAKING | DELOAD)
///   - week N of M, day in current week
///   - days remaining (rough estimate: weeks left × ~4 sessions/wk; we
///     surface remaining weeks rather than days because the watch
///     doesn't know the schedule grid)
///   - emergency-deload flag (driven off the readiness flags array)
///
/// Source data: `WorkoutResponse.block` + `WorkoutResponse.readiness.flags`.
/// We piggyback on the workout endpoint instead of adding a separate
/// `/api/block` call — the workout route already returns the block summary
/// and we want both views to fetch once.
struct BlockSummaryView: View {
    @Environment(ApiClient.self) private var api

    @State private var workout: WorkoutResponse?
    @State private var errorMessage: String?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Block")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                if isLoading {
                    HStack { Spacer(); ProgressView(); Spacer() }
                } else if let err = errorMessage {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                } else if let w = workout {
                    body(for: w)
                } else {
                    Text("No active block")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 8)
        }
        .task { await load() }
    }

    private func body(for w: WorkoutResponse) -> some View {
        let block = w.block
        let weeksRemaining = max(block.weekCount - block.currentWeek + 1, 0)
        let isEmergency = (w.readiness?.flags ?? []).contains { $0.lowercased().contains("deload") }

        return VStack(alignment: .leading, spacing: 6) {
            VStack(alignment: .leading, spacing: 2) {
                Text(block.name)
                    .font(.subheadline.weight(.semibold))
                Text(block.phase)
                    .font(.caption2)
                    .foregroundStyle(phaseColor(block.phase))
                    .textCase(.uppercase)
            }

            Divider()

            statRow(label: "Week", value: "\(block.currentWeek) / \(block.weekCount)")
            statRow(label: "Day",  value: "\(block.currentDay)")
            statRow(label: "Weeks left", value: "\(weeksRemaining)")

            if isEmergency {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Text("Emergency deload")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(.red)
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.12))
        )
    }

    private func statRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.caption.weight(.semibold))
                .monospacedDigit()
        }
    }

    private func phaseColor(_ phase: String) -> Color {
        switch phase.uppercased() {
        case "HYPERTROPHY": return .blue
        case "STRENGTH": return .purple
        case "PEAKING": return .red
        case "DELOAD": return .gray
        default: return .secondary
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            workout = try await api.workout.today()
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }
}

#Preview {
    BlockSummaryView()
        .environment(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

import SwiftUI

/// Read-only summary of `client.workout.today()`. Shows:
///   - block name + day label (e.g. "Block A · Day 2")
///   - week N of M
///   - the regulated prescription list (target weight × reps × RPE × %1RM)
///
/// We deliberately do NOT log sets from the watch in v1: the wrist is too
/// cramped to enter weight + reps + RPE under load, and the iPhone is
/// always within reach in the gym. A future iteration can add per-set
/// completion via the iPhone handoff (or a simplified "did set" tap that
/// trusts the prescription as-written).
struct TodaysWorkoutView: View {
    @Environment(ApiClient.self) private var api

    @State private var workout: WorkoutResponse?
    @State private var errorMessage: String?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                if isLoading {
                    HStack { Spacer(); ProgressView(); Spacer() }
                } else if let err = errorMessage {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                } else if let w = workout {
                    headerCard(for: w)
                    ForEach(Array(w.regulated.enumerated()), id: \.offset) { _, rx in
                        prescriptionRow(rx)
                    }
                    Text("Open on iPhone to log")
                        .font(.caption2)
                        .foregroundStyle(.blue)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.top, 4)
                } else {
                    Text("No session scheduled.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 8)
        }
        .task { await load() }
    }

    private func headerCard(for w: WorkoutResponse) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(w.label)
                .font(.subheadline.weight(.semibold))
            Text("\(w.block.name) · Wk \(w.session.weekNumber)/\(w.block.weekCount) · D\(w.session.dayNumber)")
                .font(.caption2)
                .foregroundStyle(.secondary)
            if let r = w.readiness {
                Text("Rc \(r.coefficient, specifier: "%.2f")")
                    .font(.caption2)
                    .foregroundStyle(coefficientColor(r.coefficient))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.12))
        )
    }

    private func prescriptionRow(_ rx: RegulatedPrescription) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(rx.exerciseName)
                    .font(.caption.weight(.semibold))
                    .lineLimit(1)
                Spacer()
                if rx.isAccessory {
                    Text("acc")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Text(prescriptionLine(rx))
                .font(.caption2)
                .monospacedDigit()
                .foregroundStyle(.primary)
            if !rx.regulationNote.isEmpty && rx.regulationNote != "as written" {
                Text(rx.regulationNote)
                    .font(.caption2)
                    .foregroundStyle(.orange)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.gray.opacity(0.08))
        )
    }

    /// Build the dense prescription line. Examples:
    ///   "4×5 @ RPE 7 · 380 lb · 76%"
    ///   "3×8 @ RPE 8"
    /// Falls back gracefully when targetWeightLbs / percent are nil.
    private func prescriptionLine(_ rx: RegulatedPrescription) -> String {
        var parts: [String] = []
        parts.append("\(rx.adjustedSets)×\(rx.reps)")
        parts.append("@ RPE \(formatRpe(rx.adjustedRpe))")
        if let w = rx.targetWeightLbs {
            parts.append("\(Int(w.rounded())) lb")
        }
        if let p = rx.adjustedPercentE1RM {
            parts.append("\(Int((p * 100).rounded()))%")
        }
        return parts.joined(separator: " · ")
    }

    private func formatRpe(_ rpe: Double) -> String {
        if rpe == rpe.rounded() { return "\(Int(rpe))" }
        return String(format: "%.1f", rpe)
    }

    private func coefficientColor(_ c: Double) -> Color {
        switch c {
        case ..<0.85: return .red
        case 0.85..<0.95: return .orange
        case 0.95..<1.05: return .green
        default: return .blue
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
    TodaysWorkoutView()
        .environment(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

import SwiftUI

/// Phase 1 watch-side quick check-in.
///
/// Captures the four subjective scales the lifter taps in by hand on the
/// wrist (mood, soreness, energy, stress — each 1-10). Submits via
/// `api.checkin.submit(...)`. HRV and sleep are passed as `nil` for now;
/// Phase 2 wires HealthKit to populate them transparently.
///
/// Deliberately minimal — the wiring (api-contract -> Swift Codable ->
/// async/await POST -> SwiftUI state) is the deliverable. Visual polish
/// comes after the watch target is actually added in Xcode and we can
/// iterate on a real WatchOS canvas.
struct CheckinQuickView: View {
    @EnvironmentObject private var api: ApiClient

    @State private var mood: Double = 7
    @State private var soreness: Double = 4
    @State private var energy: Double = 7
    @State private var stress: Double = 4

    @State private var isSubmitting = false
    @State private var submittedAt: Date?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Daily Check-In")
                    .font(.headline)

                scaleRow(label: "Mood", value: $mood)
                scaleRow(label: "Soreness", value: $soreness, lowGood: false)
                scaleRow(label: "Energy", value: $energy)
                scaleRow(label: "Stress", value: $stress, lowGood: false)

                if let err = errorMessage {
                    Text(err)
                        .font(.caption2)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                if submittedAt != nil {
                    Text("Submitted")
                        .font(.caption)
                        .foregroundStyle(.green)
                } else {
                    Button(action: { Task { await submit() } }) {
                        if isSubmitting {
                            ProgressView()
                        } else {
                            Text("Submit")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isSubmitting)
                }
            }
            .padding(.horizontal, 8)
        }
    }

    private func scaleRow(label: String, value: Binding<Double>, lowGood: Bool = true) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(label).font(.caption)
                Spacer()
                Text("\(Int(value.wrappedValue))")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            // WatchOS prefers digital crown; .focusable + .digitalCrownRotation
            // is the production approach. For Phase 1 a stepper is the
            // simplest functional control to verify the wiring end-to-end.
            Stepper(
                value: value,
                in: 1...10,
                step: 1
            ) {
                EmptyView()
            }
            .labelsHidden()
        }
    }

    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }
        errorMessage = nil

        // TODO: HealthKit pull — populate hrvMs and sleepHours from the
        // most recent HealthKit samples before submit. For Phase 1 we send
        // nil; the backend route stores nulls and the readiness calc uses
        // population norms when HRV/sleep are absent.
        let body = BiometricCheckinRequest(
            hrvMs: nil,
            sleepHours: nil,
            sleepQuality: nil,
            mood: Int(mood),
            soreness: Int(soreness),
            energy: Int(energy),
            stress: Int(stress),
            notes: nil
        )

        do {
            _ = try await api.checkin.submit(body)
            submittedAt = Date()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "\(error)"
        }
    }
}

#Preview {
    CheckinQuickView()
        .environmentObject(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

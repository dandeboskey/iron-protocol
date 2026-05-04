import SwiftUI

/// Phase 1 watch-side quick check-in.
///
/// Captures the four subjective scales the lifter dials in (mood, soreness,
/// energy, stress — each 1-10). Submits via `api.checkin.submit(...)`.
/// HRV and sleep are passed as `nil` for now; Phase 2 wires HealthKit to
/// populate them transparently.
///
/// UX note: each scale row uses Digital Crown rotation (`.focusable()` +
/// `.digitalCrownRotation`) instead of taps. The crown is the watchOS
/// idiomatic input for 1-D values; on a 41mm screen, a stepper button is
/// roughly 30% of the available width per scale and fat-fingers the
/// adjacent rows.
///
/// Tap a row to focus it (giving the crown control); spin the crown to
/// adjust. Haptic feedback fires on integer crossings via the
/// `crownRotation`'s built-in detent behavior.
struct CheckinQuickView: View {
    @Environment(ApiClient.self) private var api

    @State private var mood: Double = 7
    @State private var soreness: Double = 4
    @State private var energy: Double = 7
    @State private var stress: Double = 4

    @FocusState private var focused: Field?

    @State private var isSubmitting = false
    @State private var submittedAt: Date?
    @State private var errorMessage: String?

    enum Field: Hashable { case mood, soreness, energy, stress }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Daily Check-In")
                    .font(.headline)

                scaleRow(field: .mood, label: "Mood", value: $mood)
                scaleRow(field: .soreness, label: "Soreness", value: $soreness, lowGood: false)
                scaleRow(field: .energy, label: "Energy", value: $energy)
                scaleRow(field: .stress, label: "Stress", value: $stress, lowGood: false)

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
        .onAppear {
            // Default-focus the first row so the crown is immediately wired
            // when the user lifts their wrist.
            if focused == nil { focused = .mood }
        }
    }

    /// One labeled row that:
    ///   - shows its current 1-10 value,
    ///   - is tappable to take focus,
    ///   - while focused, the Digital Crown drives the value.
    private func scaleRow(
        field: Field,
        label: String,
        value: Binding<Double>,
        lowGood: Bool = true
    ) -> some View {
        let isFocused = focused == field
        let intValue = Int(value.wrappedValue.rounded())
        return HStack {
            Text(label)
                .font(.caption)
            Spacer()
            Text("\(intValue)")
                .font(.title3.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(isFocused ? Color.accentColor : .primary)
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isFocused ? Color.accentColor.opacity(0.15) : Color.gray.opacity(0.10))
        )
        .focusable()
        .focused($focused, equals: field)
        .digitalCrownRotation(
            value,
            from: 1.0,
            through: 10.0,
            by: 1.0,
            sensitivity: .medium,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
        .onTapGesture { focused = field }
        .accessibilityLabel(Text("\(label) (\(lowGood ? "1 low, 10 high" : "1 low, 10 maxed"))"))
        .accessibilityValue(Text("\(intValue) of 10"))
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
            mood: Int(mood.rounded()),
            soreness: Int(soreness.rounded()),
            energy: Int(energy.rounded()),
            stress: Int(stress.rounded()),
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
        .environment(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

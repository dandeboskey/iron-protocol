import SwiftUI

/// Iron Protocol — watchOS Phase 1 entry point.
///
/// Standalone watchOS 10+ app. Talks to the same Next.js backend the web
/// and mobile apps use, via `Networking/ApiClient.swift`. Hand-mirrored
/// Codable types for the API contract live in `Models/`.
///
/// Config is read from Info.plist:
///   - `IronProtocolBaseURL`     (e.g. `http://192.168.1.10:3000` for dev)
///   - `IronProtocolDevBearer`   (a token from `.env.local`; phase 2 will
///                                replace this with shared-Keychain auth)
///
/// If either key is missing, the root view shows a config-error screen
/// rather than crashing — friendlier when you forget to fill in the
/// per-developer Info.plist after cloning.
@main
struct IronProtocolWatchApp: App {
    /// Result of attempting to construct the API client at launch.
    /// We do this once at App init time and inject the result into the
    /// environment via `@State` so views can read with
    /// `@Environment(ApiClient.self)`.
    @State private var clientResult: Result<ApiClient, Error> = Result {
        try ApiClient.fromInfoPlist()
    }

    var body: some Scene {
        WindowGroup {
            switch clientResult {
            case .success(let client):
                RootView()
                    .environment(client)
            case .failure(let error):
                ConfigErrorView(error: error)
            }
        }
    }
}

/// Shown when Info.plist config is missing or the URL is malformed.
/// Lifters won't ever see this; it exists for the dev-loop on first run.
private struct ConfigErrorView: View {
    let error: Error

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Config error")
                    .font(.headline)
                Text((error as? LocalizedError)?.errorDescription ?? "\(error)")
                    .font(.caption)
                    .foregroundStyle(.red)
                Text("Edit Info.plist:")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("• \(ApiClientConfig.baseURLKey)")
                    .font(.caption2)
                    .monospaced()
                Text("• \(ApiClientConfig.bearerKey)")
                    .font(.caption2)
                    .monospaced()
            }
            .padding(.horizontal, 8)
        }
    }
}

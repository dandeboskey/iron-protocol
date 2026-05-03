import SwiftUI

/// Iron Protocol — watchOS Phase 1 entry point.
///
/// Standalone watchOS 10+ app. Talks to the same Next.js backend the web
/// and mobile apps use, via `Networking/ApiClient.swift`. Hand-mirrored
/// Codable types for the API contract live in `Models/`.
@main
struct IronProtocolWatchApp: App {
    /// Shared API client. The base URL must point at the deployed Next.js
    /// app (or `http://localhost:3000` on a simulator on the same host).
    /// In Phase 1 the bearer token is read from `Bundle.main.infoDictionary`
    /// after being injected at build time. See README for the path to a
    /// shared-Keychain implementation (post-MVP).
    @StateObject private var apiClient = ApiClient(
        baseURL: URL(string: Bundle.main.object(forInfoDictionaryKey: "IronProtocolBaseURL") as? String ?? "http://localhost:3000")!,
        bearerToken: Bundle.main.object(forInfoDictionaryKey: "IronProtocolDevBearer") as? String
    )

    var body: some Scene {
        WindowGroup {
            ReadinessGlanceView()
                .environmentObject(apiClient)
        }
    }
}

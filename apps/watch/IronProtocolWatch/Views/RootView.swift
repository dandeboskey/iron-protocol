import SwiftUI

/// Top-level navigation. watchOS-idiomatic page-style `TabView`: swipe
/// horizontally between tabs, each tab is a full screen.
///
/// Tab order is deliberate (most-frequent first, going right):
///   1. Readiness glance — what most users open the app for
///   2. Today's workout  — the secondary "what should I do today" answer
///   3. Block summary    — context (where am I in the macro)
///   4. Quick check-in   — write path; further-reach tab because most
///                          users will check in once a day, not every glance
///
/// We could promote Check-In to its own complication or to a higher-up
/// tab once usage data tells us how often it's the entry point.
struct RootView: View {
    var body: some View {
        TabView {
            ReadinessGlanceView()
                .tag(Tab.readiness)
            TodaysWorkoutView()
                .tag(Tab.workout)
            BlockSummaryView()
                .tag(Tab.block)
            CheckinQuickView()
                .tag(Tab.checkin)
        }
        .tabViewStyle(.verticalPage)
    }

    private enum Tab: Hashable { case readiness, workout, block, checkin }
}

#Preview {
    RootView()
        .environment(ApiClient(baseURL: URL(string: "http://localhost:3000")!))
}

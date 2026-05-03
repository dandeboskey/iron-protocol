import Foundation
import Combine

/// Async/await Swift networking layer. Conceptually mirrors
/// `@iron-protocol/api-client`'s shape — one client, namespaced by domain
/// (records, dashboard, workout). Hand-rolled rather than codegen'd; the
/// surface area is small enough that the maintenance cost is lower than
/// dragging in a generator pipeline.
///
/// Auth: Phase 1 takes a bearer token at construction. Phase 1 ship:
/// shared Keychain via App Group with the iPhone app. See README.

enum ApiError: Error, LocalizedError {
    case invalidURL
    case http(status: Int, body: String)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid API URL."
        case .http(let status, let body): return "HTTP \(status): \(body)"
        case .decoding(let err): return "Decoding failed: \(err.localizedDescription)"
        case .transport(let err): return "Network: \(err.localizedDescription)"
        }
    }
}

@MainActor
final class ApiClient: ObservableObject {
    private let baseURL: URL
    private var bearerToken: String?
    private let session: URLSession
    private let decoder: JSONDecoder

    init(baseURL: URL, bearerToken: String? = nil, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.bearerToken = bearerToken
        self.session = session
        self.decoder = JSONDecoder()
        // Wire format uses ISO-8601 strings as String (not Date) to match
        // the TS contract. If we ever want auto-decoding to `Date`, switch
        // the `String` typed fields in Models to `Date` and set:
        // decoder.dateDecodingStrategy = .iso8601
    }

    func setBearerToken(_ token: String?) {
        self.bearerToken = token
    }

    // MARK: - namespaces

    lazy var records = Records(client: self)
    lazy var dashboard = Dashboard(client: self)
    lazy var workout = Workout(client: self)

    struct Records {
        unowned let client: ApiClient
        /// Mirrors `client.records.list()` in TS.
        func list() async throws -> RecordsListResponse {
            try await client.get("/api/records")
        }
    }

    struct Dashboard {
        unowned let client: ApiClient
        /// Mirrors `client.dashboard.get()` in TS.
        func get() async throws -> DashboardResponse {
            try await client.get("/api/biometric")
        }
    }

    struct Workout {
        unowned let client: ApiClient
        /// Mirrors `client.workout.today()` in TS.
        func today() async throws -> WorkoutResponse {
            try await client.get("/api/workout")
        }
    }

    // MARK: - core request

    fileprivate func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(method: "GET", path: path, body: Optional<Empty>.none)
    }

    private struct Empty: Encodable {}

    private func request<T: Decodable, B: Encodable>(
        method: String,
        path: String,
        body: B?
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw ApiError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = bearerToken, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw ApiError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw ApiError.http(status: -1, body: "non-HTTP response")
        }
        guard (200..<300).contains(http.statusCode) else {
            let bodyStr = String(data: data, encoding: .utf8) ?? ""
            throw ApiError.http(status: http.statusCode, body: bodyStr)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw ApiError.decoding(error)
        }
    }
}

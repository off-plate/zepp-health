import Foundation

enum SupabaseConfig {
    static let url = "https://fhfempisopwsdkmvywbt.supabase.co"
    static let publicKey = "sb_publishable_MDxQPm0SzLHFTnDqg-eyyQ_0yposnES"
}

struct AuthSession: Codable {
    let access_token: String
    let refresh_token: String
    let expires_at: Int
    let user_email: String?
}

struct TokenResponse: Decodable {
    let access_token: String
    let refresh_token: String
    let expires_in: Int?
    let expires_at: Int?
    let user: TokenUser?
    struct TokenUser: Decodable { let email: String? }
}

struct AuthError: Decodable {
    let error_description: String?
    let error: String?
    let msg: String?
    var message: String { error_description ?? msg ?? error ?? "Sign in failed" }
}

enum APIError: LocalizedError {
    case network(String)
    case decode(String)
    case auth(String)
    var errorDescription: String? {
        switch self {
        case .network(let m), .decode(let m), .auth(let m): return m
        }
    }
}

@MainActor
final class Supabase: ObservableObject {
    static let shared = Supabase()
    @Published var session: AuthSession?

    private let sessionKey = "zh.session.v1"

    private init() {
        if let data = UserDefaults.standard.data(forKey: sessionKey),
           let s = try? JSONDecoder().decode(AuthSession.self, from: data) {
            self.session = s
        }
    }

    var isAuthenticated: Bool { session != nil }

    private func saveSession(_ s: AuthSession) {
        self.session = s
        if let d = try? JSONEncoder().encode(s) {
            UserDefaults.standard.set(d, forKey: sessionKey)
        }
    }

    func signOut() {
        session = nil
        UserDefaults.standard.removeObject(forKey: sessionKey)
    }

    func signIn(email: String, password: String) async throws {
        var req = URLRequest(url: URL(string: SupabaseConfig.url + "/auth/v1/token?grant_type=password")!)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.publicKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.network("No response") }
        if http.statusCode >= 400 {
            let err = (try? JSONDecoder().decode(AuthError.self, from: data))?.message ?? "Sign in failed (\(http.statusCode))"
            throw APIError.auth(err)
        }
        let tok = try JSONDecoder().decode(TokenResponse.self, from: data)
        let session = AuthSession(
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: tok.expires_at ?? (Int(Date().timeIntervalSince1970) + (tok.expires_in ?? 3600)),
            user_email: tok.user?.email
        )
        saveSession(session)
    }

    func sendMagicLink(email: String) async throws {
        var req = URLRequest(url: URL(string: SupabaseConfig.url + "/auth/v1/otp")!)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.publicKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["email": email])
        let (data, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, http.statusCode >= 400 {
            let err = (try? JSONDecoder().decode(AuthError.self, from: data))?.message ?? "Magic link failed"
            throw APIError.auth(err)
        }
    }

    func refreshIfNeeded() async {
        guard let s = session else { return }
        let now = Int(Date().timeIntervalSince1970)
        guard s.expires_at - now < 120 else { return }
        var req = URLRequest(url: URL(string: SupabaseConfig.url + "/auth/v1/token?grant_type=refresh_token")!)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.publicKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["refresh_token": s.refresh_token])
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse, http.statusCode < 400,
              let tok = try? JSONDecoder().decode(TokenResponse.self, from: data) else { return }
        let new = AuthSession(
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: tok.expires_at ?? (Int(Date().timeIntervalSince1970) + (tok.expires_in ?? 3600)),
            user_email: tok.user?.email ?? s.user_email
        )
        saveSession(new)
    }

    func get<T: Decodable>(_ path: String, as _: T.Type) async throws -> T {
        await refreshIfNeeded()
        guard let s = session else { throw APIError.auth("Not signed in") }
        var req = URLRequest(url: URL(string: SupabaseConfig.url + path)!)
        req.setValue(SupabaseConfig.publicKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer " + s.access_token, forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.network("No response") }
        if http.statusCode >= 400 {
            throw APIError.network("HTTP \(http.statusCode): \(String(data: data, encoding: .utf8) ?? "")")
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decode("Decode failed: \(error.localizedDescription)")
        }
    }
}

import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: Supabase
    @State private var email = "mihael.florian@gmail.com"
    @State private var password = ""
    @State private var mode: Mode = .password
    @State private var busy = false
    @State private var error: String?
    @State private var sent = false

    enum Mode { case password, magic }

    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.bg, Theme.bg2], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            VStack(spacing: 0) {
                Spacer()
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 10) {
                        Circle().fill(Theme.cardio).frame(width: 28, height: 28)
                        Text("Zepp Health").font(.headline).foregroundStyle(Theme.text1)
                    }
                    if sent {
                        Text("Check your email").font(.title3).bold().foregroundStyle(Theme.text1)
                        Text("Magic link sent to \(email)").font(.subheadline).foregroundStyle(Theme.text2)
                    } else {
                        Text("Sign in").font(.title3).bold().foregroundStyle(Theme.text1)
                        field(label: "EMAIL", text: $email, secure: false)
                        if mode == .password {
                            field(label: "PASSWORD", text: $password, secure: true)
                        }
                        if let error {
                            Text(error).font(.caption).foregroundStyle(Theme.cardio)
                        }
                        Button(action: submit) {
                            HStack {
                                Spacer()
                                if busy { ProgressView().tint(.black) }
                                else { Text(mode == .password ? "Sign in" : "Send magic link").bold().foregroundStyle(.black) }
                                Spacer()
                            }
                            .padding(.vertical, 12)
                            .background(Theme.cardio)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(busy)

                        Button(mode == .password ? "Use magic link instead" : "Use password instead") {
                            mode = mode == .password ? .magic : .password
                            error = nil
                        }
                        .font(.caption)
                        .foregroundStyle(Theme.text3)
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(24)
                .background(Theme.surface)
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.hairline, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal, 20)
                Spacer()
            }
        }
    }

    @ViewBuilder
    private func field(label: String, text: Binding<String>, secure: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption2).tracking(1.2).foregroundStyle(Theme.text3).bold()
            Group {
                if secure {
                    SecureField("", text: text)
                } else {
                    TextField("", text: text)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
            }
            .foregroundStyle(Theme.text1)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(Theme.surfaceStrong)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.hairline, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func submit() {
        busy = true
        error = nil
        Task {
            do {
                if mode == .password {
                    try await auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
                } else {
                    try await auth.sendMagicLink(email: email.trimmingCharacters(in: .whitespaces))
                    sent = true
                }
            } catch {
                self.error = error.localizedDescription
            }
            busy = false
        }
    }
}

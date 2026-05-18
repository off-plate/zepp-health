import SwiftUI

enum Theme {
    static let bg = Color(red: 0.04, green: 0.05, blue: 0.07)
    static let bg2 = Color(red: 0.07, green: 0.08, blue: 0.11)
    static let surface = Color.white.opacity(0.04)
    static let surfaceStrong = Color.white.opacity(0.07)
    static let hairline = Color.white.opacity(0.08)

    static let text1 = Color(red: 0.96, green: 0.96, blue: 0.98)
    static let text2 = Color(red: 0.70, green: 0.72, blue: 0.78)
    static let text3 = Color(red: 0.48, green: 0.50, blue: 0.56)

    static let cardio = Color(red: 1.00, green: 0.40, blue: 0.45)
    static let steps = Color(red: 0.40, green: 0.85, blue: 0.60)
    static let sleep = Color(red: 0.55, green: 0.55, blue: 1.00)
    static let train = Color(red: 1.00, green: 0.72, blue: 0.30)
    static let recovery = Color(red: 0.40, green: 0.78, blue: 0.95)
}

extension View {
    func tile(padding: CGFloat = 16) -> some View {
        self.padding(padding)
            .background(Theme.surface)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.hairline, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

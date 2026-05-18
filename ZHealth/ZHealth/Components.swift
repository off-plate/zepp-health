import SwiftUI

struct StatTile: View {
    let label: String
    let value: String
    let unit: String?
    let trend: Double?
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.caption2).tracking(1.2).foregroundStyle(Theme.text3).bold()
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value).font(.system(size: 28, weight: .semibold)).foregroundStyle(Theme.text1)
                if let unit { Text(unit).font(.caption).foregroundStyle(Theme.text3) }
            }
            if let trend {
                Text(trend >= 0 ? "▲ \(String(format: "%.1f", trend))%" : "▼ \(String(format: "%.1f", abs(trend)))%")
                    .font(.caption2)
                    .foregroundStyle(trend >= 0 ? Theme.steps : Theme.cardio)
            } else {
                Text(" ").font(.caption2)
            }
            Rectangle().fill(color).frame(height: 2).opacity(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.surface)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.hairline, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct SectionTitle: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.subheadline).bold()
            .foregroundStyle(Theme.text1)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PageBG: ViewModifier {
    func body(content: Content) -> some View {
        ZStack {
            LinearGradient(colors: [Theme.bg, Theme.bg2], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            content
        }
    }
}

extension View {
    func pageBackground() -> some View { modifier(PageBG()) }
}

func formatHM(_ seconds: Int?) -> String {
    guard let s = seconds, s > 0 else { return "—" }
    let h = s / 3600
    let m = (s % 3600) / 60
    return "\(h)h \(m)m"
}

func trendPct(current: Double?, prev: Double?) -> Double? {
    guard let c = current, let p = prev, p != 0 else { return nil }
    return (c - p) / p * 100.0
}

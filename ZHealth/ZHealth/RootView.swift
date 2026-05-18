import SwiftUI

struct RootView: View {
    @EnvironmentObject var auth: Supabase
    @StateObject private var store = DataStore()

    var body: some View {
        Group {
            if auth.isAuthenticated {
                MainTabs()
                    .environmentObject(store)
                    .task { await store.load() }
            } else {
                SignInView()
            }
        }
        .preferredColorScheme(.dark)
        .tint(Theme.cardio)
    }
}

struct MainTabs: View {
    @EnvironmentObject var store: DataStore

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max.fill") }
            WorkoutsView()
                .tabItem { Label("Workouts", systemImage: "figure.run") }
            HealthView()
                .tabItem { Label("Health", systemImage: "heart.fill") }
            CalendarView()
                .tabItem { Label("Calendar", systemImage: "calendar") }
            AwardsView()
                .tabItem { Label("Awards", systemImage: "medal.fill") }
        }
        .background(Theme.bg)
    }
}

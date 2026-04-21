import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

const ACCENT = "#ef4444";
const IRON_800 = "#41414a";
const IRON_950 = "#18181b";
const IRON_500 = "#747484";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: IRON_950 },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          tabBarStyle: {
            backgroundColor: IRON_950,
            borderTopColor: IRON_800,
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 85,
          },
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: IRON_500,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            headerTitle: "IRON PROTOCOL",
            tabBarLabel: "Dashboard",
          }}
        />
        <Tabs.Screen
          name="checkin"
          options={{ title: "Check-In", tabBarLabel: "Check-In" }}
        />
        <Tabs.Screen
          name="workout"
          options={{ title: "Workout", tabBarLabel: "Workout" }}
        />
        <Tabs.Screen
          name="records"
          options={{ title: "PRs", tabBarLabel: "PRs" }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profile", tabBarLabel: "Profile" }}
        />
      </Tabs>
    </>
  );
}

import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../../src/services/auth";

export default function AuthLayout() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#18181b", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    );
  }
  if (token) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

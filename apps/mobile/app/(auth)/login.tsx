import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../src/services/auth";
import { exchangeGoogleIdToken } from "../../src/services/api";

WebBrowser.maybeCompleteAuthSession();

const C = {
  bg: "#18181b",
  card: "#27272e",
  border: "#41414a",
  accent: "#ef4444",
  text: "#eeeef0",
  sub: "#91919f",
  muted: "#747484",
};

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [exchanging, setExchanging] = useState(false);

  // Uses the Google OAuth client IDs configured in app.json's extra field.
  // Must be iOS/Android native client IDs created in Google Cloud Console.
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        Alert.alert("Sign-in error", "No id_token in Google response");
        return;
      }
      (async () => {
        setExchanging(true);
        try {
          const result = await exchangeGoogleIdToken(idToken);
          await signIn(result.token, result.user);
        } catch (e: any) {
          Alert.alert("Sign-in failed", e?.message ?? "Unknown error");
        } finally {
          setExchanging(false);
        }
      })();
    } else if (response?.type === "error") {
      Alert.alert("Google sign-in error", response.error?.message ?? "Unknown");
    }
  }, [response]);

  const busy = exchanging || !request;

  return (
    <View style={s.container}>
      <View style={s.inner}>
        <Text style={s.brand}>
          <Text style={{ color: C.accent }}>IRON</Text>
          <Text style={{ color: C.text }}> PROTOCOL</Text>
        </Text>
        <Text style={s.tagline}>Deterministic powerlifting engine</Text>

        <View style={s.card}>
          <Text style={s.cardLabel}>SIGN IN</Text>

          <TouchableOpacity
            style={[s.googleBtn, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={() => promptAsync()}
          >
            {exchanging ? (
              <ActivityIndicator color="#18181b" />
            ) : (
              <Text style={s.googleBtnText}>Continue with Google</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>
          Elite lifters. Population-norm readiness. No AI workouts.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, justifyContent: "center", paddingHorizontal: 24 },
  inner: { width: "100%", maxWidth: 400, alignSelf: "center" },
  brand: { fontSize: 28, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  tagline: { fontSize: 13, color: C.sub, textAlign: "center", marginTop: 6, marginBottom: 40 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 24 },
  cardLabel: {
    color: C.muted, fontSize: 11, fontWeight: "600", letterSpacing: 2, marginBottom: 18,
  },
  googleBtn: {
    backgroundColor: "#fff", paddingVertical: 16, borderRadius: 10, alignItems: "center",
  },
  googleBtnText: { color: "#18181b", fontWeight: "700", fontSize: 16 },
  footer: { color: C.muted, fontSize: 11, textAlign: "center", marginTop: 28 },
});

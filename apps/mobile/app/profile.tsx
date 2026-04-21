import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { getAthlete, updateAthlete } from "../src/services/api";
import { requestHealthKitPermissions, isHealthKitAvailable } from "../src/services/healthkit";

const C = {
  bg: "#18181b", card: "#393940", border: "#41414a",
  accent: "#ef4444", text: "#eeeef0", sub: "#91919f", muted: "#747484",
  blue: "#3b82f6", green: "#22c55e",
};

export default function ProfileScreen() {
  const [athlete, setAthlete] = useState<any>(null);
  const [e1rms, setE1rms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthKitConnected, setHealthKitConnected] = useState(false);
  const [form, setForm] = useState({ name: "", bodyweightLbs: "", heightIn: "", experienceYrs: "" });

  useEffect(() => {
    getAthlete()
      .then((data) => {
        setAthlete(data.athlete);
        setE1rms(data.e1rms || []);
        if (data.athlete) {
          setForm({
            name: data.athlete.name,
            bodyweightLbs: String(data.athlete.bodyweightLbs),
            heightIn: String(data.athlete.heightIn || ""),
            experienceYrs: String(data.athlete.experienceYrs),
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateAthlete({
        name: form.name,
        bodyweightLbs: Number(form.bodyweightLbs),
        heightIn: form.heightIn ? Number(form.heightIn) : null,
        experienceYrs: Number(form.experienceYrs),
      });
      Alert.alert("Saved", "Profile updated.");
    } catch { Alert.alert("Error", "Failed to save."); }
    finally { setSaving(false); }
  }

  async function connectHealthKit() {
    const ok = await requestHealthKitPermissions();
    setHealthKitConnected(ok);
    Alert.alert(ok ? "Connected" : "Denied", ok ? "Apple Health connected successfully." : "Permission denied.");
  }

  if (loading) {
    return <View style={[s.container, s.center]}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.h1}>Profile</Text>

      {/* Profile Form */}
      <View style={s.card}>
        <Text style={s.label}>Name</Text>
        <TextInput style={s.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholderTextColor={C.muted} />
        <View style={s.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={s.label}>Weight (lbs)</Text>
            <TextInput style={s.input} keyboardType="numeric" value={form.bodyweightLbs} onChangeText={(t) => setForm({ ...form, bodyweightLbs: t })} placeholderTextColor={C.muted} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 6 }}>
            <Text style={s.label}>Height (in)</Text>
            <TextInput style={s.input} keyboardType="numeric" value={form.heightIn} onChangeText={(t) => setForm({ ...form, heightIn: t })} placeholderTextColor={C.muted} />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={s.label}>Exp (yrs)</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" value={form.experienceYrs} onChangeText={(t) => setForm({ ...form, experienceYrs: t })} placeholderTextColor={C.muted} />
          </View>
        </View>
        <TouchableOpacity onPress={handleSave} style={s.btnPrimary} disabled={saving}>
          <Text style={s.btnPrimaryText}>{saving ? "Saving..." : "Save Profile"}</Text>
        </TouchableOpacity>
      </View>

      {/* HealthKit Connection */}
      {isHealthKitAvailable() && (
        <View style={s.card}>
          <Text style={s.cardLabel}>APPLE HEALTH</Text>
          <Text style={s.subtitle}>Connect Apple Health to auto-import HRV, sleep, and resting heart rate.</Text>
          <TouchableOpacity onPress={connectHealthKit} style={[s.healthKitBtn, healthKitConnected && { borderColor: C.green }]}>
            <Text style={[s.healthKitBtnText, healthKitConnected && { color: C.green }]}>
              {healthKitConnected ? "Connected" : "Connect Apple Health"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* e1RMs */}
      {e1rms.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardLabel}>ESTIMATED 1RMs</Text>
          {e1rms.map((r: any) => (
            <View key={r.id} style={s.e1rmRow}>
              <Text style={s.e1rmExercise}>{r.exercise}</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.e1rmWeight}>{r.e1rmLbs} lbs</Text>
                <Text style={s.recordMeta}>
                  {(r.e1rmLbs / (athlete?.bodyweightLbs || 1)).toFixed(1)}× BW
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 120 },
  h1: { color: C.text, fontSize: 26, fontWeight: "800", marginBottom: 16 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 12 },
  cardLabel: { color: C.muted, fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 8 },
  label: { color: C.sub, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  subtitle: { color: C.sub, fontSize: 14, marginBottom: 12 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 18, marginBottom: 12 },
  row: { flexDirection: "row" },
  btnPrimary: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  healthKitBtn: { backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: C.blue, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  healthKitBtnText: { color: C.blue, fontSize: 15, fontWeight: "600" },
  e1rmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  e1rmExercise: { color: C.text, fontSize: 16, fontWeight: "600" },
  e1rmWeight: { color: C.text, fontSize: 20, fontWeight: "700", fontFamily: "monospace" },
  recordMeta: { color: C.muted, fontSize: 12 },
});

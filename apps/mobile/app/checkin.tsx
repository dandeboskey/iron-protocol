import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { submitCheckin } from "../src/services/api";
import { readTodayHealthData, requestHealthKitPermissions } from "../src/services/healthkit";

const C = {
  bg: "#18181b", card: "#393940", border: "#41414a",
  accent: "#ef4444", text: "#eeeef0", sub: "#91919f", muted: "#747484",
  green: "#22c55e", yellow: "#eab308",
};

function SliderRow({ label, value, onInc, onDec, lowLabel, highLabel }: any) {
  const color = value >= 7 ? C.green : value >= 4 ? C.yellow : C.accent;
  return (
    <View style={s.sliderRow}>
      <View style={s.sliderHeader}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.sliderValue, { color }]}>{value}</Text>
      </View>
      <View style={s.sliderButtons}>
        <TouchableOpacity onPress={onDec} style={s.sliderBtn}>
          <Text style={s.sliderBtnText}>−</Text>
        </TouchableOpacity>
        <View style={s.sliderTrack}>
          <View style={[s.sliderFill, { width: `${((value - 1) / 9) * 100}%`, backgroundColor: color }]} />
        </View>
        <TouchableOpacity onPress={onInc} style={s.sliderBtn}>
          <Text style={s.sliderBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={s.sliderLabels}>
        <Text style={s.sliderLabelText}>{lowLabel}</Text>
        <Text style={s.sliderLabelText}>{highLabel}</Text>
      </View>
    </View>
  );
}

export default function CheckInScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    hrvMs: "",
    sleepHours: "",
    sleepQuality: 7,
    mood: 7,
    soreness: 3,
    energy: 7,
    stress: 3,
    notes: "",
  });

  async function importFromHealthKit() {
    const granted = await requestHealthKitPermissions();
    if (!granted) {
      Alert.alert("Permission Denied", "Please grant HealthKit access in Settings.");
      return;
    }
    const data = await readTodayHealthData();
    setForm((prev) => ({
      ...prev,
      hrvMs: data.hrvMs ? String(data.hrvMs) : prev.hrvMs,
      sleepHours: data.sleepHours ? String(data.sleepHours) : prev.sleepHours,
    }));
    Alert.alert("Imported", "HealthKit data loaded into your check-in.");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitCheckin({
        hrvMs: form.hrvMs ? Number(form.hrvMs) : null,
        sleepHours: form.sleepHours ? Number(form.sleepHours) : null,
        sleepQuality: form.sleepQuality,
        mood: form.mood,
        soreness: form.soreness,
        energy: form.energy,
        stress: form.stress,
        notes: form.notes || null,
      });
      Alert.alert("Done", "Check-in recorded!", [
        { text: "OK", onPress: () => router.push("/") },
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to submit check-in.");
    } finally {
      setSubmitting(false);
    }
  }

  const update = (field: string) => (v: number) =>
    setForm((prev) => ({ ...prev, [field]: Math.max(1, Math.min(10, v)) }));

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.h1}>Daily Check-In</Text>

      {/* HealthKit Import */}
      <TouchableOpacity onPress={importFromHealthKit} style={s.healthKitBtn}>
        <Text style={s.healthKitBtnText}>Import from Apple Health</Text>
      </TouchableOpacity>

      {/* Numeric inputs */}
      <View style={s.numRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.label}>HRV (ms)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            placeholder="55"
            placeholderTextColor={C.muted}
            value={form.hrvMs}
            onChangeText={(t) => setForm({ ...form, hrvMs: t })}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.label}>Sleep (hours)</Text>
          <TextInput
            style={s.input}
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={C.muted}
            value={form.sleepHours}
            onChangeText={(t) => setForm({ ...form, sleepHours: t })}
          />
        </View>
      </View>

      {/* Sliders */}
      <View style={s.card}>
        <SliderRow label="Sleep Quality" value={form.sleepQuality}
          onInc={() => update("sleepQuality")(form.sleepQuality + 1)}
          onDec={() => update("sleepQuality")(form.sleepQuality - 1)}
          lowLabel="Terrible" highLabel="Amazing" />
        <SliderRow label="Mood" value={form.mood}
          onInc={() => update("mood")(form.mood + 1)}
          onDec={() => update("mood")(form.mood - 1)}
          lowLabel="Low" highLabel="Great" />
        <SliderRow label="Soreness" value={form.soreness}
          onInc={() => update("soreness")(form.soreness + 1)}
          onDec={() => update("soreness")(form.soreness - 1)}
          lowLabel="None" highLabel="Severe" />
        <SliderRow label="Energy" value={form.energy}
          onInc={() => update("energy")(form.energy + 1)}
          onDec={() => update("energy")(form.energy - 1)}
          lowLabel="Exhausted" highLabel="Wired" />
        <SliderRow label="Stress" value={form.stress}
          onInc={() => update("stress")(form.stress + 1)}
          onDec={() => update("stress")(form.stress - 1)}
          lowLabel="Chill" highLabel="Maxed" />
      </View>

      {/* Notes */}
      <Text style={s.label}>Notes</Text>
      <TextInput
        style={[s.input, { height: 80, textAlignVertical: "top" }]}
        multiline
        placeholder="Anything notable..."
        placeholderTextColor={C.muted}
        value={form.notes}
        onChangeText={(t) => setForm({ ...form, notes: t })}
      />

      <TouchableOpacity onPress={handleSubmit} style={[s.btnPrimary, { marginTop: 20 }]} disabled={submitting}>
        <Text style={s.btnPrimaryText}>{submitting ? "Submitting..." : "Submit Check-In"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingBottom: 120 },
  h1: { color: C.text, fontSize: 26, fontWeight: "800", marginBottom: 16 },
  label: { color: C.sub, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 16 },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 18 },
  numRow: { flexDirection: "row", marginBottom: 16 },
  healthKitBtn: { backgroundColor: "#1a1a2e", borderWidth: 1, borderColor: "#3b82f6", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 16 },
  healthKitBtnText: { color: "#3b82f6", fontSize: 15, fontWeight: "600" },
  btnPrimary: { backgroundColor: C.accent, paddingVertical: 18, borderRadius: 10, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sliderRow: { marginBottom: 20 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  sliderValue: { fontSize: 28, fontWeight: "800", fontFamily: "monospace" },
  sliderButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  sliderBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.border, justifyContent: "center", alignItems: "center" },
  sliderBtnText: { color: C.text, fontSize: 24, fontWeight: "600" },
  sliderTrack: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: "hidden" },
  sliderFill: { height: 8, borderRadius: 4 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  sliderLabelText: { color: C.muted, fontSize: 11 },
});

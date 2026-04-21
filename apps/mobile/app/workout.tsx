import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { getWorkout, logSet } from "../src/services/api";

const C = {
  bg: "#18181b", card: "#393940", border: "#41414a",
  accent: "#ef4444", text: "#eeeef0", sub: "#91919f", muted: "#747484",
  green: "#22c55e",
};

export default function WorkoutScreen() {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeEx, setActiveEx] = useState<string | null>(null);
  const [logged, setLogged] = useState<Record<string, number>>({});
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    getWorkout()
      .then(setWorkout)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleLog(prescriptionId: string, prescribedSets: number) {
    if (!weight || !reps || !workout?.session?.id) return;
    setLogging(true);
    const setNum = (logged[prescriptionId] || 0) + 1;
    try {
      await logSet({
        sessionId: workout.session.id,
        prescriptionId,
        setNumber: setNum,
        weightLbs: Number(weight),
        reps: Number(reps),
        rpe: rpe ? Number(rpe) : null,
      });
      setLogged((prev) => ({ ...prev, [prescriptionId]: setNum }));
      setReps("");
      setRpe("");
      if (setNum >= prescribedSets) setActiveEx(null);
    } catch {
      Alert.alert("Error", "Failed to log set");
    } finally {
      setLogging(false);
    }
  }

  if (loading) {
    return <View style={[s.container, s.center]}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  if (!workout?.session) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.muted}>No workout today. Check in first.</Text>
      </View>
    );
  }

  const prescriptions = workout.session.prescriptions || [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.h1}>{workout.label || "Today's Workout"}</Text>
      <Text style={s.subtitle}>
        {workout.block?.phase} · Week {workout.block?.currentWeek} · Day {workout.block?.currentDay}
      </Text>

      {prescriptions.map((p: any) => {
        const isActive = activeEx === p.id;
        const done = (logged[p.id] || 0) >= p.prescribedSets;

        return (
          <TouchableOpacity
            key={p.id}
            style={[s.card, isActive && s.cardActive, done && { opacity: 0.5 }]}
            onPress={() => {
              if (!done) {
                setActiveEx(p.id);
                setWeight(String(p.targetWeightLbs || ""));
                setReps(String(p.prescribedReps));
                setRpe("");
              }
            }}
            activeOpacity={0.8}
          >
            <View style={s.exerciseHeader}>
              <View>
                <Text style={[s.exerciseName, done && { textDecorationLine: "line-through" }]}>
                  {p.exerciseName}
                </Text>
                <Text style={s.exerciseDetail}>
                  {p.prescribedSets}×{p.prescribedReps} @ RPE {p.prescribedRPE}
                  {p.targetWeightLbs ? ` · ${p.targetWeightLbs}lbs` : ""}
                </Text>
              </View>
              <Text style={s.setCounter}>
                {logged[p.id] || 0}/{p.prescribedSets}
              </Text>
            </View>

            {isActive && !done && (
              <View style={s.logForm}>
                <Text style={s.logLabel}>Set {(logged[p.id] || 0) + 1}</Text>
                <View style={s.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>Weight</Text>
                    <TextInput style={s.logInput} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="0" placeholderTextColor={C.muted} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={s.inputLabel}>Reps</Text>
                    <TextInput style={s.logInput} keyboardType="numeric" value={reps} onChangeText={setReps} placeholder="0" placeholderTextColor={C.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inputLabel}>RPE</Text>
                    <TextInput style={s.logInput} keyboardType="decimal-pad" value={rpe} onChangeText={setRpe} placeholder="—" placeholderTextColor={C.muted} />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleLog(p.id, p.prescribedSets)}
                  style={[s.btnPrimary, (!weight || !reps) && { opacity: 0.5 }]}
                  disabled={logging || !weight || !reps}
                >
                  <Text style={s.btnPrimaryText}>{logging ? "Logging..." : `Log Set ${(logged[p.id] || 0) + 1}`}</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 120 },
  h1: { color: C.text, fontSize: 24, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: C.sub, fontSize: 14, marginBottom: 20 },
  muted: { color: C.muted, fontSize: 15 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10 },
  cardActive: { borderColor: C.accent, borderWidth: 2 },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exerciseName: { color: C.text, fontSize: 18, fontWeight: "700" },
  exerciseDetail: { color: C.sub, fontSize: 13, fontFamily: "monospace", marginTop: 2 },
  setCounter: { color: C.muted, fontSize: 14, fontFamily: "monospace" },
  logForm: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  logLabel: { color: C.sub, fontSize: 13, marginBottom: 10 },
  logRow: { flexDirection: "row", marginBottom: 12 },
  inputLabel: { color: C.muted, fontSize: 11, marginBottom: 4 },
  logInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 16, textAlign: "center", color: C.text, fontSize: 22, fontFamily: "monospace" },
  btnPrimary: { backgroundColor: C.accent, paddingVertical: 18, borderRadius: 10, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});

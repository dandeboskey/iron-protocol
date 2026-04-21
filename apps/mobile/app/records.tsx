import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import { getRecords, addRecord } from "../src/services/api";

const C = {
  bg: "#18181b", card: "#393940", border: "#41414a",
  accent: "#ef4444", text: "#eeeef0", sub: "#91919f", muted: "#747484",
};

const BIG_THREE = ["Squat", "Bench Press", "Deadlift"];

export default function RecordsScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ exercise: "Squat", weightLbs: "", reps: "1", recordType: "1RM" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRecords()
      .then((data) => setRecords(data.records || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.weightLbs) return;
    setSaving(true);
    try {
      const data = await addRecord({
        exercise: form.exercise,
        recordType: form.recordType,
        weightLbs: Number(form.weightLbs),
        reps: Number(form.reps),
      });
      setRecords((prev) => [data.record, ...prev]);
      setShowModal(false);
    } catch {} finally { setSaving(false); }
  }

  const best1RM = (exercise: string) => {
    const exRecs = records.filter((r) => r.exercise === exercise && r.recordType === "1RM");
    return exRecs.length > 0 ? exRecs.reduce((a, b) => (a.weightLbs > b.weightLbs ? a : b)) : null;
  };

  if (loading) {
    return <View style={[s.container, s.center]}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Big 3 */}
        <View style={s.big3Row}>
          {BIG_THREE.map((ex) => {
            const pr = best1RM(ex);
            return (
              <View key={ex} style={s.big3Card}>
                <Text style={s.big3Label}>{ex.toUpperCase()}</Text>
                <Text style={s.big3Number}>{pr?.weightLbs ?? "—"}</Text>
                <Text style={s.big3Unit}>lbs</Text>
              </View>
            );
          })}
        </View>

        {/* All records */}
        {records.map((r) => (
          <View key={r.id} style={s.recordRow}>
            <View>
              <Text style={s.recordExercise}>{r.exercise}</Text>
              <Text style={s.recordMeta}>{r.recordType}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.recordWeight}>{r.weightLbs} lbs</Text>
              {r.reps > 1 && <Text style={s.recordMeta}>× {r.reps}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add PR Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>New PR</Text>
            <Text style={s.label}>Exercise</Text>
            <TextInput style={s.input} value={form.exercise} onChangeText={(t) => setForm({ ...form, exercise: t })} placeholderTextColor={C.muted} />
            <View style={s.logRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Weight (lbs)</Text>
                <TextInput style={s.input} keyboardType="numeric" value={form.weightLbs} onChangeText={(t) => setForm({ ...form, weightLbs: t })} placeholder="0" placeholderTextColor={C.muted} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.label}>Reps</Text>
                <TextInput style={s.input} keyboardType="numeric" value={form.reps} onChangeText={(t) => setForm({ ...form, reps: t })} placeholderTextColor={C.muted} />
              </View>
            </View>
            <TouchableOpacity onPress={handleSave} style={s.btnPrimary} disabled={saving}>
              <Text style={s.btnPrimaryText}>{saving ? "Saving..." : "Save PR"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModal(false)} style={[s.btnSecondary, { marginTop: 8 }]}>
              <Text style={s.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 120 },
  big3Row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  big3Card: { flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, alignItems: "center" },
  big3Label: { color: C.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  big3Number: { color: C.text, fontSize: 32, fontWeight: "800", fontFamily: "monospace" },
  big3Unit: { color: C.muted, fontSize: 11 },
  recordRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  recordExercise: { color: C.text, fontSize: 16, fontWeight: "600" },
  recordWeight: { color: C.text, fontSize: 18, fontWeight: "700", fontFamily: "monospace" },
  recordMeta: { color: C.muted, fontSize: 12 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent, justifyContent: "center", alignItems: "center", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  fabText: { color: "#fff", fontSize: 32, fontWeight: "600", marginTop: -2 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modal: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { color: C.text, fontSize: 22, fontWeight: "800", marginBottom: 20 },
  label: { color: C.sub, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 18, marginBottom: 12 },
  logRow: { flexDirection: "row", marginBottom: 12 },
  btnPrimary: { backgroundColor: C.accent, paddingVertical: 18, borderRadius: 10, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  btnSecondary: { backgroundColor: C.border, paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  btnSecondaryText: { color: C.text, fontSize: 15, fontWeight: "600" },
});

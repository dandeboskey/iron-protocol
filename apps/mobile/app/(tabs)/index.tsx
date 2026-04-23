import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getAthlete, getBiometrics, getBlock, getWorkout } from "../../src/services/api";

const C = {
  bg: "#18181b",
  card: "#393940",
  border: "#41414a",
  accent: "#ef4444",
  text: "#eeeef0",
  sub: "#91919f",
  muted: "#747484",
  green: "#22c55e",
  yellow: "#eab308",
};

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [block, setBlock] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getAthlete().catch(() => null),
      getBiometrics().catch(() => null),
      getBlock().catch(() => null),
      getWorkout().catch(() => null),
    ])
      .then(([a, b, bl, w]) => {
        setAthlete(a?.athlete);
        setReadiness(b?.readiness);
        setBlock(bl?.block);
        setWorkout(w);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const score = readiness?.score ?? null;
  const scoreColor = score !== null ? (score >= 70 ? C.green : score >= 45 ? C.yellow : C.accent) : C.muted;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      {/* Athlete header */}
      <View style={s.header}>
        <Text style={s.name}>{athlete?.name ?? "Athlete"}</Text>
        <Text style={s.subtitle}>
          {athlete?.bodyweightLbs ?? "—"} lbs · {athlete?.experienceYrs ?? "—"}yr exp
        </Text>
      </View>

      {/* Readiness Card */}
      <View style={s.card}>
        <Text style={s.cardLabel}>READINESS</Text>
        {score !== null ? (
          <View style={s.readinessRow}>
            <Text style={[s.bigNumber, { color: scoreColor }]}>{score}</Text>
            <View style={{ marginLeft: 16 }}>
              <Text style={s.subtitle}>Rc {readiness.coefficient?.toFixed(3)}</Text>
              {readiness.flags?.slice(0, 2).map((f: string, i: number) => (
                <Text key={i} style={s.flag}>{f}</Text>
              ))}
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => router.push("/checkin")} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>Check In Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Block Card */}
      <View style={s.card}>
        <Text style={s.cardLabel}>CURRENT BLOCK</Text>
        {block ? (
          <>
            <Text style={s.cardTitle}>{block.name}</Text>
            <View style={s.row}>
              <View style={[s.badge, { borderColor: C.accent }]}>
                <Text style={[s.badgeText, { color: C.accent }]}>{block.phase}</Text>
              </View>
              <Text style={s.subtitle}>
                Week {block.currentWeek}/{block.weekCount}
              </Text>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${Math.min(100, ((block.currentWeek - 1) / block.weekCount) * 100)}%` }]} />
            </View>
          </>
        ) : (
          <Text style={s.muted}>No active block</Text>
        )}
      </View>

      {/* Today's Workout Preview */}
      <View style={s.card}>
        <Text style={s.cardLabel}>TODAY&apos;S WORKOUT</Text>
        {workout?.regulated ? (
          <>
            {workout.regulated.slice(0, 3).map((ex: any, i: number) => (
              <View key={i} style={s.exerciseRow}>
                <Text style={s.exerciseName}>{ex.exerciseName}</Text>
                <Text style={s.exerciseDetail}>
                  {ex.adjustedSets}×{ex.reps} @ RPE {ex.adjustedRpe}
                  {ex.targetWeightLbs ? ` · ${ex.targetWeightLbs}lbs` : ""}
                </Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => router.push("/workout")} style={[s.btnPrimary, { marginTop: 16 }]}>
              <Text style={s.btnPrimaryText}>Start Workout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={s.muted}>Complete check-in to generate workout</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={s.actionsRow}>
        <TouchableOpacity onPress={() => router.push("/checkin")} style={[s.btnSecondary, { flex: 1, marginRight: 8 }]}>
          <Text style={s.btnSecondaryText}>Daily Check-In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/records")} style={[s.btnSecondary, { flex: 1, marginLeft: 8 }]}>
          <Text style={s.btnSecondaryText}>View PRs</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 20 },
  name: { color: C.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: C.sub, fontSize: 14 },
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 12 },
  cardLabel: { color: C.muted, fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 8 },
  cardTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  readinessRow: { flexDirection: "row", alignItems: "center" },
  bigNumber: { fontSize: 56, fontWeight: "800", fontFamily: "monospace" },
  flag: { color: "#fbbf24", fontSize: 11, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  progressBar: { height: 6, backgroundColor: C.border, borderRadius: 3, marginTop: 8 },
  progressFill: { height: 6, backgroundColor: C.accent, borderRadius: 3 },
  exerciseRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  exerciseName: { color: C.text, fontSize: 16, fontWeight: "600" },
  exerciseDetail: { color: C.sub, fontSize: 13, fontFamily: "monospace", marginTop: 2 },
  muted: { color: C.muted, fontSize: 14 },
  btnPrimary: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 10, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: { backgroundColor: C.border, paddingVertical: 16, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: C.muted },
  btnSecondaryText: { color: C.text, fontSize: 15, fontWeight: "600" },
  actionsRow: { flexDirection: "row", marginTop: 4 },
});

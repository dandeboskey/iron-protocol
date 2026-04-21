"use client";

import { useEffect, useState } from "react";

interface SetLog {
  prescriptionId: string;
  setNumber: number;
  weightLbs: string;
  reps: string;
  rpe: string;
}

export default function WorkoutPage() {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggedSets, setLoggedSets] = useState<Record<string, SetLog[]>>({});
  const [activePrescription, setActivePrescription] = useState<string | null>(null);
  const [currentSet, setCurrentSet] = useState<SetLog>({
    prescriptionId: "",
    setNumber: 1,
    weightLbs: "",
    reps: "",
    rpe: "",
  });
  const [logging, setLogging] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/workout")
      .then((r) => r.json())
      .then((data) => {
        setWorkout(data);
        if (data.session?.completedSets) {
          const existing: Record<string, SetLog[]> = {};
          for (const s of data.session.completedSets) {
            if (!existing[s.prescriptionId]) existing[s.prescriptionId] = [];
            existing[s.prescriptionId].push({
              prescriptionId: s.prescriptionId,
              setNumber: s.setNumber,
              weightLbs: String(s.weightLbs),
              reps: String(s.reps),
              rpe: String(s.rpe || ""),
            });
          }
          setLoggedSets(existing);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function finishWorkout() {
    if (!workout?.session?.id) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: workout.session.id }),
      });
      if (res.ok) setCompleted(true);
    } catch (e) {
      console.error("Finish workout error:", e);
    } finally {
      setCompleting(false);
    }
  }

  async function logSet() {
    if (!workout?.session?.id || !currentSet.weightLbs || !currentSet.reps) return;
    setLogging(true);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: workout.session.id,
          prescriptionId: currentSet.prescriptionId,
          setNumber: currentSet.setNumber,
          weightLbs: Number(currentSet.weightLbs),
          reps: Number(currentSet.reps),
          rpe: currentSet.rpe ? Number(currentSet.rpe) : null,
        }),
      });
      if (res.ok) {
        const pid = currentSet.prescriptionId;
        setLoggedSets((prev) => ({
          ...prev,
          [pid]: [...(prev[pid] || []), { ...currentSet }],
        }));
        setCurrentSet((prev) => ({
          ...prev,
          setNumber: prev.setNumber + 1,
          reps: "",
          rpe: "",
        }));
      }
    } catch (e) {
      console.error("Log error:", e);
    } finally {
      setLogging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-iron-500">Loading workout...</div>
      </div>
    );
  }

  if (!workout?.session) {
    return (
      <div className="card text-center py-12">
        <p className="text-iron-400 mb-2">No workout scheduled for today.</p>
        <p className="text-iron-500 text-sm">Complete your daily check-in first.</p>
      </div>
    );
  }

  const prescriptions = workout.session.prescriptions || [];
  const allSetsLogged =
    prescriptions.length > 0 &&
    prescriptions.every((p: any) => (loggedSets[p.id]?.length ?? 0) >= p.prescribedSets);

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-6">🏋️</div>
        <h2 className="text-3xl font-black text-iron-50 mb-2">Session Complete</h2>
        <p className="text-iron-400 mb-8">Block day advanced. Rest up.</p>
        <a href="/block" className="btn-primary px-8 py-3 text-lg">
          View Block Progress
        </a>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{workout.label || "Today's Workout"}</h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className={`badge-${workout.block?.phase?.toLowerCase() || "hypertrophy"}`}>
            {workout.block?.phase}
          </span>
          <span className="text-sm text-iron-400">
            Week {workout.block?.currentWeek} &middot; Day {workout.block?.currentDay}
          </span>
          {workout.readiness && (
            <span className={`text-sm font-mono ${
              workout.readiness.score >= 60 ? "text-green-400" :
              workout.readiness.score >= 40 ? "text-yellow-400" : "text-red-400"
            }`}>
              Readiness: {workout.readiness.score}
            </span>
          )}
        </div>
      </div>

      {/* Finish button */}
      {allSetsLogged && (
        <div className="mb-6 p-4 bg-green-950 border border-green-800 rounded-xl text-center">
          <p className="text-green-400 font-semibold mb-3">All sets logged.</p>
          <button
            onClick={finishWorkout}
            disabled={completing}
            className="btn-primary w-full py-4 text-lg bg-green-600 hover:bg-green-500"
          >
            {completing ? "Saving..." : "Finish Workout"}
          </button>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-4">
        {prescriptions.map((p: any) => {
          const isActive = activePrescription === p.id;
          const sets = loggedSets[p.id] || [];
          const allDone = sets.length >= p.prescribedSets;

          return (
            <div
              key={p.id}
              className={`card-compact cursor-pointer transition-all ${
                isActive ? "ring-2 ring-accent/50" : ""
              } ${allDone ? "opacity-60" : ""}`}
              onClick={() => {
                if (!isActive) {
                  setActivePrescription(p.id);
                  setCurrentSet({
                    prescriptionId: p.id,
                    setNumber: sets.length + 1,
                    weightLbs: String(p.targetWeightLbs || ""),
                    reps: String(p.prescribedReps),
                    rpe: "",
                  });
                }
              }}
            >
              {/* Exercise header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-semibold text-lg ${allDone ? "line-through text-iron-500" : ""}`}>
                    {p.exerciseName}
                  </p>
                  <p className="text-sm text-iron-400">
                    {p.prescribedSets}&times;{p.prescribedReps} @ RPE {p.prescribedRPE}
                    {p.targetWeightLbs && ` \u00b7 ${p.targetWeightLbs} lbs`}
                    {p.percentOfE1RM && ` (${Math.round(p.percentOfE1RM * 100)}%)`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono text-iron-400">
                    {sets.length}/{p.prescribedSets}
                  </span>
                </div>
              </div>

              {/* Logged sets */}
              {sets.length > 0 && (
                <div className="mt-3 space-y-1">
                  {sets.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-t border-iron-800">
                      <span className="text-iron-500">Set {s.setNumber}</span>
                      <span className="font-mono">
                        {s.weightLbs} lbs &times; {s.reps}
                        {s.rpe && ` @ ${s.rpe}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Set logging form */}
              {isActive && !allDone && (
                <div className="mt-4 pt-4 border-t border-iron-700" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-iron-400 mb-3">Log Set {currentSet.setNumber}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-iron-500">Weight (lbs)</label>
                      <input
                        type="number"
                        className="input-field text-center text-xl font-mono py-4"
                        value={currentSet.weightLbs}
                        onChange={(e) => setCurrentSet({ ...currentSet, weightLbs: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iron-500">Reps</label>
                      <input
                        type="number"
                        className="input-field text-center text-xl font-mono py-4"
                        value={currentSet.reps}
                        onChange={(e) => setCurrentSet({ ...currentSet, reps: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-iron-500">RPE</label>
                      <input
                        type="number"
                        step="0.5"
                        className="input-field text-center text-xl font-mono py-4"
                        value={currentSet.rpe}
                        onChange={(e) => setCurrentSet({ ...currentSet, rpe: e.target.value })}
                        placeholder="\u2014"
                      />
                    </div>
                  </div>
                  <button
                    onClick={logSet}
                    disabled={logging || !currentSet.weightLbs || !currentSet.reps}
                    className="btn-primary w-full mt-3 text-lg py-4"
                  >
                    {logging ? "Logging..." : `Log Set ${currentSet.setNumber}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

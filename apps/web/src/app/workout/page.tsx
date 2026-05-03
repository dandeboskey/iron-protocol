"use client";

import { useEffect, useState } from "react";

interface SetLog {
  id?: string; // CompletedSet DB id; undefined for sets logged this session before refresh
  prescriptionId: string;
  setNumber: number;
  weightLbs: string;
  reps: string;
  rpe: string;
}

interface EditDraft {
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
  const [logError, setLogError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busySetId, setBusySetId] = useState<string | null>(null);

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
              id: s.id,
              prescriptionId: s.prescriptionId,
              setNumber: s.setNumber,
              weightLbs: String(s.weightLbs),
              reps: String(s.reps),
              rpe: s.rpe != null ? String(s.rpe) : "",
            });
          }
          // Keep deterministic ordering by setNumber within each prescription
          for (const pid of Object.keys(existing)) {
            existing[pid].sort((a, b) => a.setNumber - b.setNumber);
          }
          setLoggedSets(existing);
        }
        // Server-side completion (e.g. reload after finishing) wins over local state.
        if (data.session?.completedAt) {
          setCompleted(true);
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
    if (completed) return;
    if (!workout?.session?.id || !currentSet.weightLbs || !currentSet.reps) return;
    setLogging(true);
    setLogError(null);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLogError(data.error || "Failed to log set.");
        return;
      }
      const pid = currentSet.prescriptionId;
      const created = data.set;
      setLoggedSets((prev) => ({
        ...prev,
        [pid]: [
          ...(prev[pid] || []),
          {
            ...currentSet,
            id: created?.id,
          },
        ],
      }));
      setCurrentSet((prev) => ({
        ...prev,
        setNumber: prev.setNumber + 1,
        reps: "",
        rpe: "",
      }));
    } catch (e) {
      console.error("Log error:", e);
      setLogError("Network error. Please try again.");
    } finally {
      setLogging(false);
    }
  }

  function startEdit(s: SetLog) {
    if (completed) return;
    if (!s.id) return;
    setEditingSetId(s.id);
    setEditError(null);
    setEditDraft({
      weightLbs: s.weightLbs,
      reps: s.reps,
      rpe: s.rpe,
    });
  }

  function cancelEdit() {
    setEditingSetId(null);
    setEditDraft(null);
    setEditError(null);
  }

  async function saveEdit(setId: string, prescriptionId: string) {
    if (completed) return;
    if (!editDraft) return;
    const w = Number(editDraft.weightLbs);
    if (!Number.isFinite(w) || w <= 0) {
      setEditError("Weight must be greater than 0.");
      return;
    }
    const r = Number(editDraft.reps);
    if (!Number.isFinite(r) || r < 1) {
      setEditError("Reps must be at least 1.");
      return;
    }
    let rpePayload: number | null = null;
    if (editDraft.rpe !== "") {
      const rp = Number(editDraft.rpe);
      if (!Number.isFinite(rp) || rp < 1 || rp > 10) {
        setEditError("RPE must be between 1 and 10.");
        return;
      }
      rpePayload = rp;
    }

    setBusySetId(setId);
    setEditError(null);
    try {
      const res = await fetch(`/api/log/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightLbs: w,
          reps: r,
          rpe: rpePayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || "Update failed.");
        return;
      }
      setLoggedSets((prev) => ({
        ...prev,
        [prescriptionId]: (prev[prescriptionId] || []).map((s) =>
          s.id === setId
            ? {
                ...s,
                weightLbs: String(w),
                reps: String(r),
                rpe: rpePayload != null ? String(rpePayload) : "",
              }
            : s
        ),
      }));
      cancelEdit();
    } catch (e) {
      console.error("Edit set error:", e);
      setEditError("Network error. Please try again.");
    } finally {
      setBusySetId(null);
    }
  }

  async function confirmDelete(setId: string, prescriptionId: string) {
    if (completed) return;
    setBusySetId(setId);
    try {
      const res = await fetch(`/api/log/${setId}`, { method: "DELETE" });
      if (!res.ok) return;
      setLoggedSets((prev) => {
        const remaining = (prev[prescriptionId] || []).filter((s) => s.id !== setId);
        // Renumber remaining sets sequentially so the next-set form picks up cleanly.
        const renumbered = remaining
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...prev, [prescriptionId]: renumbered };
      });
      // If the active form's setNumber now overlaps, recompute it
      setCurrentSet((cur) =>
        cur.prescriptionId === prescriptionId
          ? { ...cur, setNumber: ((loggedSets[prescriptionId] || []).length - 1) + 1 || 1 }
          : cur
      );
      setPendingDelete(null);
    } catch (e) {
      console.error("Delete set error:", e);
    } finally {
      setBusySetId(null);
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
                if (completed) return;
                if (!isActive) {
                  setActivePrescription(p.id);
                  setCurrentSet({
                    prescriptionId: p.id,
                    setNumber: sets.length + 1,
                    weightLbs: String(p.targetWeightLbs || ""),
                    reps: String(p.prescribedReps),
                    rpe: "",
                  });
                  setLogError(null);
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
                    {p.targetWeightLbs && ` · ${p.targetWeightLbs} lbs`}
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
                <div className="mt-3 space-y-1" onClick={(e) => e.stopPropagation()}>
                  {sets.map((s) => {
                    const editable = !!s.id && !completed;
                    const isEditing = editingSetId === s.id;
                    const isPendingDelete = pendingDelete === s.id;
                    const isBusy = s.id != null && busySetId === s.id;

                    if (isEditing && editDraft && s.id) {
                      return (
                        <div key={s.id} className="py-2 border-t border-iron-800 space-y-2">
                          <p className="text-xs text-iron-500">Edit Set {s.setNumber}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              className="input-field text-sm font-mono text-center"
                              value={editDraft.weightLbs}
                              onChange={(e) => setEditDraft({ ...editDraft, weightLbs: e.target.value })}
                              placeholder="lbs"
                            />
                            <input
                              type="number"
                              min={1}
                              className="input-field text-sm font-mono text-center"
                              value={editDraft.reps}
                              onChange={(e) => setEditDraft({ ...editDraft, reps: e.target.value })}
                              placeholder="reps"
                            />
                            <input
                              type="number"
                              min={1}
                              max={10}
                              step="0.5"
                              className="input-field text-sm font-mono text-center"
                              value={editDraft.rpe}
                              onChange={(e) => setEditDraft({ ...editDraft, rpe: e.target.value })}
                              placeholder="rpe"
                            />
                          </div>
                          {editError && <p className="text-xs text-red-400">{editError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="btn-secondary flex-1 text-sm py-2"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => s.id && saveEdit(s.id, p.id)}
                              disabled={isBusy}
                              className="btn-primary flex-1 text-sm py-2"
                            >
                              {isBusy ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={s.id ?? `${p.id}-${s.setNumber}`} className="flex justify-between items-center text-sm py-1 border-t border-iron-800 gap-2">
                        <span className="text-iron-500 shrink-0">Set {s.setNumber}</span>
                        <span className="font-mono text-right flex-1">
                          {s.weightLbs} lbs &times; {s.reps}
                          {s.rpe && ` @ ${s.rpe}`}
                        </span>
                        {editable && (
                          isPendingDelete ? (
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPendingDelete(null)}
                                className="text-[10px] px-2 py-1 rounded border border-iron-700 text-iron-400 hover:text-iron-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => s.id && confirmDelete(s.id, p.id)}
                                disabled={isBusy}
                                className="text-[10px] px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
                              >
                                {isBusy ? "..." : "Delete"}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(s)}
                                aria-label={`Edit set ${s.setNumber}`}
                                className="text-[10px] px-2 py-1 rounded border border-iron-700 text-iron-400 hover:text-iron-200"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => s.id && setPendingDelete(s.id)}
                                aria-label={`Delete set ${s.setNumber}`}
                                className="text-[10px] px-2 py-1 rounded border border-iron-800 text-iron-500 hover:text-red-400 hover:border-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
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
                        placeholder="—"
                      />
                    </div>
                  </div>
                  {logError && (
                    <p className="text-xs text-red-400 mt-2">{logError}</p>
                  )}
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

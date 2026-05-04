"use client";

import { useEffect, useState } from "react";
import { formatMonthDay, formatShortDate, formatWeight } from "@/lib/format";

const BIG_THREE = ["Squat", "Bench Press", "Deadlift"];
const COMMON_EXERCISES = [
  "Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row",
  "Front Squat", "Romanian Deadlift", "Close-Grip Bench", "Sumo Deadlift",
  "Incline Bench", "Pause Squat", "Deficit Deadlift",
];
const RECORD_TYPES = ["1RM", "3RM", "5RM", "MAX_REPS"];

interface PR {
  id: string;
  exerciseName: string;
  recordType: string;
  weightLbs: number;
  reps: number;
  achievedAt: string;
  notes: string | null;
}

interface EditDraft {
  exerciseName: string;
  recordType: string;
  weightLbs: string;
  reps: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    exercise: "Squat",
    customExercise: "",
    recordType: "1RM",
    weightLbs: "",
    reps: "1",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/records")
      .then((r) => r.json())
      .then((data) => setRecords(data.records || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const exerciseName = (form.exercise === "__custom__" ? form.customExercise : form.exercise).trim();
      if (!exerciseName) {
        setFormError("Exercise name is required.");
        return;
      }
      const weight = Number(form.weightLbs);
      if (!Number.isFinite(weight) || weight <= 0) {
        setFormError("Weight must be greater than 0.");
        return;
      }
      const reps = Number(form.reps);
      if (!Number.isFinite(reps) || reps < 1) {
        setFormError("Reps must be at least 1.");
        return;
      }

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName,
          recordType: form.recordType,
          weightLbs: weight,
          reps,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save record.");
        return;
      }
      setRecords((prev) => [data.record, ...prev]);
      setShowForm(false);
      setForm({ exercise: "Squat", customExercise: "", recordType: "1RM", weightLbs: "", reps: "1", notes: "" });
    } catch (err) {
      console.error(err);
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r: PR) {
    setEditingId(r.id);
    setEditError(null);
    setEditDraft({
      exerciseName: r.exerciseName,
      recordType: r.recordType,
      weightLbs: String(r.weightLbs),
      reps: String(r.reps),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    const weight = Number(editDraft.weightLbs);
    if (!Number.isFinite(weight) || weight <= 0) {
      setEditError("Weight must be greater than 0.");
      return;
    }
    const reps = Number(editDraft.reps);
    if (!Number.isFinite(reps) || reps < 1) {
      setEditError("Reps must be at least 1.");
      return;
    }
    const name = editDraft.exerciseName.trim();
    if (!name) {
      setEditError("Exercise name is required.");
      return;
    }

    setBusyId(id);
    setEditError(null);
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: name,
          recordType: editDraft.recordType,
          weightLbs: weight,
          reps,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Update failed.");
        return;
      }
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.record } : r)));
      cancelEdit();
    } catch (err) {
      console.error(err);
      setEditError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        setPendingDelete(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  const grouped = records.reduce((acc, r) => {
    if (!acc[r.exerciseName]) acc[r.exerciseName] = [];
    acc[r.exerciseName].push(r);
    return acc;
  }, {} as Record<string, PR[]>);

  const best1RM = (exercise: string) => {
    const exRecords = grouped[exercise] || [];
    const oneRMs = exRecords.filter((r) => r.recordType === "1RM");
    if (oneRMs.length === 0) return null;
    return oneRMs.reduce((a, b) => (a.weightLbs > b.weightLbs ? a : b));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-iron-500">Loading records...</div></div>;
  }

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Personal Records</h1>
        <button onClick={() => { setShowForm(!showForm); setFormError(null); }} className="btn-primary">
          {showForm ? "Cancel" : "+ Add PR"}
        </button>
      </div>

      {/* Big 3 Hero Cards */}
      <div className="grid grid-cols-3 gap-3">
        {BIG_THREE.map((exercise) => {
          const pr = best1RM(exercise);
          return (
            <div key={exercise} className="card text-center">
              <p className="text-xs text-iron-400 uppercase tracking-wide mb-1">{exercise}</p>
              <p className="text-[10px] text-iron-500 mb-1">Best 1RM</p>
              {pr ? (
                <>
                  <p className="text-3xl font-mono font-bold">{formatWeight(pr.weightLbs)}</p>
                  <p className="text-xs text-iron-500">lbs</p>
                  <p className="text-[10px] text-iron-600 mt-1">
                    {formatMonthDay(pr.achievedAt)}
                  </p>
                </>
              ) : (
                <p className="text-lg text-iron-600">--</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add PR Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold">New Personal Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Exercise</label>
              <select
                className="input-field"
                value={form.exercise}
                onChange={(e) => setForm({ ...form, exercise: e.target.value })}
              >
                {COMMON_EXERCISES.map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
                <option value="__custom__">Custom...</option>
              </select>
              {form.exercise === "__custom__" && (
                <input
                  type="text"
                  className="input-field mt-2"
                  placeholder="Exercise name"
                  value={form.customExercise}
                  onChange={(e) => setForm({ ...form, customExercise: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className="label">Record Type</label>
              <select
                className="input-field"
                value={form.recordType}
                onChange={(e) => setForm({ ...form, recordType: e.target.value, reps: e.target.value === "1RM" ? "1" : e.target.value === "3RM" ? "3" : e.target.value === "5RM" ? "5" : form.reps })}
              >
                {RECORD_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Weight (lbs)</label>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step="0.5"
                className="input-field text-xl font-mono"
                value={form.weightLbs}
                onChange={(e) => setForm({ ...form, weightLbs: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                className="input-field text-xl font-mono"
                value={form.reps}
                onChange={(e) => setForm({ ...form, reps: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input-field" placeholder="Competition, RPE, belt/wraps..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {formError && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{formError}</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={saving || !form.weightLbs}>
            {saving ? "Saving..." : "Save Record"}
          </button>
        </form>
      )}

      {/* All Records by Exercise */}
      {Object.entries(grouped)
        .sort(([a], [b]) => {
          const aIdx = BIG_THREE.indexOf(a);
          const bIdx = BIG_THREE.indexOf(b);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.localeCompare(b);
        })
        .map(([exercise, recs]) => (
          <div key={exercise} className="card">
            <h3 className="font-semibold text-lg mb-3">{exercise}</h3>
            <div className="space-y-2">
              {recs.map((r) => {
                const isEditing = editingId === r.id;
                const isPendingDelete = pendingDelete === r.id;
                const isBusy = busyId === r.id;

                if (isEditing && editDraft) {
                  return (
                    <div key={r.id} className="py-3 border-b border-iron-800 last:border-0 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-iron-500">Exercise</label>
                          <input
                            type="text"
                            className="input-field text-sm"
                            value={editDraft.exerciseName}
                            onChange={(e) => setEditDraft({ ...editDraft, exerciseName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-iron-500">Type</label>
                          <select
                            className="input-field text-sm"
                            value={editDraft.recordType}
                            onChange={(e) => setEditDraft({ ...editDraft, recordType: e.target.value })}
                          >
                            {RECORD_TYPES.map((rt) => (
                              <option key={rt} value={rt}>{rt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-iron-500">Weight (lbs)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={1}
                            step="0.5"
                            className="input-field text-sm font-mono"
                            value={editDraft.weightLbs}
                            onChange={(e) => setEditDraft({ ...editDraft, weightLbs: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-iron-500">Reps</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            className="input-field text-sm font-mono"
                            value={editDraft.reps}
                            onChange={(e) => setEditDraft({ ...editDraft, reps: e.target.value })}
                          />
                        </div>
                      </div>
                      {editError && (
                        <p className="text-xs text-red-400">{editError}</p>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={cancelEdit} className="btn-secondary flex-1 text-sm">Cancel</button>
                        <button
                          type="button"
                          onClick={() => saveEdit(r.id)}
                          disabled={isBusy}
                          className="btn-primary flex-1 text-sm"
                        >
                          {isBusy ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-iron-800 last:border-0 gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="badge bg-iron-800 text-iron-300 border border-iron-700">{r.recordType}</span>
                      <span className="text-xl font-mono font-bold">{r.weightLbs}</span>
                      <span className="text-iron-400 text-sm">lbs</span>
                      {r.reps > 1 && <span className="text-iron-500 text-sm">&times; {r.reps}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-iron-500 hidden sm:inline">
                        {formatShortDate(r.achievedAt)}
                      </span>
                      {isPendingDelete ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setPendingDelete(null)}
                            className="text-xs px-2 py-1 rounded border border-iron-700 text-iron-400 hover:text-iron-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDelete(r.id)}
                            disabled={isBusy}
                            className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
                          >
                            {isBusy ? "..." : "Delete"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            aria-label={`Edit ${r.exerciseName} ${r.recordType}`}
                            className="text-xs px-2 py-1 rounded border border-iron-700 text-iron-400 hover:text-iron-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(r.id)}
                            aria-label={`Delete ${r.exerciseName} ${r.recordType}`}
                            className="text-xs px-2 py-1 rounded border border-iron-800 text-iron-500 hover:text-red-400 hover:border-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {Object.keys(grouped).length === 0 && !showForm && (
        <div className="card text-center py-12">
          <p className="text-iron-400 mb-3">No personal records yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First PR</button>
        </div>
      )}
    </div>
  );
}

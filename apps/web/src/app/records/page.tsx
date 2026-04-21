"use client";

import { useEffect, useState } from "react";

const BIG_THREE = ["Squat", "Bench Press", "Deadlift"];
const COMMON_EXERCISES = [
  "Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row",
  "Front Squat", "Romanian Deadlift", "Close-Grip Bench", "Sumo Deadlift",
  "Incline Bench", "Pause Squat", "Deficit Deadlift",
];
const RECORD_TYPES = ["1RM", "3RM", "5RM", "MAX_REPS"];

interface PR {
  id: string;
  exercise: string;
  recordType: string;
  weightLbs: number;
  reps: number;
  date: string;
  notes: string | null;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    try {
      const exercise = form.exercise === "__custom__" ? form.customExercise : form.exercise;
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise,
          recordType: form.recordType,
          weightLbs: Number(form.weightLbs),
          reps: Number(form.reps),
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecords((prev) => [data.record, ...prev]);
        setShowForm(false);
        setForm({ exercise: "Squat", customExercise: "", recordType: "1RM", weightLbs: "", reps: "1", notes: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Group records by exercise
  const grouped = records.reduce((acc, r) => {
    if (!acc[r.exercise]) acc[r.exercise] = [];
    acc[r.exercise].push(r);
    return acc;
  }, {} as Record<string, PR[]>);

  // Get best 1RM per exercise
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
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
              {pr ? (
                <>
                  <p className="text-3xl font-mono font-bold">{pr.weightLbs}</p>
                  <p className="text-xs text-iron-500">lbs</p>
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
              {recs.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-iron-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="badge bg-iron-800 text-iron-300 border border-iron-700">{r.recordType}</span>
                    <span className="text-xl font-mono font-bold">{r.weightLbs}</span>
                    <span className="text-iron-400 text-sm">lbs</span>
                    {r.reps > 1 && <span className="text-iron-500 text-sm">&times; {r.reps}</span>}
                  </div>
                  <span className="text-sm text-iron-500">
                    {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              ))}
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

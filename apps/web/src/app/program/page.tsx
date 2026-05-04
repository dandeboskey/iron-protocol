"use client";

import { useEffect, useState } from "react";

type WizardStep = "info" | "phases" | "days" | "review";

interface PhaseInput {
  name: string;
  phaseType: string;
  weekCount: number;
  days: DayInput[];
}

interface DayInput {
  dayNumber: number;
  label: string;
  exercises: ExerciseInput[];
}

interface ExerciseInput {
  exerciseName: string;
  sets: number;
  reps: number;
  rpe: number;
  percentOfE1RM: number | null;
  isAccessory: boolean;
}

const DEFAULT_PHASES: PhaseInput[] = [
  {
    name: "Hypertrophy",
    phaseType: "HYPERTROPHY",
    weekCount: 4,
    days: [
      { dayNumber: 1, label: "Lower A", exercises: [{ exerciseName: "Squat", sets: 4, reps: 8, rpe: 7, percentOfE1RM: 0.70, isAccessory: false }] },
      { dayNumber: 2, label: "Upper A", exercises: [{ exerciseName: "Bench Press", sets: 4, reps: 8, rpe: 7, percentOfE1RM: 0.70, isAccessory: false }] },
      { dayNumber: 3, label: "Lower B", exercises: [{ exerciseName: "Deadlift", sets: 3, reps: 5, rpe: 7, percentOfE1RM: 0.72, isAccessory: false }] },
      { dayNumber: 4, label: "Upper B", exercises: [{ exerciseName: "Bench Press", sets: 4, reps: 6, rpe: 7, percentOfE1RM: 0.72, isAccessory: false }] },
    ],
  },
  { name: "Strength", phaseType: "STRENGTH", weekCount: 4, days: [] },
  { name: "Peaking", phaseType: "PEAKING", weekCount: 3, days: [] },
  { name: "Deload", phaseType: "DELOAD", weekCount: 1, days: [] },
];

const COMMON_EXERCISES = [
  "Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row",
  "Front Squat", "Romanian Deadlift", "Close-Grip Bench", "Sumo Deadlift",
  "Leg Press", "Leg Curl", "Leg Extension", "Pull-Up", "Lat Pulldown",
  "Dumbbell Row", "Lateral Raise", "Face Pull", "Tricep Pushdown",
  "Bicep Curl", "Plank", "Cable Row",
];

export default function ProgramPage() {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WizardStep>("info");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Wizard state
  const [programName, setProgramName] = useState("My Program");
  const [phases, setPhases] = useState<PhaseInput[]>(DEFAULT_PHASES);
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  useEffect(() => {
    fetch("/api/program")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function addExercise(phaseIdx: number, dayIdx: number) {
    const newPhases = [...phases];
    newPhases[phaseIdx].days[dayIdx].exercises.push({
      exerciseName: "Squat",
      sets: 3,
      reps: 8,
      rpe: 7,
      percentOfE1RM: null,
      isAccessory: false,
    });
    setPhases(newPhases);
  }

  function updateExercise(phaseIdx: number, dayIdx: number, exIdx: number, field: string, value: any) {
    const newPhases = [...phases];
    (newPhases[phaseIdx].days[dayIdx].exercises[exIdx] as any)[field] = value;
    setPhases(newPhases);
  }

  function removeExercise(phaseIdx: number, dayIdx: number, exIdx: number) {
    const newPhases = [...phases];
    newPhases[phaseIdx].days[dayIdx].exercises.splice(exIdx, 1);
    setPhases(newPhases);
  }

  function addDay(phaseIdx: number) {
    const newPhases = [...phases];
    const dayNum = newPhases[phaseIdx].days.length + 1;
    newPhases[phaseIdx].days.push({
      dayNumber: dayNum,
      label: `Day ${dayNum}`,
      exercises: [],
    });
    setPhases(newPhases);
  }

  async function handleSave() {
    setSaveError(null);
    const name = programName.trim();
    if (!name) {
      setSaveError("Program name is required.");
      return;
    }
    const hasAnyDay = phases.some((p) => p.days.length > 0);
    if (!hasAnyDay) {
      setSaveError("At least one phase needs a training day before saving.");
      return;
    }
    setSaving(true);
    try {
      const totalWeeks = phases.reduce((sum, p) => sum + p.weekCount, 0);
      const res = await fetch("/api/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, durationWeeks: totalWeeks, phases }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "Failed to save program.");
        return;
      }
      setTemplates((prev) => [data.template, ...prev]);
      setTab("list");
      setStep("info");
    } catch (err) {
      console.error(err);
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Programs</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab("list")} className={tab === "list" ? "btn-primary" : "btn-secondary"}>
            My Programs
          </button>
          <button onClick={() => { setTab("create"); setStep("info"); }} className={tab === "create" ? "btn-primary" : "btn-secondary"}>
            + Create
          </button>
        </div>
      </div>

      {tab === "list" && (
        <>
          {loading ? (
            <div className="text-iron-500 text-center py-12">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-iron-400 mb-3">No programs yet.</p>
              <button onClick={() => setTab("create")} className="btn-primary">Create Your First Program</button>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((t: any) => (
                <div key={t.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{t.name}</h3>
                    <span className="text-sm text-iron-400">{t.durationWeeks} weeks</span>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {t.phases?.map((p: any) => (
                      <span key={p.id} className={`badge-${p.phaseType.toLowerCase()}`}>
                        {p.name} ({p.weekCount}wk)
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-sm opacity-50 cursor-not-allowed"
                      disabled
                      title="Detail view coming soon"
                    >
                      View Details
                    </button>
                    <button
                      className="btn-primary text-sm opacity-50 cursor-not-allowed"
                      disabled
                      title="Block start flow coming soon"
                    >
                      Start Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "create" && (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex gap-2">
            {(["info", "phases", "days", "review"] as WizardStep[]).map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full ${
                (["info", "phases", "days", "review"] as WizardStep[]).indexOf(step) >= i ? "bg-accent" : "bg-iron-800"
              }`} />
            ))}
          </div>

          {step === "info" && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold">Program Info</h2>
              <div>
                <label className="label">Program Name</label>
                <input type="text" className="input-field" value={programName} onChange={(e) => setProgramName(e.target.value)} />
              </div>
              <button onClick={() => setStep("phases")} className="btn-primary w-full">Next: Define Phases</button>
            </div>
          )}

          {step === "phases" && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold">Training Phases</h2>
              {phases.map((phase, idx) => (
                <div key={idx} className="bg-iron-800 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-iron-500">Phase Name</label>
                      <input type="text" className="input-field" value={phase.name}
                        onChange={(e) => { const p = [...phases]; p[idx].name = e.target.value; setPhases(p); }} />
                    </div>
                    <div>
                      <label className="text-xs text-iron-500">Type</label>
                      <select className="input-field" value={phase.phaseType}
                        onChange={(e) => { const p = [...phases]; p[idx].phaseType = e.target.value; setPhases(p); }}>
                        <option value="HYPERTROPHY">Hypertrophy</option>
                        <option value="STRENGTH">Strength</option>
                        <option value="PEAKING">Peaking</option>
                        <option value="DELOAD">Deload</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-iron-500">Weeks</label>
                      <input type="number" inputMode="numeric" min={1} max={12} className="input-field" value={phase.weekCount}
                        onChange={(e) => { const p = [...phases]; p[idx].weekCount = Number(e.target.value); setPhases(p); }} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setPhases([...phases, { name: "New Phase", phaseType: "HYPERTROPHY", weekCount: 4, days: [] }])}
                className="btn-secondary w-full">+ Add Phase</button>
              <div className="flex gap-3">
                <button onClick={() => setStep("info")} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep("days")} className="btn-primary flex-1">Next: Training Days</button>
              </div>
            </div>
          )}

          {step === "days" && (
            <div className="space-y-4">
              {/* Phase selector */}
              <div className="flex gap-2 overflow-x-auto">
                {phases.map((phase, idx) => (
                  <button key={idx} onClick={() => { setActivePhaseIdx(idx); setActiveDayIdx(0); }}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activePhaseIdx === idx ? "bg-accent text-white" : "bg-iron-800 text-iron-400"}`}>
                    {phase.name}
                  </button>
                ))}
              </div>

              {/* Days for active phase */}
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{phases[activePhaseIdx]?.name} — Training Days</h2>
                  <button onClick={() => addDay(activePhaseIdx)} className="btn-secondary text-sm">+ Add Day</button>
                </div>

                {phases[activePhaseIdx]?.days.length === 0 && (
                  <p className="text-iron-500 text-center py-6">No training days yet. Add one to start.</p>
                )}

                {/* Day tabs */}
                {phases[activePhaseIdx]?.days.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {phases[activePhaseIdx].days.map((day, idx) => (
                      <button key={idx} onClick={() => setActiveDayIdx(idx)}
                        className={`px-3 py-1.5 rounded text-sm ${activeDayIdx === idx ? "bg-iron-700 text-white" : "bg-iron-800 text-iron-500"}`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Exercises for active day */}
                {phases[activePhaseIdx]?.days[activeDayIdx] && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-iron-500">Day Label</label>
                      <input type="text" className="input-field" value={phases[activePhaseIdx].days[activeDayIdx].label}
                        onChange={(e) => {
                          const p = [...phases]; p[activePhaseIdx].days[activeDayIdx].label = e.target.value; setPhases(p);
                        }} />
                    </div>

                    {phases[activePhaseIdx].days[activeDayIdx].exercises.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-iron-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-iron-300">Exercise {exIdx + 1}</span>
                          <button onClick={() => removeExercise(activePhaseIdx, activeDayIdx, exIdx)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select className="input-field text-sm" value={ex.exerciseName}
                              onChange={(e) => updateExercise(activePhaseIdx, activeDayIdx, exIdx, "exerciseName", e.target.value)}>
                              {COMMON_EXERCISES.map((name) => <option key={name} value={name}>{name}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <input type="number" inputMode="numeric" className="input-field text-sm w-16 text-center" placeholder="Sets" value={ex.sets}
                              onChange={(e) => updateExercise(activePhaseIdx, activeDayIdx, exIdx, "sets", Number(e.target.value))} />
                            <span className="text-iron-500 self-center">&times;</span>
                            <input type="number" inputMode="numeric" className="input-field text-sm w-16 text-center" placeholder="Reps" value={ex.reps}
                              onChange={(e) => updateExercise(activePhaseIdx, activeDayIdx, exIdx, "reps", Number(e.target.value))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-iron-500">RPE</label>
                            <input type="number" inputMode="decimal" step="0.5" className="input-field text-sm" value={ex.rpe}
                              onChange={(e) => updateExercise(activePhaseIdx, activeDayIdx, exIdx, "rpe", Number(e.target.value))} />
                          </div>
                          <div>
                            <label className="text-[10px] text-iron-500">% e1RM</label>
                            <input type="number" inputMode="decimal" step="0.01" className="input-field text-sm" placeholder="0.70"
                              value={ex.percentOfE1RM ?? ""} onChange={(e) => updateExercise(activePhaseIdx, activeDayIdx, exIdx, "percentOfE1RM", e.target.value ? Number(e.target.value) : null)} />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm text-iron-400 cursor-pointer">
                              <input type="checkbox" checked={ex.isAccessory}
                                onChange={(e) => updateExercise(activePhaseIdx, activeDayIdx, exIdx, "isAccessory", e.target.checked)}
                                className="w-4 h-4 rounded" />
                              Accessory
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button onClick={() => addExercise(activePhaseIdx, activeDayIdx)} className="btn-secondary w-full text-sm">+ Add Exercise</button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("phases")} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep("review")} className="btn-primary flex-1">Review &amp; Save</button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold">Review: {programName}</h2>
              <p className="text-iron-400">
                {phases.reduce((sum, p) => sum + p.weekCount, 0)} total weeks &middot; {phases.length} phases
              </p>
              {phases.map((phase, idx) => (
                <div key={idx} className="bg-iron-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge-${phase.phaseType.toLowerCase()}`}>{phase.phaseType}</span>
                    <span className="font-medium">{phase.name}</span>
                    <span className="text-iron-500 text-sm">{phase.weekCount} weeks</span>
                  </div>
                  {phase.days.map((day, dIdx) => (
                    <div key={dIdx} className="ml-4 mt-2">
                      <p className="text-sm text-iron-300">{day.label}</p>
                      <div className="ml-4 text-xs text-iron-500">
                        {day.exercises.map((ex, eIdx) => (
                          <span key={eIdx}>{ex.exerciseName} {ex.sets}&times;{ex.reps}{eIdx < day.exercises.length - 1 ? " \u00b7 " : ""}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {phase.days.length === 0 && <p className="text-iron-600 text-sm ml-4">No days configured</p>}
                </div>
              ))}
              {saveError && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{saveError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("days")} className="btn-secondary flex-1">Back</button>
                <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
                  {saving ? "Saving..." : "Save Program"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

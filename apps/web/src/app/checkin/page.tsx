"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function SliderField({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label className="label mb-0">{label}</label>
        <span className="text-2xl font-bold font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${
            pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#ef4444"
          } 0%, ${
            pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#ef4444"
          } ${pct}%, #41414a ${pct}%, #41414a 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-iron-500">
        <span>{lowLabel || min}</span>
        <span>{highLabel || max}</span>
      </div>
    </div>
  );
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CheckInPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
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

  useEffect(() => {
    fetch("/api/biometric")
      .then((r) => r.json())
      .then((data) => {
        const entries = data.entries || [];
        if (entries.length > 0 && isToday(entries[0].date)) {
          setAlreadyCheckedIn(true);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hrv = form.hrvMs ? Number(form.hrvMs) : null;
    if (hrv != null && (!Number.isFinite(hrv) || hrv < 15 || hrv > 150)) {
      setError("HRV should be between 15 and 150 ms.");
      return;
    }
    const sleep = form.sleepHours ? Number(form.sleepHours) : null;
    if (sleep != null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 14)) {
      setError("Sleep hours should be between 0 and 14.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrvMs: hrv,
          sleepHours: sleep,
          sleepQuality: form.sleepQuality,
          mood: form.mood,
          soreness: form.soreness,
          energy: form.energy,
          stress: form.stress,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Submission failed. Please try again.");
        return;
      }
      setSubmitted(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      console.error("Check-in error:", err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="pb-20 md:pb-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-5xl text-green-400">&#10003;</div>
          <p className="text-xl font-semibold text-green-400">Check-in recorded</p>
          <p className="text-iron-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-6">Daily Check-In</h1>

      {alreadyCheckedIn && (
        <div className="mb-6 px-4 py-3 bg-amber-950/40 border border-amber-900 rounded-lg text-sm text-amber-300">
          You've already checked in today. Submitting again will add another entry; readiness uses the most recent.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Numeric inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">HRV (ms)</label>
            <input
              type="number"
              inputMode="numeric"
              min={15}
              max={150}
              step={1}
              className="input-field"
              placeholder="e.g. 55"
              value={form.hrvMs}
              onChange={(e) => setForm({ ...form, hrvMs: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Sleep Hours</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={14}
              step="0.1"
              className="input-field"
              placeholder="e.g. 7.5"
              value={form.sleepHours}
              onChange={(e) => setForm({ ...form, sleepHours: e.target.value })}
            />
          </div>
        </div>

        {/* Sliders */}
        <div className="card space-y-6">
          <SliderField
            label="Sleep Quality"
            value={form.sleepQuality}
            onChange={(v) => setForm({ ...form, sleepQuality: v })}
            lowLabel="Terrible"
            highLabel="Amazing"
          />
          <SliderField
            label="Mood"
            value={form.mood}
            onChange={(v) => setForm({ ...form, mood: v })}
            lowLabel="Low"
            highLabel="Great"
          />
          <SliderField
            label="Soreness"
            value={form.soreness}
            onChange={(v) => setForm({ ...form, soreness: v })}
            lowLabel="None"
            highLabel="Severe"
          />
          <SliderField
            label="Energy"
            value={form.energy}
            onChange={(v) => setForm({ ...form, energy: v })}
            lowLabel="Exhausted"
            highLabel="Wired"
          />
          <SliderField
            label="Stress"
            value={form.stress}
            onChange={(v) => setForm({ ...form, stress: v })}
            lowLabel="Chill"
            highLabel="Maxed"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input-field h-20 resize-none"
            placeholder="Anything notable? Travel, illness, life stress..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</p>
        )}

        <button type="submit" className="btn-primary w-full text-lg py-4" disabled={submitting}>
          {submitting ? "Recording..." : "Submit Check-In"}
        </button>
      </form>
    </div>
  );
}

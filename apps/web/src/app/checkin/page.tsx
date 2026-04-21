"use client";

import { useState } from "react";
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

export default function CheckInPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrvMs: form.hrvMs ? Number(form.hrvMs) : null,
          sleepHours: form.sleepHours ? Number(form.sleepHours) : null,
          sleepQuality: form.sleepQuality,
          mood: form.mood,
          soreness: form.soreness,
          energy: form.energy,
          stress: form.stress,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => router.push("/"), 1500);
      }
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-5xl text-green-400">&#10003;</div>
        <p className="text-xl font-semibold text-green-400">Check-in recorded</p>
        <p className="text-iron-400">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      <h1 className="text-2xl font-bold mb-6">Daily Check-In</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Numeric inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">HRV (ms)</label>
            <input
              type="number"
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

        <button type="submit" className="btn-primary w-full text-lg py-4" disabled={submitting}>
          {submitting ? "Recording..." : "Submit Check-In"}
        </button>
      </form>
    </div>
  );
}

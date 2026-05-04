"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [athlete, setAthlete] = useState<any>(null);
  const [e1rms, setE1rms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    bodyweightLbs: "",
    heightIn: "",
    experienceYrs: "",
  });

  useEffect(() => {
    fetch("/api/athlete")
      .then((r) => r.json())
      .then((data) => {
        if (data.athlete) {
          setAthlete(data.athlete);
          setForm({
            name: data.athlete.name,
            bodyweightLbs: String(data.athlete.bodyweightLbs),
            heightIn: String(data.athlete.heightIn || ""),
            experienceYrs: String(data.athlete.experienceYrs),
          });
        }
        setE1rms(data.e1rms || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);

    const name = form.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    const bw = Number(form.bodyweightLbs);
    if (!Number.isFinite(bw) || bw < 50 || bw > 600) {
      setError("Bodyweight must be between 50 and 600 lbs.");
      return;
    }
    const exp = Number(form.experienceYrs);
    if (!Number.isFinite(exp) || exp < 0 || exp > 60) {
      setError("Experience must be between 0 and 60 years.");
      return;
    }
    const height = form.heightIn ? Number(form.heightIn) : null;
    if (height != null && (!Number.isFinite(height) || height < 36 || height > 96)) {
      setError("Height must be between 36 and 96 inches.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/athlete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bodyweightLbs: bw,
          heightIn: height,
          experienceYrs: exp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save profile.");
        return;
      }
      const data = await res.json();
      setAthlete(data.athlete);
      setSavedAt(Date.now());
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-iron-500">Loading...</div>
      </div>
    );
  }

  const showSaved = savedAt != null && Date.now() - savedAt < 4000;

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Athlete Profile</h1>

      <form onSubmit={handleSave} className="card space-y-4">
        <div>
          <label className="label">Name</label>
          <input
            type="text"
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Bodyweight (lbs)</label>
            <input
              type="number"
              inputMode="decimal"
              min={50}
              max={600}
              step="0.1"
              className="input-field"
              value={form.bodyweightLbs}
              onChange={(e) => setForm({ ...form, bodyweightLbs: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Height (in)</label>
            <input
              type="number"
              inputMode="decimal"
              min={36}
              max={96}
              step="0.1"
              className="input-field"
              value={form.heightIn}
              onChange={(e) => setForm({ ...form, heightIn: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Experience (yrs)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={60}
              step="0.5"
              className="input-field"
              value={form.experienceYrs}
              onChange={(e) => setForm({ ...form, experienceYrs: e.target.value })}
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</p>
        )}
        {showSaved && (
          <p className="text-sm text-green-400 bg-green-950/40 border border-green-900 rounded px-3 py-2">Saved.</p>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {e1rms.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium text-iron-400 mb-4">Estimated 1RMs</h2>
          <div className="space-y-3">
            {e1rms.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-iron-800 last:border-0">
                <div>
                  <p className="font-medium">{r.exercise}</p>
                  <p className="text-xs text-iron-500">
                    {r.method} &middot; from {r.sourceWeight}&times;{r.sourceReps}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-mono font-bold">{r.e1rmLbs}</p>
                  <p className="text-xs text-iron-500">
                    {(r.e1rmLbs / (athlete?.bodyweightLbs || 1)).toFixed(1)}&times; BW
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

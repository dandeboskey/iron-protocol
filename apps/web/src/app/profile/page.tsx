"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [athlete, setAthlete] = useState<any>(null);
  const [e1rms, setE1rms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    try {
      await fetch("/api/athlete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          bodyweightLbs: Number(form.bodyweightLbs),
          heightIn: form.heightIn ? Number(form.heightIn) : null,
          experienceYrs: Number(form.experienceYrs),
        }),
      });
    } catch (err) {
      console.error(err);
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
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Bodyweight (lbs)</label>
            <input
              type="number"
              className="input-field"
              value={form.bodyweightLbs}
              onChange={(e) => setForm({ ...form, bodyweightLbs: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Height (in)</label>
            <input
              type="number"
              className="input-field"
              value={form.heightIn}
              onChange={(e) => setForm({ ...form, heightIn: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Experience (yrs)</label>
            <input
              type="number"
              step="0.5"
              className="input-field"
              value={form.experienceYrs}
              onChange={(e) => setForm({ ...form, experienceYrs: e.target.value })}
            />
          </div>
        </div>
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

"use client";

import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/biometric")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-iron-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Biometric History</h1>

      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-iron-400">No biometric entries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <div key={entry.id} className="card-compact">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">
                  {new Date(entry.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {entry.hrvMs && (
                  <span className="text-sm font-mono text-iron-300">
                    HRV: {entry.hrvMs}ms
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                {entry.sleepHours != null && (
                  <div className="bg-iron-800 rounded px-2 py-1 text-center">
                    <p className="text-iron-500 text-xs">Sleep</p>
                    <p className="font-mono">{entry.sleepHours}h</p>
                  </div>
                )}
                {entry.sleepQuality != null && (
                  <div className="bg-iron-800 rounded px-2 py-1 text-center">
                    <p className="text-iron-500 text-xs">Quality</p>
                    <p className="font-mono">{entry.sleepQuality}/10</p>
                  </div>
                )}
                {entry.mood != null && (
                  <div className="bg-iron-800 rounded px-2 py-1 text-center">
                    <p className="text-iron-500 text-xs">Mood</p>
                    <p className="font-mono">{entry.mood}/10</p>
                  </div>
                )}
                {entry.soreness != null && (
                  <div className="bg-iron-800 rounded px-2 py-1 text-center">
                    <p className="text-iron-500 text-xs">Soreness</p>
                    <p className="font-mono">{entry.soreness}/10</p>
                  </div>
                )}
                {entry.energy != null && (
                  <div className="bg-iron-800 rounded px-2 py-1 text-center">
                    <p className="text-iron-500 text-xs">Energy</p>
                    <p className="font-mono">{entry.energy}/10</p>
                  </div>
                )}
                {entry.stress != null && (
                  <div className="bg-iron-800 rounded px-2 py-1 text-center">
                    <p className="text-iron-500 text-xs">Stress</p>
                    <p className="font-mono">{entry.stress}/10</p>
                  </div>
                )}
              </div>
              {entry.notes && (
                <p className="text-sm text-iron-500 mt-2">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

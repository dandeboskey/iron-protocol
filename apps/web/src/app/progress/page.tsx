"use client";

import { useEffect, useState } from "react";

const BIG_THREE = ["Squat", "Bench Press", "Deadlift"];

export default function ProgressPage() {
  const [e1rmHistory, setE1rmHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/athlete")
      .then((r) => r.json())
      .then((data) => {
        setE1rmHistory(data.e1rms || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-iron-500">Loading...</div></div>;
  }

  // Group e1RM records by exercise
  const grouped = e1rmHistory.reduce((acc: Record<string, any[]>, r: any) => {
    if (!acc[r.exercise]) acc[r.exercise] = [];
    acc[r.exercise].push(r);
    return acc;
  }, {});

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Progressive Overload</h1>
      <p className="text-iron-400 text-sm">
        Track your strength progression across training blocks. Every logged set automatically updates your estimated 1RM.
      </p>

      {/* Big 3 Summary */}
      <div className="grid grid-cols-3 gap-3">
        {BIG_THREE.map((exercise) => {
          const records = grouped[exercise] || [];
          const latest = records[0];
          const previous = records[1];
          const delta = latest && previous ? latest.e1rmLbs - previous.e1rmLbs : null;

          return (
            <div key={exercise} className="card text-center">
              <p className="text-xs text-iron-400 uppercase tracking-wide mb-1">{exercise}</p>
              <p className="text-3xl font-mono font-bold">{latest?.e1rmLbs ?? "--"}</p>
              <p className="text-xs text-iron-500">est. 1RM</p>
              {delta !== null && (
                <p className={`text-xs mt-1 font-mono ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-iron-500"}`}>
                  {delta > 0 ? "+" : ""}{delta} lbs
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-exercise history */}
      {Object.entries(grouped)
        .sort(([a], [b]) => {
          const aIdx = BIG_THREE.indexOf(a);
          const bIdx = BIG_THREE.indexOf(b);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.localeCompare(b);
        })
        .map(([exercise, records]) => {
          const maxE1rm = Math.max(...records.map((r: any) => r.e1rmLbs));
          return (
            <div key={exercise} className="card">
              <h3 className="font-semibold text-lg mb-3">{exercise}</h3>

              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-24 mb-3">
                {records.slice(0, 20).reverse().map((r: any, i: number) => {
                  const height = maxE1rm > 0 ? (r.e1rmLbs / maxE1rm) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 min-w-[4px] group relative">
                      <div
                        className="bg-accent/60 hover:bg-accent rounded-t transition-colors"
                        style={{ height: `${height}%` }}
                      />
                      <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-iron-800 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {r.e1rmLbs} lbs
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent entries */}
              <div className="space-y-1">
                {records.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="flex justify-between text-sm py-1 border-b border-iron-800 last:border-0">
                    <span className="text-iron-400">
                      {new Date(r.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{r.e1rmLbs} lbs</span>
                      {r.sourceWeight && r.sourceReps && (
                        <span className="text-iron-500 text-xs">
                          from {r.sourceWeight}&times;{r.sourceReps}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {Object.keys(grouped).length === 0 && (
        <div className="card text-center py-12">
          <p className="text-iron-400 mb-3">No progression data yet.</p>
          <p className="text-iron-500 text-sm">Log sets during your workouts to start tracking.</p>
        </div>
      )}
    </div>
  );
}

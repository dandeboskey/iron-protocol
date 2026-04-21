"use client";

import { useEffect, useState } from "react";

export default function BlockPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/block").then((r) => r.json()),
      fetch("/api/athlete").then((r) => r.json()),
    ])
      .then(([blockData, athleteData]) => {
        setData({ ...blockData, e1rms: athleteData.e1rms });
      })
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

  const block = data?.block;
  const phases = ["HYPERTROPHY", "STRENGTH", "PEAKING", "DELOAD"];

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Training Block</h1>

      {block ? (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">{block.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-iron-400">Phase</p>
                <span className={`badge-${block.phase.toLowerCase()}`}>{block.phase}</span>
              </div>
              <div>
                <p className="text-sm text-iron-400">Progress</p>
                <p className="text-lg font-mono">Week {block.currentWeek}/{block.weekCount}</p>
              </div>
              <div>
                <p className="text-sm text-iron-400">Training Day</p>
                <p className="text-lg font-mono">Day {block.currentDay}</p>
              </div>
              <div>
                <p className="text-sm text-iron-400">Status</p>
                <p className="text-lg">{block.status}</p>
              </div>
            </div>
          </div>

          {/* Phase timeline */}
          <div className="card">
            <h3 className="text-sm font-medium text-iron-400 mb-4">Macrocycle Phases</h3>
            <div className="flex gap-2">
              {phases.map((phase) => (
                <div
                  key={phase}
                  className={`flex-1 rounded-lg p-3 text-center text-xs font-medium transition-all ${
                    phase === block.phase
                      ? "bg-accent/20 text-accent border border-accent/30 ring-2 ring-accent/20"
                      : phases.indexOf(phase) < phases.indexOf(block.phase)
                      ? "bg-iron-800 text-iron-500 border border-iron-700"
                      : "bg-iron-900 text-iron-600 border border-iron-800"
                  }`}
                >
                  {phase}
                </div>
              ))}
            </div>
          </div>

          {/* Sessions */}
          {block.sessions && block.sessions.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-medium text-iron-400 mb-4">Sessions This Week</h3>
              <div className="space-y-2">
                {block.sessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-iron-800 last:border-0">
                    <div>
                      <p className="font-medium">Day {s.dayNumber}</p>
                      <p className="text-xs text-iron-500">
                        {s.prescriptions?.length || 0} exercises
                      </p>
                    </div>
                    <div className="text-right">
                      {s.completedAt ? (
                        <span className="text-green-400 text-sm">&#10003; Complete</span>
                      ) : (
                        <span className="text-iron-500 text-sm">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-iron-400">No active training block.</p>
        </div>
      )}

      {/* e1RMs */}
      {data?.e1rms?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-iron-400 mb-4">Current Estimated 1RMs</h3>
          <div className="space-y-3">
            {data.e1rms.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="font-medium">{r.exercise}</span>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold">{r.e1rmLbs}</span>
                  <span className="text-iron-400 text-sm ml-1">lbs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatMonthDay, formatWeight } from "@/lib/format";
import { api } from "@/lib/apiClient";
import { getApiErrorMessage } from "@iron-protocol/api-client";
import type {
  E1RMRecord,
  FatigueResponse,
} from "@iron-protocol/api-contract";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const BIG_THREE = ["Squat", "Bench Press", "Deadlift"];

function FatigueChart({
  timeline,
  current,
}: {
  timeline: FatigueResponse["timeline"];
  current: FatigueResponse["current"];
}) {
  const fatigueColor =
    current.fatigue >= 60 ? "#ef4444" : current.fatigue >= 30 ? "#eab308" : "#22c55e";

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-iron-500 uppercase">
            Banister Fatigue Index
          </p>
          <p className="text-3xl font-black font-mono mt-1" style={{ color: fatigueColor }}>
            {current.fatigue}
            <span className="text-base font-normal text-iron-400"> / 100</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-iron-400">
            Recovery est.
          </p>
          <p className="text-xl font-mono font-bold text-iron-200">
            {current.recoveryDays === 0 ? "Fresh" : `${current.recoveryDays}d`}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="fatigueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fatigueColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fatigueColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#41414a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#747484", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#747484", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#27272e", border: "1px solid #41414a", borderRadius: 8 }}
            labelStyle={{ color: "#91919f", fontSize: 11 }}
            itemStyle={{ color: fatigueColor, fontFamily: "monospace" }}
            formatter={(v: any) => [`${v}`, "Fatigue"]}
          />
          <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.4} />
          <ReferenceLine y={30} stroke="#eab308" strokeDasharray="4 2" strokeOpacity={0.4} />
          <Area
            type="monotone"
            dataKey="fatigue"
            stroke={fatigueColor}
            strokeWidth={2}
            fill="url(#fatigueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: fatigueColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3 text-xs text-iron-500">
        <span><span className="text-green-400">●</span> Fresh (&lt;30)</span>
        <span><span className="text-yellow-400">●</span> Accumulating (30–60)</span>
        <span><span className="text-red-400">●</span> High (&gt;60)</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [e1rmHistory, setE1rmHistory] = useState<E1RMRecord[]>([]);
  const [fatigueData, setFatigueData] = useState<FatigueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.athlete.get(),
      // Fatigue tolerates failure independently — an athlete with no completed
      // sessions still gets a useful e1RM view; we just hide the chart.
      api.fatigue.get().catch(() => null),
    ])
      .then(([athleteData, fatigue]) => {
        setE1rmHistory(athleteData.e1rms);
        setFatigueData(fatigue);
      })
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load progress.")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-iron-500">Loading...</div></div>;
  }

  const grouped = e1rmHistory.reduce((acc, r) => {
    if (!acc[r.exercise]) acc[r.exercise] = [];
    acc[r.exercise].push(r);
    return acc;
  }, {} as Record<string, E1RMRecord[]>);

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <h1 className="text-2xl font-bold">Progressive Overload</h1>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">{error}</p>
      )}

      {/* Banister Fatigue Chart */}
      {fatigueData && (
        <FatigueChart timeline={fatigueData.timeline} current={fatigueData.current} />
      )}

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
              <p className="text-3xl font-mono font-bold">{latest ? formatWeight(latest.e1rmLbs) : "--"}</p>
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
          const maxE1rm = Math.max(...records.map((r) => r.e1rmLbs));
          return (
            <div key={exercise} className="card">
              <h3 className="font-semibold text-lg mb-3">{exercise}</h3>

              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-24 mb-3">
                {records.slice(0, 20).reverse().map((r, i) => {
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
                {records.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex justify-between text-sm py-1 border-b border-iron-800 last:border-0">
                    <span className="text-iron-400">
                      {formatMonthDay(r.recordedAt)}
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

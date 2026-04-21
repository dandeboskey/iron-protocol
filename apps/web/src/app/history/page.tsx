"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

const PERIOD_OPTIONS = [7, 30] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

function TrendChart({
  data,
  dataKey,
  color,
  label,
  unit,
  refLine,
}: {
  data: any[];
  dataKey: string;
  color: string;
  label: string;
  unit: string;
  refLine?: number;
}) {
  const values = data.map((d) => d[dataKey]).filter((v) => v != null) as number[];
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const latest = values[values.length - 1] ?? null;
  const prev = values[values.length - 2] ?? null;
  const delta = latest != null && prev != null ? latest - prev : null;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-iron-500 uppercase">{label}</p>
          <p className="text-3xl font-black font-mono text-iron-50 mt-1">
            {latest != null ? `${latest}${unit}` : "—"}
          </p>
        </div>
        <div className="text-right">
          {avg != null && (
            <p className="text-sm text-iron-400">
              avg <span className="font-mono text-iron-300">{avg}{unit}</span>
            </p>
          )}
          {delta != null && (
            <p className={`text-sm font-mono ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-iron-500"}`}>
              {delta > 0 ? "+" : ""}{Math.round(delta)}{unit} vs prev
            </p>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#41414a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#747484", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#747484", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#27272e", border: "1px solid #41414a", borderRadius: 8 }}
            labelStyle={{ color: "#91919f", fontSize: 11 }}
            itemStyle={{ color: color, fontFamily: "monospace" }}
            formatter={(v: any) => [`${v}${unit}`, label]}
          />
          {refLine != null && (
            <ReferenceLine y={refLine} stroke="#747484" strokeDasharray="4 4" />
          )}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

export default function HistoryPage() {
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);

  useEffect(() => {
    fetch("/api/biometric")
      .then((r) => r.json())
      .then((data) => setAllEntries(data.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const entries = allEntries.slice(0, period);
  // Charts want chronological order (oldest→newest)
  const chartData = [...entries].reverse().map((e) => ({
    label: formatLabel(e.date),
    hrvMs: e.hrvMs,
    sleepHours: e.sleepHours,
    mood: e.mood,
    energy: e.energy,
    soreness: e.soreness,
    stress: e.stress,
  }));

  // Compute HRV average for reference line
  const hrvAvg =
    chartData.length > 0
      ? Math.round(
          chartData.reduce((sum, d) => sum + (d.hrvMs ?? 0), 0) /
            chartData.filter((d) => d.hrvMs != null).length
        )
      : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-iron-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Biometric History</h1>
        <div className="flex gap-1 bg-iron-900 border border-iron-700 rounded-lg p-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                period === p
                  ? "bg-red-600 text-white"
                  : "text-iron-400 hover:text-iron-200"
              }`}
            >
              {p}D
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-iron-400">No biometric entries yet.</p>
        </div>
      ) : (
        <>
          {/* Trend Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrendChart
              data={chartData}
              dataKey="hrvMs"
              color="#22c55e"
              label="HRV"
              unit="ms"
              refLine={hrvAvg}
            />
            <TrendChart
              data={chartData}
              dataKey="sleepHours"
              color="#3b82f6"
              label="Sleep"
              unit="h"
              refLine={8}
            />
            <TrendChart
              data={chartData}
              dataKey="energy"
              color="#f59e0b"
              label="Energy"
              unit="/10"
            />
            <TrendChart
              data={chartData}
              dataKey="soreness"
              color="#ef4444"
              label="Soreness"
              unit="/10"
            />
          </div>

          {/* Entry Log */}
          <div>
            <h2 className="text-sm font-semibold text-iron-500 uppercase tracking-wider mb-3">
              Daily Log
            </h2>
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
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import { getApiErrorMessage } from "@iron-protocol/api-client";
import type {
  Athlete,
  BiometricEntry,
  Readiness,
  ActiveBlock,
  WorkoutResponse,
} from "@iron-protocol/api-contract";

interface DashboardData {
  athlete: Athlete | null;
  readiness: Readiness | null;
  block: ActiveBlock | null;
  workout: WorkoutResponse | null;
  biometricEntries: BiometricEntry[];
}

function ReadinessGauge({ score, coefficient }: { score: number; coefficient: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 54;
  const dashoffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#393940" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 60 60)"
          className="transition-all duration-700"
        />
        <text x="60" y="55" textAnchor="middle" className="fill-iron-100 text-3xl font-bold" fontSize="28">
          {score}
        </text>
        <text x="60" y="75" textAnchor="middle" className="fill-iron-400" fontSize="11">
          Rc {coefficient.toFixed(3)}
        </text>
      </svg>
      <p className="text-sm text-iron-400 mt-2">Readiness Score</p>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const cls = `badge-${phase.toLowerCase()}`;
  return <span className={cls}>{phase}</span>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        // Workout returns 404 when no active block exists; tolerate that without
        // dropping the rest of the dashboard. Same pattern for an athlete who
        // hasn't checked in yet — readiness is just null.
        const [athlete, bio, block, workout] = await Promise.all([
          api.athlete.get(),
          api.dashboard.get(),
          api.block.get(),
          api.workout.today().catch(() => null),
        ]);

        setData({
          athlete: athlete.athlete,
          readiness: bio.readiness,
          block: block.block,
          workout,
          biometricEntries: bio.entries,
        });
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load dashboard."));
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-iron-500 text-lg">Loading Iron Protocol...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/profile" className="btn-primary">Set Up Profile</Link>
      </div>
    );
  }

  if (!data?.athlete) {
    return (
      <div className="card text-center py-12">
        <p className="text-iron-400 mb-4">No athlete profile found.</p>
        <Link href="/profile" className="btn-primary">Set Up Profile</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.athlete.name}</h1>
          <p className="text-iron-400 text-sm">
            {data.athlete.bodyweightLbs} lbs &middot; {data.athlete.experienceYrs}yr experience
          </p>
        </div>
        {data.block && <PhaseBadge phase={data.block.phase} />}
      </div>

      {/* Readiness + Block Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card flex flex-col items-center py-8">
          {data.readiness ? (
            <ReadinessGauge score={data.readiness.score} coefficient={data.readiness.coefficient} />
          ) : (
            <div className="text-center">
              <p className="text-iron-500 mb-3">No check-in today</p>
              <Link href="/checkin" className="btn-primary">Check In Now</Link>
            </div>
          )}
          {data.readiness && data.readiness.flags.length > 0 && (
            <div className="mt-4 space-y-1">
              {data.readiness.flags.map((f, i) => (
                <p key={i} className="text-xs text-amber-400/80 text-center">{f}</p>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-iron-400 mb-3">Current Block</h2>
          {data.block ? (
            <div className="space-y-3">
              <p className="text-lg font-semibold">{data.block.name}</p>
              <div className="flex items-center gap-3">
                <PhaseBadge phase={data.block.phase} />
                <span className="text-iron-400 text-sm">
                  Week {data.block.currentWeek}/{data.block.weekCount}
                </span>
              </div>
              <div className="w-full bg-iron-800 rounded-full h-2 mt-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((data.block.currentWeek - 1) / data.block.weekCount) * 100)}%` }}
                />
              </div>
              <Link href="/block" className="text-sm text-accent hover:text-accent-light">
                View block details &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-iron-500">No active block</p>
          )}
        </div>
      </div>

      {/* Today's Workout Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-iron-400">Today&apos;s Workout</h2>
          {data.workout?.label && (
            <span className="text-xs text-iron-500">{data.workout.label}</span>
          )}
        </div>
        {data.workout?.regulated ? (
          <>
            <div className="space-y-2">
              {data.workout.regulated.slice(0, 4).map((ex, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-iron-800 last:border-0">
                  <div>
                    <p className="font-medium">{ex.exerciseName}</p>
                    <p className="text-xs text-iron-500">{ex.regulationNote}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {ex.adjustedSets}&times;{ex.reps} @ RPE {ex.adjustedRpe}
                    </p>
                    {ex.targetWeightLbs && (
                      <p className="text-xs text-accent">{ex.targetWeightLbs} lbs</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Link href="/workout" className="btn-primary block text-center mt-4">
              Start Workout
            </Link>
          </>
        ) : (
          <p className="text-iron-500">Complete check-in to generate workout</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/checkin" className="btn-secondary text-center">
          Daily Check-In
        </Link>
        <Link href="/history" className="btn-secondary text-center">
          View History
        </Link>
      </div>
    </div>
  );
}

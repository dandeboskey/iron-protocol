import { NextResponse } from "next/server";
import { getActiveAthlete, getTrailingBiometrics, createBiometricEntry, getAllLatestE1RMs } from "@iron-protocol/db/queries";
import { calculateReadiness, calculateHrvBaseline } from "@iron-protocol/core-logic";
import type { BiometricSnapshot, AthleteProfile } from "@iron-protocol/core-logic";

export async function GET() {
  try {
    const athlete = await getActiveAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "No athlete found" }, { status: 404 });
    }
    const entries = await getTrailingBiometrics(athlete.id, 30);
    const e1rms = await getAllLatestE1RMs(athlete.id);

    // Calculate current readiness from most recent entry
    let readiness = null;
    if (entries.length > 0) {
      const latest = entries[0];
      const snapshot: BiometricSnapshot = {
        hrvMs: latest.hrvMs,
        sleepHours: latest.sleepHours,
        sleepQuality: latest.sleepQuality,
        mood: latest.mood,
        soreness: latest.soreness,
        energy: latest.energy,
        stress: latest.stress,
      };
      const e1rmMap: Record<string, number> = {};
      for (const r of e1rms) e1rmMap[r.exercise] = r.e1rmLbs;
      const profile: AthleteProfile = {
        bodyweightLbs: athlete.bodyweightLbs,
        experienceYrs: athlete.experienceYrs,
        e1rms: e1rmMap,
      };
      const trailing7 = entries.slice(0, 7);
      const hrvBaseline = calculateHrvBaseline(
        trailing7.map((e) => ({ hrvMs: e.hrvMs, date: e.date.toISOString() }))
      );
      readiness = calculateReadiness(snapshot, profile, hrvBaseline);
    }

    return NextResponse.json({ entries, readiness });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch biometrics" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const athlete = await getActiveAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "No athlete found" }, { status: 404 });
    }
    const entry = await createBiometricEntry({
      athleteId: athlete.id,
      hrvMs: body.hrvMs ?? null,
      sleepHours: body.sleepHours ?? null,
      sleepQuality: body.sleepQuality ?? null,
      mood: body.mood ?? null,
      soreness: body.soreness ?? null,
      energy: body.energy ?? null,
      stress: body.stress ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create biometric entry" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { prisma } from "@iron-protocol/db";
import { getAllLatestE1RMs } from "@iron-protocol/db/queries";
import { calculateAccumulatedFatigue, estimatedRecoveryDays } from "@iron-protocol/core-logic";
import type { AthleteProfile } from "@iron-protocol/core-logic";

export async function GET() {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) return NextResponse.json({ error: "No athlete found" }, { status: 404 });

    const e1rms = await getAllLatestE1RMs(athlete.id);
    const e1rmMap: Record<string, number> = {};
    for (const r of e1rms) e1rmMap[r.exercise] = r.e1rmLbs;

    const profile: AthleteProfile = {
      bodyweightLbs: athlete.bodyweightLbs,
      experienceYrs: athlete.experienceYrs,
      e1rms: e1rmMap,
    };

    // Fetch last 28 days of completed sessions with their volume
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);

    const sessions = await prisma.trainingSession.findMany({
      where: {
        block: { athleteId: athlete.id },
        completedAt: { gte: cutoff },
      },
      include: { completedSets: true },
      orderBy: { scheduledDate: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build per-day fatigue timeline for the last 28 days
    const timeline: { date: string; fatigue: number; recovery: number }[] = [];

    for (let d = 27; d >= 0; d--) {
      const target = new Date(today);
      target.setDate(today.getDate() - d);
      const label = target.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });

      // Sessions that were completed before this point in time
      const sessionsBeforeDay = sessions
        .filter((s) => {
          const done = s.completedAt ? new Date(s.completedAt) : null;
          return done && done <= target;
        })
        .map((s) => {
          const totalVolume = s.completedSets.reduce(
            (sum, cs) => sum + cs.weightLbs * cs.reps,
            0
          );
          const sessionDate = new Date(s.scheduledDate);
          sessionDate.setHours(0, 0, 0, 0);
          const daysAgo = Math.round(
            (target.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return { totalVolume, daysAgo };
        });

      const fatigue = calculateAccumulatedFatigue(sessionsBeforeDay, profile);
      const recovery = estimatedRecoveryDays(fatigue, profile);
      timeline.push({ date: label, fatigue, recovery });
    }

    const current = timeline[timeline.length - 1];

    return NextResponse.json({
      timeline,
      current: {
        fatigue: current.fatigue,
        recoveryDays: current.recovery,
      },
    });
  } catch (e) {
    console.error("Fatigue route error:", e);
    return NextResponse.json({ error: "Failed to compute fatigue" }, { status: 500 });
  }
}

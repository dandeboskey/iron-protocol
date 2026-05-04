import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { prisma } from "@iron-protocol/db";
import { getAthleteWithBlock, getTrailingBiometrics, getAllLatestE1RMs, getTodaySession } from "@iron-protocol/db/queries";
import {
  calculateReadiness,
  calculateHrvBaseline,
  autoRegulateSession,
  generateDayPrescriptions,
  getDayLabel,
} from "@iron-protocol/core-logic";
import type { BiometricSnapshot, AthleteProfile, BasePrescription } from "@iron-protocol/core-logic";

export async function GET() {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "No athlete found" }, { status: 404 });
    }

    const data = await getAthleteWithBlock(athlete.id);
    const block = data?.trainingBlocks?.[0];
    if (!block) {
      return NextResponse.json({ error: "No active training block" }, { status: 404 });
    }

    // Get e1RMs
    const e1rmRecords = await getAllLatestE1RMs(athlete.id);
    const e1rmMap: Record<string, number> = {};
    for (const r of e1rmRecords) e1rmMap[r.exercise] = r.e1rmLbs;

    const profile: AthleteProfile = {
      bodyweightLbs: athlete.bodyweightLbs,
      experienceYrs: athlete.experienceYrs,
      e1rms: e1rmMap,
    };

    // Calculate readiness
    const biometrics = await getTrailingBiometrics(athlete.id, 7);
    let readiness = null;
    if (biometrics.length > 0) {
      const latest = biometrics[0];
      const snapshot: BiometricSnapshot = {
        hrvMs: latest.hrvMs,
        sleepHours: latest.sleepHours,
        sleepQuality: latest.sleepQuality,
        mood: latest.mood,
        soreness: latest.soreness,
        energy: latest.energy,
        stress: latest.stress,
        restingHeartRate: latest.restingHeartRate ?? null,
        respiratoryRate: latest.respiratoryRate ?? null,
      };
      const hrvBaseline = calculateHrvBaseline(
        biometrics.map((e) => ({ hrvMs: e.hrvMs, date: e.date.toISOString() }))
      );
      readiness = calculateReadiness(snapshot, profile, hrvBaseline);
    }

    // Check for existing session today
    let session = await getTodaySession(block.id);
    const phase = block.phase as any;

    // Generate prescriptions from the engine
    const { label, prescriptions: basePrescriptions } = generateDayPrescriptions(
      phase,
      block.currentWeek,
      block.currentDay,
      profile
    );

    // Auto-regulate if we have readiness data
    const regulated = readiness
      ? autoRegulateSession(basePrescriptions, readiness, phase, profile)
      : basePrescriptions.map((p) => ({
          ...p,
          adjustedSets: p.sets,
          adjustedRpe: p.rpe,
          adjustedPercentE1RM: p.percentOfE1RM,
          targetWeightLbs: null,
          regulationNote: "No biometric data — using base prescription",
        }));

    // If no session exists for today, create one with prescriptions
    if (!session) {
      session = await prisma.trainingSession.create({
        data: {
          blockId: block.id,
          weekNumber: block.currentWeek,
          dayNumber: block.currentDay,
          readinessScore: readiness?.score ?? null,
          readinessCoeff: readiness?.coefficient ?? 1.0,
          autoRegNote: readiness?.flags?.join("; ") ?? null,
          prescriptions: {
            create: regulated.map((r, idx) => ({
              exerciseName: r.exerciseName,
              exerciseOrder: idx + 1,
              prescribedSets: r.adjustedSets,
              prescribedReps: r.reps,
              prescribedRPE: r.adjustedRpe,
              percentOfE1RM: r.adjustedPercentE1RM,
              targetWeightLbs: r.targetWeightLbs,
              isAccessory: r.isAccessory,
            })),
          },
        },
        include: {
          prescriptions: { orderBy: { exerciseOrder: "asc" } },
          completedSets: true,
        },
      });
    }

    return NextResponse.json({
      session,
      label,
      readiness,
      regulated,
      block: {
        id: block.id,
        name: block.name,
        phase: block.phase,
        currentWeek: block.currentWeek,
        currentDay: block.currentDay,
        weekCount: block.weekCount,
      },
    });
  } catch (e: any) {
    console.error("Workout generation error:", e);
    return NextResponse.json({ error: e.message || "Failed to generate workout" }, { status: 500 });
  }
}

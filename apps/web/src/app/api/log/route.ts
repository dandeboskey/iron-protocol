import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { logCompletedSet, recordE1RM } from "@iron-protocol/db/queries";
import { prisma } from "@iron-protocol/db";
import { compositeE1RM } from "@iron-protocol/core-logic";

export async function POST(request: Request) {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sessionId, prescriptionId, setNumber, reps, weightLbs, rpe } = body;

    if (!sessionId || !prescriptionId || !setNumber || !reps || !weightLbs) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (Number(weightLbs) <= 0 || Number(reps) < 1 || Number(setNumber) < 1) {
      return NextResponse.json({ error: "Invalid numeric values" }, { status: 400 });
    }

    // Verify session belongs to this athlete and prescription belongs to that session.
    // Prevents cross-user tampering via arbitrary IDs in the request body.
    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { block: { select: { athleteId: true } } },
    });
    if (!session || session.block.athleteId !== athlete.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prescription = await prisma.exercisePrescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!prescription || prescription.sessionId !== sessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const set = await logCompletedSet({
      sessionId,
      prescriptionId,
      setNumber,
      reps,
      weightLbs,
      rpe: rpe ?? null,
    });

    if (reps <= 12 && reps >= 1) {
      const e1rm = compositeE1RM(weightLbs, reps);
      await recordE1RM({
        athleteId: athlete.id,
        exercise: prescription.exerciseName,
        e1rmLbs: e1rm,
        method: "COMPOSITE",
        sourceWeight: weightLbs,
        sourceReps: reps,
      });
    }

    return NextResponse.json({ set });
  } catch (e) {
    console.error("Log set error:", e);
    return NextResponse.json({ error: "Failed to log set" }, { status: 500 });
  }
}

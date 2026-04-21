import { NextResponse } from "next/server";
import { logCompletedSet, recordE1RM, getActiveAthlete } from "@iron-protocol/db/queries";
import { prisma } from "@iron-protocol/db";
import { compositeE1RM } from "@iron-protocol/core-logic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, prescriptionId, setNumber, reps, weightLbs, rpe } = body;

    if (!sessionId || !prescriptionId || !setNumber || !reps || !weightLbs) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Log the completed set (immutable record)
    const set = await logCompletedSet({
      sessionId,
      prescriptionId,
      setNumber,
      reps,
      weightLbs,
      rpe: rpe ?? null,
    });

    // Auto-calculate e1RM from this set if it's meaningful (<=12 reps)
    if (reps <= 12 && reps >= 1) {
      const e1rm = compositeE1RM(weightLbs, reps);
      const prescription = await prisma.exercisePrescription.findUnique({
        where: { id: prescriptionId },
      });
      if (prescription) {
        const athlete = await getActiveAthlete();
        if (athlete) {
          await recordE1RM({
            athleteId: athlete.id,
            exercise: prescription.exerciseName,
            e1rmLbs: e1rm,
            method: "COMPOSITE",
            sourceWeight: weightLbs,
            sourceReps: reps,
          });
        }
      }
    }

    return NextResponse.json({ set });
  } catch (e) {
    return NextResponse.json({ error: "Failed to log set" }, { status: 500 });
  }
}

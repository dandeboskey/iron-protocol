import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/getSessionAthlete";
import { getLatestPRs, upsertPersonalRecord } from "@iron-protocol/db/queries";

export async function GET() {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const records = await getLatestPRs(athlete.id);
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const exerciseName = String(body.exerciseName ?? body.exercise ?? "").trim();
    if (!exerciseName) {
      return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
    }
    const recordType = String(body.recordType ?? "").trim();
    if (!recordType) {
      return NextResponse.json({ error: "Record type is required" }, { status: 400 });
    }
    const weightLbs = Number(body.weightLbs);
    if (!Number.isFinite(weightLbs) || weightLbs <= 0) {
      return NextResponse.json({ error: "Weight must be greater than 0" }, { status: 400 });
    }
    const reps = body.reps != null ? Number(body.reps) : 1;
    if (!Number.isFinite(reps) || reps < 1) {
      return NextResponse.json({ error: "Reps must be at least 1" }, { status: 400 });
    }

    const record = await upsertPersonalRecord({
      athleteId: athlete.id,
      exerciseName,
      recordType,
      weightLbs,
      reps,
    });
    return NextResponse.json({ record });
  } catch (e) {
    console.error("PR create error:", e);
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
  }
}

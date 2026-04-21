import { NextResponse } from "next/server";
import { getActiveAthlete, getLatestPRs, upsertPersonalRecord } from "@iron-protocol/db/queries";

export async function GET() {
  try {
    const athlete = await getActiveAthlete();
    if (!athlete) return NextResponse.json({ error: "No athlete" }, { status: 404 });
    const records = await getLatestPRs(athlete.id);
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const athlete = await getActiveAthlete();
    if (!athlete) return NextResponse.json({ error: "No athlete" }, { status: 404 });
    const record = await upsertPersonalRecord({
      athleteId: athlete.id,
      exercise: body.exercise,
      recordType: body.recordType,
      weightLbs: body.weightLbs,
      reps: body.reps ?? 1,
      notes: body.notes ?? undefined,
    });
    return NextResponse.json({ record });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
  }
}

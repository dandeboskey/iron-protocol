import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/getSessionAthlete";
import { prisma } from "@iron-protocol/db";

async function assertOwnership(id: string) {
  const athlete = await getSessionAthlete();
  if (!athlete) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const record = await prisma.personalRecord.findUnique({ where: { id } });
  if (!record) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (record.athleteId !== athlete.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { athlete, record };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await assertOwnership(params.id);
    if ("error" in ctx) return ctx.error;

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.exerciseName != null) {
      const name = String(body.exerciseName).trim();
      if (!name) return NextResponse.json({ error: "Exercise name cannot be empty" }, { status: 400 });
      data.exerciseName = name;
    }
    if (body.recordType != null) data.recordType = String(body.recordType);
    if (body.weightLbs != null) {
      const w = Number(body.weightLbs);
      if (!Number.isFinite(w) || w <= 0) {
        return NextResponse.json({ error: "Weight must be greater than 0" }, { status: 400 });
      }
      data.weightLbs = w;
    }
    if (body.reps != null) {
      const r = Number(body.reps);
      if (!Number.isFinite(r) || r < 1) {
        return NextResponse.json({ error: "Reps must be at least 1" }, { status: 400 });
      }
      data.reps = r;
    }
    if (body.notes !== undefined) data.notes = body.notes ?? null;

    const updated = await prisma.personalRecord.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ record: updated });
  } catch (e) {
    console.error("PR update error:", e);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await assertOwnership(params.id);
    if ("error" in ctx) return ctx.error;

    await prisma.personalRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PR delete error:", e);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

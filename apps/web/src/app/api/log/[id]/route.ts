import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { prisma } from "@iron-protocol/db";

/**
 * Walks CompletedSet → TrainingSession → TrainingBlock → athleteId to confirm
 * the authenticated athlete owns this set. Mirrors the security model used in
 * `/api/records/[id]` (load row, verify athleteId match).
 */
async function assertOwnership(id: string) {
  const athlete = await getSessionAthlete();
  if (!athlete) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const set = await prisma.completedSet.findUnique({
    where: { id },
    include: { session: { include: { block: { select: { athleteId: true } } } } },
  });
  if (!set) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (set.session.block.athleteId !== athlete.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { athlete, set };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await assertOwnership(params.id);
    if ("error" in ctx) return ctx.error;

    const body = await request.json();
    const data: Record<string, unknown> = {};

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
    if (body.rpe !== undefined) {
      if (body.rpe === null || body.rpe === "") {
        data.rpe = null;
      } else {
        const rp = Number(body.rpe);
        if (!Number.isFinite(rp) || rp < 1 || rp > 10) {
          return NextResponse.json({ error: "RPE must be between 1 and 10" }, { status: 400 });
        }
        data.rpe = rp;
      }
    }

    const updated = await prisma.completedSet.update({
      where: { id: params.id },
      data,
    });
    // NOTE: Existing E1RMRecord rows are intentionally not recomputed here.
    // The schema has no per-set link from E1RMRecord → CompletedSet, so we'd
    // be matching on (athleteId, exercise, sourceWeight, sourceReps) which is
    // ambiguous. e1RM history stays append-only; new logs continue to push
    // fresh rows. Treat e1RM trend as "best evidence at the time".
    return NextResponse.json({ set: updated });
  } catch (e) {
    console.error("Set update error:", e);
    return NextResponse.json({ error: "Failed to update set" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await assertOwnership(params.id);
    if ("error" in ctx) return ctx.error;

    await prisma.completedSet.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Set delete error:", e);
    return NextResponse.json({ error: "Failed to delete set" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { prisma } from "@iron-protocol/db";

export async function POST(request: Request) {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { block: true },
    });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.block.athleteId !== athlete.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.completedAt) return NextResponse.json({ error: "Already completed" }, { status: 400 });

    const block = session.block;

    const weekSessions = await prisma.trainingSession.findMany({
      where: { blockId: block.id, weekNumber: block.currentWeek },
      orderBy: { dayNumber: "asc" },
    });
    const daysInWeek = weekSessions.length > 0
      ? Math.max(...weekSessions.map((s: { dayNumber: number }) => s.dayNumber))
      : 4;

    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date() },
    });

    let nextWeek = block.currentWeek;
    let nextDay = block.currentDay + 1;
    let nextStatus = block.status;

    if (nextDay > daysInWeek) {
      nextDay = 1;
      nextWeek = block.currentWeek + 1;
      if (nextWeek > block.weekCount) {
        nextStatus = "COMPLETED";
      }
    }

    const updatedBlock = await prisma.trainingBlock.update({
      where: { id: block.id },
      data: {
        currentDay: nextDay,
        currentWeek: Math.min(nextWeek, block.weekCount),
        status: nextStatus,
      },
    });

    return NextResponse.json({ block: updatedBlock });
  } catch (e) {
    console.error("Session complete error:", e);
    return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
  }
}

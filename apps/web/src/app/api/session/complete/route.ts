import { NextResponse } from "next/server";
import { prisma } from "@iron-protocol/db";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { block: true },
    });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.completedAt) return NextResponse.json({ error: "Already completed" }, { status: 400 });

    const block = session.block;

    // Count distinct training days in this week to know when to roll over
    const weekSessions = await prisma.trainingSession.findMany({
      where: { blockId: block.id, weekNumber: block.currentWeek },
      orderBy: { dayNumber: "asc" },
    });
    const daysInWeek = weekSessions.length > 0
      ? Math.max(...weekSessions.map((s) => s.dayNumber))
      : 4; // default 4-day split

    // Mark session complete
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date() },
    });

    // Advance block position
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

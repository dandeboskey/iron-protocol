import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/getSessionAthlete";
import { prisma } from "@iron-protocol/db";
import { getAthleteWithBlock } from "@iron-protocol/db/queries";
import { macrocycleProgress, evaluateTransition } from "@iron-protocol/core-logic";
import type { BlockState } from "@iron-protocol/core-logic";

export async function GET() {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "No athlete found" }, { status: 404 });
    }
    const data = await getAthleteWithBlock(athlete.id);
    const activeBlock = data?.trainingBlocks?.[0] ?? null;

    let progress = 0;
    if (activeBlock) {
      const state: BlockState = {
        phase: activeBlock.phase as any,
        status: activeBlock.status as any,
        weekCount: activeBlock.weekCount,
        currentWeek: activeBlock.currentWeek,
        currentDay: activeBlock.currentDay,
        startDate: activeBlock.startDate.toISOString(),
      };
      progress = macrocycleProgress(state);
    }

    return NextResponse.json({ block: activeBlock, progress });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch block" }, { status: 500 });
  }
}

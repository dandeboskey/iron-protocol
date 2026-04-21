import { NextResponse } from "next/server";
import { prisma } from "@iron-protocol/db";
import { getActiveAthlete, getProgramTemplates } from "@iron-protocol/db/queries";

export async function GET() {
  try {
    const athlete = await getActiveAthlete();
    if (!athlete) return NextResponse.json({ error: "No athlete" }, { status: 404 });
    const templates = await getProgramTemplates(athlete.id);
    return NextResponse.json({ templates });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const athlete = await getActiveAthlete();
    if (!athlete) return NextResponse.json({ error: "No athlete" }, { status: 404 });

    const template = await prisma.programTemplate.create({
      data: {
        athleteId: athlete.id,
        name: body.name,
        durationWeeks: body.durationWeeks,
        source: "MANUAL",
        phases: {
          create: body.phases.map((phase: any, pIdx: number) => ({
            name: phase.name,
            phaseType: phase.phaseType,
            weekCount: phase.weekCount,
            phaseOrder: pIdx + 1,
            days: {
              create: (phase.days || []).map((day: any) => ({
                dayNumber: day.dayNumber,
                label: day.label,
                muscleFocus: day.muscleFocus || null,
                exercises: {
                  create: (day.exercises || []).map((ex: any, eIdx: number) => ({
                    exerciseName: ex.exerciseName,
                    exerciseOrder: eIdx + 1,
                    sets: ex.sets,
                    reps: ex.reps,
                    rpe: ex.rpe || null,
                    percentOfE1RM: ex.percentOfE1RM || null,
                    isAccessory: ex.isAccessory || false,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        phases: {
          include: { days: { include: { exercises: true } } },
        },
      },
    });

    return NextResponse.json({ template });
  } catch (e: any) {
    console.error("Program creation error:", e);
    return NextResponse.json({ error: e.message || "Failed to create program" }, { status: 500 });
  }
}

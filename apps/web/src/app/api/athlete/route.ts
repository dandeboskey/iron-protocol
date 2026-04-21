import { NextResponse } from "next/server";
import { prisma } from "@iron-protocol/db";
import { getActiveAthlete, getAllLatestE1RMs } from "@iron-protocol/db/queries";

export async function GET() {
  try {
    const athlete = await getActiveAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "No athlete found" }, { status: 404 });
    }
    const e1rms = await getAllLatestE1RMs(athlete.id);
    return NextResponse.json({ athlete, e1rms });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch athlete" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const athlete = await getActiveAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "No athlete found" }, { status: 404 });
    }
    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: {
        name: body.name,
        bodyweightLbs: body.bodyweightLbs,
        heightIn: body.heightIn,
        experienceYrs: body.experienceYrs,
      },
    });
    return NextResponse.json({ athlete: updated });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { prisma } from "@iron-protocol/db";
import { getAllLatestE1RMs } from "@iron-protocol/db/queries";

export async function GET() {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const e1rms = await getAllLatestE1RMs(athlete.id);
    return NextResponse.json({ athlete, e1rms });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch athlete" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const athlete = await getSessionAthlete();
    if (!athlete) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const bodyweightLbs = Number(body.bodyweightLbs);
    if (!Number.isFinite(bodyweightLbs) || bodyweightLbs < 50 || bodyweightLbs > 600) {
      return NextResponse.json({ error: "Bodyweight must be between 50 and 600 lbs" }, { status: 400 });
    }

    const experienceYrs = Number(body.experienceYrs);
    if (!Number.isFinite(experienceYrs) || experienceYrs < 0 || experienceYrs > 60) {
      return NextResponse.json({ error: "Experience must be between 0 and 60 years" }, { status: 400 });
    }

    let heightIn: number | null = null;
    if (body.heightIn != null && body.heightIn !== "") {
      const h = Number(body.heightIn);
      if (!Number.isFinite(h) || h < 36 || h > 96) {
        return NextResponse.json({ error: "Height must be between 36 and 96 inches" }, { status: 400 });
      }
      heightIn = h;
    }

    const updated = await prisma.athlete.update({
      where: { id: athlete.id },
      data: { name, bodyweightLbs, heightIn, experienceYrs },
    });
    return NextResponse.json({ athlete: updated });
  } catch (e) {
    console.error("Athlete update error:", e);
    return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 });
  }
}

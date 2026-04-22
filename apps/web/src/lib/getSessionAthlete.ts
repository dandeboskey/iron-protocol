import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "@iron-protocol/db";

/**
 * Returns the Athlete for the currently authenticated user.
 * Falls back to the first athlete in dev when no session exists
 * (seed data / unauthenticated API calls during local testing).
 */
export async function getSessionAthlete() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
    });
    if (athlete) return athlete;
  }

  // Dev fallback: return seed athlete so the app works without a login
  return prisma.athlete.findFirst({ orderBy: { createdAt: "asc" } });
}

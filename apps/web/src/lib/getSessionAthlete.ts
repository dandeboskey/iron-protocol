import { getServerSession } from "next-auth";
import { decode } from "next-auth/jwt";
import { headers } from "next/headers";
import { authOptions } from "./auth";
import { prisma } from "@iron-protocol/db";

/**
 * Resolves the current user id from either source:
 *   1. Web: NextAuth session cookie (getServerSession reads it automatically)
 *   2. Mobile: `Authorization: Bearer <jwt>` header set by the Expo app
 *
 * Both tokens are signed with NEXTAUTH_SECRET, so the same decode path works.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  // Mobile bearer-token path
  const auth = headers().get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: process.env.NEXTAUTH_SECRET!,
      });
      if (decoded?.uid) return decoded.uid as string;
      if (decoded?.sub) return decoded.sub;
    } catch {
      return null;
    }
  }
  return null;
}

/** Returns the Athlete linked to the current user (web or mobile), or null. */
export async function getSessionAthlete() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  return prisma.athlete.findUnique({ where: { userId } });
}

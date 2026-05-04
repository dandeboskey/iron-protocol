import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { decode } from "next-auth/jwt";
import { headers } from "next/headers";
import { prisma } from "@iron-protocol/db";
import { getAthleteByUserId } from "@iron-protocol/db/queries";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // JWT strategy is required for next-auth/middleware to work at the edge.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
  events: {
    // Runs AFTER the User row exists in the DB, so the FK to Athlete is safe.
    // Idempotent via upsert — works for new users and backfills existing ones.
    async signIn({ user }) {
      if (!user.email || !user.id) return;
      await prisma.athlete.upsert({
        where: { email: user.email },
        update: { userId: user.id },
        create: {
          userId: user.id,
          name: user.name ?? "New Athlete",
          email: user.email,
          bodyweightLbs: 185,
          experienceYrs: 1,
        },
      });
    },
  },
};

/**
 * Resolves the current user id from either source:
 *   1. Web: NextAuth session cookie (getServerSession reads it automatically)
 *   2. Mobile / Watch: `Authorization: Bearer <jwt>` header
 *
 * Both tokens are signed with NEXTAUTH_SECRET so the same decode path works.
 *
 * Lives here (rather than in @iron-protocol/db/queries) so the db package
 * stays free of NextAuth — see architecture doc §8.7.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

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

/** Returns the Athlete linked to the current user (web or mobile/watch), or null. */
export async function getSessionAthlete() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  return getAthleteByUserId(userId);
}

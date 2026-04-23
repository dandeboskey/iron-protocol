import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@iron-protocol/db";

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

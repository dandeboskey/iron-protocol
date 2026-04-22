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
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-provision an Athlete record for every new Google sign-up.
      // bodyweightLbs and experienceYrs are defaults — user updates them in /profile.
      await prisma.athlete.upsert({
        where: { email: user.email! },
        update: { userId: user.id },
        create: {
          userId: user.id,
          name: user.name ?? "New Athlete",
          email: user.email!,
          bodyweightLbs: 185,
          experienceYrs: 1,
        },
      });
    },
  },
};

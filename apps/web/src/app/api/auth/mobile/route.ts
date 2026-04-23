import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { encode } from "next-auth/jwt";
import { prisma } from "@iron-protocol/db";

/**
 * Mobile auth exchange: accepts a Google id_token obtained on-device via
 * expo-auth-session, verifies it against Google's public keys, upserts the
 * User + Account + Athlete, and returns a NextAuth-format session JWT that
 * the mobile app can present as `Authorization: Bearer <token>` on every
 * subsequent API request.
 *
 * This keeps mobile and web converged on a single session format so
 * getSessionAthlete() can validate both with the same JWT secret.
 */

// Accept id_tokens from any registered Google client (web + iOS share the
// same project, so Google signs with the same keys — we just verify the
// aud matches one of our known clients).
const ALLOWED_AUDIENCES = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
].filter(Boolean) as string[];

const googleClient = new OAuth2Client();

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // 1. Verify the id_token cryptographically against Google's public keys
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: ALLOWED_AUDIENCES,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const googleSub = payload.sub;
    const email = payload.email;
    const name = payload.name ?? "Athlete";
    const image = payload.picture ?? null;

    // 2. Upsert User by email (matches the way PrismaAdapter does it for web)
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, image },
      create: { email, name, image, emailVerified: new Date() },
    });

    // 3. Ensure there's an Account row linking this user to Google (idempotent)
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: { provider: "google", providerAccountId: googleSub },
      },
      update: { userId: user.id },
      create: {
        userId: user.id,
        type: "oauth",
        provider: "google",
        providerAccountId: googleSub,
      },
    });

    // 4. Upsert Athlete linked to the user (same logic as web events.signIn)
    await prisma.athlete.upsert({
      where: { email },
      update: { userId: user.id },
      create: {
        userId: user.id,
        name,
        email,
        bodyweightLbs: 185,
        experienceYrs: 1,
      },
    });

    // 5. Issue a NextAuth-compatible JWT so the SAME secret validates web
    //    cookies and mobile bearer tokens. 30-day expiry to match web default.
    const token = await encode({
      token: {
        sub: user.id,
        uid: user.id,
        name,
        email,
        picture: image,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, email, name, image },
    });
  } catch (err: any) {
    console.error("[mobile-auth] error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Authentication failed", detail: err?.message ?? "unknown" },
      { status: 401 }
    );
  }
}

import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // Protect only page routes. API routes authenticate themselves via
  // getSessionAthlete(), which accepts both web cookies and mobile bearer
  // tokens. Excluding /api here lets mobile requests reach those routes
  // without hitting the cookie-only middleware.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

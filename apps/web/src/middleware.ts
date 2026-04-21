export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/checkin",
    "/workout",
    "/block",
    "/records",
    "/history",
    "/connect",
    "/program",
    "/progress",
    "/profile",
  ],
};

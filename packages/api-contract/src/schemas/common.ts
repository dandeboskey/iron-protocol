import { z } from "zod";

/**
 * Generic error envelope returned by every Next.js route handler in apps/web.
 * Shape: `{ "error": string }` with HTTP status 4xx/5xx.
 */
export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

/**
 * Helper: ISO-8601 datetime string serialized by Next.js / Prisma.
 * We do NOT coerce to Date in the contract — keep wire format pure strings.
 * Consumers that want `Date` can transform after parsing.
 */
export const IsoDateString = z.string().min(1);

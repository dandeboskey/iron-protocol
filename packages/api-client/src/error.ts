/**
 * Thrown for any non-2xx response, or for responses whose body fails Zod
 * parsing. Consumers should catch this rather than the generic `Error`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Narrow the parsed error body to the `{ error: string }` envelope when
 * possible. Falls back to the message we constructed.
 */
export function getApiErrorMessage(err: unknown, fallback = "Request failed"): string {
  if (err instanceof ApiError) {
    if (err.body && typeof err.body === "object" && "error" in err.body) {
      const msg = (err.body as { error: unknown }).error;
      if (typeof msg === "string" && msg.length > 0) return msg;
    }
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

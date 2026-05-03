import type { z } from "@iron-protocol/api-contract";
import { ApiError } from "./error";

/**
 * Pluggable transport contract. The web app passes a fetch that includes
 * cookies (Next.js session); the mobile app passes a fetch that ignores
 * cookies and relies on `getAuthToken()` for a bearer header.
 */
export type FetchLike = typeof fetch;

export interface TransportOptions {
  baseUrl: string;
  /**
   * Bearer-token resolver. If present and returns a non-null string, the
   * transport sends `Authorization: Bearer <token>`. Web doesn't need this
   * (cookie auth); mobile and watch do.
   */
  getAuthToken?: () => Promise<string | null> | string | null;
  /** Override the global `fetch` (e.g. node-fetch, msw, test mock). */
  fetchImpl?: FetchLike;
}

export type RequestOptions = {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export interface Transport {
  request<T>(opts: RequestOptions, parser: z.ZodType<T>): Promise<T>;
}

function joinUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const trimmedBase = baseUrl.replace(/\/$/, "");
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${trimmedBase}${trimmedPath}`;
  if (query) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) usp.set(k, String(v));
    }
    const qs = usp.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export function createTransport(options: TransportOptions): Transport {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "@iron-protocol/api-client: no fetch available. Pass `fetchImpl` or run in an env with global fetch."
    );
  }

  return {
    async request<T>(opts: RequestOptions, parser: z.ZodType<T>): Promise<T> {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      let body: BodyInit | undefined;
      if (opts.body !== undefined && opts.body !== null) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.body);
      }

      if (options.getAuthToken) {
        const token = await options.getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      const url = joinUrl(options.baseUrl, opts.path, opts.query);
      const res = await fetchImpl(url, {
        method: opts.method,
        headers,
        body,
        // Web (cookie auth) needs same-origin credentials. The web consumer
        // can override fetchImpl if it wants stricter behavior; default is
        // safe for both browsers (relative URL same-origin) and RN.
        credentials: "include",
      });

      const text = await res.text();
      let parsed: unknown = null;
      if (text.length > 0) {
        try {
          parsed = JSON.parse(text);
        } catch {
          // Non-JSON response. Surface as ApiError below.
          parsed = { error: text };
        }
      }

      if (!res.ok) {
        const message =
          parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
            ? String((parsed as { error: unknown }).error)
            : `HTTP ${res.status}`;
        throw new ApiError(message, res.status, parsed);
      }

      const result = parser.safeParse(parsed);
      if (!result.success) {
        throw new ApiError(
          `Response validation failed for ${opts.method} ${opts.path}: ${result.error.message}`,
          res.status,
          parsed
        );
      }
      return result.data;
    },
  };
}

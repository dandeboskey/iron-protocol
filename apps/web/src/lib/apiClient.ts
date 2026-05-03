"use client";

import { createApiClient } from "@iron-protocol/api-client";

/**
 * Browser API client. The web app uses cookie-based session auth (NextAuth),
 * so no `getAuthToken` is wired. `baseUrl: ""` keeps requests relative,
 * which means same-origin and cookies travel automatically.
 *
 * The mobile and (eventually) watch apps will instantiate their own client
 * with `getAuthToken: () => ...` for bearer auth.
 */
export const api = createApiClient({ baseUrl: "" });

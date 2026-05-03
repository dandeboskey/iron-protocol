/**
 * @iron-protocol/api-client
 *
 * Typed HTTP client driven by `@iron-protocol/api-contract`. One factory,
 * pluggable transport. Web passes cookie-aware fetch; mobile/watch supply
 * `getAuthToken` for bearer auth. Errors are typed `ApiError`.
 */
export { createApiClient, type ApiClient } from "./client";
export { ApiError, getApiErrorMessage } from "./error";
export type { TransportOptions, FetchLike } from "./transport";

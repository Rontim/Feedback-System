/** Single boundary between the browser and the Django API (same-origin via the Next rewrite). */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const hit = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : null;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    const data: unknown = await response.json();
    return data;
  } catch {
    return null;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  signal?: AbortSignal;
}

/** Django sets the CSRF cookie on GET /api/auth/csrf; unsafe requests echo it as a header. */
async function csrfToken(): Promise<string | null> {
  const existing = readCookie("csrftoken");
  if (existing) return existing;
  await fetch("/api/auth/csrf", { credentials: "same-origin" });
  return readCookie("csrftoken");
}

/**
 * The one place the JSON body is trusted: callers name the response type `T`, which mirrors
 * the Django serializers in features/*\/types.ts.
 */
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!SAFE_METHODS.has(method)) {
    const token = await csrfToken();
    if (token) headers["X-CSRFToken"] = token;
  }
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    signal,
  });
  const data = await parseBody(response);
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export function errorDetail(error: unknown, fallback: string): string {
  if (error instanceof ApiError && typeof error.body === "object" && error.body !== null) {
    const detail = (error.body as Record<string, unknown>).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

/** First validation message from a DRF 400 body such as `{ "phones": ["Not valid: 12"] }`. */
export function firstFieldError(error: unknown): string | null {
  if (!(error instanceof ApiError) || typeof error.body !== "object" || error.body === null) {
    return null;
  }
  for (const value of Object.values(error.body as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return null;
}

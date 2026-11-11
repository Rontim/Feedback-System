// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, errorDetail, http } from "./http";

function fakeResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function clearCookies(): void {
  for (const part of document.cookie.split("; ")) {
    document.cookie = `${part.split("=")[0]}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

beforeEach(clearCookies);
afterEach(() => vi.unstubAllGlobals());

describe("http", () => {
  it("returns parsed JSON and sends no CSRF header on GET", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(fakeResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await http<{ ok: boolean }>("/api/x")).toEqual({ ok: true });
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers["X-CSRFToken"]).toBeUndefined();
  });

  it("echoes the csrftoken cookie as X-CSRFToken on unsafe methods", async () => {
    document.cookie = "csrftoken=abc123; path=/";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(fakeResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await http("/api/alerts/1", { method: "PATCH", body: { handled: true } });

    const init = fetchMock.mock.calls[0][1];
    expect((init?.headers as Record<string, string>)["X-CSRFToken"]).toBe("abc123");
    expect(init?.body).toBe(JSON.stringify({ handled: true }));
  });

  it("fetches the CSRF cookie first when it is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (input === "/api/auth/csrf") document.cookie = "csrftoken=fresh; path=/";
      return fakeResponse(200, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    await http("/api/auth/login", { method: "POST", body: {} });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf");
    const headers = fetchMock.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers["X-CSRFToken"]).toBe("fresh");
  });

  it("throws ApiError carrying status and body, and returns null for 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(403, { detail: "Nope." })));
    const error = await http("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
    expect(errorDetail(error, "fallback")).toBe("Nope.");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(204, null)));
    expect(await http("/api/x")).toBeNull();
  });

  it("errorDetail falls back for unknown errors", () => {
    expect(errorDetail(new Error("boom"), "fallback")).toBe("fallback");
  });
});

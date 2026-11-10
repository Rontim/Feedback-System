import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFieldErrors, submitFeedback, toPayload } from "./api";
import type { FeedbackFormValues } from "./types";

const VALUES: FeedbackFormValues = {
  q_product: 2,
  q_care: 3,
  q_happy: 2,
  name: "  Amina Otieno ",
  email: " amina@example.com ",
  phone: " +254700111222 ",
  customer_type: "painter",
};

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("toPayload", () => {
  it("trims text fields and defaults the comment to an empty string", () => {
    expect(toPayload(VALUES)).toMatchObject({
      name: "Amina Otieno",
      email: "amina@example.com",
      phone: "+254700111222",
      customer_type: "painter",
      comment: "",
    });
  });
});

describe("parseFieldErrors", () => {
  it("keeps the first message of each known field and ignores the rest", () => {
    expect(parseFieldErrors({ phone: ["Bad phone.", "Other"], unknown: ["x"], email: [] })).toEqual({
      phone: "Bad phone.",
    });
  });
  it("returns nothing for non-object bodies", () => {
    expect(parseFieldErrors(null)).toEqual({});
    expect(parseFieldErrors(["phone"])).toEqual({});
  });
});

describe("submitFeedback", () => {
  it("posts JSON to /api/feedback and returns the receipt", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(fakeResponse(201, { id: 7, mean: "2.33", category: "detractor" }));
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await submitFeedback(VALUES);

    expect(outcome).toEqual({ ok: true, receipt: { id: 7, mean: "2.33", category: "detractor" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/feedback");
    expect(init?.method).toBe("POST");
  });

  it("maps a 400 to field errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(400, { phone: ["Invalid."] })));
    expect(await submitFeedback(VALUES)).toEqual({
      ok: false,
      kind: "validation",
      fieldErrors: { phone: "Invalid." },
    });
  });

  it("maps 429, 500, unparseable success bodies and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(429, {})));
    expect(await submitFeedback(VALUES)).toEqual({ ok: false, kind: "throttled" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(500, {})));
    expect(await submitFeedback(VALUES)).toEqual({ ok: false, kind: "server" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse(201, { id: "x" })));
    expect(await submitFeedback(VALUES)).toEqual({ ok: false, kind: "server" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await submitFeedback(VALUES)).toEqual({ ok: false, kind: "network" });
  });
});

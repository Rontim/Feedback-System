import { describe, expect, it } from "vitest";
import { formatShortDate, timeAgo } from "./format";

describe("timeAgo", () => {
  const now = new Date("2026-11-11T12:00:00Z").getTime();
  it.each([
    ["2026-11-11T11:59:40Z", "just now"],
    ["2026-11-11T11:45:00Z", "15 min ago"],
    ["2026-11-11T09:00:00Z", "3 h ago"],
    ["2026-11-08T12:00:00Z", "3 d ago"],
  ])("%s -> %s", (iso, expected) => expect(timeAgo(iso, now)).toBe(expected));
});

describe("formatShortDate", () => {
  it("does not shift the day across time zones", () => {
    expect(formatShortDate("2026-11-01")).toBe("1 Nov");
    expect(formatShortDate("2026-12-31")).toBe("31 Dec");
  });
});

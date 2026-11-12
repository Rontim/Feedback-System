import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESPONSES_PARAMS,
  buildAlertsQuery,
  buildResponsesQuery,
} from "./queryParams";

describe("buildResponsesQuery", () => {
  it("sends only paging and ordering by default", () => {
    expect(buildResponsesQuery(DEFAULT_RESPONSES_PARAMS)).toBe(
      "page=1&page_size=20&ordering=-created_at",
    );
  });

  it("encodes every filter the API understands", () => {
    const query = new URLSearchParams(
      buildResponsesQuery({
        ...DEFAULT_RESPONSES_PARAMS,
        page: 3,
        categories: ["detractor", "passive"],
        channels: ["sms"],
        sentiments: ["negative"],
        topics: ["delivery", "price"],
        search: "  amina o ",
        from: "2026-11-01",
        to: "2026-11-10",
        ordering: "mean",
      }),
    );
    expect(Object.fromEntries(query)).toEqual({
      page: "3",
      page_size: "20",
      ordering: "mean",
      category: "detractor,passive",
      channel: "sms",
      sentiment: "negative",
      topic: "delivery,price",
      q: "amina o",
      from: "2026-11-01",
      to: "2026-11-10",
    });
  });

  it("omits blank search", () => {
    expect(buildResponsesQuery({ ...DEFAULT_RESPONSES_PARAMS, search: "   " })).not.toContain("q=");
  });
});

describe("buildAlertsQuery", () => {
  it.each([
    ["all", ""],
    ["unread", "&unread=1"],
    ["open", "&handled=0"],
    ["handled", "&handled=1"],
  ] as const)("%s filter", (filter, extra) => {
    expect(buildAlertsQuery(filter, 2, 10)).toBe(`page=2&page_size=10${extra}`);
  });
});

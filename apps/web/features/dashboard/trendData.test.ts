import { describe, expect, it } from "vitest";
import { buildTrendChartData } from "./trendData";
import type { TrendDto } from "./types";

const SERIES = [
  { date: "2026-11-01", count: 4, mean: 3.0 },
  { date: "2026-11-02", count: 0, mean: null },
  { date: "2026-11-03", count: 5, mean: 3.4 },
];

describe("buildTrendChartData", () => {
  it("keeps gaps as null actuals when there is no projection", () => {
    const trend: TrendDto = {
      days: 7,
      series: SERIES,
      projection: { status: "insufficient_data", min_days: 5, days_with_data: 2 },
    };
    const rows = buildTrendChartData(trend);
    expect(rows.map((r) => r.actual)).toEqual([3.0, null, 3.4]);
    expect(rows.every((r) => r.fit === null && r.forecast === null)).toBe(true);
  });

  it("adds forecast rows after the series and bridges the line from the last observed day", () => {
    const trend: TrendDto = {
      days: 7,
      series: SERIES,
      projection: {
        status: "ok",
        method: "weighted_linear_regression",
        slope_per_day: 0.2,
        horizon_days: 2,
        line: [
          { date: "2026-11-01", mean: 3.0, forecast: false },
          { date: "2026-11-02", mean: 3.2, forecast: false },
          { date: "2026-11-03", mean: 3.4, forecast: false },
          { date: "2026-11-04", mean: 3.6, forecast: true },
          { date: "2026-11-05", mean: 3.8, forecast: true },
        ],
      },
    };
    const rows = buildTrendChartData(trend);
    expect(rows.map((r) => r.date)).toEqual([
      "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05",
    ]); // prettier-ignore
    expect(rows[2]).toMatchObject({ actual: 3.4, fit: 3.4, forecast: 3.4 }); // bridge point
    expect(rows[3]).toMatchObject({ actual: null, fit: null, forecast: 3.6, count: 0 });
    expect(rows[1].fit).toBe(3.2); // fit also drawn across the empty day
    expect(rows[0].forecast).toBeNull();
  });
});

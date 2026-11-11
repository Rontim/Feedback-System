import type { TrendDto } from "./types";

export interface TrendChartRow {
  date: string;
  count: number;
  actual: number | null;
  fit: number | null;
  forecast: number | null;
}

/**
 * Merge the daily series and the projection line into one row per date for the chart.
 * The last observed row also carries the first forecast value so the dashed line connects.
 */
export function buildTrendChartData(trend: TrendDto): TrendChartRow[] {
  const rows = new Map<string, TrendChartRow>(
    trend.series.map((day) => [
      day.date,
      { date: day.date, count: day.count, actual: day.mean, fit: null, forecast: null },
    ]),
  );
  if (trend.projection.status !== "ok") return [...rows.values()];

  let lastObserved: TrendChartRow | undefined;
  for (const point of trend.projection.line) {
    if (!point.forecast) {
      const row = rows.get(point.date);
      if (row) {
        row.fit = point.mean;
        lastObserved = row;
      }
    } else {
      rows.set(point.date, {
        date: point.date,
        count: 0,
        actual: null,
        fit: null,
        forecast: point.mean,
      });
    }
  }
  if (lastObserved) lastObserved.forecast = lastObserved.fit;
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

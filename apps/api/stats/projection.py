"""Trend fitting and projection. Pure Python, no Django, so it is easy to test.

Method: weighted least squares of the daily mean score against day number, weighted by
that day's response count (a day with 40 responses counts for more than a day with 1).
Days without responses are left out of the fit, not treated as zeros. The projection extends
the fitted line a few days past `end` and is clamped to the 1-5 rating scale.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta

MIN_DATA_DAYS = 5
HORIZON_DAYS = 7
MIN_SCORE, MAX_SCORE = 1.0, 5.0


@dataclass(frozen=True)
class DailyPoint:
    day: date
    mean: float
    count: int


@dataclass(frozen=True)
class LinearFit:
    origin: date  # day 0 of the x axis
    slope_per_day: float
    intercept: float  # fitted value at `origin`

    def value_on(self, day: date) -> float:
        raw = self.intercept + self.slope_per_day * (day - self.origin).days
        return min(MAX_SCORE, max(MIN_SCORE, raw))


def fit_trend(points: Sequence[DailyPoint]) -> LinearFit | None:
    """Weighted least squares. Returns None when no slope can be determined."""
    usable = [p for p in points if p.count > 0]
    if len({p.day for p in usable}) < 2:
        return None
    origin = min(p.day for p in usable)
    xs = [(p.day - origin).days for p in usable]
    ys = [p.mean for p in usable]
    ws = [float(p.count) for p in usable]

    total_w = sum(ws)
    mean_x = sum(w * x for w, x in zip(ws, xs, strict=True)) / total_w
    mean_y = sum(w * y for w, y in zip(ws, ys, strict=True)) / total_w
    sxx = sum(w * (x - mean_x) ** 2 for w, x in zip(ws, xs, strict=True))
    if sxx == 0:
        return None
    sxy = sum(w * (x - mean_x) * (y - mean_y) for w, x, y in zip(ws, xs, ys, strict=True))
    slope = sxy / sxx
    return LinearFit(origin=origin, slope_per_day=slope, intercept=mean_y - slope * mean_x)


def build_projection(points: Sequence[DailyPoint], end: date, horizon: int = HORIZON_DAYS) -> dict:
    """JSON-ready projection. Honest about thin data instead of drawing a fake line."""
    days_with_data = len([p for p in points if p.count > 0])
    fit = fit_trend(points) if days_with_data >= MIN_DATA_DAYS else None
    if fit is None:
        return {
            "status": "insufficient_data",
            "min_days": MIN_DATA_DAYS,
            "days_with_data": days_with_data,
        }
    first = min(p.day for p in points if p.count > 0)
    line = []
    day = first
    while day <= end + timedelta(days=horizon):
        line.append(
            {"date": day.isoformat(), "mean": round(fit.value_on(day), 2), "forecast": day > end}
        )
        day += timedelta(days=1)
    return {
        "status": "ok",
        "method": "weighted_linear_regression",
        "slope_per_day": round(fit.slope_per_day, 4),
        "horizon_days": horizon,
        "line": line,
    }

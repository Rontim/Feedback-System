from datetime import date, timedelta

import pytest

from stats.projection import HORIZON_DAYS, DailyPoint, build_projection, fit_trend

D0 = date(2026, 11, 1)


def pts(values, counts=None, start=D0):
    counts = counts or [1] * len(values)
    return [
        DailyPoint(day=start + timedelta(days=i), mean=v, count=c)
        for i, (v, c) in enumerate(zip(values, counts, strict=True))
    ]


def test_exact_line_is_recovered():
    fit = fit_trend(pts([3.0, 3.1, 3.2, 3.3, 3.4, 3.5]))
    assert fit.slope_per_day == pytest.approx(0.1)
    assert fit.value_on(D0 + timedelta(days=8)) == pytest.approx(3.8)


def test_flat_data_has_zero_slope():
    assert fit_trend(pts([3.5] * 6)).slope_per_day == pytest.approx(0)


def test_known_least_squares_answer():
    # y = [1, 2, 2, 4] at x = 0..3 -> slope 0.9, intercept 0.9 (worked out by hand)
    fit = fit_trend(pts([1, 2, 2, 4]))
    assert fit.slope_per_day == pytest.approx(0.9)
    assert fit.intercept == pytest.approx(0.9)


def test_busy_days_outweigh_quiet_days():
    quiet_outlier = pts([3.0, 3.0, 3.0, 3.0, 5.0], counts=[20, 20, 20, 20, 1])
    unweighted = pts([3.0, 3.0, 3.0, 3.0, 5.0])
    assert fit_trend(quiet_outlier).slope_per_day < fit_trend(unweighted).slope_per_day


def test_gaps_use_real_day_distance_not_index():
    # Same values, but day 2 and 3 missing: x positions are 0, 1, 4, 5.
    gappy = [
        DailyPoint(D0 + timedelta(days=d), m, 1)
        for d, m in [(0, 3.0), (1, 3.1), (4, 3.4), (5, 3.5)]
    ]
    assert fit_trend(gappy).slope_per_day == pytest.approx(0.1)


def test_days_without_responses_are_ignored():
    with_empty = pts([3.0, 3.1, 0.0, 3.3], counts=[1, 1, 0, 1])
    assert fit_trend(with_empty).slope_per_day == pytest.approx(0.1, abs=0.01)


def test_cannot_fit_a_single_day():
    assert fit_trend(pts([3.0])) is None


def test_thin_data_is_reported_not_faked():
    result = build_projection(pts([3.0, 3.2, 3.4, 3.6]), end=D0 + timedelta(days=3))
    assert result == {"status": "insufficient_data", "min_days": 5, "days_with_data": 4}


def test_projection_extends_horizon_and_flags_forecast_days():
    values = [3.0, 3.1, 3.2, 3.3, 3.4, 3.5]
    end = D0 + timedelta(days=5)
    result = build_projection(pts(values), end=end)
    assert result["status"] == "ok"
    line = result["line"]
    assert line[0]["date"] == D0.isoformat() and not line[0]["forecast"]
    assert line[-1]["date"] == (end + timedelta(days=HORIZON_DAYS)).isoformat()
    assert [p["forecast"] for p in line].count(True) == HORIZON_DAYS
    assert line[-1]["mean"] == pytest.approx(4.2)


def test_projection_is_clamped_to_the_rating_scale():
    rising = pts([3.0, 3.5, 4.0, 4.5, 5.0])
    top = build_projection(rising, end=D0 + timedelta(days=4))["line"][-1]["mean"]
    assert top == 5.0
    falling = pts([3.0, 2.5, 2.0, 1.5, 1.0])
    assert build_projection(falling, end=D0 + timedelta(days=4))["line"][-1]["mean"] == 1.0

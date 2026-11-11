from datetime import timedelta

import pytest
from django.utils import timezone

from alerts.models import Alert

from .factories import make_response

pytestmark = pytest.mark.django_db


def test_stats_require_a_care_rep(client):
    assert client.get("/api/stats/summary").status_code == 403
    assert client.get("/api/stats/trend").status_code == 403


def test_summary_counts_categories_and_alerts(rep_client):
    make_response((1, 2, 2))  # detractor
    detractor = make_response((2, 2, 2))
    make_response((3, 3, 3))  # passive
    make_response((5, 5, 4))  # promoter
    make_response((4, 4, 4))  # promoter
    Alert.objects.create(response=detractor)

    body = rep_client.get("/api/stats/summary").json()
    assert body["total"] == 5
    assert body["categories"] == {"detractor": 2, "passive": 1, "promoter": 2}
    assert body["mean"] == pytest.approx((1.67 + 2 + 3 + 4.67 + 4) / 5, abs=0.01)
    assert body["alerts"] == {"open": 1, "unread": 1}


def test_summary_on_empty_database(rep_client):
    body = rep_client.get("/api/stats/summary").json()
    assert body["total"] == 0 and body["mean"] is None


def test_trend_fills_gaps_and_averages_per_day(rep_client):
    today = timezone.localdate()
    make_response((4, 4, 4), day=today)
    make_response((2, 2, 2), day=today)  # same day: mean of 4.00 and 2.00 = 3.00
    make_response((5, 5, 5), day=today - timedelta(days=2))

    body = rep_client.get("/api/stats/trend?days=7").json()
    series = body["series"]
    assert len(series) == 7
    assert series[-1] == {"date": today.isoformat(), "count": 2, "mean": 3.0}
    assert series[-2] == {"date": (today - timedelta(days=1)).isoformat(), "count": 0, "mean": None}
    assert series[-3]["count"] == 1 and series[-3]["mean"] == 5.0
    assert body["projection"]["status"] == "insufficient_data"


def test_trend_buckets_by_local_day_not_utc(rep_client):
    """23:30 Nairobi on day D is 20:30 UTC on D; 01:00 Nairobi on D is 22:00 UTC on D-1."""
    today = timezone.localdate()
    make_response((4, 4, 4), day=today, hour=1)
    make_response((4, 4, 4), day=today, hour=23)
    series = rep_client.get("/api/stats/trend?days=7").json()["series"]
    assert series[-1]["count"] == 2
    assert series[-2]["count"] == 0


def test_trend_projection_with_enough_days(rep_client):
    today = timezone.localdate()
    for i, rating in enumerate([2, 3, 3, 4, 4, 5]):
        make_response((rating, rating, rating), day=today - timedelta(days=5 - i))
    projection = rep_client.get("/api/stats/trend?days=14").json()["projection"]
    assert projection["status"] == "ok"
    assert projection["slope_per_day"] > 0
    assert projection["line"][-1]["forecast"] is True


@pytest.mark.parametrize("days", ["3", "181", "abc", "-1"])
def test_trend_rejects_bad_days(rep_client, days):
    assert rep_client.get(f"/api/stats/trend?days={days}").status_code == 400

from datetime import timedelta

import pytest
from django.utils import timezone

from .factories import make_analysis, make_response

pytestmark = pytest.mark.django_db


def test_topics_are_counted_by_mood_and_sorted_by_volume(rep_client, settings):
    settings.AI_API_KEY = "k"
    today = timezone.localdate()
    for sentiment, topic in [("negative", "delivery")] * 3 + [
        ("positive", "delivery"),
        ("positive", "colour"),
    ]:
        make_analysis(make_response(comment="x", day=today), sentiment, topic)

    body = rep_client.get("/api/stats/topics?days=7").json()
    assert body["enabled"] is True and body["tagged"] == 5 and body["awaiting"] == 0
    assert body["topics"][0] == {
        "topic": "delivery",
        "positive": 1,
        "neutral": 0,
        "negative": 3,
        "total": 4,
    }
    assert body["topics"][1]["topic"] == "colour" and body["topics"][1]["total"] == 1


def test_only_the_requested_window_is_counted(rep_client):
    today = timezone.localdate()
    make_analysis(make_response(comment="new", day=today), "positive", "price")
    make_analysis(make_response(comment="old", day=today - timedelta(days=20)), "positive", "price")
    assert rep_client.get("/api/stats/topics?days=7").json()["tagged"] == 1
    assert rep_client.get("/api/stats/topics?days=30").json()["tagged"] == 2


def test_awaiting_counts_comments_without_tags_but_not_empty_ones(rep_client):
    today = timezone.localdate()
    make_response(comment="untagged", day=today)
    make_response(comment="", day=today)
    make_analysis(make_response(comment="tagged", day=today))
    body = rep_client.get("/api/stats/topics").json()
    assert body["awaiting"] == 1 and body["tagged"] == 1


def test_reports_ai_as_disabled_without_a_key(rep_client):
    assert rep_client.get("/api/stats/topics").json()["enabled"] is False


def test_empty_database(rep_client):
    body = rep_client.get("/api/stats/topics").json()
    assert body["topics"] == [] and body["tagged"] == 0 and body["awaiting"] == 0


@pytest.mark.parametrize("days", ["0", "500", "x"])
def test_days_validated(rep_client, days):
    assert rep_client.get(f"/api/stats/topics?days={days}").status_code == 400

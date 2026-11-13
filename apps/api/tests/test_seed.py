from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.utils import timezone

from alerts.models import Alert, Notification
from feedback import scoring
from feedback.models import Customer, Response
from insights.models import CommentAnalysis

pytestmark = pytest.mark.django_db


def seed(**kwargs):
    days = kwargs.pop("days", 21)
    call_command("seed_demo", days=days, per_day=6, stdout=StringIO(), **kwargs)


def test_seed_creates_consistent_data_and_a_demo_rep():
    seed()
    assert Response.objects.count() > 30
    assert get_user_model().objects.filter(username="demo").exists()
    for r in Response.objects.all():
        expected = scoring.score(r.q_product, r.q_care, r.q_happy)
        assert (r.score_sum, r.mean, r.category) == (
            expected.total,
            expected.mean,
            expected.category,
        )
    detractors = Response.objects.filter(category=scoring.DETRACTOR).count()
    assert detractors > 0
    assert Alert.objects.count() == detractors  # one alert per detractor, none for others


def test_seed_spreads_responses_across_days():
    seed()
    response_days = {timezone.localtime(r.created_at).date() for r in Response.objects.all()}
    alert_days = {timezone.localtime(a.created_at).date() for a in Alert.objects.all()}
    assert len(response_days) == 21
    assert alert_days == response_days


def test_seed_is_repeatable_with_the_same_seed():
    seed()
    first = list(Response.objects.order_by("id").values_list("q_product", "q_care", "q_happy"))
    seed(reset=True)
    second = list(Response.objects.order_by("id").values_list("q_product", "q_care", "q_happy"))
    assert first == second


def test_seed_refuses_to_duplicate_without_reset():
    seed()
    with pytest.raises(CommandError):
        seed()


def test_seed_rejects_more_than_21_days():
    with pytest.raises(CommandError, match="between 1 and 21"):
        seed(days=22)


def test_reset_only_removes_seeded_data():
    real = Customer.objects.create(name="Real", email="real@example.com", phone="+254700999999")
    seed()
    seed(reset=True)
    assert Customer.objects.filter(pk=real.pk).exists()


def test_open_alerts_get_demo_rep_notifications():
    seed()
    open_alerts = Alert.objects.filter(handled_at__isnull=True).count()
    assert Notification.objects.count() == open_alerts


def test_seed_never_creates_responses_in_the_future():
    seed()
    now = timezone.now()
    assert not Response.objects.filter(created_at__gt=now).exists()
    assert not Alert.objects.filter(created_at__gt=now).exists()
    assert not Alert.objects.filter(read_at__gt=now).exists()
    assert not Alert.objects.filter(handled_at__gt=now).exists()


def test_seed_can_tag_all_seeded_comments(fake_tagger):
    seed(tag_comments=True, ai_sleep=0)

    comment_count = Response.objects.exclude(comment="").count()
    assert comment_count >= 21
    assert CommentAnalysis.objects.count() == comment_count
    assert len(fake_tagger.seen) == comment_count


def test_seed_requires_ai_key_before_creating_data():
    with pytest.raises(CommandError, match="AI_API_KEY"):
        seed(tag_comments=True)

    assert Customer.objects.count() == 0


def test_seed_delivers_alerts_only_when_requested(monkeypatch):
    delivered = []
    monkeypatch.setattr("alerts.services.deliver_alert", delivered.append)

    seed()
    assert delivered == []

    seed(reset=True, send_alerts=True)

    assert len(delivered) == Alert.objects.count()
    assert set(delivered) == set(Alert.objects.values_list("pk", flat=True))

import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command

from alerts.models import Alert, Notification
from feedback import scoring
from feedback.models import Customer, Response

pytestmark = pytest.mark.django_db


def seed(**kwargs):
    call_command("seed_demo", "--days=14", "--per-day=6", stdout=open("/dev/null", "w"), **kwargs)


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
    days = {r.created_at.date() for r in Response.objects.all()}
    assert len(days) >= 12


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
    from django.utils import timezone

    seed()
    assert not Response.objects.filter(created_at__gt=timezone.now()).exists()
    assert not Alert.objects.filter(created_at__gt=timezone.now()).exists()

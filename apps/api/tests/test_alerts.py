import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.mail.message import EmailMessage
from django.core.management import call_command

from alerts.models import Alert, DeliveryStatus, Notification
from feedback.models import Response

pytestmark = pytest.mark.django_db


def test_detractor_creates_alert_and_notification(care_rep, post_feedback):
    res = post_feedback()
    assert res.status_code == 201
    alert = Alert.objects.get()
    assert alert.response_id == res.json()["id"]
    assert Notification.objects.get().rep == care_rep


@pytest.mark.parametrize("scores", [(3, 3, 3), (4, 4, 4), (5, 5, 5)])
def test_passive_and_promoter_do_not_alert(care_rep, post_feedback, scores):
    q_product, q_care, q_happy = scores
    post_feedback(q_product=q_product, q_care=q_care, q_happy=q_happy)
    assert Alert.objects.count() == 0
    assert Notification.objects.count() == 0
    assert mail.outbox == []


def test_email_goes_to_care_team_with_customer_details(care_rep, post_feedback):
    post_feedback()
    assert len(mail.outbox) == 1
    msg = mail.outbox[0]
    assert msg.to == ["grace@companyx.test"]
    assert msg.reply_to == ["amina@example.com"]
    assert msg.subject == "[Detractor alert] Amina Otieno scored 2.33/5"
    for expected in (
        "amina@example.com",
        "+254700111222",
        "Painter",
        "Product experience: 2",
        "Delivery was late",
        "https://dash.test/dashboard?alert=",
    ):
        assert expected in msg.body
    assert Alert.objects.get().email_status == DeliveryStatus.SENT


def test_newlines_in_name_cannot_break_the_subject(care_rep, post_feedback):
    post_feedback(name="Evil\r\nBcc: x@y.z")
    assert Alert.objects.get().email_status == DeliveryStatus.SENT
    assert "\n" not in mail.outbox[0].subject


def test_fallback_address_used_when_no_rep_has_email(db, settings, post_feedback):
    get_user_model().objects.create_user("noemail", password="pw-12345")
    settings.CARE_ALERT_FALLBACK_EMAIL = "care@companyx.test"
    post_feedback()
    assert mail.outbox[0].to == ["care@companyx.test"]


def test_no_recipients_is_recorded_as_failed_not_lost(db, post_feedback):
    res = post_feedback()
    assert res.status_code == 201
    alert = Alert.objects.get()
    assert alert.email_status == DeliveryStatus.FAILED
    assert "No care rep email" in alert.email_error


def test_email_failure_never_loses_feedback_and_can_be_retried(
    care_rep, post_feedback, monkeypatch
):
    def boom(self, fail_silently=False):
        raise ConnectionRefusedError("smtp down")

    with monkeypatch.context() as patch:
        patch.setattr(EmailMessage, "send", boom)
        res = post_feedback()

    assert res.status_code == 201
    assert Response.objects.count() == 1
    alert = Alert.objects.get()
    assert alert.email_status == DeliveryStatus.FAILED
    assert alert.email_attempts == 1
    assert "smtp down" in alert.email_error

    call_command("retry_failed_alerts")  # SMTP is back
    alert.refresh_from_db()
    assert alert.email_status == DeliveryStatus.SENT
    assert alert.email_attempts == 2
    assert len(mail.outbox) == 1


def test_retry_respects_max_attempts(care_rep, post_feedback, monkeypatch):
    monkeypatch.setattr(EmailMessage, "send", lambda self, fail_silently=False: 1 / 0)
    post_feedback()
    call_command("retry_failed_alerts", "--max-attempts=1")
    assert Alert.objects.get().email_attempts == 1


def test_alert_creation_failure_never_loses_feedback(care_rep, post_feedback, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("db hiccup")

    monkeypatch.setattr(Notification.objects, "bulk_create", boom)
    res = post_feedback()
    assert res.status_code == 201
    assert Response.objects.count() == 1
    assert Alert.objects.count() == 0  # savepoint rolled back, response kept


def test_alert_is_not_duplicated_per_response(care_rep, post_feedback):
    post_feedback()
    post_feedback()  # a second, separate submission: second response, second alert
    assert Response.objects.count() == 2
    assert Alert.objects.count() == 2

import pytest
from django.core import mail
from django.core.mail.message import EmailMessage
from django.core.management import call_command

from alerts.models import Alert, DeliveryStatus
from alerts.sms import build_alert_sms
from sms.client import SmsGatewayError
from sms.models import SmsLog

pytestmark = pytest.mark.django_db


@pytest.fixture
def rep_with_phone(care_rep):
    care_rep.phone = "0722 333 444"
    care_rep.save()
    return care_rep


def test_detractor_texts_the_care_rep_with_who_to_call(rep_with_phone, fake_sms, post_feedback):
    post_feedback()
    alert = Alert.objects.get()
    assert alert.sms_status == DeliveryStatus.SENT
    recipients, message = fake_sms.sent[0]
    assert recipients == ["+254722333444"]
    assert "2.33/5" in message and "Amina Otieno" in message and "+254700111222" in message
    log = SmsLog.objects.get(kind="alert")
    assert log.status == "sent" and log.response == alert.response and log.provider_message_id


def test_sms_text_fits_one_segment_even_with_a_huge_name(rep_with_phone, fake_sms, post_feedback):
    post_feedback(name="N" * 120, email="x" * 90 + "@example.com")
    assert all(len(m) <= 160 for m in fake_sms.messages)
    alert = Alert.objects.get()
    assert len(build_alert_sms(alert)) <= 160
    assert "+254700111222" in build_alert_sms(alert)  # phone survives truncation


def test_non_detractors_send_no_sms(rep_with_phone, fake_sms, post_feedback):
    post_feedback(q_product=5, q_care=5, q_happy=5)
    assert fake_sms.sent == []


def test_gateway_not_configured_is_skipped_and_email_still_goes(rep_with_phone, post_feedback):
    post_feedback()
    alert = Alert.objects.get()
    assert alert.sms_status == DeliveryStatus.SKIPPED
    assert "not configured" in alert.sms_error
    assert alert.email_status == DeliveryStatus.SENT


def test_no_rep_phone_numbers_is_skipped_with_a_reason(care_rep, fake_sms, post_feedback):
    post_feedback()
    alert = Alert.objects.get()
    assert alert.sms_status == DeliveryStatus.SKIPPED
    assert "No care rep phone" in alert.sms_error
    assert fake_sms.sent == []


def test_sms_failure_is_recorded_and_does_not_block_email(rep_with_phone, fake_sms, post_feedback):
    fake_sms.fail_with = SmsGatewayError("HTTP 503")
    res = post_feedback()
    assert res.status_code == 201
    alert = Alert.objects.get()
    assert alert.sms_status == DeliveryStatus.FAILED and "503" in alert.sms_error
    assert alert.sms_attempts == 1
    assert alert.email_status == DeliveryStatus.SENT and len(mail.outbox) == 1


def test_email_failure_does_not_block_sms(rep_with_phone, fake_sms, post_feedback, monkeypatch):
    def boom(self, fail_silently=False):
        raise ConnectionRefusedError("smtp down")

    monkeypatch.setattr(EmailMessage, "send", boom)
    post_feedback()
    alert = Alert.objects.get()
    assert alert.email_status == DeliveryStatus.FAILED
    assert alert.sms_status == DeliveryStatus.SENT


def test_retry_command_recovers_a_failed_sms(rep_with_phone, fake_sms, post_feedback, capsys):
    fake_sms.fail_with = SmsGatewayError("HTTP 503")
    post_feedback()
    fake_sms.fail_with = None  # gateway is back

    call_command("retry_failed_alerts")
    alert = Alert.objects.get()
    assert alert.sms_status == DeliveryStatus.SENT and alert.sms_attempts == 2
    assert alert.email_attempts == 1  # the healthy email channel was not retried
    assert "sms: retried 1, 1 sent" in capsys.readouterr().out


def test_partial_failure_still_counts_as_sent_and_is_not_retried(
    rep_with_phone, fake_sms, post_feedback, django_user_model
):
    django_user_model.objects.create_user(
        "second", password="pw-12345", phone="+254733555666", is_care_rep=True
    )
    fake_sms.reject = {"+254733555666"}
    post_feedback()
    alert = Alert.objects.get()
    assert alert.sms_status == DeliveryStatus.SENT  # one rep was reached
    assert "+254733555666" in alert.sms_error
    statuses = dict(SmsLog.objects.filter(kind="alert").values_list("phone", "status"))
    assert statuses == {"+254722333444": "sent", "+254733555666": "failed"}

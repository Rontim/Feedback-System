from urllib.parse import urlencode

import pytest
from django.core import mail
from rest_framework.test import APIClient

from alerts.models import Alert
from feedback.models import Customer, Response
from sms.models import SmsLog

pytestmark = pytest.mark.django_db

URL = "/api/sms/inbound?token=s3cret"
FORM = "application/x-www-form-urlencoded"


@pytest.fixture
def inbound(django_capture_on_commit_callbacks):
    """Post an Africa's Talking style callback (form-encoded) and run after-commit work."""

    def _post(text, sender="+254711000111", message_id="ATPid_in_1", url=URL):
        fields = {
            "from": sender, "to": "20880", "text": text, "id": message_id,
            "date": "2026-11-11 10:00:00", "linkId": "x", "networkCode": "63902",
        }  # fmt: skip
        body = urlencode(fields)
        with django_capture_on_commit_callbacks(execute=True):
            return APIClient().post(url, body, content_type=FORM)

    return _post


def test_rejects_missing_or_wrong_token(inbound):
    assert inbound("4 5 4", url="/api/sms/inbound").status_code == 403
    assert inbound("4 5 4", url="/api/sms/inbound?token=wrong").status_code == 403
    assert Response.objects.count() == 0


def test_webhook_fails_closed_when_no_token_is_configured(inbound, settings):
    settings.AT_WEBHOOK_TOKEN = ""
    assert inbound("4 5 4", url="/api/sms/inbound?token=").status_code == 403


def test_valid_reply_becomes_an_sms_response_and_gets_a_thank_you(inbound, fake_sms):
    res = inbound("4 5 4")
    assert res.status_code == 200 and res.json() == {"status": "recorded"}

    response = Response.objects.get()
    assert (response.q_product, response.q_care, response.q_happy) == (4, 5, 4)
    assert response.channel == "sms" and response.category == "promoter"
    assert response.customer.phone == "+254711000111"
    assert response.customer.type == Customer.Type.PAINTER
    assert fake_sms.sent == [(["+254711000111"], fake_sms.messages[0])]
    assert "product 4, care 5, happiness 4" in fake_sms.messages[0]

    inbound_log = SmsLog.objects.get(direction="inbound")
    assert inbound_log.status == "received" and inbound_log.response == response
    assert SmsLog.objects.get(direction="outbound", kind="reply").status == "sent"


@pytest.mark.parametrize("text", ["454", "4,5,4", "4-5-4"])
def test_other_accepted_formats(inbound, fake_sms, text):
    assert inbound(text).json()["status"] == "recorded"


@pytest.mark.parametrize("text", ["great", "4 5", "0 5 4", "4 5 6", "4 5 4 3"])
def test_unreadable_reply_gets_help_and_creates_nothing(inbound, fake_sms, text):
    assert inbound(text).json() == {"status": "invalid"}
    assert Response.objects.count() == 0
    assert "Example: 4 5 4" in fake_sms.messages[0]
    assert SmsLog.objects.get(direction="inbound").status == "invalid"


def test_help_keyword(inbound, fake_sms):
    assert inbound("HELP").json() == {"status": "help"}
    assert "Example: 4 5 4" in fake_sms.messages[0]
    assert "could not read" not in fake_sms.messages[0]


def test_gateway_retry_of_the_same_message_is_processed_once(inbound, fake_sms):
    assert inbound("4 5 4", message_id="ATPid_dup").json()["status"] == "recorded"
    assert inbound("4 5 4", message_id="ATPid_dup").json()["status"] == "duplicate"
    assert Response.objects.count() == 1
    assert len(fake_sms.sent) == 1  # no second thank-you either


def test_daily_cap_per_phone(inbound, fake_sms, settings):
    settings.SMS_MAX_RESPONSES_PER_DAY = 2
    results = [inbound("5 5 5", message_id=f"id{i}").json()["status"] for i in range(3)]
    assert results == ["recorded", "recorded", "limited"]
    assert Response.objects.count() == 2
    assert "already have your feedback" in fake_sms.messages[-1]


def test_same_person_by_web_and_sms_is_one_customer(inbound, fake_sms):
    web = APIClient().post(
        "/api/feedback",
        {"q_product": 5, "q_care": 5, "q_happy": 5, "name": "Amina", "email": "a@x.com",
         "phone": "0711 000 111", "customer_type": "homeowner"},
        format="json",
    )  # fmt: skip
    assert web.status_code == 201
    inbound("4 4 4")
    assert Customer.objects.count() == 1
    customer = Customer.objects.get()
    assert customer.phone == "+254711000111"
    assert customer.type == Customer.Type.HOMEOWNER  # SMS does not overwrite known details
    assert customer.name == "Amina"
    assert Response.objects.count() == 2


def test_detractor_reply_raises_an_alert_and_emails_the_care_team(inbound, fake_sms, care_rep):
    assert inbound("1 2 1").json()["status"] == "recorded"
    alert = Alert.objects.get()
    assert alert.response.channel == "sms"
    assert len(mail.outbox) == 1
    assert "+254711000111" in mail.outbox[0].body
    assert "(not provided)" in mail.outbox[0].body  # SMS customers have no email


def test_reply_failure_never_loses_the_feedback(inbound, fake_sms):
    from sms.client import SmsGatewayError

    fake_sms.fail_with = SmsGatewayError("gateway down")
    assert inbound("4 5 4").json()["status"] == "recorded"
    assert Response.objects.count() == 1
    assert SmsLog.objects.get(direction="outbound").status == "failed"


def test_works_without_a_configured_gateway(inbound):
    """No API key: feedback is still recorded; the reply is logged as skipped."""
    assert inbound("4 5 4").json()["status"] == "recorded"
    assert SmsLog.objects.get(direction="outbound").status == "skipped"


def test_garbage_sender_is_ignored(inbound, fake_sms):
    assert inbound("4 5 4", sender="abc").json() == {"status": "ignored"}
    assert Response.objects.count() == 0 and fake_sms.sent == []


def test_json_payload_also_accepted_for_manual_testing(
    fake_sms, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        res = APIClient().post(URL, {"from": "+254711000222", "text": "3 3 3"}, format="json")
    assert res.json()["status"] == "recorded"
    assert Response.objects.get().category == "passive"

import pytest
from rest_framework.test import APIClient

from sms.models import SmsLog

pytestmark = pytest.mark.django_db


def test_requires_a_care_rep():
    assert (
        APIClient().post("/api/sms/invites", {"phones": ["0700111222"]}, format="json").status_code
        == 403
    )
    assert APIClient().get("/api/sms/config").status_code == 403
    assert APIClient().get("/api/sms/log").status_code == 403


def test_sends_the_invite_text_to_normalised_unique_numbers(rep_client, fake_sms):
    res = rep_client.post(
        "/api/sms/invites",
        {"phones": ["0700 111 222", "+254700111222", "0711222333"]},
        format="json",
    )
    assert res.status_code == 200
    body = res.json()
    assert body["sent"] == 2 and body["failed"] == 0
    assert [r["phone"] for r in body["results"]] == ["+254700111222", "+254711222333"]
    recipients, message = fake_sms.sent[0]
    assert recipients == ["+254700111222", "+254711222333"]
    assert "Reply e.g. 4 5 4" in message and len(message) <= 160
    assert message.isascii()  # stays a single GSM segment
    assert SmsLog.objects.filter(kind="invite", status="sent").count() == 2


def test_reports_per_number_failures(rep_client, fake_sms):
    fake_sms.reject = {"+254711222333"}
    body = rep_client.post(
        "/api/sms/invites", {"phones": ["0700111222", "0711222333"]}, format="json"
    ).json()
    assert (body["sent"], body["failed"]) == (1, 1)
    failed = next(r for r in body["results"] if r["status"] == "failed")
    assert "InvalidPhoneNumber" in failed["error"]


def test_unconfigured_gateway_reports_skipped(rep_client):
    body = rep_client.post("/api/sms/invites", {"phones": ["0700111222"]}, format="json").json()
    assert body["skipped"] == 1 and body["sent"] == 0


@pytest.mark.parametrize(
    "phones",
    [
        [],
        ["not a number"],
        ["0700111222", "12"],
        ["0700111222"] * 0 + [f"07{i:08d}" for i in range(51)],
    ],
)
def test_validation(rep_client, fake_sms, phones):
    res = rep_client.post("/api/sms/invites", {"phones": phones}, format="json")
    assert res.status_code == 400 and fake_sms.sent == []


def test_config_endpoint(rep_client, settings):
    settings.AT_API_KEY = ""
    body = rep_client.get("/api/sms/config").json()
    assert body["enabled"] is False and body["environment"] == "sandbox"
    assert "4 5 4" in body["invite_text"]


def test_log_lists_both_directions_and_filters(rep_client, fake_sms):
    rep_client.post("/api/sms/invites", {"phones": ["0700111222"]}, format="json")
    SmsLog.objects.create(direction="inbound", kind="inbound", phone="+254700111222",
                          body="4 5 4", status="received")  # fmt: skip
    assert rep_client.get("/api/sms/log").json()["count"] == 2
    assert rep_client.get("/api/sms/log?direction=inbound").json()["count"] == 1
    assert (
        rep_client.get("/api/sms/log?direction=outbound").json()["results"][0]["kind"] == "invite"
    )

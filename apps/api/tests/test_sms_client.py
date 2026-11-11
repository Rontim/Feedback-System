import pytest
import requests

from sms.client import LIVE_URL, SANDBOX_URL, AfricasTalkingClient, SmsGatewayError


class FakeResponse:
    def __init__(self, status_code, payload=None, raises=False):
        self.status_code, self._payload, self._raises = status_code, payload, raises

    def json(self):
        if self._raises:
            raise ValueError("not json")
        return self._payload


class FakeSession:
    def __init__(self, response=None, error=None):
        self.response, self.error, self.calls = response, error, []

    def post(self, url, data, headers, timeout):
        self.calls.append({"url": url, "data": data, "headers": headers, "timeout": timeout})
        if self.error:
            raise self.error
        return self.response


def payload(*rows):
    return {"SMSMessageData": {"Message": "ok", "Recipients": list(rows)}}


ROW_OK = {"number": "+254700111222", "statusCode": 101, "status": "Success", "messageId": "ATPid_1"}
ROW_BAD = {"number": "+254700999999", "statusCode": 403, "status": "InvalidPhoneNumber"}


def client(session, **kwargs):
    return AfricasTalkingClient(username="sandbox", api_key="key", session=session, **kwargs)


def test_sandbox_request_shape_and_success():
    session = FakeSession(FakeResponse(201, payload(ROW_OK)))
    results = client(session, sender_id="CompanyX").send(["+254700111222"], "hello")

    call = session.calls[0]
    assert call["url"] == SANDBOX_URL
    assert call["headers"]["apiKey"] == "key"
    assert call["data"] == {
        "username": "sandbox", "to": "+254700111222", "message": "hello", "from": "CompanyX",
    }  # fmt: skip
    assert results[0].accepted and results[0].message_id == "ATPid_1"


def test_live_username_uses_the_live_url_and_bulk_mode():
    session = FakeSession(FakeResponse(201, payload(ROW_OK, ROW_OK)))
    AfricasTalkingClient(username="companyx", api_key="k", session=session).send(
        ["+254700111222", "+254700111223"], "hi"
    )
    assert session.calls[0]["url"] == LIVE_URL
    assert session.calls[0]["data"]["to"] == "+254700111222,+254700111223"
    assert session.calls[0]["data"]["bulkSMSMode"] == "1"


def test_per_recipient_rejection_is_reported_not_raised():
    results = client(FakeSession(FakeResponse(201, payload(ROW_OK, ROW_BAD)))).send(["a", "b"], "x")
    assert [r.accepted for r in results] == [True, False]
    assert results[1].status_code == 403


@pytest.mark.parametrize(
    "session",
    [
        FakeSession(FakeResponse(401, {})),
        FakeSession(FakeResponse(500, {})),
        FakeSession(FakeResponse(201, raises=True)),
        FakeSession(FakeResponse(201, {"unexpected": True})),
        FakeSession(error=requests.ConnectTimeout("slow")),
    ],
)
def test_whole_request_failures_raise_gateway_error(session):
    with pytest.raises(SmsGatewayError):
        client(session).send(["+254700111222"], "x")


def test_base_url_override_wins_over_the_environment_default():
    session = FakeSession(FakeResponse(201, payload(ROW_OK)))
    client(session, base_url="http://localhost:9100/version1/messaging").send(
        ["+254700111222"], "x"
    )
    assert session.calls[0]["url"] == "http://localhost:9100/version1/messaging"

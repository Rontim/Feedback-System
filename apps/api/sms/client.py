"""Minimal Africa's Talking SMS client (bulk send). No Django imports, so it is easy to test.

API: POST {base}/version1/messaging, form-encoded, `apiKey` header. The sandbox username is
literally "sandbox" and uses api.sandbox.africastalking.com. Success is HTTP 200/201 with
SMSMessageData.Recipients[]; per-recipient statusCode 100/101/102 means accepted.
"""

from dataclasses import dataclass

import requests

SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
LIVE_URL = "https://api.africastalking.com/version1/messaging"
ACCEPTED_CODES = {100, 101, 102}  # Processed, Sent, Queued


class SmsGatewayError(Exception):
    """The request as a whole failed (network, auth, malformed reply)."""


@dataclass(frozen=True)
class SendResult:
    number: str
    status_code: int
    status: str
    message_id: str

    @property
    def accepted(self) -> bool:
        return self.status_code in ACCEPTED_CODES


class AfricasTalkingClient:
    def __init__(
        self,
        *,
        username: str,
        api_key: str,
        sender_id: str = "",
        base_url: str = "",
        timeout: float = 10.0,
        session: requests.Session | None = None,
    ):
        self.username = username
        self.api_key = api_key
        self.sender_id = sender_id
        self.base_url = base_url
        self.timeout = timeout
        self.session = session or requests.Session()

    @property
    def url(self) -> str:
        if self.base_url:
            return self.base_url
        return SANDBOX_URL if self.username == "sandbox" else LIVE_URL

    def send(self, recipients: list[str], message: str) -> list[SendResult]:
        data = {"username": self.username, "to": ",".join(recipients), "message": message}
        if self.sender_id:
            data["from"] = self.sender_id
        if len(recipients) > 1:
            data["bulkSMSMode"] = "1"
        try:
            response = self.session.post(
                self.url,
                data=data,
                headers={"apiKey": self.api_key, "Accept": "application/json"},
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            raise SmsGatewayError(f"{type(exc).__name__}: {exc}") from exc

        if response.status_code not in (200, 201):
            raise SmsGatewayError(f"Gateway returned HTTP {response.status_code}")
        try:
            rows = response.json()["SMSMessageData"]["Recipients"]
            return [
                SendResult(
                    number=str(row["number"]),
                    status_code=int(row["statusCode"]),
                    status=str(row.get("status", "")),
                    message_id=str(row.get("messageId", "")),
                )
                for row in rows
            ]
        except (ValueError, KeyError, TypeError) as exc:
            raise SmsGatewayError("Unexpected response from the SMS gateway") from exc

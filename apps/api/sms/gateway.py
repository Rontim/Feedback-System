"""One place that sends SMS and records every attempt in SmsLog."""

import logging
from dataclasses import dataclass

from django.conf import settings

from feedback.phone import normalize_phone

from .client import AfricasTalkingClient, SmsGatewayError
from .models import SmsLog

logger = logging.getLogger(__name__)


def get_client() -> AfricasTalkingClient | None:
    """None when no API key is configured, so SMS degrades to 'skipped' instead of crashing."""
    if not settings.AT_API_KEY:
        return None
    return AfricasTalkingClient(
        username=settings.AT_USERNAME,
        api_key=settings.AT_API_KEY,
        sender_id=settings.AT_SENDER_ID,
        base_url=settings.AT_BASE_URL,
        timeout=settings.SMS_HTTP_TIMEOUT,
    )


def is_enabled() -> bool:
    return get_client() is not None


def is_sandbox() -> bool:
    return settings.AT_USERNAME == "sandbox"


@dataclass(frozen=True)
class SendOutcome:
    phone: str
    status: str  # "sent" | "failed" | "skipped"
    error: str = ""


def send_sms(phones: list[str], message: str, *, kind: str, response=None) -> list[SendOutcome]:
    """Send one message to many numbers. Never raises: each outcome is logged and returned."""
    unique = list(dict.fromkeys(normalize_phone(p) for p in phones))
    if not unique:
        return []
    outcomes: dict[str, SendOutcome] = {}
    provider: dict[str, tuple[int | None, str]] = {}

    client = get_client()
    if client is None:
        outcomes = {p: SendOutcome(p, "skipped", "SMS gateway not configured") for p in unique}
    else:
        try:
            results = {normalize_phone(r.number): r for r in client.send(unique, message)}
        except SmsGatewayError as exc:
            logger.warning("SMS send failed: %s", exc)
            outcomes = {p: SendOutcome(p, "failed", str(exc)[:500]) for p in unique}
        else:
            for phone in unique:
                result = results.get(phone)
                if result is None:
                    outcomes[phone] = SendOutcome(phone, "failed", "No result for this number")
                elif result.accepted:
                    outcomes[phone] = SendOutcome(phone, "sent")
                    provider[phone] = (result.status_code, result.message_id)
                else:
                    reason = f"{result.status} ({result.status_code})"
                    outcomes[phone] = SendOutcome(phone, "failed", reason)
                    provider[phone] = (result.status_code, result.message_id)

    SmsLog.objects.bulk_create(
        [
            SmsLog(
                direction=SmsLog.Direction.OUTBOUND,
                kind=kind,
                phone=outcome.phone,
                body=message,
                status=outcome.status,
                provider_status_code=provider.get(outcome.phone, (None, ""))[0],
                provider_message_id=provider.get(outcome.phone, (None, ""))[1],
                error=outcome.error,
                response=response,
            )
            for outcome in outcomes.values()
        ]
    )
    return list(outcomes.values())

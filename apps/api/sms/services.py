"""Inbound replies and invitations."""

import logging
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from alerts.dispatch import run_in_background
from feedback.models import Customer, Response
from feedback.phone import is_e164, normalize_phone
from feedback.services import submit_feedback

from .gateway import SendOutcome, send_sms
from .models import SmsLog
from .parsing import is_help_request, parse_ratings

logger = logging.getLogger(__name__)

HELP_TEXT = (
    "To rate us, reply with three digits from 1 (not great) to 5 (loved it) for "
    "product, care and happiness. Example: 4 5 4"
)
INVALID_TEXT = f"Sorry, we could not read that. {HELP_TEXT}"
LIMIT_TEXT = "Thanks, we already have your feedback for today."


def thanks_text(ratings: tuple[int, int, int]) -> str:
    product, care, happy = ratings
    return (
        f"Thank you! We recorded your ratings: product {product}, care {care}, happiness {happy}."
    )


def _send_reply(phone: str, text: str) -> None:
    send_sms([phone], text, kind=SmsLog.Kind.REPLY)


def _over_daily_limit(phone: str) -> bool:
    since = timezone.now() - timedelta(hours=24)
    count = Response.objects.filter(
        customer__phone=phone, channel=Response.Channel.SMS, created_at__gte=since
    ).count()
    return count >= settings.SMS_MAX_RESPONSES_PER_DAY


def handle_inbound(*, sender: str, text: str, message_id: str = "") -> str:
    """Process one customer SMS.

    Returns recorded | invalid | help | limited | duplicate | ignored.
    """
    phone = normalize_phone(sender)
    if not is_e164(phone):
        return "ignored"
    ratings = parse_ratings(text)

    with transaction.atomic():
        try:
            with transaction.atomic():
                log = SmsLog.objects.create(
                    direction=SmsLog.Direction.INBOUND,
                    kind=SmsLog.Kind.INBOUND,
                    phone=phone,
                    body=text[:1000],
                    status=SmsLog.Status.INVALID,
                    provider_message_id=message_id[:100],
                )
        except IntegrityError:
            return "duplicate"  # the gateway retried a message we already handled

        if ratings is not None and _over_daily_limit(phone):
            log.status, reply, outcome = SmsLog.Status.LIMITED, LIMIT_TEXT, "limited"
        elif ratings is not None:
            Customer.objects.get_or_create(
                phone=phone, defaults={"type": Customer.Type.PAINTER}
            )  # SMS is the feature-phone path used by painters
            response = submit_feedback(
                q_product=ratings[0],
                q_care=ratings[1],
                q_happy=ratings[2],
                phone=phone,
                channel=Response.Channel.SMS,
            )
            log.response, log.status = response, SmsLog.Status.RECEIVED
            reply, outcome = thanks_text(ratings), "recorded"
        elif is_help_request(text):
            log.status, reply, outcome = SmsLog.Status.HELP, HELP_TEXT, "help"
        else:
            reply, outcome = INVALID_TEXT, "invalid"
        log.save(update_fields=["status", "response"])
        transaction.on_commit(lambda: run_in_background(_send_reply, phone, reply))
    return outcome


def send_invites(phones: list[str]) -> list[SendOutcome]:
    return send_sms(phones, settings.SMS_INVITE_TEXT, kind=SmsLog.Kind.INVITE)

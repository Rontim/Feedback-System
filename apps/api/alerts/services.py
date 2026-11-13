import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from feedback.models import Response
from feedback.phone import is_e164, normalize_phone
from sms import gateway as sms_gateway
from sms.models import SmsLog

from .dispatch import run_in_background
from .emails import build_alert_email
from .models import Alert, DeliveryStatus, Notification
from .sms import build_alert_sms

logger = logging.getLogger(__name__)
User = get_user_model()


def active_care_reps():
    return User.objects.filter(is_active=True, is_care_rep=True, is_superuser=False)


def care_team_emails() -> list[str]:
    emails = sorted({rep.email for rep in active_care_reps() if rep.email})
    if not emails and settings.CARE_ALERT_FALLBACK_EMAIL:
        emails = [settings.CARE_ALERT_FALLBACK_EMAIL]
    return emails


def care_team_phones() -> list[str]:
    phones = {normalize_phone(rep.phone) for rep in active_care_reps() if rep.phone}
    return sorted(p for p in phones if is_e164(p))


def raise_alert(response: Response) -> Alert | None:
    """Create the alert and in-app notifications; schedule delivery after commit.

    Runs inside the caller's transaction but in a savepoint, so if anything here fails the
    customer's feedback is still saved.
    """
    try:
        with transaction.atomic():
            alert = Alert.objects.create(
                response=response,
                sms_status=(
                    DeliveryStatus.PENDING
                    if sms_gateway.is_enabled() and not sms_gateway.is_sandbox()
                    else DeliveryStatus.SKIPPED
                ),
            )
            Notification.objects.bulk_create(
                [Notification(rep=rep, alert=alert) for rep in active_care_reps()]
            )
    except Exception:
        logger.exception("Could not create alert for response %s", response.pk)
        return None
    transaction.on_commit(lambda: run_in_background(deliver_alert, alert.pk))
    return alert


def deliver_alert(alert_id: int) -> None:
    """Email and SMS are independent: one channel failing never blocks the other."""
    alert = Alert.objects.select_related("response__customer").filter(pk=alert_id).first()
    if alert is None:
        return
    for channel in (deliver_email, deliver_sms):
        try:
            channel(alert)
        except Exception:
            logger.exception("Alert %s: %s crashed", alert.pk, channel.__name__)


def deliver_email(alert: Alert) -> None:
    if alert.email_status == DeliveryStatus.SENT:
        return
    alert.email_attempts += 1
    recipients = care_team_emails()
    if not recipients:
        alert.email_status = DeliveryStatus.FAILED
        alert.email_error = "No care rep email addresses configured"
    else:
        try:
            build_alert_email(alert, recipients).send(fail_silently=False)
        except Exception as exc:
            logger.warning("Alert %s email failed: %s", alert.pk, exc)
            alert.email_status = DeliveryStatus.FAILED
            alert.email_error = f"{type(exc).__name__}: {exc}"[:500]
        else:
            alert.email_status = DeliveryStatus.SENT
            alert.email_error = ""
    alert.save(update_fields=["email_status", "email_error", "email_attempts"])


def deliver_sms(alert: Alert) -> None:
    """Text the care team. 'sent' means at least one rep was reached (a partial failure must not
    make a retry re-text everyone who already got it)."""
    if alert.sms_status == DeliveryStatus.SENT:
        return
    phones = care_team_phones()
    skip_reason = None
    if not sms_gateway.is_enabled():
        skip_reason = "SMS gateway not configured"
    elif not phones:
        skip_reason = "No care rep phone numbers configured"
    if skip_reason:
        alert.sms_status, alert.sms_error = DeliveryStatus.SKIPPED, skip_reason
        alert.save(update_fields=["sms_status", "sms_error"])
        return
    alert.sms_attempts += 1
    outcomes = sms_gateway.send_sms(
        phones, build_alert_sms(alert), kind=SmsLog.Kind.ALERT, response=alert.response
    )
    failures = [f"{o.phone}: {o.error}" for o in outcomes if o.status != "sent"]
    if len(failures) < len(outcomes):
        alert.sms_status, alert.sms_error = DeliveryStatus.SENT, "; ".join(failures)[:500]
    else:
        alert.sms_status, alert.sms_error = DeliveryStatus.FAILED, "; ".join(failures)[:500]
    alert.save(update_fields=["sms_status", "sms_error", "sms_attempts"])


def update_alert_state(
    alert: Alert, rep, *, read: bool | None = None, handled: bool | None = None
) -> Alert:
    now = timezone.now()
    if handled is True:
        alert.handled_by, alert.handled_at = rep, now
        if alert.read_at is None:
            alert.read_at = now
    elif handled is False:
        alert.handled_by, alert.handled_at = None, None
    if read is True and alert.read_at is None:
        alert.read_at = now
    elif read is False:
        alert.read_at = None
    alert.save(update_fields=["read_at", "handled_at", "handled_by"])
    if alert.read_at is not None:
        Notification.objects.filter(alert=alert, rep=rep, read_at__isnull=True).update(read_at=now)
    return alert

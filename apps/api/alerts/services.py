import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from feedback.models import Response

from .dispatch import run_in_background
from .emails import build_alert_email
from .models import Alert, DeliveryStatus, Notification

logger = logging.getLogger(__name__)
User = get_user_model()


def active_care_reps():
    return User.objects.filter(is_active=True, is_care_rep=True)


def care_team_emails() -> list[str]:
    emails = sorted({rep.email for rep in active_care_reps() if rep.email})
    if not emails and settings.CARE_ALERT_FALLBACK_EMAIL:
        emails = [settings.CARE_ALERT_FALLBACK_EMAIL]
    return emails


def raise_alert(response: Response) -> Alert | None:
    """Create the alert and in-app notifications; schedule delivery after commit.

    Runs inside the caller's transaction but in a savepoint, so if anything here fails the
    customer's feedback is still saved.
    """
    try:
        with transaction.atomic():
            alert = Alert.objects.create(response=response)
            Notification.objects.bulk_create(
                [Notification(rep=rep, alert=alert) for rep in active_care_reps()]
            )
    except Exception:
        logger.exception("Could not create alert for response %s", response.pk)
        return None
    transaction.on_commit(lambda: run_in_background(deliver_alert, alert.pk))
    return alert


def deliver_alert(alert_id: int) -> None:
    alert = Alert.objects.select_related("response__customer").filter(pk=alert_id).first()
    if alert is not None:
        deliver_email(alert)


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

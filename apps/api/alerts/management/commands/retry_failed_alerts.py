from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from alerts.models import Alert, DeliveryStatus
from alerts.services import deliver_email, deliver_sms


class Command(BaseCommand):
    help = (
        "Retry alert emails and SMS that failed, or stayed pending "
        "(e.g. the server restarted mid-send)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--max-attempts", type=int, default=5)
        parser.add_argument(
            "--pending-after-minutes",
            type=int,
            default=2,
            help="Only retry 'pending' alerts older than this, to avoid racing in-flight sends.",
        )

    def handle(self, *args, max_attempts, pending_after_minutes, **options):
        cutoff = timezone.now() - timedelta(minutes=pending_after_minutes)

        def due(channel: str) -> Q:
            status = f"{channel}_status"
            return Q(**{f"{channel}_attempts__lt": max_attempts}) & (
                Q(**{status: DeliveryStatus.FAILED})
                | Q(**{status: DeliveryStatus.PENDING, "created_at__lt": cutoff})
            )

        retried = {"email": [0, 0], "sms": [0, 0]}  # [sent, still failing]
        alerts = Alert.objects.select_related("response__customer").filter(
            due("email") | due("sms")
        )
        for alert in alerts:
            for channel, deliver in (("email", deliver_email), ("sms", deliver_sms)):
                status_before = getattr(alert, f"{channel}_status")
                if status_before not in (DeliveryStatus.FAILED, DeliveryStatus.PENDING):
                    continue
                if getattr(alert, f"{channel}_attempts") >= max_attempts:
                    continue
                deliver(alert)
                sent = getattr(alert, f"{channel}_status") == DeliveryStatus.SENT
                retried[channel][0 if sent else 1] += 1
        for channel, (sent, failing) in retried.items():
            self.stdout.write(
                f"{channel}: retried {sent + failing}, {sent} sent, {failing} still failing"
            )

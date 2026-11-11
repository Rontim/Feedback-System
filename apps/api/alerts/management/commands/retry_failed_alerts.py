from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from alerts.models import Alert, DeliveryStatus
from alerts.services import deliver_email


class Command(BaseCommand):
    help = "Retry alert emails that failed, or stayed pending (e.g. the server restarted mid-send)."

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
        todo = (
            Alert.objects.select_related("response__customer")
            .filter(email_attempts__lt=max_attempts)
            .filter(
                Q(email_status=DeliveryStatus.FAILED)
                | Q(email_status=DeliveryStatus.PENDING, created_at__lt=cutoff)
            )
        )
        sent = failed = 0
        for alert in todo:
            deliver_email(alert)
            if alert.email_status == DeliveryStatus.SENT:
                sent += 1
            else:
                failed += 1
        self.stdout.write(f"Retried {sent + failed} alert(s): {sent} sent, {failed} still failing.")

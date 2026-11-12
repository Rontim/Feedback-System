import time

from django.core.management.base import BaseCommand, CommandError

from feedback.models import Response
from insights import services


class Command(BaseCommand):
    help = "Tag comments that have no AI analysis yet (backfill, or retry after an outage)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)
        parser.add_argument(
            "--sleep",
            type=float,
            default=1.5,
            help="Seconds between calls; free API tiers are rate limited.",
        )

    def handle(self, *args, limit, sleep, **options):
        if not services.is_enabled():
            raise CommandError("AI_API_KEY is not set, so there is nothing to call.")
        pending = (
            Response.objects.exclude(comment="")
            .filter(analysis__isnull=True)
            .order_by("-created_at")
            .values_list("pk", flat=True)[:limit]
        )
        counts = {"tagged": 0, "failed": 0, "skipped": 0}
        for index, pk in enumerate(list(pending)):
            if index and sleep:
                time.sleep(sleep)
            counts[services.tag_response(pk)] += 1
        self.stdout.write(
            f"tagged {counts['tagged']}, failed {counts['failed']}, skipped {counts['skipped']}"
        )

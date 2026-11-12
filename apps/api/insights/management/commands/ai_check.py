import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from insights import services
from insights.client import AiError


class Command(BaseCommand):
    help = "Send one sample comment to the configured model and show what comes back."

    def add_arguments(self, parser):
        parser.add_argument("--text", default="The colour was wrong and delivery took two weeks.")

    def handle(self, *args, text, **options):
        tagger = services.get_tagger()
        if tagger is None:
            raise CommandError("AI_API_KEY is not set.")
        self.stdout.write(f"endpoint: {settings.AI_BASE_URL}\nmodel:    {tagger.model}")
        started = time.monotonic()
        try:
            tag = tagger.classify(text)
        except AiError as exc:
            raise CommandError(f"Call failed: {exc}") from exc
        elapsed = time.monotonic() - started
        self.stdout.write(
            self.style.SUCCESS(f"ok in {elapsed:.1f}s: {tag.topic} / {tag.sentiment}")
        )

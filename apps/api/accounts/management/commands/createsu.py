import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create the Django admin superuser, not a care rep"

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")

        if not password:
            raise CommandError("DJANGO_SUPERUSER_PASSWORD environment variable is required.")

        user = User.objects.filter(username=username).first()
        if user is None:
            User.objects.create_superuser(
                username=username, email=email, password=password, is_care_rep=False
            )
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created successfully.'))
            return

        if not user.is_superuser:
            raise CommandError(f'User "{username}" exists but is not a superuser.')
        if user.is_care_rep:
            user.is_care_rep = False
            user.save(update_fields=["is_care_rep"])
        self.stdout.write(self.style.WARNING(f'Superuser "{username}" already exists.'))

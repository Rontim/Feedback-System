from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Care reps are Users. Custom from migration 0001 so we never have to swap it later."""

    phone = models.CharField(max_length=20, blank=True)
    is_care_rep = models.BooleanField(default=False)

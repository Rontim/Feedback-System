from django.db import models
from django.db.models import Q

from . import scoring


class Customer(models.Model):
    class Type(models.TextChoices):
        HOMEOWNER = "homeowner"
        PAINTER = "painter"

    name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, unique=True)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.HOMEOWNER)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or self.phone


def _rating_check(field: str) -> models.CheckConstraint:
    return models.CheckConstraint(
        condition=Q(**{f"{field}__gte": 1, f"{field}__lte": 5}),
        name=f"{field}_between_1_and_5",
    )


class Response(models.Model):
    class Channel(models.TextChoices):
        WEB = "web"
        SMS = "sms"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="responses")
    q_product = models.PositiveSmallIntegerField()
    q_care = models.PositiveSmallIntegerField()
    q_happy = models.PositiveSmallIntegerField()
    score_sum = models.PositiveSmallIntegerField()
    mean = models.DecimalField(max_digits=3, decimal_places=2)
    category = models.CharField(max_length=10, choices=[(c, c) for c in scoring.CATEGORIES])
    channel = models.CharField(max_length=3, choices=Channel.choices, default=Channel.WEB)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            _rating_check("q_product"),
            _rating_check("q_care"),
            _rating_check("q_happy"),
        ]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["category"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.customer} {self.mean} ({self.category})"

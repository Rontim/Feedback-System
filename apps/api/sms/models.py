from django.db import models
from django.db.models import Q


class SmsLog(models.Model):
    """Every SMS we send or receive, so delivery problems and replies are visible and auditable."""

    class Direction(models.TextChoices):
        INBOUND = "inbound"
        OUTBOUND = "outbound"

    class Kind(models.TextChoices):
        INBOUND = "inbound"  # a customer's reply
        ALERT = "alert"  # detractor alert to a care rep
        INVITE = "invite"  # feedback invitation to a customer
        REPLY = "reply"  # our answer to an inbound message

    class Status(models.TextChoices):
        SENT = "sent"
        FAILED = "failed"
        SKIPPED = "skipped"  # gateway not configured
        RECEIVED = "received"  # inbound, ratings recorded
        INVALID = "invalid"  # inbound, could not be read
        HELP = "help"  # inbound, asked for instructions
        LIMITED = "limited"  # inbound, daily cap reached

    direction = models.CharField(max_length=8, choices=Direction.choices)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    phone = models.CharField(max_length=20)
    body = models.TextField()
    status = models.CharField(max_length=8, choices=Status.choices)
    provider_status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    provider_message_id = models.CharField(max_length=100, blank=True)
    error = models.CharField(max_length=500, blank=True)
    response = models.ForeignKey(
        "feedback.Response",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sms_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            # Africa's Talking may retry a callback; the same inbound message id is handled once.
            # Outbound rows are deliberately not constrained: logging must never fail after a send.
            models.UniqueConstraint(
                fields=["provider_message_id"],
                condition=Q(direction="inbound") & ~Q(provider_message_id=""),
                name="unique_inbound_provider_message",
            )
        ]

    def __str__(self):
        return f"{self.direction} {self.kind} {self.phone} ({self.status})"

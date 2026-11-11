from django.conf import settings
from django.db import models


class DeliveryStatus(models.TextChoices):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    SKIPPED = "skipped"


class Alert(models.Model):
    """Raised when a response is classified as a detractor.

    Created in the same transaction as the response. Delivery (email now, SMS later)
    happens afterwards and is tracked per channel so a failure is visible and retryable.
    """

    response = models.OneToOneField(
        "feedback.Response", on_delete=models.CASCADE, related_name="alert"
    )
    email_status = models.CharField(
        max_length=7, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING
    )
    email_error = models.CharField(max_length=500, blank=True)
    email_attempts = models.PositiveSmallIntegerField(default=0)
    # "skipped" when the SMS gateway is not configured or no care rep has a phone number.
    sms_status = models.CharField(
        max_length=7, choices=DeliveryStatus.choices, default=DeliveryStatus.SKIPPED
    )
    sms_error = models.CharField(max_length=500, blank=True)
    sms_attempts = models.PositiveSmallIntegerField(default=0)
    read_at = models.DateTimeField(null=True, blank=True)
    handled_at = models.DateTimeField(null=True, blank=True)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="handled_alerts",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["email_status"])]

    def __str__(self):
        return f"Alert #{self.pk} for response {self.response_id}"


class Notification(models.Model):
    """In-app notification for one care rep about one alert."""

    rep = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name="notifications")
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["rep", "alert"], name="one_notification_per_rep_alert")
        ]

    def __str__(self):
        return f"Notification #{self.pk} for {self.rep}"

from django.db import models


class CommentAnalysis(models.Model):
    """AI-assigned mood and topic for one customer comment. Absent when AI is off or failed."""

    class Sentiment(models.TextChoices):
        POSITIVE = "positive"
        NEUTRAL = "neutral"
        NEGATIVE = "negative"

    class Topic(models.TextChoices):
        COLOUR = "colour"
        PRICE = "price"
        DELIVERY = "delivery"
        SERVICE = "service"
        QUALITY = "quality"
        OTHER = "other"

    response = models.OneToOneField(
        "feedback.Response", on_delete=models.CASCADE, related_name="analysis"
    )
    sentiment = models.CharField(max_length=8, choices=Sentiment.choices)
    topic = models.CharField(max_length=8, choices=Topic.choices)
    model = models.CharField(max_length=100)  # which model produced it, for auditing
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["topic", "sentiment"])]

    def __str__(self):
        return f"{self.topic}/{self.sentiment} for response {self.response_id}"

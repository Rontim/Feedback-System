from datetime import datetime, time, timedelta

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response as DRFResponse
from rest_framework.views import APIView

from alerts.models import Alert
from feedback import scoring
from feedback.models import Response
from insights import services as insight_services
from insights.models import CommentAnalysis

from .projection import DailyPoint, build_projection

MIN_DAYS, MAX_DAYS, DEFAULT_DAYS = 7, 180, 30


def _round(value) -> float | None:
    return None if value is None else round(float(value), 2)


def _parse_days(raw: str | None) -> int:
    if raw is None:
        return DEFAULT_DAYS
    if not raw.isdigit() or not MIN_DAYS <= int(raw) <= MAX_DAYS:
        raise ValidationError({"days": f"Must be a whole number from {MIN_DAYS} to {MAX_DAYS}."})
    return int(raw)


class SummaryView(APIView):
    def get(self, request):
        totals = Response.objects.aggregate(
            total=Count("id"),
            detractor=Count("id", filter=Q(category=scoring.DETRACTOR)),
            passive=Count("id", filter=Q(category=scoring.PASSIVE)),
            promoter=Count("id", filter=Q(category=scoring.PROMOTER)),
            mean=Avg("mean"),
        )
        alerts = Alert.objects.aggregate(
            open=Count("id", filter=Q(handled_at__isnull=True)),
            unread=Count("id", filter=Q(read_at__isnull=True)),
        )
        return DRFResponse(
            {
                "total": totals["total"],
                "categories": {c: totals[c] for c in scoring.CATEGORIES},
                "mean": _round(totals["mean"]),
                "alerts": {"open": alerts["open"], "unread": alerts["unread"]},
            }
        )


class TrendView(APIView):
    """Daily mean and count for the last N days (days are in the server's local time zone)."""

    def get(self, request):
        days = _parse_days(request.query_params.get("days"))
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        start_at = timezone.make_aware(datetime.combine(start, time.min))

        rows = (
            Response.objects.filter(created_at__gte=start_at)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"), avg=Avg("mean"))
        )
        by_day = {row["day"]: row for row in rows}

        series, points = [], []
        for offset in range(days):
            day = start + timedelta(days=offset)
            row = by_day.get(day)
            count = row["count"] if row else 0
            mean = _round(row["avg"]) if row else None
            series.append({"date": day.isoformat(), "count": count, "mean": mean})
            if row and mean is not None:
                points.append(DailyPoint(day=day, mean=float(row["avg"]), count=count))

        return DRFResponse(
            {"days": days, "series": series, "projection": build_projection(points, end=today)}
        )


class TopicsView(APIView):
    """What customers talk about: AI-tagged comments in the last N days, by topic and mood."""

    def get(self, request):
        days = _parse_days(request.query_params.get("days"))
        start = timezone.localdate() - timedelta(days=days - 1)
        start_at = timezone.make_aware(datetime.combine(start, time.min))

        counts: dict[str, dict[str, int]] = {}
        rows = (
            CommentAnalysis.objects.filter(response__created_at__gte=start_at)
            .values("topic", "sentiment")
            .annotate(n=Count("id"))
        )
        for row in rows:
            topic = counts.setdefault(row["topic"], {"positive": 0, "neutral": 0, "negative": 0})
            topic[row["sentiment"]] = row["n"]
        topics = sorted(
            (
                {"topic": name, **by_sentiment, "total": sum(by_sentiment.values())}
                for name, by_sentiment in counts.items()
            ),
            key=lambda item: (-item["total"], item["topic"]),
        )
        awaiting = (
            Response.objects.filter(created_at__gte=start_at)
            .exclude(comment="")
            .filter(analysis__isnull=True)
            .count()
        )
        return DRFResponse(
            {
                "days": days,
                "enabled": insight_services.is_enabled(),
                "tagged": sum(item["total"] for item in topics),
                "awaiting": awaiting,
                "topics": topics,
            }
        )

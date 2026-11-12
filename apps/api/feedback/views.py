from datetime import date

from django.db.models import Q
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response as DRFResponse
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Response
from .serializers import FeedbackInputSerializer, ResponseDetailSerializer
from .services import submit_feedback


class FeedbackThrottle(AnonRateThrottle):
    scope = "feedback"


class FeedbackCreateView(APIView):
    """Public endpoint. No auth classes means no CSRF check; throttled instead."""

    authentication_classes: list = []
    permission_classes: list = []
    throttle_classes = [FeedbackThrottle]

    def post(self, request):
        serializer = FeedbackInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        response = submit_feedback(
            q_product=data["q_product"],
            q_care=data["q_care"],
            q_happy=data["q_happy"],
            phone=data["phone"].strip(),
            name=data["name"],
            email=data["email"],
            customer_type=data["customer_type"],
            comment=data["comment"],
        )
        return DRFResponse(
            {"id": response.id, "mean": str(response.mean), "category": response.category},
            status=status.HTTP_201_CREATED,
        )


ORDERINGS = {"created_at", "-created_at", "mean", "-mean"}
RESPONSES = Response.objects.select_related("customer", "alert", "analysis")


def _csv(raw: str | None) -> list[str]:
    return [part for part in (raw or "").split(",") if part]


def _parse_date(params, key: str) -> date | None:
    raw = params.get(key)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({key: "Use YYYY-MM-DD."}) from None


class ResponseListView(generics.ListAPIView):
    """Care-rep table.

    Filters: category, channel, sentiment, topic (comma lists), q (name/email/phone),
    from/to (YYYY-MM-DD, local days), ordering (created_at, mean; prefix - for descending).
    """

    serializer_class = ResponseDetailSerializer

    def get_queryset(self):
        params = self.request.query_params
        qs = RESPONSES.all()
        if categories := _csv(params.get("category")):
            qs = qs.filter(category__in=categories)
        if channels := _csv(params.get("channel")):
            qs = qs.filter(channel__in=channels)
        if sentiments := _csv(params.get("sentiment")):
            qs = qs.filter(analysis__sentiment__in=sentiments)
        if topics := _csv(params.get("topic")):
            qs = qs.filter(analysis__topic__in=topics)
        if term := params.get("q", "").strip():
            qs = qs.filter(
                Q(customer__name__icontains=term)
                | Q(customer__email__icontains=term)
                | Q(customer__phone__icontains=term)
            )
        if start := _parse_date(params, "from"):
            qs = qs.filter(created_at__date__gte=start)
        if end := _parse_date(params, "to"):
            qs = qs.filter(created_at__date__lte=end)
        ordering = params.get("ordering", "-created_at")
        if ordering not in ORDERINGS:
            raise ValidationError({"ordering": f"Choose one of {sorted(ORDERINGS)}."})
        return qs.order_by(ordering, "-id")


class ResponseDetailView(generics.RetrieveAPIView):
    queryset = RESPONSES.all()
    serializer_class = ResponseDetailSerializer

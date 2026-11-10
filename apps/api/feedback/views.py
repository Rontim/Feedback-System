from rest_framework import status
from rest_framework.response import Response as DRFResponse
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .serializers import FeedbackInputSerializer
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

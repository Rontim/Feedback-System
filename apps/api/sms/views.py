import hmac

from django.conf import settings
from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response as DRFResponse
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import gateway
from .models import SmsLog
from .serializers import InboundSmsSerializer, InviteSerializer, SmsLogSerializer
from .services import handle_inbound, send_invites


class InboundSmsView(APIView):
    """Africa's Talking callback. It does not sign requests, so the URL carries a secret token:
    https://<host>/api/sms/inbound?token=<AT_WEBHOOK_TOKEN>. Fails closed when no token is set."""

    authentication_classes: list = []
    permission_classes: list = []
    parser_classes = [FormParser, MultiPartParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "sms_inbound"

    def post(self, request):
        expected = settings.AT_WEBHOOK_TOKEN
        supplied = request.query_params.get("token", "")
        if not expected or not hmac.compare_digest(supplied.encode(), expected.encode()):
            return DRFResponse({"detail": "Forbidden."}, status=403)
        payload = InboundSmsSerializer.from_gateway(request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        outcome = handle_inbound(sender=data["sender"], text=data["text"], message_id=data["id"])
        return DRFResponse({"status": outcome})


class InviteView(APIView):
    """Care reps send the 'rate us' invitation to customers (usually painters on feature phones)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "sms_invite"

    def post(self, request):
        payload = InviteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        outcomes = send_invites(payload.validated_data["phones"])
        counts = {
            s: sum(1 for o in outcomes if o.status == s) for s in ("sent", "failed", "skipped")
        }
        return DRFResponse(
            {
                "results": [
                    {"phone": o.phone, "status": o.status, "error": o.error} for o in outcomes
                ],
                **counts,
            }
        )


class SmsConfigView(APIView):
    def get(self, request):
        return DRFResponse(
            {
                "enabled": gateway.is_enabled(),
                "environment": "sandbox" if settings.AT_USERNAME == "sandbox" else "live",
                "sender_id": settings.AT_SENDER_ID,
                "invite_text": settings.SMS_INVITE_TEXT,
            }
        )


class SmsLogListView(generics.ListAPIView):
    """?direction=inbound|outbound"""

    serializer_class = SmsLogSerializer

    def get_queryset(self):
        qs = SmsLog.objects.all()
        direction = self.request.query_params.get("direction")
        if direction in (SmsLog.Direction.INBOUND, SmsLog.Direction.OUTBOUND):
            qs = qs.filter(direction=direction)
        return qs

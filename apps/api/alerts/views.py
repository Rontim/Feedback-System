from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response as DRFResponse
from rest_framework.views import APIView

from accounts.permissions import IsCareRep

from .models import Alert, Notification
from .serializers import AlertSerializer, AlertUpdateSerializer, NotificationSerializer
from .services import update_alert_state

ALERTS = Alert.objects.select_related("response__customer", "response__analysis", "handled_by")


class AlertListView(generics.ListAPIView):
    """?unread=1 for alerts nobody has opened, ?handled=0|1 to split open/closed."""

    permission_classes = [IsCareRep]
    serializer_class = AlertSerializer

    def get_queryset(self):
        qs = ALERTS.all()
        params = self.request.query_params
        if params.get("unread") == "1":
            qs = qs.filter(read_at__isnull=True)
        if params.get("handled") in ("0", "1"):
            qs = qs.filter(handled_at__isnull=params["handled"] == "0")
        return qs


class AlertDetailView(generics.RetrieveAPIView):
    permission_classes = [IsCareRep]
    queryset = ALERTS.all()
    serializer_class = AlertSerializer

    def patch(self, request, pk: int):
        alert = get_object_or_404(ALERTS, pk=pk)
        payload = AlertUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        update_alert_state(
            alert,
            request.user,
            read=payload.validated_data.get("read"),
            handled=payload.validated_data.get("handled"),
        )
        return DRFResponse(AlertSerializer(alert).data)


class NotificationListView(APIView):
    """The bell dropdown: latest 20 for the signed-in rep plus the unread badge count."""

    permission_classes = [IsCareRep]

    def get(self, request):
        mine = Notification.objects.filter(rep=request.user).select_related(
            "alert__response__customer"
        )
        return DRFResponse(
            {
                "unread_count": mine.filter(read_at__isnull=True).count(),
                "results": NotificationSerializer(mine[:20], many=True).data,
            }
        )


class NotificationReadView(APIView):
    permission_classes = [IsCareRep]

    def post(self, request, pk: int):
        notification = get_object_or_404(Notification, pk=pk, rep=request.user)
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return DRFResponse(status=status.HTTP_204_NO_CONTENT)


class NotificationReadAllView(APIView):
    permission_classes = [IsCareRep]

    def post(self, request):
        Notification.objects.filter(rep=request.user, read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return DRFResponse(status=status.HTTP_204_NO_CONTENT)

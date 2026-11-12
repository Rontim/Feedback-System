from rest_framework import serializers

from feedback.models import Response
from feedback.serializers import CustomerSerializer, analysis_payload

from .models import Alert, Notification


class ResponseSerializer(serializers.ModelSerializer):
    analysis = serializers.SerializerMethodField()

    class Meta:
        model = Response
        fields = [
            "id", "q_product", "q_care", "q_happy", "mean", "category",
            "channel", "comment", "created_at", "analysis",
        ]  # fmt: skip

    def get_analysis(self, obj: Response) -> dict | None:
        return analysis_payload(obj)


class AlertSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(source="response.customer", read_only=True)
    response = ResponseSerializer(read_only=True)
    handled_by = serializers.CharField(source="handled_by.username", default=None, read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id", "created_at", "customer", "response", "email_status", "sms_status",
            "read_at", "handled_at", "handled_by",
        ]  # fmt: skip


class AlertUpdateSerializer(serializers.Serializer):
    read = serializers.BooleanField(required=False)
    handled = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide 'read' and/or 'handled'.")
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="alert.response.customer.name", read_only=True)
    mean = serializers.DecimalField(
        source="alert.response.mean", max_digits=3, decimal_places=2, read_only=True
    )

    class Meta:
        model = Notification
        fields = ["id", "alert_id", "customer_name", "mean", "read_at", "created_at"]

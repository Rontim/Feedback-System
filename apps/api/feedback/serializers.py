from rest_framework import serializers

from .models import Customer, Response


class FeedbackInputSerializer(serializers.Serializer):
    q_product = serializers.IntegerField(min_value=1, max_value=5)
    q_care = serializers.IntegerField(min_value=1, max_value=5)
    q_happy = serializers.IntegerField(min_value=1, max_value=5)
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.RegexField(r"^\+?[0-9 ()-]{7,20}$", max_length=20)
    customer_type = serializers.ChoiceField(
        choices=Customer.Type.choices, required=False, default=Customer.Type.HOMEOWNER
    )
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "email", "phone", "type"]


class ResponseDetailSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    alert = serializers.SerializerMethodField()

    class Meta:
        model = Response
        fields = [
            "id", "created_at", "customer", "q_product", "q_care", "q_happy", "mean",
            "category", "channel", "comment", "alert",
        ]  # fmt: skip

    def get_alert(self, obj: Response) -> dict | None:
        alert = getattr(obj, "alert", None)  # reverse one-to-one: absent for non-detractors
        if alert is None:
            return None
        return {
            "id": alert.pk,
            "email_status": alert.email_status,
            "read_at": alert.read_at,
            "handled_at": alert.handled_at,
        }

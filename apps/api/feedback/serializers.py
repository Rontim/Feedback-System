from rest_framework import serializers

from .models import Customer


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

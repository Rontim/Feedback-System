from rest_framework import serializers

from feedback.phone import is_e164, normalize_phone

from .models import SmsLog

MAX_INVITES = 50


class InboundSmsSerializer(serializers.Serializer):
    """Validated form of an Africa's Talking callback.

    The gateway posts `from`, `text`, `to`, `id`, `date`, `linkId` and `networkCode`.
    `from` is a Python keyword, so `from_gateway` maps the raw payload onto these field names.
    """

    sender = serializers.CharField(max_length=30)
    text = serializers.CharField(allow_blank=True, trim_whitespace=False, max_length=1000)
    id = serializers.CharField(required=False, allow_blank=True, default="", max_length=100)

    @classmethod
    def from_gateway(cls, raw) -> "InboundSmsSerializer":
        return cls(
            data={"sender": raw.get("from"), "text": raw.get("text", ""), "id": raw.get("id", "")}
        )


class InviteSerializer(serializers.Serializer):
    phones = serializers.ListField(
        child=serializers.CharField(max_length=30), min_length=1, max_length=MAX_INVITES
    )

    def validate_phones(self, phones: list[str]) -> list[str]:
        normalized, bad = [], []
        for raw in phones:
            phone = normalize_phone(raw)
            (normalized if is_e164(phone) else bad).append(phone if is_e164(phone) else raw)
        if bad:
            raise serializers.ValidationError(f"Not valid phone numbers: {', '.join(bad)}")
        return list(dict.fromkeys(normalized))


class SmsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsLog
        fields = ["id", "created_at", "direction", "kind", "phone", "body", "status", "error"]

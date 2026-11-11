from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)


class CareRepSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "name", "email"]

    def get_name(self, user: User) -> str:
        return user.get_full_name() or user.username

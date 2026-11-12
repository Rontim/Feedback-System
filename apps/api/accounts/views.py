from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import CareRepSerializer, LoginSerializer


class CsrfEnforcingAuthentication(SessionAuthentication):
    """Authenticates nobody but always enforces CSRF, so login cannot be forged cross-site."""

    def authenticate(self, request):
        self.enforce_csrf(request)
        return None


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    """The dashboard calls this once on load; it then sends the cookie back as X-CSRFToken."""

    authentication_classes: list = []
    permission_classes: list = []

    def get(self, request):
        return Response({"detail": "CSRF cookie set"})


class LoginView(APIView):
    authentication_classes = [CsrfEnforcingAuthentication]
    permission_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        credentials = LoginSerializer(data=request.data)
        credentials.is_valid(raise_exception=True)
        user = authenticate(request, **credentials.validated_data)
        if user is None or not user.is_care_rep or user.is_superuser:
            return Response(
                {"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST
            )
        login(request, user)
        return Response(CareRepSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(CareRepSerializer(request.user).data)

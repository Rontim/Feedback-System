import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

PAYLOAD = {
    "q_product": 2,
    "q_care": 3,
    "q_happy": 2,
    "name": "Amina Otieno",
    "email": "amina@example.com",
    "phone": "+254700111222",
    "customer_type": "painter",
    "comment": "Delivery was late",
}


@pytest.fixture(autouse=True)
def _inline_alert_delivery(settings):
    settings.ALERT_DISPATCH_SYNC = True
    settings.CARE_ALERT_FALLBACK_EMAIL = ""
    settings.DASHBOARD_URL = "https://dash.test/dashboard"


@pytest.fixture
def care_rep(db):
    return get_user_model().objects.create_user(
        "grace", email="grace@companyx.test", password="pw-12345", first_name="Grace"
    )


@pytest.fixture
def rep_client(care_rep):
    client = APIClient()
    client.force_login(care_rep)
    return client


@pytest.fixture
def post_feedback(django_capture_on_commit_callbacks):
    """Submit feedback and run the after-commit side effects (email delivery)."""

    def _post(**overrides):
        with django_capture_on_commit_callbacks(execute=True):
            return APIClient().post("/api/feedback", {**PAYLOAD, **overrides}, format="json")

    return _post

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
def _clear_throttle_cache():
    """DRF throttles live in the cache; without this, request counts leak between tests."""
    from django.core.cache import cache

    cache.clear()


@pytest.fixture(autouse=True)
def _inline_alert_delivery(settings):
    settings.ALERT_DISPATCH_SYNC = True
    settings.CARE_ALERT_FALLBACK_EMAIL = ""
    settings.DASHBOARD_URL = "https://dash.test/dashboard"


@pytest.fixture
def care_rep(db):
    return get_user_model().objects.create_user(
        "grace",
        email="grace@companyx.test",
        password="pw-12345",
        first_name="Grace",
        is_care_rep=True,
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


class FakeSmsClient:
    """Stands in for the Africa's Talking client; records what would have been sent."""

    def __init__(self):
        self.sent: list[tuple[list[str], str]] = []
        self.fail_with: Exception | None = None
        self.reject: set[str] = set()  # numbers the "gateway" refuses

    def send(self, recipients, message):
        from sms.client import SendResult

        if self.fail_with:
            raise self.fail_with
        self.sent.append((list(recipients), message))
        return [
            SendResult(
                number=number,
                status_code=403 if number in self.reject else 101,
                status="InvalidPhoneNumber" if number in self.reject else "Sent",
                message_id="" if number in self.reject else f"ATPid_{len(self.sent)}_{number}",
            )
            for number in recipients
        ]

    @property
    def messages(self) -> list[str]:
        return [message for _, message in self.sent]


@pytest.fixture
def fake_sms(monkeypatch):
    client = FakeSmsClient()
    monkeypatch.setattr("sms.gateway.get_client", lambda: client)
    return client


@pytest.fixture(autouse=True)
def _sms_settings(settings):
    settings.AT_API_KEY = ""
    settings.AT_WEBHOOK_TOKEN = "s3cret"
    settings.SMS_MAX_RESPONSES_PER_DAY = 5


@pytest.fixture
def capture_callbacks(django_capture_on_commit_callbacks):
    return django_capture_on_commit_callbacks


@pytest.fixture(autouse=True)
def _ai_off_by_default(settings):
    settings.AI_API_KEY = ""


class FakeTagger:
    """Stands in for the model: records every comment it is asked about."""

    def __init__(self):
        from insights.client import CommentTag

        self.model = "fake-model"
        self.result = CommentTag(sentiment="negative", topic="delivery")
        self.error: Exception | None = None
        self.seen: list[str] = []

    def classify(self, comment):
        self.seen.append(comment)
        if self.error:
            raise self.error
        return self.result


@pytest.fixture
def fake_tagger(monkeypatch, settings):
    settings.AI_API_KEY = "test-key"
    tagger = FakeTagger()
    monkeypatch.setattr("insights.services.get_tagger", lambda: tagger)
    return tagger

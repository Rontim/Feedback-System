import pytest
from rest_framework.test import APIClient

from alerts.models import Alert, Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def alert(care_rep, post_feedback):
    post_feedback()
    return Alert.objects.get()


@pytest.mark.parametrize(
    "method,url",
    [("get", "/api/alerts"), ("get", "/api/alerts/1"), ("get", "/api/notifications"),
     ("post", "/api/notifications/read-all"), ("get", "/api/auth/me")],
)  # fmt: skip
def test_anonymous_is_rejected(method, url):
    assert getattr(APIClient(), method)(url).status_code == 403


def test_non_care_rep_user_is_rejected(care_rep):
    care_rep.is_care_rep = False
    care_rep.save()
    client = APIClient()
    client.force_login(care_rep)
    assert client.get("/api/alerts").status_code == 403


def test_non_care_rep_cannot_read_or_handle_alerts(care_rep, alert):
    care_rep.is_care_rep = False
    care_rep.save()
    client = APIClient()
    client.force_login(care_rep)
    notification = Notification.objects.get(rep=care_rep)

    assert client.get("/api/alerts").status_code == 403
    assert (
        client.patch(f"/api/alerts/{alert.pk}", {"handled": True}, format="json").status_code == 403
    )
    assert client.get("/api/notifications").status_code == 403
    assert client.post("/api/notifications/read-all").status_code == 403
    assert client.post(f"/api/notifications/{notification.pk}/read").status_code == 403


def test_list_alerts_contains_name_and_email(rep_client, alert):
    body = rep_client.get("/api/alerts").json()
    assert body["count"] == 1
    item = body["results"][0]
    assert item["customer"]["name"] == "Amina Otieno"
    assert item["customer"]["email"] == "amina@example.com"
    assert item["response"]["mean"] == "2.33"
    assert (item["response"]["q_product"], item["response"]["q_care"]) == (2, 3)
    assert item["email_status"] == "sent"
    assert item["read_at"] is None


def test_unread_and_handled_filters(rep_client, alert):
    assert rep_client.get("/api/alerts?unread=1").json()["count"] == 1
    assert rep_client.get("/api/alerts?handled=1").json()["count"] == 0
    rep_client.patch(f"/api/alerts/{alert.pk}", {"handled": True}, format="json")
    assert rep_client.get("/api/alerts?unread=1").json()["count"] == 0
    assert rep_client.get("/api/alerts?handled=1").json()["count"] == 1
    assert rep_client.get("/api/alerts?handled=0").json()["count"] == 0


def test_mark_handled_records_rep_and_marks_read(rep_client, care_rep, alert):
    res = rep_client.patch(f"/api/alerts/{alert.pk}", {"handled": True}, format="json")
    assert res.status_code == 200
    assert res.json()["handled_by"] == "grace"
    assert res.json()["read_at"] is not None
    assert Notification.objects.get().read_at is not None


def test_patch_requires_a_field(rep_client, alert):
    assert rep_client.patch(f"/api/alerts/{alert.pk}", {}, format="json").status_code == 400


def test_notifications_badge_and_read_flow(rep_client, alert):
    body = rep_client.get("/api/notifications").json()
    assert body["unread_count"] == 1
    assert body["results"][0]["customer_name"] == "Amina Otieno"
    nid = body["results"][0]["id"]
    assert rep_client.post(f"/api/notifications/{nid}/read").status_code == 204
    assert rep_client.get("/api/notifications").json()["unread_count"] == 0


def test_notifications_are_private_to_each_rep(rep_client, alert, django_user_model):
    other = django_user_model.objects.create_user("other", password="pw-12345", is_care_rep=True)
    client = APIClient()
    client.force_login(other)
    # `other` was created after the alert, so has no notification and cannot read grace's.
    assert client.get("/api/notifications").json()["unread_count"] == 0
    nid = Notification.objects.get().pk
    assert client.post(f"/api/notifications/{nid}/read").status_code == 404


def test_read_all(rep_client, alert):
    assert rep_client.post("/api/notifications/read-all").status_code == 204
    assert rep_client.get("/api/notifications").json()["unread_count"] == 0

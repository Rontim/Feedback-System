import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def csrf_client() -> tuple[APIClient, str]:
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/auth/csrf")
    return client, client.cookies["csrftoken"].value


def test_login_requires_csrf_token(care_rep):
    client, _ = csrf_client()
    res = client.post("/api/auth/login", {"username": "grace", "password": "pw-12345"})
    assert res.status_code == 403


def test_login_me_logout_flow(care_rep):
    client, token = csrf_client()
    res = client.post(
        "/api/auth/login",
        {"username": "grace", "password": "pw-12345"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 200
    assert res.json() == {
        "id": care_rep.id,
        "username": "grace",
        "name": "Grace",
        "email": "grace@companyx.test",
    }

    assert client.get("/api/auth/me").json()["username"] == "grace"

    token = client.cookies["csrftoken"].value  # rotates on login
    assert client.post("/api/auth/logout", HTTP_X_CSRFTOKEN=token).status_code == 204
    assert client.get("/api/auth/me").status_code == 403


def test_wrong_password_rejected(care_rep):
    client, token = csrf_client()
    res = client.post(
        "/api/auth/login",
        {"username": "grace", "password": "nope"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 400


def test_non_care_rep_cannot_log_in(care_rep):
    care_rep.is_care_rep = False
    care_rep.save()
    client, token = csrf_client()
    res = client.post(
        "/api/auth/login",
        {"username": "grace", "password": "pw-12345"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 400


def test_superuser_cannot_log_in_as_a_care_rep(django_user_model):
    django_user_model.objects.create_superuser(
        "admin", email="admin@example.com", password="admin-pass-123", is_care_rep=True
    )
    client, token = csrf_client()
    res = client.post(
        "/api/auth/login",
        {"username": "admin", "password": "admin-pass-123"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert res.status_code == 400

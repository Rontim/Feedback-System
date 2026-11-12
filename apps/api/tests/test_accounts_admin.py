import pytest
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from alerts.models import Alert, Notification

pytestmark = pytest.mark.django_db


def test_alerts_are_not_exposed_in_django_admin():
    assert not admin.site.is_registered(Alert)
    assert not admin.site.is_registered(Notification)


def test_admin_can_create_only_care_rep_users(client, django_user_model):
    admin_user = django_user_model.objects.create_superuser(
        "admin", email="admin@example.com", password="admin-pass-123"
    )
    client.force_login(admin_user)
    add_url = reverse("admin:accounts_user_add")

    response = client.get(add_url)
    assert response.status_code == 200
    for field in ("is_care_rep", "is_staff", "is_superuser", "groups", "user_permissions"):
        assert f'name="{field}"' not in response.content.decode()

    response = client.post(
        add_url,
        {
            "username": "new-rep",
            "first_name": "New",
            "last_name": "Rep",
            "email": "new-rep@example.com",
            "phone": "+254700111222",
            "password1": "Strong-rep-password-2026!",
            "password2": "Strong-rep-password-2026!",
        },
    )

    assert response.status_code == 302
    rep = get_user_model().objects.get(username="new-rep")
    assert rep.is_care_rep
    assert not rep.is_staff
    assert not rep.is_superuser


def test_createsu_makes_admin_non_care_rep(monkeypatch, django_user_model):
    monkeypatch.setenv("DJANGO_SUPERUSER_USERNAME", "system-admin")
    monkeypatch.setenv("DJANGO_SUPERUSER_EMAIL", "system-admin@example.com")
    monkeypatch.setenv("DJANGO_SUPERUSER_PASSWORD", "Strong-admin-password-2026!")

    call_command("createsu")

    admin_user = django_user_model.objects.get(username="system-admin")
    assert admin_user.is_superuser
    assert not admin_user.is_care_rep

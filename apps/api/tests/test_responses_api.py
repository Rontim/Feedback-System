from datetime import timedelta

import pytest
from django.utils import timezone

from alerts.models import Alert

from .factories import make_customer, make_response

pytestmark = pytest.mark.django_db


def ids(res):
    return [r["id"] for r in res.json()["results"]]


def test_requires_a_care_rep(client):
    assert client.get("/api/responses").status_code == 403
    assert client.get("/api/responses/1").status_code == 403


def test_list_defaults_to_newest_first_and_paginates(rep_client):
    today = timezone.localdate()
    old = make_response(day=today - timedelta(days=3))
    new = make_response(day=today)
    body = rep_client.get("/api/responses").json()
    assert body["count"] == 2
    assert [r["id"] for r in body["results"]] == [new.id, old.id]


def test_filters_by_category_and_channel_lists(rep_client):
    det = make_response((1, 1, 1), channel="sms")
    pas = make_response((3, 3, 3))
    pro = make_response((5, 5, 5), channel="sms")
    assert set(ids(rep_client.get("/api/responses?category=detractor,passive"))) == {det.id, pas.id}
    assert set(ids(rep_client.get("/api/responses?channel=sms"))) == {det.id, pro.id}
    assert ids(rep_client.get("/api/responses?category=detractor&channel=sms")) == [det.id]


def test_search_matches_name_email_or_phone(rep_client):
    amina = make_response(
        customer=make_customer(name="Amina Otieno", email="a@x.com", phone="+254711000001")
    )
    make_response(customer=make_customer(name="Brian", email="b@x.com", phone="+254722000002"))
    for term in ("amina", "A@X.COM", "0001"):
        assert ids(rep_client.get(f"/api/responses?q={term}")) == [amina.id]


def test_date_range_uses_local_days(rep_client):
    today = timezone.localdate()
    a = make_response(day=today - timedelta(days=5))
    b = make_response(day=today - timedelta(days=2))
    make_response(day=today)
    url = f"/api/responses?from={today - timedelta(days=5)}&to={today - timedelta(days=2)}"
    assert set(ids(rep_client.get(url))) == {a.id, b.id}


def test_ordering_by_mean(rep_client):
    low, high = make_response((1, 1, 2)), make_response((5, 5, 5))
    assert ids(rep_client.get("/api/responses?ordering=mean")) == [low.id, high.id]
    assert ids(rep_client.get("/api/responses?ordering=-mean")) == [high.id, low.id]


@pytest.mark.parametrize(
    "query", ["ordering=customer__password", "from=yesterday", "to=2026-13-40"]
)
def test_bad_params_are_rejected(rep_client, query):
    assert rep_client.get(f"/api/responses?{query}").status_code == 400


def test_detail_has_scores_customer_and_alert(rep_client):
    detractor = make_response((2, 3, 2), comment="Late delivery")
    alert = Alert.objects.create(response=detractor)
    body = rep_client.get(f"/api/responses/{detractor.id}").json()
    assert (body["q_product"], body["q_care"], body["q_happy"]) == (2, 3, 2)
    assert body["customer"]["name"] == detractor.customer.name
    assert body["comment"] == "Late delivery"
    assert body["alert"]["id"] == alert.id

    promoter = make_response((5, 5, 5))
    assert rep_client.get(f"/api/responses/{promoter.id}").json()["alert"] is None


def test_detail_404(rep_client):
    assert rep_client.get("/api/responses/999999").status_code == 404


def test_page_size_is_client_controlled_but_capped(rep_client):
    for _ in range(3):
        make_response()
    assert len(rep_client.get("/api/responses?page_size=2").json()["results"]) == 2
    assert rep_client.get("/api/responses?page_size=2&page=2").json()["results"].__len__() == 1
    assert rep_client.get("/api/responses?page_size=100000").status_code == 200

import pytest
from rest_framework.test import APIClient

from feedback.models import Customer, Response

pytestmark = pytest.mark.django_db

PAYLOAD = {
    "q_product": 2,
    "q_care": 3,
    "q_happy": 2,
    "name": "Amina Otieno",
    "email": "amina@example.com",
    "phone": "+254700111222",
}


def test_post_feedback_scores_and_saves():
    res = APIClient().post("/api/feedback", PAYLOAD, format="json")
    assert res.status_code == 201
    assert res.json()["category"] == "detractor"
    assert res.json()["mean"] == "2.33"
    assert Response.objects.count() == 1


def test_same_phone_reuses_customer():
    client = APIClient()
    client.post("/api/feedback", PAYLOAD, format="json")
    happy = {**PAYLOAD, "q_product": 5, "q_care": 5, "q_happy": 5}
    client.post("/api/feedback", happy, format="json")
    assert Customer.objects.count() == 1
    assert Response.objects.count() == 2


@pytest.mark.parametrize("field,value", [("q_care", 6), ("q_product", 0), ("email", "nope")])
def test_invalid_input_rejected(field, value):
    res = APIClient().post("/api/feedback", {**PAYLOAD, field: value}, format="json")
    assert res.status_code == 400
    assert Response.objects.count() == 0

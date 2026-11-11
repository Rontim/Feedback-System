"""One write path for feedback. Web and (later) SMS both call submit_feedback()."""

from django.db import transaction

from alerts import services as alert_services

from . import scoring
from .models import Customer, Response


@transaction.atomic
def submit_feedback(
    *,
    q_product,
    q_care,
    q_happy,
    phone,
    name="",
    email="",
    customer_type=None,
    channel=Response.Channel.WEB,
    comment="",
) -> Response:
    result = scoring.score(q_product, q_care, q_happy)
    defaults = {"name": name, "email": email}
    if customer_type:
        defaults["type"] = customer_type
    customer, created = Customer.objects.get_or_create(phone=phone, defaults=defaults)
    if not created:  # keep the latest contact details
        for field, value in defaults.items():
            if value:
                setattr(customer, field, value)
        customer.save()
    response = Response.objects.create(
        customer=customer,
        q_product=q_product,
        q_care=q_care,
        q_happy=q_happy,
        score_sum=result.total,
        mean=result.mean,
        category=result.category,
        channel=channel,
        comment=comment,
    )
    if result.category == scoring.DETRACTOR:
        alert_services.raise_alert(response)  # never raises: feedback is already safe
    return response

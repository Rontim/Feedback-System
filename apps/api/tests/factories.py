from datetime import date, datetime, time

from django.utils import timezone

from feedback import scoring
from feedback.models import Customer, Response

_counter = 0


def make_customer(**overrides) -> Customer:
    global _counter
    _counter += 1
    fields = {
        "name": f"Customer {_counter}",
        "email": f"c{_counter}@example.com",
        "phone": f"+2547000{_counter:05d}",
    }
    return Customer.objects.create(**{**fields, **overrides})


def make_response(
    ratings=(4, 4, 4), *, day: date | None = None, hour: int = 12, customer=None, **overrides
) -> Response:
    """Create a response without side effects (no alert) at a given local day/hour."""
    result = scoring.score(*ratings)
    response = Response.objects.create(
        customer=customer or make_customer(),
        q_product=ratings[0],
        q_care=ratings[1],
        q_happy=ratings[2],
        score_sum=result.total,
        mean=result.mean,
        category=result.category,
        **overrides,
    )
    if day is not None:
        when = timezone.make_aware(datetime.combine(day, time(hour, 0)))
        Response.objects.filter(pk=response.pk).update(created_at=when)
        response.refresh_from_db()
    return response

from .emails import _one_line
from .models import Alert

SMS_LIMIT = 160  # one GSM segment


def build_alert_sms(alert: Alert) -> str:
    """Short text for a care rep's phone: who to call and how unhappy they are."""
    response = alert.response
    customer = response.customer
    name = _one_line(customer.name)[:30] or "Customer"
    text = f"[Company X] Detractor {response.mean}/5: {name}, tel {customer.phone}"
    if customer.email:
        text += f", {customer.email}"
    return text[:SMS_LIMIT]

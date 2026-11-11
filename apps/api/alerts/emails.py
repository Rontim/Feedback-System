from django.conf import settings
from django.core.mail import EmailMessage

from .models import Alert

QUESTION_LABELS = (
    ("q_product", "Product experience"),
    ("q_care", "Customer care"),
    ("q_happy", "Happiness with product"),
)


def _one_line(text: str) -> str:
    """Collapse whitespace/newlines so user input can never break an email header."""
    return " ".join(text.split())


def build_alert_email(alert: Alert, recipients: list[str]) -> EmailMessage:
    response = alert.response
    customer = response.customer
    display_name = _one_line(customer.name) or customer.phone

    lines = [
        "A customer gave low feedback and needs a follow-up.",
        "",
        f"Customer: {_one_line(customer.name) or '(no name)'}",
        f"Email:    {customer.email or '(not provided)'}",
        f"Phone:    {customer.phone}",
        f"Type:     {customer.get_type_display()}",
        f"Channel:  {response.channel.upper()}",
        f"Received: {response.created_at:%Y-%m-%d %H:%M} UTC",
        "",
        "Scores (1-5)",
    ]
    lines += [f"  {label}: {getattr(response, field)}" for field, label in QUESTION_LABELS]
    lines.append(f"  Mean: {response.mean}")
    if response.comment.strip():
        lines += ["", "Comment:", response.comment.strip()]
    lines += ["", f"Open in dashboard: {settings.DASHBOARD_URL}?alert={alert.pk}"]

    return EmailMessage(
        subject=f"[Detractor alert] {display_name} scored {response.mean}/5",
        body="\n".join(lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
        # Replying to the alert goes straight to the customer.
        reply_to=[customer.email] if customer.email else None,
    )

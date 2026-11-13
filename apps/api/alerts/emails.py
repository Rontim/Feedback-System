from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import Alert

QUESTION_LABELS = (
    ("q_product", "Product experience"),
    ("q_care", "Customer care"),
    ("q_happy", "Happiness with product"),
)


def _one_line(text: str) -> str:
    """Collapse whitespace/newlines so user input can never break an email header."""
    return " ".join(text.split())


def build_alert_email(alert: Alert, recipients: list[str]) -> EmailMultiAlternatives:
    response = alert.response
    customer = response.customer
    display_name = _one_line(customer.name) or customer.phone
    dashboard_url = f"{settings.DASHBOARD_URL}/alerts?alert={alert.pk}"
    scores = [
        {"label": label, "value": getattr(response, field)} for field, label in QUESTION_LABELS
    ]

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
    lines += [f"  {score['label']}: {score['value']}" for score in scores]
    lines.append(f"  Mean: {response.mean}")
    if response.comment.strip():
        lines += ["", "Comment:", response.comment.strip()]
    lines += ["", f"Open in dashboard: {dashboard_url}"]

    message = EmailMultiAlternatives(
        subject=f"[Detractor alert] {display_name} scored {response.mean}/5",
        body="\n".join(lines),
        from_email=f"Feedback System Alert<{settings.DEFAULT_FROM_EMAIL}>",
        to=recipients,
        # Replying to the alert goes straight to the customer.
        reply_to=[customer.email] if customer.email else None,
    )
    message.attach_alternative(
        render_to_string(
            "alerts/detractor_alert.html",
            {
                "customer_name": _one_line(customer.name) or "(no name)",
                "customer_email": customer.email or "(not provided)",
                "customer_phone": customer.phone,
                "customer_type": customer.get_type_display(),
                "channel": response.channel.upper(),
                "received_at": f"{response.created_at:%Y-%m-%d %H:%M} UTC",
                "scores": scores,
                "mean": response.mean,
                "comment": response.comment.strip(),
                "dashboard_url": dashboard_url,
            },
        ),
        "text/html",
    )
    return message

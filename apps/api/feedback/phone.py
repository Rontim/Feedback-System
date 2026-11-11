"""Phone number normalisation so web and SMS submissions from one person match one Customer."""

import re

from django.conf import settings

_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(raw: str, country_code: str | None = None) -> str:
    """Best-effort E.164: '0700 111 222' -> '+254700111222'. Check the result with is_e164()."""
    cc = country_code or settings.DEFAULT_COUNTRY_CODE
    text = raw.strip()
    digits = re.sub(r"\D", "", text)
    if text.startswith("+"):
        return f"+{digits}"
    if digits.startswith("00"):
        return f"+{digits[2:]}"
    if digits.startswith("0"):
        return f"+{cc}{digits[1:]}"
    if digits.startswith(cc):
        return f"+{digits}"
    return f"+{cc}{digits}"


def is_e164(value: str) -> bool:
    return bool(_E164.match(value))

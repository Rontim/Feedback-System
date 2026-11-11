"""Reading a customer's reply. Accepts '4 5 4', '454', '4,5,4' and '4-5-4'; nothing else."""

import re

_RATINGS = re.compile(r"\s*([1-5])[\s,\-/]*([1-5])[\s,\-/]*([1-5])\s*")
_HELP_WORDS = {"help", "?", "info", "start"}


def parse_ratings(text: str) -> tuple[int, int, int] | None:
    match = _RATINGS.fullmatch(text)
    if match is None:
        return None
    first, second, third = (int(group) for group in match.groups())
    return first, second, third


def is_help_request(text: str) -> bool:
    return text.strip().lower() in _HELP_WORDS

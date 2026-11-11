import pytest

from feedback.phone import is_e164, normalize_phone
from sms.parsing import is_help_request, parse_ratings


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+254700111222", "+254700111222"),
        ("0700 111 222", "+254700111222"),
        ("0700-111-222", "+254700111222"),
        ("254700111222", "+254700111222"),
        ("700111222", "+254700111222"),
        ("00254700111222", "+254700111222"),
        ("+1 (415) 555-0132", "+14155550132"),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


def test_is_e164():
    assert is_e164("+254700111222")
    assert not is_e164("0700111222")
    assert not is_e164("+25")
    assert not is_e164("+0700111222")


@pytest.mark.parametrize(
    "text,expected",
    [
        ("4 5 4", (4, 5, 4)),
        ("454", (4, 5, 4)),
        ("4,5,4", (4, 5, 4)),
        ("4, 5, 4", (4, 5, 4)),
        ("4-5-4", (4, 5, 4)),
        ("  1 1 1  ", (1, 1, 1)),
        ("5\n5\n5", (5, 5, 5)),
    ],
)
def test_parse_valid(text, expected):
    assert parse_ratings(text) == expected


@pytest.mark.parametrize(
    "text",
    ["", "4 5", "4 5 4 3", "0 5 4", "6 5 4", "4 5 9", "4.5 4", "four five four", "4 5 4 thanks",
     "10 5 4", "45", "4 5 40", "\u0664 \u0665 \u0664"],
)  # fmt: skip
def test_parse_rejects_everything_else(text):
    assert parse_ratings(text) is None


@pytest.mark.parametrize(
    "text,expected", [("HELP", True), (" help ", True), ("?", True), ("hi", False)]
)
def test_help_words(text, expected):
    assert is_help_request(text) is expected

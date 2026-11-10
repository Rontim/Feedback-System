"""Scoring rules from the brief. Pure functions, no Django imports.

Classification uses the integer sum, not the float mean, so the "exact 3.00" rule
can never be broken by floating-point error:
    mean < 3  <=>  sum < 9   (detractor)
    mean == 3 <=>  sum == 9  (passive)
    mean > 3  <=>  sum > 9   (promoter)
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

DETRACTOR = "detractor"
PASSIVE = "passive"
PROMOTER = "promoter"
CATEGORIES = (DETRACTOR, PASSIVE, PROMOTER)

MIN_RATING = 1
MAX_RATING = 5
NUM_QUESTIONS = 3
_PASSIVE_SUM = 3 * NUM_QUESTIONS


@dataclass(frozen=True)
class ScoreResult:
    total: int
    mean: Decimal
    category: str


def validate_ratings(ratings) -> None:
    if len(ratings) != NUM_QUESTIONS:
        raise ValueError(f"Expected {NUM_QUESTIONS} ratings, got {len(ratings)}")
    for r in ratings:
        if isinstance(r, bool) or not isinstance(r, int) or not MIN_RATING <= r <= MAX_RATING:
            raise ValueError(f"Ratings must be whole numbers {MIN_RATING}-{MAX_RATING}, got {r!r}")


def classify(total: int) -> str:
    if total < _PASSIVE_SUM:
        return DETRACTOR
    if total == _PASSIVE_SUM:
        return PASSIVE
    return PROMOTER


def score(q_product: int, q_care: int, q_happy: int) -> ScoreResult:
    ratings = (q_product, q_care, q_happy)
    validate_ratings(ratings)
    total = sum(ratings)
    mean = (Decimal(total) / Decimal(NUM_QUESTIONS)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return ScoreResult(total=total, mean=mean, category=classify(total))

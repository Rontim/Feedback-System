from decimal import Decimal

import pytest

from feedback import scoring


def test_brief_example_is_detractor():
    r = scoring.score(2, 3, 2)
    assert r.total == 7
    assert r.mean == Decimal("2.33")
    assert r.category == scoring.DETRACTOR


def test_exact_three_is_passive():
    assert scoring.score(3, 3, 3).category == scoring.PASSIVE
    assert scoring.score(1, 4, 4).category == scoring.PASSIVE  # sum 9, mean 3.00
    assert scoring.score(5, 3, 1).category == scoring.PASSIVE


def test_above_three_is_promoter():
    assert scoring.score(4, 3, 3).category == scoring.PROMOTER
    assert scoring.score(5, 5, 5).mean == Decimal("5.00")


def test_just_below_three_is_detractor():
    assert scoring.score(3, 3, 2).category == scoring.DETRACTOR


@pytest.mark.parametrize("bad", [(0, 3, 3), (6, 3, 3), (3, 3, -1)])
def test_out_of_range_rejected(bad):
    with pytest.raises(ValueError):
        scoring.score(*bad)


@pytest.mark.parametrize("bad", [(3.5, 3, 3), (True, 3, 3), ("4", 3, 3)])
def test_non_integers_rejected(bad):
    with pytest.raises(ValueError):
        scoring.score(*bad)


def test_every_combination_matches_mean_definition():
    for a in range(1, 6):
        for b in range(1, 6):
            for c in range(1, 6):
                mean = (a + b + c) / 3
                if mean < 3:
                    expected = scoring.DETRACTOR
                elif mean == 3:
                    expected = scoring.PASSIVE
                else:
                    expected = scoring.PROMOTER
                assert scoring.score(a, b, c).category == expected

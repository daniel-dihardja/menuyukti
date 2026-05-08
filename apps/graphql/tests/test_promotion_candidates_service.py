"""Unit tests for promotion candidate signals service."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from graphql.services.promotion_candidates import build_promotion_candidates_signals


def test_build_promotion_candidates_signals_handles_none_datetime_signals() -> None:
    run = SimpleNamespace()
    promotion_rows = [
        {
            "menu": "Nasi Goreng",
            "quantity": 10,
            "total_revenue": 250.0,
            "menu_category": "Mains",
            "menu_category_detail": None,
            "category": "star",
            "action": "promote",
            "peak_day": "Friday",
            "peak_hour": 19,
            "contribution_margin_percentage": 41.2,
        }
    ]
    fake_promotion = SimpleNamespace(rows=promotion_rows, items_total_count=1, items_truncated=False)
    instagram_payload = {
        "additional_signals": {
            "datetime_signals": None,
            "matrix_signals": None,
        },
        "fundamental_signals": {"trending_items": []},
    }
    computed = {
        "top_promote": [],
        "top_avoid": [],
        "puzzle_opportunity_pool": [],
        "ranked_candidates": [],
        "ranked_candidates_total_count": 0,
        "best_posting_window": None,
        "best_posting_window_summary": "",
    }

    with (
        patch(
            "graphql.services.promotion_candidates.build_promotion_menu_items",
            return_value=fake_promotion,
        ),
        patch(
            "graphql.services.promotion_candidates.build_instagram_signals",
            return_value=instagram_payload,
        ),
        patch(
            "graphql.services.promotion_candidates.calculate_promotion_candidates",
            return_value=computed,
        ) as mock_calc,
    ):
        out = build_promotion_candidates_signals(session=object(), run=run)  # type: ignore[arg-type]

    assert out is not None
    assert out["best_posting_window"] is None
    assert out["items_total_count"] == 1
    assert out["items_truncated"] is False
    calc_kwargs = mock_calc.call_args.kwargs
    assert calc_kwargs["best_posting_window"] is None

"""Unit tests for campaign schedule planning composition."""

from menuyukti.core.analytics.calculate_campaign_schedule_plan import (
    calculate_campaign_schedule_plan,
)


def test_calculate_campaign_schedule_plan_generates_required_fields() -> None:
    result = calculate_campaign_schedule_plan(
        campaign_start="2026-06-01",
        campaign_end="2026-06-21",
        ranked_candidates=[
            {
                "menu": "Nasi Goreng",
                "recommendation": "promote",
                "score": 82.0,
                "signal_reasons": ["Tagged as content hero"],
            },
            {
                "menu": "Truffle Pasta",
                "recommendation": "test",
                "score": 66.0,
                "signal_reasons": ["Rising trend"],
            },
        ],
        weekly_demand_pattern=[
            {
                "iso_week": "2026-W23",
                "revenue_index": 1.2,
                "tx_index": 1.1,
                "relative_demand": "high",
            },
            {
                "iso_week": "2026-W24",
                "revenue_index": 1.0,
                "tx_index": 1.0,
                "relative_demand": "average",
            },
        ],
        best_posting_window={
            "peak_day": "fri",
            "peak_hour": 19,
            "primary_meal_period": "dinner",
        },
    )

    assert result["campaign_start"] == "2026-06-01"
    assert result["campaign_end"] == "2026-06-21"
    assert result["posts_per_week"] >= 3
    assert len(result["slots"]) >= 1
    slot = result["slots"][0]
    assert set(slot.keys()) == {
        "date_time",
        "post_type",
        "promoted_menu_items",
        "visual_idea",
        "caption_idea",
    }
    assert slot["post_type"] in {"single", "carousel"}
    assert len(slot["promoted_menu_items"]) >= 1


def test_calculate_campaign_schedule_plan_rejects_invalid_window() -> None:
    try:
        calculate_campaign_schedule_plan(
            campaign_start="2026-06-30",
            campaign_end="2026-06-01",
            ranked_candidates=[],
        )
    except ValueError as exc:
        assert "campaign_start must be on or before campaign_end" in str(exc)
        return
    raise AssertionError("Expected ValueError for inverted campaign window")


def test_calculate_campaign_schedule_plan_applies_holiday_hook() -> None:
    result = calculate_campaign_schedule_plan(
        campaign_start="2026-06-17",
        campaign_end="2026-06-17",
        ranked_candidates=[
            {
                "menu": "Nasi Goreng",
                "recommendation": "promote",
                "score": 82.0,
                "signal_reasons": ["Tagged as content hero"],
            }
        ],
        public_holidays=[{"date": "2026-06-17", "name": "Independence Day"}],
    )

    assert len(result["slots"]) == 1
    assert "Holiday hook: Independence Day." in result["slots"][0]["caption_idea"]
    assert "holiday anchors: 1" in result["source_signals_summary"]

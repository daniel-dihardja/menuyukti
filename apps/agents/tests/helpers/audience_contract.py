from __future__ import annotations

from pathlib import Path
import json


EXPECTED_AUDIENCE_OUTPUTS = [
    "top_items",
    "peak_hours",
    "weekday_bias",
    "daypart_demand_distribution",
    "weekday_demand_distribution",
    "audience_intent_clusters",
    "party_size_signal",
    "social_dining_probability",
    "audience_mix_summary",
    "analysis_window",
    "popularity_index_summary",
    "top_item_revenue_share",
    "category_mix",
]


def load_audience_core_input_fixture() -> dict:
    fixture_path = (
        Path(__file__).resolve().parents[1] / "fixtures" / "audience_core_input.json"
    )
    return json.loads(fixture_path.read_text())

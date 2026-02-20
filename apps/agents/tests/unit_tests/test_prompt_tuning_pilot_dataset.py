from __future__ import annotations

import json
from pathlib import Path


DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "eval-fixtures"
    / "prompt-tuning-pilot"
    / "marketer-strategist-caption-dataset-v1.json"
)


def test_pilot_dataset_is_mocked_and_versioned() -> None:
    payload = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    assert payload["dataset_version"] == "pilot-ms-caption-v1"
    assert payload["agent_id"] == "marketer-strategist"
    assert payload["data_policy"] == "mocked-fixtures-only"


def test_pilot_dataset_has_required_case_shapes() -> None:
    payload = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    cases = payload["cases"]
    assert len(cases) >= 3
    case_types = {item["type"] for item in cases}
    assert "normal" in case_types
    assert "edge" in case_types

    for item in cases:
        assert item["case_id"]
        assert set(item["input"]) == {
            "restaurant_name",
            "menu_item",
            "target_audience",
            "tone",
        }
        expected = item["expected_context"]
        assert expected["must_mention_menu_item_exact"] is True
        assert expected["cta_required"] is True
        assert expected["hashtags_min"] == 2
        assert expected["hashtags_max"] == 4

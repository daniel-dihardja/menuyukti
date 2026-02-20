from __future__ import annotations

import json
from pathlib import Path


SCORING_SPEC_PATH = (
    Path(__file__).resolve().parents[2]
    / "pilot"
    / "prompt-tuning"
    / "fixtures"
    / "marketer-strategist-caption-scoring-spec-v1.json"
)


def test_pilot_scoring_spec_is_versioned_and_mocked_only() -> None:
    payload = json.loads(SCORING_SPEC_PATH.read_text(encoding="utf-8"))
    assert payload["scoring_spec_version"] == "pilot-ms-caption-scoring-v1"
    assert payload["agent_id"] == "marketer-strategist"
    assert payload["data_policy"] == "mocked-fixtures-only"
    assert payload["dataset_version"] == "pilot-ms-caption-v1"


def test_pilot_scoring_spec_dimensions_and_policies() -> None:
    payload = json.loads(SCORING_SPEC_PATH.read_text(encoding="utf-8"))
    dimensions = payload["dimensions"]
    assert len(dimensions) == 5
    assert sum(int(item["weight"]) for item in dimensions) == 100

    dimension_types = {item["id"]: item["type"] for item in dimensions}
    assert dimension_types["schema_validity"] == "binary"
    assert dimension_types["menu_item_mention"] == "binary"
    assert dimension_types["premium_tone"] == "rubric"
    assert dimension_types["cta_actionability"] == "rubric"
    assert dimension_types["hashtag_quality"] == "binary"

    thresholds = payload["thresholds"]
    assert thresholds["pass_score"] == 80
    assert "invalid_json" in thresholds["critical_fail_if_any"]
    assert "missing_required_field" in thresholds["critical_fail_if_any"]

    iteration = payload["iteration_policy"]
    assert iteration["max_iterations"] == 5
    assert iteration["freeze_on_pass"] is True

    determinism = payload["determinism_policy"]
    assert determinism["model_id_fixed"] is True
    assert determinism["provider_fixed"] is True
    assert determinism["temperature"] == 0
    assert determinism["top_p"] == 1

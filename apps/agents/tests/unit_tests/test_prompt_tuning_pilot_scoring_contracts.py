from __future__ import annotations

from pathlib import Path

import pytest

from agent.pilot.prompt_tuning import (
    get_iteration_paths,
    load_codex_scoring_matrix,
    load_iteration_artifact_schema,
    validate_score_artifact,
)


def test_codex_scoring_matrix_is_valid() -> None:
    payload = load_codex_scoring_matrix()
    assert payload["scoring_matrix_version"] == "codex-scoring-v1"
    assert payload["thresholds"]["pass_score"] == 80


def test_iteration_artifact_schema_is_valid() -> None:
    payload = load_iteration_artifact_schema()
    assert payload["artifact_schema_version"] == "pilot-iteration-artifacts-v1"
    assert "output.json" in payload["artifacts"]
    assert "score.json" in payload["artifacts"]
    assert "iteration-summary.json" in payload["artifacts"]


def test_get_iteration_paths() -> None:
    paths = get_iteration_paths(run_id="pilot-run-1", iteration=3, base_dir=Path("runs"))
    assert "runs/pilot-run-1/iter-03" in str(paths["base_dir"])
    assert paths["output_path"].name == "output.json"
    assert paths["score_path"].name == "score.json"
    assert paths["summary_path"].name == "iteration-summary.json"


def test_validate_score_artifact() -> None:
    payload = {
        "run_id": "pilot-run-1",
        "iteration": 1,
        "scoring_matrix_version": "codex-scoring-v1",
        "total_score": 82.0,
        "pass_fail": True,
        "dimension_scores": {
            "schema_validity": 20.0,
            "menu_item_mention": 25.0,
            "premium_tone": 20.0,
            "cta_actionability": 20.0,
            "hashtag_quality": 15.0,
        },
        "failed_checks": [],
        "threshold": 80,
        "baseline_delta": 5.0,
        "stop_reason": "pass_threshold_met",
    }
    validated = validate_score_artifact(payload)
    assert validated["pass_fail"] is True


def test_validate_score_artifact_rejects_missing_dimension() -> None:
    payload = {
        "run_id": "pilot-run-1",
        "iteration": 1,
        "scoring_matrix_version": "codex-scoring-v1",
        "total_score": 10.0,
        "pass_fail": False,
        "dimension_scores": {
            "schema_validity": 0.0,
            "menu_item_mention": 0.0,
            "premium_tone": 0.0,
            "cta_actionability": 0.0,
            # missing hashtag_quality intentionally
        },
        "failed_checks": ["missing_required_field"],
        "threshold": 80,
    }
    with pytest.raises(ValueError):
        validate_score_artifact(payload)

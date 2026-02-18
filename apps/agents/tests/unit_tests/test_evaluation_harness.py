from __future__ import annotations

from agent.evaluation_harness import (
    EvaluationHarnessRequest,
    SCENARIOS,
    _evaluate_response,
    run_evaluation_harness,
)


def test_evaluate_response_fails_for_free_form_only_payload() -> None:
    scenario = SCENARIOS[0]
    result = _evaluate_response(scenario, {"message": "hello"})
    assert result["checks"]["required_top_level_fields"] is False
    assert result["checks"]["structured_envelope_only"] is False
    assert result["quality_score"] == 0.0


def test_mock_harness_summary_shape() -> None:
    report = run_evaluation_harness(EvaluationHarnessRequest(mode="mock", agents=["marketer-strategist"]))
    assert report["contract_version"] == "v1"
    assert report["harness_version"] == "ast12-v1"
    assert report["summary"]["total"] == 1
    assert isinstance(report["results"], list)
    assert len(report["results"]) == 1

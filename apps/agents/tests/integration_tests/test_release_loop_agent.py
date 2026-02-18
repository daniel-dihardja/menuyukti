from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_release_loop_advances_when_shadow_and_canary_thresholds_pass() -> None:
    response = client.post(
        "/agents/learning/release-loop/evaluate",
        json={
            "contract_version": "v1",
            "stage": "canary",
            "candidate_policy_version": "as10-v2",
            "baseline_policy_version": "as10-v1",
            "prior_stage_pass": True,
            "metrics": {
                "shadow_quality_score": 0.82,
                "shadow_contract_pass_rate": 0.99,
                "canary_error_rate": 0.01,
                "canary_regression_rate": 0.02,
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["release_decision"]["decision"] == "advance"
    assert body["release_decision"]["rollback_to_policy_version"] is None


def test_release_loop_rolls_back_when_canary_regresses() -> None:
    response = client.post(
        "/agents/learning/release-loop/evaluate",
        json={
            "contract_version": "v1",
            "stage": "canary",
            "candidate_policy_version": "as10-v2",
            "baseline_policy_version": "as10-v1",
            "prior_stage_pass": True,
            "metrics": {
                "shadow_quality_score": 0.82,
                "shadow_contract_pass_rate": 0.99,
                "canary_error_rate": 0.2,
                "canary_regression_rate": 0.16,
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["release_decision"]["decision"] == "rollback"
    assert body["release_decision"]["rollback_to_policy_version"] == "as10-v1"

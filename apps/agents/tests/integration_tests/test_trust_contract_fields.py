from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_phase1_agent_responses_include_trust_contract_fields() -> None:
    strategist = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-16",
            "readiness": "ready",
            "suggestions": [],
        },
    )
    profit = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "cogs_readiness": "ready",
            "candidates": [],
            "combo_signals": [],
        },
    )
    consensus = client.post(
        "/agents/consensus/debate",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "mode": "conservative",
            "candidates": [],
        },
    )
    simulation = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "baseline": {
                "weekly_posts": 4,
                "avg_margin_pct": 0.3,
                "avg_revenue_per_post": 100.0,
            },
            "scenarios": [],
        },
    )

    for response in [strategist, profit, consensus, simulation]:
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body.get("status"), str)
        assert isinstance(body.get("reason_code"), str)
        run = body.get("run")
        assert isinstance(run, dict)
        assert isinstance(run.get("run_id"), str)
        assert isinstance(run.get("model"), str)

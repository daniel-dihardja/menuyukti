from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_blocked_readiness_is_deterministic_across_agent_workflows() -> None:
    strategist = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-18",
            "readiness": "blocked",
            "suggestions": [],
        },
    )
    assert strategist.status_code == 200
    assert strategist.json()["status"] == "blocked"
    assert strategist.json()["reason_code"] == "DATA_READINESS_BLOCKED"

    profit = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "blocked",
            "cogs_readiness": "blocked",
            "candidates": [],
            "combo_signals": [],
        },
    )
    assert profit.status_code == 200
    assert profit.json()["status"] == "blocked"
    assert profit.json()["reason_code"] == "DATA_READINESS_BLOCKED"

    consensus = client.post(
        "/agents/consensus/debate",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "blocked",
            "mode": "conservative",
            "candidates": [],
        },
    )
    assert consensus.status_code == 200
    assert consensus.json()["status"] == "blocked"
    assert consensus.json()["reason_code"] == "DATA_READINESS_BLOCKED"

    simulation = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "blocked",
            "baseline": {
                "weekly_posts": 4,
                "avg_margin_pct": 0.2,
                "avg_revenue_per_post": 100,
            },
            "scenarios": [],
        },
    )
    assert simulation.status_code == 200
    assert simulation.json()["status"] == "blocked"
    assert simulation.json()["reason_code"] == "DATA_READINESS_BLOCKED"

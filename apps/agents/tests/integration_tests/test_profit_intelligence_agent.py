from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_profit_intelligence_returns_action_board_for_ready_context() -> None:
    response = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 20,
            "location_id": 3,
            "readiness": "ready",
            "cogs_readiness": "degraded",
            "candidates": [
                {
                    "menu_item": "Truffle Pasta",
                    "matrix_action": "promote",
                    "margin_pct": 0.41,
                    "units_sold": 120,
                    "revenue": 2450,
                    "impact_score": 0.82,
                    "combo_supported": True,
                    "attribution_delta_revenue": 220,
                }
            ],
            "combo_signals": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["reason_code"] == "ALLOWED"
    assert body["agent_id"] == "menu-profit-intelligence"
    assert len(body["board"]["recommendations"]) == 1
    assert body["board"]["recommendations"][0]["action"] == "bundle"


def test_profit_intelligence_blocks_when_readiness_is_blocked() -> None:
    response = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 20,
            "location_id": 3,
            "readiness": "blocked",
            "cogs_readiness": "blocked",
            "candidates": [
                {
                    "menu_item": "Truffle Pasta",
                    "matrix_action": "promote",
                    "margin_pct": 0.41,
                    "units_sold": 120,
                    "revenue": 2450,
                    "impact_score": 0.82,
                    "combo_supported": True,
                    "attribution_delta_revenue": 220,
                }
            ],
            "combo_signals": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "blocked"
    assert body["reason_code"] == "DATA_READINESS_BLOCKED"
    assert body["board"]["recommendations"] == []

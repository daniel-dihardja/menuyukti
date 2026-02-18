from __future__ import annotations

import copy

import pytest
from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def strategist_payload() -> dict:
    return {
        "contract_version": "v1",
        "analytics_id": 1,
        "location_id": 1,
        "week_start_date": "2026-02-16",
        "readiness": "ready",
        "suggestions": [],
    }


def profit_payload() -> dict:
    return {
        "contract_version": "v1",
        "analytics_id": 1,
        "location_id": 1,
        "readiness": "ready",
        "cogs_readiness": "ready",
        "candidates": [],
        "combo_signals": [],
    }


def consensus_payload() -> dict:
    return {
        "contract_version": "v1",
        "analytics_id": 1,
        "location_id": 1,
        "readiness": "ready",
        "mode": "conservative",
        "candidates": [],
    }


def simulation_payload() -> dict:
    return {
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
    }


def memory_payload() -> dict:
    return {
        "contract_version": "v1",
        "location_id": 1,
        "analytics_id": 1,
        "max_items": 10,
        "events": [],
    }


@pytest.mark.parametrize(
    ("path", "payload_factory"),
    [
        ("/agents/strategist/weekly-plan", strategist_payload),
        ("/agents/profit-intelligence/action-board", profit_payload),
        ("/agents/consensus/debate", consensus_payload),
        ("/agents/simulation/what-if", simulation_payload),
        ("/agents/memory/context", memory_payload),
    ],
)
def test_selected_context_payload_accepts_when_location_and_analytics_present(
    path: str,
    payload_factory,
) -> None:
    response = client.post(path, json=payload_factory())
    assert response.status_code == 200


@pytest.mark.parametrize(
    ("path", "payload_factory", "field_to_remove", "expected_status"),
    [
        ("/agents/strategist/weekly-plan", strategist_payload, "analytics_id", 422),
        ("/agents/strategist/weekly-plan", strategist_payload, "location_id", 422),
        ("/agents/profit-intelligence/action-board", profit_payload, "analytics_id", 422),
        ("/agents/profit-intelligence/action-board", profit_payload, "location_id", 422),
        ("/agents/consensus/debate", consensus_payload, "analytics_id", 422),
        ("/agents/consensus/debate", consensus_payload, "location_id", 422),
        ("/agents/simulation/what-if", simulation_payload, "analytics_id", 422),
        ("/agents/simulation/what-if", simulation_payload, "location_id", 422),
        ("/agents/memory/context", memory_payload, "analytics_id", 200),
        ("/agents/memory/context", memory_payload, "location_id", 422),
    ],
)
def test_selected_context_payload_rejects_when_location_or_analytics_missing(
    path: str,
    payload_factory,
    field_to_remove: str,
    expected_status: int,
) -> None:
    payload = copy.deepcopy(payload_factory())
    payload.pop(field_to_remove, None)
    response = client.post(path, json=payload)
    assert response.status_code == expected_status

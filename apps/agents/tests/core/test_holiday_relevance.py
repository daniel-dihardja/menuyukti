"""Tests for public-holiday relevance scoring (Jev via AI Gateway)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from agents_app.agents.core.holiday_relevance.jev import (
    nouls_to_relevant,
    systemone_evaluate,
)
from agents_app.agents.core.holiday_relevance.models import (
    HolidayInput,
    HolidayRelevanceItem,
)
from agents_app.agents.core.holiday_relevance.score import (
    LocationNotFoundError,
    merge_relevance_by_id,
    score_holiday_relevance,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.server import app
from fastapi.testclient import TestClient


def test_merge_relevance_by_id_defaults_missing_to_false() -> None:
    holidays = [
        HolidayInput(id="A", date="2026-01-01", name="New Year"),
        HolidayInput(id="B", date="2026-05-01", name="Labour Day"),
    ]
    merged = merge_relevance_by_id(holidays, {"A": True})
    assert merged == [
        HolidayRelevanceItem(id="A", date="2026-01-01", name="New Year", relevant=True),
        HolidayRelevanceItem(id="B", date="2026-05-01", name="Labour Day", relevant=False),
    ]


def test_merge_relevance_preserves_input_date_and_name() -> None:
    holidays = [HolidayInput(id="A", date="2026-01-01", name="Canonical Name")]
    merged = merge_relevance_by_id(holidays, {"A": True})
    assert merged[0].date == "2026-01-01"
    assert merged[0].name == "Canonical Name"
    assert merged[0].relevant is True


def test_nouls_to_relevant_threshold() -> None:
    assert nouls_to_relevant({"a": 0.5, "b": 0.49, "c": 0.9}) == {
        "a": True,
        "b": False,
        "c": True,
    }


def test_jev_relevance_state_includes_operator_notes() -> None:
    from agents_app.agents.core.holiday_relevance.prompts import jev_relevance_state

    state = jev_relevance_state(
        location_markdown="## Location basics\n- **Name**: Café",
        holidays=[{"id": "A", "date": "2026-01-01", "name": "New Year"}],
        operator_instructions="  Skip Nyepi.  ",
    )
    assert "Operator relevance notes" in state
    assert "Skip Nyepi." in state


def test_jev_noul_questions_append_operator_notes() -> None:
    from agents_app.agents.core.holiday_relevance.prompts import jev_noul_questions

    questions = jev_noul_questions(
        [{"id": "A", "date": "2026-01-01", "name": "New Year"}],
        operator_instructions="Skip Nyepi",
    )
    assert "Skip Nyepi" in questions["A"]["instructions"]


@pytest.mark.asyncio
async def test_systemone_evaluate_parses_nouls() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    response = MagicMockResponse(
        status_code=200,
        json_data={
            "answers": {
                "A": {"type": "noul", "noul": 0.91},
                "B": {"type": "noul", "noul": 0.12},
            }
        },
    )
    client.post = AsyncMock(return_value=response)

    with patch(
        "agents_app.agents.core.holiday_relevance.jev.gateway_api_key",
        return_value="test-key",
    ):
        nouls = await systemone_evaluate(
            client,
            state="venue",
            questions={
                "A": {"type": "noul", "instructions": "A?"},
                "B": {"type": "noul", "instructions": "B?"},
            },
        )

    assert nouls == {"A": 0.91, "B": 0.12}
    client.post.assert_awaited_once()
    call_kwargs = client.post.await_args
    assert call_kwargs.args[0].endswith("/typesafe/v1/systemone")
    assert call_kwargs.kwargs["json"]["model"] == "typesafe-ai/jev"


@pytest.mark.asyncio
async def test_systemone_evaluate_http_error() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    client.post = AsyncMock(return_value=MagicMockResponse(status_code=502, text="bad gateway"))

    with (
        patch(
            "agents_app.agents.core.holiday_relevance.jev.gateway_api_key",
            return_value="test-key",
        ),
        pytest.raises(LLMInvokeError),
    ):
        await systemone_evaluate(
            client,
            state="venue",
            questions={"A": {"type": "noul", "instructions": "A?"}},
        )


@pytest.mark.asyncio
async def test_score_holiday_relevance_empty_short_circuits() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    result = await score_holiday_relevance(
        client=client,
        user_id="user_1",
        location_id=1,
        holidays=[],
    )
    assert result == []
    client.post.assert_not_called()


@pytest.mark.asyncio
async def test_score_holiday_relevance_missing_location() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    with (
        patch(
            "agents_app.agents.core.holiday_relevance.score.graphql_post",
            new=AsyncMock(return_value={"location": None}),
        ),
        pytest.raises(LocationNotFoundError),
    ):
        await score_holiday_relevance(
            client=client,
            user_id="user_1",
            location_id=99,
            holidays=[HolidayInput(id="A", date="2026-01-01", name="New Year")],
        )


@pytest.mark.asyncio
async def test_score_holiday_relevance_merges_jev_nouls() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    holidays = [
        HolidayInput(id="A", date="2026-01-01", name="New Year"),
        HolidayInput(id="B", date="2026-05-01", name="Labour Day"),
    ]

    with (
        patch(
            "agents_app.agents.core.holiday_relevance.score.graphql_post",
            new=AsyncMock(
                return_value={
                    "location": {
                        "name": "Café Test",
                        "city": "Jakarta",
                        "country": "Indonesia",
                        "openingHours": [],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.holiday_relevance.score.systemone_evaluate",
            new=AsyncMock(return_value={"A": 0.88}),
        ),
        patch(
            "agents_app.agents.core.holiday_relevance.score.record_ai_usage_event",
            new=AsyncMock(),
        ),
    ):
        result = await score_holiday_relevance(
            client=client,
            user_id="user_1",
            location_id=1,
            holidays=holidays,
            reporting_user="user_1",
        )

    assert [r.model_dump() for r in result] == [
        {"id": "A", "date": "2026-01-01", "name": "New Year", "relevant": True},
        {"id": "B", "date": "2026-05-01", "name": "Labour Day", "relevant": False},
    ]


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_relevance_endpoint_requires_user_header(client: TestClient) -> None:
    response = client.post(
        "/playbooks/public-holidays/relevance",
        json={"locationId": 1, "holidays": []},
    )
    assert response.status_code == 401


def test_relevance_endpoint_empty_holidays(client: TestClient) -> None:
    with patch(
        "agents_app.routers.holiday_relevance.score_holiday_relevance",
        new=AsyncMock(return_value=[]),
    ) as mock_score:
        response = client.post(
            "/playbooks/public-holidays/relevance",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={"locationId": 1, "holidays": []},
        )
    assert response.status_code == 200
    assert response.json() == {"holidays": []}
    mock_score.assert_awaited_once()


def test_relevance_endpoint_returns_scored(client: TestClient) -> None:
    scored = [
        HolidayRelevanceItem(id="A", date="2026-01-01", name="New Year", relevant=True),
    ]
    with patch(
        "agents_app.routers.holiday_relevance.score_holiday_relevance",
        new=AsyncMock(return_value=scored),
    ):
        response = client.post(
            "/playbooks/public-holidays/relevance",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 7,
                "holidays": [{"id": "A", "date": "2026-01-01", "name": "New Year"}],
            },
        )
    assert response.status_code == 200
    assert response.json() == {
        "holidays": [
            {"id": "A", "date": "2026-01-01", "name": "New Year", "relevant": True},
        ]
    }


def test_relevance_endpoint_maps_llm_error(client: TestClient) -> None:
    with patch(
        "agents_app.routers.holiday_relevance.score_holiday_relevance",
        new=AsyncMock(side_effect=LLMInvokeError("LLM_UPSTREAM: boom", code="LLM_UPSTREAM")),
    ):
        response = client.post(
            "/playbooks/public-holidays/relevance",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 7,
                "holidays": [{"id": "A", "date": "2026-01-01", "name": "New Year"}],
            },
        )
    assert response.status_code == 502


class MagicMockResponse:
    """Minimal httpx-like response for AsyncMock posts."""

    def __init__(
        self,
        *,
        status_code: int,
        json_data: dict | None = None,
        text: str = "",
    ) -> None:
        self.status_code = status_code
        self._json_data = json_data
        self.text = text or ("" if json_data is None else str(json_data))

    def json(self) -> dict:
        if self._json_data is None:
            raise ValueError("no json")
        return self._json_data

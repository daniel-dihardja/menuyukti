"""Score public-holiday relevance for a location via Jev (AI Gateway)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from agents_app.agents.core.ai_usage_client import record_ai_usage_event
from agents_app.agents.core.holiday_relevance.jev import (
    JEV_MODEL_ID,
    nouls_to_relevant,
    systemone_evaluate,
)
from agents_app.agents.core.holiday_relevance.models import (
    HolidayInput,
    HolidayRelevanceItem,
)
from agents_app.agents.core.holiday_relevance.prompts import (
    jev_noul_questions,
    jev_relevance_state,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.core.location_page_format import format_location_page_markdown
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import LOCATION_QUERY

_logger = logging.getLogger(__name__)


class LocationNotFoundError(LookupError):
    """Raised when the location is missing or not accessible for the user."""


def merge_relevance_by_id(
    holidays: list[HolidayInput],
    relevant_by_id: dict[str, bool],
) -> list[HolidayRelevanceItem]:
    """Map scorer output onto input holidays by id; missing ids default to relevant=false."""
    return [
        HolidayRelevanceItem(
            id=h.id,
            date=h.date,
            name=h.name,
            relevant=bool(relevant_by_id.get(h.id, False)),
        )
        for h in holidays
    ]


def _holiday_payload(holidays: list[HolidayInput]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for h in holidays:
        row: dict[str, Any] = {"id": h.id, "date": h.date, "name": h.name}
        if h.local_name and h.local_name.strip():
            row["localName"] = h.local_name.strip()
        rows.append(row)
    return rows


async def score_holiday_relevance(
    *,
    client: httpx.AsyncClient,
    user_id: str,
    location_id: int,
    holidays: list[HolidayInput],
    reporting_user: str | None = None,
    operator_instructions: str | None = None,
) -> list[HolidayRelevanceItem]:
    """
    Score Instagram-story relevance for each holiday given location context.

    Uses Jev (``typesafe-ai/jev``) via Vercel AI Gateway. Swap seam: keep this
    signature and ``HolidayRelevanceItem`` return type if the provider changes.
    """
    if not holidays:
        return []

    loc_data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id)},
        user_id,
    )
    raw_loc = loc_data.get("location")
    if not isinstance(raw_loc, dict):
        raise LocationNotFoundError("Location not found or access denied")

    location_markdown = format_location_page_markdown(raw_loc)
    payload = _holiday_payload(holidays)
    state = jev_relevance_state(
        location_markdown=location_markdown,
        holidays=payload,
        operator_instructions=operator_instructions,
    )
    questions = jev_noul_questions(payload, operator_instructions=operator_instructions)

    try:
        nouls = await systemone_evaluate(client, state=state, questions=questions)
    except LLMInvokeError:
        raise
    except Exception as exc:
        _logger.exception("holiday_relevance Jev call failed")
        raise LLMInvokeError(
            f"LLM_UPSTREAM: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    relevant_by_id = nouls_to_relevant(nouls)
    merged = merge_relevance_by_id(holidays, relevant_by_id)

    if reporting_user or user_id:
        try:
            await record_ai_usage_event(
                client,
                user_id=reporting_user or user_id,
                provider="ai_gateway",
                feature="holiday_relevance",
                status="succeeded",
                model=JEV_MODEL_ID,
                units=1,
                metadata={
                    "holiday_count": len(holidays),
                    "scorer": "jev",
                    "has_operator_instructions": bool(
                        operator_instructions and operator_instructions.strip()
                    ),
                },
            )
        except Exception:  # noqa: BLE001
            _logger.warning("holiday_relevance usage record failed", exc_info=True)

    return merged

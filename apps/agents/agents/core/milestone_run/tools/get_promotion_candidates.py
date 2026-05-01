"""LangChain tool: menu engineering promotion slices by menu_category (or flat)."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    ANALYTICS_RUNS_QUERY,
    PROMOTION_ENGINEERING_CANDIDATES_QUERY,
)
from langchain_core.tools import BaseTool, tool

_JSON_SEPARATORS = (",", ":")


def make_get_promotion_candidates_tool(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_promotion_candidates() -> str:
        """Return menu engineering matrix slices for promotion picks as JSON.

        Uses GraphQL ``promotionEngineeringCandidates``: one matrix per distinct
        ``order_fact.menu_category`` when present, otherwise a single flat matrix.
        Each slice includes ``matrix``, ``topStars`` (up to 5), and ``topPuzzles`` (up to 5).
        """
        runs_data = await graphql_post(
            client,
            ANALYTICS_RUNS_QUERY,
            {"locationId": location_id, "first": 1},
            user_id,
        )
        runs = runs_data.get("analyticsRuns")
        if not isinstance(runs, list) or not runs:
            return "No analytics run found for this location. Promotion engineering candidates are unavailable."

        run = runs[0]
        run_id = str(run.get("id", "")).strip()
        if not run_id:
            return "No analytics run id resolved. Promotion engineering candidates are unavailable."

        pec_data = await graphql_post(
            client,
            PROMOTION_ENGINEERING_CANDIDATES_QUERY,
            {"locationId": str(location_id), "analyticsRunId": run_id},
            user_id,
        )
        pec = pec_data.get("promotionEngineeringCandidates")
        if pec is None:
            return "Promotion engineering candidates are unavailable for the latest analytics run."

        payload: dict[str, Any] = {
            "analyticsRun": {"id": run.get("id"), "name": run.get("name")},
            "promotionEngineeringCandidates": pec,
        }
        return json.dumps(payload, ensure_ascii=False, separators=_JSON_SEPARATORS)

    return get_promotion_candidates

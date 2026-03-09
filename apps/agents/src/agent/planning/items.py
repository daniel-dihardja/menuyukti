"""Planning node: fetch promotion candidates from the menu engineering matrix."""

import logging
import os
from dataclasses import replace
from typing import Any

import httpx
from langchain_core.runnables import RunnableConfig

from agent.planning.utils import _emit
from agent.state import PlanningState, State

logger = logging.getLogger(__name__)

_MENU_ENGINEERING_MATRIX_QUERY = """
query MenuEngineeringMatrix($analyticsRunId: ID!, $categories: [String!]) {
  analyticsRun(id: $analyticsRunId) {
    menuEngineeringMatrix(categories: $categories) {
      thresholds {
        avgPopularity
        avgContributionMargin
      }
      items {
        menu
        category
        action
        quantity
        totalRevenue
        contributionMargin
        contributionMarginPercentage
        marginPerUnit
        menuCategory
        menuCategoryDetail
      }
    }
  }
}
"""

_PROMOTION_CATEGORIES = ["star", "puzzle"]


async def choose_items(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch star and puzzle items from the menu engineering matrix as promotion candidates."""
    await _emit("choose_items", "running", "Selecting promotion candidates from menu matrix...", config)

    planning = state.planning
    items: list[dict[str, Any]] | None = None

    configurable = config.get("configurable") or {}
    analytics_id = configurable.get("analytics_id")

    if analytics_id is not None:
        try:
            endpoint = os.environ["GRAPHQL_ENDPOINT"]
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    endpoint,
                    json={
                        "query": _MENU_ENGINEERING_MATRIX_QUERY,
                        "variables": {
                            "analyticsRunId": str(analytics_id),
                            "categories": _PROMOTION_CATEGORIES,
                        },
                    },
                )
            res.raise_for_status()
            matrix = (
                res.json()
                .get("data", {})
                .get("analyticsRun", {})
                .get("menuEngineeringMatrix") or {}
            )
            items = matrix.get("items") or None
        except Exception:
            logger.exception(
                "Failed to fetch menu engineering matrix for analytics_id=%s", analytics_id
            )

    item_count = len(items) if items else 0
    await _emit(
        "choose_items",
        "done",
        f"Found {item_count} promotion candidate(s)" if item_count else "No promotion candidates found",
        config,
    )

    updated_planning = (
        replace(planning, promotionItems=items)
        if planning
        else PlanningState(promotionItems=items)
    )
    return {"planning": updated_planning}

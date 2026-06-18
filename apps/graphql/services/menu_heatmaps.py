"""Menu heatmap payloads for GraphQL."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import compute_menu_heatmaps_from_orders
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_fact_rows import facts_to_heatmap_rows
from graphql.services.order_facts import load_order_facts


def build_menu_heatmaps(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
    order_facts: list | None = None,
) -> list[dict[str, Any]]:
    """Return heatmap payload dicts per menu item; empty list when no order data."""
    facts = order_facts if order_facts is not None else load_order_facts(session, run.id, info=info)
    if not facts:
        return []

    return compute_menu_heatmaps_from_orders(facts_to_heatmap_rows(facts))

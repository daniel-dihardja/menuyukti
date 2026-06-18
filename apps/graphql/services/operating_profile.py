"""Operating profile payload for GraphQL."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import compute_operating_profile_from_orders
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_fact_rows import facts_to_operating_profile_rows
from graphql.services.order_facts import load_order_facts


def build_operating_profile(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
    order_facts: list | None = None,
) -> dict[str, Any] | None:
    """Return operating profile result dict, or None if no order data."""
    facts = order_facts if order_facts is not None else load_order_facts(session, run.id, info=info)
    if not facts:
        return None

    return compute_operating_profile_from_orders(facts_to_operating_profile_rows(facts))

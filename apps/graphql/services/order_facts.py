"""Central OrderFact loading with per-request memoization."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import Session

from graphql.context import get_order_facts_cache, record_order_facts_load
from graphql.data_sources import OrderFact


def load_order_facts(
    session: Session,
    analytics_run_id: int,
    info: strawberry.Info | None = None,
) -> list[OrderFact]:
    """Load all order facts for a run, reusing the request cache when ``info`` is set."""
    if info is not None:
        cache = get_order_facts_cache(info)
        cached = cache.get(analytics_run_id)
        if cached is not None:
            return cached

    facts = session.query(OrderFact).where(OrderFact.analytics_run_id == analytics_run_id).all()
    record_order_facts_load(info)

    if info is not None:
        get_order_facts_cache(info)[analytics_run_id] = facts
    return facts

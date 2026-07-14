"""Per-slot menu promotion candidates (DB + domain math)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import strawberry
from menuyukti.core.analytics import compute_slot_menu_candidates
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact
from graphql.services.order_fact_rows import (
    facts_to_combo_timing_rows,
    facts_to_heatmap_rows,
    facts_to_menu_engineering_rows,
)
from graphql.services.order_facts import load_order_facts


@dataclass
class SlotMenuCandidatesData:
    """Structured result before mapping to Strawberry types."""

    reporting_period: str
    matrix_available: bool
    coverage_notes: list[str]
    slots: list[dict[str, Any]]


def _options_to_menuyukti(options: dict[str, Any] | None) -> dict[str, Any] | None:
    if not options:
        return None
    out: dict[str, Any] = {}
    if (value := options.get("max_candidates_per_slot")) is not None:
        out["max_candidates_per_slot"] = int(value)
    if (value := options.get("min_venue_orders_in_slot")) is not None:
        out["min_venue_orders_in_slot"] = int(value)
    if (value := options.get("min_item_qty_in_slot")) is not None:
        out["min_item_qty_in_slot"] = int(value)
    if (value := options.get("include_low_end")) is not None:
        out["include_low_end"] = bool(value)
    if (value := options.get("slots_filter")) is not None:
        out["slots_filter"] = str(value)
    return out or None


def build_slot_menu_candidates(
    session: Session,
    run: AnalyticsRun,
    *,
    order_facts: Sequence[OrderFact] | None = None,
    options: dict[str, Any] | None = None,
    info: strawberry.Info | None = None,
) -> SlotMenuCandidatesData | None:
    """Load facts and COGS, run slot menu candidate math; return None if no rows."""
    rows = (
        list(order_facts)
        if order_facts is not None
        else load_order_facts(session, run.id, info=info)
    )

    if not rows:
        return None

    menu_rows = facts_to_heatmap_rows(rows)
    combo_timing_rows = facts_to_combo_timing_rows(rows)
    matrix_rows = facts_to_menu_engineering_rows(rows)

    cogs_rows = session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run.id).all()
    cogs_by_menu = {r.menu: float(r.cogs) for r in cogs_rows}

    try:
        result = compute_slot_menu_candidates(
            menu_rows,
            combo_timing_rows,
            cogs_by_menu,
            matrix_rows=matrix_rows,
            options=_options_to_menuyukti(options),
        )
    except ValueError:
        return None

    return SlotMenuCandidatesData(
        reporting_period=result["reporting_period"],
        matrix_available=result["matrix_available"],
        coverage_notes=list(result["coverage_notes"]),
        slots=list(result["slots"]),
    )

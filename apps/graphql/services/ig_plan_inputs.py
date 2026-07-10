"""Composite IG Plan read model: location profile + analytics inputs in one OrderFact load."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import strawberry
from menuyukti.core.analytics import compute_slot_demand_profile_from_orders
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources import AnalyticsRun, Location
from graphql.services.menu_engineering import (
    MenuEngineeringMatrixData,
    compute_menu_engineering_matrix,
)
from graphql.services.order_fact_rows import facts_to_combo_timing_rows
from graphql.services.order_facts import load_order_facts
from graphql.services.slot_menu_candidates import SlotMenuCandidatesData, build_slot_menu_candidates

IG_PLAN_INPUTS_VERSION = 1

_DEFAULT_MATRIX_CATEGORIES = ("star", "plow_horse", "puzzle")


@dataclass
class IgPlanInputsOptions:
    matrix_categories: list[str] = field(default_factory=lambda: list(_DEFAULT_MATRIX_CATEGORIES))
    max_candidates_per_slot: int = 5
    include_low_end: bool = False


@dataclass
class IgPlanLocationSnapshot:
    id: int
    name: str
    street: str | None
    city: str | None
    country: str | None
    currency: str | None
    manual_brief_location_id: int
    quick_profile: dict[str, Any]


@dataclass
class IgPlanAnalyticsRunSnapshot:
    id: int
    name: str


@dataclass
class IgPlanInputsData:
    version: int
    location: IgPlanLocationSnapshot
    analytics_run: IgPlanAnalyticsRunSnapshot | None
    slot_demand_profile: list[dict[str, Any]]
    menu_engineering_matrix: MenuEngineeringMatrixData | None
    slot_menu_candidates: SlotMenuCandidatesData | None
    coverage_notes: list[str]


def _filter_matrix_by_categories(
    matrix: MenuEngineeringMatrixData,
    categories: list[str],
) -> MenuEngineeringMatrixData:
    if not categories:
        return matrix
    category_set = set(categories)
    filtered_items = [item for item in matrix.items if item.get("category") in category_set]
    return MenuEngineeringMatrixData(
        thresholds=matrix.thresholds,
        distribution=matrix.distribution,
        items=filtered_items,
    )


def build_ig_plan_inputs(
    session: Session,
    location_id: int,
    options: IgPlanInputsOptions | None = None,
    *,
    info: strawberry.Info | None = None,
) -> IgPlanInputsData | None:
    """Load location profile and latest-run analytics inputs with a shared OrderFact load."""
    opts = options or IgPlanInputsOptions()
    location_row = (
        session.query(Location)
        .options(selectinload(Location.opening_hours))
        .filter(Location.id == location_id)
        .one_or_none()
    )
    if location_row is None:
        return None

    from graphql.schema.queries.location_manual_brief_input import load_manual_brief_type

    manual = load_manual_brief_type(session, location_id)
    quick_profile = manual.quick_profile if isinstance(manual.quick_profile, dict) else {}

    location_snapshot = IgPlanLocationSnapshot(
        id=location_row.id,
        name=location_row.name,
        street=location_row.street,
        city=location_row.city,
        country=location_row.country,
        currency=location_row.currency,
        manual_brief_location_id=manual.location_id,
        quick_profile=quick_profile,
    )

    coverage_notes: list[str] = []
    run = (
        session.query(AnalyticsRun)
        .where(AnalyticsRun.location_id == location_id)
        .order_by(AnalyticsRun.id.desc())
        .first()
    )
    if run is None:
        coverage_notes.append("No analytics run found for this location.")
        return IgPlanInputsData(
            version=IG_PLAN_INPUTS_VERSION,
            location=location_snapshot,
            analytics_run=None,
            slot_demand_profile=[],
            menu_engineering_matrix=None,
            slot_menu_candidates=None,
            coverage_notes=coverage_notes,
        )

    facts = load_order_facts(session, run.id, info=info)
    if not facts:
        coverage_notes.append("Latest analytics run has no order facts.")
        return IgPlanInputsData(
            version=IG_PLAN_INPUTS_VERSION,
            location=location_snapshot,
            analytics_run=IgPlanAnalyticsRunSnapshot(id=run.id, name=run.name),
            slot_demand_profile=[],
            menu_engineering_matrix=None,
            slot_menu_candidates=None,
            coverage_notes=coverage_notes,
        )

    combo_timing_rows = facts_to_combo_timing_rows(facts)
    slot_demand_profile = compute_slot_demand_profile_from_orders(combo_timing_rows)

    matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts, info=info)
    if matrix_data is None:
        coverage_notes.append(
            "Menu engineering matrix unavailable (COGS must be set on the analytics run)."
        )
        filtered_matrix = None
    else:
        filtered_matrix = _filter_matrix_by_categories(matrix_data, opts.matrix_categories)

    candidate_options: dict[str, Any] = {
        "max_candidates_per_slot": opts.max_candidates_per_slot,
        "include_low_end": opts.include_low_end,
    }
    slot_candidates = build_slot_menu_candidates(
        session,
        run,
        order_facts=facts,
        options=candidate_options,
        info=info,
    )
    if slot_candidates is None:
        coverage_notes.append("Slot menu promotion candidates unavailable for this run.")

    return IgPlanInputsData(
        version=IG_PLAN_INPUTS_VERSION,
        location=location_snapshot,
        analytics_run=IgPlanAnalyticsRunSnapshot(id=run.id, name=run.name),
        slot_demand_profile=list(slot_demand_profile),
        menu_engineering_matrix=filtered_matrix,
        slot_menu_candidates=slot_candidates,
        coverage_notes=coverage_notes,
    )

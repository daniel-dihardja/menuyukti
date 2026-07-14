"""Map slot menu candidates service data to Strawberry types."""

from __future__ import annotations

from typing import Any

from graphql.schema.types.slot_menu_candidates import (
    SlotMenuCandidateItemType,
    SlotMenuCandidatesCellType,
    SlotMenuCandidatesType,
)
from graphql.services.slot_menu_candidates import SlotMenuCandidatesData


def _candidate_to_gql(item: dict[str, Any]) -> SlotMenuCandidateItemType:
    return SlotMenuCandidateItemType(
        menu=item["menu"],
        globalCategory=item.get("global_category"),
        globalAction=item.get("global_action"),
        slotQuantity=int(item["slot_quantity"]),
        slotShare=float(item["slot_share"]),
        slotAffinity=float(item["slot_affinity"]),
        slotRevenue=item.get("slot_revenue"),
        contributionMargin=item.get("contribution_margin"),
        contributionMarginPercentage=item.get("contribution_margin_percentage"),
        menuCategory=item.get("menu_category"),
        menuCategoryDetail=item.get("menu_category_detail"),
        rank=int(item["rank"]),
        score=float(item["score"]),
        recommendedUse=item["recommended_use"],
    )


def _cell_to_gql(cell: dict[str, Any]) -> SlotMenuCandidatesCellType:
    return SlotMenuCandidatesCellType(
        day=cell["day"],
        mealPeriod=cell["meal_period"],
        mealPeriodLabel=cell["meal_period_label"],
        mealPeriodHoursLabel=cell["meal_period_hours_label"],
        orderCount=int(cell["order_count"]),
        demandIndex=float(cell["demand_index"]),
        relativeDemand=cell["relative_demand"],
        posture=cell["posture"],
        recommendedCategories=list(cell["recommended_categories"]),
        totalItemQuantity=int(cell["total_item_quantity"]),
        insufficientData=bool(cell["insufficient_data"]),
        candidates=[_candidate_to_gql(c) for c in cell.get("candidates", [])],
    )


def slot_menu_candidates_data_to_gql(
    data: SlotMenuCandidatesData,
) -> SlotMenuCandidatesType:
    return SlotMenuCandidatesType(
        reportingPeriod=data.reporting_period,
        matrixAvailable=data.matrix_available,
        coverageNotes=list(data.coverage_notes),
        slots=[_cell_to_gql(cell) for cell in data.slots],
    )

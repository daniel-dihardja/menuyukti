"""Map instagram signals service payloads to Strawberry types."""

from __future__ import annotations

from typing import Any

import strawberry
from graphql.schema.types.instagram_signals import (
    AdditionalSignalsType,
    BestPostingWindowType,
    CampaignBriefSignalCapabilitiesType,
    CampaignPlanningSignalsType,
    CategoryFocusType,
    DatetimeSignalsType,
    FundamentalSalesSignalsType,
    FundamentalSignalsType,
    InstagramSignalsType,
    MatrixSignalItemType,
    MatrixSignalsType,
    OrderSignalsType,
    PeriodHeadlineType,
    SignalConfidenceType,
    TrendingItemType,
)


def _matrix_item(raw: dict) -> MatrixSignalItemType:
    return MatrixSignalItemType(
        menu=str(raw["menu"]),
        matrix_category=str(raw["matrix_category"]),
        total_revenue=float(raw["total_revenue"]),
        menu_category=raw.get("menu_category")
        if isinstance(raw.get("menu_category"), str)
        else None,
        menu_category_detail=(
            raw.get("menu_category_detail")
            if isinstance(raw.get("menu_category_detail"), str)
            else None
        ),
    )


def _trending_item(raw: dict) -> TrendingItemType:
    return TrendingItemType(
        menu=str(raw["menu"]),
        current_revenue=float(raw["current_revenue"]),
        previous_revenue=float(raw["previous_revenue"]),
        change_pct=float(raw["pct_change"]) if raw.get("pct_change") is not None else None,
        rank_current=int(raw["current_rank"]),
        rank_previous=int(raw["previous_rank"]),
        trend_label=str(raw["trend_label"]),
    )


def _category_focus(raw: dict | None) -> CategoryFocusType | None:
    if raw is None:
        return None
    qty_key = "qty_share" if "qty_share" in raw else "quantity_share"
    return CategoryFocusType(
        category=str(raw["category"]) if raw.get("category") is not None else None,
        revenue_share=float(raw["revenue_share"]),
        quantity_share=float(raw[qty_key]),
    )


def instagram_signals_raw_to_gql(run_id: int, raw: dict[str, Any]) -> InstagramSignalsType:
    """Map build_instagram_signals dict to GraphQL types."""
    caps = raw.get("capabilities") or {}
    fundamental = raw.get("fundamental_signals") or {}
    sales_raw = fundamental.get("sales") if isinstance(fundamental, dict) else None
    sales: dict[str, Any] = sales_raw if isinstance(sales_raw, dict) else {}
    trending = fundamental.get("trending_items", []) if isinstance(fundamental, dict) else []
    additional = raw.get("additional_signals") or {}
    order_signals = additional.get("order_signals") if isinstance(additional, dict) else None
    dt_signals = additional.get("datetime_signals") if isinstance(additional, dict) else None
    matrix = additional.get("matrix_signals") if isinstance(additional, dict) else {}
    planning = additional.get("campaign_planning_signals") if isinstance(additional, dict) else {}
    confidence = additional.get("signal_confidence") if isinstance(additional, dict) else {}
    cat = fundamental.get("category_focus") if isinstance(fundamental, dict) else None

    return InstagramSignalsType(
        analytics_run_id=strawberry.ID(str(run_id)),
        capabilities=CampaignBriefSignalCapabilitiesType(
            has_order_id=bool(caps.get("has_order_id")),
            has_datetime=bool(caps.get("has_datetime")),
            enabled_blocks=[str(x) for x in caps.get("enabled_blocks", [])],
        ),
        fundamental_signals=FundamentalSignalsType(
            sales=FundamentalSalesSignalsType(
                total_items_sold=int(sales.get("total_items_sold") or 0),
                total_revenue=float(sales.get("total_revenue") or 0.0),
                unique_menu_items=int(sales.get("unique_menu_items") or 0),
                avg_item_price=float(sales.get("avg_item_price") or 0.0),
                avg_popularity_threshold=float(sales.get("avg_popularity_threshold") or 0.0),
            ),
            category_focus=_category_focus(cat),
            trending_items=[_trending_item(x) for x in trending],
        ),
        additional_signals=AdditionalSignalsType(
            order_signals=(
                OrderSignalsType(
                    total_orders=int(order_signals.get("total_orders") or 0),
                    avg_order_revenue=float(order_signals.get("avg_order_revenue") or 0.0),
                    max_order_revenue=float(order_signals.get("max_order_revenue") or 0.0),
                    min_order_revenue=float(order_signals.get("min_order_revenue") or 0.0),
                    avg_order_items=float(order_signals.get("avg_order_items") or 0.0),
                    max_order_items=int(order_signals.get("max_order_items") or 0),
                    min_order_items=int(order_signals.get("min_order_items") or 0),
                )
                if isinstance(order_signals, dict)
                else None
            ),
            datetime_signals=(
                DatetimeSignalsType(
                    best_posting_window=BestPostingWindowType(
                        peak_day=dt_signals.get("best_posting_window", {}).get("peak_day"),
                        peak_revenue_day=dt_signals.get("best_posting_window", {}).get(
                            "peak_revenue_day"
                        ),
                        primary_meal_period=dt_signals.get("best_posting_window", {}).get(
                            "primary_meal_period"
                        ),
                        peak_revenue_meal_period=dt_signals.get("best_posting_window", {}).get(
                            "peak_revenue_meal_period"
                        ),
                        peak_hour=dt_signals.get("best_posting_window", {}).get("peak_hour"),
                    ),
                    period_headline=PeriodHeadlineType(
                        period_start=str(
                            dt_signals.get("period_headline", {}).get("period_start") or ""
                        ),
                        period_end=str(
                            dt_signals.get("period_headline", {}).get("period_end") or ""
                        ),
                        total_revenue=float(
                            dt_signals.get("period_headline", {}).get("total_revenue") or 0.0
                        ),
                        previous_period_total_revenue=float(
                            dt_signals.get("period_headline", {}).get(
                                "previous_period_total_revenue"
                            )
                            or 0.0
                        ),
                        revenue_vs_previous_pct=dt_signals.get("period_headline", {}).get(
                            "revenue_vs_previous_pct"
                        ),
                    ),
                )
                if isinstance(dt_signals, dict)
                else None
            ),
            matrix_signals=MatrixSignalsType(
                content_heroes=[
                    _matrix_item(x)
                    for x in (matrix.get("content_heroes", []) if isinstance(matrix, dict) else [])
                ],
                avoid_items=[
                    _matrix_item(x)
                    for x in (matrix.get("avoid_items", []) if isinstance(matrix, dict) else [])
                ],
            ),
            campaign_planning_signals=CampaignPlanningSignalsType(
                recommended_posting_days=[
                    str(x)
                    for x in (
                        planning.get("recommended_posting_days", [])
                        if isinstance(planning, dict)
                        else []
                    )
                ],
                recommended_dayparts=[
                    str(x)
                    for x in (
                        planning.get("recommended_dayparts", [])
                        if isinstance(planning, dict)
                        else []
                    )
                ],
                objective_recommendation=(
                    str(planning.get("objective_recommendation") or "awareness")
                    if isinstance(planning, dict)
                    else "awareness"
                ),
                primary_cta_channel=(
                    str(planning.get("primary_cta_channel") or "profile_visit")
                    if isinstance(planning, dict)
                    else "profile_visit"
                ),
            ),
            signal_confidence=SignalConfidenceType(
                tier=(
                    str(confidence.get("tier") or "low") if isinstance(confidence, dict) else "low"
                ),
                coverage_notes=[
                    str(x)
                    for x in (
                        confidence.get("coverage_notes", []) if isinstance(confidence, dict) else []
                    )
                ],
            ),
        ),
    )

"""Build campaign schedule plan payloads for Scheduler milestone consumers."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import calculate_campaign_schedule_plan
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, Node
from graphql.schema.node_handlers.milestone import _milestone_sort_key
from graphql.services.instagram_signals import build_instagram_signals
from graphql.services.promotion_candidates import build_promotion_candidates_signals
from graphql.services.weekly_demand_pattern import build_weekly_demand_pattern


def _resolve_campaign_window(
    session: Session,
    *,
    workflow_id: int,
    milestone_id: int,
    location_id: int,
) -> tuple[str, str] | None:
    milestones = (
        session.query(Node)
        .filter(
            Node.parent_id == workflow_id,
            Node.node_type == "milestone",
            Node.location_id == location_id,
        )
        .order_by(Node.created_at.asc())
        .all()
    )
    if not milestones:
        return None

    ordered = sorted(milestones, key=_milestone_sort_key)
    try:
        current_idx = [m.id for m in ordered].index(milestone_id)
    except ValueError:
        return None
    if current_idx <= 0:
        return None

    dates_milestone: Node | None = None
    for row in reversed(ordered[:current_idx]):
        payload = row.data if isinstance(row.data, dict) else {}
        if payload.get("presetId") == "dates":
            dates_milestone = row
            break
    if dates_milestone is None:
        return None

    data_node = (
        session.query(Node)
        .filter(
            Node.parent_id == dates_milestone.id,
            Node.node_type == "milestonedata",
        )
        .order_by(Node.id.asc())
        .first()
    )
    if data_node is None or not isinstance(data_node.data, dict):
        return None
    raw_data = data_node.data.get("data")
    if not isinstance(raw_data, dict):
        return None
    start = raw_data.get("startDate")
    end = raw_data.get("endDate")
    if not isinstance(start, str) or not isinstance(end, str):
        return None
    start = start.strip()
    end = end.strip()
    if not start or not end:
        return None
    return start, end


def build_campaign_schedule_plan(
    session: Session,
    *,
    run: AnalyticsRun,
    workflow_id: int,
    milestone_id: int,
    location_id: int,
) -> dict[str, Any] | None:
    """Return a schedule plan built from dates milestone + analytics signals."""
    campaign_window = _resolve_campaign_window(
        session,
        workflow_id=workflow_id,
        milestone_id=milestone_id,
        location_id=location_id,
    )
    if campaign_window is None:
        return None
    campaign_start, campaign_end = campaign_window

    promotion = build_promotion_candidates_signals(session, run) or {}
    instagram = build_instagram_signals(session, run) or {}
    weekly_rows = build_weekly_demand_pattern(session, run)

    ranked = promotion.get("ranked_candidates")
    if not isinstance(ranked, list):
        ranked = []
    posting = promotion.get("best_posting_window")
    if not isinstance(posting, dict):
        fallback_posting = instagram.get("best_posting_window")
        posting = fallback_posting if isinstance(fallback_posting, dict) else None

    computed = calculate_campaign_schedule_plan(
        campaign_start=campaign_start,
        campaign_end=campaign_end,
        ranked_candidates=[
            {
                "menu": str(row.get("menu") or ""),
                "recommendation": str(row.get("recommendation") or ""),
                "score": float(row.get("score") or 0.0),
                "signal_reasons": [str(x) for x in (row.get("signal_reasons") or [])],
            }
            for row in ranked
            if isinstance(row, dict)
        ],
        weekly_demand_pattern=[
            {
                "iso_week": str(row.get("iso_week") or ""),
                "revenue_index": float(row.get("revenue_index") or 0.0),
                "tx_index": float(row.get("tx_index") or 0.0),
                "relative_demand": str(row.get("relative_demand") or "average"),
            }
            for row in weekly_rows
            if isinstance(row, dict)
        ],
        best_posting_window=(
            {
                "peak_day": posting.get("peak_day")
                if isinstance(posting.get("peak_day"), str)
                else None,
                "peak_hour": posting.get("peak_hour")
                if isinstance(posting.get("peak_hour"), int)
                else None,
                "primary_meal_period": posting.get("primary_meal_period")
                if isinstance(posting.get("primary_meal_period"), str)
                else None,
            }
            if isinstance(posting, dict)
            else None
        ),
    )

    return {
        "analytics_run_id": str(run.id),
        "campaign_start": computed["campaign_start"],
        "campaign_end": computed["campaign_end"],
        "timezone": computed["timezone"],
        "posts_per_week": computed["posts_per_week"],
        "slots": computed["slots"],
        "source_signals_summary": computed["source_signals_summary"],
    }

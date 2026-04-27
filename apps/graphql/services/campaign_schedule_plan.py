"""Build campaign schedule plan payloads for Scheduler milestone consumers."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import calculate_campaign_schedule_plan
from menuyukti.core.analytics.calculate_operating_profile import (
    compute_operating_profile_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, Node, OrderFact
from graphql.schema.node_handlers.milestone import _milestone_sort_key
from graphql.services.instagram_signals import build_instagram_signals
from graphql.services.order_fact_rows import facts_to_operating_profile_rows
from graphql.services.promotion_candidates import build_promotion_candidates_signals
from graphql.services.weekly_demand_pattern import build_weekly_demand_pattern

_DAY_TO_INDEX = {
    "mon": 0,
    "monday": 0,
    "tue": 1,
    "tues": 1,
    "tuesday": 1,
    "wed": 2,
    "wednesday": 2,
    "thu": 3,
    "thurs": 3,
    "thursday": 3,
    "fri": 4,
    "friday": 4,
    "sat": 5,
    "saturday": 5,
    "sun": 6,
    "sunday": 6,
}


def _resolve_allowed_weekdays(session: Session, run: AnalyticsRun) -> set[int] | None:
    facts = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()
    if not facts:
        return None

    op_rows = facts_to_operating_profile_rows(facts)
    operating_profile = compute_operating_profile_from_orders(op_rows)
    if operating_profile is None:
        return None

    day_rows = operating_profile.get("day_of_week_breakdown")
    if isinstance(day_rows, list):
        allowed_days = {
            _DAY_TO_INDEX[day_name]
            for row in day_rows
            if isinstance(row, dict)
            and int(row.get("order_count") or 0) > 0
            and isinstance((day_name := str(row.get("day") or "").strip().lower()), str)
            and day_name in _DAY_TO_INDEX
        }
        if allowed_days:
            return allowed_days

    weekday_share = operating_profile.get("weekday_share")
    weekend_share = operating_profile.get("weekend_share")
    if isinstance(weekday_share, float) and isinstance(weekend_share, float):
        if weekday_share > 0 and weekend_share == 0:
            return {0, 1, 2, 3, 4}
        if weekend_share > 0 and weekday_share == 0:
            return {5, 6}

    return None


def _resolve_campaign_window(
    session: Session,
    *,
    workflow_id: int,
    milestone_id: int,
    location_id: int,
) -> tuple[str, str, list[dict[str, str]]] | None:
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
    holidays_raw = raw_data.get("publicHolidays")
    holidays: list[dict[str, str]] = []
    if isinstance(holidays_raw, list):
        for row in holidays_raw:
            if not isinstance(row, dict):
                continue
            date = row.get("date")
            name = row.get("name")
            if isinstance(date, str) and date.strip():
                holidays.append(
                    {
                        "date": date.strip(),
                        "name": str(name).strip() if isinstance(name, str) else "",
                    }
                )
    return start, end, holidays


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
    campaign_start, campaign_end, public_holidays = campaign_window

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
    allowed_weekdays = _resolve_allowed_weekdays(session, run)

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
        public_holidays=public_holidays,
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
        allowed_weekdays=allowed_weekdays,
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

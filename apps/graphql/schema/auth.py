"""Authorization helpers: tenant data is rooted at Location.clerk_user_id."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, Campaign, Location


def user_id_from_info(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""


def is_location_owner(session: Session, location_id: int, user_id: str) -> bool:
    if not user_id:
        return False
    loc = (
        session.query(Location)
        .filter(Location.id == location_id, Location.clerk_user_id == user_id)
        .first()
    )
    return loc is not None


def require_location_owner(session: Session, location_id: int, user_id: str) -> None:
    if not is_location_owner(session, location_id, user_id):
        raise PermissionError("Access denied")


def get_analytics_run_if_owner(
    session: Session, analytics_run_id: int, user_id: str
) -> AnalyticsRun | None:
    if not user_id:
        return None
    run = session.get(AnalyticsRun, analytics_run_id)
    if run is None:
        return None
    if not is_location_owner(session, run.location_id, user_id):
        return None
    return run


def get_campaign_if_owner(
    session: Session, campaign_id: int, user_id: str
) -> Campaign | None:
    if not user_id:
        return None
    camp = session.get(Campaign, campaign_id)
    if camp is None:
        return None
    if not is_location_owner(session, camp.location_id, user_id):
        return None
    return camp

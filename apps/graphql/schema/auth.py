"""Authorization helpers: tenant data is rooted at Workspace membership."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, Location, WorkspaceMembership


def user_id_from_info(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""


def is_workspace_member(session: Session, workspace_id: int, user_id: str) -> bool:
    if not user_id:
        return False
    row = (
        session.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.clerk_user_id == user_id,
        )
        .first()
    )
    return row is not None


def is_workspace_owner_role(session: Session, workspace_id: int, user_id: str) -> bool:
    """True if user has owner membership on the workspace."""
    if not user_id:
        return False
    row = (
        session.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.clerk_user_id == user_id,
            WorkspaceMembership.role == "owner",
        )
        .first()
    )
    return row is not None


def is_location_owner(session: Session, location_id: int, user_id: str) -> bool:
    if not user_id:
        return False
    loc = session.get(Location, location_id)
    if loc is None:
        return False
    if loc.workspace_id is None:
        return loc.clerk_user_id == user_id
    return is_workspace_member(session, loc.workspace_id, user_id)


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

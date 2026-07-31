"""Data access authorization (workspace and location ownership).

Team / workspace permission contract (v1)
----------------------------------------
- **member** (and **owner** membership): full access to workspace-scoped data —
  locations, analytics, workflows, Instagram items, posts, styles, and media.
  ``is_location_owner`` treats any workspace member as authorized for that location.
- **owner** role only: invite and remove teammates
  (``user_can_manage_workspace_members``).

Later restriction (viewer/editor, per-location ACL) should extend
``user_can_access_workspace`` / capability helpers here rather than scattering
role checks across resolvers.
"""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import Session

from graphql.context import get_location_owner_cache, get_run_access_cache
from graphql.data_sources import AnalyticsRun, Location, WorkspaceMembership


def _is_location_owner_uncached(session: Session, location_id: int, user_id: str) -> bool:
    if not user_id:
        return False
    loc = session.get(Location, location_id)
    if loc is None:
        return False
    if loc.workspace_id is None:
        return loc.clerk_user_id == user_id
    return is_workspace_member(session, loc.workspace_id, user_id)


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


def user_can_access_workspace(session: Session, workspace_id: int, user_id: str) -> bool:
    """True if the user may access workspace-scoped data (v1: any membership)."""
    return is_workspace_member(session, workspace_id, user_id)


def user_can_manage_workspace_members(session: Session, workspace_id: int, user_id: str) -> bool:
    """True if the user may invite/remove teammates (v1: owner role only)."""
    return is_workspace_owner_role(session, workspace_id, user_id)


def is_location_owner(
    session: Session,
    location_id: int,
    user_id: str,
    info: strawberry.Info | None = None,
) -> bool:
    if info is not None:
        cache = get_location_owner_cache(info)
        key = (location_id, user_id)
        if key in cache:
            return cache[key]
        result = _is_location_owner_uncached(session, location_id, user_id)
        cache[key] = result
        return result
    return _is_location_owner_uncached(session, location_id, user_id)


def require_location_owner(
    session: Session,
    location_id: int,
    user_id: str,
    info: strawberry.Info | None = None,
) -> None:
    if not is_location_owner(session, location_id, user_id, info=info):
        raise PermissionError("Access denied")


def get_analytics_run_if_owner(
    session: Session,
    analytics_run_id: int,
    user_id: str,
    info: strawberry.Info | None = None,
    *,
    location_id: int | None = None,
) -> AnalyticsRun | None:
    if not user_id:
        return None
    if info is not None:
        cache = get_run_access_cache(info)
        if analytics_run_id in cache:
            run = cache[analytics_run_id]
            if run is None:
                return None
            if location_id is not None and run.location_id != location_id:
                return None
            return run
    run = session.get(AnalyticsRun, analytics_run_id)
    if run is None:
        if info is not None:
            get_run_access_cache(info)[analytics_run_id] = None
        return None
    if not is_location_owner(session, run.location_id, user_id, info=info):
        if info is not None:
            get_run_access_cache(info)[analytics_run_id] = None
        return None
    if info is not None:
        get_run_access_cache(info)[analytics_run_id] = run
    if location_id is not None and run.location_id != location_id:
        return None
    return run

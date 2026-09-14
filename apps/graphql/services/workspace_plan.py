"""Workspace product plan helpers (free vs pro)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Location, Workspace

WORKSPACE_PLAN_FREE = "free"
WORKSPACE_PLAN_PRO = "pro"
KNOWN_WORKSPACE_PLANS = frozenset({WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO})
FREE_MAX_LOCATIONS = 1


def normalize_workspace_plan(plan: str | None) -> str:
    value = (plan or WORKSPACE_PLAN_FREE).strip().lower()
    if value not in KNOWN_WORKSPACE_PLANS:
        raise ValueError(f"Invalid workspace plan: {plan!r}. Expected free or pro.")
    return value


def is_pro_plan(plan: str | None) -> bool:
    return normalize_workspace_plan(plan) == WORKSPACE_PLAN_PRO


def assert_can_create_location(session: Session, workspace_id: int) -> None:
    """Raise ValueError when a free workspace already has its location quota."""
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise ValueError("Workspace not found")
    if is_pro_plan(ws.plan):
        return
    count = session.query(Location).filter(Location.workspace_id == workspace_id).count()
    if count >= FREE_MAX_LOCATIONS:
        raise ValueError("Free plan allows one location. Upgrade to Pro to add more.")

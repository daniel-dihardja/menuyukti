"""Workspace product plan helpers (free vs pro).

Menuyukti is a creative agency for restaurants, cafés, and bars.

- free: guest / customer accounts (mainly PWA). No operator product surface;
  location creation is blocked.
- pro: restaurant-owner clients (agency-provisioned). Full operator surface,
  including unlimited locations.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Workspace

WORKSPACE_PLAN_FREE = "free"
WORKSPACE_PLAN_PRO = "pro"
KNOWN_WORKSPACE_PLANS = frozenset({WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO})


def normalize_workspace_plan(plan: str | None) -> str:
    value = (plan or WORKSPACE_PLAN_FREE).strip().lower()
    if value not in KNOWN_WORKSPACE_PLANS:
        raise ValueError(f"Invalid workspace plan: {plan!r}. Expected free or pro.")
    return value


def is_pro_plan(plan: str | None) -> bool:
    return normalize_workspace_plan(plan) == WORKSPACE_PLAN_PRO


def assert_can_create_location(session: Session, workspace_id: int) -> None:
    """Raise ValueError when a free (guest) workspace tries to create a location."""
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise ValueError("Workspace not found")
    if is_pro_plan(ws.plan):
        return
    raise ValueError(
        "Free (guest) plan cannot create locations. Upgrade to Pro for operator access."
    )

"""Workspace product plan helpers.

Menuyukti is a creative agency for restaurants, cafés, and bars.

Authenticated users share one product surface. `workspace.plan` (free/pro) remains
a staff-provisioning field but does not gate location creation or operator APIs.
Self-serve default workspaces use ensureMyWorkspace; createWorkspace stays disabled.
Staff may still use provisionWorkspace for custom agency setups.
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
    """Ensure the workspace exists. Plan no longer blocks location creation."""
    ws = session.get(Workspace, workspace_id)
    if ws is None:
        raise ValueError("Workspace not found")

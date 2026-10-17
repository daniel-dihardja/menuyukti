"""Idempotent default workspace for authenticated users."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from graphql.data_sources import Workspace, WorkspaceMembership
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.services.workspace_scope import primary_membership_for_user

DEFAULT_WORKSPACE_NAME = "My workspace"


def ensure_workspace_for_user(session: Session, clerk_user_id: str) -> Workspace:
    """
    Return the user's primary workspace, creating one if missing.

    Concurrent ensure: after create, re-read primary membership and prefer that
    workspace if another request won the race.
    """
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        raise ValueError("clerk_user_id is required")

    mem = primary_membership_for_user(session, user_id)
    if mem is not None:
        ws = session.get(Workspace, mem.workspace_id)
        if ws is not None:
            return ws

    now = datetime.now(tz=UTC)
    ws = Workspace(
        name=DEFAULT_WORKSPACE_NAME,
        owner_clerk_user_id=user_id,
        plan=WORKSPACE_PLAN_PRO,
    )
    session.add(ws)
    session.flush()
    session.add(
        WorkspaceMembership(
            workspace_id=ws.id,
            clerk_user_id=user_id,
            role="owner",
            invited_at=now,
            accepted_at=now,
        )
    )
    session.commit()

    # Prefer primary membership in case a concurrent ensure also committed.
    mem_after = primary_membership_for_user(session, user_id)
    if mem_after is not None:
        primary = session.get(Workspace, mem_after.workspace_id)
        if primary is not None:
            return primary

    session.refresh(ws)
    return ws

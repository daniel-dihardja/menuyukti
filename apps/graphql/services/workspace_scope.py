"""Shared workspace lookup helpers for posts and styles."""

from __future__ import annotations

from sqlalchemy import nulls_last
from sqlalchemy.orm import Session

from graphql.data_sources.models.workspace import Workspace, WorkspaceMembership


def workspace_ids_for_user(session: Session, user_id: str) -> list[int]:
    return [
        w[0]
        for w in session.query(WorkspaceMembership.workspace_id)
        .filter(WorkspaceMembership.clerk_user_id == user_id)
        .all()
    ]


def primary_membership_for_user(session: Session, user_id: str) -> WorkspaceMembership | None:
    """
    Primary membership for UI / posts / media: most recently accepted, then invited.
    Falls back to lowest workspace_id when timestamps tie.
    """
    if not user_id:
        return None
    return (
        session.query(WorkspaceMembership)
        .filter(WorkspaceMembership.clerk_user_id == user_id)
        .order_by(
            nulls_last(WorkspaceMembership.accepted_at.desc()),
            WorkspaceMembership.invited_at.desc(),
            WorkspaceMembership.workspace_id.asc(),
        )
        .first()
    )


def primary_workspace_id(session: Session, user_id: str) -> int | None:
    mem = primary_membership_for_user(session, user_id)
    if mem is None:
        return None
    ws = session.get(Workspace, mem.workspace_id)
    if ws is None:
        return None
    return ws.id

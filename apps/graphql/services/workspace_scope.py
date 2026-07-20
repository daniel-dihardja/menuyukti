"""Shared workspace lookup helpers for posts and styles."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources.models.workspace import Workspace, WorkspaceMembership


def workspace_ids_for_user(session: Session, user_id: str) -> list[int]:
    return [
        w[0]
        for w in session.query(WorkspaceMembership.workspace_id)
        .filter(WorkspaceMembership.clerk_user_id == user_id)
        .all()
    ]


def primary_workspace_id(session: Session, user_id: str) -> int | None:
    mem = (
        session.query(WorkspaceMembership)
        .filter(WorkspaceMembership.clerk_user_id == user_id)
        .order_by(WorkspaceMembership.workspace_id)
        .first()
    )
    if mem is None:
        return None
    ws = session.get(Workspace, mem.workspace_id)
    if ws is None:
        return None
    return ws.id

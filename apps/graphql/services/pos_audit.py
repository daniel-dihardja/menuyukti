"""Append-only POS audit event recorder."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from graphql.data_sources.models.pos_audit_event import PosAuditEvent


def record_pos_audit(
    session: Session,
    *,
    location_id: int,
    actor_clerk_user_id: str,
    action: str,
    pos_order_id: int | None = None,
    payload: dict[str, Any] | None = None,
) -> PosAuditEvent:
    event = PosAuditEvent(
        location_id=location_id,
        pos_order_id=pos_order_id,
        actor_clerk_user_id=actor_clerk_user_id,
        action=action,
        payload=dict(payload or {}),
    )
    session.add(event)
    session.flush()
    return event


def list_audit_events_for_order(session: Session, order_id: int) -> list[PosAuditEvent]:
    from sqlalchemy import select

    return list(
        session.execute(
            select(PosAuditEvent)
            .where(PosAuditEvent.pos_order_id == order_id)
            .order_by(PosAuditEvent.created_at.asc(), PosAuditEvent.id.asc())
        )
        .scalars()
        .all()
    )

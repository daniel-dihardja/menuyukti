"""Persist CRM auth audit events (never log secrets)."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from graphql.data_sources.models.crm_audit_event import CrmAuditEvent


def record_audit_event(
    session: Session,
    *,
    event_type: str,
    crm_app_id: int | None = None,
    customer_id: uuid.UUID | None = None,
    device_id: uuid.UUID | None = None,
    detail: str | None = None,
) -> None:
    """Insert an audit row. Caller is responsible for commit."""
    session.add(
        CrmAuditEvent(
            crm_app_id=crm_app_id,
            customer_id=customer_id,
            device_id=device_id,
            event_type=event_type,
            detail=detail,
        )
    )

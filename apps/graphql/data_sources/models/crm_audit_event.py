"""CRM audit event ORM model — enrollment / auth / revoke trail."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_app import CrmApp


class CrmAuditEvent(Base):
    """
    Audit trail for CRM customer auth events.

    Never store raw enrollment tokens, refresh tokens, or private keys in ``detail``.
    """

    __tablename__ = "crm_audit_event"
    __table_args__ = (
        Index("ix_crm_audit_event_crm_app_id", "crm_app_id", unique=False),
        Index("ix_crm_audit_event_created_at", "created_at", unique=False),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    crm_app_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("crm_app.id", ondelete="SET NULL"),
        nullable=True,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    device_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    crm_app: Mapped[CrmApp | None] = relationship("CrmApp", back_populates="audit_events")

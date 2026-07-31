"""CRM enrollment token ORM model — short-lived staff-minted enroll secrets."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_app import CrmApp


class CrmEnrollmentToken(Base):
    """
    Single-use enrollment token for passwordless device registration.

    Only the SHA-256 hash is stored; the raw token is returned once at create time.
    """

    __tablename__ = "crm_enrollment_token"
    __table_args__ = (
        Index("ix_crm_enrollment_token_crm_app_id", "crm_app_id", unique=False),
        Index("uq_crm_enrollment_token_token_hash", "token_hash", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    crm_app_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("crm_app.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    crm_app: Mapped[CrmApp] = relationship("CrmApp", back_populates="enrollment_tokens")

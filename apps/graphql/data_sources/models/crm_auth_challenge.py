"""CRM auth challenge ORM model — short-lived nonce for device signature verify."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_device import CrmDevice


class CrmAuthChallenge(Base):
    """
    Single-use challenge for passwordless device authentication.

    Client signs ``nonce`` (UTF-8) with the device Ed25519 private key.
    """

    __tablename__ = "crm_auth_challenge"
    __table_args__ = (Index("ix_crm_auth_challenge_device_id", "device_id", unique=False),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("crm_device.id", ondelete="CASCADE"),
        nullable=False,
    )
    nonce: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    device: Mapped[CrmDevice] = relationship("CrmDevice", back_populates="challenges")

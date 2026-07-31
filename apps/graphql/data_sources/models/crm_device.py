"""CRM device ORM model — passwordless device enrollment under a customer."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_auth_challenge import CrmAuthChallenge
    from graphql.data_sources.models.crm_customer import CrmCustomer


class CrmDevice(Base):
    """
    Device enrolled for a CRM customer.

    Stores the public key only; private keys never leave the device.
    Refresh tokens are stored as SHA-256 hashes only.
    """

    __tablename__ = "crm_device"
    __table_args__ = (
        Index("ix_crm_device_customer_id", "customer_id", unique=False),
        Index("ix_crm_device_refresh_token_hash", "refresh_token_hash", unique=False),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("crm_customer.id", ondelete="CASCADE"),
        nullable=False,
    )
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    refresh_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    customer: Mapped[CrmCustomer] = relationship("CrmCustomer", back_populates="devices")
    challenges: Mapped[list[CrmAuthChallenge]] = relationship(
        "CrmAuthChallenge",
        back_populates="device",
        cascade="all, delete-orphan",
    )

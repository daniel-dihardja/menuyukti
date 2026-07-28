"""CRM customer ORM model — app-scoped end customer identity."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_app import CrmApp
    from graphql.data_sources.models.crm_device import CrmDevice


class CrmCustomer(Base):
    """
    End customer enrolled under a CRM app.

    Identity is the customer UUID. Phone and names are optional profile
    fields collected after enrollment. Auth is per device.
    """

    __tablename__ = "crm_customer"
    __table_args__ = (
        Index("ix_crm_customer_crm_app_id", "crm_app_id", unique=False),
        Index("uq_crm_customer_app_phone", "crm_app_id", "phone_e164", unique=True),
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
    phone_e164: Mapped[str | None] = mapped_column(String(32), nullable=True)
    given_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    family_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    crm_app: Mapped[CrmApp] = relationship("CrmApp", back_populates="customers")
    devices: Mapped[list[CrmDevice]] = relationship(
        "CrmDevice",
        back_populates="customer",
        cascade="all, delete-orphan",
    )

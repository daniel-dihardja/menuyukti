"""CRM cashback ledger entry — per-customer credit/debit amounts in IDR."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_customer import CrmCustomer


class CrmCashbackEntry(Base):
    """
    Ledger row for a customer's cashback balance.

    ``amount`` is integer IDR; positive credits, negative debits (future).
    Balance is the sum of amounts for the customer.
    """

    __tablename__ = "crm_cashback_entry"
    __table_args__ = (Index("ix_crm_cashback_entry_customer_id", "customer_id", unique=False),)

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
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    customer: Mapped[CrmCustomer] = relationship(
        "CrmCustomer",
        back_populates="cashback_entries",
    )

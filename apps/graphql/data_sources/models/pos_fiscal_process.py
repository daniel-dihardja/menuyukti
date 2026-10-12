"""Fiscal process row for native POS (mock TSE now; fiskaly later)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.pos_order import PosOrder


class PosFiscalProcess(Base):
    """One fiscalization attempt for a POS ticket (sale or refund)."""

    __tablename__ = "pos_fiscal_process"
    __table_args__ = (
        Index("ix_pos_fiscal_process_order_kind", "pos_order_id", "kind"),
        Index("ix_pos_fiscal_process_order_state", "pos_order_id", "state"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pos_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pos_order.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="mock")
    tse_transaction_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tse_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_counter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    certificate_serial: Mapped[str | None] = mapped_column(String(128), nullable=True)
    client_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    qr_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    process_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="Kassenbeleg-V1",
        server_default="Kassenbeleg-V1",
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    order: Mapped[PosOrder] = relationship("PosOrder", back_populates="fiscal_processes")

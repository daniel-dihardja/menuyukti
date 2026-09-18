"""Native POS ticket and line-item ORM models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.menu import MenuItem


class PosOrder(Base):
    """Operational POS ticket (open / paid / void)."""

    __tablename__ = "pos_order"
    __table_args__ = (
        UniqueConstraint("location_id", "bill_number", name="uq_pos_order_location_bill_number"),
        Index("ix_pos_order_location_status_opened", "location_id", "status", "opened_at"),
        Index("ix_pos_order_location_closed", "location_id", "closed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bill_number: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    opened_by_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(16), nullable=True)
    discount_amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0",
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    location: Mapped[Location] = relationship("Location", back_populates="pos_orders")
    lines: Mapped[list[PosOrderLine]] = relationship(
        "PosOrderLine",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="PosOrderLine.sort_order, PosOrderLine.id",
    )


class PosOrderLine(Base):
    """One sellable line on a POS ticket with price/name snapshots."""

    __tablename__ = "pos_order_line"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pos_order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pos_order.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    menu_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu_item.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name_snapshot: Mapped[str] = mapped_column(String(256), nullable=False)
    menu_category_snapshot: Mapped[str] = mapped_column(String(128), nullable=False)
    menu_category_detail_snapshot: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        default="",
        server_default="",
    )
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    line_total: Mapped[float] = mapped_column(Float, nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
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

    order: Mapped[PosOrder] = relationship("PosOrder", back_populates="lines")
    menu_item: Mapped[MenuItem] = relationship("MenuItem")

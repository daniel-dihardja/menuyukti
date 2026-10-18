"""Native POS ticket and line-item ORM models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
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
    from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
    from graphql.data_sources.models.pos_register import PosRegister


class PosOrder(Base):
    """Operational POS ticket (open / paid / void / refunded)."""

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
    register_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("pos_register.id", ondelete="SET NULL"),
        nullable=True,
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
    discount_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    net_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    tax_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    gross_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    table_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fulfillment_mode: Mapped[str | None] = mapped_column(String(16), nullable=True)
    prep_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    delivery_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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
    register: Mapped[PosRegister | None] = relationship("PosRegister", back_populates="orders")
    lines: Mapped[list[PosOrderLine]] = relationship(
        "PosOrderLine",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="PosOrderLine.sort_order, PosOrderLine.id",
    )
    fiscal_processes: Mapped[list[PosFiscalProcess]] = relationship(
        "PosFiscalProcess",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="PosFiscalProcess.id",
    )


class PosOrderLine(Base):
    """One sellable line on a POS ticket with price/name/tax snapshots."""

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
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    tax_class_snapshot: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="standard",
        server_default="standard",
    )
    tax_rate_bps_snapshot: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1900,
        server_default="1900",
    )
    net_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    tax_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    gross_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(String(256), nullable=True)
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
    modifiers: Mapped[list[PosOrderLineModifier]] = relationship(
        "PosOrderLineModifier",
        back_populates="line",
        cascade="all, delete-orphan",
        order_by="PosOrderLineModifier.sort_order, PosOrderLineModifier.id",
    )


class PosOrderLineModifier(Base):
    """Snapshot of a selected modifier on a POS line."""

    __tablename__ = "pos_order_line_modifier"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pos_order_line_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pos_order_line.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    group_name_snapshot: Mapped[str] = mapped_column(String(128), nullable=False)
    name_snapshot: Mapped[str] = mapped_column(String(128), nullable=False)
    price_delta_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    line: Mapped[PosOrderLine] = relationship("PosOrderLine", back_populates="modifiers")

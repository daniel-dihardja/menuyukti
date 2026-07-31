"""Analytics run, order facts, and COGS ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from graphql.data_sources.database import Base


class AnalyticsRun(Base):
    """
    Represents a single analytics context / upload of a sales report.

    Used to group POS line items and COGS inputs for a given period.
    """

    __tablename__ = "analytics_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    filename: Mapped[str] = mapped_column(String(512))
    pos_system: Mapped[str] = mapped_column(String(64))
    period_start: Mapped[Date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[Date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id"),
        index=True,
    )


class OrderFact(Base):
    __tablename__ = "order_fact"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analytics_run_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("analytics_run.id"),
        nullable=True,
        index=True,
    )
    bill_number: Mapped[str] = mapped_column(String(64), index=True)
    menu: Mapped[str] = mapped_column(String(256))
    qty: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    total_after_bill_discount: Mapped[float] = mapped_column(Float)
    order_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    menu_category: Mapped[str] = mapped_column(String(128))
    menu_category_detail: Mapped[str] = mapped_column(String(128))
    pos_system: Mapped[str] = mapped_column(String(64), default="unknown")


class MenuItemCogs(Base):
    """
    Per-menu COGS values supplied by the user for a given analytics run.
    """

    __tablename__ = "menu_item_cogs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analytics_run_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("analytics_run.id"),
        index=True,
    )
    menu: Mapped[str] = mapped_column(String(256))
    menu_category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    menu_category_detail: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cogs: Mapped[float] = mapped_column(Float)
    currency: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "analytics_run_id",
            "menu",
            name="uq_menu_item_cogs_analytics_run_menu",
        ),
    )

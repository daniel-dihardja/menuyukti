"""Analytics run, order facts, and COGS ORM models."""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)

from graphql.data_sources.database import Base


class AnalyticsRun(Base):
    """
    Represents a single analytics context / upload of a sales report.

    Used to group POS line items and COGS inputs for a given period.
    """

    __tablename__ = "analytics_run"

    id = Column(Integer, primary_key=True)
    name = Column(String(256), nullable=False)
    filename = Column(String(512), nullable=False)
    pos_system = Column(String(64), nullable=False)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
        index=True,
    )


class OrderFact(Base):
    __tablename__ = "order_fact"

    id = Column(Integer, primary_key=True)
    analytics_run_id = Column(
        Integer,
        ForeignKey("analytics_run.id"),
        nullable=True,
        index=True,
    )
    bill_number = Column(String(64), nullable=False, index=True)
    menu = Column(String(256), nullable=False)
    qty = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total_after_bill_discount = Column(Float, nullable=False)
    order_time = Column(DateTime(timezone=True), nullable=False, index=True)
    menu_category = Column(String(128), nullable=False)
    menu_category_detail = Column(String(128), nullable=False)
    pos_system = Column(String(64), nullable=False, default="unknown")


class MenuItemCogs(Base):
    """
    Per-menu COGS values supplied by the user for a given analytics run.
    """

    __tablename__ = "menu_item_cogs"

    id = Column(Integer, primary_key=True)
    analytics_run_id = Column(
        Integer,
        ForeignKey("analytics_run.id"),
        nullable=False,
        index=True,
    )
    menu = Column(String(256), nullable=False)
    menu_category = Column(String(128), nullable=True)
    menu_category_detail = Column(String(128), nullable=True)
    cogs = Column(Float, nullable=False)
    currency = Column(String(16), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
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

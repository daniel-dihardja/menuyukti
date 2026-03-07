"""Database helpers for the GraphQL service."""

from pathlib import Path
import os

from dotenv import load_dotenv

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=False)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+pysqlite:///./graphql.db")

engine = create_engine(DATABASE_URL, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


class Location(Base):
    """
    Restaurant / location dimension for analytics runs.
    """

    __tablename__ = "location"

    id = Column(Integer, primary_key=True)
    name = Column(String(256), nullable=False)

    instagram_posts = relationship("InstagramPost", back_populates="location")


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


class InstagramPost(Base):
    """
    Instagram post (content plan / published post) scoped to a location.

    Holds title (hook), caption, CTA, visual concept, strategy reason,
    version, approval state, and optional planning month.
    """

    __tablename__ = "instagram_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
        index=True,
    )
    location = relationship("Location", back_populates="instagram_posts")

    month = Column(Date, nullable=True)  # planning month (e.g. first day of month)
    status = Column(String(64), nullable=False, default="draft")
    title = Column(String(512), nullable=True)  # hook / headline
    caption = Column(Text, nullable=True)
    cta = Column(String(256), nullable=True)  # call to action
    visual_concept = Column(Text, nullable=True)
    strategy_reason = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    approved = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    promoted_items = relationship(
        "InstagramPostPromotedItem",
        back_populates="instagram_post",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_instagram_post_location_month", "location_id", "month"),
    )


class InstagramPostPromotedItem(Base):
    """
    A menu item promoted in an Instagram post (many per post).
    """

    __tablename__ = "instagram_post_promoted_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    instagram_post_id = Column(
        Integer,
        ForeignKey("instagram_posts.id"),
        nullable=False,
        index=True,
    )
    instagram_post = relationship("InstagramPost", back_populates="promoted_items")

    canonical_menu_name = Column(String(256), nullable=False)


def init_db(target_engine=None) -> None:
    """Create tables for all models (defaults to the configured engine)."""

    resolved_engine = target_engine or engine
    Base.metadata.create_all(bind=resolved_engine)


def drop_db(target_engine=None) -> None:
    """Drop all tables for the configured models."""

    resolved_engine = target_engine or engine
    Base.metadata.drop_all(bind=resolved_engine)


def main() -> None:
    """Entry point so the schema can be quickly bootstrapped."""

    init_db()
    print("Created tables for the GraphQL service.")


def _main_drop() -> None:
    """Drop tables via the same module entry point."""

    drop_db()
    print("Dropped all GraphQL tables.")


if __name__ == "__main__":
    import sys

    action = sys.argv[1] if len(sys.argv) > 1 else "init"

    if action == "drop":
        _main_drop()
    else:
        main()

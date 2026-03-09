"""Database helpers for the GraphQL service."""

from pathlib import Path
import os

from dotenv import load_dotenv

from sqlalchemy import (
    Boolean,
    CheckConstraint,
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
    street = Column(String(512), nullable=True)
    city = Column(String(128), nullable=True)
    country = Column(String(128), nullable=True)

    instagram_posts = relationship("InstagramPost", back_populates="location")
    campaigns = relationship("Campaign", back_populates="location")


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
    Instagram post (content plan / published post) scoped to a location and optional campaign.

    Holds platform, platform post id, status, media type, caption, and published_at.
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
    campaign_id = Column(
        Integer,
        ForeignKey("campaign.id"),
        nullable=True,
        index=True,
    )
    campaign = relationship("Campaign", back_populates="instagram_posts")
    platform = Column(String(32), nullable=False, default="instagram")
    platform_post_id = Column(String(256), nullable=True, index=True)
    status = Column(String(64), nullable=False, default="draft")
    media_type = Column(String(64), nullable=True)
    caption = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
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
        Index("ix_instagram_post_location_published_at", "location_id", "published_at"),
        Index("ix_instagram_post_platform_post_id", "platform_post_id"),
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


class Campaign(Base):
    """
    Marketing campaign with goal, dates, theme, tone, and status.
    Belongs to a location; has many Instagram posts.
    """

    __tablename__ = "campaign"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
    )
    location = relationship("Location", back_populates="campaigns")
    instagram_posts = relationship(
        "InstagramPost",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )

    name = Column(String(256), nullable=False)
    goal = Column(String(512), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    theme = Column(String(256), nullable=True)
    tone = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="draft")

    __table_args__ = (
        Index("ix_campaign_status", "status"),
        Index("ix_campaign_location_id", "location_id"),
        CheckConstraint(
            "status IN ('draft', 'approved', 'active', 'completed')",
            name="ck_campaign_status",
        ),
    )


class OperatingProfileSummary(Base):
    """
    Cache for LLM-generated operating profile summaries.

    Keyed by (analytics_run_id, prompt_version) so bumping the prompt version
    forces regeneration without losing prior summaries.
    """

    __tablename__ = "operating_profile_summary"

    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
    analytics_run_id = Column(Integer, ForeignKey("analytics_run.id"), nullable=False)
    operating_summary = Column(Text, nullable=False)
    prompt_version = Column(String(32), nullable=False, default="v1")
    model = Column(String(64), nullable=False, default="gpt-4o-mini")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "analytics_run_id",
            "prompt_version",
            name="uq_ops_summary_run_prompt",
        ),
    )


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

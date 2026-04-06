"""Database helpers for the GraphQL service."""

import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    create_engine,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
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
    clerk_user_id = Column(String(128), nullable=True, index=True)

    instagram_posts = relationship("InstagramPost", back_populates="location")
    nodes = relationship("Node", back_populates="location")


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

    __table_args__ = (
        Index("ix_instagram_post_location_published_at", "location_id", "published_at"),
        Index("ix_instagram_post_platform_post_id", "platform_post_id"),
    )


class Node(Base):
    """
    Graph-like hierarchy: each row is a vertex with an optional parent edge (adjacency list).
    """

    __tablename__ = "node"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("node.id"),
        nullable=True,
        index=True,
    )
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    path = Column(Text, nullable=False)
    node_type = Column(
        "type",
        Text,
        nullable=False,
        default="unknown",
        server_default=text("'unknown'"),
    )
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=True,
        index=True,
    )
    data = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    parent = relationship("Node", remote_side=[id], back_populates="children")
    children = relationship("Node", back_populates="parent")
    location = relationship("Location", back_populates="nodes")

    __table_args__ = (Index("ix_node_location_type", "location_id", "type"),)


def init_db(target_engine=None) -> None:
    """Create tables for all models (defaults to the configured engine)."""

    resolved_engine = target_engine or engine
    Base.metadata.create_all(bind=resolved_engine)


def drop_db(target_engine=None) -> None:
    """Drop all tables for the configured models.

    On PostgreSQL the schema is reset via DROP SCHEMA ... CASCADE so that
    stale tables (not in the current models) with FK dependencies don't block
    the drop. SQLite falls back to the standard drop_all path.
    """
    resolved_engine = target_engine or engine
    if resolved_engine.dialect.name == "postgresql":
        with resolved_engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
            conn.commit()
    else:
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

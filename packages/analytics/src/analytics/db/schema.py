from sqlalchemy import (
    MetaData,
    Table,
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Numeric,
    JSON,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from datetime import datetime, timezone

metadata = MetaData()


# --------------------------------------------------
# Branch (lightweight context / namespace)
# --------------------------------------------------

branches = Table(
    "branches",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("slug", String, nullable=False, unique=True),
    Column(
        "created_at",
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    ),
)


# --------------------------------------------------
# Analytics (analysis context / immutable snapshot)
# --------------------------------------------------

analytics = Table(
    "analytics",
    metadata,
    Column("id", Integer, primary_key=True),
    # Context
    Column("branch_id", ForeignKey("branches.id"), nullable=False),
    # Timing
    Column(
        "uploaded_at",
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    ),
    # Source metadata
    Column("source_file", String, nullable=True),
    # Period boundaries
    Column("period_start", Date, nullable=True),
    Column("period_end", Date, nullable=True),
    # Global KPIs (convenience fields)
    Column("total_orders", Integer, nullable=True),
    Column("total_items_sold", Integer, nullable=True),
    Column("total_revenue", Numeric(10, 2), nullable=True),
    Column("avg_order_revenue", Numeric(10, 2), nullable=True),
    Column("avg_order_items", Numeric(10, 2), nullable=True),
    # Menu Engineering thresholds
    Column("avg_popularity", Numeric(10, 6), nullable=True),
    # Other KPIs
    Column("max_order_items", Integer, nullable=True),
    Column("min_order_items", Integer, nullable=True),
    Column("max_order_revenue", Numeric(10, 2), nullable=True),
    Column("min_order_revenue", Numeric(10, 2), nullable=True),
    # Derived analytics results (immutable snapshot)
    Column("matrix_json", JSON, nullable=True),
    Column("matrix_distribution_json", JSON, nullable=True),
    Column("heatmap_json", JSON, nullable=True),
    Column("popularity_json", JSON, nullable=True),
    Column("insights_json", JSON, nullable=True),
)

Index("ix_analytics_branch_id", analytics.c.branch_id)


# --------------------------------------------------
# Menu items (inputs scoped to analytics)
# --------------------------------------------------

analytics_menu_items = Table(
    "analytics_menu_items",
    metadata,
    Column("id", Integer, primary_key=True),
    # Scope
    Column("analytics_id", ForeignKey("analytics.id"), nullable=False),
    # Identity within analytics context
    Column("menu_name", String, nullable=False),
    Column("slug", String, nullable=False),
    # Inputs (snapshotted per analytics run)
    Column("price", Numeric(10, 2), nullable=False),
    Column("cogs", Numeric(10, 2), nullable=True),
    Column(
        "created_at",
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    ),
    # Prevent duplicate menu items per analytics run
    UniqueConstraint("analytics_id", "slug", name="uq_menu_item_per_analytics"),
)

Index(
    "ix_menu_items_analytics_id",
    analytics_menu_items.c.analytics_id,
)

Index(
    "ix_menu_items_analytics_slug",
    analytics_menu_items.c.analytics_id,
    analytics_menu_items.c.slug,
)

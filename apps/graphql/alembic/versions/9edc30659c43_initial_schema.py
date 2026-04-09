"""initial_schema

Revision ID: 9edc30659c43
Revises:
Create Date: 2026-04-09 12:34:18.215227

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9edc30659c43"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_jsonb = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "image_ai_flow",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("prompt_enhance", sa.Text(), nullable=True),
        sa.Column("image_reference_strength", sa.Text(), nullable=True),
        sa.Column("style_ids", _jsonb, nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_image_ai_flow_slug"), "image_ai_flow", ["slug"], unique=True)

    op.create_table(
        "workspace",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("owner_clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_workspace_owner_clerk_user_id"),
        "workspace",
        ["owner_clerk_user_id"],
        unique=False,
    )

    # location.node_id -> node.id is deferred until after `node` exists (circular FK with node.location_id).
    op.create_table(
        "location",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("street", sa.String(length=512), nullable=True),
        sa.Column("city", sa.String(length=128), nullable=True),
        sa.Column("country", sa.String(length=128), nullable=True),
        sa.Column("currency", sa.String(length=16), nullable=True),
        sa.Column("workspace_id", sa.Integer(), nullable=True),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=True),
        sa.Column("node_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspace.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_location_clerk_user_id"), "location", ["clerk_user_id"], unique=False)
    op.create_index(op.f("ix_location_node_id"), "location", ["node_id"], unique=False)
    op.create_index(
        op.f("ix_location_workspace_id"),
        "location",
        ["workspace_id"],
        unique=False,
    )

    op.create_table(
        "workspace_membership",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column(
            "invited_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspace.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "clerk_user_id",
            name="uq_workspace_membership_workspace_user",
        ),
    )
    op.create_index(
        op.f("ix_workspace_membership_clerk_user_id"),
        "workspace_membership",
        ["clerk_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_workspace_membership_workspace_id"),
        "workspace_membership",
        ["workspace_id"],
        unique=False,
    )

    op.create_table(
        "analytics_run",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("filename", sa.String(length=512), nullable=False),
        sa.Column("pos_system", sa.String(length=64), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_analytics_run_location_id"),
        "analytics_run",
        ["location_id"],
        unique=False,
    )

    op.create_table(
        "instagram_posts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("platform_post_id", sa.String(length=256), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("media_type", sa.String(length=64), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_instagram_post_location_published_at",
        "instagram_posts",
        ["location_id", "published_at"],
        unique=False,
    )
    op.create_index(
        "ix_instagram_post_platform_post_id",
        "instagram_posts",
        ["platform_post_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_instagram_posts_location_id"),
        "instagram_posts",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_instagram_posts_platform_post_id"),
        "instagram_posts",
        ["platform_post_id"],
        unique=False,
    )

    op.create_table(
        "node",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), server_default=sa.text("'unknown'"), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("data", _jsonb, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["node.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_node_location_id"), "node", ["location_id"], unique=False)
    op.create_index("ix_node_location_type", "node", ["location_id", "type"], unique=False)
    op.create_index(op.f("ix_node_parent_id"), "node", ["parent_id"], unique=False)

    op.create_foreign_key(
        "fk_location_node_id",
        "location",
        "node",
        ["node_id"],
        ["id"],
    )

    op.create_table(
        "menu_item_cogs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("analytics_run_id", sa.Integer(), nullable=False),
        sa.Column("menu", sa.String(length=256), nullable=False),
        sa.Column("menu_category", sa.String(length=128), nullable=True),
        sa.Column("menu_category_detail", sa.String(length=128), nullable=True),
        sa.Column("cogs", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=16), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["analytics_run_id"],
            ["analytics_run.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "analytics_run_id",
            "menu",
            name="uq_menu_item_cogs_analytics_run_menu",
        ),
    )
    op.create_index(
        op.f("ix_menu_item_cogs_analytics_run_id"),
        "menu_item_cogs",
        ["analytics_run_id"],
        unique=False,
    )

    op.create_table(
        "order_fact",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("analytics_run_id", sa.Integer(), nullable=True),
        sa.Column("bill_number", sa.String(length=64), nullable=False),
        sa.Column("menu", sa.String(length=256), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("total_after_bill_discount", sa.Float(), nullable=False),
        sa.Column("order_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("menu_category", sa.String(length=128), nullable=False),
        sa.Column("menu_category_detail", sa.String(length=128), nullable=False),
        sa.Column("pos_system", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(
            ["analytics_run_id"],
            ["analytics_run.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_order_fact_analytics_run_id"),
        "order_fact",
        ["analytics_run_id"],
        unique=False,
    )
    op.create_index(op.f("ix_order_fact_bill_number"), "order_fact", ["bill_number"], unique=False)
    op.create_index(op.f("ix_order_fact_order_time"), "order_fact", ["order_time"], unique=False)

    op.create_table(
        "workflow",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workflow_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("payload", _jsonb, nullable=False),
        sa.Column("schema_version", sa.Text(), server_default=sa.text("'2.0'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
        ),
        sa.ForeignKeyConstraint(
            ["workflow_id"],
            ["node.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workflow_location_id"), "workflow", ["location_id"], unique=False)
    op.create_index(op.f("ix_workflow_workflow_id"), "workflow", ["workflow_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(op.f("ix_workflow_workflow_id"), table_name="workflow")
    op.drop_index(op.f("ix_workflow_location_id"), table_name="workflow")
    op.drop_table("workflow")

    op.drop_index(op.f("ix_order_fact_order_time"), table_name="order_fact")
    op.drop_index(op.f("ix_order_fact_bill_number"), table_name="order_fact")
    op.drop_index(op.f("ix_order_fact_analytics_run_id"), table_name="order_fact")
    op.drop_table("order_fact")

    op.drop_index(op.f("ix_menu_item_cogs_analytics_run_id"), table_name="menu_item_cogs")
    op.drop_table("menu_item_cogs")

    op.drop_constraint("fk_location_node_id", "location", type_="foreignkey")

    op.drop_index(op.f("ix_node_parent_id"), table_name="node")
    op.drop_index("ix_node_location_type", table_name="node")
    op.drop_index(op.f("ix_node_location_id"), table_name="node")
    op.drop_table("node")

    op.drop_index(op.f("ix_instagram_posts_platform_post_id"), table_name="instagram_posts")
    op.drop_index(op.f("ix_instagram_posts_location_id"), table_name="instagram_posts")
    op.drop_index("ix_instagram_post_platform_post_id", table_name="instagram_posts")
    op.drop_index("ix_instagram_post_location_published_at", table_name="instagram_posts")
    op.drop_table("instagram_posts")

    op.drop_index(op.f("ix_analytics_run_location_id"), table_name="analytics_run")
    op.drop_table("analytics_run")

    op.drop_index(op.f("ix_workspace_membership_workspace_id"), table_name="workspace_membership")
    op.drop_index(op.f("ix_workspace_membership_clerk_user_id"), table_name="workspace_membership")
    op.drop_table("workspace_membership")

    op.drop_index(op.f("ix_location_workspace_id"), table_name="location")
    op.drop_index(op.f("ix_location_node_id"), table_name="location")
    op.drop_index(op.f("ix_location_clerk_user_id"), table_name="location")
    op.drop_table("location")

    op.drop_index(op.f("ix_workspace_owner_clerk_user_id"), table_name="workspace")
    op.drop_table("workspace")

    op.drop_index(op.f("ix_image_ai_flow_slug"), table_name="image_ai_flow")
    op.drop_table("image_ai_flow")

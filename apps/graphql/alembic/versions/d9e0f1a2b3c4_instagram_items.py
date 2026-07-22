"""instagram_items table for workflow-scoped story/post/reel drafts

Revision ID: d9e0f1a2b3c4
Revises: c8d9e0f1a2b3
Create Date: 2026-07-22

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d9e0f1a2b3c4"
down_revision: str | Sequence[str] | None = "c8d9e0f1a2b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "instagram_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workflow_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("hook", sa.Text(), nullable=True),
        sa.Column("visual_brief", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=64),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["location_id"], ["location.id"]),
        sa.ForeignKeyConstraint(["workflow_id"], ["node.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_instagram_items_workflow_id", "instagram_items", ["workflow_id"])
    op.create_index("ix_instagram_items_location_id", "instagram_items", ["location_id"])
    op.create_index(
        "ix_instagram_items_created_by_clerk_user_id",
        "instagram_items",
        ["created_by_clerk_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_instagram_items_created_by_clerk_user_id", table_name="instagram_items")
    op.drop_index("ix_instagram_items_location_id", table_name="instagram_items")
    op.drop_index("ix_instagram_items_workflow_id", table_name="instagram_items")
    op.drop_table("instagram_items")

"""menu_item_feedback table for digital-menu guest notes

Revision ID: w6x7y8z9a0b1
Revises: v5w6x7y8z9a0
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "w6x7y8z9a0b1"
down_revision: str | Sequence[str] | None = "v5w6x7y8z9a0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "menu_item_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("menu_item_id", sa.Integer(), nullable=False),
        sa.Column("pos_order_id", sa.Integer(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("sentiment", sa.String(length=16), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("guest_display_name", sa.String(length=128), nullable=True),
        sa.Column("owner_reply", sa.Text(), nullable=True),
        sa.Column("owner_replied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_menu_item_feedback_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["menu_item_id"],
            ["menu_item.id"],
            name=op.f("fk_menu_item_feedback_menu_item_id_menu_item"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["pos_order_id"],
            ["pos_order.id"],
            name=op.f("fk_menu_item_feedback_pos_order_id_pos_order"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu_item_feedback")),
        sa.UniqueConstraint(
            "clerk_user_id",
            "menu_item_id",
            "pos_order_id",
            name="uq_menu_item_feedback_user_item_order",
        ),
    )
    op.create_index(
        op.f("ix_menu_item_feedback_location_id"),
        "menu_item_feedback",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_menu_item_feedback_menu_item_id"),
        "menu_item_feedback",
        ["menu_item_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_menu_item_feedback_pos_order_id"),
        "menu_item_feedback",
        ["pos_order_id"],
        unique=False,
    )
    op.create_index(
        "ix_menu_item_feedback_location_status_created",
        "menu_item_feedback",
        ["location_id", "status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_menu_item_feedback_menu_item_status",
        "menu_item_feedback",
        ["menu_item_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_menu_item_feedback_menu_item_status",
        table_name="menu_item_feedback",
    )
    op.drop_index(
        "ix_menu_item_feedback_location_status_created",
        table_name="menu_item_feedback",
    )
    op.drop_index(
        op.f("ix_menu_item_feedback_pos_order_id"),
        table_name="menu_item_feedback",
    )
    op.drop_index(
        op.f("ix_menu_item_feedback_menu_item_id"),
        table_name="menu_item_feedback",
    )
    op.drop_index(
        op.f("ix_menu_item_feedback_location_id"),
        table_name="menu_item_feedback",
    )
    op.drop_table("menu_item_feedback")

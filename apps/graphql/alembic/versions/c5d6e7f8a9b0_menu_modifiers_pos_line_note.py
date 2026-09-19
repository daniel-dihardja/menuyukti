"""menu modifiers + pos_order_line note and modifiers

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-09-19

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c5d6e7f8a9b0"
down_revision: str | Sequence[str] | None = "b4c5d6e7f8a9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "menu_modifier_group",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("menu_item_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("min_select", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_select", sa.Integer(), server_default="1", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
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
        sa.ForeignKeyConstraint(["menu_item_id"], ["menu_item.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_menu_modifier_group_menu_item_id",
        "menu_modifier_group",
        ["menu_item_id"],
    )

    op.create_table(
        "menu_modifier_option",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("price_delta", sa.Float(), server_default="0", nullable=False),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
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
        sa.ForeignKeyConstraint(["group_id"], ["menu_modifier_group.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_menu_modifier_option_group_id",
        "menu_modifier_option",
        ["group_id"],
    )

    op.add_column(
        "pos_order_line",
        sa.Column("note", sa.String(length=256), nullable=True),
    )

    op.create_table(
        "pos_order_line_modifier",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pos_order_line_id", sa.Integer(), nullable=False),
        sa.Column("group_name_snapshot", sa.String(length=128), nullable=False),
        sa.Column("name_snapshot", sa.String(length=128), nullable=False),
        sa.Column("price_delta_snapshot", sa.Float(), server_default="0", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["pos_order_line_id"], ["pos_order_line.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pos_order_line_modifier_pos_order_line_id",
        "pos_order_line_modifier",
        ["pos_order_line_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_pos_order_line_modifier_pos_order_line_id",
        table_name="pos_order_line_modifier",
    )
    op.drop_table("pos_order_line_modifier")
    op.drop_column("pos_order_line", "note")
    op.drop_index("ix_menu_modifier_option_group_id", table_name="menu_modifier_option")
    op.drop_table("menu_modifier_option")
    op.drop_index("ix_menu_modifier_group_menu_item_id", table_name="menu_modifier_group")
    op.drop_table("menu_modifier_group")

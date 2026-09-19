"""pos_order + pos_order_line for native POS tickets

Revision ID: z2a3b4c5d6e7
Revises: y1z2a3b4c5d6
Create Date: 2026-09-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "z2a3b4c5d6e7"
down_revision: str | Sequence[str] | None = "y1z2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pos_order",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("bill_number", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "opened_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("opened_by_clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("payment_method", sa.String(length=16), nullable=True),
        sa.Column("discount_amount", sa.Float(), server_default="0", nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
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
            name=op.f("fk_pos_order_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pos_order")),
        sa.UniqueConstraint(
            "location_id",
            "bill_number",
            name="uq_pos_order_location_bill_number",
        ),
    )
    op.create_index(op.f("ix_pos_order_location_id"), "pos_order", ["location_id"], unique=False)
    op.create_index(
        "ix_pos_order_location_status_opened",
        "pos_order",
        ["location_id", "status", "opened_at"],
        unique=False,
    )
    op.create_index(
        "ix_pos_order_location_closed",
        "pos_order",
        ["location_id", "closed_at"],
        unique=False,
    )

    op.create_table(
        "pos_order_line",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pos_order_id", sa.Integer(), nullable=False),
        sa.Column("menu_item_id", sa.Integer(), nullable=False),
        sa.Column("name_snapshot", sa.String(length=256), nullable=False),
        sa.Column("menu_category_snapshot", sa.String(length=128), nullable=False),
        sa.Column(
            "menu_category_detail_snapshot",
            sa.String(length=128),
            server_default="",
            nullable=False,
        ),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("line_total", sa.Float(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["pos_order_id"],
            ["pos_order.id"],
            name=op.f("fk_pos_order_line_pos_order_id_pos_order"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["menu_item_id"],
            ["menu_item.id"],
            name=op.f("fk_pos_order_line_menu_item_id_menu_item"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pos_order_line")),
    )
    op.create_index(
        op.f("ix_pos_order_line_pos_order_id"),
        "pos_order_line",
        ["pos_order_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_pos_order_line_menu_item_id"),
        "pos_order_line",
        ["menu_item_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_pos_order_line_menu_item_id"), table_name="pos_order_line")
    op.drop_index(op.f("ix_pos_order_line_pos_order_id"), table_name="pos_order_line")
    op.drop_table("pos_order_line")
    op.drop_index("ix_pos_order_location_closed", table_name="pos_order")
    op.drop_index("ix_pos_order_location_status_opened", table_name="pos_order")
    op.drop_index(op.f("ix_pos_order_location_id"), table_name="pos_order")
    op.drop_table("pos_order")

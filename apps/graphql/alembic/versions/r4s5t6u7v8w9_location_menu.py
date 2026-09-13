"""menu + menu_item: location-scoped curated guest menu

Revision ID: r4s5t6u7v8w9
Revises: q3r4s5t6u7v8
Create Date: 2026-09-13

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "r4s5t6u7v8w9"
down_revision: str | Sequence[str] | None = "q3r4s5t6u7v8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "menu",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=256), server_default="", nullable=False),
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
            name=op.f("fk_menu_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu")),
        sa.UniqueConstraint("location_id", name="uq_menu_location_id"),
    )
    op.create_index(op.f("ix_menu_location_id"), "menu", ["location_id"], unique=False)

    op.create_table(
        "menu_item",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("menu_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_available", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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
            ["menu_id"],
            ["menu.id"],
            name=op.f("fk_menu_item_menu_id_menu"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu_item")),
    )
    op.create_index(op.f("ix_menu_item_menu_id"), "menu_item", ["menu_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_menu_item_menu_id"), table_name="menu_item")
    op.drop_table("menu_item")
    op.drop_index(op.f("ix_menu_location_id"), table_name="menu")
    op.drop_table("menu")

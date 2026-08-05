"""location_menu_item_cogs table

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-05

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b8c9d0e1f2a3"
down_revision: str | Sequence[str] | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "location_menu_item_cogs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("menu", sa.String(length=256), nullable=False),
        sa.Column("menu_category", sa.String(length=128), nullable=True),
        sa.Column("menu_category_detail", sa.String(length=128), nullable=True),
        sa.Column("cogs", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=16), nullable=True),
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
            name=op.f("fk_location_menu_item_cogs_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_menu_item_cogs")),
        sa.UniqueConstraint(
            "location_id",
            "menu",
            name="uq_location_menu_item_cogs_location_menu",
        ),
    )
    op.create_index(
        op.f("ix_location_menu_item_cogs_location_id"),
        "location_menu_item_cogs",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_location_menu_item_cogs_location_id"),
        table_name="location_menu_item_cogs",
    )
    op.drop_table("location_menu_item_cogs")

"""inventory stock movement and stock updated-by actor

Revision ID: i5j6k7l8m9n0
Revises: h4i5j6k7l8m9
Create Date: 2026-09-05

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "i5j6k7l8m9n0"
down_revision: str | Sequence[str] | None = "h4i5j6k7l8m9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inventory_stock_movement",
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=True),
    )
    op.create_index(
        op.f("ix_inventory_stock_movement_created_by_clerk_user_id"),
        "inventory_stock_movement",
        ["created_by_clerk_user_id"],
        unique=False,
    )
    op.add_column(
        "inventory_stock",
        sa.Column("last_updated_by_clerk_user_id", sa.String(length=128), nullable=True),
    )
    op.create_index(
        op.f("ix_inventory_stock_last_updated_by_clerk_user_id"),
        "inventory_stock",
        ["last_updated_by_clerk_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_inventory_stock_last_updated_by_clerk_user_id"),
        table_name="inventory_stock",
    )
    op.drop_column("inventory_stock", "last_updated_by_clerk_user_id")
    op.drop_index(
        op.f("ix_inventory_stock_movement_created_by_clerk_user_id"),
        table_name="inventory_stock_movement",
    )
    op.drop_column("inventory_stock_movement", "created_by_clerk_user_id")

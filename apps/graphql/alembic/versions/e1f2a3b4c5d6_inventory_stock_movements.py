"""inventory_stock_movement ledger and last_in/out on stock

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-08-31

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: str | Sequence[str] | None = "d0e1f2a3b4c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("inventory_stock", sa.Column("last_in_on", sa.Date(), nullable=True))
    op.add_column("inventory_stock", sa.Column("last_out_on", sa.Date(), nullable=True))

    op.create_table(
        "inventory_stock_movement",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("catalog_item_id", sa.Integer(), nullable=False),
        sa.Column("stock_id", sa.Integer(), nullable=True),
        sa.Column("direction", sa.String(length=32), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("note", sa.String(length=512), nullable=True),
        sa.Column("related_movement_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["catalog_item_id"],
            ["inventory_catalog_item.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["related_movement_id"],
            ["inventory_stock_movement.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["stock_id"],
            ["inventory_stock.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inventory_stock_movement_loc_catalog_occurred",
        "inventory_stock_movement",
        ["location_id", "catalog_item_id", "occurred_on"],
        unique=False,
    )
    op.create_index(
        "ix_inventory_stock_movement_stock_id",
        "inventory_stock_movement",
        ["stock_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_inventory_stock_movement_stock_id",
        table_name="inventory_stock_movement",
    )
    op.drop_index(
        "ix_inventory_stock_movement_loc_catalog_occurred",
        table_name="inventory_stock_movement",
    )
    op.drop_table("inventory_stock_movement")
    op.drop_column("inventory_stock", "last_out_on")
    op.drop_column("inventory_stock", "last_in_on")

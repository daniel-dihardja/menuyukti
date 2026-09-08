"""Move min_on_hand and max_on_hand from catalog to stock

Revision ID: o1p2q3r4s5t6
Revises: n0o1p2q3r4s5
Create Date: 2026-09-08

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "o1p2q3r4s5t6"
down_revision: str | Sequence[str] | None = "n0o1p2q3r4s5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inventory_stock",
        sa.Column("min_on_hand", sa.Float(), nullable=True),
    )
    op.add_column(
        "inventory_stock",
        sa.Column("max_on_hand", sa.Float(), nullable=True),
    )
    op.execute(
        """
        UPDATE inventory_stock AS stock
        SET
            min_on_hand = catalog.min_on_hand,
            max_on_hand = catalog.max_on_hand
        FROM inventory_catalog_item AS catalog
        WHERE stock.catalog_item_id = catalog.id
        """
    )
    op.drop_column("inventory_catalog_item", "max_on_hand")
    op.drop_column("inventory_catalog_item", "min_on_hand")


def downgrade() -> None:
    op.add_column(
        "inventory_catalog_item",
        sa.Column("min_on_hand", sa.Float(), nullable=True),
    )
    op.add_column(
        "inventory_catalog_item",
        sa.Column("max_on_hand", sa.Float(), nullable=True),
    )
    op.execute(
        """
        UPDATE inventory_catalog_item AS catalog
        SET
            min_on_hand = limits.min_on_hand,
            max_on_hand = limits.max_on_hand
        FROM (
            SELECT DISTINCT ON (catalog_item_id)
                catalog_item_id,
                min_on_hand,
                max_on_hand
            FROM inventory_stock
            WHERE min_on_hand IS NOT NULL OR max_on_hand IS NOT NULL
            ORDER BY catalog_item_id, id
        ) AS limits
        WHERE catalog.id = limits.catalog_item_id
        """
    )
    op.drop_column("inventory_stock", "max_on_hand")
    op.drop_column("inventory_stock", "min_on_hand")

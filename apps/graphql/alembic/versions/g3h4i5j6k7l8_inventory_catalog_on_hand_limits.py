"""Add min_on_hand and max_on_hand to inventory_catalog_item

Revision ID: g3h4i5j6k7l8
Revises: f2a3b4c5d6e7
Create Date: 2026-09-02

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "g3h4i5j6k7l8"
down_revision: str | Sequence[str] | None = "f2a3b4c5d6e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inventory_catalog_item",
        sa.Column("min_on_hand", sa.Float(), nullable=True),
    )
    op.add_column(
        "inventory_catalog_item",
        sa.Column("max_on_hand", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inventory_catalog_item", "max_on_hand")
    op.drop_column("inventory_catalog_item", "min_on_hand")

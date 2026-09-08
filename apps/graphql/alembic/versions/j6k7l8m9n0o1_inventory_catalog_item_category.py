"""Add category to inventory_catalog_item

Revision ID: j6k7l8m9n0o1
Revises: i5j6k7l8m9n0
Create Date: 2026-09-08

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "j6k7l8m9n0o1"
down_revision: str | Sequence[str] | None = "i5j6k7l8m9n0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inventory_catalog_item",
        sa.Column(
            "category",
            sa.String(length=32),
            server_default="other",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("inventory_catalog_item", "category")
